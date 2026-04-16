import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

export interface MunicipalityContacts {
  code: string;
  name: string;
  province: string;
  ombudsmanType: 'INDEPENDENT' | 'INTERNAL_UNIT' | 'BY_LAW_NO_EMAIL' | 'NONE';
  ombudsmanEmail: string | null;
  municipalManagerEmail: string;
  billingPhone: string | null;
  billingEmail: string | null;
  billingPortal: string | null;
  publicProtectorProvince: string;
  publicProtectorPhone: string | null;
  publicProtectorEmail: string | null;
  escalationNotes: string;
}

const parseCSV = <T>(filename: string): T[] => {
  const filePath = path.join(process.cwd(), 'data/contacts', filename);
  if (!fs.existsSync(filePath)) return [];
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const result = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
  return result.data as T[];
};

export function getMunicipalityContacts(municipalityCodeOrName: string): MunicipalityContacts | null {
  const data = parseCSV<any>('municipalities_master.csv');
  
  const record = data.find(
    (row) => 
      row.municipality_code.toLowerCase() === municipalityCodeOrName.toLowerCase() ||
      row.municipality_name.toLowerCase() === municipalityCodeOrName.toLowerCase()
  );

  if (!record) return null;

  return {
    code: record.municipality_code,
    name: record.municipality_name,
    province: record.province,
    ombudsmanType: record.ombudsman_type as 'INDEPENDENT' | 'INTERNAL_UNIT' | 'BY_LAW_NO_EMAIL' | 'NONE',
    ombudsmanEmail: record.ombudsman_email || null,
    municipalManagerEmail: record.municipal_manager_email,
    billingPhone: record.billing_phone || null,
    billingEmail: record.billing_email || null,
    billingPortal: record.billing_portal || null,
    publicProtectorProvince: record.public_protector_province,
    publicProtectorPhone: record.public_protector_phone || null,
    publicProtectorEmail: record.public_protector_email || null,
    escalationNotes: record.escalation_notes || ''
  };
}

export function getPublicProtectorContacts(provinceIdentifier: string): { phone: string; email: string | null } | null {
  const data = parseCSV<any>('public_protector_contacts.csv');
  
  // Clean up identifier (e.g. "Western Cape" or "western_cape")
  const target = provinceIdentifier.toLowerCase().replace('_', ' ');

  let record = data.find((row) => row.province.toLowerCase().replace('_', ' ') === target);
  
  // Fallback to Head Office if specific province is missing or we explicitly want to route there
  if (!record) {
    record = data.find((row) => row.province === 'HEAD_OFFICE');
  }

  if (!record) return null;

  return {
    phone: record.phone || '',
    email: record.email || null
  };
}
