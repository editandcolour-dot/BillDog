import { TariffStore } from './types';
import { GenericTariffStore } from './generic-store';

const storeCache: Record<string, TariffStore> = {};

export function getTariffStore(municipalityId: string): TariffStore {
  if (storeCache[municipalityId]) {
    return storeCache[municipalityId];
  }

  let config;
  try {
    // Lazily load the JSON config to avoid bloat if unused
    config = require(`./configs/${municipalityId}.json`);
  } catch (error) {
    throw new Error(`Tariff configuration for municipality '${municipalityId}' not found.`);
  }

  const store = new GenericTariffStore(config);
  storeCache[municipalityId] = store;
  return store;
}
