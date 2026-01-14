export const VERSION = '0.0.1';

export const DEFAULT_PORT = 19988;

export function getEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getRelayPort(): number {
  const port = getEnv('SSPA_MCP_PORT');
  return port ? parseInt(port, 10) : DEFAULT_PORT;
}

export function getRelayToken(): string | undefined {
  return getEnv('SSPA_MCP_TOKEN');
}

export function getCdpUrl(port: number, clientId?: string): string {
  const id = clientId ?? 'default';
  return `ws://127.0.0.1:${port}/cdp/${id}`;
}

export function getExtensionUrl(port: number): string {
  return `ws://127.0.0.1:${port}/extension`;
}

export function isLocalhost(address: string): boolean {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

export function log(...args: unknown[]): void {
  console.log('[SSPA-MCP]', new Date().toISOString(), ...args);
}

export function error(...args: unknown[]): void {
  console.error('[SSPA-MCP ERROR]', new Date().toISOString(), ...args);
}
