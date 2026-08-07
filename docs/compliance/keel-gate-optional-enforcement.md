# P0-5: Keel Gate Optional Enforcement

**Purpose:** Document that Keel gate (Layer 3) is optional courtesy enforcement  
**Status:** ADDRESSED (Documentation)  
**Date:** 2026-08-07  
**Related:** P0-5 Remediation, Three-Layer Enforcement Architecture

---

## Overview

Keel gate (Layer 3) runs compliance checks **only if** the Keel pipeline is used. This is intentional design:

- **Keel is optional** — Developers can work without it
- **Layer 3 is courtesy** — Provides in-pipeline feedback for users of Keel
- **Layer 1 is authoritative** — GitHub Actions enforces regardless of Keel

**Critical point:** If someone doesn't use Keel, they skip Layer 3. But they cannot skip Layer 1 (GitHub Actions), which is the real enforcement.

---

## What Is The Keel Gate?

The Keel gate is a compliance check that runs during story phase transitions:

**Command:**
```bash
keel gate --phase N --verdict PASS
```

**What it does:**
1. Takes current story state
2. Runs C-0014 through C-0018 compliance checks from `scripts/keel-state.cjs`
3. Returns PASS or FAIL verdict
4. Blocks story advancement if FAIL

**When it runs:**
- Only when developer explicitly runs `keel gate` command
- Only if developer is using Keel pipeline
- Not automatically (must be triggered manually)

---

## How It Works (Developer Workflow)

### Using Keel Pipeline (WITH Keel Gate)

```bash
# Step 1: Initialize story with compliance scope
keel start-work --story HART-287 --cjis-scope

# Step 2: Work on story (phases 1-7)
... edit code, run tests ...

# Step 3: Transition to security phase (phase 8)
# This is where Keel gate runs
keel gate --phase 8 --verdict PASS

# If gate FAILS:
# ❌ Error: C-0015 prescan.json missing
# Story does NOT advance to phase 8
# Developer must fix and retry

# If gate PASSES:
# ✅ Story advanced to phase 8
# Compliance checks passed
```

### WITHOUT Keel Pipeline (NO Keel Gate)

```bash
# Developer uses plain editor + git
# No Keel commands run
# No story state created
# Layer 3 gate never executes

# But Layer 1 (GitHub Actions) STILL ENFORCES:
# 1. Developer commits code
# 2. git push origin feat/branch
# 3. GitHub Actions workflow runs (cannot be skipped)
# 4. Compliance check FAILS
# 5. PR merge is blocked

# Developer sees:
# ❌ GitHub PR: "compliance-check failed"
# Must fix issue to merge
```

---

## Comparison: With vs. Without Keel

| Aspect | With Keel | Without Keel |
|--------|-----------|-------------|
| Layer 3 (Keel gate) | ✅ Runs | ❌ Skipped |
| Layer 2 (pre-push hook) | ✅ Runs (local) | ❌ Skipped (no hooks) |
| Layer 1 (GitHub Actions) | ✅ Runs | ✅ Runs |
| **Result** | Caught early (phase 8) | Caught at merge time (GitHub) |
| **Advantage** | Fail fast, in-pipeline feedback | Works without Keel |
| **Disadvantage** | Requires Keel usage | Less feedback during development |

---

## Why Layer 3 Is Optional

**Design principle:** Compliance is enforced at merge time (Layer 1), not during development.

**Benefits of optional Layer 3:**
1. **Works for all developers** — Those not using Keel still get enforcement
2. **Fail-safe design** — If Layer 3 is skipped, Layer 1 still catches violations
3. **Flexibility** — Teams can choose to use Keel for early feedback or skip it
4. **No dependencies** — Compliance enforcement doesn't require Keel installation

**Trade-off:**
- With Keel: Get feedback at phase 8 (earlier)
- Without Keel: Get feedback at merge time (later, but still caught)

Both paths lead to enforcement; Keel just provides earlier feedback.

---

## When Layer 3 Doesn't Run

Layer 3 (Keel gate) is skipped in these scenarios:

**Scenario 1: Developer doesn't use Keel**
```bash
# Edit files, commit, push (no keel commands)
git checkout -b feat/my-feature
# ... edit code ...
git commit -m "..."
git push origin feat/my-feature
# Keel gate never ran (Layer 3 skipped)
# But Layer 1 (GitHub Actions) still runs
```

**Scenario 2: Developer uses Keel but skips gate step**
```bash
keel start-work --story HART-287 --cjis-scope
# ... work on story ...
git push origin feat/HART-287
# Developer never ran: keel gate --phase 8
# Keel gate never ran (Layer 3 skipped)
# But Layer 1 (GitHub Actions) still runs
```

**Scenario 3: Compliance-scoped story without Keel state**
```bash
# Story is created outside Keel (manual directory)
# .keel/state/STORY-ID/ doesn't exist
# Keel gate cannot find story
# Keel gate never ran (Layer 3 skipped)
# But Layer 1 (GitHub Actions) still runs
```

**In all cases:** Layer 1 (GitHub Actions) enforcement catches violations at merge time.

---

## Workflow: How to Use Keel Gate

For developers who want **early compliance feedback**, use Keel:

### Step 1: Initialize Story with Compliance Scope

```bash
keel start-work \
  --story HART-287 \
  --cjis-scope  # Marks story as CJIS-scoped
```

**What this does:**
- Creates `.keel/state/HART-287/manifest.json`
- Sets `compliance_scopes: ["cjis"]`
- Initializes compliance tracking

### Step 2: Work Through Phases 1-7

```bash
# Phase 1: Design
keel gate --phase 1 --verdict PASS

# Phase 2: ...
keel gate --phase 2 --verdict PASS

# ... continue through phases ...

# Phase 7: E2E testing (creates prescan.json)
keel gate --phase 7 --verdict PASS
```

### Step 3: Transition to Security Phase (Phase 8)

```bash
# Phase 8: Security Engineer
# This is where compliance checks run
keel gate --phase 8 --verdict PASS
```

**Compliance checks that run:**
- C-0014: compliance_scope_declared (profile exists)
- C-0015: compliance_evidence_present (prescan.json exists and is valid)
- C-0016: compliance_evidence_fresh (evidence not stale)
- C-0017: compliance_pattern_provenance (patterns sourced)
- C-0018: compliance_control_terminal_state (controls terminal)

**If any check FAILS:**
```
❌ C-0015: prescan.json missing before security phase
Story advancement blocked. Fix the issue and retry.
```

**If all checks PASS:**
```
✅ All compliance checks passed
Story advanced to phase 8
```

### Step 4: Continue with Keel Pipeline

```bash
# Phase 9: Technical Writer
keel gate --phase 9 --verdict PASS

# Phase 10: Release Manager
keel gate --phase 10 --verdict PASS
```

---

## For Developers NOT Using Keel

If you're not using Keel pipeline, you still get compliance enforcement:

**Workflow:**
1. Edit code in your editor of choice
2. Commit to feature branch: `git commit ...`
3. Push to GitHub: `git push origin feat/...`
4. Create PR to `dev` via GitHub web UI
5. GitHub Actions workflow runs automatically
6. If compliance check FAILS: PR shows red, merge blocked
7. Fix issue and push again
8. GitHub Actions re-runs check
9. If compliance check PASSES: Merge is allowed

**Result:** Same compliance enforcement, but feedback comes at merge time instead of phase 8.

---

## Why This Design Is Safe

**Threat:** Developer skips Layer 3 (Keel gate) and violates compliance

**Defense layers:**

1. **Layer 2 (Pre-push hook)** — Catches most violations locally
   - Can be bypassed with `--no-verify` (logged)
   - Provides fast local feedback

2. **Layer 1 (GitHub Actions)** — Authoritative enforcement
   - **Cannot be bypassed** (runs server-side)
   - **Cannot be skipped** (required status check)
   - Blocks merge if check fails
   - **This is the real enforcement**

**Layer 3 (Keel gate) is redundant, not critical:**
- If Keel is used: Catches violations at phase 8 (earlier)
- If Keel is skipped: Layer 1 catches them at merge time (later, but still caught)

**Result:** Safe even if Layer 3 is skipped because Layer 1 is authoritative.

---

## Summary

| Aspect | Value |
|--------|-------|
| **Purpose of Layer 3** | Optional early feedback for Keel users |
| **Is it required?** | NO — Layer 1 provides enforcement |
| **What if skipped?** | Layer 1 still enforces (safe) |
| **Best practice** | Use Keel for early feedback, but don't depend on it |
| **Actual enforcement** | GitHub Actions (Layer 1) is authoritative |
| **Developer choice** | Free to use or skip Keel; enforcement is mandatory |

---

## Checklist: Understanding Layer 3

- [ ] Layer 3 only runs if using Keel pipeline
- [ ] Keel gate runs at `keel gate --phase N --verdict PASS`
- [ ] Keel gate provides in-pipeline compliance feedback
- [ ] If Keel is skipped, Layer 3 is skipped (Layer 1 still enforces)
- [ ] GitHub Actions (Layer 1) is the real, authoritative enforcement
- [ ] Compliance violations cannot land in main/prod because Layer 1 blocks them
- [ ] Using Keel is optional; enforcement is mandatory

---

## References

- **Three-Layer Architecture:** docs/compliance/three-layer-enforcement-architecture.md
- **Keel Gate Implementation:** scripts/keel-state.cjs (checkRegistry)
- **Guardrail G-19:** .keel/GUARDRAILS.md (compliance gate contract)
- **Layer 1 Setup:** docs/compliance/github-branch-protection-setup.md
