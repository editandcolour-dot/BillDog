import type { ParsedBill, ValidationFinding, RatesSegment, GeneralCharge, OtherCharge } from '@/types/analysis';
import type { BillParser, ParserConfig, RegexExtractRule, AnchorSliceRule, VatRules, ArithmeticCheckRule, PairByFieldRule } from './types';

function parseAmount(val: string | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(/,/g, ''));
}

export class GenericParser implements BillParser {
  private config: ParserConfig;

  constructor(config: ParserConfig) {
    this.config = config;
  }

  parse(text: string): ParsedBill | null {
    // 1. Initialize empty parsed bill
    const bill: ParsedBill = {
      invoiceNumber: 'UNKNOWN',
      billingDate: '',
      totalDue: 0,
      ratesPeriod: null,
      valuation: null,
      rates: [],
      canonicalWaterConsumptionKl: 0,
      meterReadings: [],
      waterFixedCharges: [],
      waterTierCharges: [],
      sewerageCharges: [],
      refuseCharges: [],
      hucCharges: [],
      sundryCharges: [],
      otherCharges: [],
      sectionSubtotals: [],
      subtotals: { ratesNet: 0, water: 0, refuse: 0, sewerage: 0, sundries: 0 },
      vatAmount: 0,
      parser_anomalies: []
    };

    // 2. Globals
    if (this.config.globals) {
      if (this.config.globals.billing_date) {
        const m = text.match(new RegExp(this.config.globals.billing_date, 'i'));
        if (m && m.groups?.billingDate) {
          bill.billingDate = m.groups.billingDate;
          bill.invoiceNumber = bill.billingDate;
        }
      }
      if (this.config.globals.total_due) {
        const m = text.match(new RegExp(this.config.globals.total_due, 'i'));
        if (m && m.groups?.totalDue) {
          bill.totalDue = parseAmount(m.groups.totalDue);
        }
      }
      if (this.config.globals.vat_amount) {
        const m = text.match(new RegExp(this.config.globals.vat_amount, 'i'));
        if (m && m.groups?.vatAmount) {
          bill.vatAmount = parseAmount(m.groups.vatAmount);
        }
      }
      if (this.config.globals.canonical_water_kl) {
        const m = text.match(new RegExp(this.config.globals.canonical_water_kl, 'i'));
        if (m && m.groups?.consumption) {
          bill.canonicalWaterConsumptionKl = parseFloat(m.groups.consumption);
        }
      }
    }

    // 2b. Account summary — extract previousBalance and paymentsReceived
    const prevBalMatch = text.match(/Previous\s+account\s+balance\s+([\d,]+\.\d{2})/i);
    if (prevBalMatch) {
      bill.previousBalance = parseAmount(prevBalMatch[1]);
    }
    const paymentsMatch = text.match(/Less\s+payments\s+.*?(\d[\d,]*\.\d{2})/i);
    if (paymentsMatch) {
      bill.paymentsReceived = parseAmount(paymentsMatch[1]);
    }

    // 3. Sections (Anchor slice)
    const sectionTexts: Record<string, string> = {};
    const sectionPeriods: Record<string, { start?: string, end?: string }> = {};
    for (const [sectionName, secCfg] of Object.entries(this.config.sections)) {
      sectionTexts[sectionName] = this._reassembleWrappedTierLines(
        this._anchorSlice(text, secCfg.anchors).replace(/\s*--\s*\d+\s+of\s+\d+\s*--\s*/g, '\n')
      );

      // Extract periodStart and periodEnd if available in section header
      const periodMatch = sectionTexts[sectionName].match(/\(\s*Period\s+(?<periodStart>\d{2}\/\d{2}\/\d{4})(?:\s+to\s+(?<periodEnd>\d{2}\/\d{2}\/\d{4}))?/i);
      if (periodMatch && periodMatch.groups) {
        sectionPeriods[sectionName] = {
           start: periodMatch.groups.periodStart,
           end: periodMatch.groups.periodEnd
        };
      }

      // Extract meter reading status: (Actual reading) or (Estimated reading)
      const readingStatusMatch = sectionTexts[sectionName].match(/\((Actual|Estimated)\s+reading\)/i);
      if (readingStatusMatch) {
        const status = readingStatusMatch[1].toLowerCase() as 'actual' | 'estimated';
        if (sectionName === 'WATER') bill.waterReadingStatus = status;
        else if (sectionName === 'SEWERAGE') bill.sewerageReadingStatus = status;
      }

      // Extract subtotal using standard matching
      const subRegex = new RegExp(`^([\\d,]+\\.\\d+)(?:\\s+\\d+ of \\d+)?\\s*$`, 'gm');
      const matches = [...sectionTexts[sectionName].matchAll(subRegex)];
      if (matches.length > 0) {
        const subtotal = parseAmount(matches[matches.length - 1][1]);
        bill.sectionSubtotals.push({ section: sectionName, subtotal });
        
        // Map common section subtotals
        if (sectionName === 'PROPERTY RATES') bill.subtotals.ratesNet = subtotal;
        else if (sectionName === 'WATER') bill.subtotals.water = subtotal;
        else if (sectionName === 'REFUSE') bill.subtotals.refuse = subtotal;
        else if (sectionName === 'SEWERAGE') bill.subtotals.sewerage = subtotal;
        else if (sectionName === 'SUNDRIES') bill.subtotals.sundries = subtotal;
      }
    }

    // Unclaimed lines tracker for OtherCharges
    const unclaimed: OtherCharge[] = [];

    // 4. Line Item Rules (Regex extract & Conditional)
    for (const [targetArray, rules] of Object.entries(this.config.line_item_rules)) {
      for (const rule of rules) {
        const targetSection = rule.output_mapping?.section || 'PROPERTY RATES'; // default fallback
        const chunk = sectionTexts[targetSection];
        if (!chunk) continue;

        const regex = new RegExp(rule.pattern, rule.multiple ? 'gmi' : 'mi');
        const matches = [...chunk.matchAll(regex)];

        const extractedItems: any[] = [];

        for (const match of matches) {
          if (!match.groups) continue;
          const item: any = { parse_status: 'OK', raw_line: match[0], ...rule.output_mapping };

          for (const [key, val] of Object.entries(match.groups)) {
            if (val === undefined) continue;
            // Parse common number fields
            if (['amount', 'rateableValue', 'annualRate', 'billedAmount', 'unitRate', 'totalCharged'].includes(key)) {
              item[key] = parseAmount(val);
            } else if (['daysInYear', 'billingDays', 'multiplier'].includes(key)) {
              item[key] = parseInt(val, 10);
            } else if (key === 'isRebate' || key === 'rebate') {
              item['rebate'] = val === '-';
              if (item['rebate'] && item.billedAmount !== undefined && item.billedAmount > 0) {
                item.billedAmount = -item.billedAmount;
              }
            } else {
              item[key] = val;
            }
          }

          if (sectionPeriods[targetSection]) {
            if (!item.periodStart && sectionPeriods[targetSection].start) {
              item.periodStart = sectionPeriods[targetSection].start;
            }
            if (!item.periodEnd && sectionPeriods[targetSection].end) {
              item.periodEnd = sectionPeriods[targetSection].end;
            }
          }

          // Lookup Table / VAT cascade
          if (this.config.vat_rules && rule.output_mapping?.applyVatIndicator) {
            item.hasVat = this._resolveVatIndicator(item.vatIndicator, this.config.vat_rules);
          }

          extractedItems.push(item);
        }

        // Pair by field
        if (rule.pairing_logic) {
          const logic = rule.pairing_logic;
          const paired: any[] = [];
          
          const primaries = extractedItems.filter(i => i[logic.primary_flag] === logic.primary_value);
          const secondaries = extractedItems.filter(i => i[logic.primary_flag] === logic.secondary_value);

          for (const p of primaries) {
            paired.push(p);
            // find matching secondary
            const secIdx = secondaries.findIndex(s => s[logic.match_field] === p[logic.match_field]);
            if (secIdx !== -1) {
              paired.push(secondaries[secIdx]);
              secondaries.splice(secIdx, 1);
            } else if (logic.on_unmatched_primary === 'surface_anomaly') {
              bill.parser_anomalies!.push({
                type: 'PARSER_MISMATCH',
                description: `Unmatched primary element (field ${logic.match_field} = ${p[logic.match_field]})`,
                billedAmount: p.amount || p.billedAmount || 0,
                expectedAmount: 0,
                overchargeZar: 0,
                lineReference: p.raw_line,
                invoiceNumber: bill.invoiceNumber,
                billingDate: bill.billingDate,
                recoverable: false
              });
            }
          }

          for (const s of secondaries) {
            if (logic.on_unmatched_secondary === 'surface_anomaly') {
               bill.parser_anomalies!.push({
                type: 'REBATE_CALC_ERROR',
                description: `Unmatched secondary element/rebate (field ${logic.match_field} = ${s[logic.match_field]})`,
                billedAmount: s.amount || s.billedAmount || 0,
                expectedAmount: 0,
                overchargeZar: Math.abs(s.amount || s.billedAmount || 0),
                lineReference: s.raw_line,
                invoiceNumber: bill.invoiceNumber,
                billingDate: bill.billingDate,
                recoverable: true
              });
            }
            paired.push(s);
          }

          (bill as any)[targetArray].push(...paired);
        } else {
          (bill as any)[targetArray].push(...extractedItems);
        }
      }
    }

    // Populate other charges (everything that wasn't claimed, but has a trailing amount and & or # prefix)
    for (const [sectionName, chunk] of Object.entries(sectionTexts)) {
      if (!chunk) continue;
      const lines = chunk.split('\n').map(l => l.trim().replace(/\s*--\s*\d+\s+of\s+\d+\s*--\s*/g, ' ')).filter(l => l.length > 0);
      for (const line of lines) {
        if (!line.match(/^[&#]/)) continue;
        // Check if already claimed
        let claimed = false;
        for (const [arrName, arr] of Object.entries(bill)) {
          if (Array.isArray(arr) && arrName !== 'otherCharges' && arrName !== 'parser_anomalies') {
            if (arr.some((item: any) => item.raw_line && (item.raw_line.includes(line) || line.includes(item.raw_line.trim())))) {
              claimed = true;
              break;
            }
          }
        }
        if (claimed) continue;

        const amtMatch = line.match(/(-?[\d,]+\.\d+)\s*(-?)\s*$/);
        const rateGuard = line.match(/@\s*R\s*(-?[\d,]+\.\d+)\s*(-?)\s*$/);
        if (amtMatch && !rateGuard) {
          let amount = parseAmount(amtMatch[1]);
          if (amtMatch[2] === '-') amount = -amount;
          
          let hasVat = false;
          if (this.config.vat_rules) {
             const vMatch = line.match(new RegExp(this.config.vat_rules.indicator_pattern, 'i'));
             hasVat = this._resolveVatIndicator(vMatch?.groups?.vatIndicator, this.config.vat_rules);
          }

          bill.otherCharges.push({
            section: sectionName,
            rawLine: line,
            amount,
            hasVat
          });
        }
      }
    }

    // 5. Arithmetic Checks (P4 & suppression)
    if (this.config.reconciliation_rules) {
      for (const rule of this.config.reconciliation_rules) {
        const items = (bill as any)[rule.target_array] as any[];
        let sum = items.reduce((acc, curr) => acc + (curr[rule.sum_field] || 0), 0);
        
        let fixedSum = 0;
        if (rule.target_array === 'waterTierCharges' && bill.waterFixedCharges) {
          fixedSum = bill.waterFixedCharges.reduce((acc, curr) => acc + (curr.totalCharged || 0), 0);
          sum += fixedSum;
        } else if (rule.target_array === 'sewerageCharges' && (bill as any).sewerageFixedCharges) {
          fixedSum = (bill as any).sewerageFixedCharges.reduce((acc: number, curr: any) => acc + (curr.totalCharged || 0), 0);
          sum += fixedSum;
        }
        
        // Resolve control field (e.g. "subtotals.water")
        const ctrlParts = rule.control_field.split('.');
        let ctrlVal: any = bill;
        for (const p of ctrlParts) ctrlVal = ctrlVal[p];
        
        if (Math.abs(sum - ctrlVal) > rule.tolerance) {
           const overchargeBase = Math.abs(sum - ctrlVal);
           let finalOvercharge = overchargeBase;

           // Cascade VAT on error?
           if (this.config.vat_rules?.cascade_on_error) {
             // To simplify, if the rule affects a section with VAT (like WATER), we assume VAT cascade applies.
             // We use bill date to lookup rate.
             const rate = this._getVatRate(bill.billingDate, this.config.vat_rules);
             finalOvercharge = parseFloat((overchargeBase * (1 + rate)).toFixed(2));
           }

           let isFixedChargeMismatch = false;
           if (fixedSum > 0 && Math.abs(overchargeBase - fixedSum) <= rule.tolerance) {
              isFixedChargeMismatch = true;
           }

           if (rule.on_fail_actions.includes('surface_anomaly')) {
             if (isFixedChargeMismatch) {
               bill.parser_anomalies!.push({
                  type: 'FIXED_CHARGE_MISMATCH',
                  description: `Fixed-charge arithmetic mismatch in ${rule.target_array}. Printed subtotal mismatch exactly matches the fixed charge amount.`,
                  billedAmount: ctrlVal,
                  expectedAmount: sum,
                  overchargeZar: finalOvercharge,
                  lineReference: `Subtotal: ${ctrlVal}`,
                  invoiceNumber: bill.invoiceNumber,
                  billingDate: bill.billingDate,
                  recoverable: true
               });
             } else {
               bill.parser_anomalies!.push({
                  type: (rule.anomaly_type as any) || 'PARSER_MISMATCH',
                  description: `Tier-line arithmetic mismatch in ${rule.target_array}. Printed lines sum to ${sum}, but section subtotal is ${ctrlVal}.`,
                  billedAmount: ctrlVal,
                  expectedAmount: sum,
                  overchargeZar: finalOvercharge,
                  lineReference: `Subtotal: ${ctrlVal}`,
                  invoiceNumber: bill.invoiceNumber,
                  billingDate: bill.billingDate,
                  recoverable: true
               });
             }
           }

           if (rule.on_fail_actions.includes('abort_section')) {
             // Not implemented yet - requires dropping items? Or just flagging them
             items.forEach(i => i.parse_status = 'PARSE_FAILED');
           }

           if (rule.on_fail_actions.includes('suppress_subtotal_check')) {
             // Flag for downstream validators to skip full-sum math checks for this section
             // E.g., setting the section subtotal to match the extracted sum so the math balances out
             // But the anomaly is already captured above.
             // Best way: just adjust the tracked subtotal so full-sum check passes, 
             // but anomaly still surfaces the real error.
             if (ctrlParts[0] === 'subtotals') {
               (bill.subtotals as any)[ctrlParts[1]] = sum;
             }
           }
        }
      }
    }

    return bill;
  }

  private _anchorSlice(text: string, rule: AnchorSliceRule): string {
    const startRegex = new RegExp('^' + rule.start + '\\b', 'm');
    const startMatch = text.match(startRegex);
    if (!startMatch || startMatch.index === undefined) return '';
    const startIdx = startMatch.index;

    let endIdx = text.length;
    for (const stop of rule.ends) {
      const stopRegex = new RegExp('^' + stop + '\\b', 'm');
      const stopMatch = text.substring(startIdx + rule.start.length).match(stopRegex);
      if (stopMatch && stopMatch.index !== undefined) {
        const idx = startIdx + rule.start.length + stopMatch.index;
        if (idx < endIdx) endIdx = idx;
      }
    }
    return text.substring(startIdx, endIdx);
  }

  /**
   * Reassemble multi-tier consumption charges that the PDF text extractor wrapped
   * across multiple lines. On CoCT bills a tiered water/sewerage charge prints as e.g.:
   *
   *   & (1) 5.5230 kl @ R 19.5900 (2) 4.1430 kl @ R 26.9200      <- ends in a rate (4dp)
   *     (3) 3.3340 kl @ R 36.5800 341.69                          <- continuation + total
   *
   * The first line ends in a 4-decimal rate (no 2-decimal total) and would be discarded
   * by the per-line tokeniser, losing tiers (1)/(2) AND the leading &/# VAT marker, while
   * the continuation line's total (341.69) is mistaken for tier (3)'s amount alone. This
   * joins the wrapped fragments back into ONE line ending in the charge total, BEFORE
   * tokenisation, so all tiers, the &/# indicator, and the single total are captured.
   *
   * Two real layouts are handled:
   *   (a) total INLINE on the last tier fragment ("(3) ... 36.5800 341.69")
   *   (b) total on a following STANDALONE subtotal line ("(3) ... 36.5800" then "341.69")
   * In case (b) the standalone line is COPIED onto the merged charge but left in place,
   * so section-subtotal extraction (which reads the last standalone amount) is unaffected.
   * Lines without tier segments (rates, fixed charges, sundries) are returned untouched.
   */
  private _reassembleWrappedTierLines(chunk: string): string {
    const TIER_SEG = /\(\d+\)\s*[\d.]+\s*kl\s*@\s*R\s*[\d.]+/i;        // one "(n) qty kl @ R rate" segment
    const ENDS_IN_TOTAL = /@\s*R\s*[\d.]+\s+-?[\d,]+\.\d{2}\s*$/;       // "...@ R <rate> <2dp total>"
    const STANDALONE_NUM = /^-?[\d,]+\.\d{2}\s*$/;                      // a lone amount line (page markers already stripped)

    const lines = chunk.split('\n');
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Only act on an incomplete tier fragment (has a tier segment but no trailing total).
      if (!TIER_SEG.test(line) || ENDS_IN_TOTAL.test(line)) {
        out.push(line);
        continue;
      }
      let merged = line.replace(/\s+$/, '');
      let j = i;
      // Absorb following tier-fragment continuation lines until the total appears inline.
      while (!ENDS_IN_TOTAL.test(merged) && j + 1 < lines.length && TIER_SEG.test(lines[j + 1])) {
        j++;
        merged += ' ' + lines[j].trim();
      }
      // Layout (b): no inline total yet — borrow the value from the next standalone
      // subtotal line, but DO NOT consume it (subtotal extraction still needs it).
      if (!ENDS_IN_TOTAL.test(merged) && j + 1 < lines.length && STANDALONE_NUM.test(lines[j + 1].trim())) {
        merged += '  ' + lines[j + 1].trim();
      }
      out.push(merged);
      i = j; // resume after the last consumed tier fragment (standalone line, if any, untouched)
    }
    return out.join('\n');
  }

  private _resolveVatIndicator(indicator: string | undefined, rules: VatRules): boolean {
    const key = indicator || '';
    if (key in rules.indicator_map) return rules.indicator_map[key];
    return false; // Default
  }

  private _getVatRate(billingDate: string, rules: VatRules): number {
    // Basic date parsing (DD/MM/YYYY to YYYY-MM-DD)
    let bDate = '2099-01-01';
    if (billingDate) {
      const parts = billingDate.split('/');
      if (parts.length === 3) bDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    
    // Find the latest effective rate
    let activeRate = 0.15;
    for (const lookup of rules.rate_lookup) {
      if (bDate >= lookup.effective_from) {
        activeRate = lookup.rate;
      }
    }
    return activeRate;
  }
}
