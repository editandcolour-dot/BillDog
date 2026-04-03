-- MED-02: Fix missing statuses in cases_status_check
-- Includes 'escalating', 'acknowledged', 'send_failed'

ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_status_check;

ALTER TABLE cases ADD CONSTRAINT cases_status_check CHECK (
  status IN (
    'uploading', 
    'analysing', 
    'letter_ready', 
    'sent', 
    'acknowledged', 
    'escalating', 
    'resolved', 
    'escalated', 
    'closed',
    'send_failed'
  )
);
