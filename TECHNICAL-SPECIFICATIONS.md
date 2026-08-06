# Keel AI-SDLC Framework v3.19.0 - Technical Specifications

**Document Version:** 2.0  
**Last Updated:** 2026-08-03  
**Status:** PRODUCTION  
**Author:** Amar Singh  
**Audience:** Development Team, Future Maintainers, Contributors  

---

##  Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Component Specifications](#component-specifications)
4. [Technical Stack](#technical-stack)
5. [Data Flow](#data-flow)
6. [Quality Standards](#quality-standards)
7. [Deployment Architecture](#deployment-architecture)
8. [Security Specifications](#security-specifications)
9. [Performance Requirements](#performance-requirements)
10. [Compliance Standards](#compliance-standards)

---

## System Overview

### Purpose
Keel AI-SDLC Framework is an enterprise-grade, AI-powered software development lifecycle automation platform. It orchestrates 15 autonomous agents across 10 development phases to deliver production-ready features in 2-4 hours vs. 2 weeks (target — see docs/audit/).

### Key Metrics
- **Code Coverage Target:** >=80% (measured: 95% — see docs/audit/2026-07-09-e2e-pipeline-live-test.md)
- **Vulnerability Target:** 0 (Current: 0)
- **Test Pass Rate:** 100%
- **Development Speed:** 99.4% faster than traditional (target — see docs/audit/)
- **Enterprise Compliance:** 6 standards (CJIS, SOC2, HIPAA, GDPR, PCI-DSS, SOX)

### Core Capabilities
1. Autonomous agent orchestration across 10 phases
2. Test-driven development (TDD) automation
3. Security scanning and compliance checking
4. CakePHP 4.4/PHP 8.1 stack support (multi-stack planned for future release)
5. Multiple deployment strategies (canary, blue-green, instant)
6. Complete audit trail and state management

---

## Architecture

### High-Level Design

```
+--------------------------------------------------------+
|                    User/CLI Interface                   |
|         (Claude Code, npm, Docker, GitHub Action)      |
+----------------------+---------------------------------+
                       |
+----------------------v---------------------------------+
|              Keel Orchestrator Agent                    |
|         (Routes work, enforces gates, manages flow)     |
+----------------------+---------------------------------+
                       |
    +------------------+------------------+
    |                  |                  |
+---v----+      +------v------+    +----v-----+
| Phase  |      |   Phase     |    |  Phase   |
| Agents |      |   Agents    |    |  Agents  |
| (10)   |      |   (10)      |    |  (10)    |
+--------+      +-------------+    +----------+
    |                  |                  |
    +------------------+------------------+
                       |
    +------------------+------------------+
    |                  |                  |
+---v----+      +------v------+    +----v-----+
| Support|      |  Compliance |    |   MCP    |
|Agents  |      |   Agents    |    | Servers  |
| (2)    |      |   (3)       |    |   (4)    |
+--------+      +-------------+    +----------+
    |                  |                  |
    +------------------+------------------+
                       |
+----------------------v---------------------------------+
|        Output: Production-Ready Code & Artifacts       |
|    (Tested, Documented, Secure, Ready to Deploy)       |
+--------------------------------------------------------+
```

### System Layers

**Layer 1: Interface Layer**
- Claude Code plugin
- npm CLI package
- Docker container
- GitHub Action

**Layer 2: Orchestration Layer**
- Keel Orchestrator (routes work, enforces gates)
- Handshake Agent (validates phase transitions)
- State Management Agent (maintains global state)

**Layer 3: Execution Layer**
- 10 Phase Agents (Intake -> Requirements -> UI Design -> Architecture -> Code+Tests -> QA -> E2E -> Security -> Docs -> Release)
- 1 Support Agent (Scrum Master -- human-invoked only)
- 3 Infrastructure Agents (Audit, State Management, Handshake)

**Layer 4: Integration Layer**
- 4 MCP Servers (Jira, GitHub, Slack, Playwright)
- Output generation
- Artifact management

---

## Component Specifications

### 1. Orchestrator Agent
**Purpose:** Route all work, enforce quality gates, manage phase transitions

**Inputs:**
- User request or story details
- Current project state
- Phase completion criteria

**Outputs:**
- Routed work to appropriate phase agent
- Phase completion validation
- Blocked/approved transitions

**Quality Gates:**
- All prior phases must pass
- Quality metrics must be met
- Compliance checks must pass

---

### 2. Phase Agents (10 Total)

#### Phase 1: Product Owner Agent
- Story intake from Jira or human proposal
- Acceptance criteria definition
- Scope boundary

#### Phase 2: Business Analyst Agent
- Functional spec elaboration
- Data flows and domain rules
- Edge cases and error paths

#### Phase 3: UI Designer Agent (v3.19.0)
- Scans existing UI patterns in the project
- Produces Markdown design spec + self-contained HTML mockup
- No-UI determination for non-visual stories

#### Phase 4: Solution Architect Agent
- Architecture and design patterns
- API contracts and DB schema
- Technical risk assessment (ADRs)

#### Phase 5: Software Engineer Agent
- Production code + unit tests in one phase
- Coverage >= 80% on changed lines gated before QA
- PSR-12 / ESLint compliance, CodeGraph impact-scoped implementation

#### Phase 6: QA Engineer Agent (v3.19.0)
- Maps every AC to a passing test
- Runs integration tests against live endpoints
- Full suite gate (once per story)

#### Phase 7: E2E Engineer Agent
- Playwright browser E2E tests for every user-facing flow
- Screenshot evidence captured
- Blocks release on any E2E failure

#### Phase 8: Security Engineer Agent
- OWASP Top 10 scanning
- Consumes prescan.json (static-first)
- Blocks release on any HIGH finding

#### Phase 9: Technical Writer Agent
- README and CHANGELOG updates
- API docs, runbooks, and onboarding guides
- Memory writeback to conventions.md

#### Phase 10: Release Manager Agent
- Go/no-go decision
- G-6 version stamp across all 11 locations
- Deployment readiness and release documentation

---

### 3. Support Agents (1 Total)

#### Scrum Master Agent
- Sprint planning
- Velocity tracking
- Impediment removal
- Ceremony coordination
- Human-invoked only -- never part of the delivery pipeline

---

### 4. Compliance Agents (3 Total)

#### Audit Trail Agent
- Immutable logging
- Change tracking
- Forensic investigation
- Compliance reporting

#### State Management Agent
- Global state maintenance
- Snapshot/restore capability
- Conflict detection
- Time-travel debugging

#### Handshake Agent
- Phase transition validation
- Context passing
- Memory continuity
- Audit trail recording

---

## Technical Stack

### Runtime
- **Node.js:** >=18.0.0 required (Playwright E2E requires 18; state engine alone runs on 16+, but the full pipeline requires 18)
- **npm:** >=7.0.0
- **Language:** JavaScript (ES2020+)

### Framework & Libraries
- **Commander.js:** CLI argument parsing
- **Chalk:** Terminal colors
- **Ora:** Loading spinners
- **Inquirer.js:** Interactive prompts
- **Axios:** HTTP client
- **YAML:** Configuration parsing
- **fs-extra:** File operations

### Testing
- **Jest:** Unit & integration tests
- **PHPUnit:** Backend test execution (PHP projects)
- **Playwright:** E2E testing

### CI/CD
- **GitHub Actions:** Workflow automation
- **npm Scripts:** Build/test/publish tasks

### Code Quality
- **ESLint:** Code linting
- **Prettier:** Code formatting
- **SonarQube:** Quality scanning
- **PHPStan:** Static analysis (PHP)

---

## Data Flow

### Complete User Request Flow

```
User Input (CLI/API)
        v
CLI Argument Parsing
        v
Validate Input Parameters
        v
Load Project Configuration
        v
Initialize Agent Context
        v
Route to Orchestrator Agent
        v
[Phase Loop]
+- Pre-Phase Validation
+- Handshake Agent validates phase readiness
+- Execute Phase Agent
+- Post-Phase Validation
+- Update State
+- Record Audit Trail
+- Move to Next Phase
        v
Final Validation (Release Manager)
        v
Generate Artifacts
        v
Output Results
        v
Record in Audit Trail
```

### Agent Context Structure

```json
{
  "project": {
    "id": "string",
    "name": "string",
    "stack": "cakephp",
    "path": "string"
  },
  "story": {
    "id": "string",
    "title": "string",
    "description": "string",
    "acceptance_criteria": []
  },
  "state": {
    "current_phase": "number",
    "phase_results": {},
    "global_state": {},
    "timestamp": "ISO8601"
  },
  "compliance": {
    "audit_trail": [],
    "snapshots": [],
    "certifications": []
  }
}
```

---

## Quality Standards

### Code Quality Gates
- **Coverage:** >=80% (Current: 95%)
- **Complexity:** Cyclomatic complexity <=10 per function
- **Linting:** ESLint passes with zero errors
- **Formatting:** Prettier compliance

### Test Requirements
- **Unit Tests:** >=80% of functions
- **Integration Tests:** All major workflows
- **E2E Tests:** All user-facing features
- **Pass Rate:** 100%

### Security Standards
- **Dependency Audit:** Zero high/critical vulnerabilities
- **OWASP:** 6/6 Top 10 checks passing
- **Secrets Management:** No hardcoded credentials
- **Encryption:** AES-256 for sensitive data

### Performance Benchmarks
- **Phase Execution:** <2 seconds per phase
- **Test Execution:** <5 seconds total
- **File I/O:** <1 second for project scaffolding
- **Agent Startup:** <500ms

---

## Deployment Architecture

### Supported Deployment Channels

#### 1. Claude Code Plugin
- Direct installation via marketplace
- Command: `/plugin add marketplace keel`
- Version: v3.19.0
- Status: LIVE

#### 2. npm Package
- Package: `@amarsingh/keel`
- Registry: npmjs.org
- Installation: `npm install -g @amarsingh/keel@3.18.2`
- Status: coming soon — not yet published

#### 3. Docker Container
- Image: `amarsingh/keel:3.18.2`
- Registry: Docker Hub
- Pull: `docker pull amarsingh/keel:3.18.2`
- Status: coming soon — not yet published

#### 4. GitHub Action
- Name: `creativemyntra/keel`
- Version: `v3.19.0`
- Marketplace: LIVE (auto-discovering)
- Usage: `uses: creativemyntra/keel@v3.19.0`

---

## Security Specifications

### Authentication
- No built-in auth required (delegates to CLI user)
- Integrations use API tokens (Jira, GitHub, Slack)
- Tokens stored in environment variables
- No token storage in code

### Authorization
- Role-Based Access Control (RBAC) at integration level
- Each MCP server handles own permissions
- No privilege escalation within Keel

### Encryption
- **Data at Rest:** AES-256 (for cached credentials)
- **Data in Transit:** TLS 1.3+ (via HTTPS)
- **Secrets:** Never logged or displayed

### Compliance Scans
- **Dependency Audit:** npm audit before every release
- **SAST:** SonarQube scanning (code quality)
- **DAST:** N/A (CLI tool, no web endpoints)
- **Secrets Scanning:** git-secrets pre-commit hook

### Infrastructure Scripts (v3.19.0)

| Script | Purpose | Hook Stage(s) |
|--------|---------|---------------|
| `scripts/keel-state.cjs` | Deterministic state engine -- schema validation, gating, audit, snapshots | CLI / engine |
| `scripts/keel-dashboard.cjs` | Read-only pipeline status web dashboard (loopback-only) | CLI |
| `scripts/keel-classify-gate.cjs` | CJIS Data Classification Gate -- detects CJIS-adjacent patterns; blocks stories lacking required classification annotations | `UserPromptSubmit`, `PreToolUse`, `PostToolUse` |

Hook wiring: `hooks/hooks.json` registers `keel-classify-gate.cjs` on all three stages. The classify gate must be present in `hooks.json` for every story involving CJIS-adjacent data (see G-10 in `.keel/GUARDRAILS.md`). Pattern definitions live in `config/cjis-patterns.json`; Forseti-specific pattern formats are placeholders until real formats are provided from Forseti.

---

## Performance Requirements

### Execution Time
- **Feature Development:** <4 hours (measured: 54 min — see docs/audit/2026-07-09-e2e-pipeline-live-test.md)
- **Phase Execution:** <2 seconds average
- **Full Testing:** <5 seconds
- **Code Generation:** <3 seconds

### Resource Requirements
- **Disk:** <500MB installation + project files
- **RAM:** <256MB typical, <512MB peak
- **CPU:** Single core sufficient

### Scalability
- **Concurrent Agents:** Up to 10 (one per phase)
- **Project Size:** No limit (tested on 50K+ LOC)
- **Output Size:** No limit (streaming writes)

---

## VCS Provider-Agnostic Approval Gate (T19)

### Overview
Keel's design approval gate (C-0007 / T6) now supports multiple Version Control Systems
through a provider-agnostic abstraction layer. Eliminates hardcoded GitHub references;
supports GitHub (Cloud / Enterprise), Bitbucket (Cloud / Server/Data Center), GitLab (future).

### Configuration
**File:** `.keel/vcs.yml` (auto-detected from git remote, never committed)
**Populated by:** `keel setup-vcs [--confirm]` (proposal-based, human approval required)

```yaml
provider: github | bitbucket | github-enterprise | bitbucket-server
owner: <org/workspace/username>
repo: <repo_slug>
base_url: "" | https://self-hosted.example.com  # for self-hosted only
token_file: ~/.keel/secrets/<provider>.token   # gitignored
```

### Providers Supported

**GitHub Cloud/Enterprise:**
- Queries GitHub REST API for PR reviews
- Requires: GitHub personal access token (repo + pull_request scopes)

**Bitbucket Cloud:**
- Queries Bitbucket v2.0 REST API for PR reviewers
- Requires: Bitbucket app password or PAT with repository read scope

**Bitbucket Server/Data Center:**
- Queries Bitbucket v1.0 REST API (self-hosted)
- Requires: Bitbucket PAT with repository read scope
- Configurable base_url for internal instances

### Approval Logic (C-0007)
1. Load .keel/vcs.yml (fail-closed if missing)
2. Query configured provider for PR approvals
3. Require ≥1 approval from configured repository
4. Hash phase output to detect post-approval changes
5. Record: PR#, approval count, provider, content hash, timestamp

### Fail-Closed Design
- ✅ No hardcoded VCS targets (all from config)
- ✅ Configuration required at setup (never auto-accepted)
- ✅ Missing .keel/vcs.yml → HALT with diagnostic
- ✅ Malformed config → HALT with diagnostic
- ✅ API failures → explicit error, no silent fallback
- ✅ Token stored in ~/.keel/secrets/ (gitignored, never committed)

### Setup Workflow
```bash
# 1. Initialize (auto-detects from git remote, displays proposal)
keel setup-vcs

# 2. Review proposal, then confirm
keel setup-vcs --confirm --provider github --owner acme --repo my-app

# 3. Provision auth token (stored locally, gitignored)
echo "YOUR_GITHUB_TOKEN" > ~/.keel/secrets/github.token
chmod 600 ~/.keel/secrets/github.token

# 4. Test approval gate
keel approve-phase STORY-123 3 --via-pr 456
```

### Documentation
- **Init/Config:** scripts/lib/vcs-providers.cjs (provider detection + loading)
- **Approval Command:** keel-state.cjs cmdApprovePhase (uses vcs.yml exclusively)
- **Setup Command:** keel-state.cjs cmdSetupVcs (auto-detect + proposal-based)

---

## Compliance Standards

### Evidence Generation Toward Standards (Does Not Confer Certification)

The Keel audit trail generates evidence that supports a compliance evaluation
process. **It does not confer certification** under any of the standards below.
For certification, engage a qualified assessor with this audit trail as supporting
documentation. Keel is an evidence-generation tool, not a certification authority.

| Standard | Relevant Evidence Generated |
|----------|----------------------------|
| CJIS | Append-only audit log (`.keel/state/*/audit-log.jsonl`); CJIS data classification gate (`keel-classify-gate.cjs`); incident log (`~/.keel/security/incidents.jsonl`) |
| SOC2 | Change audit trail; gate enforcement log; security officer webhook (optional) |
| HIPAA | Data classification scanning; access logging; no PII in model context enforced by gate |
| GDPR | Data minimization: only content hashes logged, never raw PII; classification gate blocks transmission |
| PCI-DSS | Dependency vulnerability scanning (Snyk SCA); OWASP Top 10 scan (phase 8 security-engineer) |
| SOX | Append-only, tamper-evident audit trail; phase gate enforcement; deployment audit in release-manager |

---

## Version History

| Version | Release Date | Status | Notes |
|---------|-------------|--------|-------|
| 3.18.2 | 2026-08-03 | PRODUCTION | Audit release: Part A (21 findings — security, tests, docs, commands) + Part B (10 findings — action.yml injection/auth/output, schema decisions required, engines Node >=18, npm docs packaging, CHANGELOG dead link) |
| 3.16.8 | 2026-08-03 | PRODUCTION | Framework hardening: CJIS project-independence (universal NCIC_ID/LEID), OWASP LLM01 injection guard, KEEL-R14 zombie-state prevention, defect lessons writeback; keel:implement alias; ui-designer upgrade (Branding Intake + Design System Generator, DFII scoring, dashboard expertise) |
| 3.16.7 | 2026-07-27 | PRODUCTION | Forensic engine audit: 14 security + correctness fixes (3 CRIT path-traversal + log-divergence, 4 HIGH SSRF + gate-budget, 4 MED artifact-validation + lock-timeout, 3 LOW CJIS + deprecation) |
| 3.16.6 | 2026-07-27 | PRODUCTION | G-15 Karpathy Protocol; token-economy observability (confirm_before_spawn, token_summary); prompt-cache breakpoints (3 canonical BPs, ~90% savings on prefix); /keel:tokens command; economy wizard in init + setup |
| 3.16.5 | 2026-07-23 | PRODUCTION | keel:start-work + keel:finish-work MCP skills; advisory ticket traceability (G-12 warns, never blocks); G-13 next-step reminder after push; BRANCH-PROTECTION.md rewrite |
| 3.16.4 | 2026-07-23 | PRODUCTION | BOM fix: stripped UTF-8 BOM from .claude-plugin/marketplace.json; expanded G-6 version-stamp guardrail in release-manager to cover all 9 version-bearing files |
| 3.16.3 | 2026-07-22 | PRODUCTION | CakePHP-only packaging; CJIS gate deadlock fix; package.json files array fix (config/ + stack-profiles/); /keel:preview command; explicit model tiers in orchestrator; G-10 guardrail hardening; memory resilience in keel-init; token optimization roadmap |
| 3.16.2 | 2026-07-21 | PRODUCTION | Brainstorm template: restored Handoff Brief section (user story, rough ACs, data entities, integrations, design risks, complexity estimate); OSS cleanup (removed stale internal ticket refs from template and example) |
| 3.16.1 | 2026-07-21 | PRODUCTION | Prescan hardening: snyk skips on dirs with no supported project manifest; composer-audit test PATH isolation for host-agnostic CI |
| 3.16.0 | 2026-07-20 | PRODUCTION | CJIS Data Classification Gate: `scripts/keel-classify-gate.cjs` + `config/cjis-patterns.json`; `hooks/hooks.json` wired (UserPromptSubmit, PreToolUse, PostToolUse); `keel-state.cjs security-status` command; security-engineer, orchestrator, audit-agent, handshake-agent specs updated |
| 3.15.0 | 2026-07-17 | PRODUCTION | Pipeline restructure: 10 phases -- tdd-red/tdd-green merged into software-engineer (code+tests+coverage >= 80%); qa-engineer->6, e2e-engineer->7, security-engineer->8, technical-writer->9, release-manager->10; DEFAULT_MAX_GATES 48->40; backward-compat LEGACY_AGENTS for in-flight stories |
| 3.14.3 | 2026-07-17 | PRODUCTION | Guardrail hardening: G-8 agent identity integrity (schema mismatch = HALT, no relabeling); G-9 no unverified baselines in intake; release-manager framework-debt gate added |
| 3.14.1 | 2026-07-17 | PRODUCTION | Dashboard Host-header allowlist -- DNS-rebinding hardening (KEEL-105, closes KEEL-104 LOW-1): guard-first 403/400 contract, 238/238 tests green, 0 HIGH security findings |
| 3.14.0 | 2026-07-15 | PRODUCTION | Pipeline status web dashboard (KEEL-104): `keel dashboard --port=<N>`, read-only, loopback-only |
| 3.13.0 | 2026-07-14 | PRODUCTION | Describe command: human-readable story inspection (KEEL-103) |
| 3.12.0 | 2026-07-09 | PRODUCTION | Install-to-pipeline e2e (KEEL-102), status --all, gate auto-audit, Windows packaging fixes |
| 3.11.0 | 2026-07-09 | PRODUCTION | Smart economy: .keel/economy.yml owner choices, prescan static-first security, CodeGraph context budget, output caps |
| 3.10.0 | 2026-07-09 | PRODUCTION | Token economy: tiered gate verification, gate-1-lite, haiku model-tiering, docs/WORKFLOW.md cost model |
| 3.9.1 | 2026-07-09 | PRODUCTION | First full pipeline live test (KEEL-101): scope-aware gate advance, coverage-metric applicability, halt-message path fix |
| 3.9.0 | 2026-07-09 | PRODUCTION | Write-tool + engine-path blockers fixed (pipeline runnable end-to-end), defect express lane, Node-only init, coverage waiver |
| 3.8.0 | 2026-07-09 | PRODUCTION | Jira-entry pipeline (/keel:from-jira), PO/scrum-master removed from automated pipeline (human roles) |
| 3.7.0 | 2026-07-09 | PRODUCTION | OS-enforced state locking + atomic writes, pipeline budgets, automated revert-check, identical-retry detection, engine test suite |
| 3.6.0 | 2026-07-09 | PRODUCTION | Layered SAST/SCA scanner stack (PHPStan/SonarQube + composer audit/Snyk), scanner-inventory gate, setup wizard steps |
| 3.5.0 | 2026-07-09 | PRODUCTION | Halt escalation + resume, memory writeback (lessons.md), proactive watchers, /keel:health |
| 3.4.0 | 2026-07-09 | PRODUCTION | Deterministic state engine (keel-state.cjs), execution-verified handshake gates, single pipeline entry point |
| 3.3.1 | 2026-07-08 | PRODUCTION | Setup wizard hardened from live end-to-end test |
| 3.3.0 | 2026-07-08 | PRODUCTION | /keel:setup wizard, bundled Playwright MCP server |
| 3.2.0 | 2026-07-08 | PRODUCTION | CodeGraph, AC threading, bounded retries, grounding checks, cross-story memory |
| 3.1.0 | 2026-07-08 | PRODUCTION | Clean master branch, dev documentation segregated |
| 3.0.1 | 2026-07-08 | PRODUCTION | Marketplace finalization |
| 3.0.0 | 2026-07-07 | PRODUCTION | Initial major release |

---

## Maintenance & Support

### Bug Reporting
- Use GitHub Issues: https://github.com/creativemyntra/keel/issues
- Include reproduction steps
- Attach logs and environment info

### Feature Requests
- Use GitHub Discussions: https://github.com/creativemyntra/keel/discussions
- Describe use case and expected behavior

### Security Issues
- Email: support@creativemyntra.com
- Do NOT open public issues for security vulnerabilities

---

## References

- **Repository:** https://github.com/creativemyntra/keel
- **Documentation:** [QUICK-START-CLAUDE-CODE.md](QUICK-START-CLAUDE-CODE.md)
- **Complete Agent Guide:** [ALL-AGENTS-COMPLETE-GUIDE.md](ALL-AGENTS-COMPLETE-GUIDE.md)
- **Release Notes:** [CHANGELOG.md](CHANGELOG.md)

---

**Document Version:** 2.0  
**Last Updated:** 2026-08-03  
**Status:** PRODUCTION  
**Next Review:** 2026-10-20 (quarterly)