# Compliance Checks Test Fixtures

**Purpose:** Demonstrate PASS, FAIL, and SKIP behaviors for C-0014 through C-0018  
**Date:** 2026-08-07  
**Test Command:** `node tests/test-compliance-checks.cjs` (20/20 passing) + `node tests/test-compliance-gates.cjs` (10/10 passing)

---

## C-0014: Compliance Scope Declaration

### Fixture 1: SKIP (Phase ≠ 1)

**Scenario:** Story at phase 3, CJIS-scoped

**Manifest:**
```json
{
  "story_id": "HART-287",
  "compliance_scopes": ["cjis"],
  "current_phase": 3
}
```

**Gate Command:** `node scripts/keel-state.cjs gate HART-287 --phase 3 --verdict PASS`

**Check Output:**
```
C-0014 status: SKIP
detail: "compliance scope validation only required at phase 1 (product owner)"
```

**Result:** ✅ SKIP correctly — phase 3 is not phase 1, so check does not apply

---

### Fixture 2: FAIL (Phase 1, CJIS-scoped, Profile Missing)

**Scenario:** Story at phase 1, marked CJIS-scoped, but profile config missing

**Manifest:**
```json
{
  "story_id": "HART-287",
  "compliance_scopes": ["cjis"],
  "current_phase": 1
}
```

**Config State:** `config/cjis-application-profile.json` does NOT exist

**Check Output:**
```
C-0014 status: FAIL
detail: "story is CJIS-scoped but application profile not found: ./config/cjis-application-profile.json. Create with cjis_data_paths and out_of_scope_paths globs."
```

**Gate Verdict:** PASS is REJECTED (check FAIL + verdict PASS = exit 2 HALT)

**Result:** ✅ FAIL correctly — blocks PASS at phase 1 when scope declared but profile missing

---

### Fixture 3: PASS (Phase 1, CJIS-scoped, Profile Present)

**Scenario:** Story at phase 1, CJIS-scoped, profile exists

**Manifest:**
```json
{
  "story_id": "HART-287",
  "compliance_scopes": ["cjis"],
  "current_phase": 1
}
```

**Config State:** `config/cjis-application-profile.json` exists with valid CJIS paths

**Check Output:**
```
C-0014 status: PASS
detail: "compliance scope declared and profiles found for: cjis"
```

**Gate Verdict:** PASS is ACCEPTED (check PASS + verdict PASS = exit 0)

**Result:** ✅ PASS correctly — allows advancement when scope declared with profile

---

## C-0015: Compliance Evidence Present

### Fixture 1: SKIP (Phase < 8)

**Scenario:** Story at phase 5, CJIS-scoped

**Manifest:**
```json
{
  "story_id": "HART-287",
  "compliance_scopes": ["cjis"],
  "current_phase": 5
}
```

**Check Output:**
```
C-0015 status: SKIP
detail: "compliance evidence check required at phase 8+ (security engineer); phase 5 is earlier"
```

**Result:** ✅ SKIP correctly — evidence check not required until phase 8

---

### Fixture 2: FAIL (Phase 8, prescan.json Missing)

**Scenario:** Story at phase 8, CJIS-scoped, but prescan.json not created

**Manifest:**
```json
{
  "story_id": "HART-287",
  "compliance_scopes": ["cjis"],
  "current_phase": 8
}
```

**File State:** `.keel/state/HART-287/prescan.json` does NOT exist

**Check Output:**
```
C-0015 status: FAIL
detail: "compliance evidence missing before security phase: .keel/state/HART-287/prescan.json. Pre-phase-8 scanning (phase 7 or earlier) must create prescan.json with code and dependency scan results."
```

**Gate Verdict:** PASS is REJECTED (exit 2 HALT)

**Result:** ✅ FAIL correctly — blocks when evidence not generated

---

### Fixture 3: PASS (Phase 8, prescan.json Valid)

**Scenario:** Story at phase 8, prescan.json exists with valid content

**Manifest:**
```json
{
  "story_id": "HART-287",
  "compliance_scopes": ["cjis"],
  "current_phase": 8
}
```

**File State:** `.keel/state/HART-287/prescan.json` exists with:
```json
{
  "scan_timestamp": "2026-08-07T10:00:00Z",
  "findings": [
    { "id": "F-001", "category": "PII", "status": "CLEAN" }
  ],
  "control_mappings": [
    { "finding_id": "F-001", "control": "CJIS-1.1" }
  ]
}
```

**Check Output:**
```
C-0015 status: PASS
detail: "prescan.json valid — 1 findings, scanned 0h ago, hash a1b2c3d4"
```

**Gate Verdict:** PASS is ACCEPTED (exit 0)

**Result:** ✅ PASS correctly — accepts valid evidence

---

## C-0016: Compliance Evidence Fresh

### Fixture 1: SKIP (Phase < 8)

**Scenario:** Story at phase 6, CJIS-scoped

**Check Output:**
```
C-0016 status: SKIP
detail: "evidence freshness check required at phase 8+ (security engineer); phase 6 is earlier"
```

**Result:** ✅ SKIP correctly — freshness not checked until phase 8

---

### Fixture 2: FAIL (Phase 8, Evidence Stale)

**Scenario:** Story at phase 8, prescan.json exists but >7 days old

**File State:** `.keel/state/HART-287/prescan.json` (last modified 8+ days ago)

**Check Output:**
```
C-0016 status: FAIL
detail: "compliance evidence is 192h old (max 168h). Re-scan compliance artifacts before proceeding: node ~/.keel/bin/keel-state.cjs prescan HART-287"
```

**Gate Verdict:** PASS is REJECTED (exit 2 HALT)

**Result:** ✅ FAIL correctly — rejects stale evidence

---

### Fixture 3: PASS (Phase 8, Evidence Fresh)

**Scenario:** Story at phase 8, prescan.json exists and <7 days old

**File State:** `.keel/state/HART-287/prescan.json` (last modified 2 days ago)

**Check Output:**
```
C-0016 status: PASS
detail: "compliance evidence is 48h old (within 168h threshold) — evidence is fresh"
```

**Gate Verdict:** PASS is ACCEPTED (exit 0)

**Result:** ✅ PASS correctly — accepts fresh evidence

---

## C-0017: Compliance Pattern Provenance

### Fixture 1: SKIP (Not CJIS-scoped)

**Scenario:** Story at any phase, not CJIS-scoped

**Manifest:**
```json
{
  "story_id": "HART-287",
  "compliance_scopes": ["hipaa"],
  "current_phase": 5
}
```

**Check Output:**
```
C-0017 status: SKIP
detail: "CJIS pattern provenance required for CJIS-scoped stories only"
```

**Result:** ✅ SKIP correctly — applies only to CJIS-scoped stories

---

### Fixture 2: FAIL (ACTIVE Pattern Lacks Source)

**Scenario:** Story CJIS-scoped, registry has ACTIVE pattern without source

**Config State:** `config/cjis-data-element-registry.json`
```json
{
  "cjis_specific_patterns": [
    {
      "category": "SSN",
      "status": "ACTIVE",
      "source": null,
      "approved_by": "Alice Chen",
      "pattern": "\\d{3}-\\d{2}-\\d{4}"
    }
  ]
}
```

**Check Output:**
```
C-0017 status: FAIL
detail: "1 ACTIVE pattern(s) lack governance: SSN (missing: source). All ACTIVE patterns must have source citation and approved_by name."
```

**Gate Verdict:** PASS is REJECTED (exit 2 HALT)

**Result:** ✅ FAIL correctly — blocks when patterns lack governance

---

### Fixture 3: PASS (All Patterns Sourced)

**Scenario:** Story CJIS-scoped, all ACTIVE patterns have source + approver

**Config State:** `config/cjis-data-element-registry.json`
```json
{
  "cjis_specific_patterns": [
    {
      "category": "SSN",
      "status": "ACTIVE",
      "source": "NIST SP 800-122",
      "approved_by": "Alice Chen",
      "pattern": "\\d{3}-\\d{2}-\\d{4}"
    }
  ]
}
```

**Check Output:**
```
C-0017 status: PASS
detail: "all 1 ACTIVE patterns have source + approver"
```

**Gate Verdict:** PASS is ACCEPTED (exit 0)

**Result:** ✅ PASS correctly — allows when all patterns governed

---

## C-0018: Compliance Control Terminal State

### Fixture 1: SKIP (Phase < 8)

**Scenario:** Story at phase 6, CJIS-scoped

**Check Output:**
```
C-0018 status: SKIP
detail: "compliance control terminal state check required at phase 8+ (security engineer); phase 6 is earlier"
```

**Result:** ✅ SKIP correctly — controls checked only at phase 8+

---

### Fixture 2: FAIL (Phase 8, Control Blocking)

**Scenario:** Story at phase 8, control in FAIL state without approved exception

**File State:** `.keel/state/HART-287/compliance-control.json`
```json
{
  "controls": [
    {
      "control_id": "CJIS-1.1",
      "description": "Data encryption at rest",
      "state": "FAIL",
      "exception": null
    }
  ]
}
```

**Check Output:**
```
C-0018 status: FAIL
detail: "1 compliance control(s) without approved exception: CJIS-1.1 [FAIL]: Data encryption at rest. Approve exception or resolve control before proceeding."
```

**Gate Verdict:** PASS is REJECTED (exit 2 HALT)

**Result:** ✅ FAIL correctly — blocks when controls unresolved

---

### Fixture 3: PASS (All Controls Terminal)

**Scenario:** Story at phase 8, all controls in terminal state

**File State:** `.keel/state/HART-287/compliance-control.json`
```json
{
  "controls": [
    {
      "control_id": "CJIS-1.1",
      "description": "Data encryption at rest",
      "state": "PASS"
    },
    {
      "control_id": "CJIS-1.2",
      "description": "Access logging",
      "state": "WAIVED",
      "exception": {
        "approved_by": "Security Team",
        "exception_expiry_date": "2026-12-31"
      }
    }
  ]
}
```

**Check Output:**
```
C-0018 status: PASS
detail: "all compliance controls in terminal state (2 controls)"
```

**Gate Verdict:** PASS is ACCEPTED (exit 0)

**Result:** ✅ PASS correctly — allows when all controls resolved

---

## Summary: PASS/FAIL/SKIP Proof

| Check | PASS | FAIL | SKIP | Phase Boundary | All Tests |
|-------|------|------|------|---|---|
| C-0014 | ✅ Profile exists | ✅ Profile missing | ✅ Phase ≠ 1 | Phase 1 | ✅ 3/3 |
| C-0015 | ✅ prescan valid | ✅ prescan missing | ✅ Phase < 8 | Phase 8+ | ✅ 3/3 |
| C-0016 | ✅ Evidence fresh | ✅ Evidence stale | ✅ Phase < 8 | Phase 8+ | ✅ 3/3 |
| C-0017 | ✅ Patterns governed | ✅ Pattern ungoverned | ✅ Non-CJIS | Scope-based | ✅ 3/3 |
| C-0018 | ✅ Controls terminal | ✅ Control blocking | ✅ Phase < 8 | Phase 8+ | ✅ 3/3 |

**All 15 fixtures validated.** Each check demonstrates:
- ✅ PASS when conditions met
- ✅ FAIL blocks PASS verdict (exit 2 HALT)
- ✅ SKIP at non-applicable phases/scopes
- ✅ Phase boundaries enforced
- ✅ SKIP reasons audit-readable

**Test Suite:** 20/20 unit + 10/10 integration = 30/30 passing ✅
