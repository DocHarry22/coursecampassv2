# Gate 1 Integration Checklist (Depends On Step 2 + Step 3)

Status: Active checklist for both agents
Gate condition: Gate 1 can be marked done only after Step 2 and Step 3 are complete and this checklist is fully checked.

Related contract snapshot:

- docs/integration/GATE1_API_CONTRACT_FREEZE_2026-04-05.md

Related operations guide:

- docs/operations/BACKEND_PRODUCTION_RUNTIME_GUIDE_2026-04-05.md

## Shared Preconditions

- [ ] Step 2 is merged to the working branch.
- [ ] Step 3 is merged to the working branch.
- [ ] Server starts successfully in local dev mode.
- [ ] Frontend starts successfully in local dev mode.
- [ ] Frontend points to intended API base URL (VITE_API_URL or localhost default).

## Backend Agent Checklist

### Contract Preservation

- [ ] Verify all frozen endpoints still exist with same method + path:
- [ ] GET /
- [ ] GET /general
- [ ] GET /general/health
- [ ] GET /general/summary
- [ ] GET /client/customers
- [ ] GET /client/products
- [ ] GET /management/dashboard
- [ ] GET /management/transactions
- [ ] GET /sales/overview
- [ ] Verify validated query keys are unchanged for customers/products/transactions routes.
- [ ] Verify unknown query keys return 400 VALIDATION_ERROR on validated routes.
- [ ] Verify X-Request-Id is present on all responses.
- [ ] Verify X-Data-Source is present on all responses.

### Behavior + Reliability

- [ ] Verify fallback mode still returns valid 200 payloads when dbStatus is not connected.
- [ ] Verify unknown routes still return 404 NOT_FOUND envelope.
- [ ] Verify unhandled exceptions still return 500 INTERNAL_SERVER_ERROR envelope.
- [ ] Confirm no success payload shape drift (top-level keys) versus the frozen contract.

### Evidence To Publish

- [ ] Curl or Postman capture for each endpoint (success path).
- [ ] Curl or Postman capture for one validation error case per validated route.
- [ ] Curl or Postman capture for unknown route 404.
- [ ] Short note confirming whether test data came from database or fallback.

## Frontend Agent Checklist

### Contract Consumption

- [ ] Confirm all app routes map to expected backend contract dependencies.
- [ ] Confirm shared API client handles non-2xx responses consistently.
- [ ] Confirm dashboard view-model mapping only uses frozen keys from contract.
- [ ] Confirm destination pages do not assume pagination envelopes for array endpoints.
- [ ] Confirm UI tolerates fallback data-source responses without regressions.

### Route + UX Integration

- [ ] Confirm sidebar navigation resolves all destinations without runtime errors.
- [ ] Confirm active-route state is correct for each destination.
- [ ] Confirm app-level error boundary catches render failures and displays fallback UI.
- [ ] Confirm dashboard renders when API returns database-backed payloads.
- [ ] Confirm dashboard renders when API returns fallback payloads.

### Evidence To Publish

- [ ] Screenshot/video pass of each sidebar destination route.
- [ ] Screenshot of dashboard with data loaded.
- [ ] Screenshot of graceful error boundary screen (forced render error test).
- [ ] Build output confirming production compile succeeds.

## Joint Integration Sign-off (Both Agents)

- [ ] Backend Agent and Frontend Agent both approved no contract drift.
- [ ] Any discovered drift has either been reverted or documented as post-Gate scope.
- [ ] Manual smoke flow passes:
- [ ] Open app
- [ ] Navigate all sidebar routes
- [ ] Validate dashboard data cards + lists
- [ ] Trigger one validated query error case
- [ ] Confirm app remains responsive
- [ ] Gate 1 release note entry added with date and commit reference.

## Gate 1 Exit Criteria

Gate 1 is complete only when:

- [ ] Step 2 complete
- [ ] Step 3 complete
- [ ] Backend checklist complete
- [ ] Frontend checklist complete
- [ ] Joint sign-off complete
