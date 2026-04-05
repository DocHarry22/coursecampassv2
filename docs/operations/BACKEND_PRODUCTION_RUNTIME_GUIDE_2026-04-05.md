# Backend Production Runtime Guide (2026-04-05)

Status: Active
Scope: Backend Phase 3 operations (security, rate limiting, observability, indexes)
Owner: CourseCampass platform team

## What this guide covers

- Recommended production environment values.
- How to verify the security and rate-limiting posture.
- How to use readiness and observability endpoints.
- What to monitor after deployment.

## Required Environment Variables

Set these in the backend runtime environment (process manager, container platform, or host panel):

- Use template file: `server/.env.production.example`

- `NODE_ENV=production`
- `PORT=5001` (or platform-provided port)
- `MONGO_URL=<atlas or mongodb connection string>`
- `ACCESS_TOKEN_SECRET=<strong random secret>`
- `REFRESH_TOKEN_SECRET=<strong random secret>`

## Recommended Production Values

These values are safe defaults for a medium traffic workload and should be tuned with traffic data.

- `TRUST_PROXY=1`
- `CORS_ORIGINS=https://app.example.com,https://admin.example.com`
- `JSON_BODY_LIMIT=1mb`
- `API_RATE_LIMIT_WINDOW_MS=900000`
- `API_RATE_LIMIT_MAX=600`
- `AUTH_RATE_LIMIT_WINDOW_MS=900000`
- `AUTH_RATE_LIMIT_MAX=20`
- `OBS_SLOW_REQUEST_MS=750`

Notes:

- `TRUST_PROXY=1` is suitable for one reverse proxy hop (typical CDN or ingress setup).
- `CORS_ORIGINS` should only include known frontend origins in production.
- If login bursts are expected (events, enrollments), raise `AUTH_RATE_LIMIT_MAX` carefully.

## Environment Profiles

### Local Development

- `NODE_ENV=development`
- `TRUST_PROXY` unset
- `CORS_ORIGINS` optional
- Use looser limits if needed for QA scripts.

### Staging

- Match production values as closely as possible.
- Keep separate secrets from production.
- Use real CORS origin allowlist for staging frontend URLs.

### Production

- Strict allowlist CORS only.
- Explicit proxy trust configuration.
- Tight auth limiter and moderate global limiter.
- Alert on readiness failures and rising 429/5xx trends.

## Runtime Endpoints

### Public diagnostics

- `GET /general/health`
- `GET /general/ready`

Behavior:

- `health` gives liveliness and DB status context.
- `ready` returns `200` with `ready` when traffic should be served.
- `ready` returns `503` when the process is shutting down or not ready.

### Protected diagnostics

- `GET /general/metrics` (requires bearer token)

Response includes:

- Aggregate request/error counters.
- Per-status totals.
- Top routes and latency snapshots.
- Process-level rejection/exception counters.

## Security and Throttling Verification

Run these checks after each production deployment.

1. CORS deny path:

```powershell
Invoke-WebRequest -Uri "https://api.example.com/general/health" -Headers @{ Origin = "https://unknown.example" }
```

Expected: `403`.

2. Global limiter check (repeat endpoint quickly until limit):

```powershell
1..5 | ForEach-Object { Invoke-WebRequest -Uri "https://api.example.com/general/health" -UseBasicParsing }
```

Expected near cap: `429` with `RATE_LIMITED` code.

3. Auth limiter check (failed or repeated login attempts):

```powershell
$body = @{ email = "user@example.com"; password = "wrong" } | ConvertTo-Json
1..5 | ForEach-Object {
  try { Invoke-WebRequest -Uri "https://api.example.com/auth/login" -Method Post -ContentType "application/json" -Body $body -UseBasicParsing }
  catch { $_.Exception.Response.StatusCode.value__ }
}
```

Expected near cap: `429`.

4. Metrics access requires auth:

- Without token: expect `401`.
- With valid token: expect `200` and observability payload.

## Database Index Operations

Phase 3 added indexes for hot query patterns on these models:

- User
- Product
- Transaction
- Course
- School
- FinancialAid
- Todo
- CalendarEvent

Operational guidance:

- Deploy during a low-traffic window for first index creation on large datasets.
- Monitor MongoDB build/index activity and API latency during rollout.
- If using managed Atlas, verify index build completion in Atlas metrics.

## Post-Deploy Smoke Checklist

- [ ] Backend starts and connects (or degrades gracefully if DB unavailable).
- [ ] `GET /general/health` returns `200`.
- [ ] `GET /general/ready` returns `200` and `ready`.
- [ ] Auth login works with valid credentials.
- [ ] Protected API access returns `401` without token and `200` with token.
- [ ] CORS rejects unallowlisted production origins.
- [ ] Auth and global limiters emit `429` when thresholds are exceeded.
- [ ] `GET /general/metrics` returns observability snapshot with non-zero request counters.

## Alerting Recommendations

Create alerts on:

- Readiness endpoint non-200 rate.
- Sustained rise in `5xx` responses.
- Sustained rise in `429` responses.
- Slow request count growth relative to baseline.
- Unhandled rejections and uncaught exceptions > 0 over baseline windows.

## Rollback Guidance

If production behavior regresses:

1. Roll back runtime env overrides first (CORS/limits) if issue is policy-related.
2. Roll back backend build to previous known-good revision if issue persists.
3. Keep readiness endpoint active to avoid routing traffic to unhealthy instances.
4. Capture metrics snapshot and server logs before rollback for root-cause analysis.
