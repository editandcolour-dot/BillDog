import { Bebas_Neue, DM_Sans } from 'next/font/google';
import './globals.css';

import { CookieBanner } from '@/components/layout/CookieBanner';

import type { Metadata, Viewport } from 'next';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas-neue',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'Billdog — Fight Your Municipal Bill',
    template: '%s | Billdog',
  },
  description:
    'AI-powered municipal billing dispute service for South African property owners. No lawyers. No queues. No nonsense. Just results.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://billdog.co.za',
  ),
  openGraph: {
    title: 'Are you owed money by your municipality?',
    description: 'South African homeowners are owed billions in overcharged rates & electricity. No win, no fee. Find out in minutes.',
    url: 'https://billdog.co.za',
    type: 'website',
    siteName: 'Billdog',
    images: [
      {
        url: 'https://billdog.co.za/og-image.jpg',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Are you owed money by your municipality?',
    description: 'No win, no fee. Let Billdog fight your municipal billing dispute.',
    images: ['https://billdog.co.za/og-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${dmSans.variable}`}>
      <body className="font-body antialiased bg-navy">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}

