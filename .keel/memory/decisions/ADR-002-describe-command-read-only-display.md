# ADR-002: `describe` is a read-only, lock-free, human-readable summary command

**Status:** Accepted | **Date:** 2026-07-14 | **Story:** KEEL-103 | **Supersedes:** none | **Compatible with:** ADR-001

---

## Context

The Keel CLI lacked a per-story inspection command. Operators running the pipeline needed to answer at a glance: "What phase is this story on? Is it halted? How long has it been idle? Which phases are done?" The existing `status <story-id>` command emits machine-parseable JSON (used by orchestrators and e2e tests); it is not suitable for human consumption during triage. A new `describe <story-id>` command is required that:

- Emits a fixed-width labeled plain-text block to stdout.
- Is usable during any live pipeline run without blocking mutators.
- Shares no code with `cmdStatus`/`cmdStatusAll`, which carry an AC-5 regression guard (byte-for-byte unchanged output contract).

---

## Options considered

1. **Extend `cmdStatus` with a `--human` flag** — add a second output branch inside `cmdStatus` controlled by a flag.
   - Cons: any future refactor of `cmdStatus` risks breaking the human-readable path, and vice versa. The AC-5 regression guard applies to `cmdStatus`; mixing concerns makes compliance harder to audit.

2. **Separate `cmdDescribe` function wired as a new switch case (chosen)** — a standalone function with no shared mutation path. The switch block gains `case 'describe'`; the USAGE string is updated; `cmdStatus` and `cmdStatusAll` are untouched.
   - Pros: AC-5 compliance is trivially verifiable (no lines 446-502 change). The new function can be read, tested, and deleted independently.

3. **Separate binary / script** — emit the summary from a wrapper shell script calling `status`.
   - Cons: adds distribution surface; duplicates manifest-reading logic outside the engine; inconsistent with the single-binary convention.

---

## Decision

Implement `cmdDescribe(storyId)` as a new, standalone function in `scripts/keel-state.cjs`.

### Placement

Insert `cmdDescribe` **immediately after `cmdStatusAll` (line 502)** and before `cmdSnapshot`. This preserves the logical grouping: all read-only inspection commands (`cmdStatus`, `cmdStatusAll`, `cmdDescribe`) are adjacent.

### Signature

```
function cmdDescribe(storyId)
```

`storyId` is the only parameter. No `args` array is needed for the MVP — the command takes no flags.

### Entry point wiring

- `switch` block gains: `case 'describe': cmdDescribe(storyId); break;`
- `USAGE` string gains `describe` in the command list (same line, minimal diff).
- `memory-check` and `status --all` early-exit paths above the switch block are unchanged.

### Output contract

Sequential `console.log` calls (not `JSON.stringify`) to stdout. Format:

```
[WARNING: pipeline is HALTED — human resume required]   ← only if manifest.halted === true
----------------------------------------
Keel describe: <storyId>
----------------------------------------
Story         : <story_id>
Title         : <title>
Status        : <halted ? "HALTED" : "active">
Started       : <manifest.started_at>
Idle          : <formatIdle(Date.now() - new Date(manifest.updated_at).getTime())>
Completed     : <comma-separated agent names, or "(none)">
In progress   : <AGENTS[manifest.current_phase - 1] or "complete">
Remaining     : <comma-separated agent names, or "(none)">
Gate events   : <N> / <M>
Attempts      : <JSON.stringify(manifest.attempts)>
----------------------------------------
```

The separator is 40 dashes (fixed width, not content-derived). A trailing blank line closes the block. Labels are left-aligned, padded to column 14 with spaces before the colon.

### Idle-time helper

Named inner function `formatIdle(ms)` defined at the top of `cmdDescribe`. Not extracted to module scope — no other command needs it, and keeping it local avoids polluting the module namespace.

Formula:
- `ms >= 3600000`: `Xh Ym` where `X = Math.floor(ms / 3600000)`, `Y = Math.floor((ms % 3600000) / 60000)`.
- `ms < 3600000`: `Xm Ys` where `X = Math.floor(ms / 60000)`, `Y = Math.floor((ms % 60000) / 1000)`.
- Both branches use `Math.floor` to prevent negative-second display at boundary.

### Phase enumeration

```js
const files = fs.readdirSync(stateDir(storyId))
  .filter(f => /^\d{2}-.+\.json$/.test(f))
  .sort();
const completedPhaseNums = files.map(f => parseInt(f.slice(0, 2), 10));
const completedNames = completedPhaseNums.map(n => AGENTS[n - 1]).filter(Boolean);
```

This is the same pattern as `cmdStatus` line 448. Reusing the pattern (not the function) keeps AC-5 compliance clean.

### In-progress phase

```js
const inProgress = manifest.current_phase > 11
  ? 'complete'
  : (AGENTS[manifest.current_phase - 1] || 'complete');
```

### Remaining phases

```js
const expected = manifest.expected_phases
  || SCOPES[manifest.scope]
  || SCOPES.feature;
const remaining = expected
  .filter(p => p > manifest.current_phase && !completedPhaseNums.includes(p))
  .map(p => AGENTS[p - 1])
  .filter(Boolean);
```

Using `manifest.expected_phases` first respects stories initialized before `SCOPES` constants stabilized, consistent with `cmdStatus` line 452.

### Halted warning

```js
if (manifest.halted === true) {
  console.log('WARNING: pipeline is HALTED — human resume required');
}
```

Emitted **before** the first separator. Absence of the `halted` field is treated as `false` (strict equality `=== true`).

### Lock policy

No `withLock` wrapper. Rationale: `cmdDescribe` makes no writes (no `writeManifest`, no `appendAudit`, no file creation). `writeManifest` is atomic (tmp + rename). A concurrent write produces either the complete old manifest or the complete new manifest — never a torn read. This is the same reasoning as ADR-001 for `status --all`.

### Missing-story path

`cmdDescribe` calls `readManifest(storyId)` as its first statement. `readManifest` already calls `die(1, 'FAIL: no manifest for story <id> ...')` to stderr and exits 1. No duplicate error string is needed.

---

## Consequences

- `cmdStatus` (lines 446–468) and `cmdStatusAll` (lines 475–502) are **byte-for-byte unchanged** — AC-5 regression guard satisfied.
- The describe output format is not machine-parseable by design; callers needing structured data must use `status <story-id>`.
- The USAGE string change is a one-line addition; L-1 (lesson: path migrations must grep all user-facing message strings) does not apply here because no path or invocation path changes — the command name `describe` is new, not a rename.
- Any future `--all`-style fleet inspection command should follow ADR-001 (lock-free, skip-and-mark, exit 0 on per-story problems) and may reuse the `formatIdle` pattern from this function.
- If `manifest.updated_at` is absent (story initialized before the field existed), `new Date(undefined).getTime()` yields `NaN`; the `formatIdle` call produces `NaNh NaNm`. A guard `manifest.updated_at ? formatIdle(...) : 'unknown'` should be applied as a defensive measure.
