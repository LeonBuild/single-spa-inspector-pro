import { Hono } from 'hono';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import {
  getRelayPort,
  getRelayToken,
  getCdpUrl,
  getAllowedExtensionIds,
  isLocalhost,
  log,
  error,
  VERSION,
} from './utils.js';
import type { ExtensionMessage } from './protocol.js';

interface CDPClient {
  ws: WebSocket;
}

interface PendingRequest {
  clientId: string;
  clientMessageId: number;
  sessionId?: string;
}

interface TargetInfo {
  targetId?: string;
  title?: string;
  url?: string;
  type?: string;
  tabId?: number;
}

interface AttachedTarget {
  sessionId: string;
  tabId?: number;
  targetInfo?: TargetInfo;
}

const app = new Hono();

let extensionWs: WebSocket | null = null;
const cdpClients = new Map<string, CDPClient>();
const attachedTargets = new Map<string, AttachedTarget>();
const pendingRequests = new Map<number, PendingRequest>();
let nextExtensionRequestId = 1;

const ALLOWED_EXTENSION_IDS = getAllowedExtensionIds();
const ALLOW_ANY_EXTENSION = ALLOWED_EXTENSION_IDS.length === 0;
if (ALLOW_ANY_EXTENSION) {
  error('No SSPA_EXTENSION_IDS configured. Allowing any chrome-extension origin.');
}


app.get('/', (c) => {
  return c.text('OK');
});

app.get('/version', (c) => {
  return c.json({ version: VERSION });
});

app.get('/json/version', (c) => {
  const port = getRelayPort();
  return c.json({
    Browser: `single-spa-inspector-pro/${VERSION}`,
    'Protocol-Version': '1.3',
    webSocketDebuggerUrl: getCdpUrl(port),
  });
});

app.get('/json/list', (c) => {
  const targets = Array.from(attachedTargets.values()).map((target) => {
    const targetInfo = target.targetInfo ?? {};
    return {
      id: targetInfo.targetId ?? target.sessionId,
      tabId: target.tabId,
      type: targetInfo.type ?? 'page',
      title: targetInfo.title ?? '',
      url: targetInfo.url ?? '',
      webSocketDebuggerUrl: getCdpUrl(getRelayPort(), target.sessionId),
    };
  });
  return c.json(targets);
});

function sendToExtension(message: unknown): void {
  if (extensionWs?.readyState === WebSocket.OPEN) {
    extensionWs.send(JSON.stringify(message));
  } else {
    error('Extension WebSocket not connected, cannot send message');
  }
}

function sendToCDPClient(clientId: string, message: unknown): void {
  const client = cdpClients.get(clientId);
  if (client?.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message));
  }
}

function broadcastToCDPClients(message: unknown): void {
  for (const client of cdpClients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }
}

function validateExtensionOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const match = origin.match(/^chrome-extension:\/\/([^/]+)/);
  if (!match) return false;
  const id = match[1];
  if (ALLOW_ANY_EXTENSION) {
    log(`Allowing extension origin without allowlist: ${id}`);
    return true;
  }
  return ALLOWED_EXTENSION_IDS.includes(id);
}

function buildTargetInfo(target: AttachedTarget): TargetInfo {
  const targetInfo = target.targetInfo ?? {};
  return {
    targetId: targetInfo.targetId ?? target.sessionId,
    type: targetInfo.type ?? 'page',
    title: targetInfo.title ?? '',
    url: targetInfo.url ?? '',
    tabId: target.tabId ?? targetInfo.tabId,
  };
}

function sendCdpResponse(clientId: string, payload: { id: number; sessionId?: string; result?: unknown }): void {
  sendToCDPClient(clientId, payload);
}

function sendCdpError(clientId: string, payload: { id: number; sessionId?: string; error: string }): void {
  sendToCDPClient(clientId, { id: payload.id, sessionId: payload.sessionId, error: { message: payload.error } });
}

function sendAttachedToTargetEvents(clientId: string): void {
  for (const target of attachedTargets.values()) {
    const targetInfo = buildTargetInfo(target);
    sendToCDPClient(clientId, {
      method: 'Target.attachedToTarget',
      params: {
        sessionId: target.sessionId,
        targetInfo: {
          ...targetInfo,
          attached: true,
        },
        waitingForDebugger: false,
      },
    });
  }
}

function sendTargetCreatedEvents(clientId: string): void {
  for (const target of attachedTargets.values()) {
    const targetInfo = buildTargetInfo(target);
    sendToCDPClient(clientId, {
      method: 'Target.targetCreated',
      params: {
        targetInfo: {
          ...targetInfo,
          attached: true,
        },
      },
    });
  }
}

function handleServerCdpCommand(
  clientId: string,
  message: { id: number; method: string; params?: Record<string, unknown>; sessionId?: string }
): boolean {
  const { id, method, params, sessionId } = message;

  switch (method) {
    case 'Browser.getVersion': {
      sendCdpResponse(clientId, {
        id,
        sessionId,
        result: {
          protocolVersion: '1.3',
          product: `single-spa-inspector-pro/${VERSION}`,
          revision: VERSION,
          userAgent: 'single-spa-inspector-pro-cdp-relay',
          jsVersion: 'V8',
        },
      });
      return true;
    }

    case 'Browser.setDownloadBehavior': {
      sendCdpResponse(clientId, { id, sessionId, result: {} });
      return true;
    }

    case 'Target.setAutoAttach': {
      if (!sessionId) {
        sendAttachedToTargetEvents(clientId);
      }
      sendCdpResponse(clientId, { id, sessionId, result: {} });
      return true;
    }

    case 'Target.setDiscoverTargets': {
      if ((params as { discover?: boolean } | undefined)?.discover) {
        sendTargetCreatedEvents(clientId);
      }
      sendCdpResponse(clientId, { id, sessionId, result: {} });
      return true;
    }

    case 'Target.getTargets': {
      const targetInfos = Array.from(attachedTargets.values()).map((target) => ({
        ...buildTargetInfo(target),
        attached: true,
      }));
      sendCdpResponse(clientId, { id, sessionId, result: { targetInfos } });
      return true;
    }

    case 'Target.getTargetInfo': {
      const requestedTargetId = (params as { targetId?: string } | undefined)?.targetId;
      const targetById = requestedTargetId
        ? Array.from(attachedTargets.values()).find((target) => {
          const targetInfo = buildTargetInfo(target);
          return targetInfo.targetId === requestedTargetId;
        })
        : undefined;
      const targetBySession = sessionId ? attachedTargets.get(sessionId) : undefined;
      const target = targetById ?? targetBySession ?? Array.from(attachedTargets.values())[0];

      if (!target) {
        sendCdpError(clientId, { id, sessionId, error: 'No targets attached' });
        return true;
      }

      sendCdpResponse(clientId, {
        id,
        sessionId,
        result: { targetInfo: buildTargetInfo(target) },
      });
      return true;
    }

    case 'Target.attachToTarget': {
      const requestedTargetId = (params as { targetId?: string } | undefined)?.targetId;
      if (!requestedTargetId) {
        sendCdpError(clientId, { id, sessionId, error: 'Target.attachToTarget requires targetId' });
        return true;
      }

      const target = Array.from(attachedTargets.values()).find((entry) => {
        const targetInfo = buildTargetInfo(entry);
        return targetInfo.targetId === requestedTargetId;
      });

      if (!target) {
        sendCdpError(clientId, { id, sessionId, error: `Target ${requestedTargetId} not found` });
        return true;
      }

      sendCdpResponse(clientId, {
        id,
        sessionId,
        result: { sessionId: target.sessionId },
      });
      return true;
    }

    default:
      return false;
  }
}

function handleExtensionMessage(data: Buffer) {
  try {
    const message = JSON.parse(data.toString()) as ExtensionMessage;

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

      if (method === 'Target.attachedToTarget' && sessionId) {
        const targetInfo = (params as { targetInfo?: TargetInfo }).targetInfo;
        attachedTargets.set(sessionId, {
          sessionId,
          tabId: targetInfo?.tabId,
          targetInfo,
        });
      }

      if (method === 'Target.detachedFromTarget') {
        const detachedSessionId = (params as { sessionId?: string }).sessionId;
        if (detachedSessionId) {
          attachedTargets.delete(detachedSessionId);
        }
      }

      broadcastToCDPClients({ method, params, sessionId });
      return;
    }

    if ('id' in message) {
      const response = message as { id: number; result?: unknown; error?: string };
      const pending = pendingRequests.get(response.id);
      if (!pending) {
        error(`Received response for unknown request id: ${response.id}`);
        return;
      }

      pendingRequests.delete(response.id);
      const payload = response.error
        ? { id: pending.clientMessageId, sessionId: pending.sessionId, error: { message: response.error } }
        : { id: pending.clientMessageId, sessionId: pending.sessionId, result: response.result };

      sendToCDPClient(pending.clientId, payload);
    }
  } catch (e) {
    error('Error parsing extension message:', e);
  }
}

function handleCDPMessage(data: Buffer, clientId: string) {
  try {
    const message = JSON.parse(data.toString()) as { id?: number; method?: string; params?: Record<string, unknown>; sessionId?: string } | { method: 'forwardCDPCommand'; params: { method: string; sessionId?: string; params?: Record<string, unknown> }; id?: number };

    if (message.method === 'forwardCDPCommand') {
      const { params, id } = message;
      if (!params?.method || !id) {
        return;
      }
      const relayId = nextExtensionRequestId++;
      pendingRequests.set(relayId, {
        clientId,
        clientMessageId: id,
        sessionId: params.sessionId,
      });
      sendToExtension({
        id: relayId,
        method: 'forwardCDPCommand',
        params,
      });
      return;
    }

    if (!message.method || message.id === undefined) {
      return;
    }

    const serverHandled = handleServerCdpCommand(clientId, {
      id: message.id,
      method: message.method,
      params: message.params,
      sessionId: message.sessionId,
    });

    if (serverHandled) {
      return;
    }

    const relayId = nextExtensionRequestId++;
    pendingRequests.set(relayId, {
      clientId,
      clientMessageId: message.id,
      sessionId: message.sessionId,
    });

    sendToExtension({
      id: relayId,
      method: 'forwardCDPCommand',
      params: {
        method: message.method,
        sessionId: message.sessionId,
        params: message.params,
      },
    });
  } catch (e) {
    error('Error parsing CDP message:', e);
  }
}

export async function startRelayServer(): Promise<void> {
  const port = getRelayPort();

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`);
      const init: RequestInit & { duplex?: 'half' } = {
        method: req.method,
        headers: req.headers as HeadersInit,
      };

      if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.from(chunk));
        }
        init.body = Buffer.concat(chunks);
        init.duplex = 'half';
      }

      const request = new Request(url, init);
      const response = await app.fetch(request);
      const body = await response.text();
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(body);
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
        error(`Rejected extension connection with invalid origin: ${origin}. Allowed: ${ALLOWED_EXTENSION_IDS.join(', ') || 'none'}`);
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
        attachedTargets.clear();
        pendingRequests.clear();
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

      cdpClients.set(clientId, {
        ws: ws as WebSocket,
      });

      ws.on('message', (data) => {
        if (Buffer.isBuffer(data)) {
          handleCDPMessage(data, clientId);
        }
      });

      ws.on('close', () => {
        log(`CDP WebSocket disconnected: ${clientId}`);
        cdpClients.delete(clientId);
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
