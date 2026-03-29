'use server'

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function completeOnboardingAction(params: {
  userId: string;
  userEmail: string;
  userFullName: string;
  municipality: string;
  accountNumber: string;
  propertyType: string;
}) {
  const supabase = await createClient();
  
  // Authenticate the user performing the action
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== params.userId) {
    throw new Error('You must be logged in to complete onboarding.');
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: params.userId,
      email: params.userEmail,
      full_name: params.userFullName,
      municipality: params.municipality,
      account_number: params.accountNumber,
      property_type: params.propertyType,
      consent_given: true,
    });

  if (error) {
    console.error('[Server Action] Onboarding upsert error:', error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard');
  revalidatePath('/upload');
  
  return { success: true };
}
