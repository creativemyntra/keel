# Mechanical Compliance Audit: checkRegistry & Guardrails

**Date:** 2026-08-07  
**Auditor:** Compliance Platform Engineering  
**Scope:** Enumerate ALL compliance checks in checkRegistry; audit G-10 CJIS precondition; identify bypass surfaces outside Keel pipeline.

---

## Part 1: checkRegistry Enumeration

**Source:** `scripts/keel-state.cjs:654-1200+`

| Check ID | Function Name | Validates | Phases Applied | Can FAIL? | Compliance-Relevant? | Evidence |
|----------|---|---|---|---|---|---|
| C-0001 | `trivial_pass` | Baseline always-PASS placeholder | All | **NO** (always PASS) | **NO** (comment: "shipped as baseline") | Line 655-660: "Trivial always-PASS check — shipped as baseline to verify check execution" |
| C-0002 | `gate_budget_stress` | Gate event count vs max_gates limit | All | **NO** (ADVISORY-ONLY, never FAIL) | **NO** (advisory warning only) | Line 662-683: "Never blocks (FAIL verdict is not used). Always returns PASS" |
| C-0003 | `test_contradiction_marker` | __test_fail_check flag (test-only) | All | **YES** (if flag set) | **NO** (test mode only) | Line 685-694: "Test-only FAIL check for AC-1 contradiction testing" |
| C-0004 | `phase_sequence` | Predecessor phases have valid output | All (except 1) | **YES** | **YES** (architectural, prevents phase skipping) | Line 926-975: "Phase sequence validation — all predecessor phases must have valid output" |
| C-0005 | `findings_terminal_state` | CRITICAL/HIGH findings resolved | All | **YES** | **YES** (blocks PASS if CRITICAL/HIGH OPEN) | Line 879-924: "Findings terminal state validation — block PASS if CRITICAL/HIGH findings are OPEN" |
| C-0006 | `directive_adherence` | OPEN directives don't apply to phase | All | **YES** | **YES** (blocks PASS if OPEN directives apply) | Line 842-877: "Directive adherence validation — block PASS if OPEN directives apply to current phase" |
| C-0007 | `design_approved` | Phase 3 approved by GitHub PR review | Phase 4 | **YES** | **YES** (blocks phase 4 without phase 3 approval) | Line 786-840: "Design approval validation — phase 4 blocks unless phase 3 approved via GitHub PR" |
| C-0008 | `design_review_checklist` | Phase 3 design review checklist complete | Phase 3 | **YES** | **YES** (blocks phase 3 if checklist incomplete) | Line 977-1029: "Design review checklist validation — block PASS for phase 3 if checklist incomplete" |
| C-0009 (T7) | `task_breakdown_required` | Phase 3 task breakdown exists + valid | Phase 3 | **YES** | **YES** (blocks phase 3 without task breakdown) | Line 696-784: "Task breakdown validation — phase 3 blocks unless task breakdown exists and is valid" |
| C-0009 (FINDING-A) | `finding_state_approval` | DEFERRED/WAIVED findings have approval | All | **YES** | **YES** (blocks if DEFERRED/WAIVED lack FINDING-A approval) | Line 1031-1092: "Finding state transitions require human approval" |
| C-0010 (FINDING-A) | `directive_state_approval` | SUPERSEDED/DECLINED directives have approval | All | **YES** | **YES** (blocks if SUPERSEDED/DECLINED lack approval) | Line 1094-1140: "Directive state transitions require human approval" |
| C-0011 (T5) | `coverage_threshold` | Tests run + coverage measured before gate | Phases 5,6,7 | **YES** | **YES** (PRECONDITION: blocks if coverage missing) | Line 1142-1200+: "Coverage threshold validation — verify tests were run and coverage measured" |

### Check Inventory Summary

- **Total checks in checkRegistry:** 12 (C-0001 through C-0011, with C-0009 dual-purpose)
- **Always-PASS (no-ops):** 2 (C-0001 baseline, C-0002 advisory-only)
- **Test-mode only:** 1 (C-0003)
- **Real compliance-blocking checks:** 9 (C-0004, C-0005, C-0006, C-0007, C-0008, C-0009x2, C-0010, C-0011)

**Honest Assessment:** Only **9 out of 12** checks are real compliance gates. The other 3 are infrastructure/testing artifacts. Compliance enforcement exists but is thin.

---

## Part 2: Phase-to-Risk Mapping

| Phase | Phase Name | Compliance Risk Introduced | Mechanical Check | Can It FAIL? | Gap Severity |
|-------|---|---|---|---|---|
| 1 | PO/Product Owner | Scope/AC definition inadequate | C-0004 (predecessor check SKIPS phase 1) | NO | **MEDIUM** (no check validates AC quality) |
| 2 | Business Analyst | AC drift from requirements | C-0004 (phase sequence checks phase 1 valid) | **YES** | **HIGH** (no independent validation of AC coverage) |
| 3 | UI Designer | Design not decomposed into tasks; checklist incomplete | C-0009 (task breakdown), C-0008 (checklist) | **YES** | **MEDIUM** (checklist optional, backward compat) |
| 4 | Solution Architect | Architecture doesn't meet ACs; design changes post-approval | C-0007 (design approval hash mismatch) | **YES** | **MEDIUM** (no check validates architecture vs ACs) |
| 5 | Software Engineer | Unit tests insufficient; CRIT/HIGH findings unresolved | C-0005 (findings CRIT/HIGH OPEN), C-0011 (coverage threshold) | **YES** | **HIGH** (coverage threshold precondition-gated, can FAIL) |
| 6 | QA Engineer | Integration tests skip cases; P1 bugs unfound | C-0004 (phase sequence), C-0005 (findings) | **YES** | **HIGH** (no independent test coverage validation at QA layer) |
| 7 | E2E Engineer | E2E tests don't cover user flows; screenshots contain CJIS | C-0011 (coverage threshold applies to phase 7) | **YES** | **CRITICAL** (no mechanical check: "screenshots MUST use fully synthetic data" is prose-only, G-10 line 153-155) |
| 8 | Security Engineer | CJIS gate not fired; findings deferred without approval | C-0005 (findings terminal state), C-0009 FINDING-A (deferred/waived approval) | **YES** | **CRITICAL** (NO check confirms CJIS gate actually RAN or caught anything) |
| 9 | Technical Writer | Docs incomplete; release notes not updated | C-0004 (phase sequence only) | **NO** (phase 9 checks predecessor valid, not content) | **CRITICAL** (no check validates doc completeness) |
| 10 | Release Manager | Changelog not updated; version not bumped; gate verdict contradicts artifact state | C-0004 (phase sequence checks phase 9 valid) | **NO** | **CRITICAL** (no release checklist validation) |
| 11 | (Deployment) | N/A (no agent phase) | N/A | N/A | N/A |
| 12 | (Post-Release) | N/A (no agent phase) | N/A | N/A | N/A |

### Gap Summary

| Gap | Risk Level | Details |
|-----|---|---|
| Phase 1 (PO) AC validation | MEDIUM | No check validates AC quality/completeness before handoff to BA |
| Phase 7 (E2E) CJIS screenshot compliance | CRITICAL | G-10 states "screenshots MUST use fully synthetic data" (line 153-155 `.keel/GUARDRAILS.md`) but NO mechanical check enforces this. Screenshots are image files, unscanned. |
| Phase 8 (Security) CJIS gate execution | CRITICAL | G-10 precondition checks hooks.json wiring ONLY; does NOT verify gate actually fires or catches violations. See details below. |
| Phase 9 (Docs) content validation | CRITICAL | No check validates documentation is complete (only that phase 8 output exists). |
| Phase 10 (Release) checklist | CRITICAL | No release readiness validation (changelog, version bump, artifact consistency). |

---

## Part 3: G-10 CJIS Gate Precondition Audit

**G-10 Location:** `.keel/GUARDRAILS.md` lines 129-156; **Implementation:** `scripts/keel-state.cjs` lines 351-387

### What G-10 Verifies

```javascript
// Line 353-387
function checkCJISGatePrecondition(isCJISScoped) {
  // 1. hooks/hooks.json exists + valid JSON
  // 2. keel-classify-gate.cjs is wired for stages: UserPromptSubmit, PreToolUse, PostToolUse
  // ✓ Verifies hook WIRING only
}
```

**Evidence:** Line 374-381
```javascript
const hasGate = stageHooks.some((entry) => {
  if (entry.hooks) {
    return entry.hooks.some((hook) => hook.command?.includes('keel-classify-gate.cjs'));
  }
  return false;
});
```

### What G-10 Does NOT Verify

| Aspect | Is It Verified? | Evidence |
|--------|---|---|
| Gate actually fires on CJIS story init | **NO** | Function only checks hooks.json exists + correct hooks registered. Doesn't test gate invocation. |
| Gate catches CJIS patterns | **NO** | No mechanical check: "did the gate find any violations?" |
| Gate blocks violations | **NO** | No check on exit code or incident log. |
| Non-Keel push bypasses gate | **YES, it does bypass.** | Gate is Claude Code hook only (lines 363: UserPromptSubmit, PreToolUse, PostToolUse). Direct `git push` from shell ignores hooks.json. |
| GitHub PR creation bypasses gate | **YES, it does bypass.** | Opening PR in web UI: no Claude Code involved, no hooks fired. |
| Screenshots scanned for CJIS | **NO** | G-10 line 153-155 states "screenshots are image files — CJIS gate does not scan images." No fallback check. |

**Critical Finding:** G-10 is a **hook-wiring check only**. It verifies infrastructure, not compliance enforcement.

---

## Part 4: Bypass Surfaces (Compliance Enforcement Outside Keel Pipeline)

### Surface 1: Direct `git push` from shell

**What happens:**
```bash
$ git push origin feat/my-feature
```

**Compliance checks that fire:** NONE

**Why:** Keel pipeline hooks (hooks.json) are Claude Code only. Direct shell `git push` bypasses all mechanical checks (C-0001..C-0011 + CJIS gate).

**Evidence:**
- `hooks/hooks.json` (lines 1-40) is Claude Code hook registry (fields: `UserPromptSubmit`, `PreToolUse`, `PostToolUse`)
- `.git/hooks/pre-push` (if exists) would be local git hook, but Keel uses Claude Code hooks, not git hooks
- `.github/workflows/` (line 1215-1217): No compliance checks on push event; only PR checks exist (see below)

**Risk:** Engineer can push code to any branch, including `main` or `prod`, without any mechanical compliance check.

### Surface 2: GitHub PR creation via web UI

**What happens:**
```
1. User opens PR in GitHub web UI
2. No Claude Code involved
3. No hooks.json fires
```

**Compliance checks that fire:** NONE (except GitHub Actions)

**GitHub Actions coverage:** 

| Workflow | Enforces? | Coverage |
|----------|---|---|
| `branch-strategy-check.yml` | **YES** (line 1) | Branch naming (feat/fix/chore/...) only. NOT compliance checks. |
| `pr-version-check.yml` | **YES** (lines 1-50) | Version consistency across files. NOT compliance checks. |
| `ci.yml` | **NO** | Runs tests, NOT compliance gates. |
| `release.yml` | **NO** | Deployment artifact, NOT compliance gates. |

**No GitHub Actions workflow enforces:**
- CJIS gate firing
- Findings terminal state (C-0005)
- Design approval (C-0007)
- Coverage threshold (C-0011)
- Any other mechanical check from checkRegistry

**Evidence:** Grep `.github/workflows/*.yml` for "CJIS\|compliance\|findings\|coverage" → zero results (line 1220-1230 audit confirmed)

### Surface 3: Branch protection rules

**What happens:**
```
Branch push requires:
- Status checks to pass (if configured)
- PR reviews (if configured)
- Dismiss stale reviews (if configured)
```

**Current configuration:** Not audited (would require GitHub API or web UI inspection)

**Risk:** If branch protection is not wired to checkRegistry or compliance gates, it provides no enforcement.

---

## Part 5: Compliance vs Enforcement Verdict

### Compliance Documentation Exists

| Framework | Location | Status |
|-----------|----------|--------|
| CJIS Data Classification Gate | `.keel/GUARDRAILS.md` G-10 | Defined as precondition |
| Governance Registry | `config/cjis-data-element-registry.json` | Implemented (sourced + approved patterns) |
| Findings resolution | `scripts/keel-state.cjs` C-0005 | Implemented (blocks CRIT/HIGH) |
| Design approval | `scripts/keel-state.cjs` C-0007 | Implemented (hash verification) |
| Directive adherence | `scripts/keel-state.cjs` C-0006 | Implemented (blocks OPEN directives) |

### Mechanical Enforcement Reality

| Enforcement Layer | Can Block PASS? | Can Block Push/PR? | Coverage |
|---|---|---|---|
| **Keel checkRegistry** (C-0001..C-0011) | **YES** (9/12 checks real) | NO (Keel pipeline only) | Feature stories during development |
| **Claude Code hooks** (CJIS gate + others) | **YES** (HALT on violation) | **ONLY within Claude Code** | Keel sessions only |
| **GitHub Actions workflows** | NO (no compliance checks) | NO | None |
| **Git hooks** (`.git/hooks/*`) | NO | NO (not configured) | None |
| **GitHub branch protection** | UNKNOWN | Possibly (if configured) | Unknown |

### Honest Verdict

**Compliance is DOCUMENTED but NOT MECHANICALLY ENFORCED OUTSIDE KEEL PIPELINE.**

- ✓ Checks exist in checkRegistry (9 real checks)
- ✓ CJIS gate wired in hooks.json
- ✓ Governance registry enforced in Keel sessions
- ✗ **Direct `git push` from shell: zero checks**
- ✗ **GitHub PR in web UI: zero compliance checks (only version/branch checks)**
- ✗ **No GitHub Actions enforcement**
- ✗ **No fallback protection on screenshots (CJIS image data not scanned)**

**Result:** A developer who runs Keel strictly gets compliance. A developer who pushes directly or opens PRs via web UI gets NONE.

---

## Recommendations (Not Implemented)

1. **Add GitHub Actions compliance workflow** to block PRs that lack clean Keel checkRegistry verdict
2. **Add git pre-push hook** to run checkRegistry-equivalent checks before push
3. **Add E2E screenshot validation** (currently prose-only in G-10)
4. **Add release manager checklist** to checkRegistry as C-0012
5. **Add mechanical CJIS gate result check** to C-0008b: "CJIS gate must have fired and found no violations (or violations must be approved)"

---

## Appendix: Evidence File:Line References

- Hook configuration: `hooks/hooks.json` lines 1-40
- CJIS precondition: `scripts/keel-state.cjs` lines 351-387
- checkRegistry: `scripts/keel-state.cjs` lines 654-1200+
- C-0001 trivial: `scripts/keel-state.cjs` lines 655-660
- C-0002 budget: `scripts/keel-state.cjs` lines 662-683
- C-0004 phase-seq: `scripts/keel-state.cjs` lines 926-975
- C-0005 findings: `scripts/keel-state.cjs` lines 879-924
- C-0006 directive: `scripts/keel-state.cjs` lines 842-877
- C-0007 design-approval: `scripts/keel-state.cjs` lines 786-840
- C-0008 checklist: `scripts/keel-state.cjs` lines 977-1029
- C-0009a task-breakdown: `scripts/keel-state.cjs` lines 696-784
- C-0009b finding-approval: `scripts/keel-state.cjs` lines 1031-1092
- C-0010 directive-approval: `scripts/keel-state.cjs` lines 1094-1140
- C-0011 coverage: `scripts/keel-state.cjs` lines 1142-1200+
- G-10 CJIS Gate: `.keel/GUARDRAILS.md` lines 129-156
- GitHub workflows: `.github/workflows/*.yml` (all files)

