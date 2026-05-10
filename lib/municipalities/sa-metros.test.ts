import { describe, it, expect } from 'vitest';
import { getMetros, getMetroById, getMetroByName, getLiveMetros, getDropdownOptions, getOtherOption } from '@/lib/municipalities/sa-metros';

describe('SA Metros Config', () => {
  it('loads exactly 8 metros', () => {
    const metros = getMetros();
    expect(metros).toHaveLength(8);
  });

  it('each metro has required fields', () => {
    for (const metro of getMetros()) {
      expect(metro.id).toBeTruthy();
      expect(metro.name).toBeTruthy();
      expect(metro.province).toBeTruthy();
      expect(metro.portal_url).toMatch(/^https?:\/\//);
      expect(['live', 'discovery_pending', 'discovery_failed', 'manual_request']).toContain(metro.scraper_status);
    }
  });

  it('CoCT is the only live metro', () => {
    const live = getLiveMetros();
    expect(live).toHaveLength(1);
    expect(live[0].id).toBe('city-of-cape-town');
    expect(live[0].scraper_status).toBe('live');
  });

  it('7 metros are discovery_pending', () => {
    const pending = getMetros().filter(m => m.scraper_status === 'discovery_pending');
    expect(pending).toHaveLength(7);
  });

  it('getMetroById returns correct metro', () => {
    const coct = getMetroById('city-of-cape-town');
    expect(coct).toBeDefined();
    expect(coct!.name).toBe('City of Cape Town');
  });

  it('getMetroById returns undefined for unknown id', () => {
    expect(getMetroById('nonexistent')).toBeUndefined();
  });

  it('getMetroByName returns correct metro', () => {
    const joburg = getMetroByName('City of Johannesburg');
    expect(joburg).toBeDefined();
    expect(joburg!.id).toBe('city-of-johannesburg');
  });

  it('dropdown options include 8 metros + other', () => {
    const options = getDropdownOptions();
    expect(options).toHaveLength(9);
    expect(options[8].id).toBe('other');
  });

  it('other option has correct structure', () => {
    const other = getOtherOption();
    expect(other.id).toBe('other');
    expect(other.scraper_status).toBe('manual_request');
    expect(other.name).toContain('Other');
  });

  it('CoCT portal URL is the correct eservices domain', () => {
    const coct = getMetroById('city-of-cape-town');
    expect(coct!.portal_url).toBe('https://eservices.capetown.gov.za');
  });
});
