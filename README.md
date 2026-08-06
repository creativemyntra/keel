# Keel AI-SDLC Framework v3.18.2

**Production-Ready AI-SDLC Plugin for Claude Code**

Automate your entire development lifecycle with 15 specialized AI agents across a 10-phase governed pipeline — from requirements intake to staged production deployment.

---

## What is Keel?

**Keel** is a complete AI-SDLC (Artificial Intelligence Software Development Lifecycle) framework integrated with Claude Code as a plugin. It automates the entire software development process using **15 specialized autonomous agents** with deterministic governance gates between every phase.

### The 10-Phase Pipeline

| Phase | Agent | Role |
|-------|-------|------|
| 1 | **product-owner** | Requirements intake — proposals only; the human confirms ACs, or `/keel:from-jira` transcribes the Jira ticket verbatim |
| 2 | **business-analyst** | Functional spec, data flows, edge cases, business rules, API contracts |
| 3 | **ui-designer** | UX analysis → design direction (DFII-scored) → design token file → HTML mockup for every user-facing AC |
| 4 | **solution-architect** | Architecture decision records, DB schema, API contracts, component diagram, technical risk |
| 5 | **software-engineer** | Production code + unit tests in one phase; coverage ≥ 80% on changed lines gated before QA |
| 6 | **qa-engineer** | AC-to-test mapping, integration tests, error-path validation |
| 7 | **e2e-engineer** | Playwright browser E2E tests for every user-facing flow; screenshot evidence |
| 8 | **security-engineer** | OWASP Top 10 review, threat model, layered SAST/SCA; 0 HIGH findings required |
| 9 | **technical-writer** | CHANGELOG update, README, runbook, API docs, memory writeback |
| 10 | **release-manager** | Go/no-go decision, version stamp, deployment plan |

**Defect express lane** — Bug/Defect tickets run phases 1 → 5 → 6 → 8 only (~4 spawns vs ~14 for features). Pass `--scope defect` or start from a Bug-type Jira ticket.

### Meta & Support Agents (2)

| Agent | Role |
|-------|------|
| **orchestrator** | Routes work, sequences phases, enforces gates, manages retries |
| **scrum-master** | Sprint ceremonies, velocity reporting (human-invoked only — never part of the automated pipeline) |

### Infrastructure Agents (3)

| Agent | Role |
|-------|------|
| **handshake-agent** | Adversarial phase gate — verifies claims by *executing* them (runs tests, checks coverage first-hand; never trusts agent self-reports) |
| **state-management-agent** | Operates the deterministic state engine (init, status, snapshots, restore) |
| **audit-agent** | Forensics and audit queries over the per-story append-only JSONL audit log |

Mechanical work — schema validation, gating, attempt counting, audit appends, snapshots — runs in a zero-dependency **state engine** (`scripts/keel-state.cjs`). Agents spend tokens on judgment only.

### Key Features

[x] **15 Specialized Agents** — 10 pipeline phase + 2 meta/support + 3 infrastructure  
[x] **10-Phase Pipeline** — UI design (3), code + unit tests (5), Playwright E2E (7); defect express lane runs 1→5→6→8  
[x] **Deterministic State Engine** — `keel-state.cjs` owns state, gates, retries, audit; zero tokens on clerk work  
[x] **File-Based Agent Memory** — phases share context via `.keel/state/`, committed to git  
[x] **Execution-Verified Gates** — handshake gate re-runs tests instead of trusting agent claims (anti-hallucination)  
[x] **Bounded Retry Loops** — 3 attempts per phase, then HALT + Slack escalation; resume requires a recorded human decision  
[x] **Cross-Story Memory with Writeback** — every defect RCA becomes a lesson in `.keel/memory/lessons.md` (gated, bounded)  
[x] **Proactive Watchers** — hooks warn on coverage drops and shrinking test counts; halted/stale stories surface at session start  
[x] **Pipeline Dashboard** — `keel dashboard` serves a read-only local web view of all stories (loopback-only, auto-refreshing)  
[x] **Append-Only Audit Trail** — per-story JSONL log supporting your compliance evidence process  
[x] **Coverage Gate** — ≥ 80% enforced before QA; configurable per-story  
[x] **No Patch Development** — defect fixes require RCA + revert-checked regression test; symptom patches fail the gate  
[x] **Security Phase** — OWASP Top 10 + SAST/SCA: PHPStan + composer audit always, SonarQube + Snyk when configured  
[x] **Stack: CakePHP 4.4 / PHP 8.1** — production-proven; multi-stack support planned  
[x] **Optional Integrations** — Jira (bundled Atlassian MCP), GitHub, Slack, Playwright  
[x] **Staged Deployment** — canary / blue-green rollout via the release gate  
[x] **CJIS Data Classification Gate** — automated prompt-injection guard + data-classification check on every tool call  

---

## Installation

### Method 1: Claude Code Plugin Marketplace (Recommended)

```bash
claude plugin marketplace add https://github.com/creativemyntra/keel
claude plugin install keel
```

The plugin registers `/keel:*` commands, 15 agents, and 9 skills. `~/.keel` configuration directories are created on first session.

**Verify:**
```bash
claude plugin list
# -> keel v3.18.2 [x]
```

**Quick start — run this immediately after install:**
```bash
/keel:init --mode=new --stack=cakephp
/keel:implement-feature story="FEAT-1" feature="Your feature"
# Orchestrator runs all 10 phases automatically.
```

### Method 2: npm Global Package (coming soon)

```bash
npm install -g @amarsingh/keel
```

**Use as command-line tool:**
```bash
keel init --mode=new --stack=cakephp
keel req --story=FEAT-1
keel deploy --story=FEAT-1
```

### Method 3: Docker Container (coming soon)

```bash
docker pull amarsingh/keel:latest
docker run -v $(pwd):/project amarsingh/keel:latest keel init --mode=new --stack=cakephp
```

### Method 4: GitHub Action (CI/CD)

```yaml
name: Keel Development Pipeline

on: [push, pull_request]

jobs:
  keel:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Initialize with Keel
        uses: creativemyntra/keel@v3.18.2
        with:
          phase: 'init'
          mode: 'new'
          stack: 'cakephp'

      - name: Create Requirements
        uses: creativemyntra/keel@v3.18.2
        with:
          phase: 'req'
          story-id: ${{ github.event.pull_request.number }}

      - name: Run Tests
        uses: creativemyntra/keel@v3.18.2
        with:
          phase: 'test'
          story-id: ${{ github.event.pull_request.number }}
          coverage-target: '85'

      - name: Security Scan
        uses: creativemyntra/keel@v3.18.2
        with:
          phase: 'sec'
          story-id: ${{ github.event.pull_request.number }}
```

---

## Complete Workflow

### Entry points

| Situation | Command |
|-----------|---------|
| Jira ticket exists | `/keel:from-jira FEAT-1` — ticket IS the requirements; BA transcribes ACs verbatim, never invents |
| New idea, no ticket | `/keel:req --story=FEAT-1 --feature="..."` — BA drafts ACs as a proposal; human PO confirms before anything runs |
| Full pipeline, one command | `/keel:implement-feature story="FEAT-1" feature="..."` — orchestrator sequences all 10 phases |
| Bug / defect | `/keel:from-jira BUG-42` or `--scope defect` — express lane: phases 1 → 5 → 6 → 8 |

### Full feature example: User Subscription Management

```bash
# ── Initialize ─────────────────────────────────────────────────────────────
/keel:init --mode=new --stack=cakephp
# Scaffolds .keel/memory/, builds CodeGraph, seeds economy.yml

# ── One-command option (recommended) ───────────────────────────────────────
/keel:implement-feature story="FEAT-1" feature="User subscription management"
# Orchestrator runs all 10 phases with governance gates between each.

# ── Or step through phases individually ────────────────────────────────────

# Phase 1 — Product Owner
/keel:from-jira FEAT-1          # Start from Jira (ticket IS the requirements)
# -- or for a new idea:
/keel:req --story=FEAT-1 --feature="User subscription management"
# Human confirms ACs before phase 2 starts.

# Phase 2 — Business Analyst (runs inside /keel:req)
# Produces: docs/requirements/FEAT-1-requirements.md
# Includes: functional spec, data flows, edge cases, business rules, API contracts

# Phase 3 — UI Designer
/keel:design --story=FEAT-1
# Step -1: asks for reference designs, brand assets, mood words
# Step 0: scans existing tokens, Tailwind config, UI components
# Step 2f: Design System Plan — layout pattern, color palette (hex), typography, CSS effects
# Produces: docs/design/FEAT-1-tokens.css + FEAT-1-ui-design.md + FEAT-1-mockup.html
# Non-visual ACs get a documented "no UI surface" determination (no mockup generated)

# Phase 4 — Solution Architect (also invoked by /keel:design)
# Produces: docs/design/FEAT-1-design.md
# Includes: ADRs, API contracts, DB schema, component diagram, technical risks

# Phase 5 — Software Engineer
# Runs automatically via /keel:implement-feature or orchestrator
# Reads approved design; writes production code AND unit tests
# Gate: all unit tests pass + coverage >= 80% on changed lines
# Produces: src/Services/SubscriptionService.php + tests/Unit/SubscriptionServiceTest.php

# Phase 6 — QA Engineer
/keel:test --story=FEAT-1 --coverage-target=85
# Maps every AC to a passing test; runs integration tests; validates error paths
# Produces: docs/qa/FEAT-1-qa-report.md

# Phase 7 — E2E Engineer
/keel:e2e-test --story=FEAT-1
# Playwright tests for every user-facing flow; screenshot evidence captured
# Blocks release on any E2E failure

# Phase 8 — Security Engineer
/keel:sec --story=FEAT-1
# Consumes prescan.json (composer/npm audit + PHPStan always run before spawn)
# OWASP Top 10 review of changed files; 0 HIGH findings required to proceed
# Produces: docs/security/FEAT-1-security-report.md

# Phases 9-10 — Technical Writer + Release Manager
/keel:release-check --story=FEAT-1
# Phase 9: updates CHANGELOG, README, runbook, memory/lessons.md
# Phase 10: G-6 version stamp check; issues GO or NO-GO with justification

# Deploy (only after release-manager GO verdict)
/keel:deploy --story=FEAT-1 --rollout=canary
# Canary: 5% → 25% → 100% with monitoring checkpoints; rollback auto-triggers on error spike
```

### Governance loop (every phase)

```
orchestrator — engine: init <story> --scope <s>   (budget: 40 gates / 72h)
     |
     ↓  (per phase in scope)
phase agent — reads previous output + ACs + conventions/lessons
     |         does the work; engineer = plan → impact analysis → TDD →
     |         test pyramid (unit/integration/Playwright) → scanners
     |         shift-left → revert-check (defects) → self-audit
     |         writes NN-<agent>.json + artifacts
     ↓
handshake gate — picks verification depth:
     |   TRIVIAL  docs/strings/config, ≤10 lines, nothing sensitive
     |            → engine validate + regression test only
     |   NORMAL   other code changes → changed-area tests + regression
     |   FULL     auth/payments/data/security, >100 lines, new deps
     |            → re-execute everything
     ↓
engine gate — PASS → next phase (attempts reset)
              FAIL → retry with failure findings (max 3)
              3× or budget breach → HALT → Slack + surfaced at session start
                     only a recorded human resume continues
```

**Human touchpoints (the only ones, by design):** AC confirmation, explicit waivers, halt resumes, deploy approval. Every one is recorded verbatim in the story's append-only `audit-log.jsonl`, committed to git.

---

## Available Commands

### Project Setup

```bash
/keel:init --mode=new --stack=cakephp       # Initialize new CakePHP project
/keel:init --mode=existing --stack=cakephp  # Add Keel to an existing project
/keel:setup                                  # Interactive wizard: Jira, GitHub, Playwright, Slack, SonarQube, Snyk
/keel:setup jira                             # Set up one integration at a time
/keel:setup status                           # See what's configured
```

### Planning & Requirements

```bash
/keel:from-jira HART-287                           # Start from Jira ticket (ticket IS the requirements)
/keel:brainstorm --goal="Your goal"                # Generate feature ideas from a business goal
/keel:req --story=FEAT-1 --feature="Your feature"  # Phases 1-2: PO intake + BA requirements
/keel:req --story=FEAT-1 --jira=TICKET-KEY         # Phases 1-2 with Jira context
```

> **Human roles stay human.** The product-owner and scrum-master agents are never auto-invoked in the delivery pipeline. When a Jira ticket exists, the ticket is the requirements (transcribed, never rewritten). Without one, AI drafts are proposals the human PO confirms before anything runs.

### Design

```bash
/keel:design --story=FEAT-1   # Phases 3-4: UI Designer (mockup) + Solution Architect (design doc)
```

> **UI Designer (phase 3)** first asks for reference designs, brand assets, and mood words (Step -1), then scans existing tokens and components. It produces a complete Design System Plan (layout pattern, color palette, typography pairing) and a token-driven HTML mockup for every user-facing AC. Non-visual ACs get a documented no-UI determination.

### Implementation

```bash
/keel:implement-feature story="FEAT-1" feature="..."  # Full 10-phase pipeline
/keel:implement story="FEAT-1" feature="..."          # Alias — same as above
/keel:from-jira FEAT-1                                # Full pipeline from Jira ticket
/keel:from-jira BUG-42 --scope defect                 # Defect express lane: 1→5→6→8
```

### Quality & Testing

```bash
/keel:test --story=FEAT-1 --coverage-target=85   # Phase 6: QA — AC-to-test + integration gate
/keel:e2e-test --story=FEAT-1                     # Phase 7: Playwright browser E2E + screenshots
/keel:sec --story=FEAT-1                          # Phase 8: OWASP audit + dependency scan
```

### Documentation & Release

```bash
/keel:release-check --story=FEAT-1   # Phases 9-10: technical-writer + release-manager go/no-go
```

### Deployment

```bash
/keel:deploy --story=FEAT-1 --rollout=canary       # Canary: 5% → 25% → 100%
/keel:deploy --story=FEAT-1 --rollout=blue-green   # Blue-green deployment
/keel:deploy --story=FEAT-1 --rollout=instant      # Instant deployment
```

### Utilities & Observability

```bash
/keel:preview --story=FEAT-1         # Dry-run: stack detection, economy settings, pipeline map, model tiers, CJIS status
/keel:impact <Class or file>         # CodeGraph impact analysis — blast radius of a change
/keel:health                         # Pipeline health sweep — halted/stale stories, memory bounds, coverage trend
/keel:parallel --stories="A,B,C"     # Run independent stories concurrently in separate git worktrees
keel dashboard --port=7772           # Read-only pipeline status web dashboard (127.0.0.1 only)
/keel --version                      # Show version
/keel --help                         # Show all commands
```

### Pipeline Dashboard

A read-only local web view of every story in `.keel/state/`. Never writes to disk.

```bash
node bin/keel.js dashboard             # serves http://localhost:7772
node bin/keel.js dashboard --port=8080 # custom port
```

- **Columns:** story ID, title, scope, current phase by agent name, status badge (COMPLETE / IN PROGRESS / HALTED), idle time — sorted most-recently-active first
- **Auto-refresh:** page reloads every 30 seconds; corrupt manifests render as an error row
- **Security:** loopback-only bind (`127.0.0.1`); Host-header allowlist blocks DNS-rebinding; strictly read-only (GET / only); zero filesystem writes

---

## Supported Tech Stack

Keel v3.x supports **CakePHP 4.4 / PHP 8.1+** (production-proven).

Multi-stack support (Laravel, Django, Rails, Node) is planned for a future release. Stack conventions live in `stack-profiles/cakephp.md` — additional profiles unlock additional frameworks when added.

```
stack-profiles/
└── cakephp.md    ← production-ready
```

---

## Optional: Configure Integrations

Keel works without any integrations. To configure them:

```bash
/keel:setup              # Step-by-step wizard: Jira, GitHub, Playwright, Slack, SonarQube, Snyk
/keel:setup jira         # One integration at a time — set up later, any time
/keel:setup status       # See what's configured
```

Every step offers **Configure now / Use default / Skip (set up later)**. Each decision is recorded in `~/.keel/config/setup-audit.log`.

| Integration | Default (zero config) | Configure for |
|-------------|----------------------|---------------|
| **Jira** | Bundled Atlassian MCP server — OAuth on first use | Instance URL, verified connectivity |
| **GitHub** | `gh` CLI if installed | Default repo, or GitHub MCP server |
| **Playwright** | Bundled Playwright MCP server — headless Chromium | Browsers, headed mode, E2E base URL |
| **Slack** | Disabled | Webhook notifications on phase events + pipeline halts |
| **SonarQube** | Disabled (PHPStan SAST baseline always runs) | Quality-gate enforcement in the security phase |
| **Snyk** | Disabled (composer/npm audit SCA baseline always runs) | Vulnerability DB + license checks |

Full instructions: **[docs/MCP-SETUP.md](docs/MCP-SETUP.md)**

For CI/Docker (non-interactive):
```bash
bash setup-integrations.sh jira|github|slack
```

---

## Project Structure Created

After running `/keel:init`:

```
your-project/
├── .keel/
│   ├── state/<story-id>/            ← Pipeline state (committed to git)
│   │   ├── manifest.json            ← Position, attempts, halted flag, phase_modes
│   │   ├── NN-<agent>.json          ← One output per phase (agent-output-schema.json)
│   │   ├── handoff-log.md           ← Gate decisions (append-only)
│   │   ├── audit-log.jsonl          ← Audit trail (append-only)
│   │   └── snapshots/               ← Full state copies before risky ops
│   ├── memory/                      ← Cross-story memory (committed, bounded)
│   │   ├── conventions.md           ← Project conventions (≤150 lines)
│   │   ├── lessons.md               ← Incident-derived lessons from RCAs (≤30)
│   │   └── decisions/               ← ADRs
│   ├── graph/codegraph.json         ← Dependency graph for impact analysis
│   └── watch/baseline.json          ← Coverage/test-count baseline (watchers)
├── docs/
│   ├── requirements/                ← Auto-generated requirements
│   │   ├── FEAT-1-requirements.md
│   │   └── TEMPLATE.md
│   ├── design/                      ← Auto-generated designs
│   │   ├── FEAT-1-tokens.css        ← Design token file (6 categories)
│   │   ├── FEAT-1-ui-design.md      ← Design spec + motion table + ACs
│   │   ├── FEAT-1-mockup.html       ← Self-contained HTML mockup
│   │   └── TEMPLATE.md
│   ├── qa/                          ← QA reports
│   ├── security/                    ← Security reports
│   ├── brainstorms/                 ← Idea generation outputs
│   └── deployment/                  ← Deployment plans
├── src/
│   ├── Controllers/
│   ├── Models/
│   ├── Services/
│   └── ...
├── tests/
│   ├── Unit/                        ← Auto-generated unit tests
│   └── Integration/                 ← Auto-generated integration tests
├── database/
│   └── migrations/
├── .gitignore                       ← Updated with .keel/secrets/
├── package.json
├── composer.json
└── ... (framework-specific files)
```

---

## Documentation

### Installation & Setup
- **[INSTALL.md](INSTALL.md)** — Plugin installation (Claude Code, Claude Desktop, local, GitHub Action)
- **[QUICK-START-CLAUDE-CODE.md](QUICK-START-CLAUDE-CODE.md)** — Fastest path to a first feature
- **[docs/MCP-SETUP.md](docs/MCP-SETUP.md)** — Integration & MCP setup wizard guide

### Usage & Workflows
- **[docs/WORKFLOW.md](docs/WORKFLOW.md)** — Complete workflow, cost model (tokens), token-economy design
- **[ALL-AGENTS-COMPLETE-GUIDE.md](ALL-AGENTS-COMPLETE-GUIDE.md)** — All 15 agents reference
- **[TECHNICAL-SPECIFICATIONS.md](TECHNICAL-SPECIFICATIONS.md)** — Architecture & state protocol
- **[docs/demo/HEALTH-1-end-to-end-demo.md](docs/demo/HEALTH-1-end-to-end-demo.md)** — Real end-to-end pipeline walkthrough
- **[CHANGELOG.md](CHANGELOG.md)** — Full release history

### Agent Specifications
- **[agents/ui-designer.md](agents/ui-designer.md)** — Phase 3 UI Designer (branding intake, design system generator, DFII scoring)
- **[agents/handshake-agent.md](agents/handshake-agent.md)** — Adversarial phase gate
- **[agents/audit-agent.md](agents/audit-agent.md)** — Audit trail forensics
- **[agents/state-management-agent.md](agents/state-management-agent.md)** — State engine operations

---

## Security & Compliance

### Compliance Evidence, Honestly Scoped

Keel's audit trail — git history + per-story append-only JSONL logs with every decision and gate event recorded — is **evidence that supports** your organization's compliance process (CJIS, SOC2, HIPAA, GDPR, PCI-DSS, SOX). Keel does not claim certified compliance on your behalf; no tool can.

[x] **Append-only audit log per story** — who/what/when/why for every phase, gate, retry, halt, and human resume  
[x] **Decision traceability** — every agent decision recorded verbatim with its rationale  
[x] **Reconstructable retry loops** — gate failures logged with attempt numbers; restores never rewind history  
[x] **Human accountability points** — halts require a recorded human rationale to resume; releases require explicit approval  

### Built-In Security Features

[x] **CJIS Data Classification Gate** — `scripts/keel-classify-gate.cjs` + `config/cjis-patterns.json`; universal NCIC_ID/LEID patterns; project-specific overlay; fail-closed on parse error  
[x] **Prompt injection guard (OWASP LLM01)** — 6 regex patterns blocking ignore/override, act-as roleplay, `<system>` tags, `###OVERRIDE`; always-blocking at ALL hook stages (exit 2)  
[x] **OWASP Top 10 review** — dedicated security phase per story; HIGH findings block release  
[x] **Layered SAST** — PHPStan baseline always; SonarQube quality gate when configured  
[x] **Layered SCA** — composer/npm audit baseline always; Snyk when configured  
[x] **Scanner inventory honesty** — every security report declares which scanners ran vs were skipped; a configured scanner that silently didn't run fails the gate  
[x] **Secrets hygiene** — no API keys in git (`~/.keel/secrets/`, gitignored); agents forbidden from outputting credentials, tokens, or PII  
[x] **Pipeline Dashboard Host-header allowlist** — DNS-rebinding guard; loopback literals only; 403 on disallowed hosts, zero request data echoed  

---

## Use Cases

### 1. Individual Developers

Build features with complete automation and governance.

```bash
/keel:init --mode=new --stack=cakephp
/keel:req --story=FEAT-1 --feature="Your idea"
# All 10 phases run automatically with gates between each.
```

### 2. Development Teams

Standardize workflows with shared conventions and governance.

```bash
/keel:init --mode=new --stack=cakephp
# All team members use the same agents, conventions, and quality gates.
# Integrations keep Jira/GitHub in sync automatically.
```

### 3. CI/CD Pipelines

Automate governed development in GitHub Actions.

```yaml
- uses: creativemyntra/keel@v3.18.2
  with:
    phase: 'all'   # Run complete pipeline
```

### 4. Rapid Prototyping

Validate ideas quickly with a complete quality-verified output.

```bash
/keel:brainstorm --goal="New feature idea"
/keel:req --story=PROTO-1
/keel:deploy --story=PROTO-1 --rollout=canary
```

### 5. Legacy Code Modernization

Add new features to existing projects with impact analysis.

```bash
/keel:init --mode=existing --stack=cakephp
# Keel integrates with your existing codebase via CodeGraph impact analysis.
# New features follow established project conventions.
```

---

## What's Included

### Framework
- 15 agent definitions (10 pipeline + 2 meta/support + 3 infrastructure)
- 9 skills (start-work, finish-work, implement-feature, investigate-defect, review-code, release-check, e2e-test, task-breakdown, create-mom)
- 18 slash commands covering every pipeline phase and utility
- Deterministic state engine + proactive watchers (zero-dependency Node)
- Governance gates enforced between every phase
- Tech stack profiles (CakePHP 4.4 today; more on the roadmap)

### Documentation
- Comprehensive guides: WORKFLOW.md, INSTALL.md, QUICK-START, ALL-AGENTS-COMPLETE-GUIDE, TECHNICAL-SPECIFICATIONS
- Real-world pipeline walkthrough (HEALTH-1 end-to-end demo)
- Agent specification files for all 15 agents

### Infrastructure Scripts
- `scripts/keel-state.cjs` — deterministic state engine (schema, gates, retries, audit, snapshots)
- `scripts/keel-classify-gate.cjs` — CJIS data classification + prompt injection guard
- `scripts/keel-dashboard.cjs` — pipeline status web dashboard
- `scripts/keel-watch.cjs` — coverage and test-count baseline watcher
- `scripts/keel-version-audit.cjs` — stale version reference scanner

### Skills
- `keel:start-work` — Fetch Jira ticket → create branch → push → transition to In Progress
- `keel:finish-work` — Create PR to dev → transition Jira to In Review
- `keel:implement` — Full 10-phase pipeline alias
- `keel:preview` — Dry-run showing stack detection, economy settings, model tiers

---

## Contributing

Keel is open-source under the MIT License.

1. Fork on GitHub: https://github.com/creativemyntra/keel
2. Create a feature branch: `git checkout -b feature/improvement`
3. Commit changes: `git commit -m "feat(scope): description"`
4. Push to branch: `git push origin feature/improvement`
5. Open a Pull Request targeting `dev`

---

## License

**MIT License** — Free for personal and commercial use.

See [LICENSE](LICENSE) for details.

---

## Resources

| Resource | Link |
|----------|------|
| **GitHub Repository** | https://github.com/creativemyntra/keel |
| **Issue Tracker** | https://github.com/creativemyntra/keel/issues |
| **Discussions** | https://github.com/creativemyntra/keel/discussions |
| **Author** | Amar Singh |

---

## Acknowledgments

Keel is built with:
- **Claude AI** — Code generation, analysis, and reasoning
- **Claude Code** — Plugin platform and agent orchestration
- **Anthropic** — Model infrastructure
- **Open Source Community** — Best practices and tooling

---

## Star Us on GitHub

If Keel helps you ship better software, please star the repo.

https://github.com/creativemyntra/keel

---

## Getting Help

```bash
# View all CLI commands
node bin/keel.js --help

# Key reference docs
# ALL-AGENTS-COMPLETE-GUIDE.md  — all 15 agents, phase-by-phase reference
# TECHNICAL-SPECIFICATIONS.md   — architecture & state protocol
# docs/WORKFLOW.md               — cost model, token economy, phase loop
# CHANGELOG.md                   — full release history
```

**Report issues:** https://github.com/creativemyntra/keel/issues

---

## Version History

**[View Full Changelog →](CHANGELOG.md)**

### What's New in v3.18.2

- **Audit release (31 findings)** — Full-spectrum hardening: Part A (21 static findings) + Part B (10 distribution/dynamic findings).
- **action.yml hardened** — Shell injection closed (env-var quoting), `claude-api-key` wired to `ANTHROPIC_API_KEY`, `collect-outputs` now reports actual pass/fail.
- **Node >=18 engines** — `package.json` engines field updated to match documented Playwright requirement.
- **npm package ships docs** — `INSTALL.md`, `QUICK-START-CLAUDE-CODE.md`, `ALL-AGENTS-COMPLETE-GUIDE.md`, `TECHNICAL-SPECIFICATIONS.md`, `CHANGELOG.md`, `docs/` now included.
- **Schema enforced** — `decisions` added to `agent-output-schema.json` `required[]`.

### What's New in v3.16.8

- **CJIS gate project-independence (CRIT-4)** — Universal NCIC_ID and LEID patterns now block at the framework level; project-specific identifiers moved to overlay (`cjis-project-patterns.json`). Overlay parse failure is fail-closed.
- **Prompt injection guard (CRIT-1)** — OWASP LLM01 defense: 6 regex patterns (ignore/override, act-as, new-instructions, `<system>` tags, `###OVERRIDE`, `[system]` brackets) always-blocking at ALL hook stages including PostToolUse (exit 2).
- **KEEL-R14 zombie-state prevention (CRIT-3)** — `phase_modes` manifest field + `phase-mode set/get` engine command tracks author/draft mode. Gate PASS auto-clears the marker; safe for context-compaction recovery.
- **Defect-scope lessons writeback enforced (CRIT-2)** — Security engineer (last content phase for defects) has explicit obligation to write a `lessons.md` entry when RCA is present; phase-8 handshake gate verifies.
- **`keel:implement` alias** — `commands/implement.md` routes `/keel:implement` to the orchestrator (all 10 phases); prevents silent fallback to phase-5-only software-engineer.
- **UI Designer upgrade: Branding Intake + Design System Generator** — Step -1 pauses to ask for reference URLs, brand assets, mood words, and existing UI before any codebase scan. Step 2f produces a full Design System Plan: named layout pattern, complete color palette with hex codes, typography pairing, CSS effects, direction-specific anti-patterns, and a 24-item pre-build checklist. Dashboard expertise, DFII scoring (≥8 gate), and differentiation anchor requirement added.
- **Coverage baseline format fix (W-2)** — `keel-watch.cjs` normalizes both flat and nested baseline formats; drop detection works correctly after preflight rebuild.
- **Resume phase guard (HIGH-2)** — `resume --phase N` now rejects if phase N-1 output file is absent.
- **Defect scope-creep detection (HIGH-4)** — Handshake agent blocks new endpoints, DB columns, non-test dependencies, or UI flows outside the RCA without human acknowledgment.

### What's New in v3.16.7

- **Forensic engine audit: 14 fixes** — Comprehensive self-audit of `keel-state.cjs` and `keel-classify-gate.cjs` resolved 3 CRITICAL, 4 HIGH, 4 MEDIUM, and 3 LOW findings.
- **Path traversal closed (CRIT-02)** — `story_id` validated with strict `^[A-Za-z0-9_-]+$` regex; arbitrary filesystem access via crafted story IDs blocked (exit 64).
- **Audit/handoff log consistency (CRIT-01/03)** — Handoff-log initialized eagerly on `init`; `appendAudit()` guaranteed before any async notification; log divergence on halt eliminated.
- **Slack SSRF closed (HIGH-02)** — Webhook URL hostname validated against `hooks.slack.com`; attacker-controlled redirects rejected.
- **Gate budget off-by-one fixed (HIGH-03)** — Check-before-increment ensures `max_gates` limit is respected exactly.
- **Artifact validation hardened (MED-01)** — Rejects symlinks, files > 50 MB, dangerous extensions (`.exe`, `.bat`, `.sh`, `.dll`, `.ps1`).
- **Configurable lock timeout (MED-03)** — `state_engine.lock_stale_seconds` in `.keel/economy.yml`; no longer hardcoded.

### What's New in v3.16.6

- **G-15 Karpathy Protocol** — Four binding rules at every handshake gate: K-1 surface assumptions, K-2 ask-don't-guess (HALT on ambiguity), K-3 minimum code zero speculation, K-4 surgical diff verification.
- **Token economy observability** — `confirm_before_spawn: true` (default): orchestrator shows `[token-estimate:]` before every spawn. `token_summary: true`: cumulative token table (estimates). Measured cache savings reported in telemetry when session usage is imported.
- **Prompt cache breakpoints** — 3 canonical `cache_control: {type: "ephemeral"}` breakpoints; `[cache-estimate:]` line emitted per spawn.
- **`/keel:tokens` command** — Live token ledger + cache savings; mid-session `confirm on|off` and `cache on|off` toggles.

### What's New in v3.16.5

- **`keel:start-work` skill** — Fetches a Jira ticket via Atlassian Rovo MCP, creates a typed branch, pushes to remote, transitions Jira to "In Progress". Works in description-only mode when no ticket exists.
- **`keel:finish-work` skill** — Creates an industry-standard PR to `dev` via GitHub REST API (`~/.keel/secrets/github.token`), transitions Jira to "In Review". Handles 422 (PR already exists) gracefully.
- **Advisory ticket traceability (G-12)** — Ticket reference in commits is advisory-only (warns, never blocks).

### What's New in v3.16.4

- **CakePHP-only packaging** — Removed all Node/Django/Rails/Laravel references; `keel-detect-stack` blocks non-PHP manifests. `package.json` `files` array includes `config/` and `stack-profiles/`.
- **CJIS gate deadlock fix** — Rewrote `config/cjis-patterns.json` to eliminate description string that matched the EMAIL regex, causing the gate to block reads/writes of its own config file.
- **Explicit model tiers** — Orchestrator pipeline phases table has a `Model` column; haiku for TRIVIAL-tier handshakes + jira-import, sonnet for all other phase agents and NORMAL/FULL gates.
- **`/keel:preview` command** — Dry-run: stack detection, story state, economy settings, pipeline map with model tiers, CJIS gate status, CodeGraph freshness.

### What's New in v3.16.0

- **CJIS Data Classification Gate** — `scripts/keel-classify-gate.cjs` + `config/cjis-patterns.json`; runs via `hooks/hooks.json` (UserPromptSubmit, PreToolUse, PostToolUse); blocks stories touching CJIS-adjacent data without required classification annotation.
- **`keel-state.cjs security-status` command** — Human-readable CJIS gate status for a story.

### What's New in v3.15.0

- **10-phase pipeline** — `tdd-red` and `tdd-green` removed as separate phases. `software-engineer` (phase 5) now writes production code and unit tests in one phase; coverage ≥ 80% is a hard gate. Phase renumbering: qa-engineer→6, e2e-engineer→7, security-engineer→8, technical-writer→9, release-manager→10.
- **Backward-compatible engine** — `keel-state.cjs` retains `LEGACY_AGENTS` so stories initialized under the old 12-phase schema continue to validate correctly.

---

**Version:** 3.18.2  
**Released:** 2026-08-05  
**Status:** PRODUCTION READY  
**Agents:** 15 (10 pipeline phase + 2 meta/support + 3 infrastructure)  
**License:** MIT  
**Author:** Amar Singh  
**Tag:** v3.18.2 (https://github.com/creativemyntra/keel/releases/tag/v3.18.2)
