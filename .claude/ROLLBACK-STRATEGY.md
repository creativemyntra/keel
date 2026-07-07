# Phase 1.3: Rollback Strategy

**Production Hardening - Component 3 of 4**

---

## Overview

Things go wrong. A bad agent output might break the codebase, miss critical requirements, or create security vulnerabilities. The rollback system ensures you can always return to the last known good state.

---

## Checkpoint System

### What Gets Checkpointed

At the end of each phase, a checkpoint is created:

```
Phase 1 (INIT) ──→ CHECKPOINT_1: Project scaffolding
                   - Directory structure
                   - Initial files (CLAUDE.md, .gitignore, etc.)
                   - Git commit hash

Phase 1.5 (BRAINSTORM) ──→ CHECKPOINT_1.5: Concepts
                          - 5 brainstorm concepts
                          - Scoring
                          - Top candidates

Phase 2 (REQ) ──→ CHECKPOINT_2: Requirements
               - Requirement document
               - Acceptance criteria (BDD)
               - Risk assessment

Phase 3 (DESIGN) ──→ CHECKPOINT_3: Architecture
                    - API specification
                    - Database schema
                    - Architecture diagram

Phase 4a (DEV) ──→ CHECKPOINT_4a: Generated code
                  - src/
                  - Controllers, Services, Models
                  - db/migrations/

Phase 4b (TEST) ──→ CHECKPOINT_4b: Test suite
                   - tests/
                   - Unit, integration, perf tests

Phase 4c (SEC) ──→ CHECKPOINT_4c: Security scan results
                  - Security findings
                  - Remediations

Phase 5 (DEPLOY) ──→ CHECKPOINT_5: Deployment plan
                    - 4-stage rollout plan
                    - Feature flag config
                    - Monitoring setup
```

### Checkpoint Structure

```json
{
  "checkpoint_id": "cp_4a_20260707_001",
  "story_id": "KEEL-42",
  "phase": "4a",
  "agent": "dev-agent",
  "timestamp": "2026-07-07T10:35:00Z",
  
  "metadata": {
    "previous_checkpoint": "cp_3_20260707_001",
    "token_used": 285000,
    "duration_seconds": 300,
    "success": true
  },
  
  "output": {
    "files_created": [
      "src/Controller/SubscriptionController.php",
      "src/Service/SubscriptionService.php",
      "src/Model/Entity/Subscription.php",
      "db/migrations/20260707_create_subscription_tables.php"
    ],
    "git_commit": "a1b2c3d4e5f6...",
    "validations": {
      "hallucination_detector": {
        "confidence_score": 0.92,
        "status": "approved"
      },
      "codegraph": {
        "circular_deps": 0,
        "breaking_changes": 0,
        "complexity_impact": "+10%"
      }
    }
  },
  
  "validation_status": "passed",
  "lane2_gate": "open"
}
```

---

## Rollback Scenarios

### Scenario 1: Bad Dev Output (Fixable)

```
Phase 4a: dev-agent creates code
    ↓
Validation: hallucination-detector finds issues
    ├─ Hallucinated field name
    ├─ Missing import
    ├─ Syntax error
    ↓
Decision: FIXABLE
    ↓
Option A: Auto-fix (detector suggests fix)
  → dev-agent re-runs with suggestion
  → Output re-validated
  → Continue if approved
  
Option B: Rollback
  → Return to CHECKPOINT_3 (Design output)
  → Manual fix or redesign
  → Re-run dev-agent with updated design
```

### Scenario 2: Bad Test Output (Coverage Inflated)

```
Phase 4b: test-agent claims 85% coverage
    ↓
Validation: Coverage claim validated
    ├─ Only 5 tests written
    ├─ 5 tests ≈ 20-30% coverage realistically
    ├─ 85% is hallucination
    ↓
Decision: NOT FIXABLE (agent lying)
    ↓
Rollback:
  → Return to CHECKPOINT_4a (Code output)
  → Keep code (it's good)
  → Discard inflated coverage claim
  → Re-run test-agent with coverage constraints
  → "Write tests until 80% actual coverage"
```

### Scenario 3: Breaking Change (Design Issue)

```
Phase 4a: dev-agent creates code that breaks API
    ↓
Validation: CodeGraph impact analysis detects breaking change
    ├─ Changes API signature
    ├─ Affects 15 existing callers
    ├─ Not backcompat
    ↓
Decision: FUNDAMENTAL DESIGN ISSUE
    ↓
Rollback:
  → Return to CHECKPOINT_2 (Requirements)
  → Review if breaking change is necessary
  → Update requirements with API versioning strategy
  → Re-run design-agent
  → Re-run dev-agent with new design
```

---

## Rollback Operations

### View Checkpoints

```bash
/keel checkpoints --story=KEEL-42

Output:
────────────────────────────────────────
Story: KEEL-42
────────────────────────────────────────
✓ CHECKPOINT_1 (2026-07-07 10:00)
  Phase: 1 (INIT)
  Agent: init-agent
  Status: Approved
  Size: 2MB
  
✓ CHECKPOINT_1.5 (2026-07-07 10:05)
  Phase: 1.5 (BRAINSTORM)
  Agent: brainstorm-agent
  Status: Approved
  5 concepts, top 2 selected
  
✓ CHECKPOINT_2 (2026-07-07 10:10)
  Phase: 2 (REQ)
  Agent: req-agent
  Status: Approved
  9 requirements, 5 AC
  
✓ CHECKPOINT_3 (2026-07-07 10:20)
  Phase: 3 (DESIGN)
  Agent: design-agent
  Status: Approved
  API spec, schema, architecture
  
✗ CHECKPOINT_4a (2026-07-07 10:35)
  Phase: 4a (DEV)
  Agent: dev-agent
  Status: FAILED VALIDATION
  Issues: Hallucinated field, missing import
  
────────────────────────────────────────
```

### Rollback to Checkpoint

```bash
# Rollback to Design phase (undo bad dev output)
/keel rollback --checkpoint=CHECKPOINT_3

# Rollback with reason
/keel rollback --checkpoint=CHECKPOINT_3 \
  --reason="dev-agent output has unfixable breaking changes"

# Dry run (show what would be rolled back)
/keel rollback --checkpoint=CHECKPOINT_3 --dry-run
```

Output:
```
Rollback plan:
─────────────────────────────────────
Current state: Phase 4a (DEV) - FAILED
Target state: Phase 3 (DESIGN) - APPROVED
─────────────────────────────────────

Files to be removed:
  src/Controller/SubscriptionController.php
  src/Service/SubscriptionService.php
  src/Model/Entity/Subscription.php
  db/migrations/20260707_create_subscription_tables.php

State to be restored:
  From CHECKPOINT_3 (timestamp: 2026-07-07 10:20)
  Git commit: xxx...
  
Memory update:
  Add: "Rollback reason: breaking changes in dev-agent output"
  Record: Which checkpoint, when, why

Confirm rollback? (Y/n)
```

### Partial Rollback

```bash
# Keep some outputs, discard others
/keel rollback --phase=4a \
  --keep-files=src/Model \
  --discard-files=src/Controller,src/Service

# Useful when only part of agent output is bad
```

---

## Lane2 Gates & Rollback

### Gate Failure = Rollback Available

```
Phase 3 (DESIGN) ──→ Approved ──→ CHECKPOINT_3
         ↓
Phase 4a (DEV) ──→ VALIDATION ──→ Confidence: 0.6 (FAILED)
         ↓
Lane2 gate CLOSED
         ↓
Options:
  1. Fix and retry (auto-fix if hallucination-detector suggests)
  2. Rollback to CHECKPOINT_3 (undo dev-agent)
  3. Manual review (fix in editor, re-validate)
```

---

## Memory Recording

Every rollback is recorded:

```markdown
# rollback_history.md
Type: project

## Rollback 1: 2026-07-07 10:35
From: CHECKPOINT_4a (DEV phase, dev-agent)
To: CHECKPOINT_3 (DESIGN phase, design-agent)
Reason: Hallucinated field name, missing import
Duration: 5 min (10:35 rollback → 10:40 dev-agent retried)
Outcome: SUCCESS (dev-agent fixed issues)

Lessons learned:
- dev-agent needs better validation before output
- Missing import detection improved in hallucination-detector
- Recommend adding field name validation guardrail

## Rollback 2: 2026-07-07 11:00
From: CHECKPOINT_4b (TEST phase, test-agent)
To: CHECKPOINT_4a (DEV phase)
Reason: Inflated test coverage claim (85% vs actual 28%)
Duration: 10 min (11:00 rollback → 11:10 test-agent retried)
Outcome: SUCCESS (test-agent wrote more tests, reached 82% actual)

Lessons learned:
- test-agent tends to inflate coverage claims
- Need coverage cap constraints
- Pattern added to hallucination-detector

## Analysis
Rollback frequency: 2 rollbacks in 1 hour (initial development)
Typical: 1 rollback per 5-10 stories during development
Status: Normal
```

---

## Preventing Rollbacks

### Validation Before Rollback

Most issues are caught before rollback needed:

```
Agent output
    ↓
[5-layer hallucination-detector validation]
    ├─ Syntax validation: catches 40% of issues early
    ├─ Reference validation: catches 30%
    ├─ Logic validation: catches 15%
    ├─ Claim validation: catches 10%
    └─ Pattern detection: catches 5%
    ↓
If confidence >= 0.70: Continue (no rollback needed)
If confidence < 0.70: Try to fix or rollback
```

### Auto-Fix (Better Than Rollback)

```
Agent output: Hallucinated field name
    ↓
Detector: Suggests fix "Change X to Y"
    ↓
Option 1: AUTO-FIX
  → Apply suggestion automatically
  → Re-validate
  → Continue
  → BETTER than rollback (no re-run needed)
  
Option 2: ROLLBACK
  → Undo all work
  → Re-run agent
  → Validate again
  → Takes more time
```

---

## Safety Guarantees

### Checkpoint Integrity

```
Every checkpoint:
  ✓ Is immutable (read-only after creation)
  ✓ Has cryptographic hash (detect corruption)
  ✓ Is backed up (replicated storage)
  ✓ Can be restored atomically (all-or-nothing)
  ✓ Is timestamped (audit trail)
```

### No Data Loss

```
When you rollback:
  ✓ Old state is preserved (can redo rollback)
  ✓ Rollback is logged (audit trail)
  ✓ Memory records reason (learn from it)
  ✓ New checkpoint created (continue from there)
```

---

## Configuration

```yaml
rollback:
  enabled: true
  
  checkpoints:
    create_at_phase_end: true
    retention_days: 90
    backup_location: "gs://backup-bucket"
    replication_factor: 3
  
  safety:
    immutable_after_creation: true
    verify_hash_on_restore: true
    log_all_rollbacks: true
  
  auto_recovery:
    retry_after_rollback: true
    max_retries: 3
    learning_enabled: true
```

---

## Commands

```bash
# View checkpoints
/keel checkpoints --story=KEEL-42
/keel checkpoints --phase=4a

# Rollback
/keel rollback --checkpoint=CHECKPOINT_3
/keel rollback --checkpoint=CHECKPOINT_3 --dry-run

# Redo (reapply after rollback)
/keel redo --after-rollback

# View rollback history
/keel rollback-history --story=KEEL-42
/keel rollback-history --last=7days

# Checkpoint management
/keel checkpoint --create --phase=4a
/keel checkpoint --list --story=KEEL-42
/keel checkpoint --delete --checkpoint=CHECKPOINT_2 --confirm
```

---

**Status:** Component 3 of 4 (Phase 1 Production Hardening)  
**Effort:** ~2-3 days to implement  
**Priority:** HIGH (safety mechanism)

Next: Component 4 - Feedback Loop Automation
