# Role Dashboard Data Contract (2026-04-06)

Status: Active
Scope: Role-safe dashboard KPI payload for frontend role dashboards
Owner: CourseCampass platform team

## Purpose

This contract provides a single authenticated endpoint for dashboard data so role dashboards do not call unauthorized API surfaces.

Endpoint:

- GET /general/dashboard-contract

Access policy:

- user: allowed
- admin: allowed
- superadmin: allowed

## Contract Rules

- Response shape is stable across roles.
- Role-specific sections that are not allowed are returned as null.
- Frontend should not call admin-only analytics endpoints when this contract is available.
- Metadata headers follow global API behavior (`X-Data-Source`, optional `X-Fallback-Reason`).

## Response Shape

```json
{
  "contractVersion": "2026-04-06.dashboard.v1",
  "role": "user | admin | superadmin",
  "generatedAt": "ISO timestamp",
  "sections": {
    "learner": {
      "kpis": [
        {
          "key": "string",
          "label": "string",
          "value": 0,
          "displayAs": "number | percent | currency | text"
        }
      ]
    },
    "operations": {
      "kpis": []
    },
    "governance": {
      "kpis": []
    }
  }
}
```

Notes:

- `sections.operations` is null for user role.
- `sections.governance` is null for user and admin roles.

## Role Section Matrix

| Role | learner | operations | governance |
| --- | --- | --- | --- |
| user | object | null | null |
| admin | object | object | null |
| superadmin | object | object | object |

## KPI Intent by Section

### learner

- Personal productivity and planning KPIs.
- Uses user-scoped data only (todos, calendar events, aid records).
- Includes catalog visibility counters for role-safe read surfaces.

### operations

- Operational analytics summary for admin and superadmin.
- Includes high-level inventory, transactions, revenue, and catalog totals.

### governance

- Governance and platform health KPIs for superadmin only.
- Includes role/account governance counters and observability snapshots.

## Fallback Behavior

When database connectivity is unavailable or data query fails:

- Endpoint still responds `200` with the same shape.
- Payload is generated from fallback/runtime sources.
- `X-Data-Source` is `fallback`.
- `X-Fallback-Reason` is `database_unavailable` or `query_error`.
