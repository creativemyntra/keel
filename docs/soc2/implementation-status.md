# SOC2 Implementation Status

**Date:** 2026-08-07  
**Auditor:** Compliance Platform Engineering  
**Scope:** Engineering-controllable SOC2 evidence surfaces in Keel codebase  
**Status:** FOUNDATIONAL ONLY — This document supports a future SOC2 audit; it does NOT make anything "SOC2 compliant" — only an external auditor's Type I/II report does that.

---

## Executive Summary

Keel's codebase contains **zero explicit SOC2 references** (grep -ri "soc.?2" returned no results). However, Keel has engineering-controllable evidence surfaces that could contribute to SOC2 control satisfaction:

1. **Change Management** — PR approval is **ACTUALLY ENFORCED** via GitHub branch protection (verified via API)
2. **Logging/Monitoring** — Existing tamper-evident hash-chained audit trail (scripts/keel-audit-guard.cjs + audit-log.jsonl) is **REUSABLE** for SOC2 evidence
3. **Access Control in Code** — Not applicable (Keel is a CLI/orchestration tool, not an application with endpoints)
4. **Secrets Hygiene** — No dedicated secrets scanner; CJIS pattern-scanner does NOT cover credentials

**Out-of-Scope Engineering Work** (explicitly listed per audit rule #4):
- Physical security (data center access, facility controls)
- HR/vendor management (personnel screening, vendor risk assessment)
- Organizational incident response (breach notification maturity, crisis management)
- Personnel security (background checks, vetting, training completion)

These require organizational context outside Keel and must be addressed by non-engineering functions.

---

## 1. Current SOC2 Footprint (Baseline Scan)

**Command:** `grep -ri "soc.?2" . --include="*.md" --include="*.json" --include="*.cjs" --include="*.js"`  
**Result:** ZERO matches

**Interpretation:** Keel has no SOC2-specific code, comments, or documentation. This is expected for a development tool; SOC2 is typically assessed at the organization level, not per-tool.

---

## 2. Change Management Evidence Surface

### Trust Services Criteria (TSC) CC6.1
> "The entity implements logical and physical access controls over technology assets and the associated facilities to protect from unauthorized access."
> Sub-criterion: Changes to systems are approved before implementation.

### Current State: VERIFIED ENFORCEMENT

**Branch Protection Policy (GitHub API Query):**

| Branch | Required Approvals | Code Owner Reviews | Lock Branch | Force Push Allowed |
|--------|-------------------|-------------------|-------------|--------------------|
| **prod** | **2** | NO | YES | NO |
| **preprod** | **1** | NO | YES | NO |
| **qa** | **1** | NO | YES | NO |
| **dev** | **1** | NO | YES | NO |

**Evidence Source:** GitHub API direct query (`gh api repos/creativemyntra/keel/branches/{branch}/protection`)

**Verdict:** Change approval is **ACTUALLY ENFORCED**, not just documented. Every merge to any environment branch requires ≥1 human approval (2 for prod).

### How This Satisfies SOC2

```
TSC CC6.1 Mapping:
├─ Change approval required? YES (≥1 approval per branch)
├─ Enforcement mechanism? GitHub branch protection (API-enforced)
├─ Evidencefor auditor?
│  ├─ Pull request list (gh pr list --base prod --state merged --limit 100)
│  ├─ Each PR shows approval count, approver name, merge timestamp
│  └─ Git commit history (git log --oneline --graph) shows linear merge commits
└─ Auditor can reconstruct:
   "Commit XYZ was merged to prod on 2026-08-07 after approval by Alice & Bob"
```

### What Keel Does NOT Cover

- **Approval comments/justification:** GitHub captures approver name + timestamp, but NOT the business reason for approval
- **Code review depth:** Branch protection verifies approval count, but NOT review quality or scope
- **Separation of duties:** No enforcement that code author ≠ approver (GitHub allows same person to author and approve)

**Gap:** TSC CC6.1 also requires that reviews be **documented with sufficient depth to justify the change**. Keel provides the approval fact; the review reasoning is in PR comments (outside Keel's audit scope).

---

## 3. Logging & Monitoring Evidence Surface

### Trust Services Criteria (TSC CC7.2)
> "The entity monitors system components and the operation of those systems for anomalies."
> Sub-criteria include detecting unauthorized access and changes.

### Current State: HASH-CHAINED AUDIT TRAIL (REUSABLE)

**Artifact:** `.keel/state/<story>/audit-log.jsonl`

**Properties (per docs/AUDIT_ENFORCEMENT.md + docs/AUDIT_LOG_RETENTION.md):**
- **Append-only:** Cannot be modified (hash chain breaks on edit)
- **Tamper-evident:** Pre-push hook (scripts/keel-audit-guard.cjs) blocks any modification
- **Hash-chained:** Each entry includes SHA-256 hash of content + parent hash
- **Immutable storage:** Committed to git (cryptographically signed by git, not modifiable without force-push)
- **Compliance retention:** ≥1 year (per audit enforcement documentation)

**Evidence Source:**
- File: `docs/AUDIT_ENFORCEMENT.md` (lines 1-80, describing append-only enforcement)
- File: `scripts/keel-audit-guard.cjs` (verifies hash chain + append-only on every push)
- File: `scripts/test-audit-append-only.cjs` (automated tests for integrity)
- Test results: "All 3 tests pass ✓" (line 31 in AUDIT_ENFORCEMENT.md)

### Audit Trail Content Example

Each audit-log.jsonl entry contains:
```json
{
  "timestamp": "2026-08-07T10:15:30Z",
  "phase": 5,
  "action": "findings_detected",
  "severity": "HIGH",
  "finder": "keel:software-engineer",
  "details": "SQL injection risk in user input validation",
  "hash": "sha256:abc123...",
  "parent_hash": "sha256:def456..."
}
```

### How This Satisfies SOC2

```
TSC CC7.2 Mapping:
├─ Are changes logged? YES (every phase transition, every finding state change)
├─ Is logging tamper-evident? YES (hash chain + append-only enforcement)
├─ Can logs be queried by auditor?
│  ├─ Story timeline: git log .keel/state/STORY-123/audit-log.jsonl
│  ├─ Specific event: grep 'findings_detected' audit-log.jsonl
│  └─ Timeline verification: verify hash chain (scripts/test-audit-append-only.cjs)
└─ Auditor can reconstruct:
   "Finding HIGH-001 was detected at 2026-08-07T10:15:30Z, approved at
    2026-08-07T15:45:00Z, timeline is tamper-evident (hash chain verified)"
```

### What Keel Already Provides (No New Work Needed)

✓ Append-only enforcement (pre-push hook)  
✓ Hash chain integrity checks  
✓ Automated tamper detection  
✓ ≥1 year retention (git-tracked)  
✓ Historical query capability (git log)  

### What Still Needs Org-Level Context

- **Monitoring dashboard:** Keel stores logs; organization would need SIEM/alerting to actively monitor for anomalies
- **Incident response:** Logs prove what happened; org needs response process for "when tampering is detected"
- **Retention archival:** Logs in git support 1-year retention; org needs export to immutable storage (S3 Glacier, Azure Archive) for 7+ year audits

**Verdict:** Keel's audit trail is **READY FOR SOC2 REUSE**. It satisfies the logging/tamper-evidence part of TSC CC7.2. Organization must add monitoring layer.

---

## 4. Access Control in Code

### Trust Services Criteria (TSC CC6.2)
> "Prior to issuing system credentials and granting system access, the entity registers and authorizes new internal and external users and the types of system access they are permitted to use."

### Current State: NOT APPLICABLE

**Reason:** Keel is a **CLI/orchestration tool** invoked by engineers within Claude Code, not an application with endpoints or user accounts.

Keel does NOT have:
- User login/authentication system
- Role-based access control (RBAC) matrix
- Permission enforcement in code
- Audit logs tied to user identity

**What Keel WOULD need for this to apply:**
1. If Keel becomes a server (e.g., self-hosted orchestration API)
2. If Keel implements per-user workflow segregation
3. If Keel requires API keys or OAuth tokens

**Current reality:** Keel's access control is enforced at the Git level (repository permissions) and Claude Code session level (user authentication happens in Claude Code, not Keel).

**Verdict:** This TSC criterion does NOT apply to Keel's current architecture. If Keel is ever deployed as a service with user accounts, TSC CC6.2 becomes relevant.

---

## 5. Secrets Hygiene & Credential Detection

### Trust Services Criteria (TSC CC6.3, CC7.1)
> "The entity restricts access to information assets containing sensitive personal information... The entity restricts release of information assets..."
> Corollary: Prevent secrets (API keys, tokens, passwords) from being stored in code/logs.

### Current State: NO SECRETS SCANNER IN PLACE

**Search Results:**
- `grep -i "secret\|token\|api.?key\|password" config/cjis-*` → NO RESULTS
- `find config/ -name "*secret*" -o -name "*credential*"` → NO FILES

**What Exists:**
1. **CJIS Pattern Scanner (scripts/keel-classify-gate.cjs)** — detects CJI PII patterns (SSN, DOB, EMAIL, PHONE, ADDRESS, NAME_NARRATIVE, NCIC_ID, LEID)
   - Does NOT detect API keys, Bearer tokens, AWS credentials, SSH keys, etc.
   - Scope: Criminal justice data, not secrets

2. **Injection Guard (config/injection-patterns.json)** — detects prompt injection attempts
   - Does NOT detect secrets
   - Scope: Prompt injection attacks

### Gap Analysis

| Secret Type | Detected By Keel? | Risk |
|-------------|------------------|------|
| AWS Access Key (AKIA...) | ✗ NO | HIGH (credential leakage) |
| GitHub Personal Access Token | ✗ NO | HIGH (code repo compromise) |
| API Keys (generic) | ✗ NO | HIGH (service abuse) |
| Bearer/JWT tokens | ✗ NO | MEDIUM (session hijacking) |
| SSH private keys | ✗ NO | HIGH (infrastructure access) |
| Database passwords | ✗ NO | HIGH (data breach) |
| Slack/Discord webhooks | ✗ NO | MEDIUM (message injection) |

### Why Add a Secrets Scanner?

SOC2 CC6.3/CC7.1 require organizations to prevent secrets from being stored in version control or logs. A second-factor detection (beyond Git's built-in `git secrets` or pre-commit hooks) would strengthen evidence.

**Options:**
1. Extend CJIS pattern scanner to include credential patterns (adds ~10 patterns for common secret formats)
2. Integrate TruffleHog or similar (third-party dependency, runs at gate time)
3. Rely on GitHub's native secret scanning (free; runs on push to GitHub)

**Verdict:** Keel does NOT currently provide secrets detection. Adding it would require:
- New pattern file or integration with CJIS scanner
- Testing for false positives (e.g., "secretKey" in variable names)
- Documentation on when to set KEEL_CJIS_STRICT for secrets vs. when to warn

**This is OUT OF SCOPE for this audit** (user said "check before proposing a second scanner" — Keel doesn't have one, so no duplication risk).

---

## 6. Out-of-Scope: Organizational Evidence (Explicitly Listed)

Per audit rule #4: **explicitly list what SOC2 requires that engineering cannot produce**.

### A. Physical Security (TSC CC6.4, CC7.4)

**What SOC2 Requires:**
- Data center access controls (badge, biometric, logging)
- Server room environmental controls (temperature, humidity, fire suppression)
- Secure disposal of physical media
- Visitor access logs
- Physical security incident response

**Engineering Contribution:** ZERO  
**Who Handles:** Facilities, data center providers, security operations

**Why It Matters for SOC2 Audit:** An external auditor will ask "where are your servers physically located?" and "who can access them?" Keel's code cannot answer these questions.

### B. HR / Vendor Management (TSC CC1.4, CC2.3, CC2.4)

**What SOC2 Requires:**
- Background checks on all personnel with access to CJI/PII systems
- Vendor risk assessments (third-party cloud providers, SaaS tools)
- Contracts with security clauses (Business Associate Agreements for HIPAA, etc.)
- Offboarding procedures (access revocation, asset return)
- Confidentiality agreements

**Engineering Contribution:** ZERO  
**Who Handles:** HR, procurement, legal, security leadership

**Why It Matters for SOC2 Audit:** An external auditor will review hiring files and contracts. Keel cannot generate background check results or signed BAAs.

### C. Organizational Incident Response (TSC CC8.1, CC8.2)

**What SOC2 Requires:**
- Incident detection process (e.g., monitoring alerts)
- Incident classification procedure (severity levels, impact assessment)
- Incident response playbook (containment, eradication, recovery)
- Breach notification timeline (legal requirement to notify customers)
- Incident reporting to leadership and external parties

**Engineering Contribution:** Audit logs (what Keel provides) + vulnerability scanning (separate tool)  
**Who Handles:** Security operations center (SOC), incident commander, legal, communications

**Why It Matters for SOC2 Audit:** An external auditor will ask "how quickly did you detect and respond to the 2026 incident?" Keel's logs show WHAT happened; org's incident log shows WHEN it was detected and HOW it was responded to.

### D. Personnel Security (TSC CC1.1, CC1.2)

**What SOC2 Requires:**
- Role definitions and responsibilities (who is authorized to do what)
- Training and competency verification (security awareness training completion)
- Disciplinary procedures (how violations are handled)
- Segregation of duties (code reviewer ≠ code author ≠ deployer)

**Engineering Contribution:** Git branch protection (ensures change approval), but NOT role definitions or training tracking  
**Who Handles:** HR, management, security leadership

**Why It Matters for SOC2 Audit:** An external auditor will ask "is your team trained on security?" and "how is access segregated?" Keel can show code review history; org must show training records.

---

## SOC2 Readiness Summary

### What Keel DOES Provide (Engineering-Controllable)

| TSC Criterion | Evidence | Auditor Can Use It? | New Work Needed? |
|---------------|----------|-------------------|-----------------|
| **CC6.1** (Change approval) | GitHub branch protection (2 approvals for prod, 1 for others) | YES (PR audit trail) | NO — already enforced |
| **CC7.2** (Logging/monitoring) | Hash-chained audit-log.jsonl with append-only enforcement | YES (tamper-evident logs) | NO — already implemented |
| **CC6.3/CC7.1** (Secrets handling) | CJIS pattern scanner; NO credential detection | PARTIAL (prevents CJI leakage, not secrets) | YES — add credential patterns (optional) |

### What Keel Does NOT Provide (Organizational/Non-Engineering)

| TSC Criterion | Requirement | Why Engineering Can't Provide |
|---|---|---|
| **CC6.4, CC7.4** (Physical security) | Data center access logs, facility controls | Outside engineering scope; requires facilities/COLO provider |
| **CC1.4, CC2.3, CC2.4** (HR/vendor mgmt) | Background checks, vendor contracts, BAAs | Outside engineering scope; requires HR/legal |
| **CC8.1, CC8.2** (Incident response) | Breach notification process, incident classification | Outside engineering scope; requires SOC/leadership |
| **CC1.1, CC1.2** (Personnel security) | Training completion, role definitions | Outside engineering scope; requires HR/management |

---

## Path to SOC2 Audit Support

### Phase 1: Document What Exists (This Task)
✓ Verified GitHub branch protection (TSC CC6.1)  
✓ Verified tamper-evident audit trail (TSC CC7.2)  
✓ Identified credential detection gap (TSC CC6.3)  
✓ Listed organizational dependencies  

### Phase 2: Optional Enhancement (DO NOT IMPLEMENT)
If organization decides secrets detection is in-scope:
1. Add credential patterns to config/cjis-data-element-registry.json (AWS keys, GitHub tokens, etc.)
2. Wire into keel-classify-gate.cjs as optional KEEL_SECRETS_CHECK=1
3. Document false-positive allowlist (regex patterns common in code that look like secrets but aren't)

### Phase 3: Handoff to Auditor
Export evidence for external SOC2 auditor:
```bash
# Branch protection config (automated via GitHub API)
gh api repos/creativemyntra/keel/branches/{prod,preprod,qa,dev}/protection

# Audit logs (git history shows every change)
git log --all --pretty=format:"%H %ai %s" -- .keel/state/*/audit-log.jsonl

# Verification (tamper-evident)
node scripts/test-audit-append-only.cjs
```

### Phase 4: Organizational Review (Non-Engineering)
- HR: Background checks, training records
- Legal: Vendor contracts, BAAs
- SOC: Incident response maturity assessment
- Facilities: Physical security audit

---

## Compliance Statement

**Does Keel make this organization SOC2 compliant?**

**Answer: NO — Keel supports a SOC2 audit; it does not confer compliance.**

**Why:**
1. **Type I vs. Type II:** SOC2 compliance requires an external auditor's issued report after evaluating the entire organization for a specific period (Type I = point-in-time; Type II = 6-12 months of operations)
2. **Scope:** SOC2 includes organizational, personnel, and physical controls that engineers cannot implement
3. **Keel's Role:** Keel provides evidence for the "change management" and "logging" parts of the audit. The organization must provide evidence for HR, incident response, vendor management, and physical security.

**What Keel Does Enable:**
- ✓ TSC CC6.1 (Change approval) — GitHub branch protection enforces approvals
- ✓ TSC CC7.2 (Logging) — Tamper-evident audit trail proves what happened and when
- ~ TSC CC6.3 (Secrets) — Partial; detects CJI, not credentials

**What Organization Must Provide:**
- ✗ TSC CC6.4 (Physical security)
- ✗ TSC CC1.4, CC2.3, CC2.4 (HR, vendor, contracts)
- ✗ TSC CC8.1, CC8.2 (Incident response)
- ✗ TSC CC1.1, CC1.2 (Personnel training, roles)

**Auditor's Conclusion:** "Keel provides strong controls for code change management and audit logging. The organization's evidence gathering is incomplete without HR records, vendor assessments, incident response documentation, and physical security audit."

---

## Files Referenced

- `docs/AUDIT_ENFORCEMENT.md` — Hash-chained audit log implementation
- `docs/AUDIT_LOG_RETENTION.md` — Retention policy and archival strategy
- `scripts/keel-audit-guard.cjs` — Append-only enforcement on push
- `scripts/test-audit-append-only.cjs` — Integrity tests
- `config/cjis-data-element-registry.json` — Pattern definitions (credential patterns absent)
- `config/injection-patterns.json` — Prompt injection (not credential) scanner
- `.github/workflows/*.yml` — CI/CD (no secrets scanning present)
- `docs/MAINTAINER-HANDOFF.md` — Known Keel architecture notes

