export function generateDisclosureRequestText(municipality: string): string {
  const dateFormatted = new Date().toLocaleDateString('en-ZA', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  });

  return `FORMAL REQUEST FOR TARIFF SCHEDULE PUBLICATION
In terms of Section 74 of the Local Government: Municipal Systems Act 32 of 2000

To: The Municipal Manager / Director: Finance
Re: ${municipality}
Date: ${dateFormatted}

We write on behalf of a resident/ratepayer within your jurisdiction.

Section 74(1) of the Municipal Systems Act requires your municipality to adopt
and implement a tariff policy on the levying of fees for municipal services.
Section 21A requires that you give notice of any proposed tariff changes.

We have been unable to locate your current approved tariff schedule online.
Specifically, we require:
1. Your approved electricity tariff schedule for the current financial year
2. Your approved water and sanitation tariff schedule
3. The NERSA approval reference for your electricity tariffs
4. Your approved property rates (rate-in-rand) for the current financial year

Please provide this information within 30 days, or advise where it is publicly
accessible.

This request is made in the public interest to assist residents in verifying
the accuracy of their municipal accounts.

Yours faithfully,
Billdog (Pty) Ltd
billing disputes on behalf of South African residents
legal@billdog.co.za

CC: COGTA — Department of Cooperative Governance and Traditional Affairs
CC: NERSA — National Energy Regulator of South Africa`;
}
