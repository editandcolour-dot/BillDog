import { ParsedBill, ValidationFinding } from '@/types/analysis';
import { runUniversalChecks } from '../checks/universalChecks';

export interface TransparencyReport {
  municipality_name: string;
  disclosure_status: 'NOT_FOUND';
  legal_obligation: {
    act: string;
    section: string;
    obligation: string;
    secondary: string;
  };
  nersa_status: number | string;
  what_billdog_is_doing: string[];
  what_happens_next: string;
  preliminary_findings: ValidationFinding[];
}

import { getApprovedIncrease } from '../tariff/tariffLookup';

export function generateTransparencyReport(
  municipality: string, 
  tariffYear: string,
  bill: ParsedBill
): TransparencyReport {
  return {
    municipality_name: municipality,
    disclosure_status: 'NOT_FOUND',
    legal_obligation: {
      act: 'Local Government: Municipal Systems Act 32 of 2000',
      section: 'Section 74',
      obligation: 'Municipality must adopt and implement a tariff policy and make it available to the public',
      secondary: 'Section 21A — municipality must give notice of any tariff increase'
    },
    nersa_status: getApprovedIncrease(municipality, tariffYear) || 'unknown',
    what_billdog_is_doing: [
      'Logging this bill as evidence in our national database',
      `Filing a formal tariff disclosure request with ${municipality} under Section 74`,
      `Notifying COGTA that this municipality's tariffs are not publicly accessible`,
      `Monitoring NERSA publications for this municipality's approved rates`
    ],
    what_happens_next: 'You will be notified when tariff data becomes available and your bill can be fully analysed. Your bill has been saved and will be re-analysed automatically.',
    preliminary_findings: runUniversalChecks(bill)
  };
}
