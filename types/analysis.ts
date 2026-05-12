export interface BillingError {
  line_item: string;
  amount_charged: number;
  expected_amount: number;
  overchargeZar?: number;
  issue: string;
  legal_basis: string;
  recoverable: boolean;
  service_type: 'electricity' | 'water' | 'gas' | 'rates' | 'sewerage' | 'refuse' | 'other';
  finding_type?: string; // Original ValidationFinding.type — used by corpus test runner for precise matching
  // P1.5: Estimated vs Actual reading flag
  reading_type?: 'actual' | 'estimated' | 'mixed' | 'unknown';
  // P1.6: Dispute channel classification
  dispute_channel?: 'section_102_billing' | 'section_50_valuation';
  // P4: Prescription-aware detection
  charge_type?: 'electricity' | 'water' | 'sewer' | 'refuse' | 'rates' | 'sundry';
  within_prescription?: boolean | null;  // null = requires human review (Argent Industrial edge case)
  prescription_review_reason?: string;
}

export interface AnalysisResult {
  errors: BillingError[];
  total_billed: number;
  total_recoverable: number;
  confidence: 'high' | 'medium' | 'low';
  bill_period: string;
  municipality_detected: string;
  summary: string;
  _meta?: {
    model: string;
    tokensUsed: number;
    durationMs: number;
    groundTruth?: boolean;
    findingsCount?: number;
    parserUsed?: string;
  };
}

// ── Ground Truth types ────────────────────────────────────

export interface BaseCharge {
  parse_status: 'OK' | 'PARSE_FAILED';
  raw_line?: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface RatesSegment extends BaseCharge {
  chargeType: 'RATES';
  fromDate: string;
  rateableValue: number;
  annualRate: number;
  daysInYear: number;
  billingDays: number;
  billedAmount: number;
  rebate: boolean;
}

export interface HucCharge extends BaseCharge {
  chargeType: 'HUC';
  period: string;       // e.g. "08.2025"
  meterRef: string;     // e.g. "4907315610"
  amount: number;
}

export interface RefuseCharge extends BaseCharge {
  chargeType: 'REFUSE';
  amount: number;
  binSize: string;      // e.g. "240L"
}

export interface WaterFixedBasicCharge extends BaseCharge {
  chargeType: 'WATER_FIXED_BASIC';
  meterSize: string;    // e.g. "20mm"
  unitRate: number;
  multiplier: number;
  totalCharged: number;
}

export interface ReturnedDebit {
  description: string;
  amount: number;
}

export interface DishonourFee {
  amount: number;
}

export interface MeterReading {
  service: 'water' | 'electricity';
  meterNumber: string;
  readingFrom: string;
  readingTo: string;
  isEstimated: boolean;
  consumption: number;
}

export interface GeneralCharge extends BaseCharge {
  serviceType: 'water' | 'sewerage' | 'sundry'; // Refuse moved to RefuseCharge
  description: string;
  amount: number;
  hasVat: boolean;
}

export interface OtherCharge {
  section: string;
  rawLine: string;
  amount: number;
  hasVat: boolean;
}

export interface SectionSubtotal {
  section: string;
  subtotal: number;
}

export interface ParsedBill {
  invoiceNumber: string;
  billingDate: string;
  totalDue: number;
  ratesPeriod: {
    from: string;
    to: string;
    days: number;
  } | null;
  valuation: {
    total: number;
    exemption: number;
    rateable: number;
    fromDate: string;
  } | null;
  rates: RatesSegment[];

  canonicalWaterConsumptionKl: number;

  meterReadings: MeterReading[];
  waterFixedCharges: WaterFixedBasicCharge[];
  waterTierCharges: GeneralCharge[]; // Legacy tier lines until formally structured
  sewerageCharges: GeneralCharge[];
  refuseCharges: RefuseCharge[];
  hucCharges: HucCharge[];
  sundryCharges: GeneralCharge[];

  // Exhaustive extraction — catches everything the parser doesn't classify
  otherCharges: OtherCharge[];
  sectionSubtotals: SectionSubtotal[];

  subtotals: {
    ratesNet: number; 
    water: number;
    refuse: number;
    sewerage: number;
    sundries: number;
  };
  vatAmount: number;

  // Account summary fields (from page 1)
  previousBalance?: number;
  paymentsReceived?: number;

  // Meter reading status (from section headers)
  waterReadingStatus?: 'actual' | 'estimated';
  sewerageReadingStatus?: 'actual' | 'estimated';

  // Anomalies discovered by the parser itself (e.g. tier-line mismatches, missing rebates)
  parser_anomalies?: ValidationFinding[];
}

export type FindingType =
  | 'RATES_CALC_ERROR'
  | 'REBATE_CALC_ERROR'
  | 'HUC_AMOUNT_WRONG'
  | 'UNKNOWN_RATE_APPLIED'
  | 'WATER_FIXED_CHARGE_WRONG'
  | 'OVER_APPROVED_INCREASE'
  | 'PARSER_MISMATCH'
  | 'VAT_MISMATCH'
  | 'SEWERAGE_RATIO_ERROR'
  | 'METER_READING_MISMATCH'
  | 'UNKNOWN_TARIFF'
  | 'TIER_LINE_INFLATION'
  | 'FIXED_CHARGE_MISMATCH'
  | 'TIER_LINE_ARITHMETIC_MISMATCH'
  | 'WATER_TARIFF_OVERCHARGE'
  | 'WATER_TARIFF_UNDERCHARGE'
  | 'MISSING_REBATE'
  | 'POSSIBLE_CARRYOVER_ERROR'
  | 'REVIEW_REQUIRED'
  | 'ESTIMATED_READING_FLAGGED';

export interface ValidationFinding {
  type: FindingType;
  description: string;
  billedAmount: number;
  expectedAmount?: number;
  overchargeZar?: number;
  lineReference: string;
  invoiceNumber: string;
  billingDate: string;
  // Tariff Verification extensions
  legalBasis?: string | null;
  sourceUrl?: string | null;
  verificationConfidence?: 'CONFIRMED' | 'BILL-VERIFIED' | 'SECONDARY' | 'UNVERIFIED';
  recoverable?: boolean;
}

// ── Multi-bill types ──────────────────────────────────────

export interface CaseBill {
  id: string;
  case_id: string;
  bill_url: string;
  bill_text: string | null;
  bill_period: string | null;
  total_billed: number | null;
  errors_found: BillingError[] | null;
  recoverable: number | null;
  parse_status: 'pending' | 'parsing' | 'parsed' | 'failed';
  analysis_status: 'pending' | 'analysing' | 'complete' | 'failed';
  sort_order: number;
  original_filename: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  // Tier extensions
  coverage_tier?: 1 | 2 | 3;
  pending_reanalysis?: boolean;
  transparency_report?: any;
}

export interface RecurringError {
  issue: string;
  service_type: string;
  months_affected: string[];
  total_overcharged: number;
  legal_basis: string;
}

export interface CrossAnalysis {
  pattern_type: 'consistent_overcharge' | 'intermittent' | 'escalating' | 'single_incident';
  recurring_errors: RecurringError[];
  trend_summary: string;
  total_recoverable_all: number;
  prescription_risk: {
    at_risk_amount: number;
    at_risk_periods: string[];
  };
  strongest_arguments: string[];
}

export interface MultiAnalysisResult {
  bills: {
    bill_id: string;
    bill_period: string;
    analysis: AnalysisResult;
  }[];
  cross_analysis: CrossAnalysis;
}
