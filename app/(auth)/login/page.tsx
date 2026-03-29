import { LoginForm } from '@/components/forms/LoginForm';
import Link from 'next/link';

export const metadata = {
  title: 'Log In | Billdog',
  description: 'Log into your Billdog account.',
};

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center">
      <h1 className="font-display text-4xl text-white tracking-wide uppercase mb-6 text-center">
        Welcome Back
      </h1>
      
      <LoginForm />
      
      <p className="mt-6 text-white/70 text-sm">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-orange hover:text-white transition-colors underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
