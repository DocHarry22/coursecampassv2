# RBAC Role Contract (2026-04-06)

Status: Approved for rollout
Scope: Backend API authorization and frontend route gating for user, admin, and superadmin
Owner: CourseCampass platform team

## Purpose

This document finalizes the target-state role contract for the Admin and Superadmin RBAC rollout.

The intent is to:

- Define canonical role semantics.
- Lock capability boundaries for each role.
- Define approved superadmin-only scope.
- Map current route groups to target authorization policy.

## Canonical Roles

- user
- admin
- superadmin

Role inheritance:

- superadmin includes all admin and user permissions.
- admin includes all user permissions.
- user includes baseline self-service permissions only.

Normalization and safety rules:

- Any unknown or missing role is treated as user.
- Access is deny-by-default unless a route is explicitly allowed by policy.

## Capability Matrix

| Capability Domain | user | admin | superadmin |
| --- | --- | --- | --- |
| Session lifecycle (login/refresh/logout/me) | Yes | Yes | Yes |
| Account self-service (profile/password) | Own account only | Own account only | Own account only |
| Personal planner data (financial aid, todos, calendar) | Own records only | Own records only | Own records only |
| Catalog read (courses, schools) | Yes | Yes | Yes |
| Catalog standard management (create/update) | No | Yes | Yes |
| Operational analytics (client, management, sales read APIs) | No | Yes | Yes |
| User-role management | No | No | Yes |
| Observability controls and metrics access | No | No | Yes |
| Security controls | No | No | Yes |
| Catalog overrides (destructive or force-override actions) | No | No | Yes |

## Endpoint Policy Map (Target State)

This section is the contract to enforce in rollout implementation tasks.

### Public routes

- GET /
- GET /general/health
- GET /general/ready
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout

### Authenticated routes (user/admin/superadmin)

- GET /auth/me
- GET /general
- GET /general/summary
- GET /general/dashboard-contract
- GET /account/profile
- PATCH /account/profile
- PATCH /account/password
- GET /financial-aid
- POST /financial-aid
- GET /financial-aid/:id
- PATCH /financial-aid/:id
- DELETE /financial-aid/:id
- GET /todos
- POST /todos
- GET /todos/:id
- PATCH /todos/:id
- DELETE /todos/:id
- GET /calendar
- POST /calendar
- GET /calendar/:id
- PATCH /calendar/:id
- DELETE /calendar/:id
- GET /courses
- GET /courses/:id
- GET /schools
- GET /schools/:id

### Admin and superadmin routes

- GET /client/customers
- GET /client/products
- GET /management/dashboard
- GET /management/transactions
- GET /sales/overview
- POST /courses
- PATCH /courses/:id
- POST /schools
- PATCH /schools/:id

### Superadmin-only routes and scopes

Approved exclusive scope:

- User-role management
- Observability
- Security controls
- Catalog overrides

Concrete route policy:

- GET /general/metrics
- DELETE /courses/:id
- DELETE /schools/:id

Reserved route surface for rollout phases:

- GET /admin/users
- GET /admin/users/:id
- PATCH /admin/users/:id/role
- GET /admin/security/policy
- PATCH /admin/security/rate-limits
- PATCH /admin/security/cors-origins
- POST /admin/security/emergency-lockdown
- POST /admin/security/emergency-unlock
- PATCH /admin/catalog/courses/:id/override
- PATCH /admin/catalog/schools/:id/override

Note: Reserved routes above define approved scope and naming. They may be implemented in later tasks without changing this role contract.

## Superadmin-only Scope Details

### User-role management

- Superadmin can view users and change role assignments.
- Admin cannot grant, revoke, or edit roles.
- Role changes must be restricted to canonical roles only: user, admin, superadmin.

Required safeguards:

- Do not allow removal of the final remaining superadmin.
- Do not allow self-demotion if it would leave zero superadmins.
- Require actor identity and requestId in audit trail.

### Observability

- Superadmin-only access to operational metrics and process telemetry.
- Aggregated observability payloads are considered sensitive operational data.

### Security controls

- Superadmin-only control over runtime security posture settings.
- Includes rate-limit profiles, production CORS allowlist controls, and emergency lock/unlock controls.

### Catalog overrides

- Superadmin-only force actions that bypass normal catalog workflows.
- Includes destructive deletes and explicit override endpoints for exceptional remediation.

## Authorization and Error Semantics

- Missing or invalid access token: 401 AUTH_UNAUTHORIZED.
- Authenticated but insufficient role: 403 AUTH_FORBIDDEN.
- Ownership failures on self-scoped resources: 404 NOT_FOUND (resource hidden) unless explicitly configured otherwise.

## Frontend Route Gating Contract

Minimum UI policy:

- user sees self-service routes and catalog read routes.
- admin sees user routes plus operational analytics and catalog standard management routes.
- superadmin sees admin routes plus user-role, security, observability, and override routes.

Notes:

- Frontend visibility checks are UX only; backend authorization is authoritative.
- Session role used in UI routing should normalize to user when absent or invalid.

## Rollout Notes

- This contract does not change API paths.
- Existing endpoint shapes remain unchanged; only authorization policy is tightened.
- Current-state baseline remains documented in docs/operations/ROLE_ACCESS_MATRIX_2026-04-05.md.
- Step 4 governance API freeze is documented at docs/integration/GATE2_GOVERNANCE_CONTRACT_FREEZE_2026-04-06.md.
- Step 11 runtime verification evidence (normal + fallback, permissions + governance behavior) is documented at docs/operations/RBAC_RUNTIME_VERIFICATION_EVIDENCE_2026-04-06.md.
