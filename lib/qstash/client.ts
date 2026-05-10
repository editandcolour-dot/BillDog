import { Client } from '@upstash/qstash';

let _client: Client | null = null;

export function getQstashClient(): Client {
  if (!_client) {
    const token = process.env.QSTASH_TOKEN;
    if (!token) {
      throw new Error('QSTASH_TOKEN is not defined in environment variables');
    }
    _client = new Client({ token });
  }
  return _client;
}

/** @deprecated Use getQstashClient() instead — kept for backward compat with dynamic imports */
export const qstashClient = new Proxy({} as Client, {
  get(_target, prop) {
    return (getQstashClient() as any)[prop];
  },
});
