# Billdog Synthetic Test Corpus v1.0

54 synthetic CoCT bills with full ground-truth answer key for testing Billdog's
parser and analyser accuracy. Generated to validate the new v5 Model A/B parser
architecture before testing against real bills.

## Contents

```
billdog-test-corpus-v5/
├── README.md                    (this file)
├── answer_key.json              (master ground-truth file)
├── tier1_single_bill/           (36 bills: 16 errors + 20 clean)
│   ├── T1-E01.pdf .. T1-E16.pdf (error bills, one error each)
│   └── T1-C01.pdf .. T1-C20.pdf (clean bills)
├── tier2_series/                (12 bills: 12-month sequence with trend errors)
│   └── T2-S01.pdf .. T2-S12.pdf
└── tier3_edge_cases/            (6 bills: stacked errors, edge cases)
    └── T3-01.pdf .. T3-06.pdf
```

## Tier descriptions

### Tier 1 — Single-bill error detection (36 bills)

Each error bill has exactly ONE injected error embedded among 20 clean bills.
Tests basic detection rate AND false-positive resistance.

Error types covered (16 bills):
- `T1-E01` Water tier-line inflation (P4 class)
- `T1-E02` Sewer tier-line inflation (P4 class)
- `T1-E03` HUC inflation R140 + VAT cascade (P2 class)
- `T1-E04` Refuse charge inflation + VAT cascade (P2 class)
- `T1-E05` Water tariff overcharge (rate inflated)
- `T1-E06` Water tariff undercharge (rate deflated, informational)
- `T1-E07` Duplicate refuse line item
- `T1-E08` Missing property rates rebate
- `T1-E09` Estimated reading flagged
- `T1-E10` Decimal-place typo (10x inflation)
- `T1-E11` Carryover balance error (single-bill simulation)
- `T1-E12` VAT charged on zero-rated property rates
- `T1-E13` Unjustified connection fee
- `T1-E14` Extra refuse bin charge
- `T1-E15` Unjustified interest charge
- `T1-E16` Fiscal boundary bill (P1 class — clean bill, parser must capture all 4 segments)

Clean bills (20): vary across property valuations (R1.85M–R15M), water consumption
(0.5–25kl), and statement dates spanning 2024–2025.

### Tier 2 — Series-level trend errors (12 bills)

12-month sequence for one fictional account. Tests cross-bill analysis
(`analyseCrossBill`) for trend errors single-bill analysis cannot catch.

Series narrative:
- Months 1–3: Clean baseline
- Months 4–7: Compounding water tariff overcharge (+R0.50/kl per month)
- Months 5–7: Duplicate refuse charge appears (3 months only)
- Month 8: Clean (errors stopped)
- Months 9–12: Carryover balance error (payments not credited)

### Tier 3 — Edge cases (6 bills)

- `T3-01` Stacked errors (water tier-line + HUC inflation — both must be caught)
- `T3-02` Small-magnitude error (R5 inflation — tests detection threshold)
- `T3-03` Large-magnitude error (R200 inflation — same as T3-02 with bigger value)
- `T3-04` UNKNOWN_TARIFF case (step-3 water rate, may not be in tariff DB)
- `T3-05` Clean bill control
- `T3-06` Borderline-clean bill (false-positive resistance test)

## Answer key format

Per-bill structure in `answer_key.json`:
```json
{
  "bill_id": "T1-E03",
  "tier": 1,
  "category": "error" | "clean" | "edge_case",
  "label": "Human-readable description",
  "pdf_filename": "T1-E03.pdf",
  "expected_findings": [
    {
      "error_type": "SUNDRIES_HUC_INFLATION",
      "line_item": "...",
      "expected_amount": 185.00,
      "shown_amount": 325.00,
      "delta": 140.00,
      "vat_cascade": 21.00,
      "expected_recoverable": 161.00,
      "legal_basis": "..."
    }
  ],
  "expected_non_findings_note": "...",
  "internal_arithmetic_verified": true
}
```

For clean bills, `expected_findings` is empty. Any finding produced by Billdog
on a clean bill is a false positive.

## Execution order

1. **Tier 1 first.** Run all 36 bills through Billdog. Compare findings to
   answer key. If basic single-bill detection fails, fix and rerun before
   touching Tier 2.

2. **Tier 2 next.** Run the 12-month series. Cross-bill analysis must catch
   the compounding water tariff error, recurring duplicate refuse, and
   carryover balance errors.

3. **Tier 3 last.** Edge cases. Confirm stacked errors are both caught,
   magnitude scaling works, UNKNOWN_TARIFF surfaces correctly without
   blocking letter generation or inflating recoverable amounts, and clean
   edge cases produce no false positives.

4. **Only after all 3 tiers pass:** proceed to Test 2 (Jason's 36 real CoCT
   bills with separately-supplied answer key).

## Scoring

For each bill:
- **Detection** (error bills): every expected finding must be detected.
  `expected_recoverable` must match within R1.00 tolerance.
- **False-positive resistance** (clean bills): zero findings allowed.
- **Severity classification**: findings tagged with `expected_finding_severity`
  (e.g. INFORMATIONAL, MARGINAL, REVIEW_ONLY) must be classified accordingly.

## Notes on the corpus

- All bills use 15% VAT (effective from 1 April 2018 onwards in SA).
- Tariff values used are May 2023 CoCT residential tariffs, applied as
  constants across the corpus. The corpus tests parser/analyser correctness,
  not real-world tariff currency.
- Bills are internally arithmetically consistent — when an error is injected
  on a line item, all subtotals, VAT, and totals reflect the inflated state.
  This means Billdog must detect the actual injected error, not simply
  "subtotal mismatch."
- Customer name and address details are placeholder values matching the
  reference bill template.

## Version history

- v1.0 (initial): 54 bills across 3 tiers.
