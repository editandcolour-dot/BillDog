# v5 Reconciliation Rules & Rule Engine Specification

## 1. Rule Engine Discipline (generic.ts)

The engine in `generic.ts` is strictly a deterministic runner. It possesses **no** municipality-specific logic. It only executes a fixed vocabulary of operations defined in the JSON configuration schema:

1. **Anchor slice**: Extract a substring between a `start` regex and one of several `end` regexes.
2. **Regex extract**: Execute a regular expression with named capture groups against a string to extract fields.
3. **Lookup table reference**: Map an extracted token (e.g. `&`) to a boolean or typed value.
4. **Conditional flag**: Apply a specific parsing rule or aggregation only when a property matches a condition.
5. **Arithmetic check**: Sum an array of extracted values and compare it to a control value with an optional tolerance.
6. **Pair by field**: Group extracted items logically based on a shared property (e.g., pairing a rebate to its parent rate by `fromDate`).

If a municipality requires logic outside this vocabulary, the generic engine does not get hacked—the schema is extended with a new operation type, keeping `generic.ts` pristine.

---

## 2. Resolving P1: Fiscal-Boundary Parser

**Issue**: The old parser only captured the first rates and rebate segment. Rates and rebates must be correlated by fiscal period, not just collected as a flat list.

**JSON Schema Solution**:
```json
{
  "line_item_rules": [
    {
      "section": "PROPERTY RATES",
      "type": "regex_extract",
      "multiple": true,
      "pattern": "#\\s+From\\s+(?<fromDate>\\d{2}/\\d{2}/\\d{4})\\s*:\\s*R\\s+(?<rateableValue>[\\d,]+\\.?\\d*)\\s*@\\s*(?<annualRate>[\\d.]+)\\s*÷\\s*(?<daysInYear>\\d+)\\s*x\\s*(?<billingDays>\\d+)\\s+(?<billedAmount>[\\d,]+\\.?\\d*)(?<isRebate>-?)",
      "pairing_logic": {
        "operation": "pair_by_field",
        "match_field": "fromDate",
        "primary_flag": "isRebate",
        "primary_value": false,
        "secondary_value": true,
        "on_unmatched_secondary": "surface_anomaly",
        "on_unmatched_primary": "allow"
      }
    }
  ]
}
```

**Engine Execution**:
- The engine extracts all matching segments as a flat list, then runs the `pair_by_field` operation, correlating rates (primary) and rebates (secondary) by `fromDate`.
- **Concrete Worked Examples**:
  - **1 rates + 0 rebates**: Matched as 1 valid rates segment. The `on_unmatched_primary: "allow"` rule means a rate without a rebate is perfectly valid.
  - **1 rates + 1 rebate**: Paired successfully by `fromDate`.
  - **2 rates + 1 rebate**: Both rates segments are valid. The rebate pairs with the rates segment that shares its `fromDate`. The other rates segment remains standalone (allowed).
  - **2 rates + 2 rebates**: Paired cleanly into two correlated groups by their respective `fromDate`s.
  - **1 rates + 2 rebates**: 1 rebate pairs cleanly. 1 rebate is orphaned (no matching `fromDate`). The engine fires `on_unmatched_secondary: "surface_anomaly"`, flagging the orphaned rebate as an error since a rebate cannot exist without a parent rate.

---

## 3. Resolving P2: VAT Cascade

**Issue**: `validateBill` was missing the cascade for line-item flags (P2 bug). We will implement **Option A**: the parser engine itself applies the VAT cascade when computing the recoverable amount for anomalies it detects.

**JSON Schema Solution**:
```json
{
  "vat_rules": {
    "rate_lookup": [
      { "effective_from": "2018-04-01", "rate": 0.15 }
    ],
    "indicator_map": { "&": true, "#": false, "": false },
    "indicator_pattern": "^(?<vatIndicator>[&#])?",
    "cascade_on_error": true
  }
}
```

**Engine Execution**:
- Every generic charge is parsed to capture its `vatIndicator`. The engine maps this to a boolean `hasVat`.
- When the generic parser engine detects a line-item anomaly (e.g., an orphaned rebate or a tier-line arithmetic anomaly), it calculates the recoverable amount.
- Because `cascade_on_error: true` is set, the parser automatically looks up the applicable VAT rate based on the bill's `billingDate` (e.g., `0.15`) and multiplies the anomaly's base delta by `1.15` to produce the fully-cascaded recoverable amount.
- The downstream consumer receives a fully-cascaded recoverable value from the parser's anomaly output and does not need to duplicate VAT math.

---

## 4. Resolving P4: Tier-Line Arithmetic Check

**Issue**: The parser needs to validate that tier lines sum to the printed subtotal, distinguishing between unrecoverable parse failures and actual arithmetic anomalies.

**JSON Schema Solution**:
```json
{
  "reconciliation_rules": [
    {
      "type": "arithmetic_check",
      "target_array": "waterTierCharges",
      "sum_field": "amount",
      "control_field": "subtotals.water",
      "tolerance": 0.05,
      "on_fail_actions": ["surface_anomaly", "suppress_subtotal_check"]
    }
  ]
}
```

**Engine Execution**:
- The engine sums the `amount` of all `waterTierCharges` and compares it to `subtotals.water`.
- If the mismatch exceeds `0.05`, it is a real arithmetic error on the printed bill, not a parse failure.
- The `surface_anomaly` action explicitly creates a finding (e.g. `TIER_LINE_INFLATION`) carrying the cascaded recoverable amount, meaning the bill continues to be processed and analysed.
- The `suppress_subtotal_check` action engages anti-double-count logic, preventing downstream full-sum or subtotal-level checks from firing redundantly for this same gap.
- Note: A true `abort_section` (parse failure) only occurs if the required anchor markers are missing or the regexes completely fail to execute, which results in returning `null` or a failed status, aborting the section's processing.

---

## 5. Series-Level Rules (Scope Disclaimer)

**Explicit Disclaimer**: The generic parser is strictly stateless per bill. It only evaluates and reconciles the single PDF text it is handed. 
- The parser **does not** retain state across bills. 
- All series-level checks (e.g., carryover compounding, duplicate charges across months, multi-month trend anomalies) are strictly the domain of `analyseCrossBill` (existing downstream code). 
- The parser config schema is explicitly constrained to single-document parsing rules.
