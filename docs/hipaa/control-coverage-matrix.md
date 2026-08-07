# HIPAA Control Coverage Matrix

**Date:** 2026-08-07  
**Status:** BLOCKED PENDING PRECONDITION  
**Next Step:** See docs/hipaa/decision-log.md

---

## Current Status: Precondition Gate

This control matrix is **BLOCKED** at the precondition check.

**Requirement:** Confirm that this product (HART) is a HIPAA Covered Entity or Business Associate (i.e., handles ePHI).

**Current Finding:** UNCONFIRMED — Product appears to be law enforcement/criminal justice platform, not healthcare. Awaiting Privacy/Security Officer confirmation.

---

## Framework: HIPAA Security Rule (45 CFR §164, Subpart C)

**Scope:** If HIPAA applies, controls map to:
- Administrative Safeguards (§164.308) — organizational/personnel
- Physical Safeguards (§164.310) — facilities/infrastructure
- Technical Safeguards (§164.312) — system/software

---

## Technical Safeguards (§164.312) — Engineering-Controllable

If HART handles ePHI, these safeguards apply:

| Safeguard | Requirement | Keel Support | Gap |
|-----------|-------------|-------------|-----|
| **§164.312(a)(1)** | User access policies | GitHub branch protection (PR approval) | Organizational user provisioning/deprovisioning (outside Keel) |
| **§164.312(a)(2)(i)** | Unique user ID | GitHub OAuth (Claude Code session auth) | Organizational IdP audit (outside Keel) |
| **§164.312(a)(2)(ii)** | Emergency access procedures | TBD (requires org policy) | Organizational incident response (outside Keel) |
| **§164.312(b)** | Audit controls | Hash-chained audit trail (existing) | Organizational SIEM/monitoring (outside Keel) |
| **§164.312(c)(1)** | Integrity controls | Tamper detection via hash chain | Application-level data integrity (requires DB schema audit) |
| **§164.312(c)(2)** | User authentication | Claude Code + GitHub + git signing | Organizational authentication policy (outside Keel) |
| **§164.312(d)(1)** | Encryption at rest | TBD (database encryption config) | Infrastructure audit required |
| **§164.312(d)(2)** | Encryption in transit | TLS/HTTPS (standard) | Network/infrastructure audit required |

---

## Administrative Safeguards (§164.308) — Organizational

**These are OUTSIDE Keel's scope and require organizational controls:**

| Safeguard | Requirement | Keel Support | Gap |
|-----------|-------------|-------------|-----|
| **§164.308(a)(1)** | Security management plan | Written policy required | Organization responsibility |
| **§164.308(a)(3)** | Workforce security | User provisioning/deprovisioning, termination | HR/identity management (outside Keel) |
| **§164.308(a)(4)** | Training & awareness | Privacy/security training completion | HR responsibility (outside Keel) |
| **§164.308(a)(5)** | Security awareness/training | Mandatory training records | HR responsibility (outside Keel) |
| **§164.308(a)(7)** | Contingency planning | Disaster recovery, backup procedures | Infrastructure/DevOps responsibility |
| **§164.308(a)(8)** | Breach notification | 60-day notification to individuals | Legal/communications responsibility |

---

## Physical Safeguards (§164.310) — Organizational

**These are OUTSIDE Keel's scope:**

| Safeguard | Requirement | Keel Support | Gap |
|-----------|-------------|-------------|-----|
| **§164.310(a)(1)** | Facility access controls | Badge access, visitor logs, security | Facilities/physical security responsibility |
| **§164.310(a)(2)** | Workstation security | Physical security of devices | Facilities/endpoint security responsibility |
| **§164.310(b)** | Workstation use policies | Acceptable use, clean desk | Organization/management responsibility |
| **§164.310(c)** | Workstation location policies | Monitoring, camera use | Facilities responsibility |
| **§164.310(d)** | Device/media controls | Encryption, secure disposal | Infrastructure/IT responsibility |

---

## Current Reusable Evidence (If Audit Proceeds)

**§164.312(b) — Audit Controls:**
- `docs/AUDIT_ENFORCEMENT.md` — hash-chained audit log design
- `scripts/keel-audit-guard.cjs` — append-only enforcement on push
- `docs/AUDIT_LOG_RETENTION.md` — retention policy (≥ 1 year)
- `scripts/test-audit-append-only.cjs` — tamper detection validation
- Evidence: audit logs show **what** happened and **when**, proving the system detects unauthorized changes

**§164.312(a)(2)(i) — User Identification:**
- GitHub OAuth integration (Claude Code session authentication)
- GitHub user context in commits (git log shows author identity)
- PR approval history (GitHub API shows who approved changes)
- Evidence: every change linked to authenticated user

**§164.312(c)(1) — Integrity Controls:**
- Hash chain on audit-log entries (prevents undetected modification)
- git commit history (immutable, cryptographically signed)
- Evidence: demonstrates ability to detect and prove tampering

---

## Key Differences from CJIS Audit

**HIPAA PHI Identifier Challenge:**

CJIS identifiers (SSN, DOB, NAME_NARRATIVE, NCIC_ID, LEID) can be matched against **relatively standardized formats** because:
- SSN: Fixed format XXX-XX-XXXX (IRS standard)
- DOB: Contextual (date keywords + date pattern)
- NCIC_ID: ORI format (Forseti will confirm)

HIPAA PHI identifiers include vendor-specific IDs without universal standards:
- **MRN (Medical Record Number):** Epic uses MRN123456, Cerner uses a different format, Medidata uses yet another
- **Patient ID:** Varies by health system
- **Health Plan ID:** Varies by insurer
- **Account Numbers:** System-specific

**Solution for Audit (If Proceeding):**
1. Use Safe Harbor standard (45 CFR §164.514(b)(2)) as the **category list**, not as the **pattern source**
2. Enumerate 18 PHI categories (names, addresses, phone, email, SSN, MRN, etc.)
3. For **standardized identifiers** (SSN, DOB, email, phone, address): Patterns can be extracted from Safe Harbor
4. For **vendor-specific identifiers** (MRN, patient ID, account number): Mark as DEPLOYMENT_SPECIFIC and require per-deployment specification from the healthcare organization running HART

---

## Precondition Gate

**This matrix is a placeholder pending:**

1. Privacy/Security Officer confirmation that HART handles ePHI
2. If NO: Close this audit (HIPAA not applicable)
3. If YES: Return and complete Technical Safeguard mapping with file:line evidence

**Reference:** docs/hipaa/decision-log.md (precondition check)

---

## Related

- **HIPAA Security Rule:** 45 CFR Part 164, Subpart C
- **Safe Harbor de-identification:** 45 CFR §164.514(b)(2) — 18 PHI categories
- **Breach Notification Rule:** 45 CFR §164.400+ — 60-day notification requirement
- docs/hipaa/decision-log.md — precondition check
- docs/hipaa/implementation-status.md — reusable evidence inventory

