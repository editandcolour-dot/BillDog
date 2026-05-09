import type { ParsedBill, ValidationFinding } from '@/types/analysis';

export interface BillParser {
  parse(text: string): ParsedBill | null;
}

export type OperationType = 
  | 'anchor_slice'
  | 'regex_extract'
  | 'lookup_table'
  | 'conditional_flag'
  | 'arithmetic_check'
  | 'pair_by_field';

export interface AnchorSliceRule {
  type: 'anchor_slice';
  start: string; // Regex string
  ends: string[]; // Regex strings
}

export interface RegexExtractRule {
  type: 'regex_extract';
  pattern: string; // Regex with named capture groups
  multiple?: boolean;
  output_mapping?: Record<string, any>;
  pairing_logic?: PairByFieldRule;
}

export interface PairByFieldRule {
  operation: 'pair_by_field';
  match_field: string;
  primary_flag: string;
  primary_value: boolean;
  secondary_value: boolean;
  on_unmatched_secondary: 'surface_anomaly' | 'allow';
  on_unmatched_primary: 'surface_anomaly' | 'allow';
}

export interface LookupTableRule {
  type: 'lookup_table';
  map: Record<string, any>;
  default_value?: any;
}

export interface ArithmeticCheckRule {
  type: 'arithmetic_check';
  target_array: string; // e.g. "waterTierCharges"
  sum_field: string; // e.g. "amount"
  control_field: string; // e.g. "subtotals.water"
  tolerance: number;
  on_fail_actions: ('surface_anomaly' | 'abort_section' | 'suppress_subtotal_check')[];
  anomaly_type?: string;
}

export interface SectionConfig {
  anchors: AnchorSliceRule;
  extractors?: Record<string, any>[]; // Array of extraction rules mapped to outputs
  // e.g. "waterFixedCharges" => array of RegexExtractRule
}

export interface VatRules {
  rate_lookup: { effective_from: string; rate: number }[];
  indicator_map: Record<string, boolean>;
  indicator_pattern: string;
  cascade_on_error: boolean;
}

export interface ParserConfig {
  municipality_id: string;
  format_version: string;
  globals: {
    billing_date?: string; // regex to capture billing date
    invoice_number?: string;
    total_due?: string;
    vat_amount?: string;
    canonical_water_kl?: string;
  };
  sections: Record<string, SectionConfig>;
  line_item_rules: Record<string, RegexExtractRule[]>; // Key is section or array name
  vat_rules?: VatRules;
  reconciliation_rules?: ArithmeticCheckRule[];
}

export interface GenericParserState {
  text: string;
  config: ParserConfig;
  bill: Partial<ParsedBill>;
  anomalies: ValidationFinding[];
}
