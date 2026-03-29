import { SignupForm } from '@/components/forms/SignupForm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sign Up | Billdog',
  description: 'Create your Billdog account to dispute municipal billing errors.',
};

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center">
      <h1 className="font-display text-4xl text-white tracking-wide uppercase mb-6 text-center">
        Create Account
      </h1>
      
      <SignupForm />
      
      <p className="mt-6 text-white/70 text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-orange hover:text-white transition-colors underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
