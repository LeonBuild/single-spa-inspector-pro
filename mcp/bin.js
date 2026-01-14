#!/usr/bin/env node

import { startRelayServer } from './dist/relay.js';
import { startMcpServer } from './dist/mcp.js';
import { VERSION } from './dist/utils.js';
import { cac } from 'cac';

const cli = cac('sspa-mcp');

cli.version(VERSION);
cli.help();

cli
  .command('relay', 'Start the CDP Relay server')
  .option('--port <port>', 'Port to listen on', { default: 19988 })
  .action(async (options) => {
    process.env.SSPA_MCP_PORT = String(options.port);
    await startRelayServer();
  });

cli
  .command('serve', 'Start the MCP server (includes relay if not running)')
  .option('--port <port>', 'Relay server port', { default: 19988 })
  .action(async (options) => {
    process.env.SSPA_MCP_PORT = String(options.port);
    await startMcpServer();
  });

cli.parse();
