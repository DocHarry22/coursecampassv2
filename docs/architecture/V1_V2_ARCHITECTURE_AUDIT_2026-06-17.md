# CourseCampass V1 vs V2 Architecture Audit

Date: 2026-06-17
Baseline used for V1: commit `0b94c7e` (Initial project import)
Current V2 baseline: commit `6fad7b8`

## Executive Summary

V2 is a major architectural expansion of V1. It introduces authenticated, role-aware workflows, modular API domains, observability, governance endpoints, and contract tests. V1 was a single-role dashboard shell with four API route groups and minimal runtime controls.

## Architecture Comparison

### V1
- Monolithic frontend route surface (`/dashboard`) without auth/session orchestration.
- Backend API limited to `/client`, `/general`, `/management`, `/sales`.
- Minimal middleware stack and broad CORS defaults.
- No formal contract/regression test suite.

### V2
- Route-guarded frontend with role/capability-aware navigation and lazy-loaded scenes.
- Expanded API domain model: auth, account, admin, courses, schools, financial aid, calendar, todos.
- Runtime hardening: request context, structured error handling, rate limits, observability, governance controls.
- Contract evidence and regression test coverage in server/client test suites.

## Feature Delta (V1 -> V2)

### Added in V2
- Authentication + refresh-token session flows.
- RBAC with user/admin/superadmin roles.
- Specialized product modules: search, courses, schools, aid, calendar, todo, governance, observability.
- Production deployment scripts/documentation for Hostinger.
- Governance APIs and account-status normalization for legacy records.

### Retained from V1
- Core dashboard and analytics domain endpoints (`general`, `management`, `sales`, `client`).
- Express + React + MongoDB stack.

## Regressions Identified

1. **No dedicated readiness/liveness endpoints** in V2 baseline (before this change), reducing operability in autoscaled/containerized environments.
2. **Duplicate JSON body parsing middleware** (`express.json` + `body-parser`) added avoidable request overhead and dependency duplication.

## Missing Functionality (relative to enterprise-ready V2 target)

1. **No formal TypeScript adoption path** despite increased frontend/backend complexity.
2. **No centralized async job/work queue layer** for heavier future operations (reporting, bulk updates, exports).
3. **No cache strategy (API/data-layer) definition** for repeated read-heavy endpoints.
4. **No explicit SLO/SLA + alert threshold spec** tied to observability metrics.

## Scalability Snapshot

Strengths:
- Route modularity and middleware separation.
- Role-driven API contracts and fallback controls.
- Existing observability middleware foundation.

Constraints:
- Synchronous request handling for all API workflows.
- No horizontal cache strategy documented.
- Limited health/readiness probes in baseline.
