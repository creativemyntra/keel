# Three-Layer Compliance Enforcement Architecture

**Document:** Architecture & Design  
**Status:** Production  
**Date:** 2026-08-07  
**Related:** P0-2 Remediation, ADR-003

---

## Overview

Compliance enforcement in Keel uses a **three-layer defense architecture** designed to catch violations across different development workflows. However, **only Layer 1 (GitHub Actions) is non-bypassable**. Layers 2 and 3 provide fast feedback and in-pipeline confirmation, but they can be skipped by contributors who don't use git hooks or Keel.

**Critical Constraint:** The entire system is only secure if **Layer 1 (GitHub Actions) is configured as a REQUIRED status check** in GitHub branch protection. If Layer 1 is not required, all enforcement is bypassable.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                    Compliance Check Execution Paths                     │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Developer Workflow:                                                    │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐  │
│  │  Edit code in   │ --> │  git commit +   │ --> │   git push      │  │
│  │  plain editor   │     │   git push      │     │  (to GitHub)    │  │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘  │
│         │                         │                       │             │
│         v                         v                       v             │
│      Layer 3:              Layer 2:              Layer 1:              │
│   Keel Gate               Pre-Push Hook         GitHub Actions         │
│   (IF Keel used)          (IF hooks exist)      (ALWAYS runs)          │
│   Can skip if no          Can skip with         Cannot skip            │
│   Keel pipeline           --no-verify           Must have branch       │
│                           Runs locally          protection enabled     │
│         │                         │                       │             │
│         └─────────────────────────┴───────────────────────┘             │
│                         All write to same audit trail                   │
│                                                                         │
│  ✅ = Catches violation                                                 │
│  ❌ = Can be bypassed                                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Layer Details

### Layer 1: GitHub Actions (AUTHORITATIVE)

**Purpose:** Final gate that cannot be bypassed by local environment configuration  
**Bypassable:** NO (if configured as required status check)

**Execution Path:**
1. Developer pushes code to GitHub (via git, CLI, web UI, or from fork)
2. GitHub detects push and automatically runs `.github/workflows/compliance-check.yml`
3. Workflow executes `lib/compliance-evaluator.cjs` with story context
4. Checks C-0014 through C-0018 run
5. Result: PASS or FAIL
6. If branch protection is configured and check FAILS, merge button is disabled

**Cannot Be Bypassed By:**
- `git push --no-verify` (hook is not the enforcement)
- Plain editor + git (no hooks running locally)
- GitHub web-UI PR creation (GitHub Actions is enforced server-side)
- Pull request from a fork (fork inherits the enforcement)

**Can Be Bypassed By:**
- GitHub branch protection NOT being set as required status check (code limitation)
- Repository admin disabling the workflow
- Repository admin removing the required status check

**Audit Trail Entry:**
```json
{
  "timestamp": "2026-08-07T12:00:00Z",
  "event": "compliance_check",
  "phase": "github_actions",
  "entry_point": "github-actions",
  "checks": [
    { "id": "C-0014", "status": "PASS", "detail": "..." },
    { "id": "C-0015", "status": "PASS", "detail": "..." }
  ],
  "verdict": "PASS"
}
```

---

### Layer 2: Git Pre-Push Hook (COURTESY)

**Purpose:** Fast local feedback before push attempt  
**Bypassable:** YES

**Execution Path:**
1. Developer runs `git push origin branch`
2. Git client executes `.git/hooks/pre-push-compliance` before push
3. Hook calls `lib/compliance-evaluator.cjs` with local story context
4. Checks run locally (fast, no GitHub API)
5. Result: PASS or FAIL
6. If FAIL, push is rejected and message is shown
7. Developer can `git push --no-verify` to skip this check

**Can Be Bypassed By:**
- `git push --no-verify` (explicitly skips pre-push hook)
- Environment without git hooks installed (e.g., GitHub web UI, git clone without hooks setup)
- Plain editor + git on machine without hooks

**Cannot Be Bypassed By:**
- Anything, if developer is willing to use `--no-verify`

**Audit Trail Entry:**
```json
{
  "timestamp": "2026-08-07T12:00:00Z",
  "event": "compliance_check",
  "phase": "pre_push",
  "entry_point": "git-pre-push",
  "bypass_method": null,
  "checks": [
    { "id": "C-0014", "status": "PASS" }
  ],
  "verdict": "PASS"
}
```

If `--no-verify` is used:
```json
{
  "timestamp": "2026-08-07T12:00:00Z",
  "event": "compliance_check",
  "phase": "pre_push",
  "entry_point": "git-pre-push",
  "bypass_method": "--no-verify",
  "bypass_logged": true,
  "message": "Pre-push compliance check bypassed with --no-verify"
}
```

---

### Layer 3: Keel Pipeline Gate (COURTESY)

**Purpose:** In-pipeline confirmation during Keel orchestration  
**Bypassable:** YES

**Execution Path:**
1. Developer runs `keel start-work` to initialize story
2. Story progresses through phases (1-7)
3. At phase transition, developer runs `gate --phase 8 --verdict PASS`
4. Gate executes `scripts/keel-state.cjs` checkRegistry
5. Checks C-0014 through C-0018 run
6. Result: PASS or FAIL
7. If FAIL, story is NOT advanced and error is shown
8. If developer doesn't use Keel pipeline, this gate never runs

**Can Be Bypassed By:**
- Not running Keel pipeline (using plain editor + git instead)
- Skipping the gate step in Keel workflow
- Not using Keel at all

**Cannot Be Bypassed By:**
- Any method, if Keel is not used in workflow

**Audit Trail Entry:**
```json
{
  "timestamp": "2026-08-07T12:00:00Z",
  "event": "compliance_check",
  "phase": "keel_gate",
  "entry_point": "keel",
  "phase_transition": { "from": 7, "to": 8 },
  "checks": [
    { "id": "C-0014", "status": "PASS" },
    { "id": "C-0015", "status": "PASS" }
  ],
  "verdict": "PASS"
}
```

---

## Bypass Scenarios & Security Implications

### Scenario 1: Correctly Configured (SECURE)

**Setup:**
- GitHub branch protection enabled for prod/preprod
- "compliance-check" is REQUIRED status check
- Developer environment has git hooks
- Developer uses Keel pipeline

**Attack Attempt:** Commit CJIS violation and push

```
Layer 1 ✅: GitHub Actions catches and blocks merge
Layer 2 ✅: Pre-push hook warns locally
Layer 3 ✅: Keel gate blocks story advancement
```

**Result:** 🔒 SECURE — Violation is blocked at multiple points

---

### Scenario 2: L1 NOT Configured as Required (VULNERABLE)

**Setup:**
- GitHub Actions workflow exists but is NOT a required status check
- Layers 2 and 3 are configured

**Attack Attempt:** `git push --no-verify` + merge via GitHub web UI

```
Layer 1 ❌: Workflow runs but doesn't block (not required)
Layer 2 ❌: Bypassed with --no-verify flag
Layer 3 ❌: Not using Keel
```

**Result:** 🚨 **BYPASS SUCCESSFUL** — Code merged despite violations

**Mitigation:** MUST enable Layer 1 as required status check

---

### Scenario 3: Plain Editor + Git (No Hooks, No Keel)

**Setup:**
- Developer uses plain text editor
- No Keel installed
- Git hooks exist but contributor never pulls latest hooks

**Attack Attempt:** Edit, commit, push

```
Layer 1 ✅: GitHub Actions catches violation
Layer 2 ❌: No hooks in local environment
Layer 3 ❌: Not using Keel pipeline
```

**Result:** 🔒 CAUGHT — Layer 1 blocks merge (if configured as required)

**Mitigation:** Layer 1 must be required status check

---

### Scenario 4: Fork + PR

**Setup:**
- Attacker forks repo
- Modifies code in fork (no Keel, no hooks)
- Creates PR from fork to main repo

**Attack Attempt:** Merge PR with violations

```
Layer 1 ✅: GitHub Actions runs on fork PR and enforces
Layer 2 ❌: No hooks in fork environment
Layer 3 ❌: Not using Keel
```

**Result:** 🔒 CAUGHT — Fork inherits enforcement from main repo

**Mitigation:** Layer 1 required status check applies to forks

---

## Security Model: Defense in Depth

The three-layer architecture provides **defense in depth**, not **redundant defense**. Each layer serves a different purpose:

1. **Layer 1 (GitHub Actions):** Production enforcement — catch violations before they land in production
2. **Layer 2 (Pre-push hook):** Developer feedback — quick local response without GitHub API delay
3. **Layer 3 (Keel gate):** Pipeline confirmation — ensure compliance within orchestration workflow

**However, Layers 2 and 3 are NOT protective if Layer 1 is misconfigured.**

The correct mental model:
- Layer 1 is the **only enforcement**
- Layers 2 and 3 are **nice-to-have convenience** that happen to catch some violations early
- If Layer 1 is not working, Layers 2 and 3 provide a **false sense of security**

---

## Configuration Verification Checklist

**Before deploying compliance enforcement, verify:**

### Layer 1: GitHub Actions Required Status Check

```
1. Go to: https://github.com/YOUR-REPO/settings/branches

2. For branch "prod":
   - [ ] Branch protection rule exists
   - [ ] "Require status checks to pass before merging" = ENABLED
   - [ ] "compliance-check" workflow is in the required checks list
   - [ ] "Allow force pushes" = DISABLED
   - [ ] "Require up to date before merge" = ENABLED

3. For branch "preprod":
   - [ ] Same as prod

4. For branch "dev" (optional but recommended):
   - [ ] "Require status checks to pass before merging" = ENABLED
   - [ ] "compliance-check" is required
```

**CRITICAL:** If any of the above is NOT checked, compliance enforcement is **BYPASSED**.

### Layer 2: Git Pre-Push Hook

```
1. Check if hook file exists:
   ls -la .git/hooks/pre-push-compliance

2. Verify hook is executable:
   [ -x .git/hooks/pre-push-compliance ] && echo "Executable" || echo "NOT executable"

3. Verify audit log directory:
   ls -la .keel/PUSH_AUDIT.log
```

### Layer 3: Keel Pipeline Gate

```
1. Check checkRegistry in keel-state.cjs:
   grep -c "C-00[0-9][0-9]:" scripts/keel-state.cjs

2. Verify developers can run:
   keel --help | grep "gate"

3. Check if Keel is in documentation:
   grep -r "keel start-work" docs/
```

---

## Audit Trail Correlation

All three layers write to the same audit trail (`.keel/state/STORY-ID/audit-log.jsonl`) with `entry_point` tags:

```json
{ "entry_point": "github-actions", ... }
{ "entry_point": "git-pre-push", ... }
{ "entry_point": "keel", ... }
```

This enables:
1. **Correlation:** Trace which layer caught a violation
2. **Audit:** See if developer used `--no-verify` (Layer 2 bypass)
3. **Analysis:** Understand enforcement coverage across repositories

---

## Limitations (By Design)

### Code Cannot Configure GitHub Branch Protection

GitHub branch protection settings are stored in GitHub's API and database, not in the repository. Code cannot modify these settings.

**Why?** Intentional design choice by GitHub to prevent code from modifying its own enforcement. This ensures that enforcement cannot be weakened by code changes alone — it requires human action via GitHub UI.

**Mitigation:** Repository admins must manually enable branch protection via GitHub Settings. This step is CRITICAL and cannot be automated.

### Code Cannot Enforce Hook Installation

Git hooks are stored in `.git/hooks/` (which is not typically committed). They cannot be enforced to be present on all contributors' machines.

**Why?** Git hooks are local to the repository clone. If a contributor doesn't update their clone, they might have stale hooks.

**Mitigation:** Layer 1 (GitHub Actions) is always active on GitHub and cannot be escaped by local hook issues.

### Code Cannot Prevent --no-verify

The `--no-verify` flag explicitly asks git to skip pre-push and pre-commit hooks. Code cannot prevent its use.

**Why?** Intentional git design to allow developers to bypass hooks in emergencies. The bypass is logged to audit trail for accountability.

**Mitigation:** Layer 1 (GitHub Actions) runs on GitHub regardless of local --no-verify usage. Audit log shows when --no-verify was used.

---

## Future Improvements (Not Yet Implemented)

1. **Signed Prescan Files**
   - Sign prescan.json with a key
   - Validate signature in C-0015
   - Prevents tampering with evidence

2. **Webhook Integrity Verification**
   - Use GitHub webhook signatures to verify Layer 1 authenticity
   - Ensure enforcement came from GitHub, not a local mock

3. **Automated Branch Protection Verification**
   - CI job that periodically checks branch protection is still enabled
   - Alert if someone accidentally disables it

4. **Immutable Audit Logs**
   - Store audit logs in an append-only system
   - Makes audit trail tamper-evident

---

## Decision Log

**Why three layers instead of one?**

Three layers provide:
1. Fast feedback (Layer 2 & 3 local feedback vs. Layer 1 GitHub API)
2. Different trust domains (local developer environment vs. GitHub infrastructure)
3. Defense in depth (catches violations early at multiple points)

**Why is Layer 1 authoritative instead of Layer 3 (Keel)?**

- Keel is optional (developers can work without it)
- GitHub is where code merges happen
- GitHub branch protection is mandatory for critical branches
- Enforcement should be at the point of merge, not in-pipeline

**Why allow Layer 2 and Layer 3 bypass?**

- Layer 2 bypass (--no-verify) allows emergency hotfixes
- Layer 3 bypass (no Keel) allows developers who don't use Keel
- Audit trail logs both bypasses
- Layer 1 (GitHub Actions) is unbypassable to catch violations

---

## References

- **ADR-003:** Mechanical Enforcement vs. Agent Instructions (.keel/memory/decisions/ADR-003-*.md)
- **G-19:** Compliance Gate Contract (.keel/GUARDRAILS.md)
- **P0-2 Remediation:** This document
- **Enforcement Code:** lib/compliance-evaluator.cjs, scripts/keel-state.cjs, .github/workflows/compliance-check.yml
