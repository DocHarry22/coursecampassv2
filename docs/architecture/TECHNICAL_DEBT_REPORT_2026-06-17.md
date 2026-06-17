# CourseCampass V2 Technical Debt Report

Date: 2026-06-17

## High Priority

1. **Runtime middleware duplication**
   - Debt: Double body parsing in server bootstrap.
   - Risk: Extra parsing overhead and avoidable dependency footprint.
   - Status: Fixed in this change by removing direct `body-parser` usage.

2. **Operational health signaling gap**
   - Debt: Lack of dedicated liveness/readiness API endpoints in baseline.
   - Risk: Harder safe rollout/rollback under orchestrators and load balancers.
   - Status: Fixed in this change with `/healthz` and `/readyz`.

## Medium Priority

3. **Type safety gap**
   - Debt: JavaScript-only codebase with growing domain complexity.
   - Risk: Runtime defects and weaker refactor confidence.
   - Recommendation: Phase in TypeScript for API contracts, auth/session, and role-governance modules first.

4. **Data-access scaling strategy undefined**
   - Debt: No formal cache/read-replica strategy in docs or architecture contracts.
   - Risk: Latency and DB pressure increase under read-heavy growth.
   - Recommendation: Introduce endpoint-level cache policies and benchmarked query budgets.

5. **Background processing architecture missing**
   - Debt: All operations remain request/response bound.
   - Risk: Long-running tasks compete with interactive API latency budgets.
   - Recommendation: Add queue-backed workers for exports, bulk operations, and non-critical post-processing.

## Low Priority

6. **Contract governance spread across multiple docs**
   - Debt: Critical contracts exist but are fragmented.
   - Risk: Onboarding and change-control overhead.
   - Recommendation: Add a single architecture index with ownership and revision policy.
