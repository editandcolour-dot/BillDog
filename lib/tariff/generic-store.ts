import { TariffConfig, TariffEntry, TariffStore } from './types';

export class GenericTariffStore implements TariffStore {
  private config: TariffConfig;

  constructor(config: TariffConfig) {
    this.config = config;
  }

  getRate(tariffCode: string, fiscalYear: string, category: string): TariffEntry | undefined {
    const entries = this.config.tariffs[tariffCode];
    if (!entries) {
      return undefined;
    }

    return entries.find(
      (entry) => entry.fiscal_year === fiscalYear && entry.category === category
    );
  }
}
