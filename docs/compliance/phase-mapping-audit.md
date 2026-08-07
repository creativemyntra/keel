# Phase Mapping Audit: Compliance Checks vs. Artifact Availability

**Purpose:** Verify compliance checks are wired to phases where their input artifacts exist  
**Status:** AUDIT ONLY  
**Date:** 2026-08-07

---

## Phase Lists (from SCOPES constant)

Feature stories run phases 1-10.  
Defect stories run phases 1, 5, 6, 8 (express lane).

---

## Proposed Compliance Checks

### C-0014: compliance_scope_declared

- **Gate phase:** 1 (Product Owner)
- **Input artifact:** config/cjis-application-profile.json
- **Available at phase 1:** YES (repo config)
- **SKIP pattern:** `if (phase !== 1)` 
- **Runs on defect:** YES
- **Ordering risk:** NONE

### C-0015: compliance_evidence_present

- **Gate phase:** 8+ (Security Engineer)
- **Input artifact:** prescan.json (created by phase 7)
- **Available at phase 8:** YES
- **SKIP pattern:** `if (phase < 8)`
- **Runs on defect:** NO (defects skip phase 7)
- **Ordering risk:** NONE

### C-0016: compliance_evidence_fresh

- **Gate phase:** 8+ (Security Engineer)
- **Input artifact:** prescan.json timestamp
- **Available at phase 8:** YES
- **SKIP pattern:** `if (phase < 8)`
- **Runs on defect:** NO (defects skip phase 7)
- **Ordering risk:** NONE

### C-0017: compliance_pattern_provenance

- **Gate phase:** Any (recommend phases 1-8)
- **Input artifact:** config/cjis-patterns.json
- **Available at phase 1:** YES (repo config)
- **SKIP pattern:** `if (!manifest.compliance_scopes?.includes('cjis'))`
- **Runs on defect:** YES
- **Ordering risk:** NONE

### C-0018: compliance_control_terminal_state

- **Gate phase:** 8+ (Security Engineer)
- **Input artifact:** compliance-control.json
- **Available at phase 8:** YES (same phase)
- **SKIP pattern:** `if (phase < 8)`
- **Runs on defect:** YES
- **Ordering risk:** NONE

---

## Defect Express Lane Coverage

Defects skip phase 7 (E2E testing), so:
- C-0015 and C-0016 always SKIP (no prescan.json)
- No code scanning evidence collected
- C-0014, C-0017, C-0018 still run at their gates

This is a documented gap: defects lack E2E evidence.

---

## Ordering Verification

All checks read inputs that exist by their gate phase:
- C-0014, C-0017: Read static config (always available)
- C-0015, C-0016, C-0018: Run at phase 8+, read phase 7-8 artifacts (available by then)

**No ordering errors found.**

---

## SKIP Pattern Consistency

Patterns match existing checks:
- Single-phase: `if (phase !== N)` (like C-0009, C-0007)
- Multi-phase: `if (phase < N)` (like C-0011)
- Scope-based: `if (!scopes.includes(...))` (new pattern, consistent)

---

## Implementation Assessment

**All 5 checks are safe to implement:**
- Input artifacts exist when checks run
- SKIP patterns follow established conventions
- Defect gap is documented and acceptable
- Feature stories have full coverage

**Status: READY FOR IMPLEMENTATION**
