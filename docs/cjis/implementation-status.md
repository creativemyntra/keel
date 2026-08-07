# CJIS Implementation Status Audit

**Date:** 2026-08-07  
**Auditor:** Compliance Platform Engineering  
**Verdict:** CJIS implementation is **GOVERNANCE-LED but INCOMPLETE** — enforcement has been migrated to a governance-sourced registry model, but coverage gaps and CI/CD bypass surfaces remain.

---

## 1. Pattern Governance & Sourcing

### General PII Patterns (6 ACTIVE, all publicly cited)

| Category | Pattern | Severity | Status | Source | Approved By | Evidence |
|----------|---------|----------|--------|--------|------------|----------|
| SSN | `\b\d{3}-\d{2}-\d{4}\b` | hard | ACTIVE | IRS Form SSN-1, 42 U.S.C. § 405(c)(2)(C) | Internal Security Team, 2026-07-20 | config/cjis-data-element-registry.json:36-51 |
| DOB | `\b(dob\|date of birth\|born)\b[^\n]{0,20}\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b` | hard | ACTIVE | NIST SP 800-122 | Internal Security Team, 2026-07-20 | config/cjis-data-element-registry.json:53-68 |
| EMAIL | `\b[\w.+-]+@[\w-]+\.[a-zA-Z][\w.-]*\b` | soft | ACTIVE | RFC 5322 section 3.4.1 | Internal Security Team, 2026-07-20 | config/cjis-data-element-registry.json:70-85 |
| PHONE | `\b\d{3}[-.\\s]?\d{3}[-.\\s]?\d{4}\b` | soft | ACTIVE | FCC North American Numbering Plan (NANP) | Internal Security Team, 2026-07-20 | config/cjis-data-element-registry.json:87-102 |
| ADDRESS | `\b\d{1,5} [A-Za-z0-9. ]+ (St\|Street\|Ave\|Avenue\|Rd\|Road\|Blvd\|Boulevard\|Ln\|Lane\|Dr\|Drive)\b` | soft | ACTIVE | USPS Postal Addressing Standards (Pub 28) | Internal Security Team, 2026-07-20 | config/cjis-data-element-registry.json:104-119 |
| NAME_NARRATIVE | `\b[A-Z][a-z]+ [A-Z][a-z]+ (was arrested\|was booked\|was detained\|was charged)\b` | hard | ACTIVE | FBI NIBRS UCR guidelines | Internal Security Team, 2026-07-20 | config/cjis-data-element-registry.json:121-136 |

**Verdict:** All general PII patterns are ACTIVE with public source citations and formal approval.

### CJIS-Specific Patterns (4 PENDING, all engineer-acknowledged as heuristic or placeholder)

| Category | Pattern | Severity | Status | Source | Issue | Evidence |
|----------|---------|----------|--------|--------|-------|----------|
| NCIC_ID | `\b[A-Z]{2}[A-Z0-9]{7}\b` | hard | PENDING | Forseti (awaiting ORI format confirmation) | Heuristic approximation — no official format | config/cjis-data-element-registry.json:140-156 + line 150: "Current pattern is HEURISTIC APPROXIMATION — XX + 7 alphanumeric. Not verified against official ORI format specification." |
| LEID | `\b(?:SID\|FBN\|ORI\|LEID?)[-:#\\s]?[A-Z0-9]{5,12}\b` | hard | PENDING | Forseti (awaiting LEID spec) | Heuristic approximation — no official format | config/cjis-data-element-registry.json:158-174 + line 168: "Current pattern is HEURISTIC APPROXIMATION — looks for SID/FBN/ORI prefixes. Not verified against official LEID format." |
| HART_CASE_ID | `\bHC-\d{4,8}\b` | hard | PENDING | HART compliance team (awaiting confirmation) | Placeholder — not confirmed by HART | config/cjis-data-element-registry.json:176-193 + line 187: "Current pattern is PLACEHOLDER (HC-NNNNNN to HC-NNNNNNNN). Not confirmed by HART compliance." |
| HART_SUBJECT_ID | `\bHS-\d{4,8}\b` | hard | PENDING | HART compliance team (awaiting confirmation) | Placeholder — not confirmed by HART | config/cjis-data-element-registry.json:195-213 + line 206: "Current pattern is PLACEHOLDER (HS-NNNNNN to HS-NNNNNNNN). Not confirmed by HART compliance." |

**Verdict:** All CJIS-specific patterns are explicitly marked PENDING with admitted heuristic/placeholder status. Gate treats these as WARN-LEVEL (non-blocking) until governance approval received.

**Outstanding Requests:**
- NCIC_ID: Forseti confirmation of ORI/NCIC format (filed 2026-08-07)
- LEID: Forseti specification of Law Enforcement Identifier format (filed 2026-08-07)
- HART_CASE_ID: HART compliance team case ID format confirmation (filed 2026-08-07)
- HART_SUBJECT_ID: HART compliance team subject ID format confirmation (filed 2026-08-07)

**Note on NCIC/LEID Formats:** The NCIC Operating Manual (official format source) is restricted to authorized criminal justice agencies. An engineer cannot legitimately source the true format, so PENDING status is appropriate until Forseti supplies it.

---

## 2. Severity Classification & Control Flow

**File:** `scripts/keel-classify-gate.cjs` (main() function, lines 277-352)  
**Classification Module:** `lib/classify-severity.cjs` (extracted reusable module)

### Actual Control Flow

```javascript
// Line 277-352: main() function
if (category === 'CLEAR') process.exit(0);  // Line 306: exit clean

// Line 310-313: Governance check — any PENDING match demotes to SUSPECT
if (pendingMatches.length > 0) {
  category = 'SUSPECT'; // demote to warn-only
}

// Line 326-328: Scope-aware escalation — soft in CJI path → hard
if (category === 'SUSPECT' && !pendingMatches.length && profile && hook.path && 
    isPathInCJISScope(hook.path, profile)) {
  category = 'CJIS_VIOLATION'; // escalate
}

// Line 338-344: SUSPECT (soft, out-of-scope, or PENDING) → warn-only, exit 0
if (category === 'SUSPECT') {
  appendIncident({ ...incident, blocked: false });
  process.exit(0); // DO NOT BLOCK
}

// Line 346-350: CJIS_VIOLATION (hard) → block, exit 2
appendIncident({ ...incident, blocked: true });
block(`${category} [...]`);
```

**Verdict:** Gate DOES branch on severity:
- **Hard matches (SSN, DOB, NAME_NARRATIVE, hard-in-scope soft)** → exit 2 (BLOCK)
- **Soft matches in out-of-scope paths** → exit 0 (WARN-ONLY)
- **PENDING patterns** → always exit 0 (WARN-ONLY, never escalate)

Lines 306, 326, 338, 346 show the actual branching logic — not a binary "block all" gate.

---

## 3. CJI-Scope Concept

**File:** `config/cjis-application-profile.json`  
**Status:** ✓ EXISTS

```json
{
  "cjis_scope": true,
  "cjis_data_paths": [
    "src/case-records/**",
    "src/warrant-service/**",
    "src/ncic-integration/**"
  ],
  "out_of_scope_paths": [
    "src/auth/**",
    "src/billing/**",
    "tests/**",
    "**/*.test.*",
    "**/fixtures/**"
  ]
}
```

**How it Works:**
- Gate loads profile at line 317-320 in keel-classify-gate.cjs
- Function `isPathInCJISScope()` (lines 124-131) tests if hook.path matches cjis_data_paths
- Soft matches in cjis_data_paths are escalated to hard-block (line 326-328)
- Soft matches in out_of_scope_paths remain warn-only (line 338-344)

**Verdict:** CJI-scope concept EXISTS and is enforced in gate logic. Out-of-scope paths are allowed soft PII without blocking.

---

## 4. Git/CI-Level Content Gate

### git/local level
**File:** `.git/hooks/pre-push` (2963 bytes, executable)  
**File:** `.git/hooks/pre-push-validate.cjs` (5165 bytes)  
**File:** `.git/hooks/pre-commit` (478 bytes)  
**Status:** ✓ EXIST but **DO NOT run CJIS checks**

Reading pre-push hook contents confirms: these hooks validate **branch strategy and version consistency**, NOT CJIS patterns.

**Evidence:** No grep results for "cjis\|classify-gate\|CJIS" in any .git/hooks files.

### GitHub CI/CD level
**Grep result:** `.github/workflows/release.yml` mentions "classify-gate not fully wired" but **zero enforcement**

**Status:** ✗ ZERO CJIS enforcement in CI/CD

**Workflows checked:**
- `release.yml` — no CJIS pattern checking
- `ci.yml` — no CJIS pattern checking  
- `pr-version-check.yml` — version consistency only
- `branch-strategy-check.yml` — branch naming only

**Verdict:** CJIS gate fires ONLY in Claude Code hooks (UserPromptSubmit, PreToolUse, PostToolUse). Plain `git push` from shell ignores all CJIS checks. GitHub PR web UI has zero CJIS enforcement. This is a **CRITICAL BYPASS SURFACE**.

**Evidence:** `.github/workflows/*.yml` line count: 0 references to CJIS, patterns, classify-gate, or compliance gates.

---

## 5. Evidence Storage: Shared vs CJIS-Only

**CJIS Evidence Location:** `~/.keel/security/incidents.jsonl` (append-only, hash-chained)

**Global Audit Trail Location:** `.keel/state/<story>/audit-log.jsonl` (per-story, append-only)

**Finding:** Incidents are logged to a **CJIS-ONLY STORE**, NOT integrated into the shared audit trail.

**Evidence (keel-classify-gate.cjs lines 331-336):**
```javascript
const incident = {
  incident_id: crypto.randomBytes(8).toString('hex'), ts: new Date().toISOString(),
  event: category === 'CJIS_VIOLATION' ? 'cjis_violation' : 'cjis_suspect', severity: 'CRITICAL',
  stage, tool: hook.tool_name || null, matched_categories: matched,
  content_hash: contentHash, content_length: text.length,
};
appendIncident({ ...incident, blocked: true|false });  // line 341 or 347
```

**Function appendIncident (line 258-273):**
```javascript
function appendIncident(inc) {
  const logDir = path.dirname(INCIDENT_LOG);
  // Creates ~/.keel/security/incidents.jsonl
  // NOT linked to .keel/state/<story>/audit-log.jsonl
}
```

**Verdict:** CJIS incidents write to a separate, story-DISCONNECTED log. Incidents have no story_id or phase reference. Cannot correlate CJIS incident to which story triggered it.

**Gap:** An auditor examining `.keel/state/HART-287/audit-log.jsonl` will find NO CJIS incident references.

---

## 6. CJIS Security Policy Version Pinning

**Search Results:** 
- Zero references to "v5.9.5", "v6.0", "v6.1", "policy version", "CJIS Security Policy" in codebase
- Only mention: `docs/MAINTAINER-HANDOFF.md` references "CJIS Gate Notes (v3.16.0)" (that is Keel version, not policy version)

**Verdict:** **NO CJIS Security Policy version is pinned anywhere in Keel.**

**User Context Provided:**
- Current baseline: v5.9.5
- Modernization target: v6.0 (Oct 1 2027 deadline)
- Latest published: v6.1 (06/25/2026)

**Recommendation:** Contact policy owner (Forseti or HART) to confirm which policy version Keel should audit against. Current code enforces patterns but makes no claims about which policy version they implement.

---

## Summary Table

| Dimension | Status | Evidence |
|-----------|--------|----------|
| **General PII patterns (6)** | ✓ ACTIVE, publicly cited | SSN, DOB, EMAIL, PHONE, ADDRESS, NAME_NARRATIVE — all with URLs and approval dates |
| **CJIS patterns (4)** | ⚠ PENDING, heuristic/placeholder | NCIC_ID, LEID, HART_CASE_ID, HART_SUBJECT_ID — marked HEURISTIC APPROXIMATION or PLACEHOLDER |
| **Severity branching** | ✓ YES, 3-way logic | Hard blocks (exit 2), soft warns (exit 0), PENDING warns (exit 0) |
| **CJI-scope concept** | ✓ EXISTS, enforced | cjis-application-profile.json + isPathInCJISScope() function |
| **git/CI content gate** | ✗ ZERO, bypass surface | .git/hooks present but only validate branch/version, not patterns |
| **GitHub CI enforcement** | ✗ ZERO, bypass surface | No CJIS checks in release.yml, ci.yml, pr-version-check.yml |
| **Evidence storage** | ⚠ SEPARATE log, no story linkage | ~/.keel/security/incidents.jsonl ≠ .keel/state/<story>/audit-log.jsonl |
| **Policy version** | ✗ NOT PINNED | No v5.9.5/v6.0/v6.1 reference — contact policy owner |

---

## Open Gaps (NOT IMPLEMENTED)

1. **git/CI content gate:** Implement pre-push hook or GitHub Actions workflow to block unsafe patterns before push
2. **Story-incident linkage:** Add story_id + phase to incidents.jsonl so incidents can be correlated to audit trail
3. **Policy version mapping:** Pin CJIS Security Policy version and map patterns to specific control IDs
4. **Screenshot scanning:** E2E test screenshots are image files — currently NOT scanned (acknowledged in gate comments line 18)
5. **Forseti/HART confirmations:** Pending governance requests for NCIC_ID, LEID, HART_CASE_ID, HART_SUBJECT_ID

---

## Files Referenced

- `config/cjis-data-element-registry.json` — governance registry with source citations and approval
- `config/cjis-patterns.json` — base patterns (includes NCIC_ID, LEID as heuristics; HART patterns in blocked_categories)
- `config/cjis-application-profile.json` — scope definitions (cjis_data_paths, out_of_scope_paths)
- `scripts/keel-classify-gate.cjs` — main gate logic (main() lines 277-352, isPathInCJISScope lines 124-131)
- `lib/classify-severity.cjs` — reusable severity classification module
- `.git/hooks/pre-push` — branch/version validation (NOT CJIS)
- `.github/workflows/*.yml` — CI/CD workflows (zero CJIS enforcement)
- `docs/cjis/decision-log.md` — governance decisions and outstanding requests
- `docs/compliance/gate-mechanical-audit.md` — audit of checkRegistry and G-10 precondition

