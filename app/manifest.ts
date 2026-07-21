import type { MetadataRoute } from 'next';

/**
 * PWA manifest — served by Next at /manifest.webmanifest and auto-linked from
 * every page. Android builds the install splash from the 512px icon +
 * background_color; the maskable variant keeps the dog inside launcher mask
 * shapes. Icon files are generated from the logo.svg dog mark (see git history
 * for the generator) and their existence is guarded by tests/manifest.test.ts.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Billdog — Fight Your Municipal Bill',
    short_name: 'Billdog',
    description:
      'AI-powered municipal billing dispute service for South African property owners.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B1F3A',
    theme_color: '#0B1F3A',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
