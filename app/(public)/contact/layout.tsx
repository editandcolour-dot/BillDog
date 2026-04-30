import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact | Billdog',
  description: 'Get in touch with the Billdog team about your municipal billing dispute.',
  alternates: { canonical: 'https://www.billdog.co.za/contact' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
