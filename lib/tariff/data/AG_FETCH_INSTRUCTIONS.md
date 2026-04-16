# AG Fetch Instructions — Completing Stub Municipalities

## Priority Order for Completion

### Tier 1: High population, most likely to appear in Billdog bills
1. **George** (Western Cape) — western cape coverage after CoCT
   - Fetch: https://www.george.gov.za/municipal-tariffs
   - Note: Uses IBT with capacity-based charges, no residential fixed charge

2. **Drakenstein** (Paarl, Western Cape)
   - Fetch: https://www.drakenstein.gov.za/budget-tariffs

3. **Stellenbosch** (Western Cape)
   - Fetch: https://www.stellenbosch.gov.za/finance/budget

4. **Emfuleni** (Vereeniging, Gauteng)
   - Fetch: https://emfuleni.gov.za/wp-content/uploads/2025/07/2024_2025_Electricity_Tariff_Book.pdf

5. **Rustenburg** (North West)
   - Fetch: https://www.rustenburg.gov.za/documents-tariffs

### Tier 2: Metro-adjacent municipalities
6. **MogaleCity** (Krugersdorp, Gauteng)
7. **Newcastle** (KZN)
8. **uMhlathuze** (Richards Bay, KZN)
9. **Emalahleni** (Witbank, Mpumalanga)
10. **SteveTshwete** (Middelburg, Mpumalanga)

### Tier 3: Other significant municipalities
11-25: See MUNICIPALITY_INDEX.json for source URLs

## For Each Municipality, Extract:
```json
{
  "electricity": {
    "residential_fixed_basic_charge_excl_vat": X,
    "energy_block_rates_excl_vat": {...},
    "tariff_name": "...",
    "approved_increase_pct": X
  },
  "water": {
    "fixed_basic_charge_method": "meter_size|property_value|flat|none",
    "consumption_rates_excl_vat": {...}
  },
  "property_rates": {
    "residential_rate_in_rand": X,
    "first_exempt_value": X
  }
}
```

## Legal Holds — Do Not Fetch or Use
- CoJ/City Power 2024/25: Under NERSA redetermination
- Ekurhuleni 2024/25: Under NERSA redetermination
- Msunduzi 2024/25: Under NERSA redetermination
- Madibeng 2024/25: Under NERSA redetermination

## Key Structural Differences to Handle
| Municipality | Fixed Charge | Tariff Structure | Seasonal? |
|---|---|---|---|
| CoCT | Yes (R390.87 HU) | Block 1/2 | No |
| Tshwane | No | 4-block IBT | No |
| Ekurhuleni | Yes (R142.50/R141.46) | IBT + flat | No |
| BCM | Yes (R489.61) | 2-part block | No |
| CENTLEC/Mangaung | Yes (R234.71 Homeflex) | IBT | Yes (summer/winter) |
| eThekwini | No | Multi-scale | No |
| Mbombela | Yes (R444.79 empty stand) | Named animal tariffs | No |
