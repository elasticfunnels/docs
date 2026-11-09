# Tasks

## Waiting on the owner
- [ ] Local main in ~/Work/elasticfunnels-docs is 179 commits behind origin with 6 unpushed commits from other sessions (package selector, custom 404, ef pages settings, template engine runtime fixes 'publish after that deploy', orders/cart/checkout, products/variants). Decide: push, drop or re-apply; then pull. (2026-10-22 · session 0f20e3d0)

## To do
- [ ] Docs audit v2 on fresh snapshots of GitHub main (docs, app, website engine, CLI under ~/scratchpad/elasticfunnels-docs/fresh/), report ~/scratchpad/elasticfunnels-docs/docs-audit-v2/AUDIT.md; then fix plan v2. The first audit used stale checkouts. (2026-10-22 · session 0f20e3d0)
- [ ] Fix batch 1: branch docs/fix-batch-01 (23d2e45) was written against a stale checkout (local main 179 behind origin) and NOT pushed; redo it from the v2 plan on origin/main, then close that branch. (2026-10-22 · session 0f20e3d0)
- [ ] Grok fix plan from the audit (report only, then Claude executes batch by batch): ~/scratchpad/elasticfunnels-docs/docs-audit/FIX-PLAN.md (2026-10-22 · session 0f20e3d0)
- [ ] Fix docs from the audit: 79 WRONG, 40 OUTDATED, 14 orphan pages, 12 duplicate pairs, 38 missing + 20 partial features (report: ~/scratchpad/elasticfunnels-docs/docs-audit/AUDIT.md; many map to F-xx / G-xxx in elasticfunnels/.ef-docs/plans/docs-guide-plan/). Also: F-08 fix is stale (Authorize.Net one-click yes, PayPal no). (2026-10-22 · session 0f20e3d0)

## Done

### 2026-10-22
- [x] Docs audit vs FEATURES_MASTER, app code, website engine and ef CLI (Cursor grok-4.7-high, report only): 212/212 pages + missing-docs pass. Verified: 5 findings spot-checked in code, all held; repos untouched by the agent. (session 0f20e3d0)
