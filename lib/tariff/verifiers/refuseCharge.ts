export interface RefuseVerificationResult {
  result: 'PASS' | 'FAIL' | 'SKIP';
  approved_amount?: number;
  delta?: number;
  confidence?: 'CONFIRMED' | 'BILL-VERIFIED' | 'SECONDARY';
  source_url?: string;
}

export function verifyRefuseCharge(
  billedAmount: number,
  billingDateStr: string, // format DD/MM/YYYY
  municipalityCode = 'CoCT'
): RefuseVerificationResult {
  if (municipalityCode !== 'CoCT') {
    return { result: 'SKIP' };
  }

  const parts = billingDateStr.split('/');
  let date: Date;
  if (parts.length === 3) {
    date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  } else {
    // If we can't parse the date, skip determinism
    return { result: 'SKIP' };
  }

  const time = date.getTime();
  const d2022 = new Date(2022, 6, 1).getTime(); // 1 Jul 2022
  const d2023 = new Date(2023, 6, 1).getTime(); // 1 Jul 2023
  const d2024 = new Date(2024, 6, 1).getTime(); // 1 Jul 2024
  const d2025 = new Date(2025, 6, 1).getTime(); // 1 Jul 2025
  const d2026 = new Date(2026, 6, 1).getTime(); // 1 Jul 2026

  let approvedAmount = 0;
  let source_url = 'https://www.capetown.gov.za/Family%20and%20home/residential-utility-services/residential-tariffs-and-ranges';

  if (time >= d2022 && time < d2023) {
    approvedAmount = 149.13;
  } else if (time >= d2023 && time < d2024) {
    approvedAmount = 157.30;
  } else if (time >= d2024 && time < d2025) {
    approvedAmount = 166.26;
  } else if (time >= d2025 && time < d2026) {
    approvedAmount = 178.52;
  } else {
    // Out of known range
    return { result: 'SKIP' };
  }

  // Exact match because it is a flat fee, but we allow 1 cent precision differences
  const delta = billedAmount - approvedAmount;
  if (Math.abs(delta) > 0.02) {
    return {
      result: 'FAIL',
      approved_amount: approvedAmount,
      delta,
      confidence: 'CONFIRMED',
      source_url
    };
  }

  return { result: 'PASS' };
}
