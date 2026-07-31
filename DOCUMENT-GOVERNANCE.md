# KEEL Document Governance & Folder Structure

**Effective Date:** 2026-07-31  
**Status:** ENFORCED (all new documents must follow this policy)

---

## 1. FOLDER STRUCTURE RULES

All documentation in the KEEL repository MUST follow this folder hierarchy. End users see `.md` files only in their assigned folders.

### Root-Level Files (Exceptions: README.md, CHANGELOG.md, package.json only)

| File | Purpose | Owner |
|------|---------|-------|
| README.md | Quick start + project overview | release-manager |
| CHANGELOG.md | Version history + release notes | release-manager |
| GUARDRAILS.md | Framework binding rules (G-1 through G-15) | orchestrator docs |
| package.json | npm config | DevOps |

**All other .md files must be in their assigned folder (see below).**

---

## 2. FOLDER ASSIGNMENTS

### `/audit/` — Audit & Forensics Documents

**Purpose:** Security audits, code reviews, forensic analysis, compliance checks

**Ownership:** security-engineer, audit-agent, code-reviewer

**Document Types:**
- `FRAMEWORK-AUDIT-<DATE>.md` — Authenticity + completeness audit (e.g., KEEL-AUDIT-2026-07-31.md)
- `RECON-<DATE>.md` — Technical reconnaissance (code structure, file inventory)
- `SECURITY-AUDIT-<DATE>.md` — OWASP + threat model review
- `THREAT-MODEL.md` — Asset + threat + control mapping
- `OWASP-REVIEW.md` — OWASP Top 10 assessment
- `CODE-REVIEW-*.md` — Pull request code reviews
- `*-FORENSICS.md` — Incident post-mortems, defect RCAs

**Naming Convention:** `<TYPE>-<TOPIC>-<DATE>.md` or `<TYPE>-<TOPIC>.md`

**Examples:**
- `audit/KEEL-AUDIT-2026-07-31.md`
- `audit/KEEL-RECON-2026-07-31.md`
- `audit/THREAT-MODEL.md`
- `audit/OWASP-REVIEW.md`

---

### `/docs/` — User-Facing & Internal Documentation

**Purpose:** Architecture, design specs, user guides, runbooks, requirements, planning

**Subdirectories:**

#### `/docs/requirements/` — SRS, Specifications, Acceptance Criteria

**Ownership:** product-owner, business-analyst

**Document Types:**
- `SRS-*.md` — Software Requirements Specification
- `SPEC-*.md` — Feature specification
- `REQUIREMENTS-*.md` — Detailed requirements

**Examples:**
- `docs/requirements/SRS-KEEL-ORCHESTRATOR.md`
- `docs/requirements/SPEC-E2E-TESTING.md`

#### `/docs/design/` — Architecture, Design Decisions, Patterns

**Ownership:** solution-architect, ui-designer

**Document Types:**
- `ADR-*.md` — Architecture Decision Records
- `DESIGN-*.md` — System design documents
- `API-*.md` — API contracts
- `SCHEMA-*.md` — Database schema docs

**Examples:**
- `docs/design/ADR-001-FILE-BASED-STATE.md`
- `docs/design/DESIGN-ORCHESTRATOR.md`
- `docs/design/API-GATE-PROTOCOL.md`

#### `/docs/brainstorms/` — Ideation, Exploration, Problem-Solving

**Ownership:** product-owner, orchestrator

**Document Types:**
- `BRAINSTORM-*.md` — Feature ideation
- `ANALYSIS-*.md` — Problem analysis
- `EXPLORATION-*.md` — Technology exploration

**Examples:**
- `docs/brainstorms/BRAINSTORM-TOKEN-TRACKING.md`
- `docs/brainstorms/EXPLORATION-WORKTREE-ISOLATION.md`

#### `/docs/reports/` — Status, Progress, Summaries

**Ownership:** release-manager, scrum-master

**Document Types:**
- `STATUS-*.md` — Weekly/sprint status reports
- `SUMMARY-*.md` — Delivery summaries
- `METRICS-*.md` — Project metrics

**Examples:**
- `docs/reports/STATUS-WEEK-2026-07-31.md`
- `docs/reports/METRICS-PIPELINE-VELOCITY.md`

#### `/docs/plans/` — Project Plans, Roadmaps, Timelines

**Ownership:** product-owner, release-manager

**Document Types:**
- `PLAN-*.md` — Project plans
- `ROADMAP-*.md` — Feature roadmap
- `TIMELINE-*.md` — Release schedule

**Examples:**
- `docs/plans/PLAN-KEEL-RELEASE-V3.17.md`
- `docs/plans/ROADMAP-2026-H2.md`

#### `/docs/security/` — Security Policies, Compliance, Risk

**Ownership:** security-engineer

**Document Types:**
- `POLICY-*.md` — Security policies
- `COMPLIANCE-*.md` — Regulatory compliance docs
- `RISK-*.md` — Risk assessments

**Examples:**
- `docs/security/POLICY-CJIS-COMPLIANCE.md`
- `docs/security/COMPLIANCE-SOC2.md`

---

### `/tests/docs/` — Test Plans, Test Cases, Test Strategy

**Purpose:** QA documentation, test strategies, test coverage reports

**Ownership:** qa-engineer, e2e-engineer

**Document Types:**
- `TEST-PLAN-*.md` — Comprehensive test plans
- `TEST-CASES-*.md` — Detailed test cases
- `TEST-STRATEGY-*.md` — Testing approach + strategy
- `COVERAGE-*.md` — Test coverage analysis

**Subdirectories:**
- `/tests/docs/unit/` — Unit test documentation
- `/tests/docs/integration/` — Integration test documentation
- `/tests/docs/e2e/` — End-to-end test documentation

**Examples:**
- `tests/docs/TEST-PLAN-ORCHESTRATOR.md`
- `tests/docs/e2e/TEST-CASES-10-PHASE-PIPELINE.md`
- `tests/docs/COVERAGE-REPORT-2026-07-31.md`

---

### `/docs/demo/` — Demonstrations, Walkthroughs, Examples

**Purpose:** How-to guides, tutorials, working examples

**Ownership:** technical-writer, orchestrator

**Document Types:**
- `DEMO-*.md` — Feature demonstration walkthrough
- `TUTORIAL-*.md` — Step-by-step tutorials
- `EXAMPLE-*.md` — Code/workflow examples

**Examples:**
- `docs/demo/DEMO-FULL-10-PHASE-PIPELINE.md`
- `docs/demo/TUTORIAL-START-NEW-STORY.md`

---

### `/docs/superpowers/` — Skill Documentation (Claude Code Skills)

**Purpose:** Documentation of keel:* skills and agent capabilities

**Ownership:** technical-writer, orchestrator

**Document Types:**
- `SKILL-*.md` — Individual skill documentation
- `SKILLS-INVENTORY.md` — Complete skill roster

**Examples:**
- `docs/superpowers/SKILL-ORCHESTRATOR.md`
- `docs/superpowers/SKILLS-INVENTORY.md`

---

### `/docs/releases/` — Release Notes, Deployment Guides, Changelogs

**Purpose:** Release management, deployment instructions, upgrade guides

**Ownership:** release-manager, DevOps

**Document Types:**
- `RELEASE-NOTES-*.md` — Release notes (version-specific)
- `DEPLOY-*.md` — Deployment instructions
- `UPGRADE-*.md` — Upgrade guides
- `HOTFIX-*.md` — Hotfix procedures

**Examples:**
- `docs/releases/RELEASE-NOTES-3.17.0.md`
- `docs/releases/DEPLOY-STAGING.md`

---

### `/docs/qa/` — QA Process, Bug Reports, Test Results

**Purpose:** Quality assurance processes, bug tracking, test results

**Ownership:** qa-engineer, technical-writer

**Document Types:**
- `QA-PROCESS.md` — QA workflow + process
- `BUG-*.md` — Bug report template
- `TEST-RESULTS-*.md` — Test execution results

**Examples:**
- `docs/qa/QA-PROCESS.md`
- `docs/qa/TEST-RESULTS-2026-07-31.md`

---

### `/docs/defects/` — Defect RCAs, Incident Analysis [GITIGNORED]

**Purpose:** Root cause analysis for bugs + incidents (not committed to repo)

**Ownership:** security-engineer (P0/P1), qa-engineer (others)

**Document Types:**
- `<JIRA-TICKET>-RCA.md` — Root cause analysis

**Examples:**
- `docs/defects/KEEL-123-RCA.md` (gitignored, uploaded to Confluence)

---

## 3. ENFORCEMENT RULES

### Rule 1: No Root-Level .md Files (Except Exceptions)

**Violation:** Any .md file at repository root not in the exceptions list.

**Consequence:** PR review rejects the file; author must move it to proper folder.

**Exceptions (Pre-Approved):**
- README.md
- CHANGELOG.md
- GUARDRAILS.md

---

### Rule 2: Document Naming Convention

**Format:** `<TYPE>-<TOPIC>-[DATE].md` or `<TYPE>-<TOPIC>.md`

**Valid Types per Folder:**

| Folder | Valid Types |
|--------|------------|
| `/audit/` | AUDIT, RECON, SECURITY, THREAT-MODEL, OWASP, CODE-REVIEW, FORENSICS |
| `/docs/requirements/` | SRS, SPEC, REQUIREMENTS |
| `/docs/design/` | ADR, DESIGN, API, SCHEMA |
| `/docs/brainstorms/` | BRAINSTORM, ANALYSIS, EXPLORATION |
| `/docs/reports/` | STATUS, SUMMARY, METRICS |
| `/docs/plans/` | PLAN, ROADMAP, TIMELINE |
| `/docs/security/` | POLICY, COMPLIANCE, RISK |
| `/tests/docs/` | TEST-PLAN, TEST-CASES, TEST-STRATEGY, COVERAGE |
| `/docs/demo/` | DEMO, TUTORIAL, EXAMPLE |
| `/docs/superpowers/` | SKILL, SKILLS-INVENTORY |
| `/docs/releases/` | RELEASE-NOTES, DEPLOY, UPGRADE, HOTFIX |
| `/docs/qa/` | QA-PROCESS, BUG, TEST-RESULTS |

**Examples of Valid Names:**
- ✓ `audit/KEEL-AUDIT-2026-07-31.md`
- ✓ `docs/design/ADR-001-FILE-BASED-STATE.md`
- ✓ `docs/brainstorms/BRAINSTORM-TOKEN-TRACKING.md`
- ✓ `tests/docs/TEST-PLAN-ORCHESTRATOR.md`

**Examples of Invalid Names:**
- ✗ `KEEL-AUDIT-2026-07-31.md` (must be in audit/)
- ✗ `audit/SRS-ORCHESTRATOR.md` (SRS belongs in docs/requirements/)
- ✗ `docs/BRAINSTORM-TOKEN.md` (must be in docs/brainstorms/)

---

### Rule 3: Date Stamps for Time-Series Documents

**Requirement:** Audit, status, test result, and metrics documents MUST include date stamps.

**Format:** `<TYPE>-<TOPIC>-<DATE>.md` where DATE is YYYY-MM-DD or YYYY-MM-DD_HH-MM-SS

**Examples:**
- ✓ `audit/KEEL-AUDIT-2026-07-31.md`
- ✓ `docs/reports/STATUS-WEEK-2026-07-31.md`
- ✓ `tests/docs/COVERAGE-REPORT-2026-07-31.md`

---

### Rule 4: Ownership & Approval

**Owner Assignment:**
- Every folder has an assigned owner (see above)
- Document must be approved by folder owner before merge

**PR Review Checklist:**
- [ ] File in correct folder
- [ ] Naming follows convention
- [ ] Date stamped (if time-series)
- [ ] Approved by folder owner

---

## 4. MIGRATION PLAN (Existing Documents)

**Current Status:** Some .md files at root or in wrong folders.

**Migration:**
1. Audit all existing .md files
2. Move misplaced files to correct folders
3. Rename files to follow convention
4. Update all internal cross-references
5. Commit as single "refactor: reorganize documentation structure" commit

**Timeline:** Before next release (v3.17.0)

---

## 5. GITIGNORE RULES

**Permanent Gitignore:**
- `/docs/defects/*.md` — RCA documents (upload to Confluence instead)
- `/docs/analysis/` — Scratch analysis (if used for temporary exploration)
- `.keel/security/incidents.jsonl` — CJIS incident log (security-sensitive)
- `.keel/secrets/` — All credential files

---

## 6. CROSS-LINKING & REFERENCES

**Rule:** Internal document references MUST use relative paths from repository root.

**Format:** `[Link Text](path/to/DOCUMENT.md)`

**Examples:**
- ✓ `See [Threat Model](audit/THREAT-MODEL.md) for details.`
- ✓ `Refer to [ADR-001](docs/design/ADR-001-FILE-BASED-STATE.md).`
- ✓ `Review [Test Plan](tests/docs/TEST-PLAN-ORCHESTRATOR.md).`

**CI Check:** Links script (future) verifies all referenced files exist.

---

## 7. IMPLEMENTATION CHECKLIST

- [ ] Move audit/KEEL-AUDIT-2026-07-31.md to `/audit/` ✓ (done)
- [ ] Move audit/KEEL-RECON-2026-07-31.md to `/audit/` ✓ (done)
- [ ] Create `/audit/THREAT-MODEL.md` (P2 fix)
- [ ] Create `/audit/OWASP-REVIEW.md` (P2 fix)
- [ ] Create `/docs/design/ADR-001-FILE-BASED-STATE.md` (existing, move if not there)
- [ ] Create `/tests/docs/TEST-PLAN-10-PHASE-PIPELINE.md` (new)
- [ ] Create `/docs/plans/PLAN-KEEL-AUDIT-FIXES-2026-07-31.md` (this work)
- [ ] Audit existing .md files + move misplaced ones
- [ ] Update TECHNICAL-SPECIFICATIONS.md with folder structure reference

---

**Document Governance enforced by:** Code review + naming conventions + folder structure  
**Last Updated:** 2026-07-31  
**Maintainer:** technical-writer
