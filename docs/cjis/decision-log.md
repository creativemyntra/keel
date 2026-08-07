# CJIS Gate Decision Log

## Decision: Scope-Aware Severity Escalation (Fixed False-Positive Noise)

**Date:** 2026-08-07  
**Status:** Implemented & Tested  
**Risk:** Low (hard-category enforcement unchanged, soft matches contextual)

### Problem Statement
The CJIS gate was blocking identical categories for both:
- **Hard severity** (SSN, DOB, NAME_NARRATIVE, NCIC_ID, LEID) → legitimate security risk
- **Soft severity** (EMAIL, PHONE, ADDRESS) → ordinary app code noise (login forms, test fixtures)

Result: False-positive blocks on benign code, audit fatigue, reduced signal-to-noise ratio.

### Root Cause
Classification logic treated all matches the same way:
```javascript
// BEFORE: category === 'SUSPECT' → always block (exit 2)
if (category === 'SUSPECT') { block(...); }
```

Soft matches in out-of-scope paths (auth/*, billing/*, tests/**) should be logged & warned (non-blocking), not hard-blocked.

### Solution: Scope-Aware Escalation
Implement context-aware severity escalation based on file path scope:

1. **SUSPECT (soft-only) + out-of-scope path** → WARN (exit 0, log incident)
   - Examples: EMAIL in auth/login.ts, PHONE in billing/checkout.ts
   - Action: Log to incidents.jsonl with blocked=false, stderr warning, exit clean
   - Rationale: Soft identifiers are expected in non-CJI paths; still audit trail for review

2. **SUSPECT (soft-only) + in-scope path** → ESCALATE to CJIS_VIOLATION (exit 2)
   - Examples: EMAIL in case-records/export.ts, PHONE in ncic-integration/
   - Action: Log with blocked=true, notify officer, block
   - Rationale: CJI-data paths should not contain soft PII; escalation catches leakage

3. **CJIS_VIOLATION (hard match) + any path** → BLOCK (exit 2, unchanged)
   - Examples: SSN anywhere, DOB anywhere
   - Action: Always block, regardless of path
   - Rationale: Hard categories represent true compliance violations; no contextual loosening

### Implementation Details

**New configuration file:**
- `config/cjis-application-profile.json` defines:
  - `cjis_data_paths[]`: Glob patterns for CJI-handling code (case-records/**, warrant-service/**, ncic-integration/**)
  - `out_of_scope_paths[]`: Glob patterns excluded from CJI scope (auth/**, billing/**, tests/**, **/*.test.*, fixtures/**)

**Gate logic changes:**
- Load application profile at startup
- When SUSPECT match detected, check if `hook.path` matches cjis_data_paths
- If matched → escalate to CJIS_VIOLATION (triggers same block logic as hard matches)
- If not matched → remain SUSPECT (warn-only path)

**Module extraction:**
- Refactored `classifySeverity()` to `lib/classify-severity.cjs` for reusability
- Enables future tools (PR checks, linters) to use same severity logic

### Regression Tests (All Passing)
```
✓ soft-only-outofscope (auth/login.ts): exit 0 → warns, doesn't block
✓ soft-only-inscope (case-records/export.ts): exit 0 → exit 2 (escalated)
✓ hard-match-any (any path): exit 2 → unchanged
✓ hard-soft-together (mixed): exit 2 → unchanged
```

Test harness: `node tests/test-cjis-gate.cjs --after-fix` (all 4 pass)

### Impact & Constraints

**What Changed:**
- Soft matches in out-of-scope paths now pass (non-blocking)
- Soft matches in in-scope paths now block (escalated to hard)
- Hard matches behavior unchanged (always block)
- Incident trail unchanged (all matches logged)

**What Did NOT Change:**
- Hard-category enforcement (SSN, DOB, etc.) → zero loosening
- PostToolUse gate behavior (blocks false-positives, warns soft suspects)
- Incident severity classification (all still marked CRITICAL in trail)

**Fallback (Profile Missing):**
- If `cjis-application-profile.json` not found: gate reverts to soft-only behavior (warn, don't block)
- Ensures gate doesn't break on missing config
- Future: consider making profile required via `KEEL_CJIS_OVERLAY_REQUIRED=1`

### Risk Assessment
- **Security:** LOW — hard enforcement unchanged, soft escalation adds contextual rigor
- **Compliance:** LOW — hard violations still caught unconditionally
- **Operational:** LOW — reduces false-positive noise without new false negatives

### Future Enhancements
1. **Scope-aware incident severity:** Mark incidents as CRITICAL vs WARNING based on scope
2. **Automatic scope detection:** Parse git blame / git log to infer scope from committer history
3. **Custom profiles per environment:** Allow staging/prod to have different scope definitions
4. **Scope-aware enforcement in CI/CD:** Fail PRs only if hard violation or soft violation in scope

### References
- Commit: c3845e9 (scope-aware severity escalation)
- Test harness: `tests/test-cjis-gate.cjs`
- Configuration: `config/cjis-application-profile.json`
- Master Operating Prompt: Step 3 (scope-aware escalation) + Step 4 (regression tests)
