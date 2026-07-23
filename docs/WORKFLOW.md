# Keel -- Complete Workflow, Cost Model, and Token Economy

**As of v3.16.4.** Numbers marked *measured* come from the first full pipeline
live test (KEEL-101, 2026-07-09 -- see
[docs/audit/2026-07-09-e2e-pipeline-live-test.md](audit/2026-07-09-e2e-pipeline-live-test.md)).
Nothing here is estimated where a measurement exists.

---

## 1. One-time setup

1. **Install the plugin.** On the next session start, the `keel-init.cjs` hook
   installs the state engine to `~/.keel/bin/` (refreshed every session, so
   plugin upgrades propagate) and scaffolds `~/.keel/config` + `secrets`.
2. **`/keel:setup`** (optional, 6 steps) -- Jira, GitHub, Playwright, Slack,
   SonarQube, Snyk. Zero-config defaults work; these add power.
3. **`/keel:init`** in the project -- scaffolds `.keel/memory/` and builds the
   CodeGraph for impact analysis.

Requirements: Node >= 18 (hard requirement -- engine, watchers, Playwright MCP).
No bash needed, including on Windows.

## 2. Per story -- entry x scope

| | Jira ticket exists | No ticket |
|---|---|---|
| **Entry** | `/keel:from-jira <KEY>` -- the ticket IS the requirements; BA **transcribes** ACs verbatim, never invents. No AI product-owner. | BA drafts ACs as a **proposal**; the human PO confirms before anything runs. PO agent only on explicit request. |
| **Scope** | Ticket type Bug/Defect -> **defect lane** (phases 1->5->6->8) | **feature lane** (phases 1-10, incl. dedicated UI design, E2E, and security phases) |

Human roles stay human: product-owner and scrum-master agents are never part
of the automated pipeline.

## 3. The phase loop

```
orchestrator -- engine: init <story> --scope <s>   (budget: 40 gates / 72h)
     |
     v  (per phase in scope)
phase agent -- reads: previous output + phase-1 ACs + conventions/lessons
     |         does the work; engineer = plan -> impact analysis -> TDD ->
     |         test pyramid (unit/integration/Playwright) -> scanners
     |         shift-left -> revert-check (defects) -> self-audit
     |         writes NN-<agent>.json + artifacts; self-validates via engine
     v
gate ------ phase 1: gate-1-lite -- orchestrator runs engine validate +
     |      spot-checks citations itself (no gate spawn; intake makes no
     |      executable claims)
     |      phases >= 2: handshake agent -- picks a verification depth tier:
     |        TRIVIAL  docs/strings/config, <=10 lines, nothing sensitive
     |                 -> engine validate + regression test only
     |        NORMAL   other code changes -> changed-area tests + regression;
     |                 full suite once per story (phase-6 gate)
     |        FULL     auth/payments/data/security paths, >100 lines, new
     |                 deps, security & release gates -> re-execute everything
     |      then judgment: RCA-vs-diff, patch patterns, scanner inventory
     v
engine gate -- PASS -> next phase in scope (attempts reset)
               FAIL -> retry with failure findings (max 3; byte-identical
                      retry = recorded protocol violation)
               3x / budget breach -> HALT -> Slack (if configured) + surfaced
                      at every session start -> only a HUMAN resume continues
                      (rationale recorded verbatim)
```

**Human touchpoints -- the only ones, by design:** AC confirmation (full lane),
explicit waivers (e.g. coverage without a driver), halt resumes, deploy
approval. Every one is recorded verbatim in the story's append-only
`audit-log.jsonl`, committed to git -- that file is your compliance evidence.

## 4. Cost model -- time and tokens

### Measured (KEEL-101, defect lane, 2-line fix, before v3.10 optimizations)

| Metric | Value |
|---|---|
| Agent spawns | 8 (4 phase + 4 gates incl. one waiver re-gate) |
| Subagent tokens | ~330k (~50k per spawn) |
| Wall-clock | ~1h54m including the human-waiver wait |
| Human time | ~2 minutes (one waiver decision) |

Where it went: ~50% gates re-executing everything, ~30% phase work,
~20% per-spawn spec/context reading.

### Projected after v3.10 (same story)

| Lever | Saving |
|---|---|
| Gate-1-lite (no intake-gate spawn) | -1 spawn, ~-50k |
| TRIVIAL-tier gates 4 and 5 (string-only diff) | ~-60k of re-execution |
| Haiku on mechanical spawns (intake, TRIVIAL gates, state/audit agents) | ~4-5x cheaper on those spawns |
| **Combined** | **~330k -> ~130-160k tokens (-50-60%)** for trivial defects; FULL-tier stories intentionally unchanged |

### Feature lane (projection)

~16 spawns, ~600-800k tokens, ~4-6h wall-clock, ~10-15 human minutes.
Manual equivalent: dev + QA + security review + audit paperwork = half a day
to two days of *team* time.

## 5. Token-economy design (why it costs what it costs)

1. **Clerk work is free.** All state, schema validation, gating, attempts,
   budgets, audit, snapshots, revert-check live in a zero-dependency Node
   engine -- zero LLM tokens. Agents spend tokens on judgment only.
2. **Paths, never contents.** Agents pass file paths; inlining content into
   phase outputs is a protocol violation. Findings capped at 15 entries.
3. **The orchestrator stays flat.** A pipeline ledger (<=8 lines x <=25 words)
   is its only memory of completed phases.
4. **Memory is bounded.** conventions.md <=150 lines, lessons.md <=30 entries,
   enforced by `memory-check` -- cross-story memory can't become a compounding
   leak.
5. **Verification is the price of trust -- spent where it matters.** Depth
   tiers scale gate cost to diff risk; security-sensitive changes always pay
   full price. The residual risk of TRIVIAL tier is documented and bounded by
   the once-per-story full-suite gate.
6. **Right model for the job.** Mechanical agents (state, audit) pin
   `model: haiku`; the orchestrator requests the fast model for
   transcription-grade spawns. Judgment agents stay on the strong model.
7. **Cache-friendly structure.** In Claude Code, prompt caching is
   harness-automatic (cached input is ~90% cheaper) -- the plugin's job is to
   be cacheable: agent specs and stack profiles stay byte-stable between
   releases, and a story's phases run back-to-back inside the ~5-minute cache
   TTL. An idle story re-reads everything cold; a batched one doesn't.
8. **Static-first security.** The engine's `prescan` runs every applicable
   scanner (composer/npm audit, PHPStan, Snyk, SonarQube) deterministically
   BEFORE the security agent is spawned and records an honest inventory to
   `prescan.json`. The agent consumes results instead of re-running tools --
   and with the owner opt-in below, a clean prescan on a trivial diff replaces
   the spawn entirely.
9. **CodeGraph-targeted context.** No agent loads the whole `src/` tree. The
   dependency graph's impact set (capped at `context_budget_files`, default 6)
   defines what the architect/engineer read; QA reads only changed files +
   their tests; the writer processes one file at a time. Grep pre-pass is the
   fallback on stacks the graph doesn't cover yet.
10. **Output discipline.** Reports are data, not essays: BA analysis <= 800
    words, security report <= 500 words of tables, phase JSON is the
    machine-readable contract everywhere. Writers edit files directly instead
    of narrating intentions.

## 5b. Owner choices -- `.keel/economy.yml` (committed, team-shared)

Every aggressive lever is a recorded choice, not a silent default. The
orchestrator logs each economy decision in its ledger.

| Knob | Default | What it does |
|---|---|---|
| `model_tiering` | `true` | haiku for transcription-grade spawns (intake, TRIVIAL gates) |
| `static_first_security` | `true` | engine `prescan` before the security phase; agent consumes results |
| `security_skip_on_clean` | **`false` (opt-in)** | clean prescan + TRIVIAL diff replaces the security spawn; never applies to auth/payments/data/validation diffs or prescan findings |
| `context_budget_files` | `6` | max source files any agent loads (CodeGraph-selected) |
| `output_caps` | `true` | report length caps enforced |

## 6. What the pipeline guarantees (and what it doesn't)

Guaranteed by code: single-writer locked state, atomic writes, bounded
retries, pipeline budgets, halt-until-human-resume, append-only audit +
handoff logs that survive restores, AC anti-drift, identical-retry detection.

Guaranteed by adversarial process (strong, not absolute): claims verified by
re-execution, RCA-vs-diff cross-check, scanner-inventory honesty, no-patch
enforcement via revert-check.

Explicitly NOT claimed: certified compliance (the audit trail is *evidence
supporting* your process), perfect RCA-quality judgment (best-effort, says so),
and coverage numbers that were never measured (waiver path instead of
fabrication).
