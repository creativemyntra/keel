# KEEL-102 — Business Analysis: `status --all` fleet listing

**Phase:** 2 (Business Analyst) | **Input:** `.keel/state/KEEL-102/01-business-analyst.json` | **Scope:** `scripts/keel-state.cjs` (`cmdStatus` + dispatcher), consumed by `commands/health.md` step 1.

## 1. Functional Spec

`node keel-state.cjs status --all` prints one JSON array summarizing every story under `.keel/state/`, replacing the per-directory iteration the health sweep performs today. The dispatcher destructures `storyId` from argv, so `--all` arrives *as* the storyId; the branch on `storyId === '--all'` must run **before** `readManifest` can die looking up a literal `--all` story.

### Behavior table

| # | Condition | Behavior | Exit |
|---|-----------|----------|------|
| B-1 | `status --all`, ≥1 story dir with parseable `manifest.json` | JSON array to stdout; one entry per story: `story_id`, `scope` (default `"feature"` when absent), `current_phase`, `halted` (strict `=== true` coercion, matching single-story) | 0 |
| B-2 | `.keel/state/` does not exist | Print `[]` | 0 |
| B-3 | `.keel/state/` exists but contains zero story directories | Print `[]` | 0 |
| B-4 | Directory under `.keel/state/` lacking `manifest.json` | Not a story — silently excluded from the array | 0 |
| B-5 | Story dir whose `manifest.json` is corrupt (unparseable JSON / unreadable file) | **Skip-and-mark**: emit entry `{ "story_id": "<dirname>", "error": "<reason>" }` in the array, continue listing | 0 |
| B-6 | Non-directory entries and internal artifacts (`.lock`, `*.tmp`, files) in `.keel/state/` | Never enumerated as stories | 0 |
| B-7 | Halted story present | Entry reports `halted: true`; listing continues — never aborts | 0 |
| B-8 | Defect-scope story present | `scope: "defect"` reported verbatim from manifest; no sequencing-gap evaluation in `--all` mode | 0 |
| B-9 | `.keel/state/` exists but cannot be read (permissions/IO error on the state dir itself) | `die` with `FAIL` message | ≠0 |
| B-10 | `status <story-id>` (single story) | Byte-for-byte unchanged: full detail object, dies on missing manifest, dies on sequencing gaps | as today |

**Corrupt-manifest decision (B-5): skip-and-mark, not abort** — a health sweep's job is to *surface* the broken story as data; aborting would hide the status of every healthy story behind one bad file.

### Data flow

| Stage | Detail |
|-------|--------|
| Input | `.keel/state/*/manifest.json` (read-only; no state mutated, no audit entry) |
| Processing | Enumerate dirs → filter to those containing `manifest.json` → parse each (per-entry try/catch → B-5) → project 4 fields → sort by `story_id` |
| Output | Pretty-printed JSON array on stdout (consistent with single-story `JSON.stringify(..., null, 2)`) |

## 2. Business Rules

- **BR-1 (exit codes):** `status --all` exits `0` in every case except B-9 (state dir itself unreadable). Individual story problems — corrupt manifest, halted, sequencing gaps — are reported as data, never as a nonzero exit. Rationale (AC-2): a fleet sweep on a fresh or partially broken repo is an observation, not a failure.
- **BR-2 (field contract):** each healthy entry carries exactly `story_id`, `scope`, `current_phase`, `halted` (AC-1). Deep fields (`attempts`, `completed_phase_files`, `sequencing_gaps`, timestamps) remain single-story-only; callers drill in with `status <id>`.
- **BR-3 (no side effects):** `--all` is read-only — no snapshots, no audit-log appends, no manifest writes.
- **BR-4 (regression guard, AC-3):** `cmdStatus(storyId)` single-story path is untouched, including its exit-1 on missing manifest and on sequencing gaps; full engine test suite must stay green.
- **BR-5 (determinism):** entries sorted lexicographically by `story_id` so health-report diffs are stable across runs.
- **BR-6 (reserved id):** `--all` is intercepted before manifest lookup; a directory literally named `--all` is out of contract and ignored.

## 3. Edge Cases

- Empty/absent `.keel/state/` → `[]`, exit 0 (B-2/B-3).
- Dir without `manifest.json` (pre-init or foreign dir) → excluded, no warning noise (B-4).
- Corrupt manifest → marked entry with `error`, listing survives (B-5).
- `.lock` dirs, `*.tmp` write artifacts, stray files at state root → filtered out; `snapshots/` lives *inside* story dirs so per-story enumeration never sees it (B-6).
- Halted story → `halted: true`, exit still 0 (B-7).
- Defect-scope story → scope echoed; no gap check applied in `--all` (B-8).
- Manifest missing an optional field (`scope`, `current_phase`) → defaults (`"feature"`) / `null` rather than crash.
- Exactly one story (current live fixture has two: KEEL-101, KEEL-102) → still an array, never a bare object.

## 4. Open Questions

None — phase-1 findings and owner-confirmed ACs (AC-1, AC-2, AC-3) resolve all ambiguities; the corrupt-manifest policy is decided above (skip-and-mark).

## 5. Sensitive-data flags

None — feature touches local pipeline state files only; no payment, authentication, or PII surfaces.
