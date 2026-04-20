export interface BillingError {
  line_item: string;
  amount_charged: number;
  expected_amount: number;
  issue: string;
  legal_basis: string;
  recoverable: boolean;
  service_type: 'electricity' | 'water' | 'gas' | 'rates' | 'sewerage' | 'refuse' | 'other';
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

export interface RatesSegment {
  fromDate: string;
  rateableValue: number;
  annualRate: number;
  daysInYear: number;
  billingDays: number;
  billedAmount: number;
  rebateBase?: number;
  rebateBilledAmount?: number;
}

export interface HucCharge {
  month: string;       // e.g. "02.2025"
  amount: number;
  label: string;
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

export interface GeneralCharge {
  serviceType: 'water' | 'sewerage' | 'refuse' | 'sundry';
  description: string;
  amount: number;
  hasVat: boolean;
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
  waterCharges: GeneralCharge[];
  sewerageCharges: GeneralCharge[];
  refuseCharges: GeneralCharge[];
  sundryCharges: GeneralCharge[];

  subtotals: {
    ratesNet: number; 
    water: number;
    refuse: number;
    sewerage: number;
    sundries: number;
  };
  vatAmount: number;
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
  | 'SEWERAGE_RATIO_ERROR';

export interface ValidationFinding {
  type: FindingType;
  description: string;
  billedAmount: number;
  expectedAmount?: number;
  discrepancy?: number;
  lineReference: string;
  invoiceNumber: string;
  billingDate: string;
  // Tariff Verification extensions
  legalBasis?: string | null;
  sourceUrl?: string | null;
  verificationConfidence?: 'CONFIRMED' | 'BILL-VERIFIED' | 'SECONDARY'; // UNVERIFIED explicitly excluded
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
