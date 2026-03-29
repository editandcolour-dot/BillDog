# Phase 3: Security Hardening

**Priority**: 🔴 CRITICAL
**Status**: PLANNED
**Prerequisites**: Phase 1 (Prescription Validation) ✅, Phase 2 (Error Pages)

## Dependency Upgrades

- [ ] Upgrade Next.js 14 → 16 on a git branch
  - Branch name: `upgrade-nextjs-16`
  - Command: `npm install next@latest eslint-config-next@latest`
- [ ] Test build: `npm run build`
- [ ] Test all user flows manually
- [ ] Verify Vitest still passes: `npm test`
- [ ] Merge if stable, defer if breaking changes detected

**Rationale**: Addresses 4 high-severity npm audit vulnerabilities (GHSA-9g9p-9gw9-jx7f, GHSA-h25m-26qc-wcjf, GHSA-ggv3-7p47-pfv8, GHSA-3x4c-7xq6-9pq8). Current risk level: LOW (no risky configurations in next.config.mjs).

## Configuration Review

- [ ] Verify `next.config.mjs` has no `remotePatterns` (✅ confirmed 2026-03-28)
- [ ] Verify no `rewrites()` configured (✅ confirmed 2026-03-28)
- [ ] Check Railway storage type (ephemeral vs persistent) for disk cache vulnerability mitigation
- [ ] Review API routes for insecure RSC deserialization patterns (when built)

## Additional Security Hardening (from original Phase 3 spec)

- [ ] Rate limiting implementation
- [ ] Upload validation (file size, type, malicious content)
- [ ] PayFast IP whitelist for webhook security
