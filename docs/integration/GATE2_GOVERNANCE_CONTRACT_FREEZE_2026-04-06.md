# Gate 2 Governance Contract Freeze (2026-04-06)

Status: Frozen for Step 4 governance rollout
Scope: Superadmin governance API surfaces and related auth behavior
Owner: CourseCampass platform team
Depends on: Step 2 RBAC enforcement

## Freeze Rules

- This contract is locked for governance rollout verification.
- No breaking changes are allowed to governance endpoint paths, methods, or required request body keys.
- Security behavior changes (role gates, account-status enforcement, session revocation semantics) require an updated freeze document.

## Security Preconditions

- All /admin endpoints require:
- Bearer access token
- Authenticated role: superadmin

Expected failures:

- Missing or invalid token: 401 AUTH_UNAUTHORIZED or AUTH_INVALID_TOKEN
- Authenticated non-superadmin caller: 403 AUTH_FORBIDDEN

## Governance Endpoint Contract

### 1) GET /admin/users

Purpose: List users for governance operations.

Success status: 200

Allowed query params:

- limit, page, offset
- sort (_id | name | email | role | accountStatus | country)
- order (asc | desc | 1 | -1)
- search (name/email)
- role
- accountStatus
- country

Response shape:

```json
[
  {
    "_id": "ObjectId",
    "name": "string",
    "email": "string",
    "role": "user | admin | superadmin",
    "accountStatus": "active | suspended | disabled"
  }
]
```

### 2) GET /admin/users/:id

Purpose: Read governance detail for one user.

Success status: 200

Response shape:

```json
{
  "user": {
    "_id": "ObjectId",
    "name": "string",
    "email": "string",
    "role": "user | admin | superadmin",
    "accountStatus": "active | suspended | disabled"
  }
}
```

### 3) PATCH /admin/users/:id/role

Purpose: Change user role.

Success status: 200

Request body:

```json
{
  "role": "user | admin | superadmin"
}
```

Response shape:

```json
{
  "user": {
    "_id": "ObjectId",
    "role": "user | admin | superadmin"
  }
}
```

Guardrails:

- Reject invalid role values with 400 VALIDATION_ERROR.
- Reject demotion of final remaining superadmin.
- Reject superadmin self-demotion.

### 4) PATCH /admin/users/:id/status

Purpose: Control account status and optionally revoke sessions.

Success status: 200

Request body:

```json
{
  "accountStatus": "active | suspended | disabled",
  "reason": "optional text",
  "revokeSessions": true
}
```

Response shape:

```json
{
  "user": {
    "_id": "ObjectId",
    "accountStatus": "active | suspended | disabled",
    "accountStatusReason": "string"
  }
}
```

Behavior:

- Non-active statuses block login, refresh, and bearer-token route access.
- Sessions are revoked when revokeSessions is true (default true), or when status is non-active.

### 5) POST /admin/users/:id/revoke-sessions

Purpose: Revoke refresh-session state for one user.

Success status: 200

Response shape:

```json
{
  "message": "User sessions revoked."
}
```

### 6) POST /admin/sessions/revoke-all

Purpose: Revoke refresh-session state for all users.

Success status: 200

Response shape:

```json
{
  "message": "All sessions revoked."
}
```

### 7) GET /admin/audit/events

Purpose: Read governance audit trail events.

Success status: 200

Allowed query params:

- limit, page, offset
- sort (createdAt | action | actorUserId | targetUserId)
- order (asc | desc | 1 | -1)
- action
- actorUserId
- targetUserId

Response shape:

```json
[
  {
    "id": "string",
    "createdAt": "ISO timestamp",
    "actorUserId": "ObjectId or null",
    "actorRole": "string or null",
    "requestId": "string or null",
    "action": "string",
    "targetUserId": "ObjectId or null",
    "details": {}
  }
]
```

### 8) GET /admin/observability/metrics

Purpose: Superadmin observability snapshot access.

Success status: 200

Response shape:

```json
{
  "service": "coursecampass-api",
  "dbStatus": "connecting | connected | disconnected | disabled | unknown",
  "observability": {
    "requestsTotal": 0,
    "errorsTotal": 0,
    "statusCodes": {}
  }
}
```

## Audit Event Contract

Governance actions must produce audit events with action values:

- user.role.updated
- user.accountStatus.updated
- user.sessions.revoked
- sessions.revoked

## Auth Behavior Extension (Step 4)

- Login and refresh deny suspended or disabled accounts.
- Bearer-token middleware denies suspended or disabled accounts.
- Default accountStatus for legacy or missing values is active.

## Compatibility Assertions

- Existing Step 2 protected route policies remain unchanged.
- Existing endpoint payload shapes outside /admin remain unchanged.
- Governance additions are additive and superadmin-only.
