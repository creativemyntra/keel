# Complete Keel Developer Workflow Guide

**From Project Setup to Production Deployment with CodeGraph**

---

## TABLE OF CONTENTS

1. [Setup Phase](#setup-phase)
2. [Project Initialization](#project-initialization)
3. [Feature Development Workflow](#feature-development-workflow)
4. [Real-World Use Case: Subscription System](#real-world-use-case)
5. [Advanced Workflows](#advanced-workflows)
6. [Troubleshooting & Best Practices](#troubleshooting)

---

## SETUP PHASE

### Step 1: Environment Preparation (15 minutes)

**On Your Laptop:**

```bash
# 1. Clone the Keel repository
git clone https://github.com/creativemyntra/keel.git
cd keel

# 2. Create your project .env
cp .env.example .env

# 3. Generate API tokens (visit these URLs):
# GitHub:     https://github.com/settings/tokens
# Jira:       https://id.atlassian.com/manage-profile/security/api-tokens
# SonarQube:  [your-instance]/account/security/generate-tokens
# Slack:      https://api.slack.com/apps

# 4. Update .env with your tokens
nano .env
# Add:
# GITHUB_TOKEN=ghp_xxxxx
# JIRA_API_TOKEN=xxxxx
# SONARQUBE_TOKEN=squ_xxxxx
# SLACK_BOT_TOKEN=xoxb_xxxxx
```

### Step 2: MCP Setup (10 minutes)

```bash
# Run interactive setup wizard
/keel setup-mcp --mode=quick

# Answer prompts:
# ├─ Bitbucket username? (your-username)
# ├─ GitHub token? (paste from .env)
# ├─ Jira instance? (https://company.atlassian.net)
# └─ Slack workspace? (your-workspace)

# Validate all connections
/keel test-mcp --all

# Expected output:
# ✅ GitHub         (Authenticated as @yourname)
# ✅ Jira           (Connected to KEEL project, 42 issues)
# ✅ Playwright     (Chromium ready, headless mode)
# ✅ SonarQube      (Quality gate: PASSED)
# ✅ Slack          (Connected to #keel-ci)
```

### Step 3: CodeGraph Initialization (5 minutes)

```bash
# Initialize CodeGraph for your project
/keel codegraph --init --stack=cakephp

# Generate initial graph
/keel codegraph --generate

# Verify generation
/keel codegraph --query="Total files and classes?"

# Expected output:
# ✅ CodeGraph initialized
# Total files: 42
# Total classes: 28
# Total functions: 156
# Average complexity: 4.2
# Circular dependencies: 0
```

---

## PROJECT INITIALIZATION

### Scenario: New Feature Project

```bash
# 1. Initialize Keel project
/keel init --mode=new --stack=cakephp

# Output:
# ✅ .claude/ folder created
# ✅ CLAUDE.md (governance rules)
# ✅ agent-output-schema.json (handoff contract)
# ✅ CodeGraph structure initialized

# 2. Verify setup
git status
# New files:
# ├─ .claude/
# ├─ .env.example
# ├─ action.yml
# └─ .gitignore

# 3. Create first commit
git add .
git commit -m "Initialize Keel AI-SDLC Framework"
git push origin master
```

---

## FEATURE DEVELOPMENT WORKFLOW

### Complete End-to-End Example: Subscription System (KEEL-42)

```
Day 1: Ideation & Requirements
Day 2-3: Design & Architecture
Day 4-5: Development & Testing
Day 6: Security Review & Optimization
Day 7: Deployment
```

---

## PHASE 1: BRAINSTORM & IDEATION (Day 1, Morning)

### Step 1: Start Brainstorming Session

```bash
# 1. Begin brainstorm
/keel brainstorm --goal="Add recurring payment subscriptions to monetize free users" \
                 --mode=both

# Command breakdown:
# --goal: Business objective
# --mode=both: divergence (5 ideas) + convergence (score & rank)

# Interactive prompts:
# ├─ Epic ID? (KEEL-E1)
# ├─ Timeline? (6 weeks)
# ├─ Key constraints? (PCI compliance, Stripe integration)
# └─ Success criteria? (5% conversion, $50K MRR)
```

### Step 2: Review CodeGraph Impact

```bash
# Before starting, check what exists
/keel codegraph --query="Does subscription system exist?"
# Answer: No, starting fresh

# Check dependencies that need modification
/keel codegraph --query="What depends on User model?"
# Answer:
# ├─ AuthController (login, registration)
# ├─ AccountController (settings, profile)
# ├─ FeatureFlag system (permission checks)
# └─ 12 test files

# Take note: Modifying User impacts 3 controllers + auth system
```

### Step 3: Review Brainstorm Output

```
Generated: docs/brainstorms/monetization-strategy.md

Output: 5 Concepts
├─ Concept 1: Monthly/Annual Subscriptions (8.7/10) ✅ APPROVED
├─ Concept 2: Enterprise Licensing (7.3/10) ✅ APPROVED
├─ Concept 3: One-Time Credits (5.7/10) ⏳ Deferred
├─ Concept 4: Freemium Model (6.7/10) ⏳ Combine with #1
└─ Concept 5: Usage-Based Billing (5.3/10) ⏳ Deferred

lane2_ready: ✅ TRUE → Ready for Phase 2

Slack notification:
  🧠 Brainstorm Complete: Monetization Strategy
  ✅ 5 concepts generated, top 2 approved
  📊 Subscription Tiers: 8.7/10 (HIGHEST)
  🎯 Next: Phase 2 Requirements
```

---

## PHASE 2: REQUIREMENTS & BDD (Day 1, Afternoon)

### Step 1: Generate Requirements Document

```bash
# Create requirement story
/keel req --story=KEEL-42 \
          --feature="User subscription management with Stripe integration" \
          --epic=KEEL-E1 \
          --mode=interactive

# Interactive Q&A:
# ├─ Primary user? (Free users upgrading to premium)
# ├─ Core business value? (Recurring revenue, $50K MRR target)
# ├─ Payment provider? (Stripe)
# ├─ Billing cycles? (Monthly $29, Annual $290)
# ├─ External integrations? (Stripe API, Email service)
# └─ Success criteria? (>5% conversion, <1% payment failures)
```

### Step 2: CodeGraph Impact Analysis

```bash
# Check what will be modified
/keel codegraph --query="Impact analysis: Add subscription module"

# Output:
# Components to modify:
# ├─ User model (add subscription fields)
# ├─ Auth system (track subscription status)
# ├─ FeatureFlag system (gate premium features)
# └─ Database (3 new tables: subscriptions, payment_methods, invoices)
#
# Affected tests: 12 files
# Circular dependency risk: ⚠️ Check payment validator
# Estimated complexity: 7.2/10
```

### Step 3: Requirements Output

```
Generated: docs/requirements/KEEL-42.md

Content:
├─ 9 Functional Requirements (MUST/SHOULD/COULD)
├─ 5 BDD Acceptance Criteria
├─ Data entities (Subscription, PaymentMethod, Invoice, Plan)
├─ External integrations (Stripe, Email)
├─ Risks & mitigation (PCI compliance, payment race conditions)
├─ Success metrics (5% conversion, 99% payment success)
└─ Testing strategy (unit, integration, security, E2E)

lane2_ready: ✅ TRUE

Jira update:
  KEEL-42 status: "In Design"
  Links: docs/requirements/KEEL-42.md
  Comment: "Requirements approved by PM, ready for design"

Slack notification:
  📝 Requirements Ready: KEEL-42
  ✅ 9 functional requirements
  ✅ 5 BDD acceptance criteria
  👥 Design review needed
```

---

## PHASE 3: ARCHITECTURE DESIGN (Day 2)

### Step 1: Generate Design Document

```bash
# Create architecture design
/keel design --story=KEEL-42 \
             --focus=all

# Design generation:
# ├─ OpenAPI 3.0 specification (4 endpoints)
# ├─ Database schema (3 tables with migrations)
# ├─ System architecture (Stripe sync, async emails)
# ├─ API contract (request/response examples)
# ├─ Trade-off analysis (sync vs async, local vs remote)
# ├─ Deployment strategy (zero-downtime with feature flags)
# └─ Monitoring & alerts configuration
```

### Step 2: CodeGraph Architecture Validation

```bash
# Validate proposed architecture
/keel codegraph --validate-architecture

# Check against rules:
# ├─ Layer separation: Controller → Service → Repository → Database
# ├─ No circular dependencies: ✅ PASSED
# ├─ Design patterns: Dependency injection, repository pattern
# ├─ Security baseline: PCI Level 1 compliance
# └─ Test coverage targets: ≥80%

# Violations: None detected ✅

# Architecture quality:
# ├─ Maintainability: A
# ├─ Testability: A
# ├─ Security: A
# └─ Performance: B (needs index optimization)
```

### Step 3: Design Output

```
Generated: docs/design/KEEL-42-subscription.md

Content:
├─ OpenAPI specification (4 endpoints with examples)
├─ Database schema (ER diagram + DDL)
├─ System architecture diagram
├─ Stripe integration flow
├─ Feature flag configuration
├─ Monitoring setup (8 key metrics)
├─ Performance targets (<2s latency, >99% success)
├─ Security baseline (PCI L1, CSRF protection, input validation)
└─ Deployment runbook (4 stages, rollback procedures)

lane2_ready: ✅ TRUE

Jira update:
  KEEL-42 status: "In Design Complete"
  Attachment: design.openapi.yaml
  Comment: "Design approved, ready for development"

CodeGraph update:
  New nodes: 4 endpoints, 3 tables, 8 services planned
```

---

## PHASE 4: DEVELOPMENT (Days 3-5)

### Step 1: Start Development Sprint

```bash
# Create feature branch
git checkout -b keel/dev/KEEL-42

# Begin development
/keel dev --story=KEEL-42 \
          --scope=all \
          --update-codegraph

# Code generation:
# ├─ Controllers/
# │  └─ SubscriptionsController.php
# ├─ Services/
# │  ├─ SubscriptionService.php
# │  ├─ PaymentValidator.php
# │  └─ StripeSync.php
# ├─ Models/
# │  ├─ Subscription.php
# │  ├─ PaymentMethod.php
# │  └─ Invoice.php
# └─ db/migrations/
#    └─ 20260715_000_create_subscription_tables.php
```

### Step 2: CodeGraph Development Tracking

```bash
# Monitor code quality during development
/keel codegraph --watch

# Real-time updates as you code:
# 10:15 - New file: SubscriptionService.php
#   └─ +245 lines, complexity: 7.2
#   └─ Dependencies: Stripe, Database, Logger
#
# 10:45 - Updated: SubscriptionsController.php
#   └─ +189 lines, complexity: 5.1
#   └─ Calls: SubscriptionService (3 methods)
#
# 11:20 - New migration file
#   └─ 3 tables created (subscriptions, payment_methods, invoices)
#   └─ Foreign keys validated ✅
#
# 14:00 - Complexity check:
#   ✅ Avg complexity: 5.8 (within target)
#   ⚠️ PaymentValidator: 6.8 (monitor)
#   ✅ No circular dependencies
```

### Step 3: Code Quality Gates

```bash
# Check code quality before commit
/keel test-mcp --type=sonarqube

# SonarQube results:
# Coverage: 0% (tests not written yet)
# Code smells: 3 (review suggestions)
# Security hotspots: 0 ✅
# Maintainability: A ✅

# Fix issues before moving to test phase
# (SonarQube suggests refactoring PaymentValidator)
```

### Step 4: Push Development Code

```bash
# Commit and push
git add src/ db/
git commit -m "feat(KEEL-42): Implement subscription system

- SubscriptionService with create/update/cancel/renew
- PaymentValidator with Stripe integration
- StripeSync webhook handler
- Database migrations (subscriptions, payment_methods, invoices)
- Feature flag gating (premium_access)
- Email notifications (confirmation, renewal)

CodeGraph: +4 classes, +12 functions, avg complexity 5.8
Tests: Pending (Phase 4b)"

git push origin keel/dev/KEEL-42

# GitHub PR created automatically:
# Title: feat(KEEL-42): Implement subscription system
# Description: (from requirements & design)
# Status: Open for review
# Checks: Running...
```

---

## PHASE 4B: TESTING (Days 4-5, Parallel)

### Step 1: Generate Test Suite

```bash
# Start testing in parallel
/keel test --story=KEEL-42 \
           --scope=all

# Test generation:
# ├─ Unit tests (services, models)
# │  ├─ SubscriptionService tests (14 tests)
# │  ├─ PaymentValidator tests (8 tests)
# │  └─ Model validation (6 tests)
# ├─ Integration tests (API endpoints)
# │  ├─ POST /subscriptions (happy path + errors)
# │  ├─ GET /subscriptions (list, filter, pagination)
# │  ├─ PUT /subscriptions/{id} (upgrade/downgrade)
# │  └─ DELETE /subscriptions/{id} (cancel)
# ├─ E2E tests (Playwright)
# │  ├─ User subscription flow
# │  ├─ Payment decline handling
# │  └─ Confirmation email
# ├─ Performance tests
# │  ├─ Subscription creation <2s
# │  ├─ List subscriptions <100ms
# │  └─ Payment success >99%
# └─ Security tests
#    ├─ No card data logged
#    ├─ CSRF protection
#    └─ Input validation
```

### Step 2: CodeGraph Test Coverage Mapping

```bash
# Map tests to code nodes
/keel codegraph --analyze=test-coverage

# Output:
# Test coverage by component:
# ├─ SubscriptionService: 95% ✅ (excellent)
# ├─ PaymentValidator: 78% ⚠️ (add edge cases)
# ├─ StripeSync: 82% ⚠️ (webhook scenarios)
# ├─ Database migrations: 100% ✅ (schema tests)
# └─ E2E flows: 5/5 passing ✅
#
# Untested code paths:
# ├─ PaymentValidator: card expiry edge cases
# ├─ StripeSync: webhook retry logic
# └─ EmailNotifier: failed delivery recovery
```

### Step 3: Test Execution

```bash
# Run full test suite
/keel test --execute

# Output:
# Unit tests:        28/28 passing ✅
# Integration tests: 15/15 passing ✅
# E2E tests:         5/5 passing ✅
# Performance:       All targets met ✅
# Security tests:    10/10 passing ✅
#
# Coverage: 87% ✅ (target: ≥80%)
# Time: 3m 45s
#
# Results: READY FOR SECURITY REVIEW
```

### Step 4: Comment on PR

```bash
# Test results posted to GitHub PR
GitHub comment:
✅ All Tests Passing (KEEL-42)

Unit Tests:        28/28 ✅
Integration Tests: 15/15 ✅
E2E Tests:         5/5 ✅
Performance:       ✅ (all <2s)
Security Tests:    10/10 ✅

Code Coverage:     87% (target: 80%) ✅
Code Quality:      A ✅
Maintainability:   A ✅

Ready for security review → Phase 4c
```

---

## PHASE 4C: SECURITY REVIEW (Day 5)

### Step 1: Security Scan

```bash
# Run security scanning
/keel sec --story=KEEL-42 \
          --scope=all

# Security analysis:
# ├─ SAST: PHPStan L5 + Semgrep
# ├─ Dependency audit: Composer audit
# ├─ OWASP Top 10 assessment
# └─ PCI compliance check (Level 1)
```

### Step 2: CodeGraph Security Analysis

```bash
# Trace data flow for security vulnerabilities
/keel codegraph --analyze=security

# Data flow analysis:
# Input path:
#   User Form (untrusted)
#     ↓ (validated)
#   Stripe Payment Form (tokenized)
#     ↓ (encrypted)
#   PaymentValidator (signature verification)
#     ↓
#   SubscriptionService (idempotency key)
#     ↓
#   Database (PCI compliance - no card storage)
#
# ✅ All inputs sanitized
# ✅ No card data in logs
# ✅ Encryption at rest (AES-256)
# ✅ Rate limiting on payment endpoint
# ✅ CSRF token validation
```

### Step 3: Security Report

```
Generated: docs/security/KEEL-42-security-scan.md

Findings:
├─ SAST: 0 CRITICAL, 0 HIGH ✅
├─ Dependencies: No vulnerabilities ✅
├─ OWASP: 8/10 threats mitigated ✅
├─ PCI Level 1: ✅ PASSED
└─ Input validation: ✅ All paths secured

lane2_ready: ✅ TRUE

Slack notification:
  🔒 Security Review Complete: KEEL-42
  Status: ✅ PASSED
  Critical findings: 0
  Ready for deployment review
```

---

## PHASE 5: DEPLOYMENT (Day 6)

### Step 1: Prepare Deployment Plan

```bash
# Create deployment plan
/keel deploy --story=KEEL-42 \
             --mode=plan \
             --rollout=canary

# Deployment plan generated:
# ├─ Stage 1: DB migration (off-hours)
# ├─ Stage 2: Code deployment
# ├─ Stage 3: Canary rollout (10% → 50% → 100%)
# ├─ Monitoring & alerts
# ├─ Runbook for ops team
# └─ Rollback procedures
```

### Step 2: CodeGraph Deployment Impact

```bash
# Assess deployment impact
/keel codegraph --analyze=deployment-impact

# Impact analysis:
# Modules being deployed:
# ├─ SubscriptionService (new)
# ├─ PaymentValidator (new)
# ├─ SubscriptionsController (new)
# └─ User model (modified - add subscription fields)
#
# Affected downstream:
# ├─ AuthController (uses modified User model) ⚠️ Retest
# ├─ FeatureFlag system (reads premium_access flag)
# ├─ Email system (sends confirmation/renewal)
# └─ Scheduled tasks (cron for renewal)
#
# Rollback complexity: MEDIUM
# ├─ Database: Reversible migration ✅
# ├─ Code: Feature flag disable ✅
# └─ Testing: Full regression suite recommended
```

### Step 3: Execution Phase

```bash
# Execute deployment
/keel deploy --story=KEEL-42 \
             --mode=execute \
             --rollout=canary

# Deployment steps:

# Stage 1 (Day 6, 2 AM): Database Migration
# ├─ Backup database: hart30-prod-pre-keel42
# ├─ Run migrations (20260715_000)
# ├─ Verify schema: ✅ 3 tables created
# └─ Verify no locks: ✅ Clean
#
# Stage 2 (Day 6, 4 AM): Code Deployment
# ├─ Deploy API code
# ├─ Feature flag: subscription_enabled = false (disabled)
# ├─ Health check: ✅ /health returns 200 OK
# └─ No errors in logs: ✅
#
# Stage 3a (Day 6, 6 AM): Canary 10% (5K users)
# ├─ Enable feature flag for 10%
# ├─ Monitor: Error rate 0.05%, Latency 95ms, Payment success 99.8%
# ├─ 2-4 hour monitoring
# └─ Status: ✅ STABLE → Proceed to 50%
#
# Stage 3b (Day 6, 10 AM): Canary 50% (25K users)
# ├─ Expand to 50%
# ├─ Monitor: Error rate 0.04%, Latency 92ms, Payment success 99.9%
# ├─ Support tickets: <5 (all resolved)
# └─ Status: ✅ STABLE → Proceed to 100%
#
# Stage 3c (Day 7, 10 AM): Full Rollout 100%
# ├─ Enable for all users
# ├─ Intensive monitoring: 72+ hours
# ├─ Alert thresholds: Error >1%, Latency >200ms, Success <99%
# └─ Status: ✅ LIVE

# Slack notifications (real-time):
# 
# 🚀 [06:00] Canary 10% - Error: 0.05%, Latency: 95ms ✅
# 📊 [08:00] Stable - No issues detected
# 
# 🔄 [10:00] Expanding to 50% - Error: 0.04%, Latency: 92ms ✅
# 📊 [14:00] Stable - <5 support tickets
# 
# 🎉 [Next day 10:00] Full rollout 100% - All users enabled
# 📈 [Next day 72h] Monitoring complete - metrics stable
#
# 📋 Results:
# ✅ Conversion rate: 5.2% (target: >5%)
# ✅ MRR: $52K (target: $50K)
# ✅ Payment success: 99.9% (target: >99%)
# ✅ API latency: 94ms p95 (target: <200ms)
# ✅ Error rate: 0.03% (target: <1%)
# ✅ Churn: <2% MoM
```

### Step 4: Post-Deployment

```bash
# Create release tag
git tag -a v2.1 -m "Release: Subscription System (KEEL-42)"
git push origin v2.1

# Jira closure
KEEL-42 status: "Done"
Resolution: "Fixed"
Comment: "Released to production 2026-07-21 with canary rollout. 
          All metrics within targets. 5.2% conversion rate achieved."

# CodeGraph final update
/keel codegraph --finalize-deployment

# CodeGraph reflects production state:
# ├─ All new nodes marked as "deployed"
# ├─ Monitoring points registered
# ├─ Rollback paths documented
# └─ Production metrics baseline established

# Confluence runbook published
docs/deployment/KEEL-42-runbook.md
├─ Operational procedures
├─ Common issues & fixes
├─ Monitoring dashboard links
└─ Escalation procedures
```

---

## REAL-WORLD USE CASE EXAMPLES

### Use Case 1: Refactoring PaymentService

**Scenario:** Code is too complex (complexity: 8.9), needs refactoring

```bash
# Step 1: Analyze impact
/keel codegraph --query="If I split PaymentService, what breaks?"

# Answer:
# Dependents:
# ├─ SubscriptionsController (3 methods call PaymentService)
# ├─ RefundService (2 methods call PaymentService)
# └─ WebhookHandler (5 methods call PaymentService)
# 
# Test files affected: 12 files
# Risk level: MEDIUM (well-tested code)

# Step 2: Create refactoring branch
git checkout -b keel/refactor/payment-service-split

# Step 3: Make changes
# Split into:
# ├─ PaymentProcessor (charge cards)
# ├─ PaymentValidator (validate input)
# └─ PaymentRetry (handle failures)

# Step 4: Update CodeGraph
/keel codegraph --update

# CodeGraph shows:
# Before:
# └─ PaymentService (complexity: 8.9, 245 lines)
#
# After:
# ├─ PaymentProcessor (complexity: 5.2, 120 lines) ✅
# ├─ PaymentValidator (complexity: 4.1, 80 lines) ✅
# └─ PaymentRetry (complexity: 3.8, 70 lines) ✅
# Average: 4.4 (down from 8.9!) ✅

# Step 5: Run tests
/keel test --update-references

# All tests passing: 28/28 ✅

# Step 6: Update dependents
# Verify all callers updated to new API
/keel codegraph --validate-architecture

# All validations: ✅ PASSED

# Step 7: Commit and merge
git commit -m "refactor(PaymentService): Split into 3 focused services

Reduces complexity from 8.9 → 4.4 avg
├─ PaymentProcessor: charge logic only
├─ PaymentValidator: input validation
└─ PaymentRetry: exponential backoff retry

All tests passing (28/28)
CodeGraph validation: ✅ PASSED
No circular dependencies introduced"

git push origin keel/refactor/payment-service-split
```

### Use Case 2: Adding New Feature with Minimal Breaking Changes

**Scenario:** Add refund capability to subscription system

```bash
# Step 1: CodeGraph analysis
/keel codegraph --query="How can I add refunds without breaking changes?"

# Recommendations:
# ├─ Add RefundService (new, no modifications to existing)
# ├─ Extend Subscription model with refund_status field (backward compatible)
# ├─ Add RefundController endpoint
# └─ Risk level: LOW (isolated change)

# Step 2: Design review
/keel design --story=KEEL-50 \
             --focus=minimal-impact

# Design includes:
# ├─ RefundService (new service)
# ├─ RefundPolicy (new model for rules)
# └─ Webhook: charge.refunded (from Stripe)
# All non-breaking ✅

# Step 3: Develop with safety checks
/keel dev --story=KEEL-50 \
          --validate-impact

# CodeGraph during development:
# ├─ New nodes: RefundService, RefundPolicy, RefundController
# ├─ New edges: SubscriptionService → RefundService (unidirectional)
# ├─ Circular dependency check: ✅ None
# ├─ Breaking changes: 0 ✅
# └─ Estimated impact: Isolated (4 new components only)

# Step 4: Test coverage
/keel test --scope=refund

# Tests: 18/18 passing ✅
# Coverage: 92% ✅
# E2E: Refund flow verified ✅

# Step 5: Deploy with confidence
/keel deploy --story=KEEL-50 --rollout=immediate

# No canary needed (low risk)
# Status: ✅ Live immediately
# Impact: Only refund-related, no effect on subscriptions
```

### Use Case 3: Emergency Hotfix in Production

**Scenario:** Payment success rate dropped to 97%

```bash
# Step 1: Diagnose with CodeGraph
/keel codegraph --query="Trace payment failure paths"

# Data flow analysis shows:
# User input
#   ↓ (validated by PaymentValidator)
#   ↓ (charged by StripeClient)
#   ↓ (recorded by SubscriptionService)
#
# Issue found: Stripe API timeout at 30s
# Solution: Increase timeout to 60s (StripeClient config)

# Step 2: Locate and fix
# File: src/Client/StripeClient.php:87
# Change: timeout: 30000 → timeout: 60000

# Step 3: Test impact
/keel codegraph --analyze=hotfix-impact

# Impact analysis:
# ├─ Files modified: 1 (StripeClient.php)
# ├─ Functions affected: 3 (createPaymentIntent, etc.)
# ├─ Tests to re-run: 8
# └─ Risk: LOW (configuration-only change)

# Step 4: Quick test
/keel test --scope=payment-critical

# Tests: 8/8 passing ✅

# Step 5: Deploy immediately (no canary)
git checkout -b keel/hotfix/stripe-timeout
git commit -m "hotfix(payment): Increase Stripe API timeout from 30s to 60s

Addresses: Payment success rate dropped to 97%
Root cause: Slow network timeouts (p95 latency 25s)
Solution: Increase timeout threshold to 60s
Impact: StripeClient only, 3 methods affected
Testing: 8/8 payment tests passing ✅
Risk: LOW

Rollback: Revert single line if needed"

git push origin keel/hotfix/stripe-timeout

# Deploy
/keel deploy --story=HOTFIX --rollout=immediate

# Status: ✅ Live
# Monitoring:
# ├─ Payment success: 99.8% (up from 97%) ✅
# ├─ API timeout: <30s (improved) ✅
# └─ Error rate: 0.05% (stable) ✅
```

---

## ADVANCED WORKFLOWS

### Multi-Feature Development with CodeGraph

**Scenario:** Team has 3 features in progress simultaneously

```
Feature A: Refund system (KEEL-50)
├─ Dev: In progress (day 3)
├─ CodeGraph: RefundService, RefundPolicy, RefundController
└─ Dependencies: SubscriptionService, StripeClient

Feature B: Team management (KEEL-60)
├─ Dev: In progress (day 2)
├─ CodeGraph: TeamService, TeamController, Permissions
└─ Dependencies: User, Auth system

Feature C: Analytics dashboard (KEEL-70)
├─ Design: Approved
├─ CodeGraph: AnalyticsService, ReportController
└─ Dependencies: Subscription, Team

CodeGraph conflict detection:
├─ Feature A ↔ Feature B: No conflicts ✅ (independent)
├─ Feature A ↔ Feature C: Dependency (A needs to complete first)
└─ Feature B ↔ Feature C: No conflicts ✅ (independent)

Deployment strategy:
1. Deploy Feature B first (independent)
2. Deploy Feature A (no blockers)
3. Deploy Feature C (uses A data)
All safe with CodeGraph guidance! ✅
```

### Refactoring with Confidence

**Scenario:** Extract duplicate code, refactor shared logic

```bash
# Before refactoring
/keel codegraph --visualize=complexity-heatmap

# Shows hot spots:
# 🔴 PaymentValidator: complexity 6.8
# 🔴 RefundLogic: complexity 6.2
# 🟡 SubscriptionService: complexity 5.9

# Investigation: Find duplication
/keel codegraph --query="Where is duplicate validation logic?"

# Answer:
# ├─ PaymentValidator.validate() - 45 lines
# └─ RefundLogic.validate() - 42 lines
# 87% duplicate code detected!

# Refactoring plan
git checkout -b keel/refactor/shared-validation

# Create shared ValidationHelper
# ├─ Extract common rules
# └─ Reduce duplication: 87 lines → 30 lines (shared) + 15 (PaymentValidator) + 18 (RefundLogic)

# Update CodeGraph
/keel codegraph --update

# Complexity reduced:
# ├─ PaymentValidator: 6.8 → 4.2 ✅
# ├─ RefundLogic: 6.2 → 4.1 ✅
# └─ ValidationHelper: new (3.5 - simple utility) ✅

# All tests passing: 28/28 ✅
# No circular dependencies: ✅
# Ready to merge with confidence!
```

---

## DAILY DEVELOPER ROUTINE

### Morning Standup Preparation

```bash
# 1. Check overnight changes
/keel codegraph --query="What changed since yesterday?"

# Output:
# ├─ New commits: 3 (from team members)
# ├─ CodeGraph updates: Applied ✅
# ├─ Breaking changes: 0 ✅
# ├─ New complexity hotspots: None
# └─ Circular dependencies: 0 ✅

# 2. Check test status
/keel test --quick-check

# Output:
# ├─ All tests passing: ✅ 156/156
# ├─ Code coverage: 87% (stable)
# └─ Performance: All targets met ✅

# 3. Review PR feedback
gh pr list --state=open
# → Check for review comments
# → Address feedback

# 4. Standup ready!
# What I did yesterday:
# ├─ Implemented RefundService (KEEL-50)
# ├─ Added 18 tests (92% coverage)
# └─ CodeGraph impact: Low risk
#
# What I'm doing today:
# ├─ Add RefundPolicy validation
# ├─ Integrate with Stripe webhooks
# └─ E2E testing
#
# Blockers: None
```

### Development Session

```bash
# 1. Feature branch work
git checkout keel/dev/KEEL-50

# 2. Code with real-time CodeGraph feedback
/keel codegraph --watch

# As you code, CodeGraph shows:
# ├─ New methods detected
# ├─ Complexity increasing (monitored)
# ├─ Dependencies validated
# └─ Circular refs checked: None ✅

# 3. Periodic code quality check
/keel test-mcp --type=sonarqube --quick

# Output:
# ├─ Coverage: 92% (good)
# ├─ Code smells: 1 (review suggestion)
# ├─ Security hotspots: 0 ✅
# └─ Maintainability: A ✅

# 4. Commit work
git add src/
git commit -m "feat(KEEL-50): Add refund policy validation

- Validates refund eligibility (timeframe, amount)
- Checks subscription status
- Prevents duplicate refunds

Tests: 3/3 passing
Coverage: 92% maintained
CodeGraph: +1 class, complexity +0.2 (4.1 total)"

git push origin keel/dev/KEEL-50
```

### End-of-Day Review

```bash
# 1. Check PR status
/keel codegraph --query="Is my feature ready for merge?"

# Checklist:
# ├─ Tests passing: ✅ 28/28
# ├─ Code coverage: ✅ 87%
# ├─ Architecture valid: ✅ No violations
# ├─ No circular deps: ✅ Verified
# ├─ PR reviews: ⏳ Waiting for 1 approval
# ├─ Conflicts: ✅ None
# └─ Ready to merge: ⏳ (pending review)

# 2. Document progress
/keel codegraph --update

# 3. Update Jira
gh pr view [pr-number] --json=body
# → Copy PR description to Jira comment

# 4. Plan tomorrow
# ├─ Follow up on PR review
# ├─ Start next feature (KEEL-60)
# └─ Help team member debug issue
```

---

## TROUBLESHOOTING & BEST PRACTICES

### Common Issues & Solutions

#### Issue 1: Circular Dependency Detected

```bash
# Problem:
/keel codegraph --validate-circular-deps
# ⚠️ Circular dependency: ServiceA → ServiceB → ServiceA

# Solution:
# Step 1: Understand the cycle
/keel codegraph --query="Trace dependency path: ServiceA → ServiceA"

# Output shows:
# ServiceA calls method in ServiceB
# ServiceB calls method in ServiceA (circular!)

# Step 2: Fix (3 options)
# Option A: Extract shared logic to utility
# Option B: Pass dependency as parameter (inject)
# Option C: Use event system (decouple)

# Step 3: Implement fix
git checkout -b keel/fix/circular-dep

# Refactor to use dependency injection:
# ServiceA → SharedLogic ← ServiceB

# Step 4: Verify fix
/keel codegraph --validate-circular-deps
# ✅ No circular dependencies!

# Step 5: Test and commit
/keel test --quick-check
git commit -m "fix: Eliminate circular dependency ServiceA ↔ ServiceB

Used dependency injection pattern.
All tests passing (28/28)
CodeGraph validation: ✅ PASSED"
```

#### Issue 2: Code Coverage Below Target

```bash
# Problem:
/keel codegraph --analyze=test-coverage
# ⚠️ RefundService: 62% coverage (target: 80%)

# Solution:
# Step 1: Identify untested paths
/keel codegraph --query="Untested code in RefundService?"

# Answer:
# ├─ refund() method: edge cases
# ├─ webhook handler: retry logic
# └─ email notification: failure recovery

# Step 2: Write missing tests
# Add 12 new tests:
# ├─ RefundService edge cases (6 tests)
# ├─ Webhook retry scenarios (4 tests)
# └─ Email failure recovery (2 tests)

# Step 3: Verify coverage
/keel test --scope=refund --coverage-report

# Output:
# RefundService coverage: 62% → 87% ✅
# Result: Target met!
```

#### Issue 3: Complex Method Too Hard to Test

```bash
# Problem:
# PaymentValidator::validate() has 12 paths, complexity: 6.8
# Hard to write comprehensive tests

# Solution:
# Step 1: Refactor for testability
# Break into smaller, testable units:
#   validate() → validateCard() + validateAmount() + validateRules()

# Step 2: Update CodeGraph
/keel codegraph --update

# Complexity breakdown:
# validate(): 2.1 (calls 3 sub-methods)
# validateCard(): 2.2 (only card logic)
# validateAmount(): 1.8 (only amount logic)
# validateRules(): 2.1 (only rule logic)
# Average: 2.05 (down from 6.8!) ✅

# Step 3: Write tests for each unit
# Now 3 simple functions = easy to test! ✅
```

### Best Practices

#### 1. Update CodeGraph on Every Commit

```bash
# ✅ Good: CodeGraph stays in sync
git commit -m "feat: Add subscription renewal"
/keel codegraph --update

# ❌ Avoid: Let CodeGraph get out of sync
git commit -m "feat: Add subscription renewal"
# (forget to update)
# → CodeGraph becomes stale
```

#### 2. Use CodeGraph Before Major Changes

```bash
# ✅ Good: Understand impact first
/keel codegraph --query="Impact of removing PaymentService?"
# → Understand all dependents
# → Plan refactoring

# ❌ Avoid: Make changes blindly
# (refactor without understanding impact)
# → Break something you didn't expect
```

#### 3. Leverage Impact Analysis

```bash
# ✅ Good: Ask CodeGraph
/keel codegraph --query="If I modify User model, what breaks?"
# → Get definitive answer
# → Plan ahead

# ❌ Avoid: Guess
# "I think only Auth uses User model"
# → Miss dependent code
# → Tests fail later
```

#### 4. Regular Architecture Reviews

```bash
# ✅ Good: Weekly validation
/keel codegraph --validate-architecture
# → Catch violations early
# → Maintain code quality

# ❌ Avoid: Never validate
# → Architecture debt accumulates
# → System becomes unmaintainable
```

---

## SUMMARY: Complete Developer Workflow

```
Day 1 (Ideation & Requirements)
├─ /keel brainstorm --goal="..." → 5 concepts generated
├─ /keel req --story=KEEL-42 → Requirements doc
└─ CodeGraph impact analysis

Day 2 (Design)
├─ /keel design --story=KEEL-42 → Architecture design
├─ CodeGraph validates architecture
└─ Ready for development

Days 3-5 (Development & Testing)
├─ /keel dev → Code generation
├─ /keel test → Test suite (parallel)
├─ /keel sec → Security review (parallel)
├─ CodeGraph tracks all changes
└─ All quality gates: ✅ PASSED

Day 6-7 (Deployment)
├─ /keel deploy --mode=plan → Deployment plan
├─ /keel deploy --mode=execute → Canary rollout
├─ CodeGraph: deployment impact analysis
└─ Status: ✅ LIVE in production

Key Throughout:
├─ CodeGraph always shows: dependencies, complexity, risks
├─ Real-time feedback on code changes
├─ Architecture validation at every step
└─ Impact analysis before changes
```

**Result:** Feature deployed to production with confidence! 🚀

