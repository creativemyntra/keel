# Keel Pipeline Guardrails

Binding rules for every agent and every gate in this repository. Added
2026-07-16 at the human owner's direction after the v3.14.0 run. These rules
override convenience. A gate that cannot prove compliance FAILS the phase.

## G-1 - Open-item classification (blocking / non-blocking)

Every issue, bug, finding, or follow-up task discovered in any phase MUST be
classified at the moment of discovery as exactly one of:

- **BLOCKING** -- halts the pipeline at the current gate. The story does not
  advance until it is fixed or the human owner explicitly waives it.
- **NON-BLOCKING (small)** -- recorded in the discovering phase's output file
  with an owner phase and a due date, carried forward visibly through every
  subsequent gate, and listed in the release manager's open-item ledger.

An unclassified open item is itself a gate failure. Nothing is silently
dropped, deferred without a record, or "left for QA to catch."

## G-2 - Human approval gate

The following ALWAYS halt and wait for explicit user approval -- no agent or
gate may self-approve, infer approval, or proceed on a default:

- Releasing, deploying, committing, pushing, tagging, or merging branches
- Waiving a BLOCKING item or shipping with any open BLOCKING item
- Carrying NON-BLOCKING items into a release (the release summary must list
  them and the human GO covers exactly that list)
- Changing scope, acceptance criteria, or the output schema mid-story
- Relaxing any gate criterion, retrying past `max_attempts`, or restoring state
- Deleting or rewriting any state file, audit log, or memory entry

## G-3 - No leakage

- **Context**: agents exchange state ONLY through gate-validated phase output
  files (`.keel/state/<story>/NN-agent.json`). No side channels, no verbal
  carry-over, no reading another story's state to shortcut work.
- **Secrets**: no tokens, credentials, API keys, or environment-variable
  values in any phase output, finding, evidence file, log, or commit. Quote
  only runner output and file paths.
- **Claims**: an unverified claim must not propagate. Gates re-execute
  executable claims; a claim that cannot be re-executed is labeled as such in
  the handoff log, never passed forward as fact.

## G-4 - No manipulation (evidence-or-silence)

Every claim of a test run, scan, coverage number, or verification carries:
(1) the file/suite confirmed to exist on disk, (2) the exact command executed
this session, (3) the verbatim output. Missing any of the three -> the claim is
omitted and reported as "not run." Fabricating a result, naming a nonexistent
suite, relaxing an assertion, or skipping a failing test is a gate FAIL,
costs an attempt, and is recorded permanently in the audit log.

## G-5 - Complete before handoff (definition of done per phase)

A phase hands off ONLY when every acceptance criterion in the ticket that the
phase owns is fully addressed -- implemented, designed, or explicitly marked
out-of-scope-for-this-phase with the owning phase named:

- **ui-designer (3)**: every user-facing AC has a design spec and mockup
  coverage before the architect sees it.
- **software-engineer (5)**: every AC implemented, unit-tested (coverage >= 80%
  on changed lines), and self-reviewed before QA sees it. Partial work is a
  gate FAIL, not a carry-forward.
- **qa (6), e2e (7)**: every AC mapped to executed, passing tests before
  the next phase.
- The gate rejects any handoff where an AC is unaddressed and unexplained.

## G-6 - Commits, versioning, deployment

- Agents NEVER run git commit/push/tag/merge or any deploy action. The human
  owner executes releases, on their explicit instruction only.
- Version stamping checklist (all or none -- missing any = BLOCK release):
  1. package.json
  2. bin/keel.js (VERSION constant + header comment)
  3. .claude-plugin/plugin.json
  4. .claude-plugin/marketplace.json
  5. README.md (header, footer, Quick Start badge, uses: refs)
  6. INSTALL.md (uses: references)
  7. QUICK-START-CLAUDE-CODE.md (header + version line)
  8. ALL-AGENTS-COMPLETE-GUIDE.md (header + version refs)
  9. TECHNICAL-SPECIFICATIONS.md (header + new history table row)
  10. docs/MAINTAINER-HANDOFF.md (header + Current Version field)
  11. CHANGELOG.md (new [X.Y.Z] entry must exist)
  Automated verification (enforced by git pre-commit + pre-push hook):
  node scripts/keel-version-audit.cjs
  Exit 0 = PASS, exit 1 = BLOCK. Must pass before any commit or push.
  Historical exemptions (CHANGELOG headers, version table rows, introduced-in notes)
  are handled automatically by the script.

  Manual verification command (run before releasing, zero output = clean):
  grep -rn "OLD_VERSION" package.json bin/keel.js .claude-plugin/ README.md
    INSTALL.md QUICK-START-CLAUDE-CODE.md ALL-AGENTS-COMPLETE-GUIDE.md
    TECHNICAL-SPECIFICATIONS.md docs/MAINTAINER-HANDOFF.md CHANGELOG.md
- Release requires: all gates passed, open-item ledger presented (G-1),
  explicit human GO (G-2).

## G-7 - Memory governance

Writes to `.keel/memory/` (conventions, lessons, decisions) happen only within
memory-check caps, only by the phase that owns the insight, and only for the
current story. Memory is never edited to alter history; wrong entries are
corrected with a new dated line, not deletion.

## G-8 - Agent identity integrity (schema/enum mismatch = HALT)

If the state engine's `validate` command rejects a phase output because the
`agent` field, phase number, or any enum value does not match the installed
schema, the handshake gate HALTS immediately and surfaces the error to the
human. The gate NEVER advises a phase agent to re-emit its output under a
different agent name or phase number to satisfy the schema. Relabeling is
identity fraud: it corrupts the audit trail and conceals a real
framework-version mismatch. The human resolves whether the engine needs
upgrading or the agent output is genuinely wrong; the pipeline does not
resume until that decision is recorded.

## G-9 - No unverified quantitative baselines in intake

PO briefs and Business Analyst specs MUST NOT assert specific test counts,
coverage percentages, performance numbers, or regression baselines carried
over from prior-story artifacts. These figures change between stories.
Any such figure in an intake document must be marked
`[BASELINE: ~N -- verify at phase 2]`. The Business Analyst resolves every
placeholder by running the actual tool at phase 2, recording the measured
value and the command used. A `[BASELINE: ...]` placeholder that survives past
phase 2 is an unverified claim and a gate FAIL at the phase-2 handshake.

## G-10 - Data Classification Gate (v3.16.3)

`scripts/keel-classify-gate.cjs` must be wired into `hooks/hooks.json` for
all stories involving CJIS-adjacent data. The gate runs on `UserPromptSubmit`,
`PreToolUse`, and `PostToolUse` stages and checks story artifacts against the
patterns in `config/cjis-patterns.json`. A story that touches CJIS-adjacent
data patterns without the required classification annotation is a BLOCKING
finding -- the pipeline does not advance past the current gate until the
annotation is added or a human owner explicitly waives it (G-2 applies).

**Gate absent = HIGH finding.** If `keel-classify-gate.cjs` is not registered
in `hooks/hooks.json` and the story scope includes CJIS-adjacent data, the
security-engineer and release-manager phases must both flag this as a HIGH
finding -- the release cannot proceed until the gate is wired.

**Forseti follow-up:** NCIC_ID, LEID, HART_CASE_ID, and HART_SUBJECT_ID are declared
in `config/cjis-patterns.json` under `blocked_categories` — they have no active regex
patterns yet. Real CJIS compliance requires format strings from Forseti. Until supplied,
the gate catches SSN/PHONE/EMAIL/DOB/NAME_NARRATIVE/ADDRESS but is BLIND to NCIC
numbers, LEIDs, and HART case/subject IDs. The gate emits a `CJIS COVERAGE GAP` warning
on every run; set `KEEL_CJIS_STRICT=1` to hard-fail instead. Security-engineer MUST note
this gap in every phase-8 report. Action: file a Forseti request, add real regex formats,
remove the category from `blocked_categories`.

**Screenshot scanning limitation:** Playwright screenshots are image files -- the CJIS
gate performs text-only scanning and cannot inspect image content. E2E test fixtures
and application state captured in screenshots MUST use fully synthetic, non-CJIS data
by design (test-time enforcement, not gate-time enforcement). Confirm synthetic test
data at phase-6 QA review and document in the phase-6 output.

**PostToolUse blocking semantics:** The PostToolUse hook fires AFTER the tool result
has been returned to the model in the current turn. Exit-2 from a PostToolUse hook is
alerting and logging control only -- the model may have already seen the content that
triggered the block. For hard prevention (stopping data from reaching the model at all),
rely on PreToolUse hooks, which fire before the tool runs. Every PostToolUse incident
warrants immediate human review of what the model received in that turn.


---

## G-11 - Branch promotion order (dev -> master -> prod, no skipping)

All code changes MUST flow through the promotion chain in order:

`
dev  ->  master  ->  prod
`

**Rules:**
- Direct pushes to master or prod are forbidden. Every change reaches
  master via a PR from dev, and prod via a PR from master.
- No level may be skipped. A hotfix goes to dev first, then master, then prod.
- Cherry-picks that bypass the chain are forbidden.

**Release manager verification (run before GO verdict):**

`ash
# Non-merge commits on master not in dev -- must be empty
git log origin/dev..origin/master --oneline --no-merges

# Non-merge commits on prod not in master -- must be empty
git log origin/master..origin/prod --oneline --no-merges
`

If either command returns output: **NO-GO**. The out-of-order commits must be
brought into the chain (cherry-pick to dev, then re-promote) before release.

**Applies to:** every story, every hotfix, every docs-only change.

---

## G-12 - Bug development lifecycle (Jira-first, RCA-local, fix-linked)

Every bug fix MUST follow this lifecycle in order. No step may be skipped.

### Lifecycle stages

```
1. REPORTED   → Jira ticket created (P0/P1/P2/P3) BEFORE any code changes
2. INVESTIGATE → /keel:investigate-defect run locally; RCA in docs/defects/ (gitignored)
3. FIX        → fix branch off dev; commit message includes Jira ticket ID
4. REVIEW     → PR opened; PR description links Jira ticket ("Fixes HART-xxx")
5. MERGED     → merged dev→master→prod via G-11 promotion chain
6. CLOSED     → Jira ticket transitioned to Done only after prod merge (G-2 + guard-approve)
```

### Mandatory rules

**Tracker linking (advisory):** Commits should reference a tracker ticket
(e.g. `Refs PROJ-123` or `Fixes PROJ-123`) when one exists. The `commit-msg`
hook warns if no reference is found but does NOT block the commit. Ticket ID
format is flexible — any project-key pattern is accepted.

**RCA requirement:**
- P0 / P1 bugs: RCA is MANDATORY before the fix is merged to master.
- P2 / P3 bugs: RCA is recommended, not blocking.
- RCA file lives in `docs/defects/<TICKET>-rca.md` — this path is gitignored.
- Upload RCA to Confluence (`Engineering > Defects > <TICKET>`) and paste the
  Confluence URL into the Jira ticket before closing.

**Artifact routing:**

| Artifact | Goes to | Never goes to |
|----------|---------|---------------|
| Bug report | Jira ticket | git commit message only |
| RCA document | Confluence (linked from Jira) | git (`docs/defects/` is gitignored) |
| CJIS incidents (`.keel/security/incidents.jsonl`) | Jira security ticket | git (`.keel/security/` is gitignored) |
| Prescan findings (`.keel/state/*/prescan.json`) | Jira security ticket if HIGH/CRITICAL | git (gitignored) |
| Fix code + tests | git (PR → dev→master→prod) | Jira comments |
| Audit summary | `.keel/state/*/audit-log.jsonl` (git) | — |

**Guard enforcement:**
- `scripts/guard-jira-write.cjs` — blocks Jira writes outside active story scope.
- `scripts/guard-approve.cjs` — blocks transitions to Done/Released without `KEEL_APPROVAL_TOKEN`.
- `commit-msg` hook — warns if no tracker reference found (advisory, does not block).

**Closing a ticket:** A Jira bug ticket transitions to Done ONLY when the fix is
confirmed in prod. The release manager verifies the merge is in prod (G-11 chain)
before approving the transition. guard-approve.cjs enforces the approval token at
transition time.

### Commit message format (enforced for every commit)

```
<type>(<scope>): <subject>        ← max 72 chars, imperative mood, no trailing period

<body — explain WHY, not WHAT>

<Fixes|Refs> PROJECT-123          ← Jira ticket ID
```

**Valid types:**

| Type | Ticket | Description |
|------|--------|-------------|
| `feat` | advisory | New feature |
| `fix` | advisory | Bug fix |
| `refactor` | advisory | Code restructure with no behaviour change |
| `perf` | advisory | Performance improvement |
| `test` | advisory | Adding or updating tests |
| `chore` | advisory | Build tasks, dependency bumps |
| `docs` | advisory | Documentation only |
| `ci` | advisory | CI/CD pipeline changes |
| `style` | advisory | Formatting, whitespace |
| `build` | advisory | Build system changes |
| `revert` | none | Reverts a prior commit |

"advisory" = G-12 gate warns if no tracker reference found, but does not block the commit.

**Additional rules enforced by `scripts/keel-bug-lifecycle.cjs`:**
- Subject line: max 72 chars
- Subject: imperative mood (blocked if starts with added/removed/updated/fixed/changed/...)
- Subject: no trailing period
- Merge commits and revert auto-messages are exempt

**Install hooks:** New clones must run `node scripts/install-hooks.cjs` to activate
the G-12 commit-msg gate locally. CI enforces the same check server-side.

---

## G-13 - No direct push to protected branches (PR-first policy)

Direct pushes to `dev`, `master`, or `prod` are **forbidden**. Every code change
reaches a protected branch only through a reviewed and approved Pull Request.

### Flow for every code change

```
feature/fix-branch  →  PR (review + approval)  →  dev
                                                      ↓
                                          PR (G-11) → master
                                                      ↓
                                          PR (G-11) → prod
```

### Rules

1. **Push to a feature branch** using the naming convention:
   `feature/`, `fix/`, `hotfix/`, `refactor/`, `perf/`, `test/`,
   `docs/`, `chore/`, `ci/`, `style/`, `build/`, `release/`, `spike/`

2. **Open a PR** from the feature branch targeting `dev`.

3. **Minimum 1 approval** from another developer (or the code owner)
   before merge. Self-merge without review is not permitted.

4. **PR should reference a tracker ticket** in its title or description when one exists (advisory — G-14).

5. **Only after PR approval** does code reach `dev` → auto-deploy to
   dev environment.

6. **G-11 then governs** promotion: `dev` → `master` → `prod`, each
   as a separate PR.

### Enforcement

**Client-side** (pre-push hook — `scripts/keel-push-guard.cjs`):
Blocks direct pushes to `dev`, `master`, `prod` with an actionable
error and the exact commands to push to a feature branch instead.
Run `node scripts/install-hooks.cjs` after every clone.

**Server-side** (GitHub branch protection — must be configured once
by repo admin, see `docs/BRANCH-PROTECTION.md`):
- Require pull request before merging
- Require at least 1 approving review
- Dismiss stale reviews on new commits
- Require status checks to pass (version audit, G-12 commit-msg)
- Block force pushes
- Block branch deletion

---

## G-14 - Start-work automation (branch naming convention)

Use the `keel:start-work` Claude Code skill to begin any piece of work.

**Invocation examples:**
- "start work on HART-302"
- "start work on adding retry logic for payments"
- "/keel:start-work PROJ-123"

**What the skill does:**
1. If a ticket ID is given: fetches issue from Jira via MCP (no separate credentials needed)
2. Maps issue type to a branch prefix (Bug→`fix/`, Story→`feat/`, Task→`chore/`, etc.)
3. Creates branch: `{prefix}/{ticket-id}-{summary-slug}` (or `{prefix}/{slug}` if no ticket)
4. Pushes branch to remote with upstream tracking
5. Transitions Jira ticket to "In Progress" via MCP

**Branch naming convention (recommended, not enforced):**

| Work type | Prefix | Example |
|-----------|--------|---------|
| Bug fix | `fix/` | `fix/hart-302-payment-timeout` |
| New feature / Story | `feat/` | `feat/hart-150-add-retry-logic` |
| Epic | `feat/` | `feat/hart-100-payment-overhaul` |
| Task / Chore | `chore/` | `chore/hart-200-update-deps` |
| Refactor | `refactor/` | `refactor/hart-210-extract-service` |
| Spike | `spike/` | `spike/hart-240-evaluate-sdk` |

Ticket ID format is flexible — accept any project-key pattern (HART-302, BUG-7, ASW-14, etc.).
Work may start from a direct description without a ticket; branch naming is advisory only.

**Push guard (advisory):** `keel-push-guard.cjs` warns (non-blocking) if a branch
has no standard type prefix. This is informational — no commits are blocked.