-- Migration: 021_consent_events.sql
-- Description: Append-only audit log of consent events. Re-granting mandate
--   creates a new row; never overwrites prior history. POPIA evidence record.

CREATE TABLE consent_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL CHECK (event_type IN (
    'popia_granted',
    'mandate_granted',
    'mandate_revoked',
    'fee_consent_granted'
  )),
  consent_version TEXT,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  consent_events IS 'Append-only audit log of POPIA / mandate / fee consent events. POPIA evidence record.';
COMMENT ON COLUMN consent_events.consent_version IS 'Version string of the consent text accepted (NULL for revoke events).';
COMMENT ON COLUMN consent_events.ip_address      IS 'Client IP captured from cf-connecting-ip / x-forwarded-for at the time of the event.';
COMMENT ON COLUMN consent_events.user_agent      IS 'User-Agent header captured at the time of the event.';

CREATE INDEX idx_consent_events_user ON consent_events(user_id, created_at DESC);

ALTER TABLE consent_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own consent history; nothing else. No INSERT, UPDATE, or
-- DELETE policies — service-role bypass only. Append-only enforced by absence
-- of policies for write operations on the public-facing roles.
CREATE POLICY "users_read_own_consent_events"
  ON consent_events FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- Rollback
-- ============================================================
-- DROP TABLE consent_events;
