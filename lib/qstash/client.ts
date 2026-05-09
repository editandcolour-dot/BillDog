import { Client } from '@upstash/qstash';

const token = process.env.QSTASH_TOKEN;

if (!token) {
  throw new Error('QSTASH_TOKEN is not defined in environment variables');
}

export const qstashClient = new Client({ token });
