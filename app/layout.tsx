import { Bebas_Neue, DM_Sans } from 'next/font/google';
import './globals.css';



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
    title: 'Billdog — Fight Your Municipal Bill',
    description:
      'Your municipality got it wrong. We\u2019ll make it right. AI-powered analysis, human-reviewed letters.',
    type: 'website',
    locale: 'en_ZA',
    siteName: 'Billdog',
    images: ['/og-image.png'],
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
      </body>
    </html>
  );
}
