/**
 * City of Cape Town Bill Parser — Deterministic Regex Extraction
 *
 * Extracts every line item from a CoCT municipal bill using regex patterns
 * confirmed against 36 real bills. NO AI. NO GUESSING.
 */

import type { ParsedBill, RatesSegment, GeneralCharge, MeterReading } from '@/types/analysis';

// ── Regex patterns ─────
const RE_BILLING_DATE = /Account\s+details\s+as\s+at\s+(\d{2}\/\d{2}\/\d{4})/i;
const RE_TOTAL_DUE = /Current\s+account:\s*Total\s+due\s+([\d,]+\.?\d*)/i;
const RE_RATES_PERIOD = /\(\s*Period\s+(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})\s*\)\s*(\d+)\s*Days/i;
const RE_VALUATION = /Rateable\s+portion\s+of\s+valuation\s+From\s*:\s*(\d{2}\/\d{2}\/\d{4})\s+R\s+([\d,]+)\s*-\s*R\s+([\d,]+)\s*=\s*R\s+([\d,]+)/i;
const RE_RATES_LINE = /#\s+From\s+(\d{2}\/\d{2}\/\d{4})\s*:\s*R\s+([\d,]+\.?\d*)\s*@\s*([\d.]+)\s*÷\s*(\d+)\s*x\s*(\d+)\s+([\d,]+\.?\d*?)(-?)\s*$/gm;
const RE_VAT_LINE = /Add 15% VAT on amounts marked with\s*(?:&|&\s*above)\s+([\d,]+\.?\d*)/i;

// ── Helpers ──────────────────────────────────────────────

function parseAmount(raw: string): number {
  if (!raw) return 0;
  return parseFloat(raw.replace(/,/g, ''));
}

function isCoctBill(text: string): boolean {
  return RE_BILLING_DATE.test(text) && /PROPERTY\s+RATES/i.test(text);
}

function extractChunk(text: string, start: string, stops: string[]): string {
  const startRegex = new RegExp('^' + start + '\\b', 'm');
  const startMatch = text.match(startRegex);
  if (!startMatch || startMatch.index === undefined) return '';
  const startIdx = startMatch.index;
  
  let endIdx = text.length;
  for (const stop of stops) {
    const stopRegex = new RegExp('^' + stop + '\\b', 'm');
    const stopMatch = text.substring(startIdx + start.length).match(stopRegex);
    if (stopMatch && stopMatch.index !== undefined) {
      const idx = startIdx + start.length + stopMatch.index;
      if (idx < endIdx) endIdx = idx;
    }
  }
  return text.substring(startIdx, endIdx);
}

function getSectionSubtotal(chunk: string): number {
  if (!chunk) return 0;
  // Match the subtotal at the end of the chunk, ignoring '3 of 3' page bleed
  const matches = [...chunk.matchAll(/^([\d,]+\.\d+)(?:\s+\d+ of \d+)?\s*$/gm)];
  if (matches.length > 0) {
    return parseAmount(matches[matches.length - 1][1]);
  }
  return 0;
}

function parseTierLines(chunk: string, serviceType: GeneralCharge['serviceType']): GeneralCharge[] {
  const charges: GeneralCharge[] = [];
  const lines = chunk.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Multi-tier parsing (Pass 1 & Pass 2)
    if (line.startsWith('&') && line.includes('(1)')) {
      let isTriple = false;
      let tripleTotal = 0;
      if (i + 1 < lines.length && lines[i + 1].startsWith('(3)')) {
         isTriple = true;
         const match = lines[i+1].match(/([\d,]+\.\d+)\s*$/);
         if (match) tripleTotal = parseAmount(match[1]);
      }
      
      if (isTriple) {
        charges.push({ serviceType, description: line + ' ' + lines[i+1], amount: tripleTotal, hasVat: true });
        // We concatenate lines[i+1] so full tier kl string is searchable
      } else {
        const match = line.match(/^(&.*?\(1\).*?)([\d,]+\.\d+)\s*$/);
        if (match) {
           charges.push({ serviceType, description: match[1].trim(), amount: parseAmount(match[2]), hasVat: true });
        }
      }
    } 
    // Water Fixed Basic Charge
    else if (serviceType === 'water' && line.toLowerCase().includes('fixed basic charge')) {
        const match = line.match(/^(?:&\s+)?(.*?)([\d,]+\.\d+)\s*$/);
        console.log(`[RAW_PARSER_DEBUG] WATER_FIXED parsed! line="${line}", matched=${!!match}, amount=${match ? match[2] : 'N/A'}`);
        if (match) charges.push({ serviceType, description: match[1].trim(), amount: parseAmount(match[2]), hasVat: line.startsWith('&') });
    }
    // Refuse Charge
    else if (serviceType === 'refuse' && line.toLowerCase().includes('refuse charge')) {
        const match = line.match(/^(?:&\s+)?(.*?)([\d,]+\.\d+)\s*$/);
        if (match) charges.push({ serviceType, description: match[1], amount: parseAmount(match[2]), hasVat: line.startsWith('&') });
    }
    // Sundries (HUC, City-wide cleaning, etc.)
    else if (serviceType === 'sundry' && line.match(/(Home User Charge|Elec HU service|cleaning|Dishonoured|Returned cheque)/i)) {
        const match = line.match(/^(?:&\s+)?(.*?)([\d,]+\.\d+)\s*$/);
        if (match) charges.push({ serviceType, description: match[1].trim(), amount: parseAmount(match[2]), hasVat: line.startsWith('&') });
    }
    // Catch-all for any other VAT-able items we missed
    else if (line.startsWith('&')) {
        const amountMatch = line.match(/(-?[\d,]+\.\d+)\s*$/);
        if (amountMatch) {
            const amount = parseAmount(amountMatch[1]);
            charges.push({ serviceType, description: line, amount, hasVat: true });
        }
    }
  }
  
  return charges;
}

// ── Main parser ─────────────────────────────────────────

export function parseCoctBill(text: string): ParsedBill | null {
  console.log(`[FULL_TEXT_DEBUG]\n${text}\n============`);
  if (!isCoctBill(text)) return null;

  const billingDateMatch = text.match(RE_BILLING_DATE);
  const billingDate = billingDateMatch ? billingDateMatch[1] : '';
  const invoiceNumber = billingDate || 'UNKNOWN';

  const totalDueMatch = text.match(RE_TOTAL_DUE);
  const totalDue = totalDueMatch ? parseAmount(totalDueMatch[1]) : 0;

  // 1. Chunking
  const chunkRates = extractChunk(text, 'PROPERTY RATES', ['WATER', 'REFUSE', 'SEWERAGE', 'SUNDRIES', 'Add 15% VAT']);
  const chunkWater = extractChunk(text, 'WATER', ['REFUSE', 'SEWERAGE', 'SUNDRIES', 'Add 15% VAT']);
  console.log(`[CHUNK_WATER] ===\n${chunkWater}\n===`);
  const chunkRefuse = extractChunk(text, 'REFUSE', ['SEWERAGE', 'SUNDRIES', 'Add 15% VAT']);
  const chunkSewerage = extractChunk(text, 'SEWERAGE', ['SUNDRIES', 'Add 15% VAT']);
  const chunkSundries = extractChunk(text, 'SUNDRIES', ['Add 15% VAT']);

  // 2. Subtotals
  const subtotals = {
    ratesNet: getSectionSubtotal(chunkRates),
    water: getSectionSubtotal(chunkWater),
    refuse: getSectionSubtotal(chunkRefuse),
    sewerage: getSectionSubtotal(chunkSewerage),
    sundries: getSectionSubtotal(chunkSundries)
  };

  // 3. VAT
  const vatMatch = text.match(RE_VAT_LINE);
  const vatAmount = vatMatch ? parseAmount(vatMatch[1]) : 0;

  // 4. Rates Segment Legacy extraction
  const periodMatch = chunkRates.match(RE_RATES_PERIOD);
  const ratesPeriod = periodMatch ? { from: periodMatch[1], to: periodMatch[2], days: parseInt(periodMatch[3], 10) } : null;

  const valMatch = chunkRates.match(RE_VALUATION);
  const valuation = valMatch ? { total: parseAmount(valMatch[2]), exemption: parseAmount(valMatch[3]), rateable: parseAmount(valMatch[4]), fromDate: valMatch[1] } : null;

  const rates: RatesSegment[] = [];
  RE_RATES_LINE.lastIndex = 0;
  let rm;
  while ((rm = RE_RATES_LINE.exec(chunkRates)) !== null) {
    const isRebate = rm[7] === '-';
    const fromDate = rm[1], value = parseAmount(rm[2]), annualRate = parseFloat(rm[3]);
    const daysInYear = parseInt(rm[4], 10), billingDays = parseInt(rm[5], 10), amount = parseAmount(rm[6]);

    if (isRebate) {
      const parent = rates.find(r => r.fromDate === fromDate && r.annualRate === annualRate && r.billingDays === billingDays);
      if (parent) {
        parent.rebateBase = value; parent.rebateBilledAmount = amount;
      } else {
        rates.push({ fromDate, rateableValue: 0, annualRate, daysInYear, billingDays, billedAmount: 0, rebateBase: value, rebateBilledAmount: amount });
      }
    } else {
      rates.push({ fromDate, rateableValue: value, annualRate, daysInYear, billingDays, billedAmount: amount });
    }
  }

  // 5. Service Charges Extraction
  const waterCharges = parseTierLines(chunkWater, 'water');
  const refuseCharges = parseTierLines(chunkRefuse, 'refuse');
  const sewerageCharges = parseTierLines(chunkSewerage, 'sewerage');
  const sundryCharges = parseTierLines(chunkSundries, 'sundry');

  // 6. Canonical Water kl
  const klMatch = chunkWater.match(/Consumption\s+([\d.]+)\s*kl/i);
  const canonicalWaterConsumptionKl = klMatch ? parseFloat(klMatch[1]) : 0;

  // 7. Meter Readings
  const meterReadings: MeterReading[] = [];
  const RE_WATER_METER = /WATER\s+(\w+)\s+\d+\s+([\d.]+kl)\s+\((Actual|Estimated)\)\s+([\d.]+kl)\s+\((Actual|Estimated)\)\s+([\d.]+kl)/gi;
  let wm;
  while ((wm = RE_WATER_METER.exec(text)) !== null) {
    meterReadings.push({
      service: 'water',
      meterNumber: wm[1],
      readingFrom: wm[2],
      readingTo: wm[4],
      isEstimated: wm[3] === 'Estimated' || wm[5] === 'Estimated',
      consumption: parseFloat(wm[6])
    });
  }

  const RE_ELEC_METER = /PREPAID\s+(\d+)\s+(\d{2}\.\w+\.\d{4})\s+(\d{2}\.\w+\.\d{4})\s+([\d.]+)units/gi;
  let em;
  while ((em = RE_ELEC_METER.exec(text)) !== null) {
    meterReadings.push({
      service: 'electricity',
      meterNumber: em[1],
      readingFrom: em[2],
      readingTo: em[3],
      isEstimated: false, 
      consumption: parseFloat(em[4])
    });
  }

  return {
    invoiceNumber,
    billingDate,
    totalDue,
    ratesPeriod,
    valuation,
    rates,
    canonicalWaterConsumptionKl,
    meterReadings,
    waterCharges,
    refuseCharges,
    sewerageCharges,
    sundryCharges,
    subtotals,
    vatAmount
  };
}
