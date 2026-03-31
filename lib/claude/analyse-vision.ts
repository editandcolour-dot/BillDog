import { getClaudeClient } from './client';
import { AnalysisResult } from '@/types/analysis';

const MODEL = 'claude-sonnet-4-20250514';

const VISION_SYSTEM_PROMPT = `You are an expert South African municipal billing analyst.
You specialise in identifying overcharges, incorrect tariffs, and billing errors in
municipal accounts from City of Cape Town, eThekwini, Johannesburg, Tshwane, and Ekurhuleni.

Analyse the provided images of this municipal bill and extract all key data, PLUS identify ALL billing errors.

ERROR DETECTION RULES:
1. ESTIMATED WATER READINGS: If the bill shows "Estimated" consumption that is more than 150% above the historical or average consumption, flag it.
2. SEWERAGE OVERCHARGES: If sewerage is calculated as a percentage of water consumption AND water is estimated, sewerage is also inflated.
3. PROPERTY RATES VALUATION: Discrepancy in valuation figure.
4. UNEXPLAINED CHARGES: Sundry, miscellaneous with no clear description.
5. DUPLICATE CHARGES.
6. MATHEMATICAL ERRORS.
7. BACKDATED CHARGES: >3 months prior without notice.
8. TARIFF ERRORS.

LEGITIMATE CHARGES (Do NOT flag):
- City of Cape Town Electricity Home User Charge 
- Fixed Basic Charges on water or sewerage
- City-wide cleaning charges
- Refuse removal
- VAT calculated at 15%

CRITICAL: You must respond with valid JSON only. No prose. No markdown. raw JSON only.

Required JSON schema:
{
  "errors": [{
    "line_item": "...",
    "service_type": "electricity|water|gas|rates|sewerage|refuse|other",
    "amount_charged": 1234.56,
    "expected_amount": 1000.00,
    "issue": "...",
    "legal_basis": "...",
    "recoverable": true
  }],
  "total_billed": 5000.00,
  "total_recoverable": 234.56,
  "confidence": "high|medium|low",
  "account_number": "123456789",
  "bill_period": "March 2026",
  "municipality_detected": "City of Cape Town",
  "summary": "1-2 sentence plain English summary",
  "account_confidence": 0.95,
  "total_confidence": 0.98
}`;

export interface VisionAnalysisResult extends AnalysisResult {
  account_number: string | null;
  account_confidence?: number;
  total_confidence?: number;
  bill_text?: string; // We can ask Claude to output raw text if needed, but we keep it minimal.
}

export async function analyseImages(base64Images: { data: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' }[]): Promise<VisionAnalysisResult> {
  const client = getClaudeClient();
  
  const contentBlocks = base64Images.map((img) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: img.mimeType,
      data: img.data,
    },
  }));

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    system: VISION_SYSTEM_PROMPT,
    messages: [
      { 
        role: 'user', 
        content: [
          ...contentBlocks,
          { type: 'text', text: 'Please extract the bill details and identify errors according to the system prompt.' }
        ]
      }
    ]
  });

  if (response.content.length === 0 || response.content[0].type !== 'text') {
    throw new Error('Empty or non-text Claude response for vision analysis');
  }

  const rawJson = response.content[0].text;
  const cleaned = rawJson.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as VisionAnalysisResult;
    return parsed;
  } catch (err) {
    console.error('[claude/analyse-vision] JSON Parse Error:', err);
    throw new Error('Claude returned invalid JSON');
  }
}
