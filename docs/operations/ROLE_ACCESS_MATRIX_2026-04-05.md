# Role Access Matrix (2026-04-05)

Status: Active snapshot
Scope: Current backend auth and route protection behavior

Target-state contract:

- docs/operations/RBAC_ROLE_CONTRACT_2026-04-06.md

## Seed Role Distribution

- admin: 101
- superadmin: 97
- user: 102

## Authentication Behavior

- All protected API routes require a valid bearer access token via authenticateAccessToken middleware.
- No route currently applies role-specific middleware enforcement (requireRoles is defined but not wired to route groups).

## Effective Access By User Type

### unauthenticated

- Allowed: GET /
- Allowed: GET /general/health
- Allowed: GET /general/ready
- Allowed: POST /auth/login
- Allowed: POST /auth/refresh (with refresh cookie/token)
- Blocked: all other protected route groups

### user

- Can access all authenticated route groups below (same as admin and superadmin in current code):
- /general (except public health/ready already available)
- /client
- /management
- /sales
- /courses
- /schools
- /financial-aid
- /todos
- /calendar
- /account

### admin

- Currently identical effective access to user (token-authenticated routes).

### superadmin

- Currently identical effective access to admin and user (token-authenticated routes).

## Admin Login Export

- Full seed export (admin + superadmin): docs/operations/SEED_ADMIN_LOGINS_2026-04-05.csv

## Notes

- This document is a current-state baseline snapshot.
- Target-state role and capability policy is defined in docs/operations/RBAC_ROLE_CONTRACT_2026-04-06.md.
- Rollout implementation should wire requireRoles(...) middleware by route group according to the target-state contract.
