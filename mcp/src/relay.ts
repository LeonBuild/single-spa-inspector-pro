import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import {
  getRelayPort,
  getRelayToken,
  getCdpUrl,
  isLocalhost,
  log,
  error,
  VERSION,
} from './utils.js';
import type { ExtensionMessage } from './protocol.js';

interface CDPSession {
  ws: WebSocket;
  tabId: number;
  sessionId: string;
}

const app = new Hono();

let extensionWs: WebSocket | null = null;
const cdpSessions = new Map<string, CDPSession>();

const ALLOWED_EXTENSION_IDS = [
  'dev-extension-id-placeholder',
  'prod-extension-id-placeholder',
];

app.use(cors());

app.get('/', (c) => {
  return c.text('OK');
});

app.get('/version', (c) => {
  return c.json({ version: VERSION });
});

app.get('/json/version', (c) => {
  const port = getRelayPort();
  return c.json({
    WebSocketDebuggerUrl: getCdpUrl(port),
  });
});

app.get('/json/list', (c) => {
  const targets = Array.from(cdpSessions.values()).map((session) => ({
    id: session.sessionId,
    tabId: session.tabId,
    type: 'page',
    webSocketDebuggerUrl: getCdpUrl(getRelayPort(), session.sessionId),
  }));
  return c.json({ targets });
});

function sendToExtension(message: any): void {
  if (extensionWs?.readyState === WebSocket.OPEN) {
    extensionWs.send(JSON.stringify(message));
  } else {
    error('Extension WebSocket not connected, cannot send message');
  }
}

function broadcastToCDPClients(message: unknown): void {
  for (const session of cdpSessions.values()) {
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify(message));
    }
  }
}

function validateExtensionOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const match = origin.match(/^chrome-extension:\/\/([^/]+)/);
  if (!match) return false;
  const id = match[1];
  return ALLOWED_EXTENSION_IDS.includes(id);
}

function handleExtensionMessage(data: Buffer) {
  try {
    const message = JSON.parse(data.toString());

    if (message.method === 'pong') {
      log('Received pong from extension');
      return;
    }

    if (message.method === 'log') {
      log(`[EXT LOG ${message.params.level}]`, ...message.params.args);
      return;
    }

    if (message.method === 'forwardCDPEvent') {
      const { sessionId, method, params } = message.params;
      if (sessionId && cdpSessions.has(sessionId)) {
        cdpSessions.get(sessionId)?.ws.send(JSON.stringify({ method, params }));
      }
      return;
    }

    if ('id' in message) {
      const response = message as { id: number; result?: unknown; error?: string };
      broadcastToCDPClients({
        id: response.id,
        result: response.result,
        error: response.error,
      });
    }
  } catch (e) {
    error('Error parsing extension message:', e);
  }
}

function handleCDPMessage(data: Buffer, clientId: string) {
  try {
    const message = JSON.parse(data.toString());

    if (message.method === 'forwardCDPCommand') {
      const { id, params } = message as { id: number; params: { method: string; sessionId?: string; params?: Record<string, unknown> } };
      sendToExtension({
        id,
        method: 'forwardCDPCommand',
        params,
      });
      return;
    }

    if (message.method === 'Target.attachToTarget') {
      const { sessionId } = message.params || {};
      if (sessionId) {
        cdpSessions.set(clientId, {
          ws: cdpSessions.get(clientId)?.ws || null as unknown as WebSocket,
          tabId: 0,
          sessionId,
        });
      }
      return;
    }

    if (message.method === 'Target.detachFromTarget') {
      cdpSessions.delete(clientId);
      return;
    }

    broadcastToCDPClients(message);
  } catch (e) {
    error('Error parsing CDP message:', e);
  }
}

export async function startRelayServer(): Promise<void> {
  const port = getRelayPort();

  const server = http.createServer(async (req, res) => {
    try {
      const response = await app.fetch(req as unknown as Request, {} as never);
      response?.text().then((text) => {
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(text);
      }).catch(() => {
        res.writeHead(500);
        res.end('Error');
      });
    } catch {
      res.writeHead(500);
      res.end('Error');
    }
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const remoteAddr = req.socket?.remoteAddress || '';
    const origin = req.headers.origin || '';

    if (!isLocalhost(remoteAddr)) {
      error(`Rejected connection from non-localhost: ${remoteAddr}`);
      ws.close(1008, 'Connection only allowed from localhost');
      return;
    }

    const pathname = req.url?.split('?')[0] || '';

    if (pathname === '/extension') {
      if (!validateExtensionOrigin(origin)) {
        error(`Rejected extension connection with invalid origin: ${origin}`);
        ws.close(1008, 'Invalid origin');
        return;
      }

      log('Extension WebSocket connected');
      extensionWs = ws as WebSocket;

      ws.on('message', (data) => {
        if (Buffer.isBuffer(data)) {
          handleExtensionMessage(data);
        }
      });

      ws.on('close', () => {
        log('Extension WebSocket disconnected');
        if (extensionWs === ws) {
          extensionWs = null;
        }
      });

      ws.on('error', (err) => {
        error('Extension WebSocket error:', err.message);
      });
      return;
    }

    if (pathname.startsWith('/cdp/')) {
      const clientId = pathname.slice(5);
      const token = getRelayToken();

      if (token) {
        const url = new URL(req.url || '', `http://localhost:${port}`);
        const providedToken = url.searchParams.get('token');
        if (providedToken !== token) {
          error('Rejected CDP connection with invalid token');
          ws.close(1008, 'Invalid token');
          return;
        }
      }

      log(`CDP WebSocket connected: ${clientId}`);

      cdpSessions.set(clientId, {
        ws: ws as WebSocket,
        tabId: 0,
        sessionId: clientId,
      });

      ws.on('message', (data) => {
        if (Buffer.isBuffer(data)) {
          handleCDPMessage(data, clientId);
        }
      });

      ws.on('close', () => {
        log(`CDP WebSocket disconnected: ${clientId}`);
        cdpSessions.delete(clientId);
      });

      ws.on('error', (err) => {
        error(`CDP WebSocket error (${clientId}):`, err.message);
      });

      ws.send(JSON.stringify({ method: 'Target.setAutoAttach', params: { autoAttach: true, waitForDebuggerOnStart: false } }));
      return;
    }

    ws.close(1008, 'Unknown endpoint');
  });

  server.listen(port, () => {
    log(`Relay server started on port ${port}`);
    log(`Extension endpoint: ws://localhost:${port}/extension`);
    log(`CDP endpoint: ws://localhost:${port}/cdp/:clientId`);
  });

  setInterval(() => {
    if (extensionWs?.readyState === WebSocket.OPEN) {
      extensionWs.send(JSON.stringify({ method: 'ping' }));
    }
  }, 30000);
}

startRelayServer().catch((e) => {
  error('Failed to start relay server:', e);
  process.exit(1);
});
