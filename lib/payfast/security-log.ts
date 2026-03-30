import { createAdminClient } from '../supabase/admin';

export async function logSecurityEvent(
  eventType: string,
  context: Record<string, unknown>,
): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from('case_events').insert({
    case_id: null, // Security events may not have a case
    event_type: `security_${eventType}`,
    note: `PayFast security event: ${eventType}`,
    metadata: {
      ...context,
      timestamp: new Date().toISOString(),
      source: 'payfast_itn',
    },
  });

  console.error(`[SECURITY] PayFast ${eventType}`, context);
}
