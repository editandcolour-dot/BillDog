import Image from 'next/image';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-navy flex flex-col justify-center items-center p-4">
      <Link href="/" className="mb-8" aria-label="Billdog Home">
        <Image src="/logo.svg" alt="Billdog Logo" width={140} height={40} className="w-auto h-10" />
      </Link>
      
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}
