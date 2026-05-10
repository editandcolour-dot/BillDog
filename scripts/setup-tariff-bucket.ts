import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';

const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^#\s][^=]*)=(.*)$/);
    if (match) {
      let key = match[1].trim();
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET_NAME = 'tariff-archives';

const DOWNLOAD_TASKS = [
  {
    url: 'https://resource.capetown.gov.za/documentcentre/Documents/Financial%20documents/Budget2425_Ann6_WaterandSanitationServices-WaterLevelWaterWise-NoRestriction.pdf',
    fiscal_year: '2024-25',
    tariff_code: 'WATER',
    title: 'Annexure 6 Water and Sanitation Services'
  },
  {
    url: 'https://resource.capetown.gov.za/documentcentre/Documents/Financial%20documents/Water%20and%20Sanitation-Water%20Tariffs.pdf',
    fiscal_year: '2025-26',
    tariff_code: 'WATER',
    title: 'Water and Sanitation Water Tariffs'
  }
];

function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
      }
      const data: Buffer[] = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

function calculateSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function main() {
  console.log('Ensuring bucket exists...');
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET_NAME)) {
    console.log(`Creating bucket ${BUCKET_NAME}...`);
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 52428800, // 50MB limit
    });
    if (error) {
      console.error('Failed to create bucket:', error);
      return;
    }
  } else {
    // If it exists, update it to ensure public: false
    await supabase.storage.updateBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 52428800,
    });
    console.log(`Bucket ${BUCKET_NAME} exists and policies verified.`);
  }

  const results: Record<string, string> = {};

  for (const task of DOWNLOAD_TASKS) {
    console.log(`Downloading ${task.url}...`);
    try {
      const buffer = await downloadFile(task.url);
      const sha256 = calculateSha256(buffer);
      console.log(`Downloaded. SHA256: ${sha256}`);
      
      const filePath = `city-of-cape-town/${task.fiscal_year}/${task.tariff_code}/${sha256}.pdf`;
      
      console.log(`Uploading to ${filePath}...`);
      const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, buffer, {
        upsert: true,
        contentType: 'application/pdf'
      });
      
      if (uploadError) {
        console.error(`Upload error for ${task.url}:`, uploadError);
      } else {
        console.log(`Successfully uploaded ${filePath}`);
      }
      
      results[`${task.fiscal_year}_${task.tariff_code}`] = sha256;
    } catch (e) {
      console.error(`Failed on task ${task.url}`, e);
    }
  }
  
  // Now write the config file
  const config = {
    municipality_id: "city-of-cape-town",
    tariffs: {
      "RATES": [
        { fiscal_year: "2022/23", category: "residential", rate_value: 0.0063440, vat_inclusive: false, source_url: "https://capetown.gov.za", source_document_title: "Legacy Hardcoded", source_page: "N/A", source_sha256: "legacy" },
        { fiscal_year: "2023/24", category: "residential", rate_value: 0.0062730, vat_inclusive: false, source_url: "https://capetown.gov.za", source_document_title: "Legacy Hardcoded", source_page: "N/A", source_sha256: "legacy" },
        { fiscal_year: "2024/25", category: "residential", rate_value: 0.0066310, vat_inclusive: false, source_url: "https://capetown.gov.za", source_document_title: "Legacy Hardcoded", source_page: "N/A", source_sha256: "legacy" },
        { fiscal_year: "2025/26", category: "residential", rate_value: 0.0071590, vat_inclusive: false, source_url: "https://capetown.gov.za", source_document_title: "Legacy Hardcoded", source_page: "N/A", source_sha256: "legacy" }
      ],
      "HUC": [
        { fiscal_year: "2022/23", category: "residential", rate_value: 185.00, vat_inclusive: false, source_url: "https://capetown.gov.za", source_document_title: "Legacy Hardcoded", source_page: "N/A", source_sha256: "legacy" },
        { fiscal_year: "2023/24", category: "residential", rate_value: 219.21, vat_inclusive: false, source_url: "https://capetown.gov.za", source_document_title: "Legacy Hardcoded", source_page: "N/A", source_sha256: "legacy" },
        { fiscal_year: "2024/25", category: "residential", rate_value: 245.03, vat_inclusive: false, source_url: "https://capetown.gov.za", source_document_title: "Legacy Hardcoded", source_page: "N/A", source_sha256: "legacy" },
        { fiscal_year: "2025/26", category: "residential", rate_value: 339.89, vat_inclusive: false, source_url: "https://capetown.gov.za", source_document_title: "Legacy Hardcoded", source_page: "N/A", source_sha256: "legacy" }
      ],
      "REFUSE": [
        { fiscal_year: "2022/23", category: "240L", rate_value: 149.13, vat_inclusive: false, source_url: "https://capetown.gov.za", source_document_title: "Legacy Hardcoded", source_page: "N/A", source_sha256: "legacy" },
        { fiscal_year: "2023/24", category: "240L", rate_value: 157.30, vat_inclusive: false, source_url: "https://capetown.gov.za", source_document_title: "Legacy Hardcoded", source_page: "N/A", source_sha256: "legacy" },
        { fiscal_year: "2024/25", category: "240L", rate_value: 166.26, vat_inclusive: false, source_url: "https://capetown.gov.za", source_document_title: "Legacy Hardcoded", source_page: "N/A", source_sha256: "legacy" },
        { fiscal_year: "2025/26", category: "240L", rate_value: 178.52, vat_inclusive: false, source_url: "https://capetown.gov.za", source_document_title: "Legacy Hardcoded", source_page: "N/A", source_sha256: "legacy" }
      ],
      "WATER_FIXED_BASIC_METER": [
        { fiscal_year: "2022/23", category: "20mm", rate_value: 116.86, vat_inclusive: false, source_url: "https://capetown.gov.za", source_document_title: "Legacy Hardcoded", source_page: "N/A", source_sha256: "legacy" },
        { fiscal_year: "2023/24", category: "20mm", rate_value: 126.91, vat_inclusive: false, source_url: "https://capetown.gov.za", source_document_title: "Legacy Hardcoded", source_page: "N/A", source_sha256: "legacy" },
        { fiscal_year: "2024/25", category: "20mm", rate_value: 135.54, vat_inclusive: false, source_url: "https://capetown.gov.za", source_document_title: "Legacy Hardcoded", source_page: "N/A", source_sha256: "legacy" }
      ],
      "WATER_FIXED_BASIC_PROPERTY_BAND": [
        { fiscal_year: "2025/26", category: "R4500001-R5000000", rate_value: 214.89, vat_inclusive: false, source_url: "https://capetown.gov.za", source_document_title: "Legacy Hardcoded", source_page: "N/A", source_sha256: "legacy" }
      ],
      "WATER_TIER_1": [
        { fiscal_year: "2024/25", category: "residential", rate_value: 19.59, vat_inclusive: false, source_url: DOWNLOAD_TASKS[0].url, source_document_title: DOWNLOAD_TASKS[0].title, source_page: "54.1", source_sha256: results["2024-25_WATER"] },
        { fiscal_year: "2025/26", category: "residential", rate_value: 21.15, vat_inclusive: false, source_url: DOWNLOAD_TASKS[1].url, source_document_title: DOWNLOAD_TASKS[1].title, source_page: "54.1", source_sha256: results["2025-26_WATER"] }
      ],
      "WATER_TIER_2": [
        { fiscal_year: "2024/25", category: "residential", rate_value: 26.92, vat_inclusive: false, source_url: DOWNLOAD_TASKS[0].url, source_document_title: DOWNLOAD_TASKS[0].title, source_page: "54.1", source_sha256: results["2024-25_WATER"] },
        { fiscal_year: "2025/26", category: "residential", rate_value: 29.06, vat_inclusive: false, source_url: DOWNLOAD_TASKS[1].url, source_document_title: DOWNLOAD_TASKS[1].title, source_page: "54.1", source_sha256: results["2025-26_WATER"] }
      ],
      "WATER_TIER_3": [
        { fiscal_year: "2024/25", category: "residential", rate_value: 36.58, vat_inclusive: false, source_url: DOWNLOAD_TASKS[0].url, source_document_title: DOWNLOAD_TASKS[0].title, source_page: "54.1", source_sha256: results["2024-25_WATER"] },
        { fiscal_year: "2025/26", category: "residential", rate_value: 43.44, vat_inclusive: false, source_url: DOWNLOAD_TASKS[1].url, source_document_title: DOWNLOAD_TASKS[1].title, source_page: "54.1", source_sha256: results["2025-26_WATER"] }
      ],
      "WATER_TIER_4": [
        { fiscal_year: "2024/25", category: "residential", rate_value: 67.50, vat_inclusive: false, source_url: DOWNLOAD_TASKS[0].url, source_document_title: DOWNLOAD_TASKS[0].title, source_page: "54.1", source_sha256: results["2024-25_WATER"] },
        { fiscal_year: "2025/26", category: "residential", rate_value: 83.80, vat_inclusive: false, source_url: DOWNLOAD_TASKS[1].url, source_document_title: DOWNLOAD_TASKS[1].title, source_page: "54.1", source_sha256: results["2025-26_WATER"] }
      ],
      "SEWER_TIER_1": [
        { fiscal_year: "2024/25", category: "residential", rate_value: 0.00, vat_inclusive: false, source_url: DOWNLOAD_TASKS[0].url, source_document_title: DOWNLOAD_TASKS[0].title, source_page: "TBD", source_sha256: results["2024-25_WATER"] },
        { fiscal_year: "2025/26", category: "residential", rate_value: 0.00, vat_inclusive: false, source_url: DOWNLOAD_TASKS[1].url, source_document_title: DOWNLOAD_TASKS[1].title, source_page: "TBD", source_sha256: results["2025-26_WATER"] }
      ],
      "SEWER_TIER_2": [
        { fiscal_year: "2024/25", category: "residential", rate_value: 0.00, vat_inclusive: false, source_url: DOWNLOAD_TASKS[0].url, source_document_title: DOWNLOAD_TASKS[0].title, source_page: "TBD", source_sha256: results["2024-25_WATER"] },
        { fiscal_year: "2025/26", category: "residential", rate_value: 0.00, vat_inclusive: false, source_url: DOWNLOAD_TASKS[1].url, source_document_title: DOWNLOAD_TASKS[1].title, source_page: "TBD", source_sha256: results["2025-26_WATER"] }
      ],
      "SEWER_TIER_3": [
        { fiscal_year: "2024/25", category: "residential", rate_value: 0.00, vat_inclusive: false, source_url: DOWNLOAD_TASKS[0].url, source_document_title: DOWNLOAD_TASKS[0].title, source_page: "TBD", source_sha256: results["2024-25_WATER"] },
        { fiscal_year: "2025/26", category: "residential", rate_value: 0.00, vat_inclusive: false, source_url: DOWNLOAD_TASKS[1].url, source_document_title: DOWNLOAD_TASKS[1].title, source_page: "TBD", source_sha256: results["2025-26_WATER"] }
      ],
      "SEWER_TIER_4": [
        { fiscal_year: "2024/25", category: "residential", rate_value: 0.00, vat_inclusive: false, source_url: DOWNLOAD_TASKS[0].url, source_document_title: DOWNLOAD_TASKS[0].title, source_page: "TBD", source_sha256: results["2024-25_WATER"] },
        { fiscal_year: "2025/26", category: "residential", rate_value: 0.00, vat_inclusive: false, source_url: DOWNLOAD_TASKS[1].url, source_document_title: DOWNLOAD_TASKS[1].title, source_page: "TBD", source_sha256: results["2025-26_WATER"] }
      ]
    }
  };

  fs.mkdirSync(path.join(__dirname, '../lib/tariff/configs'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '../lib/tariff/configs/city-of-cape-town.json'), JSON.stringify(config, null, 2));
  console.log('Wrote city-of-cape-town.json');
}

main().catch(console.error);
