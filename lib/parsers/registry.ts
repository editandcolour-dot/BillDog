import { GenericParser } from './generic';
import type { BillParser } from './types';
import coctConfig from './configs/city-of-cape-town.json';

const parsers: Record<string, BillParser> = {
  'city-of-cape-town': new GenericParser(coctConfig as any),
  'CoCT': new GenericParser(coctConfig as any)
};

export function getParser(municipalityId: string): BillParser | null {
  return parsers[municipalityId] || null;
}
