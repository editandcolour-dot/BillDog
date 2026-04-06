## Goal
Automate the SEO optimization pipeline via periodic scans, generating deterministic reports and metadata recommendations to prevent manual configuration drift.

## Execution Rules
1. Run `python execution/seo_optimizer.py` before any major content push or on a monthly cadence.
2. Review the output in `.tmp/seo_report.md`.
3. If recommendations alter core marketing focus, escalate to user for approval.
4. Execute required changes systematically in `app/layout.tsx`, page-specific `generateMetadata`, and canonical JSON-LD structures.
