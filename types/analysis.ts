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
  };
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
