import Image from 'next/image';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-navy flex flex-col justify-center items-center p-4">
      <Link href="/" className="mb-8 flex items-center gap-1" aria-label="Billdog Home">
        <Image
          src="/bulldog-mascot.png"
          alt="Billdog mascot"
          width={64}
          height={64}
          priority
          className="h-[55px] w-[55px] sm:h-[64px] sm:w-[64px] object-cover"
        />
        <span className="font-display text-2xl sm:text-3xl tracking-wide text-white -ml-[10px]">
          BILL<span className="text-orange">DOG</span>
        </span>
      </Link>
      
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}
