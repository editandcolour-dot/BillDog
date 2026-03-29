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
