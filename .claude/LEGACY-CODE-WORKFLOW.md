# Keel Legacy Code Workflow

**How to use Keel with existing codebases (e.g., HART, enterprise apps)**

---

## Overview

Keel works with **both greenfield (new projects) and brownfield (legacy) scenarios**. For legacy code, you skip early phases and focus on what matters: enhancements, refactoring, and maintenance.

---

## Workflow Phases for Legacy Code

### Phase 0: Codebase Onboarding (NEW)

Before running any agents, set up Keel to understand your existing codebase.

```bash
/keel legacy --init --codebase=/path/to/hart
```

**What happens:**
1. **Scan codebase**
   - Read all source files
   - Parse code structure
   - Identify technologies (PHP, Laravel, CakePHP, etc.)
   - Find database schema
   - List existing tests

2. **Build CodeGraph**
   - Map all classes, functions, services
   - Identify dependencies
   - Detect circular dependencies
   - Find coupling points
   - Analyze test coverage

3. **Create baseline documentation**
   - Architecture overview
   - Tech stack analysis
   - Existing patterns
   - Known issues/TODOs
   - Code quality metrics

4. **Initialize Keel configuration**
   ```yaml
   .claude/
   ├── CLAUDE.md (governance, conventions)
   ├── codebase-analysis/
   │   ├── ARCHITECTURE.md
   │   ├── DEPENDENCIES.md
   │   ├── TECH-STACK.md
   │   └── METRICS.md
   ├── CODEGRAPH.json (full dependency map)
   └── skills/
   ```

**Duration:** 30-60 minutes (first-time scan)  
**Tokens:** 5-10M (one-time)

---

## Use Cases & Workflows

### Use Case 1: Add New Feature to Legacy App

**Scenario:** "Add subscription management to HART"

**Workflow:**

```
Step 1: Create Story
  /keel new-feature --story=HART-287 \
    --title="Subscription Management" \
    --description="Allow users to upgrade to paid tiers"

Step 2: Brainstorm (OPTIONAL for legacy)
  /keel brainstorm --story=HART-287
  → Generates 5 concepts for subscription models
  → User picks preferred approach

Step 3: Requirements
  /keel req --story=HART-287 \
    --feature="Subscription Management"
  → Analyzes existing code
  → Identifies integration points
  → Generates requirements respecting legacy patterns
  → Output: HART-287-requirements.md

Step 4: Design
  /keel design --story=HART-287
  → Reviews existing architecture
  → Identifies where to add subscription service
  → Minimizes changes to existing code
  → Output: HART-287-design.md

Step 5: Develop (with legacy awareness)
  /keel dev --story=HART-287 \
    --scope=feature \
    --respect-patterns=true
  → Follows existing code style
  → Uses established service patterns
  → Integrates with existing ORM/DB
  → Output: src/Service/SubscriptionService.php, etc.

Step 6: Test
  /keel test --story=HART-287 \
    --coverage-target=80
  → Tests new code thoroughly
  → Integration tests with existing features
  → Output: tests/

Step 7: Security Scan
  /keel sec --story=HART-287
  → SAST on new code
  → Check dependencies
  → OWASP validation
  → Output: HART-287-security.md

Step 8: Deploy to Legacy App
  /keel deploy --story=HART-287 \
    --target=production \
    --rollout=canary
  → Staged rollout (10% → 50% → 100%)
  → Monitoring setup
  → Runbooks
```

**Total time:** 4-6 hours (all phases)  
**Tokens:** 1-1.5M

---

### Use Case 2: Fix Bug in Legacy Code

**Scenario:** "Payment processing timeout in HART payment module"

**Workflow:**

```
Step 1: Analyze Defect
  /keel investigate --story=HART-288 \
    --issue="Payment timeout on slow networks"
  → Reads existing payment code
  → Identifies timeout location
  → Analyzes database queries
  → Output: root cause analysis

Step 2: Design Fix
  /keel design --story=HART-288 \
    --focus=fix \
    --component=PaymentService
  → Proposes solution
  → Tests against existing flow
  → Output: fix design doc

Step 3: Implement Fix
  /keel dev --story=HART-288 \
    --scope=payment \
    --mode=fix
  → Updates only affected code
  → Preserves existing behavior
  → Output: updated PaymentService.php

Step 4: Test & Verify
  /keel test --story=HART-288 \
    --scope=regression
  → Tests fix works
  → Regression tests on payment flow
  → Performance tests (slow network simulation)
  
Step 5: Deploy
  /keel deploy --story=HART-288 \
    --target=production \
    --priority=high
```

**Total time:** 2-3 hours  
**Tokens:** 400-600K

---

### Use Case 3: Refactor Legacy Code

**Scenario:** "Break circular dependency in HART models"

**Workflow:**

```
Step 1: Analyze Code
  /keel analyze --story=HART-289 \
    --type=refactor \
    --focus=circular-dependencies
  → Uses CodeGraph
  → Identifies A → B → C → A cycle
  → Proposes architecture changes
  → Output: refactor plan

Step 2: Design New Architecture
  /keel design --story=HART-289 \
    --focus=dependency-injection
  → Proposes using interfaces
  → Minimal breaking changes
  → Output: HART-289-design.md

Step 3: Refactor Code
  /keel dev --story=HART-289 \
    --scope=models \
    --mode=refactor
  → Updates dependencies
  → Implements interfaces
  → Output: refactored Model classes

Step 4: Validate with Tests
  /keel test --story=HART-289 \
    --coverage-target=90 \
    --scope=full
  → Tests all affected code
  → Integration tests
  → Regression tests
  
Step 5: Deploy with Care
  /keel deploy --story=HART-289 \
    --rollout=blue-green
    --monitor=strict
```

**Total time:** 6-8 hours  
**Tokens:** 1.5-2M

---

### Use Case 4: Upgrade Dependencies (Security)

**Scenario:** "Update to PHP 8.2 from PHP 8.0"

**Workflow:**

```
Step 1: Analyze Compatibility
  /keel analyze --story=HART-290 \
    --type=upgrade \
    --target="PHP 8.2"
  → Scans all code for deprecated features
  → Checks dependencies
  → Output: compatibility report

Step 2: Plan Upgrade
  /keel design --story=HART-290
  → Phased upgrade strategy
  → Breaking changes list
  → Output: upgrade plan

Step 3: Update Code
  /keel dev --story=HART-290 \
    --mode=upgrade \
    --auto-fixes=true
  → Updates deprecated code
  → Fixes type hints
  → Output: updated code

Step 4: Comprehensive Testing
  /keel test --story=HART-290 \
    --coverage-target=100
  → Full regression testing
  → Edge cases
  
Step 5: Stage Deployment
  /keel deploy --story=HART-290 \
    --rollout=canary \
    --monitor=intensive
```

**Total time:** 8-10 hours  
**Tokens:** 2-2.5M

---

## How CodeGraph Helps with Legacy Code

### Automatic Dependency Mapping

Before you run any agent, CodeGraph analyzes existing code:

```
HART Legacy Code Analysis:

Classes: 145
Functions: 892
Database Tables: 34
Models: 23
Controllers: 18
Services: 15
Test Files: 42

Dependencies:
  ├─ PaymentService depends on:
  │  ├─ StripeAPI
  │  ├─ UserModel
  │  ├─ OrderModel
  │  └─ SubscriptionModel
  │
  ├─ OrderModel depends on:
  │  ├─ UserModel (circular!) ⚠️
  │  ├─ ProductModel
  │  └─ PaymentService
  │
  └─ UserModel depends on:
     ├─ OrderModel (circular!) ⚠️
     ├─ SubscriptionModel
     └─ AuthService

Circular Dependencies Found: 2
  1. UserModel → OrderModel → UserModel
  2. PaymentService → OrderModel → UserModel → PaymentService

Risk Assessment:
  Overall: MEDIUM
  Refactor needed before: Large changes, scaling
```

### Impact Analysis

When you propose a change, CodeGraph shows impact:

```
Proposed Change: Add timeout to PaymentService.process()

Files Affected:
  ├─ src/Service/PaymentService.php (MODIFIED)
  ├─ src/Controller/OrdersController.php (USES)
  ├─ src/Model/OrderModel.php (USES)
  └─ tests/Service/PaymentServiceTest.php (TESTS)

Dependent Code:
  ├─ 3 controllers call PaymentService
  ├─ 5 models use PaymentService
  ├─ 8 tests cover PaymentService
  └─ 2 cron jobs trigger PaymentService

Breaking Changes: NONE
  ✓ Timeout parameter optional (default: existing value)
  ✓ Return type unchanged
  ✓ Exception types unchanged

Risk: LOW

Recommend:
  1. Update 8 tests (check timeout behavior)
  2. Monitor cron jobs (may take longer)
  3. Staged rollout
```

---

## Phase Applicability for Legacy Code

| Phase | Greenfield | Legacy | Notes |
|-------|-----------|--------|-------|
| Phase 0 (Onboard) | Skip | ✅ REQUIRED | Must analyze existing code first |
| Phase 1 (Init) | ✅ Create | Skip | Already have project structure |
| Phase 1.5 (Brainstorm) | ✅ Ideas | ✅ Optional | Useful for deciding approach |
| Phase 2 (Req) | ✅ Full spec | ✅ Change spec | Only spec what's NEW |
| Phase 3 (Design) | ✅ Full arch | ✅ Incremental | Design only new components |
| Phase 4a (Dev) | ✅ All code | ✅ New code | Generate new features/fixes |
| Phase 4b (Test) | ✅ Full suite | ✅ New + regression | Test new code + existing flows |
| Phase 4c (Sec) | ✅ Full scan | ✅ New + deps | Scan new code + dependency updates |
| Phase 5 (Deploy) | ✅ Full rollout | ✅ Staged | Careful rollout to production |

---

## Configuration for Legacy Projects

Create `.claude/CLAUDE-LEGACY.md`:

```yaml
# Legacy Project Configuration

project:
  name: HART
  stack: cakephp
  version: 4.4
  php-version: 8.1
  database: mysql

codebase:
  root: /path/to/hart
  source: src/
  tests: tests/
  database-dir: db/
  
patterns:
  service-layer: "src/Service/*Service.php"
  models: "src/Model/Entity/*.php"
  controllers: "src/Controller/*Controller.php"
  tests: "tests/TestCase/*.php"

constraints:
  preserve-backwards-compat: true
  no-breaking-changes: true
  test-coverage-min: 80
  security-scanning: required
  
rollback:
  enabled: true
  strategy: database-migrations-reversible
  monitoring-duration: 24h

team:
  frontend: ["Deepak Vaishnav", "Dharmendra Backrecha"]
  backend: ["Madan Kumawat"]
  qa: ["Pallav Kumar", "Trilok Soni"]
  devops: ["Sourav Pratap"]
```

---

## Common Legacy Code Scenarios

### Scenario 1: "Code Has No Tests"

```bash
/keel test --story=HART-X \
  --add-coverage=true \
  --target-coverage=80
```

Keel will:
1. Read existing code
2. Generate unit tests for functions/methods
3. Create integration tests for key flows
4. Target 80% coverage
5. Output: `/tests/Generated/*.php`

### Scenario 2: "Code Has Deprecated Dependencies"

```bash
/keel audit --codebase=/hart \
  --focus=dependencies \
  --check-security=true
```

Keel will:
1. List all dependencies with versions
2. Identify deprecated/vulnerable packages
3. Suggest upgrades
4. Test compatibility
5. Plan migration

### Scenario 3: "Code Is Monolithic (No Services)"

```bash
/keel refactor --story=HART-X \
  --focus=extract-services \
  --target-size=small
```

Keel will:
1. Identify cohesive code blocks
2. Propose service boundaries
3. Extract services (minimal breaking changes)
4. Test extraction
5. Deploy safely

### Scenario 4: "Need to Add Feature Fast"

```bash
/keel quick --story=HART-X \
  --feature="Add payment retry logic" \
  --mode=minimal
```

Keel will:
1. Skip design phase (use existing patterns)
2. Generate code matching existing style
3. Minimal tests (critical paths only)
4. Deploy immediately

---

## Token Usage for Legacy Code

| Scenario | Tokens | Time | Complexity |
|----------|--------|------|-----------|
| New feature | 1-1.5M | 4-6h | Medium |
| Bug fix | 400-600K | 2-3h | Low |
| Refactor | 1.5-2M | 6-8h | High |
| Dependency upgrade | 2-2.5M | 8-10h | High |
| Add tests | 500-700K | 3-4h | Medium |
| Security scan | 200-300K | 1-2h | Low |

---

## Integration with Existing Workflows

### Git Workflow

```bash
# Create feature branch (Keel will use existing convention)
git checkout -b feature/HART-287-subscriptions

# Run Keel phases
/keel req --story=HART-287
/keel design --story=HART-287
/keel dev --story=HART-287
/keel test --story=HART-287
/keel sec --story=HART-287

# Commit results
git add .
git commit -m "HART-287: Add subscription management"

# Create PR (manual, per existing process)
gh pr create --title "HART-287: Subscription Management"
```

### CI/CD Integration

```yaml
# .github/workflows/keel-hart.yml
name: Keel Development Pipeline

on:
  issues:
    types: [labeled]

jobs:
  keel-develop:
    if: contains(github.event.issue.labels.*.name, 'keel')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Extract Story ID
        id: story
        run: |
          STORY=$(echo "${{ github.event.issue.title }}" | grep -oP 'HART-\d+')
          echo "story=$STORY" >> $GITHUB_OUTPUT
      
      - name: Run Keel Pipeline
        uses: creativemyntra/keel@v2.1.0
        with:
          phase: 'full'
          story-id: ${{ steps.story.outputs.story }}
          
      - name: Create PR with Results
        run: |
          gh pr create \
            --title "Keel: ${{ steps.story.outputs.story }}" \
            --body "Auto-generated by Keel framework"
```

---

## Risks & Mitigation

### Risk 1: Breaking Existing Code

**Mitigation:**
- CodeGraph analyzes impact before changes
- Integration tests validate existing flows
- Staged rollout catches issues early
- Rollback available at each checkpoint

### Risk 2: Code Style Mismatch

**Mitigation:**
- Keel learns patterns from existing code
- Applies linting (PSR-12 for PHP)
- Human review before deployment
- Can specify style rules in CLAUDE.md

### Risk 3: Database Migrations

**Mitigation:**
- Migrations are reversible
- Staged rollout tests migrations
- Rollback restores database state
- Monitor query performance

### Risk 4: Performance Degradation

**Mitigation:**
- CodeGraph shows complexity impact
- Performance tests validate speed
- Production monitoring for 24h after deploy
- Alert thresholds set per feature

---

## Best Practices for Legacy Code

1. **Start Small**
   - First story: Simple bug fix
   - Second story: Small feature
   - Third story: Larger feature/refactor

2. **Use CodeGraph Early**
   - Understand dependencies before proposing changes
   - Impact analysis prevents surprises
   - Identifies refactor opportunities

3. **Respect Existing Patterns**
   - Follow existing service architecture
   - Use established ORM/database patterns
   - Match existing naming conventions

4. **Comprehensive Testing**
   - Test new code thoroughly
   - Regression tests on affected features
   - Performance tests for critical paths

5. **Staged Rollout Always**
   - Never 100% deploy immediately
   - Start with 10%, monitor 4h
   - Expand to 50%, monitor 8h
   - Full rollout only after success

6. **Monitor & Measure**
   - Error rates, performance, usage
   - Compare before/after metrics
   - Quick rollback if issues arise

---

## Example: HART Subscription Feature (Real-World)

**Story:** HART-287 - Add subscription management  
**Scope:** Add ability for users to upgrade to paid tiers

### Phase 0: Onboarding
```bash
/keel legacy --init --codebase=/hart
# Scans HART, builds CodeGraph, identifies payment patterns
# Time: 45 min | Tokens: 8M
```

### Phase 2: Requirements
```bash
/keel req --story=HART-287 \
  --feature="Subscription Management"
# Analyzes existing payment flow
# Proposes subscription tables/services
# Output: HART-287-requirements.md
# Time: 1h | Tokens: 300K
```

### Phase 3: Design
```bash
/keel design --story=HART-287
# Reviews existing PaymentService, UserModel
# Designs SubscriptionService, SubscriptionModel
# Minimal changes to existing code
# Output: HART-287-design.md
# Time: 1h | Tokens: 200K
```

### Phase 4a: Development
```bash
/keel dev --story=HART-287 \
  --respect-patterns=true
# Generates:
#   - SubscriptionService.php (uses existing patterns)
#   - SubscriptionModel.php (extends existing BaseModel)
#   - SubscriptionsController.php
#   - Migration for subscription tables
# Time: 1.5h | Tokens: 400K
```

### Phase 4b: Testing
```bash
/keel test --story=HART-287 \
  --coverage-target=85
# Generates:
#   - Unit tests for SubscriptionService
#   - Integration tests for subscription flow
#   - Regression tests for payment flow
#   - Performance tests
# Achieves: 87% coverage on new code, 0 failures
# Time: 1h | Tokens: 250K
```

### Phase 4c: Security
```bash
/keel sec --story=HART-287
# Scans new code
# Checks payment/PCI compliance
# OWASP validation
# Result: 0 HIGH findings
# Time: 30m | Tokens: 150K
```

### Phase 5: Deployment
```bash
/keel deploy --story=HART-287 \
  --rollout=canary \
  --monitor=24h
# Stage 1: 10% (1000 users) - 4h monitoring
# Stage 2: 50% (50K users) - 8h monitoring
# Stage 3: 100% (1M users) - Full monitoring
# Result: 5% conversion, $50K MRR, 99.9% success
```

**Total Time:** ~5 hours  
**Total Tokens:** 1.3M  
**Result:** Production feature, fully tested, secure, monitored

---

**Status:** Ready for legacy code adoption  
**Next:** Apply to your HART project with Phase 0 onboarding
