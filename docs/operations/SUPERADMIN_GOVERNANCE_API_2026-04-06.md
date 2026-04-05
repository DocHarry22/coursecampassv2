# Superadmin Governance API (2026-04-06)

Status: Active
Scope: Superadmin-only governance endpoints for role administration, account status control, session revocation, and privileged audit or observability access.

## Access Policy

All endpoints in this document require:

- Valid bearer access token
- Authenticated role: superadmin

Route group:

- /admin

## Endpoints

### User role management

- GET /admin/users
- GET /admin/users/:id
- PATCH /admin/users/:id/role

PATCH /admin/users/:id/role request body:

```json
{
  "role": "user | admin | superadmin"
}
```

Safeguards:

- Rejects invalid role values.
- Rejects demotion of the final remaining superadmin.
- Rejects superadmin self-demotion.

### Account status control

- PATCH /admin/users/:id/status

PATCH /admin/users/:id/status request body:

```json
{
  "accountStatus": "active | suspended | disabled",
  "reason": "optional text",
  "revokeSessions": true
}
```

Behavior:

- Setting accountStatus to suspended or disabled blocks login, refresh, and bearer-token route access.
- Sessions are revoked when revokeSessions is true (default true), or when status is set to non-active.
- Rejects deactivation of the final remaining superadmin.

### Session revocation

- POST /admin/users/:id/revoke-sessions
- POST /admin/sessions/revoke-all

Behavior:

- Per-user revocation clears active refresh-token hash for that user.
- Global revocation clears refresh-token hashes for all users.

### Audit and observability access

- GET /admin/audit/events
- GET /admin/observability/metrics

Audit query options:

- limit, page, offset, sort, order
- action, actorUserId, targetUserId

Observability response includes:

- aggregate request and error counters
- status code totals
- top route activity
- process-level exception or rejection counters

## Audit Events Produced

Sensitive governance actions write audit entries containing:

- action
- actorUserId
- actorRole
- targetUserId
- requestId
- createdAt
- details

Current tracked actions:

- user.role.updated
- user.accountStatus.updated
- user.sessions.revoked
- sessions.revoked

## Runtime Notes

- Governance endpoints are mounted in server route bootstrap under /admin.
- Account status is normalized to active when absent in legacy records.
- Existing users without accountStatus are treated as active for backward compatibility.

## Runtime Verification Snapshot (Step 11)

Verified on 2026-04-06 in both runtime modes:

- Normal mode (dbStatus=connected)
- Forced fallback mode (dbStatus=disconnected)

Observed status behavior:

- GET /admin/users
  - user: 403
  - admin: 403
  - superadmin: 200
- GET /general/metrics
  - unauthenticated: 401
  - user/admin: 403
  - superadmin: 200

The same permission outcomes were confirmed in both modes.

Evidence reference:

- docs/operations/RBAC_RUNTIME_VERIFICATION_EVIDENCE_2026-04-06.md
