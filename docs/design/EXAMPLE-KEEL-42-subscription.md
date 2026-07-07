# Design: User Subscription Management — KEEL-42

**Status:** Design Complete | **Story Type:** Feature | **Phase:** 3 (Architecture Design)

**Story ID:** KEEL-42 | **Epic:** KEEL-E1 (Monetization Phase 1) | **Complexity:** Large

**Design Lead:** Deepak Vaishnav (Web Lead) | **Tech Review:** Security Team | **Date:** 2026-07-10

---

## Overview

**Design Scope:** Complete subscription system enabling recurring revenue through monthly and annual plans.

**Problem Solved:** Platform has 50K+ free users but zero monetization. Power users (10% of base) are ready to pay for premium features. This design specifies the architecture to capture that revenue reliably, securely, and at scale.

**Approach:** Synchronous payment processing (Stripe handles payment + subscription) with asynchronous webhook notifications for eventual consistency. Feature flags gate premium features. Local DB is source-of-truth; Stripe is secondary (reconciliation via cron job Phase 4+).

**Key Decisions:**
1. **Synchronous payment flow** — User waits for payment; subscription created immediately (consistent UX)
2. **Stripe as payment processor** — No local card storage (PCI Level 1 compliance)
3. **Feature flags for access control** — Premium features gated via existing flag system
4. **Async email notifications** — Confirmation/renewal emails queued; don't block API response
5. **Local DB as source-of-truth** — Subscription state in local DB; Stripe state synced via webhooks (eventual consistency)

---

## Requirements Summary

[Reference: docs/requirements/KEEL-42.md — User Subscription Management]

**Functional Requirements (MUST-Have):**
- FR-1: Users view pricing page with plan options (Free, Monthly $29, Annual $290)
- FR-2: Users initiate subscription from pricing page + in-app prompts
- FR-3: Stripe payment form (credit card, tokenized)
- FR-4: Subscription confirmation page (review before final charge)
- FR-5: Stripe charges user; subscription created if successful
- FR-6: Premium features unlocked immediately (feature flag set)
- FR-7: Confirmation email with subscription details + next billing date
- FR-8: Users view active subscription in account settings
- FR-9: Payment failures handled gracefully (error message + retry)

**Non-Functional Requirements:**
- Performance: <2s subscription creation (e2e); <500ms API response time
- Scalability: 10K concurrent users; 100K subscriptions/month
- Security: PCI Level 1 compliance; CSRF protection; OAuth2 auth
- Reliability: 99.9% uptime SLA; <0.1% payment error rate

**Acceptance Criteria (5 BDD Scenarios):**
- AC-1: User subscribes with valid card → payment succeeds, subscription active
- AC-2: User with declined card → error message, no subscription created, can retry
- AC-3: User with expired card → client-side validation catches, form error shown
- AC-4: User already has active subscription → "already subscribed" message, no duplicate
- AC-5: (Edge case) Billing date at month-end (Jan 31) → proration + renewal date handling

**External Dependencies:**
- Stripe API v3 (payment processing)
- Email service (Sendgrid/AWS SES)
- Feature flag system (existing)

---

## API Contract

### OpenAPI 3.0 Specification

```yaml
openapi: 3.0.0
info:
  title: Subscription API
  version: 1.0.0
  description: Manage recurring subscriptions and payments
servers:
  - url: https://api.example.com/v1
    description: Production

paths:
  /subscriptions:
    post:
      summary: Create subscription
      operationId: createSubscription
      tags:
        - Subscriptions
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - plan_id
                - payment_method_id
              properties:
                plan_id:
                  type: string
                  example: "monthly-premium"
                  enum: ["monthly-premium", "annual-premium"]
                payment_method_id:
                  type: string
                  example: "pm_1234567890"
                  description: "Stripe payment method ID (tokenized card)"
      responses:
        201:
          description: Subscription created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Subscription'
        400:
          description: Invalid request
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                error: "plan_id is required"
        401:
          description: Unauthorized (missing/invalid auth token)
        402:
          description: Payment failed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                error: "Card declined"
                stripe_error_code: "card_declined"
        409:
          description: Conflict (user already has active subscription)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                error: "User already has active subscription"
        422:
          description: Unprocessable entity (validation error)

    get:
      summary: List user's subscriptions
      operationId: listSubscriptions
      tags:
        - Subscriptions
      parameters:
        - in: query
          name: status
          schema:
            type: string
            enum: ["pending", "active", "paused", "canceled"]
          description: "Filter by subscription status"
      responses:
        200:
          description: List of subscriptions
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Subscription'

  /subscriptions/{subscription_id}:
    get:
      summary: Get subscription details
      operationId: getSubscription
      tags:
        - Subscriptions
      parameters:
        - in: path
          name: subscription_id
          required: true
          schema:
            type: string
            format: uuid
      responses:
        200:
          description: Subscription details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Subscription'
        404:
          description: Subscription not found

    patch:
      summary: Update subscription
      operationId: updateSubscription
      tags:
        - Subscriptions
      parameters:
        - in: path
          name: subscription_id
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                  enum: ["paused", "canceled"]
      responses:
        200:
          description: Subscription updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Subscription'

  /payment-methods:
    post:
      summary: Add payment method
      operationId: createPaymentMethod
      tags:
        - PaymentMethods
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - stripe_payment_method_id
              properties:
                stripe_payment_method_id:
                  type: string
                  example: "pm_1234567890"
                is_default:
                  type: boolean
                  default: false
      responses:
        201:
          description: Payment method created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaymentMethod'

components:
  schemas:
    Subscription:
      type: object
      properties:
        id:
          type: string
          format: uuid
        user_id:
          type: integer
        plan_id:
          type: string
          example: "monthly-premium"
        stripe_subscription_id:
          type: string
          example: "sub_1234567890"
        status:
          type: string
          enum: ["pending", "active", "paused", "canceled"]
        started_at:
          type: string
          format: date-time
          nullable: true
        next_billing_date:
          type: string
          format: date
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    PaymentMethod:
      type: object
      properties:
        id:
          type: string
          format: uuid
        user_id:
          type: integer
        stripe_payment_method_id:
          type: string
        card_last_four:
          type: string
          example: "4242"
        card_brand:
          type: string
          example: "Visa"
        is_default:
          type: boolean
        created_at:
          type: string
          format: date-time

    Error:
      type: object
      properties:
        error:
          type: string
        stripe_error_code:
          type: string
          nullable: true
```

### Endpoint Details

#### POST /subscriptions — Create Subscription

**Request:**
```json
{
  "plan_id": "monthly-premium",
  "payment_method_id": "pm_1234567890"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": 123,
  "plan_id": "monthly-premium",
  "stripe_subscription_id": "sub_1234567890",
  "status": "active",
  "started_at": "2026-07-10T15:30:00Z",
  "next_billing_date": "2026-08-10",
  "created_at": "2026-07-10T15:30:00Z",
  "updated_at": "2026-07-10T15:30:00Z"
}
```

**Error (402 Payment Failed):**
```json
{
  "error": "Your card was declined",
  "stripe_error_code": "card_declined"
}
```

---

## Database Schema

### Entity-Relationship Diagram

```
User (existing) ──────────────────┐
                                  │
                    1 ────────── ∞ │
                                  │
                        Subscription
                        ├─ id (UUID)
                        ├─ user_id (FK)
                        ├─ plan_id (FK)
                        ├─ stripe_subscription_id (unique)
                        ├─ status (enum)
                        ├─ next_billing_date (date)
                        └─ timestamps

                        │
                        │ 1 ────────── ∞
                        │
                       Invoice
                       ├─ id (UUID)
                       ├─ subscription_id (FK)
                       ├─ stripe_invoice_id (unique)
                       ├─ status (enum)
                       ├─ amount_cents (int)
                       ├─ due_date (date)
                       └─ timestamps

Plan (lookup) ──────────┐
                        │
                1 ────── ∞
                        │
                   Subscription

User ──────┐
           │
   1 ────┬─┴─ ∞
         │
    PaymentMethod
    ├─ id (UUID)
    ├─ user_id (FK)
    ├─ stripe_payment_method_id (unique)
    ├─ card_last_four
    ├─ card_brand
    └─ is_default (bool)
```

### Table Definitions

#### Table: subscriptions

```sql
CREATE TABLE subscriptions (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID, immutable',
  user_id INT NOT NULL COMMENT 'Foreign key to users table',
  plan_id VARCHAR(50) NOT NULL COMMENT 'Foreign key to plans table',
  stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE COMMENT 'Stripe subscription ID for webhook matching',
  status ENUM('pending', 'active', 'paused', 'canceled') DEFAULT 'pending' COMMENT 'Subscription lifecycle state',
  started_at TIMESTAMP NULL COMMENT 'When subscription became active (first charge processed)',
  next_billing_date DATE NOT NULL COMMENT 'Date of next charge (set from Stripe or calculated)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last modification time',
  deleted_at TIMESTAMP NULL COMMENT 'Soft delete for historical tracking',
  
  FOREIGN KEY fk_subscriptions_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY fk_subscriptions_plan (plan_id) REFERENCES plans(id) ON DELETE RESTRICT,
  UNIQUE KEY uk_user_active_subscription (user_id, status) WHERE status = 'active' COMMENT 'Ensure at most one active per user',
  
  INDEX idx_user_id_status (user_id, status) COMMENT 'Fast lookup: get user subscriptions by status',
  INDEX idx_stripe_subscription_id (stripe_subscription_id) COMMENT 'Webhook lookups: find subscription by Stripe ID',
  INDEX idx_next_billing_date (next_billing_date) COMMENT 'Renewal reminder queries'
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Table: payment_methods

```sql
CREATE TABLE payment_methods (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  user_id INT NOT NULL COMMENT 'Foreign key to users',
  stripe_payment_method_id VARCHAR(255) NOT NULL UNIQUE COMMENT 'Stripe payment method token',
  card_last_four CHAR(4) NOT NULL COMMENT 'Last 4 digits of card (for display)',
  card_brand VARCHAR(50) NOT NULL COMMENT 'Card network: Visa, Mastercard, Amex',
  is_default BOOLEAN DEFAULT FALSE COMMENT 'Default payment method for recurring charges',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY fk_payment_methods_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id) COMMENT 'Fast lookup: user payment methods'
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Table: invoices

```sql
CREATE TABLE invoices (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  subscription_id CHAR(36) NOT NULL COMMENT 'Foreign key to subscriptions',
  stripe_invoice_id VARCHAR(255) NOT NULL UNIQUE COMMENT 'Stripe invoice ID for reconciliation',
  status ENUM('draft', 'open', 'paid', 'failed', 'uncollectible') DEFAULT 'draft',
  amount_cents INT NOT NULL COMMENT 'Invoice total in cents (e.g., 2900 = $29.00)',
  currency VARCHAR(3) DEFAULT 'USD',
  due_date DATE NOT NULL,
  paid_at TIMESTAMP NULL COMMENT 'When payment was received',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY fk_invoices_subscription (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
  INDEX idx_subscription_id (subscription_id),
  INDEX idx_stripe_invoice_id (stripe_invoice_id),
  INDEX idx_status_due_date (status, due_date) COMMENT 'Find overdue unpaid invoices'
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Database Migrations

**File:** `db/migrations/20260715_000_create_subscription_tables.php`

**Migration Logic:**
- Create subscriptions table (primary entity)
- Create payment_methods table (payment storage)
- Create invoices table (billing records)
- Add indexes for query optimization
- Rollback drops all three tables in reverse order

**Execution:**
```bash
# Staging: validate migration
bin/cake migrations migrate --target=20260715_000

# Production: backup + migrate
# (backup done by ops team)
bin/cake migrations migrate --target=20260715_000
```

---

## System Architecture

### Architecture Diagram

```
┌─────────────────────────────────────┐
│ Client (Web/iOS/Android)            │
│  - Pricing page (view plans)        │
│  - Stripe payment form              │
│  - Subscription dashboard           │
└────────────────┬────────────────────┘
                 │ HTTPS POST /api/subscriptions
                 │
┌────────────────▼────────────────────────────────────────┐
│ CakePHP API Gateway                                    │
│  ├─ SubscriptionsController                            │
│  │   ├─ create() → validate → call service             │
│  │   ├─ show() → fetch from DB                         │
│  │   └─ index() → list user subscriptions              │
│  └─ Middleware Stack                                   │
│      ├─ Auth (JWT token validation)                    │
│      ├─ CSRF (token verification)                      │
│      ├─ RateLimit (100 req/min per user)              │
│      └─ ErrorHandler                                   │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ Service Layer (Business Logic)                         │
│  ├─ SubscriptionService                                │
│  │   ├─ createSubscription()                           │
│  │   │   ├─ Validate user + plan + payment method      │
│  │   │   ├─ Call Stripe API (create subscription)      │
│  │   │   ├─ Stripe returns: subscription_id + status   │
│  │   │   ├─ Save Subscription record to DB             │
│  │   │   ├─ Set premium_access feature flag            │
│  │   │   └─ Queue email job (async)                    │
│  │   └─ Error handling: Stripe failure → 402 response  │
│  │                                                      │
│  └─ PaymentMethodService                               │
│      ├─ createPaymentMethod() → save tokenized card    │
│      └─ setDefault() → update is_default flag          │
└────────────┬─────────────────┬──────────────┬───────────┘
             │                 │              │
   ┌─────────▼──┐    ┌────────▼────────┐    │
   │   MySQL    │    │  Stripe API v3  │    │
   │   Database │    │  (External)     │    │
   │            │    │                 │    │
   │ ├─ users   │    │ POST /v1/cust./ │    │
   │ │  subscri-│    │  subscriptions  │    │
   │ │  ptions  │    │  ├─ user_id     │    │
   │ │ ├─ plan  │    │  ├─ price_id    │    │
   │ │ └─ status│    │  └─ payment_meth│    │
   │ │          │    │                 │    │
   │ ├─ payment │    │ Webhooks:       │    │
   │ │  methods │    │ customer.sub... │    │
   │ │          │    │ invoice.created │    │
   │ │ ├─ card_ │    │ invoice.payment │    │
   │ │ │ last_  │    │ _succeeded      │    │
   │ │ │ four   │    │                 │    │
   │ │ │        │    │ (Stripe manages)│    │
   │ │ └─ brand │    │                 │    │
   │ │          │    │                 │    │
   │ └─ invoices│    └─────────────────┘    │
   │            │                            │
   └────────────┘                            │
                                   ┌────────▼─────┐
                                   │ Job Queue    │
                                   │ (Async)      │
                                   │              │
                                   │ Send Email:  │
                                   │ - Confirm.   │
                                   │ - Renewal    │
                                   │   reminder   │
                                   │              │
                                   │ External:    │
                                   │ Sendgrid API │
                                   └──────────────┘
```

### Data Flow: Create Subscription

```
1. User → POST /api/subscriptions
   {"plan_id": "monthly-premium", "payment_method_id": "pm_1234567890"}

2. API layer
   - Validate auth (JWT token present)
   - Validate CSRF token
   - Parse JSON body
   - Route to SubscriptionsController::create()

3. SubscriptionsController::create()
   - Get user_id from auth context
   - Call SubscriptionService::createSubscription(user_id, plan_id, payment_method_id)

4. SubscriptionService::createSubscription()
   - Validate input (plan exists, payment method exists for this user)
   - Check no active subscription exists (prevent duplicates)
   - Call Stripe API:
     POST /v1/customers/:stripe_customer_id/subscriptions
     {
       "items": [{"price": "price_monthly_premium_usd"}],
       "payment_method": "pm_1234567890",
       "default_payment_method": "pm_1234567890",
       "description": "Monthly Premium subscription"
     }

5. Stripe responds (success)
   {
     "id": "sub_1234567890",
     "status": "active",
     "current_period_start": 1720617000,
     "current_period_end": 1723309000,
     "metadata": {...}
   }

6. SubscriptionService saves to DB
   INSERT INTO subscriptions (
     id, user_id, plan_id, stripe_subscription_id, status, 
     next_billing_date, created_at, updated_at
   ) VALUES (
     UUID(), 123, "monthly-premium", "sub_1234567890", "active",
     DATE_ADD(NOW(), INTERVAL 1 MONTH), NOW(), NOW()
   )

7. Set feature flag
   - Call feature_flag_service->set(123, "premium_access", true)
   - Feature flags cache updated (5min TTL)
   - Next API calls check flag → grant access

8. Queue async email job
   - Enqueue job: SendSubscriptionConfirmation(user_id=123, subscription_id=uuid)
   - Job worker processes later (background queue)

9. Return response to client (201)
   {
     "id": "550e8400-e29b-41d4-a716-446655440000",
     "user_id": 123,
     "plan_id": "monthly-premium",
     "stripe_subscription_id": "sub_1234567890",
     "status": "active",
     "next_billing_date": "2026-08-10",
     ...
   }

10. Email worker processes
    - Fetch subscription details from DB
    - Fetch user email from users table
    - Render email template: subscription_confirmation.html
    - Send via Sendgrid API
    - Log delivery (success or failure)

✓ Subscription creation complete (e2e: <2 seconds typically)
```

---

## Integration Points

### Stripe API Integration

**Service:** Payment processor and subscription manager

**Integration Type:** REST API (synchronous) + Webhooks (asynchronous)

**Key Endpoints:**
- `POST /v1/customers/:id/subscriptions` — Create subscription + charge card
  - Request: items (price_id), payment_method, description
  - Response: subscription object (id, status, current_period_end)

- `POST /v1/subscriptions/:id` — Update subscription (pause, resume)
  - Request: pause_collection, payment_behavior
  - Response: updated subscription object

- `DELETE /v1/subscriptions/:id` — Cancel subscription
  - Request: (optional) cancellation_details
  - Response: canceled subscription object

**Webhooks:**
- `customer.subscription.created` — Fired when subscription first created
  - Payload: subscription object
  - Handler: Verify webhook signature → lookup subscription in DB → confirm record exists

- `customer.subscription.updated` — Fired on renewal, plan change, pause
  - Payload: subscription object (with updated status)
  - Handler: Update local DB subscription.next_billing_date if changed

- `invoice.payment_succeeded` — Fired when charge succeeds
  - Payload: invoice object (status='paid')
  - Handler: Update invoice record (status='paid', paid_at=timestamp)

- `invoice.payment_failed` — Fired when charge declines
  - Payload: invoice object (status='failed')
  - Handler: Update invoice.status, send failure notification email

**Error Handling:**
- Network timeout (>30s) → Retry with exponential backoff
- Invalid API key → Log critical error; alert ops
- Declined card (4000 0000 0000 0002) → Return 402 Payment Required to user
- Rate limiting (>1000 req/sec) → Return 429; queue for retry

**Security:**
- API key stored in .env; never hardcoded or logged
- Webhook signature verified: `HMAC-SHA256(payload, webhook_secret)`
- No sensitive data (customer PII, card tokens) logged
- HTTPS enforced for all requests (TLS 1.2+)

**Data Mapping:**

| Local Field | Stripe Field | Notes |
|-------------|--------------|-------|
| subscription.id (UUID) | subscription.id (string) | Local ID distinct from Stripe ID |
| subscription.stripe_subscription_id | subscription.id | Stripe's subscription ID for lookups |
| subscription.user_id | customer.id (mapped) | User linked to Stripe customer via customer_id field |
| subscription.plan_id | items[0].price (string) | Plan maps to Stripe price object |
| subscription.status | subscription.status | Both use same enum: pending, active, paused, canceled |
| subscription.next_billing_date | subscription.current_period_end | Stripe provides Unix timestamp; convert to DATE |

---

### Feature Flag System Integration

**Service:** Gate premium features based on subscription status

**Integration Type:** In-process function calls + cache

**Operations:**
- `set_feature_flag(user_id, "premium_access", true)` — Grant premium features on subscription
- `get_feature_flag(user_id, "premium_access")` — Check if user has premium access

**Implementation:**
- Flags stored in users table (boolean columns or JSON blob)
- Cache: In-memory TTL=5min (reduce DB hits)
- Invalidation: Webhook handler + scheduled cron job (Phase 4+)

**Example (in CakePHP):**
```php
// Set flag on subscription creation
$this->FeatureFlag->set($user_id, 'premium_access', true);

// Check flag in controller (gated feature)
if ($this->FeatureFlag->isEnabled($user_id, 'premium_access')) {
  // Return premium analytics dashboard
} else {
  // Return free tier dashboard
}
```

---

### Email Service Integration

**Service:** Send subscription confirmations and reminders

**Integration Type:** Async job queue (non-blocking)

**Email Templates:**
- `subscription_confirmation` — Sent on subscription creation
  - Variables: user.name, plan.name, amount, next_billing_date, support_link
  - Delivery: <2 seconds after subscription created

- `renewal_reminder` — Sent 7 days before next billing
  - Variables: user.name, plan.name, next_billing_date
  - Trigger: Cron job 7 days before next_billing_date

- `payment_failed` — Sent when payment declines
  - Variables: user.name, failure_reason, retry_url
  - Trigger: Stripe webhook payment_failed

**Implementation:**
- Job enqueued: `SendSubscriptionEmail.enqueue({user_id, email_type, data})`
- Worker processes: Render template + call Sendgrid API
- Retry: Failed sends queued for retry (3x with exponential backoff)

**Security:**
- Email templates use HTML escaping (prevent XSS if user data embedded)
- No sensitive data (API keys, payment tokens) in email body
- Unsubscribe link required (GDPR compliance)

---

## Trade-Offs & Decisions

### Decision 1: Synchronous vs. Asynchronous Payment Processing

**Context:** Requirement specifies <2s subscription creation latency. User expects immediate feedback (is payment processing or failed?).

**Options Evaluated:**

**Option A: Synchronous (Chosen)**
- User submits payment → API calls Stripe API (blocking) → Stripe responds
- On success: Create DB subscription → Set feature flag → Return success
- On failure: Return error code + message to user
- Pros:
  - ✓ Immediate feedback (user knows instantly if payment succeeded)
  - ✓ Guaranteed consistency (payment + subscription in same transaction)
  - ✓ Simple to understand (sequential flow)
- Cons:
  - ✗ User experiences Stripe API latency (500ms added to request)
  - ✗ Risk of request timeout (if Stripe is slow, request may timeout)
- Stripe SLA: <500ms p95 typically (acceptable for MVP)

**Option B: Asynchronous**
- User submits payment → API queues job → Returns "processing" response
- Job worker calls Stripe asynchronously
- On success: Create DB subscription + send confirmation email
- On failure: Send failure email to user
- Pros:
  - ✓ Fast response (API returns immediately, <100ms)
  - ✓ Decoupled from Stripe latency
- Cons:
  - ✗ Eventual consistency (user doesn't know payment status immediately)
  - ✗ Complex to implement (webhook + cron reconciliation required)

**Decision: Option A (Synchronous)**
- Requirement explicitly targets <2s; Stripe latency (500ms) acceptable within budget
- Consistency is critical (avoid creating subscription if payment failed)
- MVP can afford sequential processing; refactor to async post-launch if needed
- Webhook from Stripe serves as backup confirmation (idempotent)

**Trade-off Accepted:** Higher perceived latency if Stripe slow; mitigated by UI spinner + timeout messaging.

---

### Decision 2: Local DB vs. Stripe as Source-of-Truth

**Context:** Subscription state must be current + queryable. Need fast reads without hitting Stripe API every time.

**Options:**

**Option A: Stripe as source-of-truth**
- Query Stripe for subscription state on every API request
- Cache in local DB (avoid repeated Stripe calls)
- Pro: Single source of truth (guaranteed consistency)
- Con: Every request hits Stripe API (500ms latency); slow; dependent on Stripe uptime

**Option B: Local DB as source-of-truth (Chosen)**
- Store subscription state in local MySQL DB
- Stripe is secondary (used for billing, webhooks for sync)
- Pro: Fast reads (DB query <10ms); independent of Stripe
- Con: Eventual consistency (slight delay if Stripe state changes)

**Decision: Option B (Local DB)**
- Requirement for <100ms API response time (Stripe query too slow)
- Accept eventual consistency (5-60min lag acceptable for subscription state)
- Mitigations:
  - Webhooks: Stripe sends events → update DB in real-time
  - Cron job: Daily reconciliation (Phase 4+) syncs any missed updates
  - User impact: Minimal (subscription change is rare event)

**Trade-off Accepted:** Eventual consistency vs. guaranteed real-time; mitigated by webhooks.

---

### Decision 3: Feature Flag Cache TTL

**Context:** Premium features gated by feature flag. Flag must be accurate but DB query on every request is expensive.

**Options:**

**Option A: No cache (query DB every request)**
- Pro: Guaranteed current flag state
- Con: DB overhead (10K req/sec = 10K queries/sec to users table)

**Option B: Cache with TTL (Chosen)**
- In-memory cache (5min TTL)
- Invalidation: Webhook updates + scheduled cron job
- Pro: Fast flag checks (<1ms cached lookup)
- Con: Slight delay (max 5min) if flag changed

**Decision: Option B (Cache with 5min TTL)**
- Acceptable lag: 5min delay in flag change is not critical
- Performance benefit: Reduce DB load by 90%+ for flag checks
- Invalidation: Webhook + cron ensure cache stays fresh

---

## Performance Considerations

### Performance Targets

| Target | Metric | Implementation |
|--------|--------|-----------------|
| API Response (create subscription) | <100ms | Async email job; no blocking I/O except Stripe call |
| Subscription Creation (e2e) | <2s | Stripe API <500ms; DB insert <10ms; total <2s |
| List subscriptions (API) | <50ms | DB query with index on (user_id, status) |
| Feature flag lookup | <1ms | In-memory cache (5min TTL) |
| DB query latency | <10ms p95 | Index on (user_id, status); select specific columns only |

### Optimization Strategies

**Database Optimization:**
- Index `(user_id, status)` for fast user subscription lookups
- Index `(stripe_subscription_id)` for webhook lookups
- Separate index on `(next_billing_date)` for renewal queries
- Avoid SELECT * queries; select only required columns
- Use eager loading: JOIN plans table in single query (avoid N+1)

**Query Examples:**
```sql
-- Fast: uses index (user_id, status)
SELECT * FROM subscriptions WHERE user_id = 123 AND status = 'active';

-- Fast: uses index (stripe_subscription_id)
SELECT * FROM subscriptions WHERE stripe_subscription_id = 'sub_1234567890';

-- Slow: no index, table scan
SELECT * FROM subscriptions WHERE plan_id = 'monthly-premium';

-- Good: eager load plan (avoids N+1)
SELECT s.*, p.* FROM subscriptions s 
  JOIN plans p ON s.plan_id = p.id 
  WHERE s.user_id = 123;
```

**Caching Strategy:**
- Feature flag cache (in-memory, 5min TTL): Reduce users table queries
- Plan cache (lookup table, never changes): Cache in-memory or Redis
- Subscription status: NOT cached (must be current)

**Asynchronous Processing:**
- Email notifications queued (don't block API response)
- Webhook processing async (background job)
- Report generation (if applicable) deferred to batch job

---

## Security Considerations

### Authentication & Authorization

**Auth Method:** JWT bearer tokens (from user session)

- Token issued on login; expires after 24 hours
- Token stored in HTTP-only cookie (secure flag set, not accessible to JavaScript)
- Token includes user_id + role (used to authorize actions)

**Authorization Checks:**
- User can only view/modify their own subscriptions
  ```php
  // In SubscriptionsController
  $subscription = $this->Subscriptions->findById($id);
  if ($subscription->user_id !== auth()->user_id) {
    return 403 Forbidden; // Not authorized
  }
  ```
- Admin endpoints (if any): Require admin role flag
- No authorization needed for Stripe webhook endpoints (webhook signature verification instead)

### Data Protection

**Sensitive Data Classification:**

| Data | Classification | Protection |
|------|-----------------|-----------|
| Card number | PCI | Never stored locally; Stripe tokenization only |
| Stripe payment method token | Sensitive | Encrypted at rest in DB; HTTPS in transit |
| Subscription ID | Non-sensitive | Stored plaintext; used for API responses |
| User email | PII | Encrypted at rest; GDPR delete on request |
| Billing history | PII | Retained per payment processor requirements (7 years) |

**Encryption:**
- At rest: Database encryption (MySQL AES_ENCRYPT for sensitive columns)
- In transit: TLS 1.2+ for all HTTPS connections (enforced via .env)
- Secrets: API keys stored in .env (never in code, version control, or logs)

### CSRF Protection

**Implementation:**
- All POST/PATCH/DELETE endpoints require CSRF token (in request header or form data)
- Token generated on page load; stored in session
- CakePHP CSRF middleware validates on every request
- Missing/invalid token → 403 Forbidden

**Example:**
```html
<!-- Form includes CSRF token -->
<form method="POST" action="/api/subscriptions">
  <input type="hidden" name="csrf_token" value="...">
</form>
```

### Input Validation

**Validation Rules:**
- `plan_id`: Required, must match existing plan in plans table
- `payment_method_id`: Required, must be valid Stripe token (format validation)
- `status`: Enum validation (pending, active, paused, canceled)

**Implementation (CakePHP):**
```php
public function validationDefault(Validator $validator) {
  $validator
    ->notEmpty('plan_id')
    ->inList('plan_id', ['monthly-premium', 'annual-premium'])
    ->notEmpty('payment_method_id')
    ->regex('payment_method_id', '/^pm_[a-z0-9]+$/i')
    ->inList('status', ['pending', 'active', 'paused', 'canceled']);
  return $validator;
}
```

### PCI Compliance

**Scope:** No raw card data handled locally

**Requirements:**
- Annual PCI Level 1 audit (certify no card data in logs/backups)
- Stripe tokenization: All card data stays in Stripe systems
- No card data in error messages, logs, or backups
- API logs sanitized: Never log payment method tokens

**Implementation:**
- Stripe Elements form: Card data never touches our servers
- Webhook signature verification: Ensures messages from Stripe
- No local card storage: Use Stripe tokens exclusively

### Rate Limiting

**Implementation:**
- Per-user rate limit: 100 requests/minute (prevent brute-force attacks)
- Per-IP rate limit: 1000 requests/minute (prevent DoS)
- Return 429 Too Many Requests if limit exceeded

**Example (CakePHP middleware):**
```php
public function rateLimit($user_id) {
  $key = "rate_limit:$user_id";
  $count = Cache::increment($key, 1, 'default', 60);
  if ($count > 100) {
    throw new TooManyRequestsException('Rate limit exceeded');
  }
}
```

### Secrets Management

**API Keys:**
- Stripe: Live key stored in .env; test key in .env.testing
- Email: Sendgrid API key in .env
- JWT signing: Secret in .env

**Best Practices:**
- Rotate keys quarterly (security policy)
- Never log or expose keys in error messages
- Use separate keys for staging vs. production
- Service accounts (for ops): Minimal required permissions

---

## Deployment Strategy

### Pre-Deployment Validation

**Checklist:**
- [ ] All unit tests passing (100% of services + models)
- [ ] Integration tests passing (API happy path + error scenarios)
- [ ] Performance tests passing (latency <2s for subscription creation)
- [ ] Database migration validated on staging (syntax, no locks, no data loss)
- [ ] API contract reviewed (endpoints, response schemas, error codes)
- [ ] Security review completed (auth, CSRF, PCI compliance)
- [ ] Stripe webhook endpoints configured (URL + signing secret)
- [ ] Email templates reviewed (no PII exposure, correct formatting)
- [ ] Monitoring configured (latency, error rate, payment success rate)
- [ ] Rollback plan documented (feature flag disable, DB rollback process)
- [ ] PM/Tech Lead approval documented

### Deployment Steps

**Phase 1: Database (Day 1, Off-hours)**
1. Backup production DB (prior to migration)
2. Run migration on production:
   ```bash
   bin/cake migrations migrate --target=20260715_000
   ```
3. Verify tables created:
   ```sql
   SHOW TABLES; -- Verify subscriptions, payment_methods, invoices exist
   DESCRIBE subscriptions; -- Verify columns and indexes
   ```
4. Verify indexes:
   ```sql
   SHOW INDEX FROM subscriptions; -- Verify idx_user_id_status, etc.
   ```

**Phase 2: Code Deployment (Day 2, Low-traffic hours)**
1. Deploy API code (controllers, services, models)
2. Deploy feature: subscription endpoints initially disabled (feature flag off)
3. Verify no errors in logs: `tail -f /var/log/app/production.log`

**Phase 3: Validation (Day 2, 2-4 hours)**
1. Manual smoke test (Postman):
   ```bash
   POST /api/subscriptions
   {
     "plan_id": "monthly-premium",
     "payment_method_id": "pm_test_..."
   }
   # Should return 201 with subscription object
   ```
2. Check database: Verify subscription record created
3. Monitor metrics: API response time, error rate, DB query time
4. Check logs: No warnings or critical errors

**Phase 4: Feature Flag Rollout (Day 3 onward)**
1. Enable for 10% of users (canary release)
   - Feature flag: `subscription_enabled_percent = 10`
   - Monitor 2-4 hours: error rate, latency, user feedback
2. If stable, increase to 50%
   - Monitor 4-8 hours
3. If stable, increase to 100%
   - Monitor 24+ hours (observe billing cycle patterns)

### Rollback Plan

**If Critical Issue Found:**

1. **Immediate:** Disable feature flag
   ```bash
   config/subscription_enabled_percent = 0  # Reverts to free-tier only
   ```

2. **Assess:** Data loss risk?
   - If no data corruption: Safe to proceed with rollback
   - If data corruption: Restore from backup

3. **Database Rollback** (if needed):
   ```bash
   bin/cake migrations rollback --target=20260714_999  # Previous version
   # This drops subscriptions, payment_methods, invoices tables
   ```

4. **Restore from Backup** (if data corruption):
   - Ops team restores DB snapshot (pre-deployment)
   - Verify data integrity
   - Re-deploy with fix

5. **Post-Incident:**
   - Root cause analysis (RCA)
   - Fix issue in code
   - Re-test thoroughly before re-deployment

---

**Design Version:** 1.0 | **Last Updated:** 2026-07-10 | **Next Phase:** 4 (dev-agent — implementation)

**Lane2 Ready:** ✓ **TRUE** — gates dev-agent intake

**Design Approval:**
- ✓ Deepak Vaishnav (Tech Lead, Web): Approved
- ✓ Security Team: Approved (PCI scope, CSRF protection, webhook security)
- ✓ Amar Singh (PM/PO): Approved
