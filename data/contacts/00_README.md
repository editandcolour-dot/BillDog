# Billdog Escalation Contacts — Complete Package

## Files in this package:

01_municipalities_master.csv
  - All 130+ municipalities covered by Billdog
  - Municipal manager emails, billing contacts, ombudsman status
  - Public Protector office routing per province
  - Used by escalation engine to route disputes

02_ward_councillors_BCM.csv
  - All 39 BCM (Buffalo City Metro) ward councillors
  - Names, phones, emails where available
  - Source: buffalocity.gov.za (live data)

03_ward_councillors_Overstrand.csv
  - Overstrand ward councillors with email addresses
  - Source: overstrand.gov.za

04_ward_councillors_KSD.csv
  - King Sabata Dalindyebo ward councillors (partial)
  - Source: ksd.gov.za

05_public_protector_contacts.csv
  - All 9 provincial PP offices + head office
  - Phone numbers and emails where confirmed
  - Covers all 257 SA municipalities

06_ward_councillor_lookup_instructions.md
  - How to find any ward councillor dynamically
  - API links, directory links, email patterns

## Escalation Sequence
1. Municipality billing department (get reference number)
2. Municipal ombudsman (CoCT + CoJ only) OR municipal manager (everyone else)
   CC: ward councillor (dynamic lookup via People's Assembly)
3. Public Protector provincial office (see file 05)
4. NERSA (electricity violations: 012 401 4600, nersa.org.za)
5. Presidential Hotline: 17737 / president@po.gov.za

## Only 2 truly independent municipal ombudsmen exist in SA:
- CoCT: ombudsman@capetown.gov.za
- CoJ: complaints@joburgombudsman.org.za
All other municipalities: escalate to municipal manager then Public Protector.

## Ward councillors not covered here:
Full national database requires live lookup (see file 06).
CoCT alone has 116 wards — use their API at:
https://web1.capetown.gov.za/web1/councilhubonline/wardprofile?wardid={1-116}
