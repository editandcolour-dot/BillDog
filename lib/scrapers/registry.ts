/**
 * Scraper Registry — Municipality Scraper Lookup
 *
 * Maps municipality slugs to their scraper implementations.
 * New municipalities are added here — no other code changes needed.
 *
 * Source of truth: implementation_plan v3 §3d.
 */

import type { MunicipalScraper } from './types';
import { GenericScraper } from './generic';

/**
 * Registry of supported municipality scrapers.
 * Key: municipality slug (kebab-case, matches municipalities table lookup).
 * Value: factory function returning a scraper instance.
 */
const SCRAPER_REGISTRY: Record<string, () => MunicipalScraper> = {
  'city-of-cape-town': () => new GenericScraper('city-of-cape-town'),
};

/**
 * Get the scraper for a municipality slug.
 * Returns null if the municipality is not supported for auto-fetch.
 */
export function getScraper(slug: string): MunicipalScraper | null {
  const factory = SCRAPER_REGISTRY[slug];
  return factory ? factory() : null;
}

/**
 * Check if a municipality has a supported scraper.
 */
export function isMunicipalitySupported(slug: string): boolean {
  return slug in SCRAPER_REGISTRY;
}

/**
 * List all supported municipality slugs.
 */
export function getSupportedMunicipalities(): string[] {
  return Object.keys(SCRAPER_REGISTRY);
}
