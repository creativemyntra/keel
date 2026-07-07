# design-agent SKILL

---
governed-by: ai-sdlc-governance
skill_version: 0.3.0
phase: 3
mode: architecture-design
---

## Overview

**design-agent** transforms requirement documents (from req-agent Phase 2) into concrete architecture: API contracts, database schemas, system diagrams, and integration plans. Runs **POST-REQUIREMENTS** on validated stories (lane2_ready=true from Phase 2).

**Command:** `/keel design --story=<story-id> [--focus=api|schema|architecture|all]`  
**Branch:** `keel/design/<story-id>` (human-merged)  
**Input:** Requirement document (docs/requirements/<story-id>.md), acceptance criteria, dependencies  
**Output:** `agent-output-schema.json` + design document (lane2_ready gates dev-agent)

## Invocation

```bash
/keel design --story=KEEL-42 --focus=all
/keel design --story=KEEL-42 --focus=api
/keel design --story=KEEL-42 --focus=schema
```

**Prompt Flow:**
1. Parse requirement document (acceptance criteria, data entities, integrations)
2. Design API contract (endpoints, request/response schemas, error handling)
3. Design database schema (entities, relationships, migrations, indexes)
4. Create architecture diagram (system components, data flows, integration points)
5. Identify architectural trade-offs (sync vs. async, caching strategy, consistency model)
6. Validate against stack conventions (CakePHP 4.4 patterns, layering)
7. Flag performance + security considerations
8. Output design document + schema migrations
9. Lane2 gating (completeness + developer readiness)
10. Output schema + findings

## Deliverables (Phase 3 Scope)

### 1. Design Document

Generated file: `docs/design/<story-id>.md`

**Format** (see design-template.md):
```
# Design: [Story Title] — [Story ID]

## Overview
[Summary of what's being designed and why]

## Requirements Summary
[Link back to requirement doc; highlight key functional/non-functional requirements]

## API Contract
[OpenAPI 3.0 specification embedded or linked]
- Endpoints: [LIST]
  - POST /api/subscriptions
  - GET /api/subscriptions/:id
  - PATCH /api/subscriptions/:id
  - DELETE /api/subscriptions/:id
  - POST /api/subscriptions/:id/payment-methods
- Request/Response schemas (JSON examples)
- Error codes (4xx, 5xx with descriptions)

## Database Schema
[ER Diagram + SQL DDL]
- Tables: Subscription, PaymentMethod, Invoice, Plan
- Relationships: User has_many Subscriptions, Subscription belongs_to Plan
- Indexes: (user_id, status), (stripe_subscription_id)
- Migrations: Version 20260707_000_create_subscription_tables.php

## System Architecture
[Block diagram: Frontend → API Layer → DB + External APIs]
- Components: CakePHP Controllers → Service Layer → ORM → Stripe API
- Data flow: User subscribes → Payment processed → DB updated → Feature flags set

## Integration Points
[External services]
- Stripe API: Payment processing, subscription management, webhooks
- Email Service: Confirmation + renewal emails (async job queue)
- Feature Flag System: Grant premium access post-payment

## Trade-Offs & Decisions
[Why we chose X over Y]
- Synchronous vs. Async: Payment processing is synchronous (critical path); email notifications are async
- Eventual consistency: Subscription DB is source-of-truth; Stripe is secondary (reconciliation job in Phase 4+)
- Caching: Feature flags cached (5min TTL) to reduce DB hits; subscription status not cached (must be real-time)

## Performance Considerations
[Targets from requirements + implementation strategy]
- Subscription creation: <2s latency target
- API response time: <500ms p95 (excluding Stripe API call latency)
- DB query optimization: Indexed lookups on (user_id, status)

## Security Considerations
[Data protection, auth, compliance]
- PCI compliance: No raw card data stored; Stripe tokenization only
- CSRF protection: POST requests require CSRF token (CakePHP middleware)
- Authentication: User must be logged in; subscription created for authenticated user only
- Data encryption: Stripe payment method tokens are encrypted at rest (Stripe handles)

## Deployment Considerations
[How this gets into production]
- Database migrations: Run pre-deployment (zero-downtime for new columns)
- Feature flags: Disable subscription endpoints until all services ready
- Monitoring: Track payment success rate, API latency, webhook delivery
- Rollback plan: Feature flag disable → reverts to free tier (no data loss)
```

### 2. OpenAPI Schema (API Contract)

Embedded or linked specification:

```yaml
openapi: 3.0.0
info:
  title: Subscription API
  version: 1.0.0
servers:
  - url: https://api.example.com/v1

paths:
  /subscriptions:
    post:
      summary: Create subscription
      operationId: createSubscription
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [plan_id, payment_method_id]
              properties:
                plan_id:
                  type: string
                  example: "monthly-premium"
                payment_method_id:
                  type: string
                  example: "pm_1234567890"
      responses:
        201:
          description: Subscription created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Subscription'
        400:
          description: Invalid request
        402:
          description: Payment failed
        409:
          description: User already has active subscription

  /subscriptions/{subscription_id}:
    get:
      summary: Get subscription
      parameters:
        - in: path
          name: subscription_id
          required: true
          schema:
            type: string
      responses:
        200:
          description: Subscription details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Subscription'

components:
  schemas:
    Subscription:
      type: object
      properties:
        id:
          type: string
        user_id:
          type: integer
        plan_id:
          type: string
        stripe_subscription_id:
          type: string
        status:
          type: string
          enum: [active, paused, canceled]
        next_billing_date:
          type: string
          format: date
        created_at:
          type: string
          format: date-time
```

### 3. Database Schema (DDL + ER Diagram)

SQL migrations for CakePHP:

```sql
-- Migration: 20260707_000_create_subscription_tables.php

CREATE TABLE subscriptions (
  id CHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id VARCHAR(50) NOT NULL,
  stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE,
  status ENUM('pending', 'active', 'paused', 'canceled') DEFAULT 'pending',
  started_at TIMESTAMP NULL,
  next_billing_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT,
  INDEX idx_user_id_status (user_id, status),
  INDEX idx_stripe_subscription_id (stripe_subscription_id)
);

CREATE TABLE payment_methods (
  id CHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  stripe_payment_method_id VARCHAR(255) NOT NULL UNIQUE,
  card_last_four CHAR(4) NOT NULL,
  card_brand VARCHAR(50) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

CREATE TABLE invoices (
  id CHAR(36) PRIMARY KEY,
  subscription_id CHAR(36) NOT NULL,
  stripe_invoice_id VARCHAR(255) NOT NULL UNIQUE,
  status ENUM('draft', 'open', 'paid', 'failed', 'uncollectible') DEFAULT 'draft',
  amount_cents INT NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  due_date DATE NOT NULL,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
  INDEX idx_subscription_id (subscription_id),
  INDEX idx_stripe_invoice_id (stripe_invoice_id)
);
```

**ER Diagram:**
```
User
├─ has_many Subscriptions
├─ has_many PaymentMethods
└─ has_many Invoices (via Subscriptions)

Subscription
├─ belongs_to User
├─ belongs_to Plan
├─ has_many Invoices
└─ has_one PaymentMethod

Plan (lookup table)
└─ has_many Subscriptions

PaymentMethod
└─ belongs_to User

Invoice
├─ belongs_to Subscription
└─ belongs_to User (indirect via Subscription)
```

### 4. Architecture Diagram (Text + Visual)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Client Layer (Web, iOS, Android)                                    │
│  - Payment form (Stripe Elements)                                   │
│  - Subscription UI                                                  │
└────────────────────┬────────────────────────────────────────────────┘
                     ↓ HTTPS POST /api/subscriptions
┌─────────────────────────────────────────────────────────────────────┐
│ API Layer (CakePHP)                                                 │
│  ├─ SubscriptionsController                                         │
│  │   ├─ create() — validate input, call SubscriptionService       │
│  │   └─ show() — get subscription + check auth                    │
│  └─ Middleware: Auth, CSRF, Rate Limiting                         │
└────────────────────┬────────────────────────────────────────────────┘
                     ↓ Service Layer
┌─────────────────────────────────────────────────────────────────────┐
│ Business Logic (Service Layer)                                      │
│  └─ SubscriptionService                                            │
│      ├─ createSubscription(user, plan, paymentMethod)              │
│      │   ├─ Call Stripe API → create subscription + charge         │
│      │   ├─ Save Subscription record to DB (if Stripe success)     │
│      │   ├─ Set "premium_access" feature flag                      │
│      │   └─ Trigger email job (async)                              │
│      └─ Error handling: Stripe failure → no DB record, return 402  │
└────────────────────┬────────────────────────────────────────────────┘
                     ↓ ORM Layer
┌────────────────────┬────────────────────────────────────────────────┐
│ Data Layer         │ External Services                              │
│ (CakePHP ORM)      │                                                │
│ ├─ Subscription    ├─ Stripe API (Payment Processing)              │
│ ├─ PaymentMethod   │   ├─ POST /payment_intents                    │
│ ├─ Invoice         │   ├─ POST /subscriptions                       │
│ └─ Plan            │   └─ Webhooks: subscription.created, etc.     │
│                    │                                                │
│ MySQL Database     ├─ Email Service (Async Job Queue)              │
│ ├─ subscriptions   │   └─ Send confirmation + renewal emails       │
│ ├─ payment_methods │                                                │
│ ├─ invoices        ├─ Feature Flag System                          │
│ └─ plans           │   └─ SET user.premium_access = true           │
└────────────────────┴────────────────────────────────────────────────┘
```

### 5. Integration Point Specifications

**Stripe Integration:**
- **Create Subscription:** POST /v1/customers/:id/subscriptions (one-time charge + recurring)
- **Webhook Handling:** Verify signature → parse event → update DB (idempotent)
- **Error Handling:** Declined card (4000 0000 0000 0002), expired (0100 01/2020), network timeout

**Email Integration:**
- **Confirmation Email:** Trigger async job post-subscription creation
- **Renewal Reminder:** Cron job 7 days before next billing
- **Queue System:** Store failed sends; retry with exponential backoff

**Feature Flag Integration:**
- **Gate Premium Features:** Check feature flag "premium_access" in controller
- **Set Flag on Purchase:** SubscriptionService calls feature_flag->set(user_id, 'premium_access', true)
- **Revoke on Cancel:** Cron job removes flag when subscription canceled

## Output Contract (agent-output-schema.json)

**status:** `success` (all design artifacts complete) | `partial` (gaps flagged) | `blocked` (unresolvable architecture issue)

**confidence:** Derived per CLAUDE.md rules:
- `high` = status=success, API+schema complete, <3 MEDIUM findings, 0 HIGH findings
- `medium` = API/schema 90%+ complete, ≤2 HIGH findings resolvable in dev
- `low` = Design incomplete, HIGH findings unresolved, or 2+ design retries

**findings:** Ordered by severity. Examples:
```json
{
  "severity": "HIGH",
  "basis": "verified",
  "category": "architecture",
  "description": "Webhook idempotency not specified; duplicate subscriptions possible if Stripe retries",
  "file": "docs/design/KEEL-42.md",
  "suggested_action": "Add webhook deduplication strategy in design phase (request ID mapping + database unique constraint)"
}
```

**artifacts_written:**
- `docs/design/<story-id>.md`
- `docs/design/<story-id>.openapi.yaml`
- `db/migrations/<timestamp>_create_<entities>.php`

**artifacts_read:**
- `docs/requirements/<story-id>.md` (input from req-agent)

## Self-Healing Loop

If lane2_ready = false on first run:

1. **Retry Scenario 1:** Design clarification
   - Identify incomplete artifacts (missing API endpoint, incomplete schema)
   - Re-iterate design phase to add missing details
   - Re-validate against requirements

2. **Retry Scenario 2:** Architectural review
   - Identify HIGH findings (unresolved trade-offs, integration gaps)
   - Re-think design choices; propose alternatives
   - Document trade-offs + rationale

3. **Escalation:**
   - fallback_triggered = true
   - confidence = low
   - Recommend PM/Tech Lead architectural review before dev starts
   - Document blocking issues for human resolution

## Phase 3 Scope Boundaries

**Include:**
- API contract design (OpenAPI 3.0 specification)
- Database schema design (ER diagram + SQL DDL)
- Architecture diagram (component + data flow)
- Integration specifications (Stripe, Email, Feature Flags)
- Trade-off analysis (sync vs. async, caching, consistency model)
- Performance + security considerations
- Deployment strategy (migrations, feature flags, rollback plan)

**Exclude (Phase 4+):**
- Implementation code (dev-agent generates actual code)
- Test generation (test-agent writes test cases)
- Security scanning (sec-agent runs SAST, dependency scans)
- CI/CD workflows (deploy-agent sets up pipelines)
- Monitoring/alerting setup (maint-agent configures)

## Lane2 Gating

**lane2_ready = true only if:**
- [ ] API contract complete (all AC-mapped endpoints defined)
- [ ] Database schema finalized (all entities + relationships)
- [ ] Architecture diagram clear (components + data flows)
- [ ] Integration points specified (Stripe, Email, Features)
- [ ] No HIGH-severity findings unresolved
- [ ] Performance targets addressed (caching, indexes, queries)
- [ ] Security baseline confirmed (PCI, CSRF, auth, encryption)

**If lane2_ready = false:**
- Set confidence = low or medium
- Identify blocking design decisions
- Recommend iteration or PM/Tech Lead review
- Document gaps for dev-agent to address

## Example: KEEL-42 Subscription Design

**Input (from req-agent KEEL-42.md):**
- 9 MUST-have functional requirements
- 5 acceptance criteria
- Data entities: User, Subscription, PaymentMethod, Plan, Invoice
- External integrations: Stripe API, Email service
- Performance targets: <2s subscription creation latency
- Security baseline: PCI Level 1 compliance

**Output (design-agent design/KEEL-42.md):**
- API: 4 subscription endpoints (create, get, list, cancel) + payment method endpoints
- Schema: 3 new tables (Subscription, PaymentMethod, Invoice) + 2 new columns (features_unlocked)
- Architecture: CakePHP Service Layer calls Stripe API synchronously; email notifications queued async
- Trade-off: Synchronous payment (critical path) vs. async email (non-critical)
- Performance: DB indexes on (user_id, status) + (stripe_subscription_id); Stripe latency within SLA
- Security: Stripe tokenization (no local card storage); CSRF token required; webhook signature verification

**lane2_ready: TRUE** — Ready for dev-agent

---

**Last Updated:** Phase 3 Init | **Next Agent:** Phase 4 (dev-agent) — gates on lane2_ready=true
