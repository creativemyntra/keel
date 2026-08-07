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

---

## Decision: Governance-Sourced CJIS Identifier Registry (Eliminated Engineer Guesses)

**Date:** 2026-08-07  
**Status:** Implemented  
**Risk:** Low (enforcement tightened for verified patterns, loosened for unverified pending-confirmation patterns)

### Problem Statement
CJIS-specific identifier patterns (NCIC_ID, LEID, HART_CASE_ID, HART_SUBJECT_ID) were engineer-guessed regexes without:
- Governance source citation (e.g., DOJ official docs, client-supplied spec)
- Approval process or audit trail
- Fallback path for unverified patterns

Treating guessed patterns identically to verified PII patterns created false-positive noise and compliance ambiguity.

### Solution: Governance-Sourced Registry Model
Introduce `config/cjis-data-element-registry.json` enforcing:
1. Every pattern entry requires **source** (public citation, client-supplied, or explicitly PENDING)
2. ACTIVE patterns require **approved_by + approved_date** (fail-closed if missing)
3. PENDING_CONFIRMATION patterns treated as WARN-LEVEL (non-blocking) until source + approval provided
4. General PII (SSN, EMAIL, PHONE, ADDRESS, DOB, NAME_NARRATIVE) separated from CJIS-specific with public citations
5. Gate loads registry + validates all patterns (fail-closed if governance violated)

### Identifier Status Migration

**MOVED TO PENDING_CONFIRMATION (Warn-Only):**
- **NCIC_ID** — Current pattern: `[A-Z]{2}[A-Z0-9]{7}` (heuristic). Pending: official Forseti confirmation of ORI format.
- **LEID** — Current pattern: `(?:SID|FBN|ORI|LEID?)[-:#\s]?[A-Z0-9]{5,12}` (heuristic). Pending: official Forseti specification.
- **HART_CASE_ID** — Current pattern: `HC-\d{4,8}` (placeholder). Pending: HART compliance team confirmation of actual case ID format.
- **HART_SUBJECT_ID** — Current pattern: `HS-\d{4,8}` (placeholder). Pending: HART compliance team confirmation of actual subject ID format.

**ACTIVE WITH SOURCE CITATIONS (Verified Hard-Block):**
- **SSN** — Source: IRS Form SSN-1, RFC standard XXX-XX-XXXX format
- **DOB** — Source: NIST SP 800-122 (Guide to Protecting Confidentiality of PII)
- **EMAIL** — Source: RFC 5322 (Internet Message Format)
- **PHONE** — Source: FCC North American Numbering Plan (NANP)
- **ADDRESS** — Source: USPS Postal Addressing Standards
- **NAME_NARRATIVE** — Source: FBI NIBRS (National Incident-Based Reporting System) UCR guidelines

### Enforcement Rules
1. **PENDING_CONFIRMATION patterns** → Non-blocking (exit 0, logged as WARN)
   - Keeps visibility (audit trail) without false-positive enforcement
   - Once source + approval provided, can be promoted to ACTIVE
2. **ACTIVE patterns without source/approval** → Gate fails closed (internal error, blocks with feedback)
3. **Verified patterns** → Unchanged enforcement (hard → block, soft → contextual per scope)

### Outstanding Governance Requests

| Category | Requested From | Status | Reference |
|----------|---|--------|-----------|
| NCIC_ID | Forseti (ORI format confirmation) | PENDING | decision-log entry created 2026-08-07 |
| LEID | Forseti (Law Enforcement Identifier spec) | PENDING | decision-log entry created 2026-08-07 |
| HART_CASE_ID | HART compliance team | PENDING | decision-log entry created 2026-08-07 |
| HART_SUBJECT_ID | HART compliance team | PENDING | decision-log entry created 2026-08-07 |

Next steps: File formal requests with each source; update registry as confirmations arrive.

### Impact & Constraints

**What Changed:**
- Unverified CJIS patterns moved from hard-block to warn-only
- General PII patterns now have public source citations (RFC, NIST, FCC, USPS, FBI)
- Registry enforces governance (fail-closed if source/approval missing)

**What Did NOT Change:**
- Verified PII patterns (SSN, DOB, EMAIL) enforcement unchanged
- Scope-aware escalation unchanged (soft matches still escalate to hard in cjis_data_paths)
- Incident logging unchanged (all matches logged to audit trail)

**Fallback (Registry Missing):**
- If `cjis-data-element-registry.json` not found, gate reverts to old system (all patterns active)
- Registry is optional; gate still fails closed on parse/validation errors

### Future Enhancements
1. **Scope-aware incident severity:** Mark incidents as CRITICAL vs WARNING based on scope
2. **Automatic scope detection:** Parse git blame / git log to infer scope from committer history
3. **Custom profiles per environment:** Allow staging/prod to have different scope definitions
4. **Scope-aware enforcement in CI/CD:** Fail PRs only if hard violation or soft violation in scope
5. **Registry-based PR gating:** Block PRs that modify PENDING_CONFIRMATION patterns without governance approval

### References
- Commit: c3845e9 (scope-aware severity escalation)
- Commit: b23203e (governance-sourced registry)
- Registry file: `config/cjis-data-element-registry.json`
- Gate code: `scripts/keel-classify-gate.cjs` (loads + validates registry)
- Test harness: `tests/test-cjis-gate.cjs`
- Configuration: `config/cjis-application-profile.json`
- Master Operating Prompt: 
  - Step 1-2: Scope-aware severity escalation
  - Operating Rules: Governance-sourced registry (no engineer-guessed patterns)
