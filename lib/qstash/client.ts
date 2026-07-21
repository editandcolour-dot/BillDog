import { Client } from '@upstash/qstash';

/**
 * QStash base URL per region.
 *
 * The SDK default is https://qstash.upstash.io (EU).
 * US region requires https://qstash-us-east-1.upstash.io.
 *
 * Set QSTASH_URL env var to override. If not set, falls back to
 * the US endpoint since Railway runs in us-east.
 */
const DEFAULT_US_URL = 'https://qstash-us-east-1.upstash.io';

let _client: Client | null = null;

export function getQstashClient(): Client {
  if (!_client) {
    const token = process.env.QSTASH_TOKEN;
    if (!token) {
      throw new Error('QSTASH_TOKEN is not defined in environment variables');
    }
    const baseUrl = process.env.QSTASH_URL || DEFAULT_US_URL;
    _client = new Client({ token, baseUrl });
  }
  return _client;
}
