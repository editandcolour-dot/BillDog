import { TariffType } from './tariff-resolver';

export interface ParseGazetteParams {
  pdfText: string;
  tariffType: TariffType;
  subKey?: string | null;
}

export function parseGazette(params: ParseGazetteParams): number | null {
  // STUBBED
  return null;
}
