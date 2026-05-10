/**
 * SA Metropolitan Municipality Config
 *
 * Git-tracked JSON config accessor for the 8 SA metros + "other" option.
 * Source of truth: lib/municipalities/sa-metros.json
 */

import metroData from './sa-metros.json';

export type ScraperStatus = 'live' | 'discovery_pending' | 'discovery_failed' | 'manual_request';

export interface Metro {
  id: string;
  name: string;
  province: string;
  portal_url: string;
  scraper_status: ScraperStatus;
  scraper_config: string | null;
}

export interface OtherOption {
  id: 'other';
  name: string;
  scraper_status: 'manual_request';
}

export interface MetroConfig {
  metros: Metro[];
  other_option: OtherOption;
}

const config: MetroConfig = metroData as MetroConfig;

/** All 8 SA metros (excludes "other"). */
export function getMetros(): Metro[] {
  return config.metros;
}

/** Get a single metro by slug ID (e.g. 'city-of-cape-town'). */
export function getMetroById(id: string): Metro | undefined {
  return config.metros.find((m) => m.id === id);
}

/** Get a single metro by display name (e.g. 'City of Cape Town'). */
export function getMetroByName(name: string): Metro | undefined {
  return config.metros.find((m) => m.name === name);
}

/** Get only metros with scraper_status === 'live'. */
export function getLiveMetros(): Metro[] {
  return config.metros.filter((m) => m.scraper_status === 'live');
}

/** Get all metros + the "other" option for dropdown rendering. */
export function getDropdownOptions(): (Metro | OtherOption)[] {
  return [...config.metros, config.other_option];
}

/** The "other / not listed" option. */
export function getOtherOption(): OtherOption {
  return config.other_option;
}
