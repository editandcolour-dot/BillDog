import type { 
  ParsedBill, 
  RatesSegment, 
  GeneralCharge, 
  MeterReading,
  WaterFixedBasicCharge,
  RefuseCharge,
  HucCharge,
  OtherCharge,
  SectionSubtotal
} from '@/types/analysis';

// ── Regex patterns ─────
const RE_BILLING_DATE = /Account\s+details\s+as\s+at\s+(\d{2}\/\d{2}\/\d{4})/i;
const RE_TOTAL_DUE = /Current\s+account:\s*Total\s+due\s+([\d,]+\.?\d*)/i;
const RE_RATES_PERIOD = /\(\s*Period\s+(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})\s*\)\s*(\d+)\s*Days/i;
const RE_VALUATION = /Rateable\s+portion\s+of\s+valuation\s+From\s*:\s*(\d{2}\/\d{2}\/\d{4})\s+R\s+([\d,]+)\s*-\s*R\s+([\d,]+)\s*=\s*R\s+([\d,]+)/i;
const RE_VAT_LINE = /Add 15% VAT on amounts marked with\s*&\s*(?:above)?\s+([\d,]+\.?\d*)/i;

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
  const matches = [...chunk.matchAll(/^([\d,]+\.\d+)(?:\s+\d+ of \d+)?\s*$/gm)];
  if (matches.length > 0) {
    return parseAmount(matches[matches.length - 1][1]);
  }
  return 0;
}

function stripPageMarkers(text: string): string {
  // Remove CoCT page markers: "-- 1 of 2 --" (bracketed) or trailing "3 of 3" (leaked).
  // The trailing form appears glued to real charge lines, e.g. "Returned cheque /Direct debit 205.30 3 of 3".
  return text
    .replace(/\s*--\s*\d+\s+of\s+\d+\s*--\s*/g, ' ')
    .replace(/\s+\d+\s+of\s+\d+\s*$/, '')
    .trim();
}

function mergeContinuationLines(chunk: string): string[] {
  const rawLines = chunk.split('\n').map(l => stripPageMarkers(l.trim())).filter(l => l.length > 0);
  const lines: string[] = [];
  for (const line of rawLines) {
    // Lines starting with &, #, or a letter are new charge/header lines
    if (line.match(/^(&|#|[A-Za-z])/)) {
      lines.push(line);
    // Lines that are ONLY a number (section subtotals like "2403.79") stay standalone
    } else if (line.match(/^[\d,]+\.\d+(\s+\d+ of \d+)?\s*$/)) {
      lines.push(line);
    // Everything else (continuation numbers like "(3) 3.3340 kl @ ...") merges into previous
    } else if (lines.length > 0) {
      lines[lines.length - 1] += ' ' + line;
    } else {
      lines.push(line);
    }
  }
  return lines;
}

// ── Specific Section Parsers ──

/**
 * Tracks which lines in a section were "claimed" by a typed extractor.
 * After all typed extractors run, unclaimed & or # lines go to otherCharges.
 */
class LineTracker {
  private claimed = new Set<number>();
  constructor(private lines: string[], private sectionName: string) {}

  claim(index: number) { this.claimed.add(index); }
  isClaimedPublic(index: number) { return this.claimed.has(index); }

  /**
   * Returns all unclaimed lines that have a label and a trailing decimal amount.
   * Captures both `&`/`#` prefixed lines AND unprefixed labels like
   * "Returned cheque /Direct debit 390.87" that originate from bill-generator
   * reversal paths. Bare subtotal numbers and `@ R` rate-only lines are excluded.
   */
  getUnclaimedCharges(): OtherCharge[] {
    const others: OtherCharge[] = [];
    for (let i = 0; i < this.lines.length; i++) {
      if (this.claimed.has(i)) continue;
      const line = this.lines[i];

      // Skip bare subtotal lines — "4860.71" or "4860.71   3 of 3"
      if (/^[\d,]+\.\d+(\s+\d+ of \d+)?\s*$/.test(line)) continue;

      const amountMatch = line.match(/(-?[\d,]+\.\d+)\s*(-?)\s*$/);
      if (!amountMatch) continue;

      // Guard: if trailing number is preceded by '@ R', it's a rate not a total
      const rateGuard = line.match(/@\s*R\s*(-?[\d,]+\.\d+)\s*(-?)\s*$/);
      if (rateGuard) continue;

      let amount = parseAmount(amountMatch[1]);
      if (amountMatch[2] === '-') amount = -amount;
      // VAT eligibility follows the bill's convention: only '&'-prefixed lines
      // are marked VAT-able. Unprefixed reversal lines (e.g. "Returned cheque") aren't.
      const hasVat = line.startsWith('&');
      others.push({ section: this.sectionName, rawLine: line, amount, hasVat });
    }
    return others;
  }
}

function parseWaterFixed(lines: string[], tracker: LineTracker, periodStart?: string, periodEnd?: string): WaterFixedBasicCharge[] {
  const charges: WaterFixedBasicCharge[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.toLowerCase().includes('fixed basic charge')) continue;

    // Try meter-size format: Fixed Basic Charge (20mm - KSU391)
    const matchOpts = line.match(/(?:Fixed Basic Charge\s*\([\s\w-]*?(\d+mm)[\s\w-]*?\))[\sR]*([\d,]+\.\d+)(?:\s*x\s*(\d+))?\s+([\d,]+\.\d+)/i);
    if (matchOpts) {
      tracker.claim(i);
      charges.push({
        parse_status: 'OK',
        periodStart,
        periodEnd,
        chargeType: 'WATER_FIXED_BASIC',
        meterSize: matchOpts[1],
        unitRate: parseAmount(matchOpts[2]),
        multiplier: matchOpts[3] ? parseInt(matchOpts[3], 10) : 1,
        totalCharged: parseAmount(matchOpts[4])
      });
      continue;
    }

    // Try property-band format: Fixed Basic Charge (R4 500 001 - R5 000 000)
    const bandMatch = line.match(/Fixed Basic Charge\s*\((R[\s\d]+\s*-\s*R[\s\d]+)\)[\sR]*([\d,]+\.\d+)(?:\s*x\s*(\d+))?\s+([\d,]+\.\d+)/i);
    if (bandMatch) {
      tracker.claim(i);
      const bandLabel = bandMatch[1].replace(/\s/g, '');
      charges.push({
        parse_status: 'OK',
        periodStart,
        periodEnd,
        chargeType: 'WATER_FIXED_BASIC',
        meterSize: bandLabel,
        unitRate: parseAmount(bandMatch[2]),
        multiplier: bandMatch[3] ? parseInt(bandMatch[3], 10) : 1,
        totalCharged: parseAmount(bandMatch[4])
      });
      continue;
    }

    // Simple meter-size (no multiplier column)
    const simpleMatch = line.match(/(?:Fixed Basic Charge\s*\([\s\w-]*?(\d+mm)[\s\w-]*?\))[\sR]*([\d,]+\.\d+)/i);
    if (simpleMatch) {
      tracker.claim(i);
      charges.push({
        parse_status: 'OK',
        periodStart,
        periodEnd,
        chargeType: 'WATER_FIXED_BASIC',
        meterSize: simpleMatch[1],
        unitRate: parseAmount(simpleMatch[2]),
        multiplier: 1,
        totalCharged: parseAmount(simpleMatch[2])
      });
      continue;
    }

    // Simple property-band (no multiplier column)
    const simpleBand = line.match(/Fixed Basic Charge\s*\((R[\s\d]+\s*-\s*R[\s\d]+)\)[\sR]*([\d,]+\.\d+)/i);
    if (simpleBand) {
      tracker.claim(i);
      const bandLabel = simpleBand[1].replace(/\s/g, '');
      charges.push({
        parse_status: 'OK',
        periodStart,
        periodEnd,
        chargeType: 'WATER_FIXED_BASIC',
        meterSize: bandLabel,
        unitRate: parseAmount(simpleBand[2]),
        multiplier: 1,
        totalCharged: parseAmount(simpleBand[2])
      });
      continue;
    }

    // Could not parse — PARSE_FAILED, but still claim so it doesn't double-count
    tracker.claim(i);
    charges.push({ parse_status: 'PARSE_FAILED', periodStart, periodEnd, raw_line: line, chargeType: 'WATER_FIXED_BASIC', meterSize: '', unitRate: 0, multiplier: 0, totalCharged: 0 });
  }
  return charges;
}

function parseRefuse(lines: string[], tracker: LineTracker, periodStart?: string, periodEnd?: string): RefuseCharge[] {
  const charges: RefuseCharge[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.toLowerCase().includes('refuse charge')) continue;

    const match = line.match(/Refuse\s+[Cc]harge.*?(\d+)[lL].*?([\d,]+\.\d+)\s*$/i);
    if (match) {
      tracker.claim(i);
      charges.push({
        parse_status: 'OK',
        periodStart,
        periodEnd,
        chargeType: 'REFUSE',
        binSize: match[1] + 'L',
        amount: parseAmount(match[2])
      });
    } else {
      tracker.claim(i);
      charges.push({ parse_status: 'PARSE_FAILED', periodStart, periodEnd, raw_line: line, chargeType: 'REFUSE', binSize: '', amount: 0 });
    }
  }
  return charges;
}

function parseSundriesHuc(lines: string[], tracker: LineTracker, periodStart?: string, periodEnd?: string): HucCharge[] {
  const charges: HucCharge[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.match(/(Home User Charge|Elec HU service)/i)) continue;

    const match = line.match(/-\s+(\d{2}\.\d{4})\s*\(PREPAID\s+([\w\d]+)\)\s+([\d,]+\.\d+)/i);
    if (match) {
      tracker.claim(i);
      charges.push({
        parse_status: 'OK',
        periodStart,
        periodEnd,
        chargeType: 'HUC',
        period: match[1],
        meterRef: match[2],
        amount: parseAmount(match[3])
      });
    } else {
      tracker.claim(i);
      charges.push({ parse_status: 'PARSE_FAILED', periodStart, periodEnd, raw_line: line, chargeType: 'HUC', period: '', meterRef: '', amount: 0 });
    }
  }
  return charges;
}

// Fallback for general & lines that match known tier patterns
function parseTierLinesLegacy(lines: string[], tracker: LineTracker, serviceType: GeneralCharge['serviceType'], periodStart?: string, periodEnd?: string): GeneralCharge[] {
  const charges: GeneralCharge[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (tracker.isClaimedPublic(i)) continue;
    const line = lines[i];
    if (!line.startsWith('&')) continue;

    const amountMatch = line.match(/(-?[\d,]+\.\d+)\s*(-?)\s*$/);
    if (amountMatch) {
      const rateGuardMatch = line.match(/@\s*R\s*(-?[\d,]+\.\d+)\s*(-?)\s*$/);
      if (rateGuardMatch) {
        tracker.claim(i);
        charges.push({ parse_status: 'OK', periodStart, periodEnd, serviceType, description: line, amount: 0, hasVat: true });
      } else {
        let amount = parseAmount(amountMatch[1]);
        if (amountMatch[2] === '-') amount = -amount;
        tracker.claim(i);
        charges.push({ parse_status: 'OK', periodStart, periodEnd, serviceType, description: line, amount, hasVat: true });
      }
    } else {
      tracker.claim(i);
      charges.push({ parse_status: 'PARSE_FAILED', periodStart, periodEnd, raw_line: line, serviceType, description: line, amount: 0, hasVat: true });
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
  const chunkRefuse = extractChunk(text, 'REFUSE', ['SEWERAGE', 'SUNDRIES', 'Add 15% VAT']);
  const chunkSewerage = extractChunk(text, 'SEWERAGE', ['SUNDRIES', 'Add 15% VAT']);
  const chunkSundries = extractChunk(text, 'SUNDRIES', ['Add 15% VAT']);

  function extractSectionStartDate(chunk: string): string | undefined {
    // Handles both "( Period X to Y )" (PROPERTY RATES style) and
    // "( Period X to Y - N Days )" (WATER/REFUSE/SEWERAGE style).
    // The closing paren position varies — don't anchor on it.
    const match = chunk.match(/\(\s*Period\s+(\d{2}\/\d{2}\/\d{4})\s+to\s+\d{2}\/\d{2}\/\d{4}/i);
    return match ? match[1] : undefined;
  }

  function extractSectionEndDate(chunk: string): string | undefined {
    // The FY under which a service was billed is determined by the period END
    // date (CoCT policy — empirically verified across the 36-bill corpus).
    // Straddle-period bills use the new FY's rate when the period crosses 1 July.
    const match = chunk.match(/\(\s*Period\s+\d{2}\/\d{2}\/\d{4}\s+to\s+(\d{2}\/\d{2}\/\d{4})/i);
    return match ? match[1] : undefined;
  }

  const waterStart = extractSectionStartDate(chunkWater);
  const waterEnd = extractSectionEndDate(chunkWater);
  const refuseStart = extractSectionStartDate(chunkRefuse);
  const refuseEnd = extractSectionEndDate(chunkRefuse);
  const sewerageStart = extractSectionStartDate(chunkSewerage);
  const sewerageEnd = extractSectionEndDate(chunkSewerage);
  const sundryStart = extractSectionStartDate(chunkSundries);
  const sundryEnd = extractSectionEndDate(chunkSundries);

  // 2. Subtotals — extracted from the printed section totals
  const subtotals = {
    ratesNet: getSectionSubtotal(chunkRates),
    water: getSectionSubtotal(chunkWater),
    refuse: getSectionSubtotal(chunkRefuse),
    sewerage: getSectionSubtotal(chunkSewerage),
    sundries: getSectionSubtotal(chunkSundries)
  };

  const sectionSubtotals: SectionSubtotal[] = [
    { section: 'PROPERTY RATES', subtotal: subtotals.ratesNet },
    { section: 'WATER', subtotal: subtotals.water },
    { section: 'REFUSE', subtotal: subtotals.refuse },
    { section: 'SEWERAGE', subtotal: subtotals.sewerage },
    { section: 'SUNDRIES', subtotal: subtotals.sundries },
  ];

  // Fixed VAT regex to match the exact format with no 'above' word
  const vatMatch = text.match(RE_VAT_LINE);
  const vatAmount = vatMatch ? parseAmount(vatMatch[1]) : 0;

  // 3. Property Rates (# lines — 0% VAT)
  const periodMatch = chunkRates.match(RE_RATES_PERIOD);
  const ratesPeriod = periodMatch ? { from: periodMatch[1], to: periodMatch[2], days: parseInt(periodMatch[3], 10) } : null;

  const valMatch = chunkRates.match(RE_VALUATION);
  const valuation = valMatch ? { total: parseAmount(valMatch[2]), exemption: parseAmount(valMatch[3]), rateable: parseAmount(valMatch[4]), fromDate: valMatch[1] } : null;

  const ratesLines = mergeContinuationLines(chunkRates);
  const ratesTracker = new LineTracker(ratesLines, 'PROPERTY RATES');
  
  const rates: RatesSegment[] = [];
  for (let i = 0; i < ratesLines.length; i++) {
    const line = ratesLines[i];
    if (line.match(/#\s+From\s+\d{2}\/\d{2}\/\d{4}/i) || line.trim().startsWith('#')) {
       const rm = line.match(/#\s+From\s+(\d{2}\/\d{2}\/\d{4})\s*:\s*R\s+([\d,]+\.?\d*)\s*@\s*([\d.]+)\s*÷\s*(\d+)\s*x\s*(\d+)\s+([\d,]+\.?\d*)(-?)\s*$/i);
       if (rm) {
         ratesTracker.claim(i);
         const fromDate = rm[1];
         const rateableValue = parseAmount(rm[2]);
         const annualRate = parseFloat(rm[3]);
         const daysInYear = parseInt(rm[4], 10);
         const billingDays = parseInt(rm[5], 10);
         let billedAmount = parseAmount(rm[6]);
         const isRebate = rm[7] === '-';
         if (isRebate) {
            billedAmount = -billedAmount;
         }
         
         rates.push({
            parse_status: 'OK',
            chargeType: 'RATES',
            periodStart: fromDate,
            fromDate,
            rateableValue,
            annualRate,
            daysInYear,
            billingDays,
            billedAmount,
            rebate: isRebate
         });
       } else {
         ratesTracker.claim(i);
         rates.push({
            parse_status: 'PARSE_FAILED',
            raw_line: line,
            chargeType: 'RATES',
            fromDate: '',
            rateableValue: 0,
            annualRate: 0,
            daysInYear: 0,
            billingDays: 0,
            billedAmount: 0,
            rebate: false
         });
       }
    }
  }

  // 4. Other Service Segments — with exhaustive line tracking
  const waterLines = mergeContinuationLines(chunkWater);
  const refuseLines = mergeContinuationLines(chunkRefuse);
  const sewerageLines = mergeContinuationLines(chunkSewerage);
  const sundryLines = mergeContinuationLines(chunkSundries);

  const waterTracker = new LineTracker(waterLines, 'WATER');
  const refuseTracker = new LineTracker(refuseLines, 'REFUSE');
  const sewerageTracker = new LineTracker(sewerageLines, 'SEWERAGE');
  const sundryTracker = new LineTracker(sundryLines, 'SUNDRIES');

  // Typed extractors run first — they claim lines
  const waterFixedCharges = parseWaterFixed(waterLines, waterTracker, waterStart, waterEnd);
  const waterTierCharges = parseTierLinesLegacy(waterLines, waterTracker, 'water', waterStart, waterEnd);
  const refuseCharges = parseRefuse(refuseLines, refuseTracker, refuseStart, refuseEnd);
  const sewerageCharges = parseTierLinesLegacy(sewerageLines, sewerageTracker, 'sewerage', sewerageStart, sewerageEnd);
  const hucCharges = parseSundriesHuc(sundryLines, sundryTracker, sundryStart, sundryEnd);
  const sundryCharges = parseTierLinesLegacy(sundryLines, sundryTracker, 'sundry', sundryStart, sundryEnd);

  // Exhaustive: anything unclaimed with & or # prefix goes to otherCharges
  const otherCharges: OtherCharge[] = [
    ...ratesTracker.getUnclaimedCharges(),
    ...waterTracker.getUnclaimedCharges(),
    ...refuseTracker.getUnclaimedCharges(),
    ...sewerageTracker.getUnclaimedCharges(),
    ...sundryTracker.getUnclaimedCharges(),
  ];

  // Also capture unclaimed & lines in the refuse section (e.g. additional levies)
  // parseTierLinesLegacy is not called for refuse — only parseRefuse is.
  // But refuse could have unclaimed & lines too. Those fall through to otherCharges above.

  // 5. Canonical Water kl
  const klMatch = chunkWater.match(/Consumption\s+([\d.]+)\s*kl/i);
  const canonicalWaterConsumptionKl = klMatch ? parseFloat(klMatch[1]) : 0;

  // 6. Meter Readings
  const meterReadings: MeterReading[] = [];
  const RE_WATER_METER = /WATER\s+(\w+)\s+\d+\s+([\d.]+)kl\s+\((Actual|Estimated)\)\s+([\d.]+)kl\s+\((Actual|Estimated)\)\s+([\d.]+)kl/gi;
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
    waterFixedCharges,
    waterTierCharges,
    refuseCharges,
    sewerageCharges,
    hucCharges,
    sundryCharges,
    otherCharges,
    sectionSubtotals,
    subtotals,
    vatAmount
  };
}