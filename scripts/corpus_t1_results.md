# T1 Corpus Test Results

## Summary
- Total: 36
- Passed: 0
- Failed: 36
- False Positives: 212

## Detection Rate by Error Type
- WATER_TIER_LINE_INFLATION: 0/1
- SEWER_TIER_LINE_INFLATION: 0/1
- SUNDRIES_HUC_INFLATION: 0/1
- REFUSE_CHARGE_INFLATION: 0/1
- WATER_TARIFF_OVERCHARGE: 0/1
- WATER_TARIFF_UNDERCHARGE: 1/1
- DUPLICATE_LINE_ITEM: 0/1
- MISSING_REBATE: 0/1
- ESTIMATED_READING_FLAGGED: 1/1
- DECIMAL_TYPO_INFLATION: 0/1
- CARRYOVER_BALANCE_ERROR: 0/1
- VAT_ON_ZERO_RATED: 0/1
- UNJUSTIFIED_CONNECTION_FEE: 0/1
- EXTRA_REFUSE_BIN_CHARGE: 0/1
- UNJUSTIFIED_INTEREST_CHARGE: 1/1
- FISCAL_BOUNDARY_NO_ERROR: 1/1

## Mismatch Details

`json
[
  {
    "bill_id": "T1-E01",
    "filename": "T1-E01.pdf",
    "category": "error",
    "issues": [
      {
        "type": "FALSE_NEGATIVE",
        "expected_finding": {
          "error_type": "WATER_TIER_LINE_INFLATION",
          "line_item": "Water tier 1: 6kl @ R16.89",
          "expected_calc": 101.34,
          "shown_amount": 119.34,
          "delta": 18,
          "vat_cascade": 2.7,
          "expected_recoverable": 20.7,
          "legal_basis": "Water Services Act 108 of 1997 — water charges must align with the published tariff structure."
        },
        "actual_billdog_errors": [
          {
            "line_item": "Rates segment from 08/12/2023: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2202.53,
            "overchargeZar": 23.38,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 01.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 219.21,
            "overchargeZar": 34.21,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R219.21, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 112.43,
            "expected_amount": 197.61,
            "overchargeZar": 85.18,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1317.37) is R197.61, printed VAT is R112.43.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2950.71,
            "expected_amount": 3518.56,
            "overchargeZar": 425.0799999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3518.56 vs Total Due R2950.71. Unexplained gap of R425.08.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      },
      {
        "type": "FALSE_POSITIVE_ON_ERROR_BILL",
        "unexpected_errors": [
          {
            "line_item": "Rates segment from 08/12/2023: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2202.53,
            "overchargeZar": 23.38,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 01.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 219.21,
            "overchargeZar": 34.21,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R219.21, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 112.43,
            "expected_amount": 197.61,
            "overchargeZar": 85.18,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1317.37) is R197.61, printed VAT is R112.43.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2950.71,
            "expected_amount": 3518.56,
            "overchargeZar": 425.0799999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3518.56 vs Total Due R2950.71. Unexplained gap of R425.08.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-E02",
    "filename": "T1-E02.pdf",
    "category": "error",
    "issues": [
      {
        "type": "FALSE_NEGATIVE",
        "expected_finding": {
          "error_type": "SEWER_TIER_LINE_INFLATION",
          "line_item": "Sewer disposal: 4.20kl @ R14.84",
          "expected_calc": 62.33,
          "shown_amount": 90.33,
          "delta": 28,
          "vat_cascade": 4.2,
          "expected_recoverable": 32.2,
          "legal_basis": "Water Services Act 108 of 1997 — sewer charges must align with the published tariff structure."
        },
        "actual_billdog_errors": [
          {
            "line_item": "Rates segment from 08/01/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2202.53,
            "overchargeZar": 23.38,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 02.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 219.21,
            "overchargeZar": 34.21,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R219.21, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 113.93,
            "expected_amount": 199.11,
            "overchargeZar": 85.18,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1327.37) is R199.11, printed VAT is R113.93.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2962.21,
            "expected_amount": 3530.06,
            "overchargeZar": 425.0799999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3530.06 vs Total Due R2962.21. Unexplained gap of R425.08.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      },
      {
        "type": "FALSE_POSITIVE_ON_ERROR_BILL",
        "unexpected_errors": [
          {
            "line_item": "Rates segment from 08/01/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2202.53,
            "overchargeZar": 23.38,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 02.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 219.21,
            "overchargeZar": 34.21,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R219.21, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 113.93,
            "expected_amount": 199.11,
            "overchargeZar": 85.18,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1327.37) is R199.11, printed VAT is R113.93.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2962.21,
            "expected_amount": 3530.06,
            "overchargeZar": 425.0799999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3530.06 vs Total Due R2962.21. Unexplained gap of R425.08.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-E03",
    "filename": "T1-E03.pdf",
    "category": "error",
    "issues": [
      {
        "type": "FALSE_NEGATIVE",
        "expected_finding": {
          "error_type": "SUNDRIES_HUC_INFLATION",
          "line_item": "Electricity Home User Charge - 03.2024",
          "expected_amount": 185,
          "shown_amount": 325,
          "delta": 140,
          "vat_cascade": 21,
          "expected_recoverable": 161,
          "legal_basis": "Municipal Systems Act 32 of 2000, s 75A — service charges must reflect approved tariffs; VAT cascades on overcharged taxable supplies."
        },
        "actual_billdog_errors": [
          {
            "line_item": "Rates segment from 06/02/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2202.53,
            "overchargeZar": 23.38,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 03.2024 (PREPAID 4907315610) 325.00",
            "service_type": "electricity",
            "amount_charged": 325,
            "expected_amount": 219.21,
            "overchargeZar": 105.79,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R219.21, billed R325",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 130.73,
            "expected_amount": 236.91,
            "overchargeZar": 106.18,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1579.37) is R236.91, printed VAT is R130.73.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3091.01,
            "expected_amount": 3798.86,
            "overchargeZar": 472.4999999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3798.86 vs Total Due R3091.01. Unexplained gap of R472.50.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      },
      {
        "type": "FALSE_POSITIVE_ON_ERROR_BILL",
        "unexpected_errors": [
          {
            "line_item": "Rates segment from 06/02/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2202.53,
            "overchargeZar": 23.38,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 03.2024 (PREPAID 4907315610) 325.00",
            "service_type": "electricity",
            "amount_charged": 325,
            "expected_amount": 219.21,
            "overchargeZar": 105.79,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R219.21, billed R325",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 130.73,
            "expected_amount": 236.91,
            "overchargeZar": 106.18,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1579.37) is R236.91, printed VAT is R130.73.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3091.01,
            "expected_amount": 3798.86,
            "overchargeZar": 472.4999999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3798.86 vs Total Due R3091.01. Unexplained gap of R472.50.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-E04",
    "filename": "T1-E04.pdf",
    "category": "error",
    "issues": [
      {
        "type": "FALSE_NEGATIVE",
        "expected_finding": {
          "error_type": "REFUSE_CHARGE_INFLATION",
          "line_item": "Refuse charge (1 x 240lBIN x 1 Removals)",
          "expected_amount": 149.13,
          "shown_amount": 171.13,
          "delta": 22,
          "vat_cascade": 3.3,
          "expected_recoverable": 25.3,
          "legal_basis": "Municipal Systems Act 32 of 2000, s 75A — refuse charges must align with published tariff schedule."
        },
        "actual_billdog_errors": [
          {
            "line_item": "Rates segment from 08/03/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2202.53,
            "overchargeZar": 23.38,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 04.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 219.21,
            "overchargeZar": 34.21,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R219.21, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 171.13",
            "service_type": "other",
            "amount_charged": 171.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 113.03,
            "expected_amount": 201.51,
            "overchargeZar": 88.47999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1343.37) is R201.51, printed VAT is R113.03.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2955.31,
            "expected_amount": 3545.1600000000003,
            "overchargeZar": 443.78000000000037,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3545.16 vs Total Due R2955.31. Unexplained gap of R443.78.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      },
      {
        "type": "FALSE_POSITIVE_ON_ERROR_BILL",
        "unexpected_errors": [
          {
            "line_item": "Rates segment from 08/03/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2202.53,
            "overchargeZar": 23.38,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 04.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 219.21,
            "overchargeZar": 34.21,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R219.21, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 171.13",
            "service_type": "other",
            "amount_charged": 171.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 113.03,
            "expected_amount": 201.51,
            "overchargeZar": 88.47999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1343.37) is R201.51, printed VAT is R113.03.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2955.31,
            "expected_amount": 3545.1600000000003,
            "overchargeZar": 443.78000000000037,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3545.16 vs Total Due R2955.31. Unexplained gap of R443.78.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-E05",
    "filename": "T1-E05.pdf",
    "category": "error",
    "issues": [
      {
        "type": "FALSE_NEGATIVE",
        "expected_finding": {
          "error_type": "WATER_TARIFF_OVERCHARGE",
          "line_item": "Water tier 1 step (6kl)",
          "shown_rate": 18.39,
          "expected_rate": 16.89,
          "delta_per_kl": 1.5,
          "total_inflation": 9,
          "vat_cascade": 1.35,
          "expected_recoverable": 10.35,
          "legal_basis": "Water Services Act 108 of 1997, s 10 — water tariffs must align with the gazetted tariff schedule."
        },
        "actual_billdog_errors": [
          {
            "line_item": "Rates segment from 07/04/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2202.53,
            "overchargeZar": 23.38,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 05.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 219.21,
            "overchargeZar": 34.21,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R219.21, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 111.08,
            "expected_amount": 196.26,
            "overchargeZar": 85.17999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1308.37) is R196.26, printed VAT is R111.08.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2940.36,
            "expected_amount": 3508.21,
            "overchargeZar": 425.0799999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3508.21 vs Total Due R2940.36. Unexplained gap of R425.08.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      },
      {
        "type": "FALSE_POSITIVE_ON_ERROR_BILL",
        "unexpected_errors": [
          {
            "line_item": "Rates segment from 07/04/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2202.53,
            "overchargeZar": 23.38,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 05.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 219.21,
            "overchargeZar": 34.21,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R219.21, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 111.08,
            "expected_amount": 196.26,
            "overchargeZar": 85.17999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1308.37) is R196.26, printed VAT is R111.08.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2940.36,
            "expected_amount": 3508.21,
            "overchargeZar": 425.0799999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3508.21 vs Total Due R2940.36. Unexplained gap of R425.08.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-E06",
    "filename": "T1-E06.pdf",
    "category": "error",
    "issues": [
      {
        "type": "FALSE_POSITIVE_ON_ERROR_BILL",
        "unexpected_errors": [
          {
            "line_item": "Rates segment from 08/05/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2202.53,
            "overchargeZar": 23.38,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 06.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 219.21,
            "overchargeZar": 34.21,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R219.21, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 108.83,
            "expected_amount": 194.01,
            "overchargeZar": 85.17999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1293.37) is R194.01, printed VAT is R108.83.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2923.11,
            "expected_amount": 3490.96,
            "overchargeZar": 425.0799999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3490.96 vs Total Due R2923.11. Unexplained gap of R425.08.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-E07",
    "filename": "T1-E07.pdf",
    "category": "error",
    "issues": [
      {
        "type": "FALSE_NEGATIVE",
        "expected_finding": {
          "error_type": "DUPLICATE_LINE_ITEM",
          "line_item": "Refuse charge appearing twice (once in REFUSE section, once in SUNDRIES)",
          "duplicated_amount": 149.13,
          "vat_cascade": 22.37,
          "expected_recoverable": 171.5,
          "legal_basis": "Municipal Finance Management Act 56 of 2003 — billing must reflect actual services provided exactly once."
        },
        "actual_billdog_errors": [
          {
            "line_item": "Rates segment from 07/06/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2202.53,
            "overchargeZar": 23.38,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 07.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 132.1,
            "expected_amount": 217.28,
            "overchargeZar": 85.18,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1448.50) is R217.28, printed VAT is R132.10.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3101.51,
            "expected_amount": 3669.36,
            "overchargeZar": 399.2599999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3669.36 vs Total Due R3101.51. Unexplained gap of R399.26.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      },
      {
        "type": "FALSE_POSITIVE_ON_ERROR_BILL",
        "unexpected_errors": [
          {
            "line_item": "Rates segment from 07/06/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2202.53,
            "overchargeZar": 23.38,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 07.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 132.1,
            "expected_amount": 217.28,
            "overchargeZar": 85.18,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1448.50) is R217.28, printed VAT is R132.10.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3101.51,
            "expected_amount": 3669.36,
            "overchargeZar": 399.2599999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3669.36 vs Total Due R3101.51. Unexplained gap of R399.26.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-E08",
    "filename": "T1-E08.pdf",
    "category": "error",
    "issues": [
      {
        "type": "FALSE_NEGATIVE",
        "expected_finding": {
          "error_type": "MISSING_REBATE",
          "line_item": "Property rates additional rebate credit",
          "missing_rebate_amount": 138.7,
          "vat_cascade": 0,
          "expected_recoverable": 138.7,
          "legal_basis": "Municipal Property Rates Act 6 of 2004, s 15 — eligible rebates must be applied."
        },
        "actual_billdog_errors": [
          {
            "line_item": "Rates segment from 08/07/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 100.77,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631)",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 08.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 109.73,
            "expected_amount": 194.91,
            "overchargeZar": 85.17999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1299.37) is R194.91, printed VAT is R109.73.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3068.71,
            "expected_amount": 3636.56,
            "overchargeZar": 321.8699999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3636.56 vs Total Due R3068.71. Unexplained gap of R321.87.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      },
      {
        "type": "FALSE_POSITIVE_ON_ERROR_BILL",
        "unexpected_errors": [
          {
            "line_item": "Rates segment from 08/07/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 100.77,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631)",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 08.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 109.73,
            "expected_amount": 194.91,
            "overchargeZar": 85.17999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1299.37) is R194.91, printed VAT is R109.73.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3068.71,
            "expected_amount": 3636.56,
            "overchargeZar": 321.8699999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3636.56 vs Total Due R3068.71. Unexplained gap of R321.87.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-E09",
    "filename": "T1-E09.pdf",
    "category": "error",
    "issues": [
      {
        "type": "FALSE_POSITIVE_ON_ERROR_BILL",
        "unexpected_errors": [
          {
            "line_item": "Rates segment from 08/08/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 94.49,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 09.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 109.73,
            "expected_amount": 194.91,
            "overchargeZar": 85.17999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1299.37) is R194.91, printed VAT is R109.73.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2930.01,
            "expected_amount": 3497.86,
            "overchargeZar": 328.1499999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3497.86 vs Total Due R2930.01. Unexplained gap of R328.15.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-E10",
    "filename": "T1-E10.pdf",
    "category": "error",
    "issues": [
      {
        "type": "FALSE_NEGATIVE",
        "expected_finding": {
          "error_type": "DECIMAL_TYPO_INFLATION",
          "line_item": "Electricity Home User Charge - 10.2024",
          "expected_amount": 185,
          "shown_amount": 1850,
          "delta": 1665,
          "vat_cascade": 249.75,
          "expected_recoverable": 1914.75,
          "note": "Decimal placement error — value is 10x what it should be. Should be flagged on magnitude alone.",
          "legal_basis": "Municipal Systems Act 32 of 2000, s 75A — service charges must reflect approved tariffs."
        },
        "actual_billdog_errors": [
          {
            "line_item": "Rates segment from 07/09/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 94.49,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 10.2024 (PREPAID 4907315610) 1850.00",
            "service_type": "electricity",
            "amount_charged": 1850,
            "expected_amount": 245.03,
            "overchargeZar": 1604.97,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R1850",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 359.48,
            "expected_amount": 694.41,
            "overchargeZar": 334.92999999999995,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R4629.37) is R694.41, printed VAT is R359.48.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 4844.76,
            "expected_amount": 7077.610000000001,
            "overchargeZar": 198.4600000000005,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R7077.61 vs Total Due R4844.76. Unexplained gap of R198.46.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      },
      {
        "type": "FALSE_POSITIVE_ON_ERROR_BILL",
        "unexpected_errors": [
          {
            "line_item": "Rates segment from 07/09/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 94.49,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 10.2024 (PREPAID 4907315610) 1850.00",
            "service_type": "electricity",
            "amount_charged": 1850,
            "expected_amount": 245.03,
            "overchargeZar": 1604.97,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R1850",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 359.48,
            "expected_amount": 694.41,
            "overchargeZar": 334.92999999999995,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R4629.37) is R694.41, printed VAT is R359.48.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 4844.76,
            "expected_amount": 7077.610000000001,
            "overchargeZar": 198.4600000000005,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R7077.61 vs Total Due R4844.76. Unexplained gap of R198.46.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-E11",
    "filename": "T1-E11.pdf",
    "category": "error",
    "issues": [
      {
        "type": "FALSE_NEGATIVE",
        "expected_finding": {
          "error_type": "CARRYOVER_BALANCE_ERROR",
          "line_item": "Account summary — previous balance not credited despite payment",
          "incorrect_previous_balance": 3000,
          "expected_payment_credit": 3000,
          "expected_recoverable": 3000,
          "vat_cascade": 0,
          "legal_basis": "Municipal Systems Act 32 of 2000, s 102 — payments must be credited correctly."
        },
        "actual_billdog_errors": [
          {
            "line_item": "Rates segment from 08/10/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 94.49,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 11.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 109.73,
            "expected_amount": 194.91,
            "overchargeZar": 85.17999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1299.37) is R194.91, printed VAT is R109.73.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2930.01,
            "expected_amount": 3497.86,
            "overchargeZar": 328.1499999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3497.86 vs Total Due R2930.01. Unexplained gap of R328.15.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      },
      {
        "type": "FALSE_POSITIVE_ON_ERROR_BILL",
        "unexpected_errors": [
          {
            "line_item": "Rates segment from 08/10/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 94.49,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 11.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 109.73,
            "expected_amount": 194.91,
            "overchargeZar": 85.17999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1299.37) is R194.91, printed VAT is R109.73.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2930.01,
            "expected_amount": 3497.86,
            "overchargeZar": 328.1499999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3497.86 vs Total Due R2930.01. Unexplained gap of R328.15.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-E12",
    "filename": "T1-E12.pdf",
    "category": "error",
    "issues": [
      {
        "type": "FALSE_NEGATIVE",
        "expected_finding": {
          "error_type": "VAT_ON_ZERO_RATED",
          "line_item": "Property rates (zero-rated under SARS ruling, but marked & VATable)",
          "incorrect_vat_amount": 313.31,
          "expected_recoverable": 313.31,
          "vat_cascade": 0,
          "legal_basis": "Value-Added Tax Act 89 of 1991, s 11 — property rates levied by a municipality are zero-rated supplies."
        },
        "actual_billdog_errors": [
          {
            "line_item": "- 12.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 423.04,
            "expected_amount": 194.91,
            "overchargeZar": 228.13000000000002,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1299.37) is R194.91, printed VAT is R423.04.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3243.32,
            "expected_amount": 3811.17,
            "overchargeZar": 279.6899999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3811.17 vs Total Due R3243.32. Unexplained gap of R279.69.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      },
      {
        "type": "FALSE_POSITIVE_ON_ERROR_BILL",
        "unexpected_errors": [
          {
            "line_item": "- 12.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 423.04,
            "expected_amount": 194.91,
            "overchargeZar": 228.13000000000002,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1299.37) is R194.91, printed VAT is R423.04.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3243.32,
            "expected_amount": 3811.17,
            "overchargeZar": 279.6899999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3811.17 vs Total Due R3243.32. Unexplained gap of R279.69.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-E13",
    "filename": "T1-E13.pdf",
    "category": "error",
    "issues": [
      {
        "type": "FALSE_NEGATIVE",
        "expected_finding": {
          "error_type": "UNJUSTIFIED_CONNECTION_FEE",
          "line_item": "Water service connection fee",
          "fee_charged": 450,
          "vat_cascade": 67.5,
          "expected_recoverable": 517.5,
          "note": "Connection fee charged on an already-connected, active account.",
          "legal_basis": "Water Services Act 108 of 1997 — connection fees apply only on new connections."
        },
        "actual_billdog_errors": [
          {
            "line_item": "Rates segment from 08/12/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 94.49,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 01.2025 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 177.23,
            "expected_amount": 262.41,
            "overchargeZar": 85.18000000000004,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1749.37) is R262.41, printed VAT is R177.23.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3447.51,
            "expected_amount": 4015.36,
            "overchargeZar": 328.14999999999986,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R4015.36 vs Total Due R3447.51. Unexplained gap of R328.15.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      },
      {
        "type": "FALSE_POSITIVE_ON_ERROR_BILL",
        "unexpected_errors": [
          {
            "line_item": "Rates segment from 08/12/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 94.49,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 01.2025 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 177.23,
            "expected_amount": 262.41,
            "overchargeZar": 85.18000000000004,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1749.37) is R262.41, printed VAT is R177.23.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3447.51,
            "expected_amount": 4015.36,
            "overchargeZar": 328.14999999999986,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R4015.36 vs Total Due R3447.51. Unexplained gap of R328.15.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-E14",
    "filename": "T1-E14.pdf",
    "category": "error",
    "issues": [
      {
        "type": "FALSE_NEGATIVE",
        "expected_finding": {
          "error_type": "EXTRA_REFUSE_BIN_CHARGE",
          "line_item": "Refuse charge (2 bins billed; should be 1)",
          "expected_amount": 149.13,
          "shown_amount": 298.26,
          "delta": 149.13,
          "vat_cascade": 22.37,
          "expected_recoverable": 171.5,
          "legal_basis": "Municipal Systems Act 32 of 2000 — service charges must reflect actual service provision."
        },
        "actual_billdog_errors": [
          {
            "line_item": "Rates segment from 08/01/2025: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 94.49,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 02.2025 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 2 X 240lBIN X 1 Removals ) 298.26",
            "service_type": "other",
            "amount_charged": 298.26,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 132.1,
            "expected_amount": 239.64,
            "overchargeZar": 107.53999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1597.63) is R239.64, printed VAT is R132.10.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3101.51,
            "expected_amount": 3818.4900000000002,
            "overchargeZar": 454.9200000000001,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3818.49 vs Total Due R3101.51. Unexplained gap of R454.92.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      },
      {
        "type": "FALSE_POSITIVE_ON_ERROR_BILL",
        "unexpected_errors": [
          {
            "line_item": "Rates segment from 08/01/2025: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 94.49,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 02.2025 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 2 X 240lBIN X 1 Removals ) 298.26",
            "service_type": "other",
            "amount_charged": 298.26,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 132.1,
            "expected_amount": 239.64,
            "overchargeZar": 107.53999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1597.63) is R239.64, printed VAT is R132.10.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3101.51,
            "expected_amount": 3818.4900000000002,
            "overchargeZar": 454.9200000000001,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3818.49 vs Total Due R3101.51. Unexplained gap of R454.92.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-E15",
    "filename": "T1-E15.pdf",
    "category": "error",
    "issues": [
      {
        "type": "FALSE_POSITIVE_ON_ERROR_BILL",
        "unexpected_errors": [
          {
            "line_item": "Rates segment from 05/02/2025: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 94.49,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 03.2025 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3027.76,
            "expected_amount": 3595.61,
            "overchargeZar": 328.1499999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3595.61 vs Total Due R3027.76. Unexplained gap of R328.15.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-E16",
    "filename": "T1-E16.pdf",
    "category": "error",
    "issues": [
      {
        "type": "FALSE_POSITIVE_ON_ERROR_BILL",
        "unexpected_errors": [
          {
            "line_item": "Rates segment from 16/06/2024: R4577000 @ 0.006144",
            "service_type": "rates",
            "amount_charged": 1155.66,
            "expected_amount": 1179.93,
            "overchargeZar": 22.75,
            "issue": "Rate applied (0.006144) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "Rates segment from 01/07/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 1193.28,
            "expected_amount": 1247.26,
            "overchargeZar": 50.62,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 07.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 109.73,
            "expected_amount": 194.91,
            "overchargeZar": 85.17999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1299.37) is R194.91, printed VAT is R109.73.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3043.93,
            "expected_amount": 3611.7799999999997,
            "overchargeZar": 349.2699999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3611.78 vs Total Due R3043.93. Unexplained gap of R349.27.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C01",
    "filename": "T1-C01.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 18/12/2023: R3185000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 1550.02,
            "expected_amount": 1532.67,
            "overchargeZar": 15.79,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 01.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 219.21,
            "overchargeZar": 34.21,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R219.21, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 121.52,
            "expected_amount": 206.69,
            "overchargeZar": 85.17,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1377.96) is R206.69, printed VAT is R121.52.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2342.95,
            "expected_amount": 2910.8,
            "overchargeZar": 432.68000000000035,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R2910.80 vs Total Due R2342.95. Unexplained gap of R432.68.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C02",
    "filename": "T1-C02.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 18/01/2024: R4785000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2328.68,
            "expected_amount": 2302.62,
            "overchargeZar": 24.51,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 02.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 219.21,
            "overchargeZar": 34.21,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R219.21, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 148.72,
            "expected_amount": 233.89,
            "overchargeZar": 85.16999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1559.29) is R233.89, printed VAT is R148.72.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3330.14,
            "expected_amount": 3897.99,
            "overchargeZar": 423.9599999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3897.99 vs Total Due R3330.14. Unexplained gap of R423.96.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C03",
    "filename": "T1-C03.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 16/02/2024: R5485000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2669.35,
            "expected_amount": 2639.47,
            "overchargeZar": 28.32,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 03.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 219.21,
            "overchargeZar": 34.21,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R219.21, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 101.54,
            "expected_amount": 186.72,
            "overchargeZar": 85.17999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1244.81) is R186.72, printed VAT is R101.54.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3309.15,
            "expected_amount": 3877,
            "overchargeZar": 420.13999999999993,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3877.00 vs Total Due R3309.15. Unexplained gap of R420.14.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C04",
    "filename": "T1-C04.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 18/03/2024: R7185000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 3496.67,
            "expected_amount": 3457.54,
            "overchargeZar": 37.58,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 04.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 219.21,
            "overchargeZar": 34.21,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R219.21, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 109.73,
            "expected_amount": 194.91,
            "overchargeZar": 85.17999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1299.37) is R194.91, printed VAT is R109.73.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 4199.22,
            "expected_amount": 4767.07,
            "overchargeZar": 410.8799999999995,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R4767.07 vs Total Due R4199.22. Unexplained gap of R410.88.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C05",
    "filename": "T1-C05.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 17/04/2024: R9785000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 4762,
            "expected_amount": 4708.7,
            "overchargeZar": 51.74,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 05.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 219.21,
            "overchargeZar": 34.21,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R219.21, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 133.31,
            "expected_amount": 218.48,
            "overchargeZar": 85.16999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1456.56) is R218.48, printed VAT is R133.31.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 5645.32,
            "expected_amount": 6213.170000000001,
            "overchargeZar": 396.73000000000127,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R6213.17 vs Total Due R5645.32. Unexplained gap of R396.73.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C06",
    "filename": "T1-C06.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 18/05/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2202.53,
            "overchargeZar": 23.38,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 06.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 219.21,
            "overchargeZar": 34.21,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R219.21, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 97.45,
            "expected_amount": 182.63,
            "overchargeZar": 85.17999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1217.53) is R182.63, printed VAT is R97.45.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2835.89,
            "expected_amount": 3403.74,
            "overchargeZar": 425.0799999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3403.74 vs Total Due R2835.89. Unexplained gap of R425.08.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C07",
    "filename": "T1-C07.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 17/06/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2202.53,
            "overchargeZar": 23.38,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006273). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 07.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 173.64,
            "expected_amount": 258.81,
            "overchargeZar": 85.17000000000002,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1725.42) is R258.81, printed VAT is R173.64.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3419.97,
            "expected_amount": 3987.82,
            "overchargeZar": 399.2700000000003,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3987.82 vs Total Due R3419.97. Unexplained gap of R399.27.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C08",
    "filename": "T1-C08.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 18/07/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 94.49,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 08.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 198.56,
            "expected_amount": 283.73,
            "overchargeZar": 85.17000000000002,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1891.55) is R283.73, printed VAT is R198.56.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3611.02,
            "expected_amount": 4178.870000000001,
            "overchargeZar": 328.1600000000008,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R4178.87 vs Total Due R3611.02. Unexplained gap of R328.16.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C09",
    "filename": "T1-C09.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 18/08/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 94.49,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 09.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 256.7,
            "expected_amount": 341.88,
            "overchargeZar": 85.18,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R2279.20) is R341.88, printed VAT is R256.70.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 4056.81,
            "expected_amount": 4624.66,
            "overchargeZar": 328.1499999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R4624.66 vs Total Due R4056.81. Unexplained gap of R328.15.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C10",
    "filename": "T1-C10.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 17/09/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 94.49,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 10.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 87.22,
            "expected_amount": 172.4,
            "overchargeZar": 85.18,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1149.34) is R172.40, printed VAT is R87.22.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2757.47,
            "expected_amount": 3325.32,
            "overchargeZar": 328.1500000000004,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3325.32 vs Total Due R2757.47. Unexplained gap of R328.15.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C11",
    "filename": "T1-C11.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 18/10/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 94.49,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 11.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 109.73,
            "expected_amount": 194.91,
            "overchargeZar": 85.17999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1299.37) is R194.91, printed VAT is R109.73.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2930.01,
            "expected_amount": 3497.86,
            "overchargeZar": 328.1499999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3497.86 vs Total Due R2930.01. Unexplained gap of R328.15.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C12",
    "filename": "T1-C12.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 17/11/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 94.49,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 12.2024 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 121.52,
            "expected_amount": 206.69,
            "overchargeZar": 85.17,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1377.96) is R206.69, printed VAT is R121.52.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3020.39,
            "expected_amount": 3588.2400000000002,
            "overchargeZar": 328.16000000000037,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3588.24 vs Total Due R3020.39. Unexplained gap of R328.16.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C13",
    "filename": "T1-C13.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 18/12/2024: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 94.49,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 01.2025 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 109.73,
            "expected_amount": 194.91,
            "overchargeZar": 85.17999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1299.37) is R194.91, printed VAT is R109.73.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2930.01,
            "expected_amount": 3497.86,
            "overchargeZar": 328.1499999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3497.86 vs Total Due R2930.01. Unexplained gap of R328.15.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C14",
    "filename": "T1-C14.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 18/01/2025: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 94.49,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 02.2025 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 115.62,
            "expected_amount": 200.8,
            "overchargeZar": 85.18,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1338.67) is R200.80, printed VAT is R115.62.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2975.2,
            "expected_amount": 3543.0499999999997,
            "overchargeZar": 328.1499999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3543.05 vs Total Due R2975.20. Unexplained gap of R328.15.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C15",
    "filename": "T1-C15.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 15/02/2025: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2328.23,
            "overchargeZar": 94.49,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 03.2025 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 127.41,
            "expected_amount": 212.59,
            "overchargeZar": 85.18,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1417.26) is R212.59, printed VAT is R127.41.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 3065.58,
            "expected_amount": 3633.43,
            "overchargeZar": 328.1499999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3633.43 vs Total Due R3065.58. Unexplained gap of R328.15.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C16",
    "filename": "T1-C16.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 18/03/2025: R1835000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 893.03,
            "expected_amount": 933.43,
            "overchargeZar": 34.12,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 04.2025 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 105.64,
            "expected_amount": 190.81,
            "overchargeZar": 85.17,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1272.09) is R190.81, printed VAT is R105.64.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 1564.21,
            "expected_amount": 2132.06,
            "overchargeZar": 388.5299999999999,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R2132.06 vs Total Due R1564.21. Unexplained gap of R388.53.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C17",
    "filename": "T1-C17.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 17/04/2025: R2385000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 1160.69,
            "expected_amount": 1213.2,
            "overchargeZar": 46.24,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 05.2025 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 101.54,
            "expected_amount": 186.72,
            "overchargeZar": 85.17999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1244.81) is R186.72, printed VAT is R101.54.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 1800.49,
            "expected_amount": 2368.3399999999997,
            "overchargeZar": 376.3999999999997,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R2368.34 vs Total Due R1800.49. Unexplained gap of R376.40.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C18",
    "filename": "T1-C18.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 18/05/2025: R11985000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 5832.66,
            "expected_amount": 6096.52,
            "overchargeZar": 257.59,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 06.2025 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 245.03,
            "overchargeZar": 60.03,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R245.03, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 121.52,
            "expected_amount": 206.69,
            "overchargeZar": 85.17,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1377.96) is R206.69, printed VAT is R121.52.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 6625.59,
            "expected_amount": 7193.440000000001,
            "overchargeZar": 165.06000000000125,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R7193.44 vs Total Due R6625.59. Unexplained gap of R165.06.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C19",
    "filename": "T1-C19.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 17/06/2025: R14985000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 7292.65,
            "expected_amount": 7622.56,
            "overchargeZar": 323.64,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.006631). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 07.2025 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 339.89,
            "overchargeZar": 154.89,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R339.89, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 140.41,
            "expected_amount": 225.59,
            "overchargeZar": 85.18,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1503.91) is R225.59, printed VAT is R140.41.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 8230.42,
            "expected_amount": 8798.269999999999,
            "overchargeZar": 4.139999999998508,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R8798.27 vs Total Due R8230.42. Unexplained gap of R4.14.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  },
  {
    "bill_id": "T1-C20",
    "filename": "T1-C20.pdf",
    "category": "clean",
    "issues": [
      {
        "type": "FALSE_POSITIVE",
        "expected": "0 errors",
        "actual": "6 errors",
        "details": [
          {
            "line_item": "Rates segment from 18/07/2025: R4577000 @ 0.006344",
            "service_type": "rates",
            "amount_charged": 2227.46,
            "expected_amount": 2513.61,
            "overchargeZar": 268.34,
            "issue": "Rate applied (0.006344) doesn't match known municipality rate for this period (0.007159). Net impact across main and rebate segments.",
            "legal_basis": "Municipal Property Rates Act 6 of 2004, s 11 — tariffs must conform to the municipality's rates policy as gazetted.",
            "recoverable": true
          },
          {
            "line_item": "- 08.2025 (PREPAID 4907315610) 185.00",
            "service_type": "electricity",
            "amount_charged": 185,
            "expected_amount": 339.89,
            "overchargeZar": 154.89,
            "issue": "Discrepancy in Electricity HU Charge. Expected approx R339.89, billed R185",
            "legal_basis": "Municipal Systems Act 32 of 2000 — tariffs must match the published tariff schedule.",
            "recoverable": true
          },
          {
            "line_item": "Fixed Basic Charge ( 20mm - KSU391 ) R 116.86 x 2 233.72",
            "service_type": "other",
            "amount_charged": 233.72,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Water Fixed Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Refuse charge ( 1 X 240lBIN X 1 Removals ) 149.13",
            "service_type": "other",
            "amount_charged": 149.13,
            "expected_amount": 0,
            "overchargeZar": 0,
            "issue": "Refuse Charge has no parsed period end — cannot resolve tariff year. Parser must populate periodEnd.",
            "legal_basis": "Municipal Systems Act 32 of 2000 — billing must be accurate and transparent.",
            "recoverable": false
          },
          {
            "line_item": "Add 15% VAT",
            "service_type": "other",
            "amount_charged": 109.73,
            "expected_amount": 194.91,
            "overchargeZar": 85.17999999999999,
            "issue": "VAT calculation mismatch. 15% of VAT-able charges (R1299.37) is R194.91, printed VAT is R109.73.",
            "legal_basis": "Value-Added Tax Act 89 of 1991, s 7(1)(a) — VAT must be calculated at the prescribed 15% rate on VAT-able supplies.",
            "recoverable": true
          },
          {
            "line_item": "Total due",
            "service_type": "other",
            "amount_charged": 2930.01,
            "expected_amount": 3497.86,
            "overchargeZar": 59.43999999999994,
            "issue": "Full-sum mathematical check failed. classifiedSum + otherCharges + VAT is R3497.86 vs Total Due R2930.01. Unexplained gap of R59.44.",
            "legal_basis": "Municipal Finance Management Act 56 of 2003 — line items must arithmetically reconcile to the total due.",
            "recoverable": true
          }
        ]
      }
    ]
  }
]
`