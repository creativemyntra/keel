# Design: [Feature Title] — [Story ID]

**Status:** Design Complete | **Story Type:** Feature | **Phase:** 3 (Architecture Design)

**Story ID:** [KEEL-XX] | **Epic:** [EPIC-ID] | **Complexity:** [S/M/L]

**Design Lead:** [Name] | **Tech Review:** [Name] | **Date:** [YYYY-MM-DD]

---

## Overview

[Executive summary: What is being designed, why, and the key architectural approach]

**Problem Solved:** [Link back to requirement; 1-2 sentences on the business goal]

**Approach:** [High-level architecture choice: sync vs. async, monolithic vs. distributed, etc.]

**Key Decisions:** [List 3-5 critical architecture decisions made in this design]

---

## Requirements Summary

[Reference the requirement document from req-agent Phase 2]

**Functional Requirements:**
- [MUST-1, MUST-2, MUST-3, ...]
- [SHOULD-1, SHOULD-2, ...]

**Non-Functional Requirements:**
- Performance: [<2s latency target, etc.]
- Scalability: [10K concurrent users, etc.]
- Security: [PCI compliance, CSRF protection, etc.]
- Availability: [99.9% uptime, etc.]

**Acceptance Criteria:** [Reference the 5+ BDD scenarios from req-agent]

**External Dependencies:** [Stripe, Email Service, Feature Flags, etc.]

---

## API Contract

### Overview

[Summary of API scope and philosophy]

**Base URL:** `https://api.hart30.io/v1`  
**Auth:** Bearer token (JWT from user session) — required for all endpoints  
**Content-Type:** `application/json`  
**Versioning:** API v1.0 (stable for Phase 5+)

### OpenAPI 3.0 Schema

```yaml
openapi: 3.0.0
info:
  title: Hart 30 [Feature] API
  version: 1.0.0
servers:
  - url: https://api.hart30.io/v1
    description: Production

paths:
  /[resource]:
    post:
      summary: Create [resource]
      operationId: create[Resource]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/[ResourceCreate]'
      responses:
        201:
          description: [Resource] created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/[Resource]'
        400:
          description: Invalid request
        401:
          description: Unauthorized
        409:
          description: Conflict (e.g., resource already exists)

  /[resource]/{id}:
    get:
      summary: Get [resource] by ID
      parameters:
        - in: path
          name: id
          required: true
          schema:
            type: string
      responses:
        200:
          description: [Resource] details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/[Resource]'
        404:
          description: Not found

components:
  schemas:
    [Resource]:
      type: object
      properties:
        id:
          type: string
          format: uuid
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
```

### Endpoints

#### POST /[resource] — Create

**Request:**
```json
{
  "param1": "value1",
  "param2": "value2"
}
```

**Response (201):**
```json
{
  "id": "uuid-here",
  "param1": "value1",
  "param2": "value2",
  "created_at": "2026-07-06T15:00:00Z",
  "status": "active"
}
```

**Error Responses:**
- **400 Bad Request:** Invalid input (e.g., missing required field)
- **401 Unauthorized:** Missing or invalid auth token
- **409 Conflict:** Resource already exists (e.g., user already has active subscription)
- **402 Payment Required:** Payment processing failed (declined card)
- **422 Unprocessable Entity:** Validation error (e.g., invalid plan_id)

**Implementation Notes:**
- Validate user authentication (user_id from session token)
- Validate input schema against OpenAPI definition
- Check for duplicate resources (if applicable)
- Call external services (Stripe, etc.) if needed
- Return 201 + resource on success

---

#### GET /[resource]/{id} — Retrieve

**Request:**
```
GET /[resource]/uuid-here
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "uuid-here",
  "param1": "value1",
  "status": "active",
  "created_at": "2026-07-06T15:00:00Z"
}
```

**Error Responses:**
- **401 Unauthorized:** Missing auth token
- **403 Forbidden:** User not authorized to view this resource
- **404 Not Found:** Resource does not exist

---

#### [Additional endpoints for update, delete, list, etc.]

---

## Database Schema

### Entity-Relationship Diagram (Text)

```
User (existing)
├─ 1 ──────── ∞ Subscription
│             ├─ 1 ──────── ∞ Invoice
│             └─ subscription_id FK
│
├─ 1 ──────── ∞ PaymentMethod
│             └─ payment_method_id FK
│
└─ 1 ──────── ∞ [AdditionalEntities]

Plan (lookup table)
└─ 1 ──────── ∞ Subscription
              └─ plan_id FK
```

### Tables & Columns

#### Table: [resource]

[Description: Purpose, lifecycle, key relationships]

```sql
CREATE TABLE [resource] (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  user_id INT NOT NULL COMMENT 'Foreign key to users table',
  [foreign_key_column] VARCHAR(255) NOT NULL,
  [required_field] VARCHAR(255) NOT NULL,
  [optional_field] VARCHAR(255) NULL,
  status ENUM('pending', 'active', 'paused', 'canceled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL COMMENT 'Soft delete timestamp',
  
  -- Constraints
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY ([foreign_key_column]) REFERENCES [other_table](id) ON DELETE RESTRICT,
  UNIQUE KEY uk_[resource]_[unique_field] ([unique_field]),
  
  -- Indexes (query optimization)
  INDEX idx_user_id_status (user_id, status),
  INDEX idx_[foreign_key]_created (status, created_at),
  INDEX idx_stripe_id (stripe_[resource]_id) -- For webhook lookups
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Columns:**
- `id` (UUID): Primary key, immutable
- `user_id` (INT): Foreign key to users; required
- `[field_name]` (VARCHAR): [Description and constraints]
- `status` (ENUM): [Allowed states and state transitions]
- `created_at` (TIMESTAMP): Record creation; immutable
- `updated_at` (TIMESTAMP): Last modification; auto-updated
- `deleted_at` (TIMESTAMP NULL): Soft delete (if applicable)

**Relationships:**
- User has_many [Resource]
- [Resource] belongs_to User
- [Resource] belongs_to Plan (if applicable)

---

#### [Additional Tables and Relationships]

---

### Database Migrations

**File:** `db/migrations/20260707_000_create_[resource]_tables.php`

**Purpose:** Create schema for [Feature Name]

**Migration Content:**
```php
<?php

class Create[Resource]Tables extends Migration {
  public function up() {
    // SQL CREATE TABLE statements for all new entities
    // Executed in dependency order (foreign keys defined last)
  }

  public function down() {
    // SQL DROP TABLE statements in reverse order
    // Allow rollback if deployment fails
  }
}
```

**Execution Plan:**
1. Run migration on staging environment (validate syntax + constraints)
2. Backup production database (pre-deployment safety)
3. Run migration on production during maintenance window
4. Verify tables + indexes created successfully
5. Rollback procedure: Re-run migration down() if critical issue found

---

## System Architecture

### Components & Data Flow

[ASCII diagram or description of system components and how they interact]

```
┌─────────────────────────────────────────┐
│ Client (Web/iOS/Android)                │
│  - Payment form (Stripe Elements)       │
│  - Feature UI                           │
└────────────────┬────────────────────────┘
                 │ HTTPS POST /api/[resource]
                 ↓
┌─────────────────────────────────────────┐
│ CakePHP API Layer                       │
│  - [Resource]Controller                 │
│  - Auth middleware (JWT validation)     │
│  - CSRF middleware                      │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│ Service Layer (Business Logic)          │
│  - [Resource]Service                    │
│  - Validation + orchestration           │
│  - External service calls               │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        ↓                 ↓
   ┌─────────┐      ┌──────────────┐
   │ ORM     │      │ Stripe API   │
   │ (DB)    │      │ (Payment)    │
   └─────────┘      └──────────────┘
        │                 │
        ├─ MySQL          ├─ Create charge
        ├─ Subscriptions  ├─ Manage subscription
        ├─ PaymentMethod  ├─ Webhooks
        └─ Invoices       └─ (External service)
```

### Sequence Diagram (Example: Create Resource)

```
Client          API             Service         Stripe           DB
  │              │                │              │               │
  ├─ POST /[res]─>                │              │               │
  │              │                │              │               │
  │              ├─ Auth check    │              │               │
  │              │                │              │               │
  │              ├─ Validate input│              │               │
  │              │                │              │               │
  │              ├─────────────────> Create [Res]│               │
  │              │                │              │               │
  │              │                ├─ Call Stripe────────────────>│
  │              │                │              │               │
  │              │                │              │<── success─────│
  │              │                │              │               │
  │              │                ├─ Save to DB──────────────────>│
  │              │                │              │               │
  │              │                │<────────────────saved────────│
  │              │                │              │               │
  │              │<───── [Res] ────│              │               │
  │<─ 201 [Res] ──│                │              │               │
  │              │                │              │               │
```

---

## Integration Points

### External Service 1: [Name] (e.g., Stripe)

**Purpose:** [Payment processing, email delivery, etc.]

**Integration Type:** REST API (synchronous) | Webhooks (asynchronous)

**Endpoints Used:**
- `POST /v1/customers/:id/subscriptions` — Create subscription + charge
- `POST /v1/subscriptions/:id` — Update subscription
- `DELETE /v1/subscriptions/:id` — Cancel subscription
- Webhook: `customer.subscription.created` — Notify backend of created subscription

**Error Handling:**
- Declined card (status: failed) → Return 402 Payment Required
- Network timeout → Retry with exponential backoff; timeout after 30s
- Invalid API key → Log error; alert ops team

**Data Mapping:**
- [Local field] → [External field]
- `plan_id` → `price_id` (Stripe price object)
- `user_id` → `stripe_customer_id`
- `status` → `subscription.status`

**Authentication:**
- API key stored in .env (never in code)
- Key never logged or exposed in error messages

---

### External Service 2: [Name]

[Repeat structure from External Service 1]

---

## Trade-Offs & Decisions

### Decision 1: [Synchronous vs. Asynchronous Payment Processing]

**Context:** Requirement specifies payment processing critical path <2s latency

**Options Considered:**
- **Option A: Synchronous** — Client waits for Stripe API response; subscription created immediately on success
  - Pros: Simple, immediate feedback, guaranteed consistency
  - Cons: User experiences Stripe API latency (500ms+ added to request)
  - Risk: Stripe timeout → user sees error (even if payment succeeded in Stripe)

- **Option B: Asynchronous** — Client initiates; webhook confirms subscription creation
  - Pros: Decouples from Stripe latency; better UX (fast response)
  - Cons: Eventual consistency (delay before subscription active); webhook failures possible
  - Risk: Missing webhook → subscription never created despite charge

**Decision:** **Option A (Synchronous)** for MVP
- Requirement explicitly states <2s target
- Stripe SLA <500ms typically (acceptable)
- Consistency guaranteed (user sees immediate confirmation)
- Webhook as backup (Phase 4+: reconciliation job)

**Tradeoff Accepted:** Higher user-perceived latency if Stripe is slow; mitigated by retry logic + fallback messaging

---

### Decision 2: [Data Model: Eventual Consistency vs. Strong Consistency]

**Context:** Subscription state stored in local DB + Stripe; must stay in sync

**Options:**
- **Option A: Source-of-truth in Stripe** — Always query Stripe for subscription state; cache in DB
  - Pros: Single source of truth; guaranteed consistency
  - Cons: Every request hits Stripe API; slow; dependent on Stripe availability

- **Option B: Source-of-truth in local DB** — Stripe is secondary; reconciliation job syncs periodically
  - Pros: Fast reads (DB query <10ms); independent of Stripe
  - Cons: Eventual consistency (slight lag before DB synced if Stripe state changes)
  - Risk: User sees stale subscription state (mitigated by webhook + cron job)

**Decision:** **Option B (Local DB as source-of-truth)**
- Requirement for <100ms API response time (Stripe query too slow)
- Accept eventual consistency (5-60min lag acceptable for subscription state)
- Mitigations: Webhooks for real-time updates + daily reconciliation cron

---

### [Additional Trade-Offs]

---

## Performance Considerations

### Performance Targets

[From requirements + implementation strategy]

| Target | Metric | Strategy |
|--------|--------|----------|
| API Response | <100ms p95 | DB indexes on (user_id, status); connection pooling |
| Subscription Creation | <2s e2e | Async email job; sync payment processing |
| Feature Flag Propagation | <100ms | In-memory cache (5min TTL) |
| DB Query | <10ms p95 | Index on (user_id, status); avoid N+1 queries |

### Optimization Strategies

**Database:**
- Index on frequently-queried columns: `(user_id, status)`, `(stripe_subscription_id)`
- Avoid select * queries; select only required columns
- Use eager loading to avoid N+1 queries (e.g., include Plan data in one query)

**Caching:**
- Feature flag cache (5min TTL) reduces DB hits
- Subscription status NOT cached (must be real-time)
- Cache invalidation: webhook + cron job

**Query Optimization:**
- SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' — uses index
- JOIN subscriptions s INNER JOIN plans p ON s.plan_id = p.id — uses index

**Monitoring:**
- Track API response time (p50, p95, p99) — alert if >200ms
- Track DB query time — alert if >50ms

---

## Security Considerations

### Authentication & Authorization

**Auth Method:** JWT bearer tokens (from user login session)
- Token issued on login; expires after 24 hours
- Token stored in HTTP-only cookie (not accessible to JavaScript)
- All API endpoints require valid token

**Authorization:**
- User can only view/modify their own subscriptions (check user_id)
- Admin-only endpoints (if any): require admin role flag
- No authorization for Payment API endpoints (managed by Stripe)

### Data Protection

**Sensitive Data:**
- Card data: Never stored locally; Stripe tokenization only
- Payment method tokens: Stored in DB (encrypted at rest via DB encryption)
- Personal data (email, name): Encrypted if PII; GDPR-compliant

**Encryption:**
- At rest: Database encryption (MySQL AES_ENCRYPT if needed)
- In transit: TLS 1.2+ for all HTTPS connections
- Secrets: API keys in .env (never in code/version control)

### CSRF Protection

- All POST/PATCH/DELETE endpoints require CSRF token (in header or form data)
- CakePHP middleware validates token (fail-safe: 403 Forbidden if missing)
- Token generated per session; rotated on login

### Input Validation

- All user input validated against schema (req body, query params, path params)
- Reject invalid types, out-of-range values, null violations
- Sanitize strings (prevent XSS in error messages)

### PCI Compliance

- **Scope:** No raw card data handled locally (Stripe manages)
- **Audit:** Annual PCI audit validates no card data in logs/backups
- **Implementation:** Stripe tokenization required; no local card processing

### Rate Limiting

- API endpoints rate-limited (100 requests/minute per user)
- Prevents brute-force attacks + DoS
- Return 429 Too Many Requests if limit exceeded

---

## Deployment Strategy

### Pre-Deployment Checklist

- [ ] All tests passing (unit, integration, performance)
- [ ] Database migrations tested on staging (syntax + constraints valid)
- [ ] Feature flag system ready (ability to disable endpoints)
- [ ] Monitoring alerts configured (API latency, error rate, payment failures)
- [ ] Rollback plan tested (can we revert feature flag? can we roll back migration?)
- [ ] Stakeholder approval (PM, tech lead, ops)

### Deployment Steps

1. **Database Migration**
   - Run migration on production (during low-traffic window)
   - Verify tables + indexes created: `SHOW TABLES; DESCRIBE [resource];`
   - Verify no locks on tables (migration may have blocked writes)

2. **Code Deployment**
   - Deploy API code (controllers, services, models)
   - Feature flag initially disabled (endpoint returns 404 or 403)
   - No user traffic hits new code until flag enabled

3. **Validation**
   - Manual smoke test: Can create [resource] via Postman?
   - Check logs: Any errors or warnings during first requests?
   - Monitor metrics: API response time, error rate, DB query time

4. **Feature Flag Rollout**
   - Enable for 10% of users (canary release)
   - Monitor error rate, latency, customer feedback (1-2 hours)
   - If stable: increase to 50%, then 100%
   - If issues: disable immediately (revert to v0)

### Rollback Plan

**If critical issue found (data corruption, security vulnerability):**
1. Disable feature flag (endpoint unavailable)
2. Assess whether DB rollback needed (data loss risk)
3. If data safe: rollback migration (DROP TABLE; re-create schema)
4. If data corruption: restore from backup (last 24h snapshot)
5. Post-incident: RCA + fix + re-deploy

---

## Testing Strategy (Handed to Phase 4: test-agent)

### Unit Tests
- [Service] class validates input (required fields, valid types)
- [Service] calls external APIs with correct parameters
- Error cases: invalid input → exception thrown

### Integration Tests
- Create [resource] endpoint happy path: 201 response + DB record
- Error path: declined payment → 402 response, no DB record
- Webhook handling: Stripe event → idempotent DB update

### Performance Tests
- Create [resource] under load (100 concurrent): <2s p95 latency
- DB query latency: <10ms (verify indexes)

### Security Tests
- CSRF token validation: missing token → 403
- Auth token validation: missing token → 401
- No card data in logs or error messages

---

## Deployment Considerations (Phase 5)

**Feature Flags:**
- Feature flag enables/disables endpoint
- Initially disabled; enabled via config or admin dashboard

**Monitoring:**
- API latency (p50, p95, p99) — alert if >200ms
- Error rate (4xx, 5xx) — alert if >1%
- Payment success rate — alert if <99%
- Stripe webhook delivery — alert if any missed events

**Support Runbook:**
- "Payment failed with code 'card_declined'" — customer action: update payment method
- "Stripe API timeout" — ops action: check Stripe status page; retry

---

**Design Version:** 1.0 | **Last Updated:** [YYYY-MM-DD] | **Next Phase:** 4 (dev-agent — implementation)

**Lane2 Ready:** [true/false] — gates dev-agent intake
