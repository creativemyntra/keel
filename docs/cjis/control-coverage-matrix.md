# CJIS Control Coverage Matrix

**Date:** 2026-08-07  
**Scope:** Keel's CJIS implementation vs CJIS Security Policy controls  
**Status:** INCOMPLETE — Keel implements **pattern detection only**, not control mapping

---

## Executive Summary

Keel detects CJI identifier patterns but does NOT map detections to named CJIS Security Policy controls. This document outlines what would be required to achieve full control coverage.

**Current Model:** Pattern-centric (SSN, EMAIL, PHONE, NCIC_ID, etc.) without control references  
**Required Model:** Control-centric (e.g., "11.1.1 Identification & Authentication") with evidence chains

---

## CJIS Security Policy Control Framework

**Policy Baseline:** v5.9.5 (current; v6.0 target Oct 1 2027, v6.1 published 06/25/2026)  
**Note:** Keel does NOT specify which policy version is in effect. Contact Forseti for authoritative mapping.

### High-Level Control Areas (Exemplary)

| Control ID | Control Name | Description | Keel Coverage |
|------------|--------------|-------------|----------------|
| **11.1** | Identification & Authentication | Access control for CJI systems | Pattern detection only |
| **11.2** | User Access Management | Role-based access, offboarding | NOT COVERED |
| **11.3** | Access Rights Review | Periodic audit of user privileges | NOT COVERED |
| **11.4** | Cryptography (Data at Rest) | Encryption of stored CJI | NOT COVERED |
| **11.5** | Cryptography (Data in Transit) | TLS/HTTPS for network CJI | NOT COVERED |
| **11.6** | Logging & Monitoring | Audit trails for all CJI access | PARTIAL (pattern match logging only) |
| **11.7** | Personnel Security | Background checks, vetting | NOT COVERED |
| **11.8** | Physical Security | Facility access controls | NOT COVERED |
| **12.1** | Data Classification | Identify & mark CJI | PATTERN-BASED HEURISTIC |
| **12.2** | Data Retention | Retention schedules for CJI | NOT COVERED |

---

## Keel's Current Pattern Detection → Control Mapping (Does Not Exist)

### General PII Patterns (6 ACTIVE)

| Pattern | Category | Severity | Policy Control(s) | Evidence Support | Gap |
|---------|----------|----------|-------------------|------------------|-----|
| SSN | `\b\d{3}-\d{2}-\d{4}\b` | hard | 12.1 (data classification) | Detects SSN presence; does NOT verify encryption (11.4), retention schedule (12.2), or access logging (11.6) | CONTROL MAPPING MISSING |
| DOB | `\b(dob\|...\|born)\b` | hard | 12.1 (data classification) | Detects date-of-birth; does NOT verify use case authorization or access control (11.1) | CONTROL MAPPING MISSING |
| EMAIL | `\b[\w.+-]+@[\w-]+\.[a-zA-Z][\w.-]*\b` | soft | 12.1 (soft identifiers) | Detects email in scope/out-of-scope paths; does NOT verify minimal use principle (e.g., "email should not appear in warrant service logs") | CONTROL MAPPING MISSING |
| PHONE | `\b\d{3}[-.\\s]?\d{3}[-.\\s]?\d{4}\b` | soft | 12.1 (soft identifiers) | Detects phone numbers; scope-aware logic (in-scope escalates to hard); does NOT verify necessity of storing phone or validate against retention policy (12.2) | CONTROL MAPPING MISSING |
| ADDRESS | `\b\d{1,5} [A-Za-z0-9. ]+...` | soft | 12.1 (soft identifiers) | Detects addresses; does NOT verify if address was legitimately collected for purpose (11.1 access control) | CONTROL MAPPING MISSING |
| NAME_NARRATIVE | `\b[A-Z][a-z]+ [A-Z][a-z]+ (was arrested\|...)` | hard | 12.1 (arrest narrative) | Detects narrative names; does NOT verify redaction in public-facing reports or retention after case closure (12.2) | CONTROL MAPPING MISSING |

**Verdict:** Patterns map to control **12.1 (Data Classification) only**. All other controls (access, retention, encryption, monitoring, personnel) are absent.

---

## CJIS-Specific Patterns (4 PENDING — No Control Mapping)

| Pattern | Category | Severity | Status | Policy Control(s) | Evidence Support | Gap |
|---------|----------|----------|--------|-------------------|------------------|-----|
| NCIC_ID | `\b[A-Z]{2}[A-Z0-9]{7}\b` | hard | PENDING | 12.1 (CJI identifier) + possibly 11.6 (logging) | Detects NCIC record ID references; does NOT map to any audit requirement or access control policy | GOVERNANCE + CONTROL MAPPING MISSING |
| LEID | `\b(?:SID\|FBN\|ORI...)` | hard | PENDING | 12.1 (law enforcement ID) + possibly 11.1 (ID verification) | Detects law enforcement identifiers; does NOT validate against official LEID format or justify use in context | GOVERNANCE + CONTROL MAPPING MISSING |
| HART_CASE_ID | `\bHC-\d{4,8}\b` | hard | PENDING | 12.1 (HART case identifier) + 11.2 (case assignment) | Placeholder pattern (HC-NNNNNN); no control mapping until format confirmed | GOVERNANCE + CONTROL MAPPING MISSING |
| HART_SUBJECT_ID | `\bHS-\d{4,8}\b` | hard | PENDING | 12.1 (HART subject identifier) + 11.2 (subject access) | Placeholder pattern (HS-NNNNNN); no control mapping until format confirmed | GOVERNANCE + CONTROL MAPPING MISSING |

**Verdict:** PENDING patterns have NO control mappings. Cannot claim compliance with control 11.2 or 11.6 until patterns are verified and policies are cited.

---

## What Keel Does NOT Cover

### Control Areas Completely Missing

| Control Category | Keel's Role | Gap |
|------------------|------------|-----|
| **11.1 Identification & Authentication** | None | Does not verify user identity, MFA, or access authorization |
| **11.2 User Access Management** | None | Does not track role changes, access grants/revokes, or offboarding |
| **11.3 Access Rights Review** | None | Does not perform periodic audits of who can access CJI |
| **11.4 Data Encryption (at Rest)** | Detection only | Detects SSN, DOB presence; does NOT verify they are encrypted |
| **11.5 Data Encryption (in Transit)** | Detection only | Detects data flowing through code; does NOT verify TLS/HTTPS |
| **11.6 Logging & Monitoring** | Partial | Logs pattern matches to incidents.jsonl; does NOT link to user identity, system audit logs, or access attempts |
| **11.7 Personnel Security** | None | Does not verify background checks, training, or vetting |
| **11.8 Physical Security** | None | Does not monitor facility access or physical data protection |
| **12.2 Data Retention** | None | Detects data presence; does NOT verify retention schedules or deletion workflows |
| **12.3 Data Breach Notification** | None | Detects violations; does NOT automate breach reporting or escalation |

---

## What Evidence Would Be Required for Control Satisfaction

### Example: Control 11.4 "Encryption of Data at Rest"

**Current Keel Evidence:**
```
CJIS incident 676c10c1: SSN detected in src/case-records/schema.js
  → proves SSN appears in code
  → does NOT prove SSN is encrypted at rest in database
```

**What Would Be Needed:**
```
1. Code review: SSN stored in DB field with 'encrypted: true' flag
2. Database audit: encryption key rotated monthly, stored in AWS KMS
3. Infrastructure audit: RDS instance has encryption enabled in configuration
4. Access log: who has decryption key access + when accessed
```

**How to Add to Keel:**
1. Add control ID to incidents.jsonl: `control_id: "11.4"`
2. Require linked evidence types: `[code_review, db_config, key_audit, access_log]`
3. Gate blocks until all evidence types are present

### Example: Control 11.6 "Logging & Monitoring"

**Current Keel Evidence:**
```
CJIS incident 676c10c1: NCIC_ID pattern detected at 2026-08-07T12:34:56Z
  → proves pattern was detected
  → does NOT prove who accessed the NCIC_ID or why
```

**What Would Be Needed:**
```
1. Pattern detection (Keel): NCIC_ID found in warrant-service API response
2. API audit log: request from user:officer-badge-1234, timestamp, IP
3. Authorization check: officer has warrant-service:read permission for this jurisdiction
4. Purpose: case HART-287, warrant issued 2026-08-05
```

**How to Add to Keel:**
1. incidents.jsonl adds fields: `user_id`, `authorization_status`, `purpose`, `audit_log_ref`
2. Gate queries API audit log to confirm access was logged
3. Gate verifies access was authorized + purposeful

---

## Path to Full Control Coverage

### Phase 1: Add Control IDs to Patterns (Do Not Implement)

Update registry entries to list policy control IDs:

```json
{
  "category": "SSN",
  "policy_control_ids": [
    "12.1",    // Data Classification - CJI Identification
    "11.4",    // Encryption at Rest
    "11.6",    // Logging & Monitoring
    "12.2"     // Data Retention
  ]
}
```

### Phase 2: Link Evidence to Controls (Do Not Implement)

incidents.jsonl adds control-aware fields:

```jsonl
{"incident_id": "676c10c1", "control_ids": ["12.1", "11.4", "11.6"], "story_id": "HART-287", "evidence_status": {"12.1": "detected", "11.4": "missing_encryption_audit", "11.6": "missing_access_log"}}
```

### Phase 3: Multi-Layer Evidence Collection (Do Not Implement)

Expand beyond pattern detection:

- **Code layer:** Keel detects pattern (phase 5 or 7)
- **Infrastructure layer:** Query cloud provider (AWS KMS, RDS encryption) for key management audit
- **Access layer:** Query identity provider (Okta) or API logs for access attempts
- **Audit layer:** Query SIEM for correlated security events

### Phase 4: Auditor Dashboard (Do Not Implement)

Enable queries like:

```
Query: "Show me evidence for control 11.4 (Encryption at Rest) from 2026-07-01 to 2026-08-07"

Result:
  Story HART-287:
    ✓ Code review: SSN field has encrypt=true flag (approved by Alice, 2026-07-22)
    ✓ DB audit: RDS encryption enabled, key in KMS, rotated 2026-08-03
    ✓ Key audit: decryption key accessed by 3 users (officer-123, officer-456, admin-db)
    ✓ Access logs: 47 decryption operations, all authorized + logged
  
  Control 11.4 status: ✓ SATISFIED (all evidence present)
```

---

## Current Implementation Reality vs Control Mapping

### What Keel Actually Does

1. ✓ Detects CJI patterns in prompt + tool output (pattern-based, not control-based)
2. ✓ Logs detections to append-only audit trail (incidents.jsonl)
3. ✓ Enforces scope-aware severity (soft out-of-scope allowed, in-scope hard)
4. ✓ Validates pattern governance (sources + approvals)
5. ⚠ (Partial) Stores evidence but does NOT link to story or controls

### What Keel Does NOT Do (Blocking Full Control Satisfaction)

1. ✗ No control ID mapping in patterns
2. ✗ No incident-to-story linkage (incidents.jsonl has no story_id)
3. ✗ No control-aware evidence requirements (gate doesn't ask "is encryption audit linked?")
4. ✗ No cross-layer evidence collection (code only, not infrastructure/access/audit)
5. ✗ No auditor interface (cannot query "control X status on date Y")
6. ✗ No policy version binding (cannot claim compliance with specific CJIS v5.9.5 vs v6.0)

---

## Compliance Claim Statement

**CAN Keel credibly claim CJIS control satisfaction today?**

**Answer: NO, with nuance.**

- ✓ **Control 12.1 (Data Classification):** YES — Keel detects CJI patterns and logs them, satisfying "identify and mark CJI"
- ✗ **Control 11.4 (Encryption at Rest):** NO — Detection of SSN is NOT evidence of encryption
- ✗ **Control 11.6 (Logging & Monitoring):** PARTIAL — Keel logs detections but NOT access by user/purpose
- ✗ **Control 11.1 (Authentication/Access):** NO — Keel does not verify authorization
- ✗ **All other controls (11.2, 11.3, 11.5, 11.7, 11.8, 12.2, 12.3):** NO — completely absent

**Bottom Line:** Keel is a **data classification tool** (control 12.1 partial credit), not a **compliance control platform** (controls 11.x + 12.2 + 12.3 require separate evidence sources).

---

## Outstanding Decisions (Waiting on Policy Owner)

1. **Policy Version:** Confirm which CJIS Security Policy version (v5.9.5, v6.0, v6.1, or future) Keel should audit against
2. **Control Scope:** Confirm which controls Keel is expected to satisfy vs. which are out-of-scope (e.g., physical security clearly outside)
3. **Evidence Linkage:** Confirm whether incidents.jsonl should be extended with control_id, story_id, and other audit context
4. **Governance Confirmations:** Wait for Forseti (NCIC_ID, LEID) and HART (HART_CASE_ID, HART_SUBJECT_ID) to confirm identifier formats

---

## Files Referenced

- `config/cjis-data-element-registry.json` — patterns and policy_control_ids (partial, only 12.1)
- `scripts/keel-classify-gate.cjs` — detection logic (control 12.1 only)
- `docs/cjis/implementation-status.md` — governance assessment
- `docs/compliance/continuous-evidence-readiness.md` — enterprise coverage gaps
- CJIS Security Policy v5.9.5 (authoritative control definitions — not in repo)

