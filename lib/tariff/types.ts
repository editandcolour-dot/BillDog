export interface TariffEntry {
  fiscal_year: string;
  category: string;
  rate_value: number;
  vat_inclusive: boolean;
  source_url: string;
  source_document_title: string;
  source_page: string;
  source_sha256: string;
}

export interface TariffConfig {
  municipality_id: string;
  tariffs: Record<string, TariffEntry[]>;
}

export interface TariffStore {
  getRate(tariffCode: string, fiscalYear: string, category: string): TariffEntry | undefined;
}
