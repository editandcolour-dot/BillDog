import Anthropic from '@anthropic-ai/sdk';
import { maybeRunModelGuardOnce } from './model-guard';

let client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  // First Claude call in the process triggers the dead-model guard once
  // (cached, fire-and-forget — warns but never blocks or throws).
  maybeRunModelGuardOnce();
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('[FATAL] ANTHROPIC_API_KEY is not set');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}
