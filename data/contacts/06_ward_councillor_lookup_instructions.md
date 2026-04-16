# How to Find Any Ward Councillor in SA

There is no single complete national database of all 4,392 ward councillors.
Use these live lookup sources in order of preference:

## Option 1 — People's Assembly (BEST — address-based)
URL: https://www.pa.org.za/ward-councillor-lookup
Method: Enter street address
Returns: Councillor name, party, some contact details
Coverage: All wards, 1500+ with contact info

## Option 2 — IEC (by SA ID number)
URL: https://www.elections.org.za/pw/voter/Who-Is-My-Ward-Councillor
Method: Enter SA ID number
Returns: Ward number and councillor name (contact details may not be included)

## Option 3 — Municipality's own directory
Each municipality publishes their ward councillor list.
Pattern: {municipality_website}/ward-councillors

KNOWN DIRECTORIES WITH EMAIL ADDRESSES:
- BCM (39 wards): https://www.buffalocity.gov.za/wardcouncillors.php — SEE FILE 02
- Overstrand (13 wards): https://www.overstrand.gov.za/about-us/mayoral-office/ward-councillors/ — SEE FILE 03
- KSD: https://ksd.gov.za/governance/ward-councilors/ — SEE FILE 04
- Msunduzi: http://www.msunduzi.gov.za/site/ward-councillors/index.html
- CoCT (116 wards): https://web1.capetown.gov.za/web1/councilhubonline/
  API pattern: wardprofile?wardid=1 through wardid=116
  Open data: https://odp-cctegis.opendata.arcgis.com/datasets/city-of-cape-town-councillors

## Option 4 — DA councillors map (DA-held wards only)
URL: https://www.da.org.za/our-people/ward-councillors-map

## Email Pattern Fallback
Most municipalities: {surname}@{municipality_domain}
Examples:
- CoCT: smith@capetown.gov.za
- CoJ: smith@joburg.org.za
- BCM: SmithJ@buffalocity.gov.za
- Overstrand: smith@overstrand.gov.za
- eThekwini: smith@durban.gov.za

## For Billdog Integration
Recommend building a lookup integration with People's Assembly API.
At time of dispute letter generation, call PA API with user's address
to retrieve ward councillor name and contact details for CC.
