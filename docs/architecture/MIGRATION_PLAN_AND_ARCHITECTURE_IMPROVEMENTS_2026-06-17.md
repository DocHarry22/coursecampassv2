# CourseCampass Migration Plan and Architecture Improvements

Date: 2026-06-17

## Migration Plan (V1 -> V2 hardening)

1. **Stabilize runtime primitives**
   - Keep a single parsing path and standard health/readiness probes.
   - Enforce deployment health checks against `/healthz` and `/readyz`.

2. **Harden contract governance**
   - Version API/data contracts per module.
   - Gate breaking changes behind compatibility checks and migration notes.

3. **Type-safety migration**
   - Start with shared domain contracts (auth/session/roles).
   - Expand to client API adapters and server controllers.
   - Add CI type-check stage once coverage reaches critical path modules.

4. **Scalability migration**
   - Define read-path caching policy for dashboard and lookup endpoints.
   - Introduce queue-backed processing for heavy, non-interactive workloads.
   - Add performance budgets (p95 latency, error-rate) and rollout gates.

## Architecture Improvements

1. **Operational Reliability**
   - Standardize liveness/readiness checks.
   - Add deployment playbook references to runtime guide.

2. **Data & Throughput**
   - Separate interactive read APIs from batch/compute workloads.
   - Add cache invalidation contracts per module.

3. **Security & Governance**
   - Preserve role/capability checks as mandatory middleware boundaries.
   - Extend governance audit coverage to all privileged writes.

4. **Developer Productivity**
   - Consolidate architecture contracts in one index.
   - Add typed shared DTO layer to reduce integration drift.

## Immediate Actions Completed in This Change

- Removed duplicate body parsing middleware in API bootstrap.
- Added `/healthz` and `/readyz` endpoints for deployment/runtime health integration.
