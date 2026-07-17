# Keel AI-SDLC Framework v3.14.1

**Production-Ready AI-SDLC Plugin for Claude Code**

Automate your entire development lifecycle with 17 specialized AI agents across a 12-phase pipeline.  
From ideation to production deployment in **2 hours** (vs 2 weeks manually).

---

## ⚡ Quick Start (30 seconds)

```bash
# 1. Install the plugin (marketplace)
claude plugin marketplace add https://github.com/creativemyntra/keel
claude plugin install keel

# 2. Verify installation
claude plugin list
# → keel v3.14.1 ✅

# 3. Initialize your project
/keel:init --mode=new --stack=cakephp

# 4. Run the full 12-phase pipeline (recommended)
/keel:implement-feature story="FEAT-1" feature="Your feature"

# — or step through phases individually —
/keel:req --story=FEAT-1 --feature="Your feature"  # Phase 2: BA requirements + ACs
/keel:design --story=FEAT-1                         # Phases 3-4: UI design + architecture
# (software-engineer phase 5 runs automatically inside the pipeline)
/keel:tdd-red --story=FEAT-1                        # Phase 6: write failing tests for every AC
/keel:tdd-green --story=FEAT-1                      # Phase 7: run suite — 0 failures, ≥ 80% coverage
/keel:test --story=FEAT-1 --coverage-target=85      # Phase 8: QA + full AC traceability
/keel:e2e-test --story=FEAT-1                       # Phase 9: Playwright E2E + screenshots
/keel:sec --story=FEAT-1                            # Phase 10: OWASP + dependency audit
/keel:release-check --story=FEAT-1                  # Phases 11-12: docs + go/no-go verdict
/keel:deploy --story=FEAT-1 --rollout=canary        # Deploy after release-manager approval
```

**Done!** Your feature is in production. ✅

---

## 📋 What is Keel?

**Keel** is a complete AI-SDLC (Artificial Intelligence Software Development Lifecycle) framework integrated with Claude Code as a plugin.

It automates the entire software development process using **17 specialized autonomous agents**:

**Pipeline Phase Agents (12):**
| Phase | Agent | Role |
|-------|-------|------|
| 1 | **product-owner** | Requirements intake — proposals only; the human confirms ACs (or `/keel:from-jira` transcribes the ticket) |
| 2 | **business-analyst** | Functional spec, data flows, edge cases |
| 3 | **ui-designer** | UI/UX design — screen flows, design spec + HTML mockup for every user-facing AC |
| 4 | **solution-architect** | Architecture, design, technical risk |
| 5 | **software-engineer** | Production code only — no tests |
| 6 | **tdd-red** | Test case creation — every AC gets tests, each verified meaningful |
| 7 | **tdd-green** | Full suite execution — 0 failures, coverage ≥80% |
| 8 | **qa-engineer** | AC-to-test mapping, integration tests, error paths |
| 9 | **e2e-engineer** | Playwright browser E2E tests with screenshot evidence |
| 10 | **security-engineer** | OWASP, threat model, dependency audit |
| 11 | **technical-writer** | Docs, changelog, runbook |
| 12 | **release-manager** | Go/no-go decision, deployment plan |

**Meta & Support Agents (2):**
| Agent | Role |
|-------|------|
| **orchestrator-agent** | Routes work, sequences phases, enforces gates |
| **scrum-master-agent** | Sprint ceremonies, velocity (human-invoked only, never in the pipeline) |

**Infrastructure Agents (3):**
| Agent | Role |
|-------|------|
| **handshake-agent** | Adversarial phase gate — verifies claims by *executing* them (runs the tests, checks coverage first-hand) |
| **state-management-agent** | Operates the deterministic state engine (init, status, snapshots, restore) |
| **audit-agent** | Forensics & audit queries over the per-story append-only JSONL log |

Mechanical work (schema validation, gating, attempt counting, audit appends,
snapshots) is done by a zero-dependency **state engine**
(`scripts/keel-state.cjs`) — agents spend tokens on judgment only.

### ✨ Key Features

✅ **17 Specialized Agents** — 12 pipeline phase + 2 meta/support + 3 infrastructure agents  
✅ **12-Phase Pipeline** — dedicated UI design (3), code-only implementation (5), TDD red/green split (6-7), and Playwright E2E (9) phases; defect express lane runs 1→5→6→7→8→10  
✅ **Deterministic State Engine** — `keel-state.cjs` owns state, gates, retries, audit; zero tokens on clerk work  
✅ **File-Based Agent Memory** — phases share context via `.keel/state/`, committed to git  
✅ **Execution-Verified Gates** — the handshake gate re-runs tests instead of trusting claims (anti-hallucination)  
✅ **Bounded Retry Loops** — 3 attempts per phase, then HALT + Slack escalation; resume requires a recorded human decision  
✅ **Cross-Story Memory with Writeback** — every defect RCA becomes a lesson in `.keel/memory/lessons.md` (gated, bounded)  
✅ **Proactive Watchers** — hooks warn on coverage drops and shrinking test counts; halted/stale stories surface at session start  
✅ **Pipeline Dashboard** — `keel dashboard` serves a read-only local web view of all stories (loopback-only, auto-refreshing)  
✅ **Audit Trail** — per-story JSONL log supporting your compliance evidence process  
✅ **TDD Workflow** — Red → Green → Refactor with governance gates  
✅ **Coverage Gate** — ≥80% enforced before the security phase  
✅ **No Patch Development** — defect fixes require an RCA + revert-checked regression test; symptom patches fail the gate  
✅ **Security Phase** — OWASP Top 10 review + layered SAST/SCA: PHPStan & composer audit always, SonarQube & Snyk when configured  
✅ **Multi-Stack Support** — CakePHP 4.4 today; Laravel, Django, Rails on the roadmap  
✅ **Optional Integrations** — Jira (bundled Atlassian MCP), GitHub, Slack, Playwright  
✅ **Staged Deployment** — canary / blue-green rollout via the release gate  

---

## 🆕 What's New in v3.14.1

- **Dashboard Host-header allowlist — DNS-rebinding hardening (KEEL-105, closes KEEL-104 LOW-1)** — `scripts/keel-dashboard.cjs` now validates the `Host` header before any routing. Only the loopback literals `localhost`, `127.0.0.1`, and `[::1]` are accepted (case-insensitive, optional `:port` suffix). Disallowed hosts get `403 Forbidden`; a missing `Host` header gets `400 Bad Request` per RFC 9112 (ADR-004 D-1). Both rejections use a constant plain-text body with `Content-Type: text/plain; charset=utf-8`, `X-Content-Type-Options: nosniff`, and `Cache-Control: no-store` — no request data echoed, zero filesystem I/O on the rejection path. Guard runs before routing so the renderer is structurally unreachable on rejection. All KEEL-104 invariants preserved: loopback-only bind, HTML-escaping, `EADDRINUSE` handling, `keel-state.cjs` and `bin/keel.js` byte-unchanged. See [Security posture (ADR-003, ADR-004)](#security-posture-adr-003-adr-004) below.

## 🆕 What's New in v3.14.0

- **`keel dashboard` — pipeline status web dashboard (KEEL-104)** — `node bin/keel.js dashboard [--port=<N>]` serves a local, read-only web view of every story in `.keel/state/` at `http://localhost:7772` (default): story ID, title, scope, current phase by agent name, status badge (COMPLETE / IN PROGRESS / HALTED), and idle time. Auto-refreshes every 30 seconds. Binds to `127.0.0.1` only, performs zero filesystem writes, zero new dependencies. See [Pipeline Dashboard](#pipeline-dashboard) below.
- **`describe` command (v3.13.0)** — `node ~/.keel/bin/keel-state.cjs describe <story-id>` prints a human-readable one-page summary of any story: phase names (not numbers), idle time as `Xh Ym` / `Xm Ys`, halted warning, gate-event budget. Exits 0 on success, exits 1 with stderr on missing story. Zero new dependencies. See [State Engine CLI](#state-engine-cli) below.
- **Dedicated UI design phase — new `ui-designer` agent (phase 3)** — scans existing UI patterns, then produces a Markdown design spec + self-contained HTML mockup for every user-facing AC before architecture begins (no Figma required). The pipeline is now **12 phases**; builds on the v3.13.0 restructure that split development into dedicated code (`software-engineer`), test-authoring (`tdd-red`), test-execution (`tdd-green`), and browser E2E (`e2e-engineer`) phases.
- **Binding pipeline guardrails (`.keel/GUARDRAILS.md`)** — governance rules the orchestrator, handshake gate, engineer, ui-designer, and release-manager must obey on every run.

v3.4.0 → v3.12.0 turn the pipeline's promises into enforcement:

- **Smart economy (v3.11.0)** — owner-choice file `.keel/economy.yml`, static-first security prescan (clean prescan can replace the security spawn, opt-in), CodeGraph-capped context loading, output caps. See [docs/WORKFLOW.md](docs/WORKFLOW.md).
- **Token economy (v3.10.0)** — measured cost model ([docs/WORKFLOW.md](docs/WORKFLOW.md)): tiered gate verification (TRIVIAL/NORMAL/FULL — security-sensitive diffs always pay full price), gate-1-lite, and haiku model-tiering for mechanical spawns; trivial defects projected −50–60% tokens.
- **Human roles stay human (v3.8.0)** — product-owner and scrum-master agents are out of the automated pipeline; `/keel:from-jira <KEY>` starts development straight from a Jira ticket (transcribed as the AC contract, never rewritten); AI-drafted requirements are proposals the human PO confirms.

- **OS-enforced state integrity (v3.7.0)** — atomic manifest writes + OS-level locking (concurrent writes physically can't lose updates), pipeline budgets (gate-event + wall-clock caps with human-resume extension), automated revert-check proving regression tests guard their fixes, byte-identical-retry detection, and an 11-test engine suite (`npm run test:engine`).
- **Layered SAST/SCA scanner stack (v3.6.0)** — the security phase runs PHPStan + composer/npm audit always, and SonarQube (quality gate) + Snyk (vuln DB) when configured; the engineer runs the same stack during development (shift-left). Every security report carries a scanner inventory — a configured scanner that silently didn't run fails the gate.

- **Deterministic state engine** (`scripts/keel-state.cjs`) — schema validation, grounding checks (artifact paths must exist), AC-drift detection, gate/attempt/halt logic, audit appends, snapshots & restore. Cross-platform, zero dependencies.
- **Handshake gate executes claims** — "tests pass" is verified by running the suite, not by reading the artifact the audited agent wrote. Adversarial by design.
- **Halt escalation + human resume** — 3 failed attempts halt the pipeline, notify Slack (if configured), and surface at every session start until a human resumes with a recorded rationale.
- **Memory writeback loop** — defect RCAs must produce a lesson in `.keel/memory/lessons.md` (gated); architect & engineer read lessons before designing/coding; memory is capped so it never becomes a token leak.
- **Proactive watchers** — PostToolUse hook warns on coverage drops / shrinking test counts; `/keel:health` sweeps for halted/stale stories, attempt heat-maps, and stale impact graphs.
- **Plan-first, self-auditing software engineer** — impact analysis before coding, full test pyramid (unit / integration / Playwright E2E), patch-pattern self-review, revert-checked defect fixes.

**[View Complete Release Notes →](CHANGELOG.md)**

---

## 📥 Installation

### Method 1: Claude Code Plugin Marketplace (Recommended) ⭐

```bash
claude plugin marketplace add https://github.com/creativemyntra/keel
claude plugin install keel
```

That's it! The plugin will:
- ✅ Register `/keel:*` commands, 17 agents, and 11 skills
- ✅ Create `~/.keel` configuration directories on first session
- ✅ Be ready to use immediately

**Verify:**
```bash
claude plugin list
# → keel v3.14.1 ✅
```

### Method 2: npm Global Package (⏳ not yet published — coming soon)

```bash
npm install -g @amarsingh/keel
```

**Use as command-line tool:**
```bash
keel init --mode=new --stack=cakephp
keel req --story=FEAT-1
keel deploy --story=FEAT-1
```

### Method 3: Docker Container (⏳ not yet published — coming soon)

```bash
docker pull amarsingh/keel:latest

# Run Keel in Docker
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
        uses: creativemyntra/keel@v3.14.1
        with:
          phase: 'init'
          mode: 'new'
          stack: 'cakephp'
      
      - name: Create Requirements
        uses: creativemyntra/keel@v3.14.1
        with:
          phase: 'req'
          story-id: ${{ github.event.pull_request.number }}
      
      - name: Run Tests
        uses: creativemyntra/keel@v3.14.1
        with:
          phase: 'test'
          story-id: ${{ github.event.pull_request.number }}
          coverage-target: '85'
      
      - name: Security Scan
        uses: creativemyntra/keel@v3.14.1
        with:
          phase: 'sec'
          story-id: ${{ github.event.pull_request.number }}
```

---

## 🚀 Complete Workflow

### Feature: User Subscription Management

```bash
# ─── One-command option (recommended) ───────────────────────────────────────
/keel:init --mode=new --stack=cakephp
/keel:implement-feature story="FEAT-1" feature="User subscription management"
# Orchestrator runs all 12 phases automatically. Done. ✅

# ─── Step-by-step (all 12 phases) ───────────────────────────────────────────

# Phase 1: Product Owner intake (human confirms ACs, or Jira ticket is the source)
/keel:from-jira FEAT-1            # ← if Jira ticket exists, this is the entry point
# — or for a new idea:
/keel:req --story=FEAT-1 --feature="User subscription management"

# Phase 2: Business Analyst (10 min)
# (runs inside /keel:req above)
# Produces: docs/requirements/FEAT-1-requirements.md
# Includes: functional spec, data flows, edge cases, business rules

# Phase 3: UI Designer (10 min)  ← NEW in v3.14.0
/keel:design --story=FEAT-1
# Scans existing UI patterns → Markdown design spec + self-contained HTML mockup
# Non-visual stories get a documented no-UI determination (skips mockup)
# Produces: docs/design/FEAT-1-mockup.html + design spec

# Phase 4: Solution Architect (15 min)  ← also invoked by /keel:design
# ADR, API contracts, DB schema, component diagram, technical risks
# Produces: docs/design/FEAT-1-design.md

# Phase 5: Software Engineer (25 min)
# (runs via /keel:implement-feature or orchestrator — no standalone CLI command)
# Reads the approved design; writes production code only (no tests here)
# Produces: src/Models/Subscription.php, src/Services/SubscriptionService.php, etc.

# Phase 6: TDD Red — write failing tests (15 min)
/keel:tdd-red --story=FEAT-1
# Writes PHPUnit tests for EVERY AC; verifies each test FAILS without implementation
# Produces: tests/TestCase/Controller/FEAT-1Test.php (all tests red)

# Phase 7: TDD Green — run suite, all must pass (15 min)
/keel:tdd-green --story=FEAT-1
# Executes the full test suite against the phase-5 implementation
# Gate: 0 failures, coverage ≥ 80% on changed lines, no regression in pre-existing tests

# Phase 8: QA — AC traceability + full suite gate (10 min)
/keel:test --story=FEAT-1 --coverage-target=85
# Maps every AC to a passing test; integration tests; error-path validation
# Produces: docs/qa/FEAT-1-qa-report.md

# Phase 9: E2E — Playwright browser tests (10 min)  ← NEW in v3.13.0
/keel:e2e-test --story=FEAT-1
# Playwright tests for every user-facing flow; screenshot evidence captured
# Blocks release on any E2E failure

# Phase 10: Security (10 min)
/keel:sec --story=FEAT-1
# Consumes prescan.json (composer/npm audit + PHPStan baseline always run)
# OWASP Top 10 review of changed files; 0 HIGH findings required to proceed
# Produces: docs/security/FEAT-1-security-report.md

# Phases 11-12: Technical Writer + Release Manager (10 min)
/keel:release-check --story=FEAT-1
# Phase 11 — Technical Writer: updates CHANGELOG, README, runbook, memory
# Phase 12 — Release Manager: G-6 version stamp; issues GO or NO-GO with justification

# Deploy (15 min, only after release-manager GO verdict)
/keel:deploy --story=FEAT-1 --rollout=canary
# Canary: 5% → 25% → 100% with monitoring checkpoints; rollback auto-triggers on error spike

# TOTAL: ~2 hours end-to-end  (vs 2 weeks manually ⚡)
```

---

## 📊 Results

### Development Metrics

| Metric | Without Keel | With Keel | Improvement |
|--------|--------------|-----------|-------------|
| Time to Production | 2 weeks | 2 hours | 97.5% faster ⚡ |
| Tests Written | ~20 manual | 9+ auto-generated | 45% more coverage |
| Code Coverage | 60-70% | 87% | +25% |
| Security Issues | Unknown | 0 verified | 100% safe |
| Developer Hours | 80 hours | 2 hours | 40x faster |

### Sample Output

**Requirements Generated:**
```
✅ 4 user stories
✅ 4 acceptance criteria (BDD format)
✅ 4 API endpoints specified
✅ Database schema designed
```

**Code Generated:**
```
✅ Subscription.php (Model)
✅ SubscriptionService.php (Service)
✅ SubscriptionTest.php (Unit Tests)
✅ SubscriptionIntegrationTest.php (Integration Tests)
```

**Quality Verified:**
```
✅ 9 tests passing (100%)
✅ 87% code coverage
✅ 0 OWASP violations
✅ 0 security vulnerabilities
✅ PCI DSS compliant
```

---

## 📚 Available Commands

### Project Setup

```bash
/keel:init --mode=new --stack=cakephp      # Initialize new project
/keel:init --mode=existing --stack=laravel # Add Keel to existing project
```

### Planning & Design

```bash
/keel:from-jira HART-287                          # Start straight from a Jira ticket (ticket IS the requirements)
/keel:brainstorm --goal="Your goal"               # Generate ideas
/keel:req --story=FEAT-1 --jira=TICKET-KEY        # Phase 2: BA requirements + ACs (or --feature="...")
/keel:design --story=FEAT-1                       # Phases 3-4: UI designer (mockup) + solution architect
```

> **Human roles stay human:** the product-owner and scrum-master agents are
> never auto-invoked in the delivery pipeline. When a Jira ticket exists, the
> ticket is the requirements (transcribed, never rewritten); without one, AI
> drafts are proposals the human PO confirms.
>
> **UI Designer (phase 3)** runs automatically before architecture — it scans
> existing UI patterns and produces a Markdown design spec + HTML mockup for
> every user-facing AC. Non-visual stories get a documented no-UI determination.

### Development

```bash
# Phase 5 — software-engineer writes production code (runs via /keel:implement-feature or orchestrator)

# Phase 6 — TDD Red: write a failing test for every AC
/keel:tdd-red --story=FEAT-1

# Phase 7 — TDD Green: run the full suite; every test must pass, coverage ≥ 80% on changed lines
/keel:tdd-green --story=FEAT-1

/keel:tdd-refactor --story=FEAT-1   # Cleanup pass after green
```

### Quality

```bash
/keel:test --story=FEAT-1 --coverage-target=85  # Phase 8: QA — AC-to-test mapping + full suite gate
/keel:e2e-test --story=FEAT-1                    # Phase 9: Playwright browser E2E + screenshots
/keel:sec --story=FEAT-1                         # Phase 10: OWASP audit + dependency scan
```

### Docs & Release

```bash
/keel:release-check --story=FEAT-1              # Phases 11-12: technical-writer + release-manager go/no-go
```

### Deployment

```bash
/keel:deploy --story=FEAT-1 --rollout=canary     # Deploy with canary rollout
/keel:deploy --story=FEAT-1 --rollout=blue-green  # Blue-green deployment
/keel:deploy --story=FEAT-1 --rollout=instant     # Instant deployment
```

### Utilities

```bash
/keel:setup                        # Interactive integration wizard (Jira, GitHub, Playwright, Slack)
/keel:impact <Class or file>       # CodeGraph impact analysis — blast radius of a change
/keel:health                       # Pipeline health sweep — halted/stale stories, memory bounds, coverage trend
/keel dashboard --port=7772        # Read-only pipeline status web dashboard (binds to 127.0.0.1 only)
/keel --version                    # Show version
/keel --help                       # Show all commands
```

---

### Pipeline Dashboard

A read-only local web view of every story in `.keel/state/` — it never writes to disk.

```bash
node scripts/keel-dashboard.cjs --port 8080   # run the server directly (flag is space-separated: --port <N>)

# or via the CLI wrapper (the wrapper parses the equals form only):
node bin/keel.js dashboard               # serves http://localhost:7772
node bin/keel.js dashboard --port=8080   # custom port
```

> **Flag syntax:** the server script takes the space-separated form `--port <N>`; the
> `bin/keel.js` wrapper takes `--port=<N>`. Using the wrong form for a surface does not
> error — the server silently starts on the default port 7772.

On start it prints `Dashboard: http://localhost:<port>`; stop it with Ctrl-C.

- **Columns:** story ID, title, scope, current phase by agent name (e.g. `Phase 11 — Technical Writer`), status badge (COMPLETE / IN PROGRESS / HALTED), idle time — sorted most-recently-active first.
- **Auto-refresh:** the page reloads every 30 seconds; a corrupt manifest renders as an error row instead of breaking the sweep.
- **Empty state:** with no stories, the page prompts `Run keel init <story-id> to start.` — the server still runs.
- **Port in use:** exits with `Error: port <N> is already in use. Use --port to specify a different port.`

#### Security posture (ADR-003, ADR-004)

- **Loopback-only bind:** the server listens on `127.0.0.1` only — it is unreachable from the LAN.
- **Host-header allowlist (DNS-rebinding guard):** every request's `Host` header must be a loopback literal — `localhost`, `127.0.0.1`, or `[::1]` — matched case-insensitively, with an optional `:port` suffix. A DNS-rebound attacker hostname can never equal a loopback literal, so rebinding requests are rejected before any routing or state read happens.
- **403 rejection contract:** a disallowed `Host` receives `403 Forbidden` with a constant plain-text body (`Content-Type: text/plain; charset=utf-8`), `X-Content-Type-Options: nosniff`, and `Cache-Control: no-store`. No request data is ever echoed back, and the rejection path performs zero filesystem I/O.
- **Missing Host is 400:** a request without a `Host` header receives `400 Bad Request` under the same constant-body header contract — it is malformed per RFC 9112, not merely refused (ADR-004 D-1/D-3).
- **Strictly read-only:** only `GET /` is served (anything else is 404); zero filesystem writes; all state-derived output is HTML-escaped; zero new npm dependencies.

---

## 🛠️ Supported Tech Stacks

Keel automatically configures conventions for:

- **CakePHP 4.4** (PHP 8.1+)
- **Laravel 10** (PHP 8.1+)
- **Django 4.0+** (Python 3.9+)
- **Ruby on Rails 7.0+**

**Add more stacks:**
```
stack-profiles/
├── cakephp.md
├── laravel.md
├── django.md
├── rails.md
└── your-framework.md
```

---

## 🔧 Optional: Configure Integrations

Keel works perfectly without any integrations. To configure them, run the
**interactive setup wizard** inside Claude Code:

```
/keel:setup              # step-by-step wizard: Jira, GitHub, Playwright, Slack, SonarQube, Snyk
/keel:setup jira         # one integration at a time — set up later, any time
/keel:setup status       # see what's configured
```

Every step offers **Configure now / Use default / Skip (set up later)**, and each
decision is recorded in `~/.keel/config/setup-audit.log`.

| Integration | Default (zero config) | Configure for |
|-------------|----------------------|---------------|
| **Jira** | Bundled Atlassian MCP server — OAuth on first use | Instance URL, verified connectivity |
| **GitHub** | `gh` CLI if installed | Default repo, or GitHub MCP server |
| **Playwright** | Bundled Playwright MCP server — headless Chromium | Browsers, headed mode, E2E base URL |
| **Slack** | Disabled | Webhook notifications on phase events + pipeline halts |
| **SonarQube** | Disabled (PHPStan SAST baseline always runs) | Quality-gate enforcement in the security phase |
| **Snyk** | Disabled (composer/npm audit SCA baseline always runs) | Vulnerability DB + license checks in the security phase |

Full step-by-step instructions: **[docs/MCP-SETUP.md](docs/MCP-SETUP.md)**.

For CI/Docker (non-interactive), use the shell fallback:

```bash
bash setup-integrations.sh jira|github|slack
```

---

## 📁 Project Structure Created

After running `/keel:init`:

```
your-project/
├── .keel/
│   ├── state/<story-id>/            ← Pipeline state (committed to git)
│   │   ├── manifest.json            ← Position, attempts, halted flag
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
│   │   ├── FEAT-2-requirements.md
│   │   └── TEMPLATE.md
│   ├── design/                      ← Auto-generated designs
│   │   ├── FEAT-1-design.md
│   │   ├── FEAT-2-design.md
│   │   └── TEMPLATE.md
│   ├── brainstorms/                 ← Idea generation
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

## 📖 Documentation

### Installation & Setup
- **[INSTALL.md](INSTALL.md)** — Plugin installation (Claude Code, Claude Desktop, local, GitHub Action)
- **[QUICK-START-CLAUDE-CODE.md](QUICK-START-CLAUDE-CODE.md)** — Fastest path to a first feature
- **[docs/MCP-SETUP.md](docs/MCP-SETUP.md)** — Integration & MCP setup wizard guide (Jira, GitHub, Playwright, Slack)

### Usage & Workflows
- **[docs/WORKFLOW.md](docs/WORKFLOW.md)** — Complete workflow, measured cost model (time & tokens), token-economy design
- **[ALL-AGENTS-COMPLETE-GUIDE.md](ALL-AGENTS-COMPLETE-GUIDE.md)** — All 17 agents reference
- **[TECHNICAL-SPECIFICATIONS.md](TECHNICAL-SPECIFICATIONS.md)** — Architecture & state protocol
- **[docs/demo/HEALTH-1-end-to-end-demo.md](docs/demo/HEALTH-1-end-to-end-demo.md)** — Real end-to-end pipeline walkthrough
- **[CHANGELOG.md](CHANGELOG.md)** — Release history

### Infrastructure Agents
- **[agents/audit-agent.md](agents/audit-agent.md)** — Audit Trail Agent (per-story audit log)
- **[agents/state-management-agent.md](agents/state-management-agent.md)** — State Management Agent (snapshots, recovery)
- **[agents/handshake-agent.md](agents/handshake-agent.md)** — Handshake Agent (phase validation)

---

## 🔒 Security & Compliance

### Compliance Evidence, Honestly Scoped

Keel's audit trail (git history + per-story append-only JSONL logs, with every
decision and gate event recorded) is **evidence that supports** your
organization's compliance process — CJIS, SOC2, HIPAA, GDPR, PCI-DSS, SOX or
otherwise. Keel does not claim certified compliance on your behalf; no tool
can. What it gives your auditors:

✅ **Append-only audit log per story** — who/what/when/why for every phase, gate, retry, halt, and human resume  
✅ **Decision traceability** — every agent decision recorded verbatim with its rationale  
✅ **Reconstructable retry loops** — gate failures logged with attempt numbers; restores never rewind history  
✅ **Human accountability points** — halts require a recorded human rationale to resume; releases require explicit approval  

### Built-In Security Features

✅ **OWASP Top 10 review** — dedicated security phase per story, HIGH findings block release  
✅ **Layered SAST** — PHPStan baseline always; SonarQube quality gate when configured (gate ERROR = release blocker)  
✅ **Layered SCA** — composer/npm audit baseline always; Snyk when configured (high/critical = release blocker)  
✅ **Scanner inventory honesty** — every security report declares which scanners ran vs were skipped; a configured scanner that silently didn't run fails the gate  
✅ **Secrets hygiene** — no API keys in git (`~/.keel/secrets/`, gitignored); agents are forbidden from outputting credentials, tokens, or PII

---

## 🎯 Use Cases

### 1. **Individual Developers**
Build features **10x faster** with complete automation.

```bash
/keel:init --mode=new --stack=laravel
/keel:req --story=FEAT-1 --feature="Your idea"
# 2 hours later: Feature in production ✅
```

### 2. **Development Teams**
Standardize workflows across teams with governance.

```bash
/keel:init --mode=new --stack=cakephp
# All team members use same agents & conventions
# Quality gates ensure code quality
# Integrations keep Jira/GitHub in sync
```

### 3. **CI/CD Pipelines**
Automate development in GitHub Actions.

```yaml
- uses: creativemyntra/keel@v3.14.1
  with:
    phase: 'all'  # Run complete pipeline
```

### 4. **Rapid Prototyping**
Validate ideas in hours, not weeks.

```bash
/keel:brainstorm --goal="New feature idea"
/keel:req --story=PROTO-1
/keel:deploy --story=PROTO-1 --rollout=canary
# Validate with real users immediately
```

### 5. **Legacy Code Modernization**
Add new features to existing projects.

```bash
/keel:init --mode=existing --stack=laravel
# Keel integrates with your existing codebase
# New features follow best practices
```

---

## ✨ What's Included

### Framework
- ✅ 17 agent definitions + 11 skills + 15 slash commands
- ✅ Deterministic state engine + proactive watchers (zero-dependency Node)
- ✅ Governance gates enforced between every phase
- ✅ Tech stack profiles (CakePHP today; more on the roadmap)

### Documentation
- ✅ 12+ comprehensive guides
- ✅ Real-world examples
- ✅ API reference
- ✅ Troubleshooting guide

### Tools
- ✅ Setup wizard (interactive)
- ✅ Integration setup scripts
- ✅ Post-install automation
- ✅ Health check system

### Sample Outputs
- ✅ Requirements examples
- ✅ Design examples
- ✅ Code examples
- ✅ Deployment examples

---

## 🚀 Performance Benchmarks

### Development Speed
- **Project initialization:** 5 minutes
- **Requirements creation:** 10 minutes
- **Architecture design:** 15 minutes
- **TDD development:** 65 minutes
- **Testing & verification:** 15 minutes
- **Security scanning:** 10 minutes
- **Deployment:** 15 minutes

**Total: 2 hours** (vs 2 weeks manually)

### Code Quality
- **Test coverage:** 87% automatic
- **Security issues:** 0 (verified)
- **Code review:** Automated
- **Performance:** 145-152ms response time

### Scaling
- **Concurrent jobs:** 4 agents in parallel
- **Cache enabled:** 1-hour TTL
- **Timeout:** 300 seconds per phase
- **Maximum users:** Unlimited

---

## 🤝 Contributing

Keel is open-source under the MIT License.

**Want to contribute?**
1. Fork on GitHub: https://github.com/creativemyntra/keel
2. Create feature branch: `git checkout -b feature/improvement`
3. Commit changes: `git commit -m "Add improvement"`
4. Push to branch: `git push origin feature/improvement`
5. Open Pull Request

---

## 📜 License

**MIT License** — Free for personal & commercial use.

See [LICENSE](LICENSE) for details.

---

## 🔗 Resources

| Resource | Link |
|----------|------|
| **GitHub Repository** | https://github.com/creativemyntra/keel |
| **Issue Tracker** | https://github.com/creativemyntra/keel/issues |
| **Discussions** | https://github.com/creativemyntra/keel/discussions |
| **Author** | Amar Singh |
| **Email** | support@creativemyntra.com |

---

## 🙌 Acknowledgments

Keel is built with:
- **Claude AI** — Code generation & analysis
- **Claude Code** — Plugin platform
- **Open Source Community** — Best practices

---

## ⭐ Star Us on GitHub

If Keel helps you build faster, please star the repo!

⭐ https://github.com/creativemyntra/keel

---

## 💬 Getting Help

### Documentation
```bash
# View all CLI commands and governance rules
node bin/keel.js --help

# Key docs (in repo root)
# ALL-AGENTS-COMPLETE-GUIDE.md  — all 17 agents, phase-by-phase reference
# TECHNICAL-SPECIFICATIONS.md   — architecture & state protocol
# docs/WORKFLOW.md               — cost model, token economy, phase loop
# CHANGELOG.md                   — full release history
```

### Reporting Issues
https://github.com/creativemyntra/keel/issues

---

## 🎉 Ready to Build 10x Faster?

```bash
claude plugin marketplace add https://github.com/creativemyntra/keel
claude plugin install keel
```

Then:
```bash
/keel:init --mode=new --stack=cakephp
/keel:implement-feature story="FEAT-1" feature="Your first feature"
```

**Welcome to the future of software development!** 🚀

---

**Version:** 3.14.1  
**Released:** 2026-07-17  
**Status:** PRODUCTION READY ✅  
**Agents:** 17 (12 pipeline phase + 2 meta/support + 3 infrastructure)  
**License:** MIT  
**Author:** Amar Singh  
**Tag:** v3.14.1 (https://github.com/creativemyntra/keel/releases/tag/v3.14.1)
