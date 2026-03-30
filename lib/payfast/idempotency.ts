import { createAdminClient } from '../supabase/admin';

export async function isAlreadyProcessed(pfPaymentId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('case_events')
    .select('id')
    .eq('metadata->>pf_payment_id', pfPaymentId)
    .limit(1);

  return (data?.length ?? 0) > 0;
}
