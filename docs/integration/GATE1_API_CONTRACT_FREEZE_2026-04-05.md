# Gate 1 API Contract Freeze (2026-04-05)

Status: Frozen for Gate 1
Scope: Existing backend endpoints used by Frontend Phase 1 and Step 2-3 integration
Owner: CourseCampass platform team

## Freeze Rules

- This contract is locked for Gate 1 while Step 2 and Step 3 are integrated.
- No breaking changes are allowed to endpoint paths, query parameter names, response top-level JSON shapes, or required response headers.
- Any contract change requires a new freeze document and explicit approval from both agents.

## Global HTTP Behavior

### Base URL

- Local default: http://localhost:5001
- Production: supplied by VITE_API_URL from frontend configuration

### Request Headers

- Optional: x-request-id

### Response Headers

- Always present: X-Request-Id
- Always present: X-Data-Source
- Conditionally present: X-Fallback-Reason (only when fallback/error reason exists)

### X-Data-Source Values

- system
- database
- fallback
- error

### Error Envelope (for middleware-thrown errors)

```json
{
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | INTERNAL_SERVER_ERROR",
    "message": "Human-readable message",
    "details": [
      {
        "field": "fieldName",
        "message": "Validation detail"
      }
    ]
  },
  "requestId": "uuid-or-request-id"
}
```

## Endpoint Contract

### 1) GET /

Purpose: API heartbeat and runtime metadata

Success status: 200

Response shape:

```json
{
  "name": "CourseCompass API",
  "status": "ok",
  "startedAt": "ISO timestamp",
  "dbStatus": "connecting | connected | disconnected | disabled"
}
```

Response metadata:

- X-Data-Source: system

---

### 2) GET /general/health

Purpose: environment and health status

Success status: 200

Response shape:

```json
{
  "status": "ok | degraded",
  "dbStatus": "connecting | connected | disconnected | disabled | unknown",
  "startedAt": "ISO timestamp or null",
  "uptimeSeconds": 123,
  "environment": "development | production | ..."
}
```

Response metadata:

- X-Data-Source: system

---

### 3) GET /general
### 4) GET /general/summary

Purpose: app summary, module status, and inventory

Success status: 200

Response shape:

```json
{
  "appName": "CourseCompass",
  "headline": "Academic operations dashboard",
  "dbStatus": "connected | disconnected | disabled | unknown",
  "inventory": {
    "users": 0,
    "products": 0,
    "transactions": 0,
    "affiliateStats": 0,
    "overallStats": 0
  },
  "modules": [
    {
      "name": "Client",
      "path": "/client",
      "configured": true
    }
  ],
  "recommendations": ["..."]
}
```

Optional field in query-error fallback path:

- message: string

Response metadata:

- X-Data-Source: database or fallback
- X-Fallback-Reason (when fallback): database_unavailable or query_error

---

### 5) GET /client/customers

Purpose: filtered/sorted customer list

Success status: 200

Allowed query params:

- limit (int, 1-100, default 20)
- page (int, >=1, default 1)
- offset (int, >=0, optional, overrides page-based skip)
- sort (_id | name | email | country | occupation | role, default name)
- order (asc | desc | 1 | -1, default asc)
- country (string, optional)
- occupation (string, optional)
- role (string, optional)
- search (string, optional; matched against name/email)

Response shape:

```json
[
  {
    "_id": "ObjectId",
    "name": "string",
    "email": "string",
    "city": "string",
    "state": "string",
    "country": "string",
    "occupation": "string",
    "phoneNumber": "string",
    "transactions": ["ObjectId"],
    "role": "string"
  }
]
```

Contract notes:

- password is never returned.
- No pagination envelope is returned; payload is a raw array.

Response metadata:

- X-Data-Source: database or fallback
- X-Fallback-Reason (when fallback): database_unavailable or query_error

Validation failures:

- Status 400
- Error envelope with code VALIDATION_ERROR

---

### 6) GET /client/products

Purpose: filtered/sorted product list

Success status: 200

Allowed query params:

- limit (int, 1-100, default 20)
- page (int, >=1, default 1)
- offset (int, >=0, optional, overrides page-based skip)
- sort (_id | name | price | rating | supply | category, default name)
- order (asc | desc | 1 | -1, default asc)
- category (string, optional)
- minPrice (number, >=0, optional)
- maxPrice (number, >=0, optional)
- search (string, optional; matched against name/description)

Response shape:

```json
[
  {
    "_id": "ObjectId",
    "name": "string",
    "price": 0,
    "description": "string",
    "category": "string",
    "rating": 0,
    "supply": 0
  }
]
```

Contract notes:

- No pagination envelope is returned; payload is a raw array.

Response metadata:

- X-Data-Source: database or fallback
- X-Fallback-Reason (when fallback): database_unavailable or query_error

Validation failures:

- Status 400
- Error envelope with code VALIDATION_ERROR

---

### 7) GET /management/dashboard

Purpose: dashboard KPI summary

Success status: 200

Response shape:

```json
{
  "users": 0,
  "products": 0,
  "transactions": 0,
  "revenue": 0
}
```

Optional field in query-error fallback path:

- message: string

Response metadata:

- X-Data-Source: database or fallback
- X-Fallback-Reason (when fallback): database_unavailable or query_error

---

### 8) GET /management/transactions

Purpose: filtered/sorted transactions with populated user summary

Success status: 200

Allowed query params:

- limit (int, 1-100, default 12)
- page (int, >=1, default 1)
- offset (int, >=0, optional, overrides page-based skip)
- sort (_id | cost, default _id)
- order (asc | desc | 1 | -1, default desc)
- userId (ObjectId string, optional)
- minCost (number, >=0, optional)
- maxCost (number, >=0, optional)

Response shape:

```json
[
  {
    "_id": "ObjectId",
    "userId": {
      "_id": "ObjectId",
      "name": "string",
      "email": "string",
      "country": "string"
    },
    "cost": 0,
    "products": ["ObjectId"]
  }
]
```

Contract notes:

- userId may be null in fallback records where user cannot be resolved.
- No pagination envelope is returned; payload is a raw array.

Response metadata:

- X-Data-Source: database or fallback
- X-Fallback-Reason (when fallback): database_unavailable or query_error

Validation failures:

- Status 400
- Error envelope with code VALIDATION_ERROR

---

### 9) GET /sales/overview

Purpose: sales overview aggregate payload

Success status: 200

Response shape:

```json
{
  "overallStat": {
    "totalCustomers": 0,
    "yearlySalesTotal": 0,
    "yearlyTotalSoldUnits": 0,
    "year": 0,
    "monthlyData": [
      {
        "month": "Jan",
        "totalSales": 0,
        "totalUnits": 0
      }
    ],
    "dailyData": [
      {
        "date": "YYYY-MM-DD",
        "totalSales": 0,
        "totalUnits": 0
      }
    ],
    "salesByCategory": {
      "categoryName": 0
    }
  },
  "productStatsCount": 0,
  "affiliateStatsCount": 0
}
```

Contract notes:

- overallStat may be null.

Response metadata:

- X-Data-Source: database or fallback
- X-Fallback-Reason (when fallback): database_unavailable or query_error

## Non-Endpoint Errors

### Unknown routes

- Status 404
- Error code: NOT_FOUND
- X-Data-Source: error
- X-Fallback-Reason: not_found

### Unhandled server errors

- Status 500
- Error code: INTERNAL_SERVER_ERROR
- X-Data-Source: error
- X-Fallback-Reason: internal_server_error

## Gate 1 Compatibility Assertions

For Gate 1, all of the following must remain true:

- Existing paths and methods remain unchanged.
- Existing validated query parameter names remain unchanged.
- Success payload top-level structures remain unchanged.
- Global headers X-Request-Id and X-Data-Source remain present.
- Existing fallback behavior keeps returning 200 for handled fallback paths.
- Validation failures for validated endpoints remain 400 with VALIDATION_ERROR envelope.
