import { getClaudeClient } from './client';

const MODEL = 'claude-sonnet-4-20250514';

export interface EmailResolution {
  amount_found: boolean;
  amount: number | null;
  currency: string;
  confidence: 'high' | 'low';
}

const PARSE_SYSTEM_PROMPT = `You are a South African municipal billing resolution parser.
Analyse the inbound email response from a municipality regarding a billing dispute.
Identify if the municipality has agreed to credit, reverse, or reduce the consumer's bill, and extract the exact amount.

You must return valid JSON only. No prose. No markdown. No code blocks.
If no amount is found or no resolution is offered, return amount_found: false, amount: null.

Required JSON schema:
{
  "amount_found": boolean,
  "amount": number | null,
  "currency": "ZAR",
  "confidence": "high" | "low"
}

RULES:
1. Return confidence: "high" ONLY if a specific ZAR amount is clearly stated as credited, reversed, or reduced.
2. Return confidence: "low" if they say it will be fixed but don't state an amount, or if the wording is ambiguous.
3. If they deny the dispute or simply acknowledge receipt without resolving, return amount_found: false.
`;

export async function parseMunicipalityResponse(emailBody: string): Promise<EmailResolution> {
  const client = getClaudeClient();

  const trimmedText = emailBody.substring(0, 8000); // Max safe prompt length

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: PARSE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: trimmedText }],
    });

    if (response.content.length === 0 || response.content[0].type !== 'text') {
      throw new Error('Empty or non-text response from Claude');
    }

    const rawStr = response.content[0].text;
    const cleaned = rawStr.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    
    return JSON.parse(cleaned) as EmailResolution;

  } catch (error) {
    console.error('[claude/parseMunicipalityResponse] Failed', error);
    // Safe fallback — don't crash the webhook
    return { amount_found: false, amount: null, currency: 'ZAR', confidence: 'low' };
  }
}
