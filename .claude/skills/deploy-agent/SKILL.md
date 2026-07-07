# deploy-agent SKILL

---
governed-by: ai-sdlc-governance
skill_version: 0.5.0
phase: 5
mode: production-deployment
---

## Overview

**deploy-agent** orchestrates production deployment of tested, secure code (from Phase 4) via staged rollout. Configures feature flags, executes migrations, sets up monitoring, documents runbooks, and drives go/no-go decision. Runs **POST-QA** on validated code (all lane2_ready=true from Phase 4).

**Command:** `/keel deploy --story=<story-id> [--mode=plan|execute] [--rollout=canary|blue-green|immediate]`  
**Branch:** `keel/deploy/<story-id>` (human-reviewed, human-merged)  
**Input:** Tested code (dev-agent), test results (test-agent), security report (sec-agent), design doc  
**Output:** `agent-output-schema.json` + deployment manifest + runbook + monitoring config (lane2_ready gates Phase 5+ maint-agent)

## Invocation

```bash
/keel deploy --story=KEEL-42 --mode=plan --rollout=canary
/keel deploy --story=KEEL-42 --mode=execute --rollout=canary
/keel deploy --story=KEEL-42 --mode=plan --rollout=blue-green
```

**Prompt Flow:**
1. Parse Phase 4 outputs (code + tests + security report)
2. Generate deployment plan (stages, rollout strategy, rollback procedures)
3. Create feature flag configuration
4. Create database migration execution script
5. Set up monitoring + alerts
6. Generate runbooks (procedures for ops team)
7. Generate go/no-go checklist
8. Output deployment manifest (ready for human approval)

## Deliverables (Phase 5 Scope)

### 1. Deployment Plan

**File:** `docs/deployment/KEEL-42-deployment-plan.md`

**Format:**
```markdown
# Deployment Plan: KEEL-42 Subscription System

**Release Date:** 2026-07-20 (Sunday, low-traffic window)  
**Rollout Strategy:** Canary (10% → 50% → 100%)  
**Estimated Duration:** 72 hours (3 days)  
**Rollback Window:** 7 days (can revert via feature flag)

## Pre-Deployment Checklist

- [ ] Code review completed (2/2 approvals)
- [ ] All Phase 4 tests passing (coverage ≥80%)
- [ ] Security scan cleared (no HIGH findings)
- [ ] Monitoring alerts configured
- [ ] Runbooks reviewed by ops team
- [ ] Database backup completed (pre-migration)
- [ ] Stakeholder approval documented (PM, Tech Lead, Ops Lead)
- [ ] Communication sent to customers (feature announcement, support contact)

## Deployment Stages

### Stage 1: Database Migration (Day 1, Off-Hours, 2 AM UTC)

**Step 1.1: Backup Production Database**
```bash
# AWS RDS backup (pre-deployment safety)
aws rds create-db-snapshot \
  --db-instance-identifier hart30-prod \
  --db-snapshot-identifier hart30-prod-pre-keel42-20260720
```

**Step 1.2: Run Migration**
```bash
# Deploy to staging first (validation)
bin/cake migrations migrate --target=20260715_000

# Production (after validation)
bin/cake migrations migrate --target=20260715_000
```

**Step 1.3: Verify Migration**
```sql
-- Verify tables created
SHOW TABLES;
-- Verify subscriptions table exists with correct schema
DESCRIBE subscriptions;
-- Verify indexes
SHOW INDEX FROM subscriptions;
-- Verify no locks (migration completed cleanly)
SHOW PROCESSLIST;
```

**Rollback (if critical issue):**
```bash
bin/cake migrations rollback --target=20260714_999
# This drops subscriptions, payment_methods, invoices tables
```

### Stage 2: Code Deployment (Day 1, 4 AM UTC)

**Step 2.1: Deploy API Code**
- Deploy updated controllers, services, models to production
- Feature flag: subscription_enabled = false (disabled initially)
- Verify no errors in logs: `tail -f /var/log/hart30/production.log`

**Step 2.2: Health Check**
```bash
# Verify API is responsive
curl -s https://api.hart30.io/health
# Response: HTTP 200 OK
```

### Stage 3: Canary Rollout (Days 1-3)

**Phase 3.1: 10% Users (2-4 hours, monitoring)**
- Enable feature flag for 10% of free users (~5K users)
- Monitor key metrics (error rate, latency, payment success rate)
- Expected: <0.1% error rate, <100ms API response, >99% payment success
- If stable: proceed to Phase 3.2
- If issues: disable feature flag, investigate, fix, re-enable

**Phase 3.2: 50% Users (4-8 hours, monitoring)**
- Expand to 50% of free users (~25K users)
- Monitor same metrics + customer support tickets
- If stable: proceed to Phase 3.3
- If issues: disable feature flag, investigate

**Phase 3.3: 100% Users (24+ hours, intensive monitoring)**
- Roll out to all free users
- Monitor continuously for 72 hours
- Alert thresholds: error rate >1%, latency >200ms, payment success <99%

### Stage 4: Post-Rollout (Day 4+)

- Monitor for 7 days (continue observing for anomalies)
- Collect customer feedback (NPS surveys, support tickets)
- Assess business metrics (conversion rate, churn, MRR)
- Archive deployment artifacts + runbooks

## Rollback Plan

**If critical issue found during rollout:**

1. **Immediate:** Disable feature flag (subscription_enabled = false)
   - Reverts all users to free tier immediately
   - No data loss (subscriptions remain in DB)
   - User experience: "Subscription temporarily unavailable" message

2. **Assess:** Determine if database rollback needed
   - If no data corruption: safe to leave DB as-is
   - If data corruption detected: proceed to DB rollback

3. **Database Rollback (if needed):**
   ```bash
   # Roll back migration (destroys tables)
   bin/cake migrations rollback --target=20260714_999
   
   # OR restore from pre-deployment backup
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier hart30-prod \
     --db-snapshot-identifier hart30-prod-pre-keel42-20260720
   ```

4. **Post-Incident:**
   - Root cause analysis (RCA) within 24 hours
   - Fix the issue in code
   - Re-test thoroughly before re-deployment
   - Post-mortem + lessons learned

## Monitoring Configuration

**Key Metrics (alert thresholds):**

| Metric | Threshold | Action |
|--------|-----------|--------|
| API Error Rate | >1% | Page on-call engineer |
| API Latency (p95) | >200ms | Page on-call engineer |
| Payment Success Rate | <99% | Page on-call engineer + Stripe status check |
| Database Query Time (p95) | >50ms | Investigate index usage |
| Feature Flag Latency | >10ms | Investigate cache performance |
| Stripe Webhook Delivery | >5% failed | Page on-call engineer |
| Email Delivery | <90% delivered | Queue retry job |

**Monitoring Tools:**
- New Relic: API latency, error rate, transaction traces
- Stripe Dashboard: Payment success rate, failed charges, webhook status
- CloudWatch: Database performance, CPU, memory
- Custom alerts: Slack #incidents channel

## Runbook (Ops Team Reference)

**Common Issues During Rollout:**

### Issue 1: High Payment Failure Rate (>1%)

**Symptoms:** Payment success rate drops below 99%; customer complaints increase

**Investigation:**
1. Check Stripe status page: https://status.stripe.com
2. Check API logs for Stripe timeout errors
3. Check webhook delivery: Stripe dashboard → Webhooks
4. Check database locks: `SHOW PROCESSLIST;`

**Mitigation:**
- If Stripe outage: notify customers, disable subscription feature temporarily
- If local timeout: increase Stripe API timeout (Phase 4 code: currently 30s)
- If webhook failures: check webhook endpoint responding (HTTP 200)

### Issue 2: High API Latency (p95 >200ms)

**Symptoms:** Users report slow responses; monitoring shows p95 latency >200ms

**Investigation:**
1. Check database query times: `SHOW SLOW_QUERY_LOG;`
2. Verify indexes are being used: `EXPLAIN SELECT ...`
3. Check feature flag cache hit rate
4. Check Stripe API latency (external)

**Mitigation:**
- Add missing index if slow query detected
- Increase feature flag cache TTL if cache misses
- If Stripe slow: accept latency (external service), notify users

### Issue 3: Webhook Processing Failures

**Symptoms:** Stripe webhooks not being processed; subscriptions not syncing

**Investigation:**
1. Verify webhook endpoint is responsive: `curl -s https://api.hart30.io/webhooks/stripe`
2. Check webhook event queue (if async job queue)
3. Verify webhook secret is correctly configured

**Mitigation:**
- If endpoint down: restart service
- If queue blocked: manually process pending webhooks
- If secret wrong: update secret + re-test

## Go/No-Go Decision Framework

**Go Criteria (all must be true):**
- ✓ Code review: 2/2 approvals completed
- ✓ Tests: ≥80% coverage, all tests passing
- ✓ Security: No HIGH findings, OWASP 8/10 mitigated, PCI Level 1 baseline
- ✓ Monitoring: Alerts configured + tested
- ✓ Runbooks: Ops team reviewed + approved
- ✓ Database: Backup completed + migration tested on staging
- ✓ Communication: Customers notified + support trained
- ✓ Stakeholders: PM + Tech Lead + Ops Lead approved

**No-Go Criteria (any one blocks deployment):**
- ✗ Unresolved HIGH-severity findings (security or code quality)
- ✗ Test coverage <80%
- ✗ Database migration failed on staging
- ✗ Monitoring system down/unavailable
- ✗ Ops team indicates unreadiness
- ✗ Stakeholder approval not documented
- ✗ Critical customer issue discovered in UAT

**Go/No-Go Decision Date:** 2026-07-19 (day before deployment)
**Decision Owner:** Tech Lead (Deepak Vaishnav)
**Approval Chain:** Deepak → Amar (PM) → Ops Lead (Sourav)

## Success Metrics (Post-Rollout)

**Business Metrics:**
- Conversion rate: ≥5% (free-to-paid in first 30 days)
- MRR: $50K+ by end of week
- Churn: <3% MoM for first cohort

**Technical Metrics:**
- Error rate: <0.1% (system errors; user errors expected)
- Payment success rate: >99%
- API latency: <100ms p95
- Feature flag propagation: <100ms

**Customer Metrics:**
- Support tickets: <2% related to subscriptions (normal rate)
- NPS: Paid users rate ≥4/5 (recommend to others)
- Refund rate: <1% (chargeback risk)

**Release Criteria (success):**
- All technical metrics met OR explained
- No critical production incidents (P0)
- Positive customer feedback + adoption curve >5% conversion
- Team confidence high (no major issues post-deployment)

## Deployment Artifacts

**Files Generated:**
- `docs/deployment/KEEL-42-deployment-plan.md` (this document)
- `.github/workflows/keel-42-deploy.yml` (CI/CD pipeline trigger, stub)
- `config/feature-flags.php` (feature flag configurations)
- `db/migrations/20260715_000_create_subscription_tables.php` (already from dev-agent)
- Monitoring config (YAML/JSON for alerts)

## Timeline

| Date | Time | Event | Owner |
|------|------|-------|-------|
| 2026-07-19 | 2 PM | Go/No-Go Decision Meeting | Tech Lead |
| 2026-07-20 | 2 AM UTC | Database Migration | Ops Lead |
| 2026-07-20 | 4 AM UTC | Code Deployment | Ops Lead |
| 2026-07-20 | 6 AM UTC | 10% Canary Begins | On-Call |
| 2026-07-20 | 10 AM UTC | 10% → 50% (if stable) | On-Call |
| 2026-07-21 | 10 AM UTC | 50% → 100% (if stable) | On-Call |
| 2026-07-22 | Ongoing | 72-Hour Monitoring | On-Call |
| 2026-07-27 | Ongoing | 7-Day Observation | On-Call |

## Stakeholder Sign-Off

- [ ] **Deepak Vaishnav (Tech Lead):** Infrastructure + deployment readiness
- [ ] **Amar Singh (PM/PO):** Business + customer communication
- [ ] **Sourav Pratap (DevOps/Release Eng):** Ops procedures + monitoring
- [ ] **Pallav Kumar (QA Lead):** Test coverage validation
- [ ] **Security Team:** Security clearance (no HIGH findings)

**Approved By:** [Signatures/dates from stakeholders]
```

### 2. Feature Flag Configuration

**File:** `config/feature-flags.php`

```php
<?php

return [
  'flags' => [
    'subscription_enabled' => [
      'default' => false,
      'description' => 'Enable subscription system (KEEL-42)',
      'rollout' => [
        'enabled' => true,
        'percentage' => 0, // Start at 0%; increase during canary
        'start_date' => '2026-07-20',
      ],
      'owner' => 'Amar Singh',
    ],
    'premium_access' => [
      'default' => false,
      'description' => 'Grant premium features to subscribed users',
      'rollout' => [
        'enabled' => true,
        'percentage' => 100,
      ],
    ],
  ],

  'rollout_schedule' => [
    [
      'timestamp' => '2026-07-20T06:00:00Z', // 10% canary
      'flag' => 'subscription_enabled',
      'percentage' => 10,
    ],
    [
      'timestamp' => '2026-07-20T10:00:00Z', // 50% (if stable)
      'flag' => 'subscription_enabled',
      'percentage' => 50,
    ],
    [
      'timestamp' => '2026-07-21T10:00:00Z', // 100% (if stable)
      'flag' => 'subscription_enabled',
      'percentage' => 100,
    ],
  ],
];
```

### 3. Monitoring Configuration

**File:** `config/monitoring-alerts.yml`

```yaml
alerts:
  api_error_rate_high:
    condition: "error_rate > 1%"
    duration: 5m
    severity: critical
    action: "page on-call engineer"
    
  api_latency_high:
    condition: "p95_latency > 200ms"
    duration: 5m
    severity: critical
    action: "page on-call engineer"
    
  payment_success_rate_low:
    condition: "payment_success_rate < 99%"
    duration: 5m
    severity: critical
    action: "page on-call engineer + check Stripe status"
    
  db_query_slow:
    condition: "p95_query_time > 50ms"
    duration: 10m
    severity: warning
    action: "investigate indexes"
    
  webhook_delivery_failed:
    condition: "webhook_failed_rate > 5%"
    duration: 5m
    severity: critical
    action: "page on-call engineer"

dashboards:
  keel42_rollout:
    title: "KEEL-42 Deployment Dashboard"
    widgets:
      - metric: error_rate
        threshold: 1%
      - metric: api_latency_p95
        threshold: 200ms
      - metric: payment_success_rate
        threshold: 99%
      - metric: feature_flag_percentage
        current: "10% → 50% → 100%"
      - metric: webhook_delivery_success
        threshold: 95%
      - metric: subscription_creation_count
        label: "Subscriptions created (cumulative)"
```

## Output Contract (agent-output-schema.json)

**status:** `success` (deployment plan complete, go approved) | `partial` (plan complete, stakeholder approval pending) | `blocked` (unresolvable blocker to deployment)

**confidence:** Derived per CLAUDE.md rules:
- `high` = status=success, all stakeholders approved, monitoring ready, no blockers
- `medium` = plan complete, pending final stakeholder approval
- `low` = plan complete, blockers identified (unresolved security findings, monitoring gaps)

**findings:** Examples:
```json
{
  "severity": "MEDIUM",
  "basis": "verified",
  "category": "operational",
  "description": "Ops team reports limited capacity during scheduled deployment window (understaffed weekend)",
  "suggested_action": "Reschedule deployment to weekday (higher ops capacity); or increase on-call staffing"
}
```

## Lane2 Gating

**lane2_ready = true only if:**
- [ ] Deployment plan complete (all stages documented)
- [ ] Feature flag configuration ready
- [ ] Monitoring + alerts configured + tested
- [ ] Runbooks reviewed by ops team
- [ ] Database migration tested on staging (success)
- [ ] All Phase 4 outputs validated (code, tests, security)
- [ ] Stakeholder approvals documented (PM, Tech Lead, Ops)
- [ ] Go/No-Go decision scheduled
- [ ] No unresolved HIGH blockers

## Phase 5 Scope Boundaries

**Include:**
- Deployment planning (stages, rollback procedures)
- Feature flag configuration
- Monitoring + alerting setup
- Runbooks (ops procedures, troubleshooting)
- Go/No-Go decision framework
- Staged rollout strategy (canary: 10% → 50% → 100%)
- Post-deployment observation (7 days)

**Exclude (Phase 5+ maint-agent):**
- Ongoing monitoring (Phase 5+ continuous)
- Incident response (Phase 5+, if issues occur)
- Audit logging setup (Phase 6: audit-agent)
- Performance tuning (Phase 5+, post-stabilization)

---

**Last Updated:** Phase 5 Deploy-Agent | **Next Phase:** Phase 5+ (maint-agent — ongoing monitoring) | **Gates:** All stakeholder approvals + go decision
