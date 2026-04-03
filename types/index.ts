/**
 * Billdog — Shared TypeScript Types
 *
 * All type definitions for database models, API payloads, and shared interfaces.
 * Source of truth: ARCHITECTURE.md Section 4 (Database Schema) + Section 6 (AI Rules).
 *
 * Rules:
 * - All DB row types live here — never define inline.
 * - Use 'import type' when importing these.
 * - Update this file whenever the schema changes.
 */

// ---------------------------------------------------------------------------
// Database enums / unions
// ---------------------------------------------------------------------------

/** Case status progression — matches `cases.status` CHECK constraint. */
export type CaseStatus =
  | 'uploading'
  | 'analysing'
  | 'letter_ready'
  | 'sent'
  | 'acknowledged'
  | 'escalating'
  | 'resolved'
  | 'escalated'
  | 'closed'
  | 'send_failed';

/** Property type — matches `profiles.property_type` CHECK constraint. */
export type PropertyType = 'residential' | 'commercial' | 'industrial';

/** Municipal service types — used for prescription period lookup. */
export type ServiceType = 
  | 'electricity'
  | 'water'
  | 'rates'
  | 'refuse'
  | 'sewerage'
  | 'interest'
  | 'sundry'
  | 'unknown';

/** Dispute type — primary disputed service, determines escalation path at stage 5. */
export type DisputeType = 'water' | 'electricity' | 'rates' | 'refuse' | 'sewerage' | 'other';

/** A single entry in the cases.escalation_history JSONB array. */
export interface EscalationHistoryEntry {
  stage: number;
  action: string;
  timestamp: string;
  resend_id: string | null;
  recipient: string;
  error?: string;
}

/** Cron error log — maps to `cron_errors` table. */
export interface CronError {
  id: string;
  case_id: string | null;
  stage: number | null;
  error: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** Case event types — matches `case_events.event_type` enum. */
export type CaseEventType =
  | 'uploaded'
  | 'analysed'
  | 'letter_generated'
  | 'letter_sent'
  | 'municipality_responded'
  | 'response_received'
  | 'escalated'
  | 'escalation_sent'
  | 'escalation_speaker'
  | 'case_closed_unresolved'
  | 'resolved'
  | 'payment_charged';

// ---------------------------------------------------------------------------
// Database row types
// ---------------------------------------------------------------------------

/** User profile — maps to `profiles` table. */
export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  municipality: string | null;
  account_number: string | null;
  property_type: PropertyType | null;
  payfast_token: string | null;
  consent_given: boolean;
  consent_timestamp: string | null;
  consent_version: string | null;
  marketing_consent: boolean;
  deletion_scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Dispute case — maps to `cases` table. */
export interface Case {
  id: string;
  user_id: string;
  status: CaseStatus;
  bill_url: string | null;
  bill_text: string | null;
  municipality: string;
  account_number: string;
  bill_period: string | null;
  total_billed: number | null;
  errors_found: BillError[] | null;
  recoverable: number | null;
  letter_content: string | null;
  letter_sent_at: string | null;
  municipality_email: string | null;
  response_notes: string | null;
  resolved_at: string | null;
  amount_recovered: number | null;
  fee_charged: number | null;
  // Phase 11 — Case Resolution Detection
  bill_2_file_url: string | null;
  needs_manual_review: boolean;
  escalation_sent_at: string | null;
  prescription_warnings: PrescriptionWarnings | null;
  // Escalation fields
  escalation_stage: number;
  next_action_at: string | null;
  last_escalation_at: string | null;
  escalation_history: EscalationHistoryEntry[];
  dispute_type: DisputeType | null;
  id_secret_id: string | null;
  id_collected_at: string | null;
  id_deletion_scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Case timeline event — maps to `case_events` table. */
export interface CaseEvent {
  id: string;
  case_id: string;
  event_type: CaseEventType;
  note: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** Municipality contact info — maps to `municipalities` table. */
export interface Municipality {
  id: string;
  name: string;
  province: string;
  dispute_email: string;
  dispute_phone: string | null;
  postal_address: string | null;
  ombudsman_email: string | null;
  speaker_office_email: string | null;
  speaker_name: string | null;
  nersa_applicable: boolean;
  typical_response_days: number;
  active: boolean;
  created_at: string;
}

/** Legislation chunk for RAG — maps to `legislation` table. */
export interface Legislation {
  id: string;
  title: string;
  section: string;
  content: string;
  embedding: number[] | null;
  source: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// AI / Claude API types (Section 6)
// ---------------------------------------------------------------------------

/** A single billing error found by Claude analysis. */
export interface BillError {
  line_item: string;
  service_type: ServiceType;
  amount_charged: number;
  expected_amount: number;
  issue: string;
  legal_basis: string;
  recoverable: boolean;
}

/** Claude bill analysis output — strict JSON schema. */
export interface AnalysisResult {
  errors: BillError[];
  total_billed: number;
  total_recoverable: number;
  confidence: 'high' | 'medium' | 'low';
  bill_period: string;
  municipality_detected: string;
  summary: string;
}

// ---------------------------------------------------------------------------
// Prescription types (Phase 1 — gap closure)
// ---------------------------------------------------------------------------

/** Prescription check result for a bill or line item. */
export type PrescriptionStatus = 'normal' | 'approaching' | 'prescribed' | 'unknown';

export interface PrescriptionCheck {
  status: PrescriptionStatus;
  monthsRemaining: number | null;
  message: string;
}

/** Per-item prescription warning for a specific error. */
export interface PrescriptionItemWarning {
  lineItem: string;
  serviceType: ServiceType;
  status: PrescriptionStatus;
  monthsRemaining: number | null;
  message: string;
}

/** Granular prescription warnings for a case — replaces simple boolean. */
export interface PrescriptionWarnings {
  hasPrescribed: boolean;
  hasApproaching: boolean;
  prescribedItems: PrescriptionItemWarning[];
  approachingItems: PrescriptionItemWarning[];
}

// ---------------------------------------------------------------------------
// 3-Year Audit types
// ---------------------------------------------------------------------------

export type AuditStatus = 'pending' | 'analysing' | 'completed' | 'failed';
export type JobStatus = 'running' | 'completed' | 'failed';

/** A historical bill upload for the 3-Year Audit feature — maps to `bill_uploads` table. */
export interface BillUpload {
  id: string;
  case_id: string;
  user_id: string;
  file_url: string;
  billing_period: string | null;
  overpayment_detected: boolean;
  overpayment_amount: number | null;
  analysis_result: AnalysisResult | null;
  status: AuditStatus;
  error: string | null;
  uploaded_at: string;
  updated_at: string;
}

/** Background job tracking for full audits — maps to `audit_jobs` table. */
export interface AuditJob {
  id: string;
  case_id: string;
  user_id: string;
  status: JobStatus;
  total_bills: number;
  processed_bills: number;
  result_summary: {
    total_overpayment: number;
    months_flagged: number;
    flagged_periods: string[];
  } | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}
