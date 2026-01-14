import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { chromium, type Browser, type Page } from 'playwright-core';
import {
  getRelayPort,
  getCdpUrl,
  getRelayToken,
  log,
  error,
  sleep,
} from './utils.js';

interface TabInfo {
  tabId: number;
  page: Page;
  browserContext: unknown;
}

let browser: Browser | null = null;
let currentTab: TabInfo | null = null;
let relayServerProcess: ReturnType<typeof import('child_process').spawn> | null = null;

async function ensureRelayServer(): Promise<void> {
  try {
    const response = await fetch(`http://localhost:${getRelayPort()}/version`, {
      signal: AbortSignal.timeout(2000),
    });
    if (response.ok) {
      log('Relay server already running');
      return;
    }
  } catch {
    log('Relay server not running, attempting to start...');
  }

  try {
    const { spawn } = await import('child_process');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const relayPath = path.join(__dirname, 'relay.js');

    relayServerProcess = spawn('node', [relayPath], {
      stdio: 'pipe',
    });

    relayServerProcess.stdout?.on('data', (data: Buffer) => {
      log(`[Relay] ${data.toString().trim()}`);
    });

    relayServerProcess.stderr?.on('data', (data: Buffer) => {
      error(`[Relay Error] ${data.toString().trim()}`);
    });

    for (let i = 0; i < 10; i++) {
      await sleep(1000);
      try {
        await fetch(`http://localhost:${getRelayPort()}/version`, {
          signal: AbortSignal.timeout(1000),
        });
        log('Relay server started successfully');
        return;
      } catch {
        log('Waiting for relay server...');
      }
    }

    throw new Error('Failed to start relay server');
  } catch (e) {
    error('Error starting relay server:', e);
    throw e;
  }
}

async function ensureConnection(): Promise<TabInfo> {
  if (currentTab?.page) {
    try {
      await currentTab.page.title();
      return currentTab;
    } catch {
      currentTab = null;
    }
  }

  await ensureRelayServer();

  const wsUrl = getCdpUrl(getRelayPort(), 'mcp-client');
  const token = getRelayToken();
  const connectUrl = token ? `${wsUrl}?token=${token}` : wsUrl;

  log('Connecting to browser over CDP:', connectUrl);

  browser = await chromium.connectOverCDP(connectUrl, {
    timeout: 30000,
  });

  const context = browser.contexts()[0] || await browser.newContext();
  const pages = context.pages();

  if (pages.length > 0) {
    currentTab = {
      tabId: 0,
      page: pages[0],
      browserContext: context,
    };
  } else {
    const page = await context.newPage();
    await page.goto('about:blank');
    currentTab = {
      tabId: 0,
      page,
      browserContext: context,
    };
  }

  await currentTab.page.evaluate(() => {
    console.log('MCP connected to page');
  });

  log('Connected to browser');
  return currentTab;
}

interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const server = new Server(
  {
    name: 'single-spa-inspector-pro-mcp',
    version: '0.0.1',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const tools: Tool[] = [
  {
    name: 'screenshot',
    description: 'Take a screenshot of the current page',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'accessibility_snapshot',
    description: 'Get accessibility snapshot of the page',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'execute',
    description: 'Execute JavaScript code in the page context',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'JavaScript code to execute',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'reset',
    description: 'Reset the CDP connection',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'clear_cache_and_reload',
    description: 'Clear browser cache and reload the page',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['light', 'aggressive'],
          description: 'Clear mode: light (ignore cache) or aggressive (clear all)',
        },
      },
    },
  },
  {
    name: 'ensure_fresh_render',
    description: 'Ensure the page is freshly rendered (clear cache if needed)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'navigate',
    description: 'Navigate to a URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to navigate to',
        },
      },
      required: ['url'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    const tab = await ensureConnection();

    switch (name) {
      case 'screenshot': {
        const screenshot = await tab.page.screenshot({
          type: 'png',
        });
        return {
          content: [
            {
              type: 'image',
              data: Buffer.from(screenshot).toString('base64'),
              mimeType: 'image/png',
            },
          ],
        };
      }

      case 'accessibility_snapshot': {
        const accessibilitySnapshot = (tab.page as Page & { accessibilitySnapshot(): Promise<unknown> }).accessibilitySnapshot;
        const snapshot = await accessibilitySnapshot();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(snapshot, null, 2),
            },
          ],
        };
      }

      case 'execute': {
        const code = args.code as string;
        const result = await tab.page.evaluate((codeStr: string) => {
          try {
            return eval(codeStr);
          } catch (e) {
            return { error: String(e) };
          }
        }, code);
        return {
          content: [
            {
              type: 'text',
              text: String(result),
            },
          ],
        };
      }

      case 'reset': {
        if (browser) {
          await browser.close();
        }
        browser = null;
        currentTab = null;
        return {
          content: [
            {
              type: 'text',
              text: 'Connection reset',
            },
          ],
        };
      }

      case 'clear_cache_and_reload': {
        const mode = (args.mode as string) || 'light';
        if (mode === 'light') {
          await tab.page.reload({ timeout: 30000 });
        } else {
          const client = await tab.page.context().newCDPSession(tab.page);
          await client.send('Network.clearBrowserCache');
          await client.send('Network.clearBrowserCookies');
          await tab.page.reload({ timeout: 30000 });
        }
        await tab.page.waitForLoadState('domcontentloaded');
        return {
          content: [
            {
              type: 'text',
              text: `Cache cleared with mode: ${mode}`,
            },
          ],
        };
      }

      case 'ensure_fresh_render': {
        await tab.page.reload({ timeout: 30000 });
        await tab.page.waitForLoadState('domcontentloaded');
        return {
          content: [
            {
              type: 'text',
              text: 'Page reloaded with fresh cache',
            },
          ],
        };
      }

      case 'navigate': {
        await tab.page.goto(args.url as string, { waitUntil: 'domcontentloaded' });
        return {
          content: [
            {
              type: 'text',
              text: `Navigated to ${args.url}`,
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
        };
    }
  } catch (e) {
    error(`Error executing tool ${name}:`, e);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${String(e)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  log('Starting MCP server...');

  const transport = new StdioServerTransport();
  await server.connect(transport);

  log('MCP server ready');

  process.on('SIGINT', async () => {
    log('Shutting down...');
    if (browser) {
      await browser.close();
    }
    if (relayServerProcess) {
      relayServerProcess.kill();
    }
    process.exit(0);
  });
}

export async function startMcpServer(): Promise<void> {
  await main();
}

main().catch((e) => {
  error('Fatal error:', e);
  process.exit(1);
});
