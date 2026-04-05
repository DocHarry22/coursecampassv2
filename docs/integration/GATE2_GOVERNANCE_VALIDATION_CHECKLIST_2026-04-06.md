# Gate 2 Governance Validation Checklist (2026-04-06)

Status: Active
Scope: Validation for Step 4 superadmin governance API rollout
Depends on: Step 2

Related contract:

- docs/integration/GATE2_GOVERNANCE_CONTRACT_FREEZE_2026-04-06.md

## Preconditions

- [ ] Step 2 RBAC route-level enforcement merged and verified.
- [ ] Backend boots successfully.
- [ ] At least one superadmin account is available.

## Superadmin Authorization Checks

- [ ] /admin endpoint returns 401 without token.
- [ ] /admin endpoint returns 403 for user role token.
- [ ] /admin endpoint returns 403 for admin role token.
- [ ] /admin endpoint returns 200 for superadmin token.

## User Governance Checks

- [ ] GET /admin/users returns sanitized users (no password/passwordHash/refreshTokenHash).
- [ ] GET /admin/users/:id returns one sanitized user object.
- [ ] PATCH /admin/users/:id/role accepts only user/admin/superadmin.
- [ ] PATCH /admin/users/:id/role blocks superadmin self-demotion.
- [ ] PATCH /admin/users/:id/role blocks demotion of final remaining superadmin.

## Account Status Checks

- [ ] PATCH /admin/users/:id/status updates accountStatus.
- [ ] Non-active account cannot login.
- [ ] Non-active account cannot refresh.
- [ ] Non-active account bearer token access is denied.
- [ ] Final superadmin cannot be set to suspended or disabled.

## Session Revocation Checks

- [ ] POST /admin/users/:id/revoke-sessions invalidates user refresh flow.
- [ ] POST /admin/sessions/revoke-all invalidates refresh flow globally.

## Audit and Observability Checks

- [ ] Governance write actions append audit events.
- [ ] GET /admin/audit/events filtering works for action and actorUserId.
- [ ] GET /admin/observability/metrics returns observability snapshot.

## Evidence to Capture

- [ ] Request and response samples for all /admin endpoints.
- [ ] 401 and 403 evidence for at least one /admin endpoint.
- [ ] Last-superadmin safeguard failure responses.
- [ ] Account-status lockout response evidence.
- [ ] Audit event entries created by role and status changes.

## Exit Criteria

- [ ] All checks complete.
- [ ] No regressions in Step 2 route protection.
- [ ] Contract and checklist archived with test evidence.
