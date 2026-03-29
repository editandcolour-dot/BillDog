import Link from 'next/link';

export const metadata = {
  title: 'Check Your Email | Billdog',
};

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const email = searchParams.email;

  return (
    <div className="flex flex-col items-center max-w-sm w-full mx-auto text-center">
      <h1 className="font-display text-4xl text-white tracking-wide uppercase mb-6">
        Check your email
      </h1>
      
      <p className="text-white/80 mb-8">
        We&apos;ve sent a verification link to <strong className="text-white">{email || 'your email'}</strong>. Click the link to verify your account and continue.
      </p>

      <div className="bg-white/5 border border-white/10 rounded p-4 w-full">
        <p className="text-sm text-white/60 mb-4">
          Didn&apos;t receive it? Check your spam folder or try sending it again.
        </p>
        <button 
          className="text-orange hover:text-white transition-colors text-sm underline-offset-4 hover:underline"
        >
          Resend verification email
        </button>
      </div>

      <div className="mt-8">
        <Link href="/login" className="text-white/60 hover:text-white text-sm">
          Return to log in
        </Link>
      </div>
    </div>
  );
}
