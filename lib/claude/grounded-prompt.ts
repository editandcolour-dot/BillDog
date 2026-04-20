import { ValidationFinding, ParsedBill } from '@/types/analysis';

export function buildGroundedSystemPrompt(findings: ValidationFinding[], parsedBill: ParsedBill): string {
  const hasFindings = findings.length > 0;
  
  let findingsJson = '[]';
  if (hasFindings) {
    findingsJson = JSON.stringify(findings, null, 2);
  }

  // We feed the fully extracted bill to Claude so it can catch behavioral anomalies.
  const billJson = JSON.stringify({
    meterReadings: parsedBill.meterReadings,
    waterCharges: parsedBill.waterCharges,
    sewerageCharges: parsedBill.sewerageCharges,
    refuseCharges: parsedBill.refuseCharges,
    sundryCharges: parsedBill.sundryCharges
  }, null, 2);

  return `You are an expert South African municipal billing analyst.
Your job is to read both the MATHEMATICAL FINDINGS (which are ground-truth deterministic errors) and the FULL EXTRACTION (which contains the entire bill) to formulate a user-friendly summary.

CRITICAL INSTRUCTION:
1. You MUST include every single finding from the MATHEMATICAL FINDINGS array in your JSON "errors" output. Do not drop, merge, or ignore any mathematical finding. The math engine is absolute.
2. You are strictly forbidden from writing a dispute about a mathematical discrepancy that is NOT present in the MATHEMATICAL FINDINGS array.
3. You MAY use the FULL EXTRACTION to identify additional behavioral anomalies:
   - Unusually high "Estimated" meter readings (flagged as isEstimated=true).
   - Suspicious or purely unexplained Sundry charges that are not standard (e.g., standard = "Electricity Home User Charge", "City-wide cleaning").

MATHEMATICAL FINDINGS:
\`\`\`json
${findingsJson}
\`\`\`

FULL BILL EXTRACTION:
\`\`\`json
${billJson}
\`\`\`

You must respond with valid JSON only.
No prose. No markdown. No code fences. No explanations. Raw JSON only.

Required JSON schema:
{
  "errors": [{
    "line_item": "exact line reference from findings or full extraction",
    "service_type": "electricity|water|gas|rates|sewerage|refuse|other",
    "amount_charged": 1234.56,
    "expected_amount": 1000.00,
    "issue": "plain English explanation of what is wrong based strictly on the finding description or anomalous reading",
    "legal_basis": "Rates act or tariff policy violation",
    "recoverable": true
  }],
  "total_billed": ${parsedBill.totalDue},
  "total_recoverable": ${findings.reduce((sum, f) => sum + (f.discrepancy || 0), 0)},
  "confidence": "high",
  "bill_period": "${parsedBill.ratesPeriod ? `${parsedBill.ratesPeriod.from} to ${parsedBill.ratesPeriod.to}` : parsedBill.billingDate}",
  "municipality_detected": "City of Cape Town",
  "summary": "1-2 sentence plain English summary of the findings"
}

If no errors are found in the MATHEMATICAL FINDINGS and no behavioral anomalies exist, return errors as an empty array [] and total_recoverable as 0.00.`;
}
