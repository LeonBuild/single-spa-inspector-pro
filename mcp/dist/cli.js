import { startRelayServer } from './relay.js';
import { startMcpServer } from './mcp.js';
import { VERSION, getRelayPort } from './utils.js';
const args = process.argv.slice(2);
const command = args[0];
const portArg = args.find((arg, i) => args[i - 1] === '--port' || arg === '--port');
const port = portArg ? parseInt(portArg, 10) : getRelayPort();
const help = args.includes('--help') || args.includes('-h');
const version = args.includes('--version') || args.includes('-v');
console.log(`sspa-mcp v${VERSION}`);
if (help) {
    console.log(`
Usage: sspa-mcp <command> [options]

Commands:
  relay    Start the CDP Relay server
  serve    Start the MCP server (includes relay if not running)

Options:
  --port <port>  Port to listen on (default: 19988)
  --help, -h     Show this help
  --version, -v  Show version
`);
    process.exit(0);
}
if (version) {
    process.exit(0);
}
switch (command) {
    case 'relay':
        process.env.SSPA_MCP_PORT = String(port);
        startRelayServer().catch((e) => {
            console.error('Failed to start relay server:', e);
            process.exit(1);
        });
        break;
    case 'serve':
        process.env.SSPA_MCP_PORT = String(port);
        startMcpServer().catch((e) => {
            console.error('Failed to start MCP server:', e);
            process.exit(1);
        });
        break;
    default:
        if (command) {
            console.error(`Unknown command: ${command}`);
        }
        else {
            console.error('No command specified');
        }
        console.error('Run sspa-mcp --help for usage');
        process.exit(1);
}
//# sourceMappingURL=cli.js.map