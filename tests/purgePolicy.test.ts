import { describe, it, expect } from 'vitest';
import { decidePurge } from '@/lib/cases/purge-policy';

const clean = { fee_charged: null, amount_recovered: null, legal_hold: false, payment_event_count: 0 };

describe('decidePurge — 90-day purge carve-outs', () => {
  it('purges freely when no money moved and no hold', () => {
    expect(decidePurge(clean)).toEqual({ purge: true });
    expect(decidePurge({ ...clean, fee_charged: 0, amount_recovered: 0 })).toEqual({ purge: true });
  });

  it('retains when a success fee was charged', () => {
    expect(decidePurge({ ...clean, fee_charged: 150.5 })).toEqual({ purge: false, reason: 'payment_record' });
  });

  it('retains when an amount was recovered', () => {
    expect(decidePurge({ ...clean, amount_recovered: 1003.37 })).toEqual({ purge: false, reason: 'payment_record' });
  });

  it('retains when a payment_charged event exists (ITN receipt)', () => {
    expect(decidePurge({ ...clean, payment_event_count: 1 })).toEqual({ purge: false, reason: 'payment_record' });
  });

  it('retains on legal hold, and hold takes reporting precedence over payment', () => {
    expect(decidePurge({ ...clean, legal_hold: true })).toEqual({ purge: false, reason: 'legal_hold' });
    expect(decidePurge({ ...clean, legal_hold: true, fee_charged: 99 })).toEqual({ purge: false, reason: 'legal_hold' });
  });

  it('treats null legal_hold as no hold (pre-migration rows)', () => {
    expect(decidePurge({ ...clean, legal_hold: null })).toEqual({ purge: true });
  });
});
