# RBAC Runtime Verification Evidence (2026-04-06)

Status: Completed
Scope: Step 11 full verification in normal and fallback modes, including enforced permissions, governance endpoint behavior, and frontend role-safe integration checks.
Owner: CourseCampass platform team

## Verification Commands

Backend automated checks:

```powershell
Set-Location "server"
npm test
```

Frontend smoke checks:

```powershell
Set-Location "clients"
npm test
```

Live RBAC/governance probe script:

```powershell
Set-Location "server"
$env:BASE_URL="http://127.0.0.1:9010"
npm run test:rbac-live
```

Probe source:

- server/tests/rbac-live-check.mjs

## Mode Matrix

| Mode | Startup command | Health dbStatus | Result |
| --- | --- | --- | --- |
| Normal | `PORT=9010 node index.js` | connected | Pass |
| Fallback (forced) | `PORT=9011 MONGO_URL=mongodb+srv://invalid:invalid@invalid.invalid/test node index.js` | disconnected | Pass |

## Automated Suite Results

- Backend: 9 tests passed, 0 failed.
  - Includes route policy wiring checks for:
    - superadmin-only governance routes under /admin
    - admin-only catalog write permissions
    - superadmin-only catalog delete permissions
    - superadmin-only /general/metrics access
- Frontend: 10 smoke tests passed, 0 failed.
  - Includes checks for:
    - role-aware dashboard routing
    - role-safe dashboard contract endpoint usage
    - user-facing scenes avoiding admin-only endpoints

## Live Permission Enforcement Evidence

The live probe was executed in both modes and produced the same authorization outcomes.

| Endpoint / behavior | user | admin | superadmin |
| --- | --- | --- | --- |
| GET /courses | 200 | 200 | 200 |
| POST /courses | 403 | 201 | 201/allowed |
| DELETE /courses/:id | 403 | 403 | 200 |
| GET /client/products | 403 | 200 | 200 |
| GET /admin/users | 403 | 403 | 200 |
| GET /general/metrics (no token) | 401 | 401 | 401 |
| GET /general/metrics (role token) | 403 | 403 | 200 |

Notes:

- The probe confirms deny-by-default behavior for insufficient roles.
- Superadmin governance access and override/delete permissions are actively enforced at runtime.

## Governance Endpoint Behavior Evidence

Observed from live probes and automated governance tests:

- /admin route group requires authenticateAccessToken plus superadmin role checks.
- User/admin access to governance APIs returns 403 AUTH_FORBIDDEN.
- Superadmin access to governance APIs returns 200 with expected payloads.
- /general/metrics is protected and superadmin-only.
- Governance helper safeguards are validated in automated tests:
  - canonical role/account status validation
  - suspended/disabled account blocking
  - final-superadmin protection rules

## Dashboard Governance Contract Behavior

Verified through live probes in connected and fallback modes:

- user token:
  - sections.learner present
  - sections.operations null
  - sections.governance null
- admin token:
  - sections.learner present
  - sections.operations present
  - sections.governance null
- superadmin token:
  - sections.learner present
  - sections.operations present
  - sections.governance present

## Evidence Conclusion

Step 11 verification is complete.

- Enforced permissions match the RBAC contract in both runtime modes.
- Governance endpoints behave as superadmin-only surfaces at runtime.
- Fallback mode preserves authorization boundaries and contract shape while serving without DB connectivity.

## Phase 5 Rollout Verification Update

Status: Completed
Date: 2026-04-06

### Command Results

Executed in this rollout gate:

```powershell
Set-Location "clients"
npm test
```

Result:

- Frontend smoke suite: 14 passed, 0 failed.
- Includes role-flow normalization, role-home routing, capability guard redirects, interaction wiring, and responsive/feedback checks.

```powershell
Set-Location "clients"
npm run build
```

Result:

- Frontend production bundle built successfully (Vite build completed without errors).

```powershell
Set-Location "server"
npm test
```

Result:

- Backend contract/governance suite: 9 passed, 0 failed.

```powershell
Set-Location "server"
$env:PORT="9010"
node index.js

# separate terminal
Set-Location "server"
$env:BASE_URL="http://127.0.0.1:9010"
npm run test:rbac-live
```

Result summary:

- unauthenticated `/general/metrics`: 401
- user: learner read allowed, admin/superadmin surfaces blocked (403)
- admin: operations read/write allowed where contracted, governance blocked (403)
- superadmin: governance/metrics/override-delete surfaces allowed (200)

### Responsive + A11y Matrix (User/Admin/Superadmin)

Method:

- Manual role-policy walkthrough against route wiring, guard/capability flow, and layout/nav behavior.
- Verified against smoke assertions and current scene implementation for learner, admin, and superadmin critical routes.

Viewport checkpoints:

- Mobile: <= md (`xs` behavior)
- Desktop: >= md

| Role | Route surface check | Responsive behavior check | A11y check | Result |
| --- | --- | --- | --- | --- |
| user | `/dashboard` allowed; admin/superadmin dashboards redirected to role home by guard policy | Sidebar remains compact; section/item labels collapse on `xs`; content padding scales via responsive `px` | Skip link present; icon-only controls have labels; status/empty feedback components present on learner routes | Pass |
| admin | `/admin/dashboard`, `/admin/operations`, `/search`, `/courses`, `/schools` allowed; governance/observability denied and redirected | Desktop search input visible at `md+`, hidden on `xs`; role sections appear by capability flags | Navbar and workflow controls expose descriptive `aria-label` values; destructive actions are named | Pass |
| superadmin | `/superadmin/dashboard`, `/superadmin/governance`, `/superadmin/observability` allowed | Same responsive shell behavior as other roles; superadmin sections rendered by capability toggles | Sensitive actions require explicit confirmation and include descriptive action labels | Pass |

### RBAC Contract Conformance Gate (RBAC_ROLE_CONTRACT_2026-04-06)

Validated contract points:

- Canonical role normalization:
  - Unknown/missing roles normalize to `user`.
  - Role-home paths map to `/dashboard`, `/admin/dashboard`, `/superadmin/dashboard`.
- Deny-by-default role/capability routing:
  - Unauthenticated requests redirect to `/login`.
  - Authenticated but unauthorized role/capability attempts redirect to role home.
- Endpoint policy enforcement:
  - User cannot access admin/superadmin APIs (`403`).
  - Admin cannot access superadmin-only governance/metrics/override scope (`403`).
  - Superadmin can access governance and metrics scope (`200`).
- Dashboard section contract:
  - user: `learner` only.
  - admin: `learner` + `operations`.
  - superadmin: `learner` + `operations` + `governance`.

Rollout decision:

- Contract conformance: Pass.
- Rollout gate: Approved.
