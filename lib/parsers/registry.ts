import { GenericParser } from './generic';
import type { BillParser } from './types';
import coctConfig from './configs/city-of-cape-town.json';

const coctParser = new GenericParser(coctConfig as any);

// One entry per municipality, keyed by EVERY identifier the app uses for it:
// registry slug, short code, and the display name stored on cases rows.
// Keys are matched after trim + lowercase, so a caller can never silently lose
// the deterministic parser to a casing/alias mismatch (the old bug: cases
// store "City of Cape Town", the registry only knew the slug, getParser
// returned null and analysis degraded to AI-only).
const parsers: Record<string, BillParser> = {
  'city-of-cape-town': coctParser,
  'coct': coctParser,
  'city of cape town': coctParser,
};

export function getParser(municipalityId: string): BillParser | null {
  const key = (municipalityId || '').trim().toLowerCase();
  return parsers[key] || null;
}
