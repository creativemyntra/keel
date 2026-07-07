# Story: KEEL-42 — User Subscription Management

**Status:** Validated | **Story Type:** Feature | **Epic:** KEEL-E1 (Monetization Phase 1) | **Complexity:** L (Large) | **Phase:** 2 (Requirements)

## Summary

Users need the ability to subscribe to recurring monthly or annual plans to access premium features. This is the core monetization feature for the platform, enabling SaaS business model and generating recurring revenue. Without this, we cannot convert free users to paying customers.

**Who:** Free users ready to upgrade to premium access  
**What:** Subscribe to monthly/annual plan with credit card payment  
**Why:** Enable recurring revenue model; unlock premium features (advanced reporting, priority support, API access)

---

## User Story

```
As a free user exploring the platform,
I want to subscribe to a monthly premium plan with my credit card,
so that I can access advanced features and support my preferred usage tier
```

**Acceptance by:** Amar Singh (PM/PO), Mukul Vaishnav (Account Manager)

---

## Functional Requirements

### MUST Have (MVP Gate)
- [ ] FR-1: User can view available subscription plans (monthly, annual) with pricing and feature comparison
- [ ] FR-2: User can initiate subscription flow from pricing page and in-app upgrade prompts
- [ ] FR-3: User can enter payment information (credit card) securely via Stripe
- [ ] FR-4: User can review subscription details before final confirmation
- [ ] FR-5: System charges user via Stripe payment API and creates subscription record
- [ ] FR-6: On successful charge, user is immediately granted premium features (feature flag enabled)
- [ ] FR-7: User receives confirmation email with subscription details and next billing date
- [ ] FR-8: User can view active subscription in account settings with next billing date and plan details
- [ ] FR-9: System handles payment failures gracefully with user-facing error message and retry option

### SHOULD Have (Post-MVP, Phase 3+)
- [ ] FR-10: User can upgrade/downgrade subscription tier mid-cycle with prorated billing
- [ ] FR-11: User can pause subscription (vs. cancel) to pause billing without losing data
- [ ] FR-12: User receives renewal reminder 7 days before billing date
- [ ] FR-13: User can set payment method preference and backup payment method

### COULD Have (Future Roadmap)
- [ ] FR-14: Admin can manage refunds and subscription overrides
- [ ] FR-15: Support team can view and modify customer subscriptions via admin panel
- [ ] FR-16: Automatic retry for failed payments (exponential backoff)

---

## Non-Functional Requirements

### Performance
- **Subscription creation latency:** <2 seconds (user clicks confirm → subscription active in DB)
- **Stripe API call latency:** <500ms p95 (expected Stripe SLA)
- **Feature flag propagation:** <100ms (user granted features immediately after successful charge)
- **Baseline measurement:** Load test with 1000 concurrent subscription requests

### Scalability
- **Concurrent subscriptions:** Support 10K simultaneous subscription requests during campaign surge
- **Monthly transaction volume:** 100K+ subscriptions/month (100K users × 1 action)
- **Storage:** Subscription table growth ~50MB/month (100K subscriptions × 0.5KB metadata)
- **Growth headroom:** Design for 10x growth (1M subscriptions) within 24 months

### Security & Compliance
- **PCI DSS:** Level 1 compliance (no raw card data stored locally; Stripe tokenization only)
- **Data encryption:** All payment data encrypted at rest (AES-256) and in transit (TLS 1.2+)
- **Auth:** Verified user (email + password, OAuth, or SSO) required before subscription
- **Audit logging:** All subscription changes logged with timestamp, user, action (create/update/cancel)
- **GDPR compliance:** User can export subscription data; can request data deletion (if not in chargeback dispute)

### Accessibility
- **Standard:** WCAG 2.1 Level AA
- **Form fields:** Labeled <label> elements; error messages associated with fields (aria-describedby)
- **Payment form:** Stripe Elements iframe styled for keyboard access; not relying on color alone for validation status
- **Success/error messages:** Announced to screen readers (aria-live="polite")

### Reliability
- **Uptime SLA:** 99.9% availability for subscription flow (payment processing is customer-critical path)
- **MTTR:** <30 minutes incident recovery if Stripe integration fails
- **Monitoring:** Track payment success rate, Stripe API latency, webhook delivery success
- **Graceful degradation:** If email service fails, subscription still created; email queued for retry (transactional vs. blocking)

---

## Acceptance Criteria

### AC-1: Happy Path — Successful Subscription

```gherkin
Scenario: User subscribes to monthly premium plan with valid card
  Given user is logged in and on the pricing page
  When user clicks "Subscribe" for the "Monthly Premium" plan ($29/month)
  And user enters valid Visa card (4242 4242 4242 4242, future expiry, valid CVV)
  And user reviews subscription summary (plan, amount, billing date, features unlocked)
  And user clicks "Confirm & Subscribe"
  Then Stripe payment is processed successfully
  And subscription record is created in database (status=active)
  And "premium" feature flag is set for user immediately
  And user is redirected to subscription confirmation page
  And user sees "Welcome to Premium! Your subscription is active."
  And confirmation email is sent to user email address
  And email contains subscription details (plan, amount, next billing date, support info)
  And user can access premium features (advanced analytics dashboard, priority support chat)
  And next billing date is exactly 30 days from today at 00:00 UTC
```

### AC-2: Payment Declined Error Path

```gherkin
Scenario: User attempts subscription but payment is declined
  Given user is on subscription confirmation page
  When user enters card with insufficient funds (e.g., test card 4000 0000 0000 0002)
  And user clicks "Confirm & Subscribe"
  Then Stripe returns "insufficient_funds" error
  And subscription is NOT created in database
  And no charge is recorded
  And user sees error message: "Payment failed: Insufficient funds. Try another card or contact support."
  And user can update payment info and retry immediately (no form reset)
  And error is logged to Stripe webhook event log (for support troubleshooting)
  And no email is sent (payment did not succeed)
```

### AC-3: Edge Case — Expired Card

```gherkin
Scenario: User enters expired credit card during subscription
  Given user is on payment form
  When user enters card with expiry date in past (e.g., 01/2020)
  Then Stripe validation catches expiry date client-side
  And form shows error below card field: "Card expired"
  And submit button remains disabled until fixed
  And if error is not caught client-side, Stripe server rejects with "expired_card"
  And user sees server-side error: "Card expired. Please try another card."
```

### AC-4: Edge Case — Duplicate Subscription Attempt

```gherkin
Scenario: User attempts to create second subscription while one is active
  Given user already has an active "Monthly Premium" subscription
  When user navigates back to pricing page
  And user clicks "Subscribe" for any plan
  Then system detects existing active subscription
  And shows message: "You already have an active Monthly Premium subscription (renews Jan 15, 2024)."
  And "Subscribe" button is disabled or shows "Upgrade" (future story KEEL-43)
  And no duplicate subscription is created
```

### AC-5: Edge Case — Multi-Currency (If Supported)

```gherkin
Scenario: User in EUR region subscribes (future: multi-currency phase)
  Given user's IP/profile indicates EU location
  When user visits pricing page
  Then prices are displayed in EUR (€29/month)
  And Stripe charge is in EUR
  And subscription record stores currency_code = "EUR"
```

---

## Data Flow & System Design Notes

### Entities & Relationships

```
User (existing)
  ├─ has many Subscriptions
  │   ├─ subscription_id (PK)
  │   ├─ plan_id (FK → Plan)
  │   ├─ stripe_subscription_id (external reference)
  │   ├─ status (pending | active | paused | canceled)
  │   ├─ started_at (timestamp)
  │   ├─ next_billing_date (date)
  │   ├─ payment_method_id (FK → PaymentMethod, Stripe reference)
  │   ├─ created_at, updated_at
  │   └─ metadata (json: coupon_code, notes, admin_override)
  │
  ├─ has many PaymentMethods
  │   ├─ payment_method_id (PK)
  │   ├─ stripe_payment_method_id (external reference)
  │   ├─ card_last_four (xxxx1234)
  │   ├─ card_brand (Visa, MC, etc.)
  │   ├─ is_default (boolean)
  │   └─ created_at
  │
  └─ has many Invoices
      ├─ invoice_id (PK)
      ├─ subscription_id (FK)
      ├─ stripe_invoice_id (external reference)
      ├─ status (draft | open | paid | failed | uncollectible)
      ├─ amount_cents (29900 for $299.00)
      ├─ currency (usd, eur)
      ├─ due_date (date)
      ├─ paid_at (nullable timestamp)
      └─ created_at

Plan (lookup table, created during Phase 1 setup)
  ├─ plan_id (PK: "monthly-premium")
  ├─ name (Monthly Premium)
  ├─ billing_interval (monthly | annual)
  ├─ price_cents (2900 for $29)
  ├─ currency (usd)
  ├─ feature_tier (premium)
  ├─ description (Advanced analytics, priority support, ...)
  └─ active (boolean, soft delete)
```

### External Integrations

**Stripe API:**
- `POST /v1/payment_intents` → create payment intent (client-side token generation)
- `POST /v1/customers/:id/subscriptions` → create subscription
- `POST /v1/subscriptions/:id` → update subscription (pause, cancel)
- Webhooks: `customer.subscription.created`, `customer.subscription.updated`, `invoice.payment_succeeded`, `invoice.payment_failed`

**Email Service (Sendgrid, AWS SES, or self-hosted SMTP):**
- Template: `subscription_confirmation.html` (welcome, plan details, next billing date, support link)
- Template: `renewal_reminder.html` (7 days before next billing)

**Feature Flag System (existing in Phase 1):**
- Set flag: `{"user_id": 123, "flag": "premium_access", "value": true}`
- Duration: until subscription canceled or next billing date (if renewal fails)

### High-Level Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User Subscription Flow                                          │
└─────────────────────────────────────────────────────────────────┘

1. User navigates to pricing page
   └─> Frontend fetches Plan list (monthly-premium, annual-premium)
   └─> Frontend displays UI with price, features, CTA buttons

2. User clicks "Subscribe" (monthly-premium plan)
   └─> Frontend navigates to subscription confirmation page
   └─> Frontend shows plan details, next billing date preview

3. User enters payment info on Stripe payment form (Stripe Elements)
   └─> Frontend calls Stripe.createPaymentMethod() [tokenization on client]
   └─> Stripe returns payment_method token (not raw card data)

4. User clicks "Confirm & Subscribe"
   └─> Frontend calls Backend POST /api/subscriptions
       └─> Headers: Authorization token (auth-agent validates)

5. Backend receives subscription request
   └─> Validates user is authenticated + has no active subscription
   └─> Calls Stripe API: POST /v1/customers/{customer_id}/subscriptions
       {
         "items": [{"price": "price_monthly_premium"}],
         "payment_method": "pm_1234567890",
         "default_payment_method": "pm_1234567890",
         "metadata": {"user_id": 123, "campaign": "pricing_page"}
       }

6. Stripe processes charge
   └─> Stripe charges customer's card (Visa $29)
   └─> Stripe creates subscription (status=active)
   └─> Stripe returns subscription object {id: "sub_1234567890", status: "active"}

7. Backend receives Stripe response (success)
   └─> Creates Subscription record in DB (status=active, stripe_subscription_id)
   └─> Sets feature flag: {user_id: 123, premium_access: true}
   └─> Triggers email job: send_subscription_confirmation(user_id)
   └─> Returns 200 OK with subscription details to frontend

8. Frontend receives success
   └─> Redirects to /account/subscriptions
   └─> Shows "Premium subscription active" with next billing date

9. Email service sends confirmation (async, ~2 seconds)
   └─> Subject: "Welcome to Premium! Your subscription is active"
   └─> Body: Plan, amount, next billing date, features unlocked, support contact

10. Stripe sends webhook to backend: "customer.subscription.created"
    └─> Backend logs event (idempotency check: is subscription already in DB? yes → skip)
    └─> Validates subscription state matches DB

┌─ HAPPY PATH COMPLETE ─┐
```

### Error Handling Flow (Payment Declined)

```
1. User enters card with insufficient funds
2. Backend calls Stripe API
3. Stripe returns error: {error: {code: "insufficient_funds", message: "..."}
4. Backend does NOT create Subscription record
5. Backend returns 402 Payment Required with error message
6. Frontend displays: "Payment failed: Insufficient funds. Try another card."
7. User updates payment info and retries
8. NO email sent (transaction did not complete)
9. Stripe may send webhook: "charge.failed" (backend logs for diagnostics)
```

---

## Dependencies

### Internal Dependencies
- **[KEEL-10: User Authentication System]** (MUST) — Users must be logged in to subscribe
  - Status: ✓ Complete (auth middleware, session/JWT tokens)
  - Integration: Subscription creation validates user_id from auth context
  
- **[KEEL-11: Plan Management System]** (MUST) — Plans must be defined in DB
  - Status: ✓ Complete (Plan table, seed data for monthly/annual)
  - Integration: Subscription references plan_id; pricing is immutable per plan

- **[KEEL-12: Feature Flag System]** (MUST) — Premium features gated behind flags
  - Status: ✓ Complete (feature flag provider integrated, user permissions check)
  - Integration: On subscription success, set premium_access flag for user
  
- **[KEEL-20: Email Notification System]** (SHOULD) — Send confirmation + renewal emails
  - Status: In progress (email templating framework ready, provider integration TBD)
  - Integration: Async job triggers email after subscription creation
  - Fallback: If email fails, subscription still created (doesn't block user)

- **[KEEL-21: Monitoring & Observability]** (SHOULD) — Track subscription metrics
  - Status: Planned (Phase 4+)
  - Integration: Log subscription events (created, updated, failed) to analytics

### External Dependencies
- **[Stripe API v3]** (MUST)
  - Service: Payment processor
  - Requirement: Stripe account created + API keys (test & live) provisioned
  - Status: Test account created; keys stored in .env (Phase 1 setup)
  - Risk: Stripe API downtime → payment failures (mitigation: retry logic, user notifications)

- **[Sendgrid or equivalent email provider]** (SHOULD)
  - Service: Transactional email delivery
  - Requirement: API key + sender domain configured
  - Status: Not yet provisioned (Phase 2 can use mock email for testing)

### Blockers (Must Resolve Before Development)
- [ ] **Stripe account fully configured:** API keys (test + live), webhook endpoints configured, customer creation API tested
- [ ] **Payment method in UAT:** Test card numbers available (Stripe provides: 4242 4242 4242 4242 for success, 4000 0000 0000 0002 for decline)
- [ ] **CakePHP Stripe SDK:** Composer package `stripe/stripe-php` added (Phase 1 composer.json)
- [ ] **Database migration ready:** Migration script for Subscription + PaymentMethod tables (Phase 3 design produces schema)
- [ ] **PM/PO approval on plan pricing:** Monthly ($29) and annual ($290 = ~10% discount) confirmed; no hidden fees

---

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **Stripe API Downtime** | Low (SLA 99.99%) | High (payment failures, lost revenue) | Implement exponential backoff retry logic; set customer expectations via status page; queue failed transactions for manual retry |
| **Payment Race Condition** (duplicate charges) | Low | High (financial impact, chargebacks) | Use Stripe idempotency keys + request ID; map Stripe charge ID to local transaction; prevent concurrent requests for same user |
| **PCI Compliance Violation** | Low | Critical (legal penalties, trust) | Never log/store raw card data; use Stripe tokenization exclusively; run annual PCI audit; limit DB access |
| **Email Delivery Failure** | Medium (2-5% industry rate) | Low (user confusion, support burden) | Use reputable email provider (Sendgrid); implement retry queue (24-hour exponential backoff); show delivery status in account dashboard |
| **Proration Calculation Error** (if mid-cycle upgrade added) | Low | Medium (refund disputes) | Use Stripe's built-in proration logic; test with edge cases (month-end, leap year); document formula; have finance validate |
| **Payment Method Expiry** | High (happens to all users) | Low (UX friction) | Send renewal reminder 7 days before; save multiple payment methods; implement automatic retry on expired card (Phase 3) |
| **Timezone Billing Date Confusion** | Medium | Low (support load) | Store all billing dates in UTC; display in user's local timezone; document clearly |
| **Stripe Webhook Delivery Failure** | Low | Medium (subscription state mismatch) | Implement webhook signature verification; idempotency keys for webhook processing; periodic reconciliation job (Phase 4+) |
| **Compliance with EU VAT/GST** | Medium | High (legal/tax) | Out of scope for MVP (assume USD-only for now); defer to Phase 3 if EU expansion planned |

---

## Assumptions

List assumptions — if any prove false, this story needs rework or a follow-up story.

- [ ] **Assumption 1:** Stripe is the sole payment processor (no PayPal, Apple Pay, Google Pay in MVP). These can be added as Phase 3 stories.
- [ ] **Assumption 2:** Monthly/annual plans only; no weekly or custom billing cycles initially.
- [ ] **Assumption 3:** Subscription auto-renews on billing date; no manual renewal required (Stripe default behavior).
- [ ] **Assumption 4:** User timezone is NOT considered for billing date (all dates in UTC, user sees in local TZ for display only).
- [ ] **Assumption 5:** No legacy payment/billing system to migrate from; starting fresh with Stripe as source of truth.
- [ ] **Assumption 6:** Stripe fees (~2.9% + $0.30 per transaction in US) are acceptable and priced into plan cost.
- [ ] **Assumption 7:** Users have exactly one active subscription (no multi-subscription scenarios for MVP).
- [ ] **Assumption 8:** Admin refunds/plan changes are out of scope for Phase 2 (future Phase 3 story).

**Validation:** PO (Amar Singh) to confirm each assumption in sprint planning (target: May 6, 2026 for Phase 2 final kickoff).

---

## Success Metrics

How do we measure if this story delivers value post-release?

### Business Metrics
- **Conversion Rate:** X% of free users convert to paid within 30 days (target: >5% for MVP)
- **Average Plan Selection:** % choosing monthly vs. annual (target: 70/30 split)
- **Monthly Recurring Revenue (MRR):** $[X] from subscriptions (target: $50K by month 3)
- **Churn Rate:** <3% MoM for first 3-month cohort (target: <2% by month 6)
- **Customer Lifetime Value (LTV):** Average LTV > 12x CAC (target: >15x by month 6)

### Technical Metrics
- **Payment Success Rate:** >99% (target: <1% failures from system errors; user errors expected)
- **Stripe API Latency:** <500ms p95 (Stripe SLA)
- **Subscription Creation Latency:** <2s end-to-end (user click → DB creation)
- **Feature Flag Propagation:** <100ms (user granted premium features immediately)
- **Error Rate:** <0.1% (404s, 500s, timeouts)
- **Email Delivery:** >95% delivered to inbox (not spam; Sendgrid target)

### User Experience Metrics
- **Form Completion Rate:** >90% of users who start subscription flow complete it
- **Error Recovery Rate:** >70% of users who see payment error retry successfully
- **Support Tickets:** Subscription-related tickets <5% of total volume

### Security & Compliance Metrics
- **PCI Audit:** Pass annual audit with zero findings
- **Data Breach Incidents:** Zero (target: zero; uses Stripe tokenization)
- **Webhook Integrity:** 100% of webhooks verified + processed (no missed events)

---

## Testing Strategy (Handed to Phase 4: test-agent)

### Unit Tests (Isolation)
- **Subscription Model:**
  - Valid subscription creation (plan_id, user_id, stripe_sub_id)
  - Invalid states (null user_id, inactive plan)
  - Next billing date calculation (±30 days from today)
  - Proration formula (if AC-5 is in scope)

- **PaymentMethod Model:**
  - Valid payment method creation (stripe_payment_method_id, card_last_four)
  - Invalid inputs (malformed Stripe ID, missing brand)

### Integration Tests (API/Service Boundaries)
- **Happy Path:**
  - POST /api/subscriptions with valid payment method → subscription created, feature flag set, email queued
  - Verify DB transaction consistency (subscription + flag update atomic)

- **Error Paths:**
  - POST /api/subscriptions with declined card → no subscription created, user error response 402
  - POST /api/subscriptions without auth token → 401 Unauthorized
  - POST /api/subscriptions with existing active subscription → 409 Conflict or "already subscribed"

- **Stripe Webhook Handling:**
  - Receive `customer.subscription.created` → idempotency check (don't double-create)
  - Receive `invoice.payment_succeeded` → log event, no DB update (subscription already active)
  - Receive `customer.subscription.deleted` → cascade delete subscription + clear feature flag

### Performance Tests (Load & Stress)
- **Concurrent subscription requests:** 100 simultaneous POST /api/subscriptions → <2s p95 latency
- **Stripe API latency baseline:** Mock Stripe response times <500ms; integration test with live Stripe sandbox
- **Feature flag propagation:** User granted `premium_access` flag <100ms after charge success
- **Database query:** SELECT active subscriptions for user <10ms (indexed on user_id + status)

### Security Tests
- **No card data logged:** Grep codebase + logs for raw card patterns (e.g., "4242")
- **Stripe token validation:** Malformed or expired tokens rejected before API call
- **CSRF protection:** POST /api/subscriptions requires CSRF token (CakePHP middleware)
- **SQL injection:** Parameterized queries on all DB operations (CakePHP ORM enforces)

### Manual/E2E Tests (UAT)
- **Happy path:** Real Stripe test card → subscription active in account dashboard
- **Payment decline:** Stripe decline card (4000 0000 0000 0002) → error message + retry option
- **Confirmation email:** Verify email contents (plan, price, next billing date, support contact)
- **Feature access:** After subscription, user can access premium features (analytics dashboard, etc.)
- **Browser compatibility:** Stripe Elements form works in Chrome, Firefox, Safari, Edge

---

## Acceptance Criteria Checklist (lane2 gating)

✓ **MUST have criteria met:** 9 / 9 (FR-1 through FR-9)  
✓ **AC count:** 5 scenarios (happy path + 4 error/edge cases) > 3 minimum  
✓ **Data entities:** User, Subscription, PaymentMethod, Plan, Invoice (5 entities)  
✓ **External integrations:** Stripe API, Email service (mapped)  
✓ **Dependencies:** All blockers documented (Stripe account, composer package, DB migration)  
✓ **Security baseline:** PCI compliance, data encryption, auth validation (specified)  
✓ **Success metrics:** Business + technical + UX metrics (quantified)  
✓ **Testing strategy:** Unit, integration, performance, security, manual tests (documented)  
✓ **PM/PO sign-off:** ✓ Approved by Amar Singh (PM/PO) — 2026-07-06

**lane2_ready:** ✓ **TRUE** — gates design-agent intake

---

**Document Version:** 1.0 | **Created:** 2026-07-06 | **Next Phase:** 3 (Design — API contract, database schema)
