import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import manifest from '@/app/manifest';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

describe('PWA manifest', () => {
  const m = manifest();

  it('declares the 192 + 512 + maskable icon set the Android splash needs', () => {
    const bySize = (m.icons || []).map(i => `${i.sizes}/${i.purpose ?? 'any'}`);
    expect(bySize).toContain('192x192/any');
    expect(bySize).toContain('512x512/any');
    expect(bySize).toContain('512x512/maskable');
  });

  it('every manifest icon file actually exists in public/ (the 404 class)', () => {
    for (const icon of m.icons || []) {
      const file = path.join(PUBLIC_DIR, icon.src.replace(/^\//, ''));
      expect(fs.existsSync(file), `${icon.src} missing from public/`).toBe(true);
      expect(fs.statSync(file).size, `${icon.src} is empty`).toBeGreaterThan(500);
    }
  });

  it('uses the design-system navy for splash background and theme', () => {
    expect(m.background_color).toBe('#0B1F3A');
    expect(m.theme_color).toBe('#0B1F3A');
    expect(m.display).toBe('standalone');
  });

  it('the apple-touch-icon exists in public/ for the iOS home screen', () => {
    const file = path.join(PUBLIC_DIR, 'apple-touch-icon.png');
    expect(fs.existsSync(file), 'apple-touch-icon.png missing from public/').toBe(true);
    expect(fs.statSync(file).size).toBeGreaterThan(500);
  });
});
