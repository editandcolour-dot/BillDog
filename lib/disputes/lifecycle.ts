/**
 * Dispute Lifecycle — CRUD Operations
 *
 * Manages the full lifecycle of a billing dispute:
 * 1. Create on letter send
 * 2. Record municipal reference number
 * 3. Record municipal response
 * 4. Calculate Section 62 appeal deadline
 * 5. Record appeal lodgement
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Types ───────────────────────────────────────────────────────────────────

export interface DisputeLifecycleRow {
  id: string;
  case_id: string;
  user_id: string;
  letter_sent_at: string;
  letter_type: 'section_102' | 'section_62_appeal' | 'follow_up';
  municipal_reference_number: string | null;
  municipal_response_received_at: string | null;
  municipal_response_outcome: 'accepted' | 'rejected' | 'partial' | 'no_response' | null;
  municipal_response_document_url: string | null;
  municipal_response_notes: string | null;
  sec62_appeal_deadline: string | null;
  sec62_appeal_lodged_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export type LifecycleStatus =
  | 'letter_sent'
  | 'reference_received'
  | 'awaiting_response'
  | 'response_received'
  | 'appeal_eligible'
  | 'appeal_lodged'
  | 'resolved'
  | 'closed_unresolved';

// ── Supabase client ─────────────────────────────────────────────────────────

let _client: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('[lifecycle] Missing Supabase env vars');
  _client = createClient(url, key);
  return _client;
}

// Section 62 deadline: 21 calendar days from municipal response
const SEC62_DEADLINE_DAYS = 21;

// ── CRUD Operations ─────────────────────────────────────────────────────────

/**
 * Create a lifecycle row when a dispute letter is sent.
 */
export async function createLifecycleEntry(
  caseId: string,
  userId: string,
  letterType: 'section_102' | 'section_62_appeal' | 'follow_up' = 'section_102',
): Promise<{ id: string } | null> {
  const client = getServiceClient();

  const { data, error } = await client
    .from('disputes_lifecycle')
    .insert({
      case_id: caseId,
      user_id: userId,
      letter_sent_at: new Date().toISOString(),
      letter_type: letterType,
      status: 'letter_sent',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[lifecycle] Create error:', error);
    return null;
  }

  return data;
}

/**
 * Record the municipal reference number (user enters this manually).
 */
export async function recordReferenceNumber(
  lifecycleId: string,
  referenceNumber: string,
): Promise<boolean> {
  const client = getServiceClient();

  const { error } = await client
    .from('disputes_lifecycle')
    .update({
      municipal_reference_number: referenceNumber,
      status: 'reference_received',
      updated_at: new Date().toISOString(),
    })
    .eq('id', lifecycleId);

  if (error) {
    console.error('[lifecycle] Reference update error:', error);
    return false;
  }
  return true;
}

/**
 * Record the municipality's response and calculate Section 62 deadline.
 */
export async function recordMunicipalResponse(
  lifecycleId: string,
  outcome: 'accepted' | 'rejected' | 'partial' | 'no_response',
  notes?: string,
  documentUrl?: string,
): Promise<boolean> {
  const client = getServiceClient();

  const responseDate = new Date();
  const deadline = new Date(responseDate);
  deadline.setDate(deadline.getDate() + SEC62_DEADLINE_DAYS);

  const newStatus: LifecycleStatus =
    outcome === 'accepted'
      ? 'resolved'
      : outcome === 'rejected'
        ? 'appeal_eligible'
        : outcome === 'partial'
          ? 'appeal_eligible'
          : 'closed_unresolved';

  const { error } = await client
    .from('disputes_lifecycle')
    .update({
      municipal_response_received_at: responseDate.toISOString(),
      municipal_response_outcome: outcome,
      municipal_response_notes: notes || null,
      municipal_response_document_url: documentUrl || null,
      sec62_appeal_deadline: outcome === 'rejected' || outcome === 'partial'
        ? deadline.toISOString()
        : null,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lifecycleId);

  if (error) {
    console.error('[lifecycle] Response update error:', error);
    return false;
  }
  return true;
}

/**
 * Record that a Section 62 appeal has been lodged.
 */
export async function recordAppealLodged(
  lifecycleId: string,
): Promise<boolean> {
  const client = getServiceClient();

  const { error } = await client
    .from('disputes_lifecycle')
    .update({
      sec62_appeal_lodged_at: new Date().toISOString(),
      status: 'appeal_lodged',
      updated_at: new Date().toISOString(),
    })
    .eq('id', lifecycleId);

  if (error) {
    console.error('[lifecycle] Appeal update error:', error);
    return false;
  }
  return true;
}

/**
 * Get lifecycle entries for a case.
 */
export async function getLifecycleForCase(
  caseId: string,
): Promise<DisputeLifecycleRow[]> {
  const client = getServiceClient();

  const { data, error } = await client
    .from('disputes_lifecycle')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[lifecycle] Query error:', error);
    return [];
  }
  return (data ?? []) as DisputeLifecycleRow[];
}

/**
 * Get cases where a reference number reminder should be sent.
 * Criteria: letter sent >14 days ago, no reference number entered.
 */
export async function getCasesNeedingReferenceReminder(): Promise<DisputeLifecycleRow[]> {
  const client = getServiceClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);

  const { data, error } = await client
    .from('disputes_lifecycle')
    .select('*')
    .eq('status', 'letter_sent')
    .is('municipal_reference_number', null)
    .lt('letter_sent_at', cutoff.toISOString());

  if (error) {
    console.error('[lifecycle] Reminder query error:', error);
    return [];
  }
  return (data ?? []) as DisputeLifecycleRow[];
}

/**
 * Get cases approaching Section 62 appeal deadline.
 * Criteria: deadline within 7 days, appeal not yet lodged.
 */
export async function getCasesApproachingDeadline(): Promise<DisputeLifecycleRow[]> {
  const client = getServiceClient();
  const now = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const { data, error } = await client
    .from('disputes_lifecycle')
    .select('*')
    .eq('status', 'appeal_eligible')
    .is('sec62_appeal_lodged_at', null)
    .lte('sec62_appeal_deadline', weekFromNow.toISOString())
    .gte('sec62_appeal_deadline', now.toISOString());

  if (error) {
    console.error('[lifecycle] Deadline query error:', error);
    return [];
  }
  return (data ?? []) as DisputeLifecycleRow[];
}
