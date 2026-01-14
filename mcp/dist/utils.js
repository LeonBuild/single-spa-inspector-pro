export const VERSION = '0.0.1';
export const DEFAULT_PORT = 19988;
export function getEnv(key, defaultValue) {
    return process.env[key] ?? defaultValue;
}
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export function getRelayPort() {
    const port = getEnv('SSPA_MCP_PORT');
    return port ? parseInt(port, 10) : DEFAULT_PORT;
}
export function getRelayToken() {
    return getEnv('SSPA_MCP_TOKEN');
}
export function getCdpUrl(port, clientId) {
    const id = clientId ?? 'default';
    return `ws://127.0.0.1:${port}/cdp/${id}`;
}
export function getExtensionUrl(port) {
    return `ws://127.0.0.1:${port}/extension`;
}
export function isLocalhost(address) {
    return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}
export function log(...args) {
    console.log('[SSPA-MCP]', new Date().toISOString(), ...args);
}
export function error(...args) {
    console.error('[SSPA-MCP ERROR]', new Date().toISOString(), ...args);
}
//# sourceMappingURL=utils.js.map