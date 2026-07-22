# Keel AI-SDLC Framework v3.16.3

**Production-Ready AI-SDLC Plugin for Claude Code**

Automate your entire development lifecycle with 15 specialized AI agents across a 10-phase pipeline.  
From ideation to production deployment in **2 hours** (vs 2 weeks manually).

---

## âš¡ Quick Start (30 seconds)

```bash
# 1. Install the plugin (marketplace)
claude plugin marketplace add https://github.com/creativemyntra/keel
claude plugin install keel

# 2. Verify installation
claude plugin list
# â†’ keel v3.16.3 âœ…

# 3. Initialize your project
/keel:init --mode=new --stack=cakephp

# 4. Run the full 10-phase pipeline (recommended)
/keel:implement-feature story="FEAT-1" feature="Your feature"

# â€” or step through phases individually â€”
/keel:req --story=FEAT-1 --feature="Your feature"  # Phase 2: BA requirements + ACs
/keel:design --story=FEAT-1                         # Phases 3-4: UI design + architecture
# (software-engineer phase 5 runs automatically â€” code + unit tests)
/keel:test --story=FEAT-1 --coverage-target=85      # Phase 6: QA + full AC traceability
/keel:e2e-test --story=FEAT-1                       # Phase 7: Playwright E2E + screenshots
/keel:sec --story=FEAT-1                            # Phase 8: OWASP + dependency audit
/keel:release-check --story=FEAT-1                  # Phases 9-10: docs + go/no-go verdict
/keel:deploy --story=FEAT-1 --rollout=canary        # Deploy after release-manager approval
```

**Done!** Your feature is in production. âœ…

---

## ðŸ“‹ What is Keel?

**Keel** is a complete AI-SDLC (Artificial Intelligence Software Development Lifecycle) framework integrated with Claude Code as a plugin.

It automates the entire software development process using **15 specialized autonomous agents**:

**Pipeline Phase Agents (10):**
| Phase | Agent | Role |
|-------|-------|------|
| 1 | **product-owner** | Requirements intake â€” proposals only; the human confirms ACs (or `/keel:from-jira` transcribes the ticket) |
| 2 | **business-analyst** | Functional spec, data flows, edge cases |
| 3 | **ui-designer** | UI/UX design â€” screen flows, design spec + HTML mockup for every user-facing AC |
| 4 | **solution-architect** | Architecture, design, technical risk |
| 5 | **software-engineer** | Production code + unit tests â€” coverage â‰¥ 80% on changed lines |
| 6 | **qa-engineer** | AC-to-test mapping, integration tests, error paths |
| 7 | **e2e-engineer** | Playwright browser E2E tests with screenshot evidence |
| 8 | **security-engineer** | OWASP, threat model, dependency audit |
| 9 | **technical-writer** | Docs, changelog, runbook |
| 10 | **release-manager** | Go/no-go decision, deployment plan |

**Meta & Support Agents (2):**
| Agent | Role |
|-------|------|
| **orchestrator-agent** | Routes work, sequences phases, enforces gates |
| **scrum-master-agent** | Sprint ceremonies, velocity (human-invoked only, never in the pipeline) |

**Infrastructure Agents (3):**
| Agent | Role |
|-------|------|
| **handshake-agent** | Adversarial phase gate â€” verifies claims by *executing* them (runs the tests, checks coverage first-hand) |
| **state-management-agent** | Operates the deterministic state engine (init, status, snapshots, restore) |
| **audit-agent** | Forensics & audit queries over the per-story append-only JSONL log |

Mechanical work (schema validation, gating, attempt counting, audit appends,
snapshots) is done by a zero-dependency **state engine**
(`scripts/keel-state.cjs`) â€” agents spend tokens on judgment only.

### âœ¨ Key Features

âœ… **15 Specialized Agents** â€” 10 pipeline phase + 2 meta/support + 3 infrastructure agents  
âœ… **10-Phase Pipeline** â€” dedicated UI design (3), code + unit tests in one phase (5), and Playwright E2E (7) phases; defect express lane runs 1â†’5â†’6â†’8  
âœ… **Deterministic State Engine** â€” `keel-state.cjs` owns state, gates, retries, audit; zero tokens on clerk work  
âœ… **File-Based Agent Memory** â€” phases share context via `.keel/state/`, committed to git  
âœ… **Execution-Verified Gates** â€” the handshake gate re-runs tests instead of trusting claims (anti-hallucination)  
âœ… **Bounded Retry Loops** â€” 3 attempts per phase, then HALT + Slack escalation; resume requires a recorded human decision  
âœ… **Cross-Story Memory with Writeback** â€” every defect RCA becomes a lesson in `.keel/memory/lessons.md` (gated, bounded)  
âœ… **Proactive Watchers** â€” hooks warn on coverage drops and shrinking test counts; halted/stale stories surface at session start  
âœ… **Pipeline Dashboard** â€” `keel dashboard` serves a read-only local web view of all stories (loopback-only, auto-refreshing)  
âœ… **Audit Trail** â€” per-story JSONL log supporting your compliance evidence process  
âœ… **Unit Testing in Phase 5** â€” software-engineer writes code and unit tests in one phase; coverage â‰¥ 80% gated before QA  
âœ… **Coverage Gate** â€” â‰¥80% enforced before the QA phase  
âœ… **No Patch Development** â€” defect fixes require an RCA + revert-checked regression test; symptom patches fail the gate  
âœ… **Security Phase** â€” OWASP Top 10 review + layered SAST/SCA: PHPStan & composer audit always, SonarQube & Snyk when configured  
âœ… **Stack: CakePHP 4.4/PHP 8.1** â€” production-proven; multi-stack support in a future release  
âœ… **Optional Integrations** â€” Jira (bundled Atlassian MCP), GitHub, Slack, Playwright  
âœ… **Staged Deployment** â€” canary / blue-green rollout via the release gate  

---

## ðŸ†• What's New in v3.16.3

- **CakePHP-only packaging** — removed all Node/Django/Rails/Laravel references; `keel-detect-stack` now blocks non-PHP manifests rather than warning. `package.json` `files` array now includes `config/` and `stack-profiles/` so the CJIS gate config and stack profile ship with the npm package.
- **CJIS gate deadlock fix** — rewrote `config/cjis-patterns.json` to eliminate a description string that matched the EMAIL regex, causing the gate to block reads/writes of its own config file. Added 3 new allowlist entries (RFC 2606 docs domains, `.local` TLD, npm glob-package notice).
- **Explicit model tiers** — orchestrator pipeline phases table now has a `Model` column; haiku for TRIVIAL-tier handshakes + jira-import, sonnet for all other phase agents and NORMAL/FULL gates.
- **G-10 guardrail hardening** — PostToolUse blocking semantics (alerting/logging only, not prevention) and screenshot scanning limitation documented in `.keel/GUARDRAILS.md`.
- **Memory resilience** — `keel-init.cjs` re-seeds `.keel/memory/lessons.md` and `conventions.md` if absent at session start (prevents ENOENT crash in phase agents).
- **`/keel:preview` command** — new dry-run command shows stack detection, story state, economy settings, pipeline map with model tiers, CJIS gate status, and CodeGraph freshness before committing to a pipeline run.
- **Token optimization roadmap** — `docs/plans/token-devtime-optimization-roadmap.md` filed: 15 items across three tiers (token reduction, dev-time reduction, infrastructure).
- **`agent-output-schema.json`** — optional `tokens_used` field added for per-story cost tracking dashboard (T1-1).

## ðŸ†• What's New in v3.16.2

- **Brainstorm template** -- restored lightweight Handoff Brief section (user story, rough ACs, data entities, external integrations, design-phase risks, complexity estimate) removed during OSS cleanup.
- **OSS cleanup** -- removed stale internal ticket references from brainstorm template and example files.

## ðŸ†• What's New in v3.16.1

- **Prescan hardening** â€” `snyk` scanner now skips with "not applicable" on dirs with no supported project manifest. Previously reported "not configured" on manifest-free repos.
- **Test env isolation** â€” `composer-audit` prescan test strips PATH to system-only entries so it passes on any host regardless of installed tools.
- **Version bump** â€” 3.16.0 â†’ 3.16.1 across `package.json`, `bin/keel.js`, and plugin files.

## ðŸ†• What's New in v3.16.0

- **CJIS Data Classification Gate** â€” `scripts/keel-classify-gate.cjs` + `config/cjis-patterns.json` add an automated data-classification check. The gate runs via `hooks/hooks.json` (wired to `UserPromptSubmit`, `PreToolUse`, and `PostToolUse` stages) and blocks stories that touch CJIS-adjacent data patterns without the required classification annotation. See G-10 in `.keel/GUARDRAILS.md`.
- **`keel-state.cjs security-status` command** â€” prints a human-readable summary of the current CJIS gate status for a story: which patterns matched, which were cleared, and whether the gate passed.
- **All agent specs updated** â€” security-engineer, orchestrator, audit-agent, and handshake-agent updated to reference the classify gate and route CJIS-flagged stories through the mandatory data-classification check.
- **Version bump** â€” 3.15.0 â†’ 3.16.0 across `package.json`, `bin/keel.js`, and plugin files.

## ðŸ†• What's New in v3.15.0

- **10-phase pipeline** â€” `tdd-red` and `tdd-green` removed as separate phases. `software-engineer` (phase 5) now writes production code **and** unit tests in one phase; coverage â‰¥ 80% on changed lines is a hard gate before QA sees the output. Simpler pipeline, fewer spawns, no confusion about who owns tests.
- **Phase renumbering** â€” qa-engineerâ†’6, e2e-engineerâ†’7, security-engineerâ†’8, technical-writerâ†’9, release-managerâ†’10. Defect lane updated to phases [1, 5, 6, 8].
- **Backward-compatible engine** â€” `keel-state.cjs` retains `LEGACY_AGENTS` and reads `manifest.expected_phases` so stories initialized under the old 12-phase schema continue to validate correctly without needing re-initialization.
- **Budget** â€” `DEFAULT_MAX_GATES` reduced from 48 â†’ 40 (10 phases Ã— 3 attempts + overhead).

## ðŸ†• What's New in v3.14.3

- **G-8: Agent identity integrity** â€” handshake gate now HALTs immediately on any schema/enum mismatch that looks like framework-version skew. The gate will never advise a phase agent to relabel its output under a different agent identity to pass validation. Enforced in `agents/handshake-agent.md` and `.keel/GUARDRAILS.md`.
- **G-9: No unverified quantitative baselines in intake** â€” PO briefs must mark all test counts, coverage figures, and performance numbers carried from prior stories as `[BASELINE: ~N â€” verify at phase 2]`. Business Analyst (phase 2) resolves every placeholder by running the actual tool before handing off. Enforced in `agents/product-owner.md`, `agents/business-analyst.md`, and `.keel/GUARDRAILS.md`.
- **Release Manager: framework debt gate** â€” release-manager checklist now requires all open framework improvement tasks from prior stories to be DONE (with commit reference) or explicitly waived by the human before a GO verdict is issued.

## ðŸ†• What's New in v3.14.2

- **Documentation: complete 12-phase workflow** â€” README, TECHNICAL-SPECIFICATIONS.md, ALL-AGENTS-COMPLETE-GUIDE.md, QUICK-START-CLAUDE-CODE.md, and docs/WORKFLOW.md all updated to reflect the full 12-phase/17-agent pipeline (UI Designer, TDD Red/Green, E2E Engineer correctly documented). Stale 8-phase/8-agent references eliminated. Architecture diagram fixed (all Phase Agent columns now show 12). No code or behaviour changes.

## ðŸ†• What's New in v3.14.1

- **Dashboard Host-header allowlist â€” DNS-rebinding hardening (KEEL-105, closes KEEL-104 LOW-1)** â€” `scripts/keel-dashboard.cjs` now validates the `Host` header before any routing. Only the loopback literals `localhost`, `127.0.0.1`, and `[::1]` are accepted (case-insensitive, optional `:port` suffix). Disallowed hosts get `403 Forbidden`; a missing `Host` header gets `400 Bad Request` per RFC 9112 (ADR-004 D-1). Both rejections use a constant plain-text body with `Content-Type: text/plain; charset=utf-8`, `X-Content-Type-Options: nosniff`, and `Cache-Control: no-store` â€” no request data echoed, zero filesystem I/O on the rejection path. Guard runs before routing so the renderer is structurally unreachable on rejection. All KEEL-104 invariants preserved: loopback-only bind, HTML-escaping, `EADDRINUSE` handling, `keel-state.cjs` and `bin/keel.js` byte-unchanged. See [Security posture (ADR-003, ADR-004)](#security-posture-adr-003-adr-004) below.

## ðŸ†• What's New in v3.14.0

- **`keel dashboard` â€” pipeline status web dashboard (KEEL-104)** â€” `node bin/keel.js dashboard [--port=<N>]` serves a local, read-only web view of every story in `.keel/state/` at `http://localhost:7772` (default): story ID, title, scope, current phase by agent name, status badge (COMPLETE / IN PROGRESS / HALTED), and idle time. Auto-refreshes every 30 seconds. Binds to `127.0.0.1` only, performs zero filesystem writes, zero new dependencies. See [Pipeline Dashboard](#pipeline-dashboard) below.
- **`describe` command (v3.13.0)** â€” `node ~/.keel/bin/keel-state.cjs describe <story-id>` prints a human-readable one-page summary of any story: phase names (not numbers), idle time as `Xh Ym` / `Xm Ys`, halted warning, gate-event budget. Exits 0 on success, exits 1 with stderr on missing story. Zero new dependencies. See [State Engine CLI](#state-engine-cli) below.
- **Dedicated UI design phase â€” new `ui-designer` agent (phase 3)** â€” scans existing UI patterns, then produces a Markdown design spec + self-contained HTML mockup for every user-facing AC before architecture begins (no Figma required). The pipeline is now **12 phases**; builds on the v3.13.0 restructure that split development into dedicated code (`software-engineer`), test-authoring (`tdd-red`), test-execution (`tdd-green`), and browser E2E (`e2e-engineer`) phases.
- **Binding pipeline guardrails (`.keel/GUARDRAILS.md`)** â€” governance rules the orchestrator, handshake gate, engineer, ui-designer, and release-manager must obey on every run.

v3.4.0 â†’ v3.12.0 turn the pipeline's promises into enforcement:

- **Smart economy (v3.11.0)** â€” owner-choice file `.keel/economy.yml`, static-first security prescan (clean prescan can replace the security spawn, opt-in), CodeGraph-capped context loading, output caps. See [docs/WORKFLOW.md](docs/WORKFLOW.md).
- **Token economy (v3.10.0)** â€” measured cost model ([docs/WORKFLOW.md](docs/WORKFLOW.md)): tiered gate verification (TRIVIAL/NORMAL/FULL â€” security-sensitive diffs always pay full price), gate-1-lite, and haiku model-tiering for mechanical spawns; trivial defects projected âˆ’50â€“60% tokens.
- **Human roles stay human (v3.8.0)** â€” product-owner and scrum-master agents are out of the automated pipeline; `/keel:from-jira <KEY>` starts development straight from a Jira ticket (transcribed as the AC contract, never rewritten); AI-drafted requirements are proposals the human PO confirms.

- **OS-enforced state integrity (v3.7.0)** â€” atomic manifest writes + OS-level locking (concurrent writes physically can't lose updates), pipeline budgets (gate-event + wall-clock caps with human-resume extension), automated revert-check proving regression tests guard their fixes, byte-identical-retry detection, and an 11-test engine suite (`npm run test:engine`).
- **Layered SAST/SCA scanner stack (v3.6.0)** â€” the security phase runs PHPStan + composer/npm audit always, and SonarQube (quality gate) + Snyk (vuln DB) when configured; the engineer runs the same stack during development (shift-left). Every security report carries a scanner inventory â€” a configured scanner that silently didn't run fails the gate.

- **Deterministic state engine** (`scripts/keel-state.cjs`) â€” schema validation, grounding checks (artifact paths must exist), AC-drift detection, gate/attempt/halt logic, audit appends, snapshots & restore. Cross-platform, zero dependencies.
- **Handshake gate executes claims** â€” "tests pass" is verified by running the suite, not by reading the artifact the audited agent wrote. Adversarial by design.
- **Halt escalation + human resume** â€” 3 failed attempts halt the pipeline, notify Slack (if configured), and surface at every session start until a human resumes with a recorded rationale.
- **Memory writeback loop** â€” defect RCAs must produce a lesson in `.keel/memory/lessons.md` (gated); architect & engineer read lessons before designing/coding; memory is capped so it never becomes a token leak.
- **Proactive watchers** â€” PostToolUse hook warns on coverage drops / shrinking test counts; `/keel:health` sweeps for halted/stale stories, attempt heat-maps, and stale impact graphs.
- **Plan-first, self-auditing software engineer** â€” impact analysis before coding, full test pyramid (unit / integration / Playwright E2E), patch-pattern self-review, revert-checked defect fixes.

**[View Complete Release Notes â†’](CHANGELOG.md)**

---

## ðŸ“¥ Installation

### Method 1: Claude Code Plugin Marketplace (Recommended) â­

```bash
claude plugin marketplace add https://github.com/creativemyntra/keel
claude plugin install keel
```

That's it! The plugin will:
- âœ… Register `/keel:*` commands, 15 agents, and 11 skills
- âœ… Create `~/.keel` configuration directories on first session
- âœ… Be ready to use immediately

**Verify:**
```bash
claude plugin list
# â†’ keel v3.16.3 âœ…
```

### Method 2: npm Global Package (â³ not yet published â€” coming soon)

```bash
npm install -g @amarsingh/keel
```

**Use as command-line tool:**
```bash
keel init --mode=new --stack=cakephp
keel req --story=FEAT-1
keel deploy --story=FEAT-1
```

### Method 3: Docker Container (â³ not yet published â€” coming soon)

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
        uses: creativemyntra/keel@v3.16.2
        with:
          phase: 'init'
          mode: 'new'
          stack: 'cakephp'
      
      - name: Create Requirements
        uses: creativemyntra/keel@v3.16.2
        with:
          phase: 'req'
          story-id: ${{ github.event.pull_request.number }}
      
      - name: Run Tests
        uses: creativemyntra/keel@v3.16.2
        with:
          phase: 'test'
          story-id: ${{ github.event.pull_request.number }}
          coverage-target: '85'
      
      - name: Security Scan
        uses: creativemyntra/keel@v3.16.2
        with:
          phase: 'sec'
          story-id: ${{ github.event.pull_request.number }}
```

---

## ðŸš€ Complete Workflow

### Feature: User Subscription Management

```bash
# â”€â”€â”€ One-command option (recommended) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/keel:init --mode=new --stack=cakephp
/keel:implement-feature story="FEAT-1" feature="User subscription management"
# Orchestrator runs all 10 phases automatically. Done. âœ…

# â”€â”€â”€ Step-by-step (all 10 phases) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

# Phase 1: Product Owner intake (human confirms ACs, or Jira ticket is the source)
/keel:from-jira FEAT-1            # â† if Jira ticket exists, this is the entry point
# â€” or for a new idea:
/keel:req --story=FEAT-1 --feature="User subscription management"

# Phase 2: Business Analyst (10 min)
# (runs inside /keel:req above)
# Produces: docs/requirements/FEAT-1-requirements.md
# Includes: functional spec, data flows, edge cases, business rules

# Phase 3: UI Designer (10 min)
/keel:design --story=FEAT-1
# Scans existing UI patterns â†’ Markdown design spec + self-contained HTML mockup
# Non-visual stories get a documented no-UI determination (skips mockup)
# Produces: docs/design/FEAT-1-mockup.html + design spec

# Phase 4: Solution Architect (15 min)  â† also invoked by /keel:design
# ADR, API contracts, DB schema, component diagram, technical risks
# Produces: docs/design/FEAT-1-design.md

# Phase 5: Software Engineer (25 min)
# (runs via /keel:implement-feature or orchestrator â€” no standalone CLI command)
# Reads the approved design; writes production code AND unit tests
# Gate: all unit tests pass, coverage â‰¥ 80% on changed lines
# Produces: src/Services/SubscriptionService.php + tests/Unit/SubscriptionServiceTest.php, etc.

# Phase 6: QA â€” AC traceability + integration gate (10 min)
/keel:test --story=FEAT-1 --coverage-target=85
# Maps every AC to a passing test; integration tests; error-path validation
# Produces: docs/qa/FEAT-1-qa-report.md

# Phase 7: E2E â€” Playwright browser tests (10 min)
/keel:e2e-test --story=FEAT-1
# Playwright tests for every user-facing flow; screenshot evidence captured
# Blocks release on any E2E failure

# Phase 8: Security (10 min)
/keel:sec --story=FEAT-1
# Consumes prescan.json (composer/npm audit + PHPStan baseline always run)
# OWASP Top 10 review of changed files; 0 HIGH findings required to proceed
# Produces: docs/security/FEAT-1-security-report.md

# Phases 9-10: Technical Writer + Release Manager (10 min)
/keel:release-check --story=FEAT-1
# Phase 9 â€” Technical Writer: updates CHANGELOG, README, runbook, memory
# Phase 10 â€” Release Manager: G-6 version stamp; issues GO or NO-GO with justification

# Deploy (15 min, only after release-manager GO verdict)
/keel:deploy --story=FEAT-1 --rollout=canary
# Canary: 5% â†’ 25% â†’ 100% with monitoring checkpoints; rollback auto-triggers on error spike

# TOTAL: ~2 hours end-to-end  (vs 2 weeks manually âš¡)
```

---

## ðŸ“Š Results

### Development Metrics

| Metric | Without Keel | With Keel | Improvement |
|--------|--------------|-----------|-------------|
| Time to Production | 2 weeks | 2 hours | 97.5% faster âš¡ |
| Tests Written | ~20 manual | 9+ auto-generated | 45% more coverage |
| Code Coverage | 60-70% | 87% | +25% |
| Security Issues | Unknown | 0 verified | 100% safe |
| Developer Hours | 80 hours | 2 hours | 40x faster |

### Sample Output

**Requirements Generated:**
```
âœ… 4 user stories
âœ… 4 acceptance criteria (BDD format)
âœ… 4 API endpoints specified
âœ… Database schema designed
```

**Code Generated:**
```
âœ… Subscription.php (Model)
âœ… SubscriptionService.php (Service)
âœ… SubscriptionTest.php (Unit Tests)
âœ… SubscriptionIntegrationTest.php (Integration Tests)
```

**Quality Verified:**
```
âœ… 9 tests passing (100%)
âœ… 87% code coverage
âœ… 0 OWASP violations
âœ… 0 security vulnerabilities (scanner findings, not a compliance attestation)
```

---

## ðŸ“š Available Commands

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
> **UI Designer (phase 3)** runs automatically before architecture â€” it scans
> existing UI patterns and produces a Markdown design spec + HTML mockup for
> every user-facing AC. Non-visual stories get a documented no-UI determination.

### Development

```bash
# Phase 5 â€” software-engineer: production code + unit tests (â‰¥ 80% coverage)
# Runs automatically via /keel:implement-feature or orchestrator
```

### Quality

```bash
/keel:test --story=FEAT-1 --coverage-target=85  # Phase 6: QA â€” AC-to-test mapping + integration gate
/keel:e2e-test --story=FEAT-1                    # Phase 7: Playwright browser E2E + screenshots
/keel:sec --story=FEAT-1                         # Phase 8: OWASP audit + dependency scan
```

### Docs & Release

```bash
/keel:release-check --story=FEAT-1              # Phases 9-10: technical-writer + release-manager go/no-go
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
/keel:impact <Class or file>       # CodeGraph impact analysis â€” blast radius of a change
/keel:health                       # Pipeline health sweep â€” halted/stale stories, memory bounds, coverage trend
/keel dashboard --port=7772        # Read-only pipeline status web dashboard (binds to 127.0.0.1 only)
/keel --version                    # Show version
/keel --help                       # Show all commands
```

---

### Pipeline Dashboard

A read-only local web view of every story in `.keel/state/` â€” it never writes to disk.

```bash
node scripts/keel-dashboard.cjs --port 8080   # run the server directly (flag is space-separated: --port <N>)

# or via the CLI wrapper (the wrapper parses the equals form only):
node bin/keel.js dashboard               # serves http://localhost:7772
node bin/keel.js dashboard --port=8080   # custom port
```

> **Flag syntax:** the server script takes the space-separated form `--port <N>`; the
> `bin/keel.js` wrapper takes `--port=<N>`. Using the wrong form for a surface does not
> error â€” the server silently starts on the default port 7772.

On start it prints `Dashboard: http://localhost:<port>`; stop it with Ctrl-C.

- **Columns:** story ID, title, scope, current phase by agent name (e.g. `Phase 9 â€” Technical Writer`), status badge (COMPLETE / IN PROGRESS / HALTED), idle time â€” sorted most-recently-active first.
- **Auto-refresh:** the page reloads every 30 seconds; a corrupt manifest renders as an error row instead of breaking the sweep.
- **Empty state:** with no stories, the page prompts `Run keel init <story-id> to start.` â€” the server still runs.
- **Port in use:** exits with `Error: port <N> is already in use. Use --port to specify a different port.`

#### Security posture (ADR-003, ADR-004)

- **Loopback-only bind:** the server listens on `127.0.0.1` only â€” it is unreachable from the LAN.
- **Host-header allowlist (DNS-rebinding guard):** every request's `Host` header must be a loopback literal â€” `localhost`, `127.0.0.1`, or `[::1]` â€” matched case-insensitively, with an optional `:port` suffix. A DNS-rebound attacker hostname can never equal a loopback literal, so rebinding requests are rejected before any routing or state read happens.
- **403 rejection contract:** a disallowed `Host` receives `403 Forbidden` with a constant plain-text body (`Content-Type: text/plain; charset=utf-8`), `X-Content-Type-Options: nosniff`, and `Cache-Control: no-store`. No request data is ever echoed back, and the rejection path performs zero filesystem I/O.
- **Missing Host is 400:** a request without a `Host` header receives `400 Bad Request` under the same constant-body header contract â€” it is malformed per RFC 9112, not merely refused (ADR-004 D-1/D-3).
- **Strictly read-only:** only `GET /` is served (anything else is 404); zero filesystem writes; all state-derived output is HTML-escaped; zero new npm dependencies.

---

## ðŸ› ï¸ Supported Tech Stacks

Keel automatically configures conventions for:

- **CakePHP 4.4** (PHP 8.1+)
- **Laravel 10** (PHP 8.1+)
- **Django 4.0+** (Python 3.9+)
- **Ruby on Rails 7.0+**

**Add more stacks:**
```
stack-profiles/
â”œâ”€â”€ cakephp.md
â”œâ”€â”€ laravel.md
â”œâ”€â”€ django.md
â”œâ”€â”€ rails.md
â””â”€â”€ your-framework.md
```

---

## ðŸ”§ Optional: Configure Integrations

Keel works perfectly without any integrations. To configure them, run the
**interactive setup wizard** inside Claude Code:

```
/keel:setup              # step-by-step wizard: Jira, GitHub, Playwright, Slack, SonarQube, Snyk
/keel:setup jira         # one integration at a time â€” set up later, any time
/keel:setup status       # see what's configured
```

Every step offers **Configure now / Use default / Skip (set up later)**, and each
decision is recorded in `~/.keel/config/setup-audit.log`.

| Integration | Default (zero config) | Configure for |
|-------------|----------------------|---------------|
| **Jira** | Bundled Atlassian MCP server â€” OAuth on first use | Instance URL, verified connectivity |
| **GitHub** | `gh` CLI if installed | Default repo, or GitHub MCP server |
| **Playwright** | Bundled Playwright MCP server â€” headless Chromium | Browsers, headed mode, E2E base URL |
| **Slack** | Disabled | Webhook notifications on phase events + pipeline halts |
| **SonarQube** | Disabled (PHPStan SAST baseline always runs) | Quality-gate enforcement in the security phase |
| **Snyk** | Disabled (composer/npm audit SCA baseline always runs) | Vulnerability DB + license checks in the security phase |

Full step-by-step instructions: **[docs/MCP-SETUP.md](docs/MCP-SETUP.md)**.

For CI/Docker (non-interactive), use the shell fallback:

```bash
bash setup-integrations.sh jira|github|slack
```

---

## ðŸ“ Project Structure Created

After running `/keel:init`:

```
your-project/
â”œâ”€â”€ .keel/
â”‚   â”œâ”€â”€ state/<story-id>/            â† Pipeline state (committed to git)
â”‚   â”‚   â”œâ”€â”€ manifest.json            â† Position, attempts, halted flag
â”‚   â”‚   â”œâ”€â”€ NN-<agent>.json          â† One output per phase (agent-output-schema.json)
â”‚   â”‚   â”œâ”€â”€ handoff-log.md           â† Gate decisions (append-only)
â”‚   â”‚   â”œâ”€â”€ audit-log.jsonl          â† Audit trail (append-only)
â”‚   â”‚   â””â”€â”€ snapshots/               â† Full state copies before risky ops
â”‚   â”œâ”€â”€ memory/                      â† Cross-story memory (committed, bounded)
â”‚   â”‚   â”œâ”€â”€ conventions.md           â† Project conventions (â‰¤150 lines)
â”‚   â”‚   â”œâ”€â”€ lessons.md               â† Incident-derived lessons from RCAs (â‰¤30)
â”‚   â”‚   â””â”€â”€ decisions/               â† ADRs
â”‚   â”œâ”€â”€ graph/codegraph.json         â† Dependency graph for impact analysis
â”‚   â””â”€â”€ watch/baseline.json          â† Coverage/test-count baseline (watchers)
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ requirements/                â† Auto-generated requirements
â”‚   â”‚   â”œâ”€â”€ FEAT-1-requirements.md
â”‚   â”‚   â”œâ”€â”€ FEAT-2-requirements.md
â”‚   â”‚   â””â”€â”€ TEMPLATE.md
â”‚   â”œâ”€â”€ design/                      â† Auto-generated designs
â”‚   â”‚   â”œâ”€â”€ FEAT-1-design.md
â”‚   â”‚   â”œâ”€â”€ FEAT-2-design.md
â”‚   â”‚   â””â”€â”€ TEMPLATE.md
â”‚   â”œâ”€â”€ brainstorms/                 â† Idea generation
â”‚   â””â”€â”€ deployment/                  â† Deployment plans
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ Controllers/
â”‚   â”œâ”€â”€ Models/
â”‚   â”œâ”€â”€ Services/
â”‚   â””â”€â”€ ...
â”œâ”€â”€ tests/
â”‚   â”œâ”€â”€ Unit/                        â† Auto-generated unit tests
â”‚   â””â”€â”€ Integration/                 â† Auto-generated integration tests
â”œâ”€â”€ database/
â”‚   â””â”€â”€ migrations/
â”œâ”€â”€ .gitignore                       â† Updated with .keel/secrets/
â”œâ”€â”€ package.json
â”œâ”€â”€ composer.json
â””â”€â”€ ... (framework-specific files)
```

---

## ðŸ“– Documentation

### Installation & Setup
- **[INSTALL.md](INSTALL.md)** â€” Plugin installation (Claude Code, Claude Desktop, local, GitHub Action)
- **[QUICK-START-CLAUDE-CODE.md](QUICK-START-CLAUDE-CODE.md)** â€” Fastest path to a first feature
- **[docs/MCP-SETUP.md](docs/MCP-SETUP.md)** â€” Integration & MCP setup wizard guide (Jira, GitHub, Playwright, Slack)

### Usage & Workflows
- **[docs/WORKFLOW.md](docs/WORKFLOW.md)** â€” Complete workflow, measured cost model (time & tokens), token-economy design
- **[ALL-AGENTS-COMPLETE-GUIDE.md](ALL-AGENTS-COMPLETE-GUIDE.md)** â€” All 15 agents reference
- **[TECHNICAL-SPECIFICATIONS.md](TECHNICAL-SPECIFICATIONS.md)** â€” Architecture & state protocol
- **[docs/demo/HEALTH-1-end-to-end-demo.md](docs/demo/HEALTH-1-end-to-end-demo.md)** â€” Real end-to-end pipeline walkthrough
- **[CHANGELOG.md](CHANGELOG.md)** â€” Release history

### Infrastructure Agents
- **[agents/audit-agent.md](agents/audit-agent.md)** â€” Audit Trail Agent (per-story audit log)
- **[agents/state-management-agent.md](agents/state-management-agent.md)** â€” State Management Agent (snapshots, recovery)
- **[agents/handshake-agent.md](agents/handshake-agent.md)** â€” Handshake Agent (phase validation)

---

## ðŸ”’ Security & Compliance

### Compliance Evidence, Honestly Scoped

Keel's audit trail (git history + per-story append-only JSONL logs, with every
decision and gate event recorded) is **evidence that supports** your
organization's compliance process â€” CJIS, SOC2, HIPAA, GDPR, PCI-DSS, SOX or
otherwise. Keel does not claim certified compliance on your behalf; no tool
can. What it gives your auditors:

âœ… **Append-only audit log per story** â€” who/what/when/why for every phase, gate, retry, halt, and human resume  
âœ… **Decision traceability** â€” every agent decision recorded verbatim with its rationale  
âœ… **Reconstructable retry loops** â€” gate failures logged with attempt numbers; restores never rewind history  
âœ… **Human accountability points** â€” halts require a recorded human rationale to resume; releases require explicit approval  

### Built-In Security Features

âœ… **OWASP Top 10 review** â€” dedicated security phase per story, HIGH findings block release  
âœ… **Layered SAST** â€” PHPStan baseline always; SonarQube quality gate when configured (gate ERROR = release blocker)  
âœ… **Layered SCA** â€” composer/npm audit baseline always; Snyk when configured (high/critical = release blocker)  
âœ… **Scanner inventory honesty** â€” every security report declares which scanners ran vs were skipped; a configured scanner that silently didn't run fails the gate  
âœ… **Secrets hygiene** â€” no API keys in git (`~/.keel/secrets/`, gitignored); agents are forbidden from outputting credentials, tokens, or PII

---

## ðŸŽ¯ Use Cases

### 1. **Individual Developers**
Build features **10x faster** with complete automation.

```bash
/keel:init --mode=new --stack=laravel
/keel:req --story=FEAT-1 --feature="Your idea"
# 2 hours later: Feature in production âœ…
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
- uses: creativemyntra/keel@v3.16.2
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

## âœ¨ What's Included

### Framework
- âœ… 17 agent definitions + 11 skills + 15 slash commands
- âœ… Deterministic state engine + proactive watchers (zero-dependency Node)
- âœ… Governance gates enforced between every phase
- âœ… Tech stack profiles (CakePHP today; more on the roadmap)

### Documentation
- âœ… 12+ comprehensive guides
- âœ… Real-world examples
- âœ… API reference
- âœ… Troubleshooting guide

### Tools
- âœ… Setup wizard (interactive)
- âœ… Integration setup scripts
- âœ… Post-install automation
- âœ… Health check system

### Sample Outputs
- âœ… Requirements examples
- âœ… Design examples
- âœ… Code examples
- âœ… Deployment examples

---

## ðŸš€ Performance Benchmarks

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

## ðŸ¤ Contributing

Keel is open-source under the MIT License.

**Want to contribute?**
1. Fork on GitHub: https://github.com/creativemyntra/keel
2. Create feature branch: `git checkout -b feature/improvement`
3. Commit changes: `git commit -m "Add improvement"`
4. Push to branch: `git push origin feature/improvement`
5. Open Pull Request

---

## ðŸ“œ License

**MIT License** â€” Free for personal & commercial use.

See [LICENSE](LICENSE) for details.

---

## ðŸ”— Resources

| Resource | Link |
|----------|------|
| **GitHub Repository** | https://github.com/creativemyntra/keel |
| **Issue Tracker** | https://github.com/creativemyntra/keel/issues |
| **Discussions** | https://github.com/creativemyntra/keel/discussions |
| **Author** | Amar Singh |
| **Email** | support@creativemyntra.com |

---

## ðŸ™Œ Acknowledgments

Keel is built with:
- **Claude AI** â€” Code generation & analysis
- **Claude Code** â€” Plugin platform
- **Open Source Community** â€” Best practices

---

## â­ Star Us on GitHub

If Keel helps you build faster, please star the repo!

â­ https://github.com/creativemyntra/keel

---

## ðŸ’¬ Getting Help

### Documentation
```bash
# View all CLI commands and governance rules
node bin/keel.js --help

# Key docs (in repo root)
# ALL-AGENTS-COMPLETE-GUIDE.md  â€” all 15 agents, phase-by-phase reference
# TECHNICAL-SPECIFICATIONS.md   â€” architecture & state protocol
# docs/WORKFLOW.md               â€” cost model, token economy, phase loop
# CHANGELOG.md                   â€” full release history
```

### Reporting Issues
https://github.com/creativemyntra/keel/issues

---

## ðŸŽ‰ Ready to Build 10x Faster?

```bash
claude plugin marketplace add https://github.com/creativemyntra/keel
claude plugin install keel
```

Then:
```bash
/keel:init --mode=new --stack=cakephp
/keel:implement-feature story="FEAT-1" feature="Your first feature"
```

**Welcome to the future of software development!** ðŸš€

---

**Version:** 3.16.2  
**Released:** 2026-07-21  
**Status:** PRODUCTION READY âœ…  
**Agents:** 15 (10 pipeline phase + 2 meta/support (scrum-master, product-owner-standalone-use) + 3 infrastructure (handshake, audit, state-management))
**License:** MIT  
**Author:** Amar Singh  
**Tag:** v3.16.2 (https://github.com/creativemyntra/keel/releases/tag/v3.16.2)
