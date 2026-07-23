# Token & Dev-Time Optimization Roadmap

**Filed:** 2026-07-22
**Origin:** Post-audit remediation plan (forensic audit July 2026)
**Status:** Planning — not yet in sprint backlog

---

## Background

Keel v3.16.2 post-audit estimated baselines:
- Feature story: ~14 agent spawns, ~1.2M tokens/story
- Defect story: ~5 agent spawns, ~400k tokens/story

Main cost drivers: full context reload per phase, cold prescan at phase 8, pipeline idle gaps
between phases.

Main dev-time drivers: sequential phase gating with no overlap, manual CodeGraph rebuilds,
cold E2E Playwright runs after QA completes.

These are estimates — T1-1 (per-story token tracking) must establish real numbers before
optimizations can be measured.

---

## Tier 1 — Token Reduction

### T1-1: Per-story token tracking dashboard
**What:** The `tokens_used` optional field was added to `agent-output-schema.json` in v3.16.3.
Parse it in `keel-state.cjs` and surface per-phase and per-story totals in `keel-dashboard.cjs`.
**Why:** No real cost baseline exists. Cannot measure savings without instrumentation.
**Effort:** S
**Impact:** Enables all other Tier 1 work; surfaces the biggest token consumers.
**Status:** Schema field added in v3.16.3.

### T1-2: Auto-rebuild CodeGraph on commit
**What:** Add a git post-commit hook (`scripts/keel-post-commit.cjs`) that runs
`build-codegraph.cjs` incrementally after each commit. Seed the hook from `keel-init.cjs`.
**Why:** A stale CodeGraph forces solution-architect and software-engineer to fall back to
full-tree grep for impact analysis, which consumes 3–5x more tokens than a targeted impact
slice.
**Effort:** S
**Impact:** Medium — eliminates a consistent, avoidable token waste path on every story.

### T1-3: Context slice logging
**What:** Each phase agent logs which source files it actually loaded (not just which it was
told to load) in the `artifacts` field of its phase output. Cross-reference against
`context_budget_files` to detect violations.
**Why:** Unknown whether the 6-file cap is being respected. Violations could account for the
majority of per-phase token cost.
**Effort:** M
**Impact:** High — visibility into the largest single token consumer.

### T1-4: Haiku for TRIVIAL handshake gates (explicit model column)
**What:** Update pipeline phases table and handshake agent spec to explicitly use haiku for
TRIVIAL-tier handshakes. Update the orchestrator decision table row.
**Why:** TRIVIAL-tier gates (jira intake verification, trivial diffs with no code-behavior
change) currently default to sonnet if the orchestrator does not explicitly downgrade.
Roughly 25% of handshake gates qualify as TRIVIAL.
**Effort:** XS
**Impact:** ~15% reduction in gate token cost across all stories.
**Status:** Done in v3.16.3 (explicit Model column added to pipeline phases table).

---

## Tier 2 — Dev-Time Reduction

### T2-1: E2E author-mode overlap (KEEL-R14)
**What:** Spawn `keel:e2e-engineer --mode=author` in parallel with phase 6 (QA). The author
invocation writes Playwright specs to their target paths but does NOT run tests and does NOT
write the phase-7 output file. Once phase 6 PASS is confirmed, invoke
`keel:e2e-engineer --mode=execute` to run the specs and write the real phase-7 output.
**Why:** Phase 7 currently starts cold after phase 6 PASS. Overlapping saves the test-authoring
time (typically 15–20 min for a medium feature story).
**Effort:** M
**Impact:** ~15 min per feature story on average.
**Status:** Documented in orchestrator.md as KEEL-R14. Not yet automated.

### T2-2: Security/docs overlap (KEEL-R14)
**What:** Spawn `keel:technical-writer --mode=draft` in parallel with phase 8 (security). The
draft invocation writes API docs/changelog/README updates to their real target paths but does
NOT write the phase-9 output file. Once phase 8 PASS is confirmed, invoke
`keel:technical-writer --mode=finalize` to reconcile the draft against phase-8 findings and
write the real phase-9 output.
**Why:** Phase 9 currently starts cold after phase 8 PASS. Overlapping saves the documentation
drafting time (typically 10–15 min).
**Effort:** M
**Impact:** ~10 min per story.
**Status:** Documented in orchestrator.md as KEEL-R14. Not yet automated.

### T2-3: Prescan pre-warming at phase 5
**What:** Trigger `keel-state.cjs prescan` as a background Bash job at the END of phase 5
(software-engineer completes), not cold at phase 8.
**Why:** The prescan runs `composer audit` / `npm audit` / PHPStan. Starting it during phases
6–7 means the security-engineer inherits an already-warm result instead of waiting 2–3 minutes
for scanners to execute before it can begin its review.
**Effort:** S
**Impact:** ~3 min per story, every story.

### T2-4: Defect-scope auto-detection from Jira ticket type
**What:** In `keel:orchestrator` jira-entry mode, read the `issue_type` field from the Jira
API response. If the type is Bug or Defect, auto-initialize with `--scope defect` without
asking the human.
**Why:** Currently requires the developer to manually pass `--scope defect`. Most bugs arrive
from Jira with the Bug type already set — auto-detection eliminates one round-trip question
per fix.
**Effort:** S
**Impact:** Removes ~5 min of friction per bug fix; prevents accidental feature-scope runs
on bug tickets.

### T2-5: Parallel pipeline suggestion automation
**What:** When the orchestrator detects two or more ready stories whose CodeGraph reverse-
dependency sets do not overlap, proactively suggest `/keel:parallel` and generate the exact
command with the story IDs.
**Why:** Multi-story parallelism is the highest-throughput lever available but requires the
developer to recognize the opportunity themselves. Surfacing it proactively removes that
friction.
**Effort:** M
**Impact:** High — doubles throughput when two independent stories are pending, with no
additional token cost per story.

---

## Tier 3 — Infrastructure

### T3-1: NCIC/LEID/HART pattern formats (Forseti request)
**What:** File a formal request for NCIC number, LEID, HART case ID, and HART subject ID
regex formats. Add them to `config/cjis-patterns.json` and remove the BLOCKER comment.
**Why:** The gate is currently BLIND to NCIC numbers, LEIDs, and HART identifiers — the
placeholder patterns match nothing in production. Until real formats are supplied, the gate
provides partial coverage only, and every phase-8 security report must note this gap.
**Effort:** External dependency (Forseti team)
**Impact:** Critical for CJIS compliance completeness — this is a legal/compliance gap, not
an optimization.

### T3-2: Additional stack profiles
**What:** Add `stack-profiles/node.md`, `stack-profiles/django.md`, `stack-profiles/rails.md`,
`stack-profiles/laravel.md`. Each profile defines the framework's conventions for the
solution-architect and software-engineer phases (routing, ORM, auth, testing, CLI tooling).
**Why:** Keel v3.x supports only CakePHP. The keel-detect-stack script blocks non-PHP
manifests (Node/Django/Rails) from proceeding without a real stack profile. Adding profiles
is the work required to unlock those stacks.
**Effort:** L per profile (each needs validation against real projects)
**Impact:** Unlocks the multi-stack market; required for Node, Django, Rails, and Laravel
projects to get correct AI-SDLC guidance.

### T3-3: Screenshot OCR for CJIS gate
**What:** Integrate a lightweight OCR pass (e.g. Tesseract via Bash) on Playwright screenshots
before they are stored in `docs/e2e-evidence/`. Run the OCR text output through the CJIS gate.
**Why:** The current gate is text-only. Screenshots of CJIS-adjacent application UIs could
expose PII without any gate interception. G-10 notes this gap; this work closes it.
**Effort:** L
**Impact:** Closes the screenshot scanning gap noted in G-10.

### T3-4: Clean npm artifact packaging
**What:** Add a `.npmignore` that excludes `dev-history/`, `audit/`, `playwright-report/`,
`tests/fixture-app/`, `docs/reports/`, `docs/e2e-evidence/` from the published npm package.
**Why:** The current marketplace.json uses `source: "."` which ships the full development
repo. The published npm package should contain only the plugin files needed at runtime
(~5 MB target, vs ~50+ MB for the full repo).
**Effort:** S
**Impact:** Better developer experience, faster install, cleaner separation of dev artifacts.

### T3-5: Per-story cost estimation in /keel:preview
**What:** Have `/keel:preview` estimate token cost for the planned run based on story scope,
detected stack, economy settings, and CodeGraph node count.
**Why:** Developers have no cost expectation before running. Surprises at 1.5M tokens/story
erode trust. A pre-run estimate lets teams budget and choose economy settings intentionally.
**Effort:** M (requires T1-1 real baseline data first)
**Impact:** High for adoption — predictable cost enables business cases and reduces surprises.

---

## Recommended Priority Order

1. **T1-1** — establish real token baselines (prerequisite for measuring all others)
2. **T3-1** — NCIC/LEID/HART patterns (legal/compliance gap, external dependency to start now)
3. **T1-4** — explicit haiku tiering (done in v3.16.3)
4. **T1-2** — auto CodeGraph rebuild (low effort, eliminates a consistent waste path)
5. **T2-4** — defect-scope auto-detection (low effort, removes per-bug friction)
6. **T3-4** — clean npm artifact (low effort, improves install experience)
7. **T2-1 + T2-2** — KEEL-R14 overlaps (medium effort, real wall-clock savings per story)
8. **T2-3** — prescan pre-warming (low effort, consistent time saving)
9. **T3-2** — stack profiles (high effort, high impact for multi-stack market)
10. **T1-3 + T2-5 + T3-3 + T3-5** — later tiers after baselines are established
