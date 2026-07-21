/**
 * Carve-out predicate for the 90-day purge of soft-deleted cases.
 *
 * HARD RULE: money moved or hold set = retain.
 *  (a) payment record — a success fee was charged, an amount was recovered,
 *      or a payment_charged case_event (PayFast ITN receipt) exists;
 *  (b) legal hold — cases.legal_hold is true (migration 042).
 * Neither → purge freely. Legal hold takes reporting precedence: it is the
 * explicit human decision, so its reason is surfaced even when money also
 * moved. Pure function — the cron gathers the facts, this decides.
 */
export interface PurgeCandidateFacts {
  fee_charged: number | null;
  amount_recovered: number | null;
  legal_hold: boolean | null;
  payment_event_count: number;
}

export type PurgeDecision =
  | { purge: true }
  | { purge: false; reason: 'legal_hold' | 'payment_record' };

export function decidePurge(f: PurgeCandidateFacts): PurgeDecision {
  if (f.legal_hold === true) {
    return { purge: false, reason: 'legal_hold' };
  }
  const moneyMoved =
    (f.fee_charged ?? 0) > 0 ||
    (f.amount_recovered ?? 0) > 0 ||
    f.payment_event_count > 0;
  if (moneyMoved) {
    return { purge: false, reason: 'payment_record' };
  }
  return { purge: true };
}
