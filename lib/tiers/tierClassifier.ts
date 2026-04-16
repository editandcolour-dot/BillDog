import fs from 'fs';
import path from 'path';

export type CoverageTier = 1 | 2 | 3;

let municipalityIndex: any = null;

function loadIndex() {
  if (municipalityIndex) return municipalityIndex;
  try {
    const filePath = path.join(process.cwd(), 'lib/tariff/data/MUNICIPALITY_INDEX.json');
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      municipalityIndex = JSON.parse(fileContent);
    }
  } catch (err) {
    console.error('[tierClassifier] Failed to load MUNICIPALITY_INDEX', err);
  }
  return municipalityIndex;
}

export function classifyMunicipality(municipalityNameOrCode: string): CoverageTier {
  const index = loadIndex();
  if (!index) return 3; // Fallback to Undisclosed if index is totally missing

  // Map incoming string dynamically. It might be 'CoCT' or 'City of Cape Town'
  // Scan metros first
  if (index.metros) {
    for (const [code, data] of Object.entries<any>(index.metros)) {
      if (
        code.toLowerCase() === municipalityNameOrCode.toLowerCase() ||
        data.name.toLowerCase() === municipalityNameOrCode.toLowerCase()
      ) {
        return mapCoverageToTier(data.coverage);
      }
    }
  }

  // Scan secondary municipalities
  if (index.secondary_municipalities) {
    for (const [code, data] of Object.entries<any>(index.secondary_municipalities)) {
      if (
        code.toLowerCase() === municipalityNameOrCode.toLowerCase() ||
        data.name.toLowerCase() === municipalityNameOrCode.toLowerCase()
      ) {
        return mapCoverageToTier(data.coverage);
      }
    }
  }

  // If not found in index, default down to Tier 3 (Undisclosed)
  return 3;
}

function mapCoverageToTier(coverageStatus: string): CoverageTier {
  switch (coverageStatus) {
    case 'COMPLETE':
      return 1;
    case 'PARTIAL':
      return 2;
    case 'STUB':
    case 'NOT_STARTED':
    case 'LEGAL_HOLD':
    case 'ESKOM_SUPPLY':
      return 3;
    default:
      return 3;
  }
}
