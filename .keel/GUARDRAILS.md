# Keel Pipeline Guardrails

Binding rules for every agent and every gate in this repository. Added
2026-07-16 at the human owner's direction after the v3.14.0 run. These rules
override convenience. A gate that cannot prove compliance FAILS the phase.

## G-1 · Open-item classification (blocking / non-blocking)

Every issue, bug, finding, or follow-up task discovered in any phase MUST be
classified at the moment of discovery as exactly one of:

- **BLOCKING** — halts the pipeline at the current gate. The story does not
  advance until it is fixed or the human owner explicitly waives it.
- **NON-BLOCKING (small)** — recorded in the discovering phase's output file
  with an owner phase and a due date, carried forward visibly through every
  subsequent gate, and listed in the release manager's open-item ledger.

An unclassified open item is itself a gate failure. Nothing is silently
dropped, deferred without a record, or "left for QA to catch."

## G-2 · Human approval gate

The following ALWAYS halt and wait for explicit user approval — no agent or
gate may self-approve, infer approval, or proceed on a default:

- Releasing, deploying, committing, pushing, tagging, or merging branches
- Waiving a BLOCKING item or shipping with any open BLOCKING item
- Carrying NON-BLOCKING items into a release (the release summary must list
  them and the human GO covers exactly that list)
- Changing scope, acceptance criteria, or the output schema mid-story
- Relaxing any gate criterion, retrying past `max_attempts`, or restoring state
- Deleting or rewriting any state file, audit log, or memory entry

## G-3 · No leakage

- **Context**: agents exchange state ONLY through gate-validated phase output
  files (`.keel/state/<story>/NN-agent.json`). No side channels, no verbal
  carry-over, no reading another story's state to shortcut work.
- **Secrets**: no tokens, credentials, API keys, or environment-variable
  values in any phase output, finding, evidence file, log, or commit. Quote
  only runner output and file paths.
- **Claims**: an unverified claim must not propagate. Gates re-execute
  executable claims; a claim that cannot be re-executed is labeled as such in
  the handoff log, never passed forward as fact.

## G-4 · No manipulation (evidence-or-silence)

Every claim of a test run, scan, coverage number, or verification carries:
(1) the file/suite confirmed to exist on disk, (2) the exact command executed
this session, (3) the verbatim output. Missing any of the three → the claim is
omitted and reported as "not run." Fabricating a result, naming a nonexistent
suite, relaxing an assertion, or skipping a failing test is a gate FAIL,
costs an attempt, and is recorded permanently in the audit log.

## G-5 · Complete before handoff (definition of done per phase)

A phase hands off ONLY when every acceptance criterion in the ticket that the
phase owns is fully addressed — implemented, designed, or explicitly marked
out-of-scope-for-this-phase with the owning phase named:

- **ui-designer (3)**: every user-facing AC has a design spec and mockup
  coverage before the architect sees it.
- **software-engineer (5)**: every AC implemented, unit-tested (coverage ≥ 80%
  on changed lines), and self-reviewed before QA sees it. Partial work is a
  gate FAIL, not a carry-forward.
- **qa (6), e2e (7)**: every AC mapped to executed, passing tests before
  the next phase.
- The gate rejects any handoff where an AC is unaddressed and unexplained.

## G-6 · Commits, versioning, deployment

- Agents NEVER run git commit/push/tag/merge or any deploy action. The human
  owner executes releases, on their explicit instruction only.
- Version stamping checklist (all or none): `package.json`, `bin/keel.js`
  VERSION constant, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`,
  README header/footer, CHANGELOG entry, TECHNICAL-SPECIFICATIONS version table.
- Release requires: all gates passed, open-item ledger presented (G-1),
  explicit human GO (G-2).

## G-7 · Memory governance

Writes to `.keel/memory/` (conventions, lessons, decisions) happen only within
memory-check caps, only by the phase that owns the insight, and only for the
current story. Memory is never edited to alter history; wrong entries are
corrected with a new dated line, not deletion.

## G-8 · Agent identity integrity (schema/enum mismatch = HALT)

If the state engine's `validate` command rejects a phase output because the
`agent` field, phase number, or any enum value does not match the installed
schema, the handshake gate HALTS immediately and surfaces the error to the
human. The gate NEVER advises a phase agent to re-emit its output under a
different agent name or phase number to satisfy the schema. Relabeling is
identity fraud: it corrupts the audit trail and conceals a real
framework-version mismatch. The human resolves whether the engine needs
upgrading or the agent output is genuinely wrong; the pipeline does not
resume until that decision is recorded.

## G-9 · No unverified quantitative baselines in intake

PO briefs and Business Analyst specs MUST NOT assert specific test counts,
coverage percentages, performance numbers, or regression baselines carried
over from prior-story artifacts. These figures change between stories.
Any such figure in an intake document must be marked
`[BASELINE: ~N — verify at phase 2]`. The Business Analyst resolves every
placeholder by running the actual tool at phase 2, recording the measured
value and the command used. A `[BASELINE: …]` placeholder that survives past
phase 2 is an unverified claim and a gate FAIL at the phase-2 handshake.

## G-10 · Data Classification Gate (v3.16.0)

`scripts/keel-classify-gate.cjs` must be wired into `hooks/hooks.json` for
all stories involving CJIS-adjacent data. The gate runs on `UserPromptSubmit`,
`PreToolUse`, and `PostToolUse` stages and checks story artifacts against the
patterns in `config/cjis-patterns.json`. A story that touches CJIS-adjacent
data patterns without the required classification annotation is a BLOCKING
finding — the pipeline does not advance past the current gate until the
annotation is added or a human owner explicitly waives it (G-2 applies).

**Gate absent = HIGH finding.** If `keel-classify-gate.cjs` is not registered
in `hooks/hooks.json` and the story scope includes CJIS-adjacent data, the
security-engineer and release-manager phases must both flag this as a HIGH
finding — the release cannot proceed until the gate is wired.

**Forseti follow-up:** Pattern placeholders in `config/cjis-patterns.json`
marked `[FORSETI-FORMAT-PENDING]` need real format strings from Forseti before
they will match anything in practice. Until those formats are supplied, the gate
provides partial coverage only — security-engineer must note this limitation in
its phase output.
