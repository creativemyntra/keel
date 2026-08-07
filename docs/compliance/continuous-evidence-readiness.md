# Continuous Compliance Automation Readiness Audit

**Model:** Vanta/Drata-style continuous evidence collection & control mapping  
**Date:** 2026-08-07  
**Auditor:** Compliance Platform Engineering  
**Verdict:** Keel is a **development-pipeline tool**, not an enterprise compliance platform. Evidence collection is pipeline-scoped only.

---

## Framework-by-Framework Assessment

### 1. CJIS (Criminal Justice Information Services)

#### Evidence Collection

**Current State:** Trigger-based (gate fires)

**Mechanism:**
- Location: `~/.keel/security/incidents.jsonl` (append-only, hash-chained)
- Trigger: `keel-classify-gate.cjs` on UserPromptSubmit, PreToolUse, PostToolUse (hooks/hooks.json lines 17-37)
- Artifact: JSON lines (incident_id, ts, event, severity, stage, tool, matched_categories, content_hash, blocked)
- Evidence: Line 2514-2515 `scripts/keel-state.cjs` documents "Global (not story-scoped) CJIS incident log from keel-classify-gate.cjs"

**Collection Model:** NOT continuous. Collection is **event-triggered**:
- Only fires when Claude Code session active
- Missing: collection from `git push` (direct shell), GitHub PR (web UI), CI/CD pipelines
- Missing: background scanning of repositories or artifact registries

**Gap:** CJIS data leaks could occur outside Claude Code; no evidence collected for those scenarios.

#### Control Mapping

**Current State:** NONE

**Evidence:** 
- incidents.jsonl has no `control_id`, `policy_version`, or `control_name` field
- No mapping between incident and CJIS Security Policy requirements (e.g., "11.1.1 encryption of data at rest")
- keel-classify-gate.cjs (lines 239-247) logs `matched_categories` (e.g., "SSN", "NCIC_ID") but not to a control framework

**Gap:** Auditor cannot query "did control 11.2.3 pass on 2026-08-07?" because incidents are logged by pattern, not control.

#### Evidence Freshness

**Current State:** No expiry concept

**Test Case:** 
- Scenario: Developer runs gate on 2026-06-01, gate passes (no CJIS patterns found)
- Question: Does that PASS evidence satisfy a compliance assertion on 2026-08-07?
- Finding: **YES, it does.** incidents.jsonl is append-only; no re-validation required.
- Problem: Code may have changed between dates, but evidence is not re-checked.

**Gap:** Evidence is not continuously validated. A change to `config/cjis-patterns.json` on 2026-07-15 does not retroactively invalidate evidence from 2026-06-01.

#### Auditor-Consumability

**Test Walk-Through:** Story HART-287 (iOS payment timeout, high-risk CJIS)

1. **Gather evidence:**
   - `.keel/state/HART-287/audit-log.jsonl` → phases 1-8 completed
   - `~/.keel/security/incidents.jsonl` → filter by story ID? (HART-287 not in incident log structure)
   - git log for HART-287 commits → no CJIS violations in commit messages
   - GitHub PR #122 → review comments not captured in Keel artifacts

2. **Reconstruct "CJIS control X satisfied by evidence Y":**
   - ✓ Can find phases completed (from audit-log.jsonl)
   - ✓ Can find gate status (from incidents.jsonl if CJIS data touched)
   - ✗ CANNOT map to specific control IDs
   - ✗ CANNOT link incident to story ID (incidents.jsonl has no story_id field)
   - ✗ CANNOT verify code review happened (PR comments not in Keel logs)
   - ✗ CANNOT verify security sign-off (C-0005 findings approval exists, but not tied to CJIS controls)

3. **External auditor's report:**
   ```
   "HART-287 shows phases 1-8 complete per audit-log.jsonl.
    No CJIS violations logged in incidents.jsonl (but cannot confirm
    story ID mapping or which controls satisfied).
    Cannot verify: code review by security team, deployment approval,
    or ongoing monitoring post-release."
   ```

**Gap:** Auditor cannot reconstruct "control X satisfied by evidence Y on date Z" for CJIS because:
- No control ID mapping in evidence
- No story-to-evidence linkage
- Evidence is pipeline-only (missing code review, deployment, runtime)

#### Coverage Breadth

| System Type | Touches? | Evidence | Gap |
|-----------|---|---|---|
| **Cloud (AWS/Azure/GCP)** | **NO** | No integration with cloud provider APIs or logs | Cannot monitor cloud IAM, encryption, access logs |
| **IdP (SAML/OIDC/AD)** | **NO** | No integration with authentication system | Cannot verify developer authentication, MFA, access revocation |
| **Endpoint (developer machine)** | **NO** | No agent on dev machines | Cannot verify disk encryption, firewall, malware scanning |
| **HR system (identity, offboarding)** | **NO** | No integration with HR/identity platform | Cannot verify access revoked on termination |
| **Ticketing (Jira)** | **PARTIAL** | MCP integration reads Jira (agents/orchestrator.md, skills/start-work/SKILL.md) | Can verify story creation, but not approvals or security team sign-off |
| **Code repository (git/GitHub)** | **YES** | Full integration: logs pushes, PR reviews, branch checks | Can verify code changes, but NOT code execution or deployment |
| **Audit logs (internal)** | **YES** | append-only audit-log.jsonl per story, incidents.jsonl for CJIS | Limited: pipeline-only, no system-wide events |
| **Deployment (CI/CD)** | **PARTIAL** | References `.github/workflows/` but no artifacts captured in Keel state | Can run tests, but no evidence of deploy approval or production state |

**Breadth:** Keel covers **2/8 systems** (Code + Ticketing). Missing: Cloud, IdP, Endpoint, HR, Deployment verification.

---

### 2. SOC2 (System & Organization Controls)

#### Evidence Collection

**Current State:** NONE

**Gap:** Keel has zero SOC2-specific evidence collection. SOC2 requires:
- Access control logs (who logged in when, from where)
- Change management (who approved code, when, why)
- Incident response (CRIT/HIGH findings detection + resolution)
- Backup/disaster recovery verification
- Monitoring/alerting configuration

Keel collects only pipeline events (gate, findings, approvals). Missing: system access, change approvals, incident timelines, infrastructure readiness.

#### Control Mapping

**Current State:** NONE

**Gap:** No SOC2 control IDs referenced anywhere in codebase. `config/cjis-data-element-registry.json` has `policy_control_ids` field but examples are CJIS-specific (OWASP-PII-01, CJIS-UNIV-001), not SOC2.

#### Auditor-Consumability

**Result:** Auditor cannot reconstruct SOC2 control evidence from Keel. Would need:
- User access audit trail (who is in what group, when did access grant/revoke)
- Change log (what changed, who approved, when deployed)
- Incident log (CRIT findings detected, resolution, timeline)
- Infrastructure snapshot (encryption enabled, MFA enforced, etc.)

None of these are captured.

**Verdict:** SOC2 evidence collection: **NOT STARTED**

---

### 3. HIPAA (Health Insurance Portability & Accountability)

#### Evidence Collection

**Current State:** NONE

**Gap:** Keel has no HIPAA-specific collection. HIPAA requires:
- PHI (Protected Health Information) classification (no pattern for medical records, patient IDs, health status)
- Encryption audit (data at rest, in transit)
- Access logs (who accessed PHI, when, why)
- Breach notification workflow
- Business Associate Agreements (BAA) audit trail
- Audit & accountability logging (per 45 CFR § 164.312(b))

keel-classify-gate.cjs has no PHI patterns. (Compare: CJIS has SSN, DOB, NAME_NARRATIVE patterns; HIPAA missing entirely.)

#### Control Mapping

**Current State:** NONE

**Gap:** No HIPAA control references in codebase.

**Verdict:** HIPAA readiness: **NOT STARTED**

---

### 4. NIBRS (National Incident-Based Reporting System)

#### Evidence Collection

**Current State:** NONE

**Gap:** NIBRS is FBI incident reporting, not a compliance framework per se. However, if Keel were to collect NIBRS data:
- Would need to classify incidents by NIBRS codes (e.g., 36 offenses)
- Would need timestamp, jurisdiction, offender demographics
- Would need to validate against FBI UCR guidelines

No NIBRS-specific collection exists. NAME_NARRATIVE pattern (in cjis-patterns.json) is loosely related to NIBRS narratives, but no mapping to NIBRS codes.

**Verdict:** NIBRS readiness: **NOT APPLICABLE** (reporting framework, not compliance framework Keel would target)

---

## Summary Table: Continuous Compliance Readiness

| Dimension | CJIS | SOC2 | HIPAA | NIBRS |
|-----------|------|------|-------|-------|
| **Evidence Collection** | Trigger-based (gate) | None | None | N/A |
| **Continuous (24/7)** | ✗ (Claude Code only) | ✗ | ✗ | N/A |
| **Control Mapping** | ✗ (patterns, not controls) | ✗ | ✗ | N/A |
| **Evidence Freshness** | Append-only (no expiry) | N/A | N/A | N/A |
| **Auditor-Consumable** | ✗ (missing linkages) | ✗ (no collection) | ✗ (no collection) | N/A |
| **Cloud** | ✗ | ✗ | ✗ | N/A |
| **IdP** | ✗ | ✗ | ✗ | N/A |
| **Endpoint** | ✗ | ✗ | ✗ | N/A |
| **HR/Identity** | ✗ | ✗ | ✗ | N/A |

---

## Honest Gap Statement

### What Keel Is

Keel is a **development-pipeline automation tool** with embedded compliance gates:
- ✓ Enforces patterns (CJIS patterns, directive adherence, finding resolution) during pipeline
- ✓ Logs gate results to append-only audit trail
- ✓ Integrates with code (git) and ticketing (Jira)
- ✓ Collects evidence from phases 1-10 of a story

### What Keel Is NOT

Keel is **not** a continuous compliance platform (Vanta/Drata model):
- ✗ No continuous collection (only on-demand, pipeline-triggered)
- ✗ No control mapping (patterns logged, not controls)
- ✗ No enterprise system integration (no cloud, IdP, endpoint, HR, SIEM)
- ✗ No time-series evidence (evidence collected once, never re-validated)
- ✗ No auditor dashboard (no way to export "control X status on date Y")
- ✗ No out-of-band evidence (missing git push, GitHub PR, CI/CD, production)

### The Fundamental Model Difference

| Dimension | Keel | Vanta/Drata |
|-----------|------|---|
| Collection trigger | Pipeline invocation | Continuous (hourly/daily) |
| Evidence scope | Development pipeline | Entire organization (cloud, IdP, endpoint, SIEM, ticketing, HR) |
| Control linkage | Pattern name only | Explicit control ID + policy version |
| Auditor interface | None (files only) | Dashboard with time-series history |
| Bypass risk | High (git push outside Keel) | Low (centralized cloud/IdP logs) |
| Freshness model | Append-only (no re-check) | Continuous re-validation |

### Bridging the Gap

To evolve Keel toward continuous compliance:

1. **Evidence Collection Expansion**
   - Add GitHub Actions workflow to collect evidence from PRs (code review, approvals)
   - Add git hooks to block `git push` without compliance checks
   - Add post-deployment collection (confirm code actually deployed)

2. **Control Mapping**
   - Map every piece of evidence to a named control ID + policy version
   - incidents.jsonl: add `control_id`, `policy_name`, `policy_version` fields
   - checkRegistry: each check should output which control(s) it validates

3. **Enterprise Integration**
   - Cloud: query AWS/Azure/GCP logs for access, encryption, configuration
   - IdP: sync from Okta/AD for active users, access changes, MFA status
   - Endpoint: collect from endpoint agent (Jamf, Intune) for encryption, firewall status
   - HR: sync from Workday/BambooHR for onboarding/offboarding timelines

4. **Auditor Consumability**
   - Export evidence as a compliance report: "Control X satisfied by evidence Y on date Z"
   - Query interface: "show me all CJIS evidence from 2026-07-01 to 2026-08-07"
   - Include story ID, developer, code reviewed by, approval chain

5. **Evidence Freshness**
   - Add concept of "stale evidence" (e.g., CJIS pattern config change invalidates old gate runs)
   - Re-scan old code against new patterns
   - Enforce evidence re-validation on cadence (e.g., monthly)

---

## Recommendation

**Keel is excellent for enforcing compliance during development.** But relying on Keel alone for compliance evidence is risky because:

1. Gaps outside pipeline are uncovered (git push, GitHub web, CI/CD, production)
2. Auditors cannot reconstruct control satisfaction from Keel data alone
3. No continuous assurance—evidence collected once, never re-checked
4. Enterprise systems (cloud, IdP, HR) are entirely absent

**For genuine continuous compliance:**
- Use Keel as the **development layer** (enforce gates, pattern detection, approval workflows)
- Pair with a **continuous compliance platform** (Vanta/Drata/Lacework) for **enterprise coverage** (cloud, IdP, endpoint, HR, SIEM)
- Implement **evidence mapping** so auditors can cross-reference Keel findings to compliance controls
- Add **out-of-band evidence** (GitHub, CI/CD, production) to fill pipeline gaps

---

## Evidence Locations (for auditors)

| Artifact | Path | Scope | Coverage |
|----------|------|-------|----------|
| CJIS incidents | `~/.keel/security/incidents.jsonl` | Global | Pattern matches during development |
| Story audit log | `.keel/state/<story>/audit-log.jsonl` | Per-story | Phases 1-10 progress |
| Findings & approvals | `.keel/state/<story>/*.json` (phase files) | Per-phase | Findings detected + CRIT/HIGH state transitions |
| Governance registry | `config/cjis-data-element-registry.json` | Global | CJIS pattern definitions + sources |
| Policy guardrails | `.keel/GUARDRAILS.md` (G-1..G-18) | Global | Enforcement rules, not evidence |

**Auditor Note:** These artifacts show what Keel enforced. They do NOT show what happened outside Keel (git push, PR review, production deployment).

