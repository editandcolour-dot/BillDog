# Billdog Synthetic Test Corpus v1.4

54 synthetic CoCT bills with full ground-truth answer key. Generated to validate
Billdog's parser and analyser accuracy.

## v1.4 changes vs v1.3

T1-E16 now has 6 expected findings (added UNKNOWN_TARIFF for water fixed basic
FY2025/26 — no tariff data in the generic store, Billdog correctly flags for review).
All T1-E16 findings now include explicit `type` field for the new (type, overchargeZar)
tuple matcher in scripts/corpus-test-runner.ts.

## v1.3 changes vs v1.2

T1-E16 expected_findings updated to match the rate-mismatch findings Billdog
correctly emits when the synthetic bill's printed rates don't align with FY2024/25
or FY2025/26 gazetted tariffs.

## v1.2 changes vs v1.1

Bills now use real FY2024/25 gazetted CoCT tariff values, not May 2023 reference values.
This was the critical fix: previously, every clean bill triggered tariff-mismatch false
positives because Billdog correctly resolves to FY2024/25 tariffs but the bills printed
FY2022/23 reference values.

Updated tariffs in synthetic bills (all FY2024/25 gazetted values):
- Property rates: 0.0066310 (was 0.0063440)
- Rebate threshold: R435,000 (was R285,000)
- Water step 1: R19.59/kl (was R16.89)
- Water step 2: R26.92/kl (was R28.91)
- Water step 3: R36.58/kl (was R44.99)
- Water fixed basic 20mm: R135.54/side (was R116.86)
- Refuse 240l: R166.26 (was R149.13)
- Sewer step 1 (0-4.2kl): R17.22/kl (was single rate R14.84)
- Sewer step 2 (>4.2-7.35kl): R23.65/kl (NEW — multi-tier sewer support)
- Sewer step 3 (>7.35-24.5kl): R33.22/kl (NEW)
- Sewer step 4 (>24.5-35kl): R52.25/kl (NEW)
- Electricity HUC: R245.03 (was R185.00)

Tier 1 and Tier 2 statement dates remain mid-FY2024/25 (Aug 2024 to late Jun 2025) so
billing periods stay fully within FY2024/25. T1-E16 (fiscal boundary) still spans
1 July 2025 to test FY2024/25 → FY2025/26 transition.

## Contents

```
billdog-test-corpus-v5/
├── README.md
├── answer_key.json
├── tier1_single_bill/   (36 bills: 16 errors + 20 clean)
├── tier2_series/        (12 bills: 12-month series)
└── tier3_edge_cases/    (6 bills)
```

## Tier descriptions

### Tier 1 — Single-bill detection (36 bills)

16 error bills, one error each:
- T1-E01 Water tier-line inflation
- T1-E02 Sewer tier-line inflation
- T1-E03 HUC inflation R140 + VAT cascade
- T1-E04 Refuse charge inflation + VAT cascade
- T1-E05 Water tariff overcharge
- T1-E06 Water tariff undercharge
- T1-E07 Duplicate refuse line
- T1-E08 Missing property rates rebate
- T1-E09 Estimated reading flagged
- T1-E10 Decimal-place typo on HUC
- T1-E11 Carryover balance error
- T1-E12 VAT charged on zero-rated property rates
- T1-E13 Unjustified connection fee
- T1-E14 Extra refuse bin charge
- T1-E15 Unjustified interest charge
- T1-E16 Fiscal boundary CLEAN bill (must capture all 4 segments)

20 clean bills: vary across valuations and water consumption within FY2024/25.

### Tier 2 — Series-level trend errors (12 bills)

Aug 2024 to late Jun 2025.
- M1-3: Clean baseline
- M4-7: Compounding water tariff overcharge (+R0.50/kl per month)
- M5-7: Duplicate refuse charge appears
- M8: Clean
- M9-12: Carryover balance error

### Tier 3 — Edge cases (6 bills)

- T3-01 Stacked errors (water tier + HUC)
- T3-02 Small-magnitude error (R5)
- T3-03 Large-magnitude error (R200)
- T3-04 UNKNOWN_TARIFF (water step 3 case)
- T3-05 Clean control
- T3-06 Borderline-clean (false-positive resistance)

## Execution order

1. Tier 1 first. Iterate until 100% match.
2. Tier 2.
3. Tier 3.
4. Then Test 2 (Jason's real 36 bills).

## Scoring

- Detection (error bills): every expected finding must be detected.
  expected_recoverable matches within R1.00 tolerance.
- False-positive resistance (clean bills): zero findings allowed.
- Severity: findings tagged INFORMATIONAL, MARGINAL, REVIEW_ONLY classify accordingly.

## Notes

- All bills use 15% VAT (effective 1 April 2018 onwards in SA).
- Internal arithmetic verified: when an error is injected, all subtotals, VAT,
  and totals reflect the inflated state. Bills look like real overcharged bills,
  not broken bills.
- Tariff values match what Billdog's tariff store resolves for FY2024/25.
  Clean bills should produce zero findings. Error bills should produce exactly
  the listed findings.
