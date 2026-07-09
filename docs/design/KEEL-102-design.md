# KEEL-102 — Design: `status --all` fleet listing

**Phase:** 3 (Solution Architect) | **Input:** `.keel/state/KEEL-102/02-business-analyst.json`, `docs/analysis/KEEL-102-analysis.md` | **Target:** `scripts/keel-state.cjs`

Node engine change only — **DB schema: n/a. API contract: n/a** (CLI stdout/exit-code contract is specified in the phase-2 behavior table B-1..B-10 and restated below).

## 1. Component design

One new function, one dispatcher branch. No new dependencies, no new files, no changes to any existing function.

### 1.1 `cmdStatusAll()` (new, placed directly after `cmdStatus` ~line 428)

```js
// Fleet listing (B-1..B-9): read-only sweep of every story under .keel/state/.
// Deliberately lock-free — writeManifest() is atomic (tmp + rename), so a
// reader never sees a torn manifest. Per-story problems are DATA, not failures.
function cmdStatusAll() {
  const root = path.join('.keel', 'state');
  if (!fs.existsSync(root)) { console.log('[]'); return; }          // B-2
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); }
  catch (e) { die(1, `FAIL: cannot read ${root}: ${e.message}`); }  // B-9
  const stories = [];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;                               // B-6 files
    if (ent.name === '.lock' || ent.name.endsWith('.tmp')) continue;// B-6 artifacts
    if (ent.name === '--all') continue;                             // BR-6 reserved
    const mf = path.join(root, ent.name, 'manifest.json');
    if (!fs.existsSync(mf)) continue;                               // B-4 not a story
    try {
      const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
      stories.push({
        story_id: m.story_id || ent.name,
        scope: m.scope || 'feature',                                // BR-2 default
        current_phase: m.current_phase ?? null,
        halted: m.halted === true,                                  // strict, matches cmdStatus
      });
    } catch (e) {
      stories.push({ story_id: ent.name, error: e.message });       // B-5 skip-and-mark
    }
  }
  stories.sort((a, b) => a.story_id.localeCompare(b.story_id));     // BR-5 determinism
  console.log(JSON.stringify(stories, null, 2));                    // exit 0 (BR-1)
}
```

Design notes:

- **Does NOT call `readJson()`** for per-story parses — `readJson` calls `die(1, ...)`, which would abort the sweep and violate B-5. A local `try/catch` around `readFileSync` + `JSON.parse` is the skip-and-mark mechanism. The one `die` in this function is B-9 (state root itself unreadable), the sole nonzero exit.
- **Does NOT call `readManifest()`/`withLock()`/`appendAudit()`/`cmdSnapshot()`** — BR-3 read-only, no side effects (see ADR-001).
- **Field projection is exactly 4 keys** (BR-2/AC-1): `story_id`, `scope`, `current_phase`, `halted`. No `attempts`, `completed_phase_files`, `sequencing_gaps`, or timestamps; and **no sequencing-gap evaluation** (B-8) so the exit-0 guarantee stays unconditional.
- Output uses `JSON.stringify(..., null, 2)`, matching single-story formatting; an empty fleet prints `[]` (B-2/B-3 — `stringify([])` is `"[]"` either way).

### 1.2 Dispatcher branch — exact placement

The dispatcher destructures `const [, , cmd, storyId, ...rest] = process.argv;` (line 649), so `--all` arrives **as `storyId`**. Two hazards dictate placement:

1. Line 652 `if (!storyId) die(64, USAGE);` — `'--all'` is truthy, so it passes; no change needed there.
2. Line 658 `case 'status': cmdStatus(storyId);` — would call `readManifest('--all')` and die with "no manifest for story --all". The `--all` branch must intercept **before** the switch reaches `cmdStatus`.

Concrete edit — insert one line between line 652 and the `switch` (line 653):

```js
if (!storyId) die(64, USAGE);
if (cmd === 'status' && storyId === '--all') { cmdStatusAll(); process.exit(0); }  // NEW
switch (cmd) {
  ...
  case 'status': cmdStatus(storyId); break;   // untouched (B-10 / AC-3)
```

This mirrors the existing `memory-check` early-exit idiom on line 651. `cmdStatus`, its `case`, and every helper it uses are byte-for-byte untouched — the AC-3 guard is structural (new code path only reachable via the new branch), not behavioral.

Update `USAGE` (line 648) to mention `status --all` (`status <story-id>|--all`). Per lesson L-1, no filesystem path is hard-coded into a new user-facing string except the `root` variable already interpolated in the B-9 die message.

### 1.3 Enumeration rules (summary)

| Rule | Source |
|------|--------|
| Only direct children of `.keel/state/` that are directories AND contain `manifest.json` are stories | B-4, B-6 |
| `.lock` dirs, `*.tmp`, plain files at root: skipped silently | B-6 (defense-in-depth; engine only creates these *inside* story dirs) |
| A dir literally named `--all`: skipped (out of contract) | BR-6 |
| Corrupt/unreadable manifest → `{ story_id: <dirname>, error }` entry, sweep continues | B-5 |
| Sort: `localeCompare` on `story_id`, ascending | BR-5 |
| Exit 0 always, except root-dir read failure → `die(1, FAIL...)` | BR-1, B-9 |

`snapshots/` never appears: it lives *inside* story dirs and root enumeration is non-recursive.

## 2. Technical risks

| Risk | Assessment / Mitigation |
|------|------------------------|
| **Dispatcher `!storyId` check** | `'--all'` is truthy so the guard passes naturally; the new branch sits after it, so `status` with no args still dies 64 with USAGE. No change to the guard. |
| **Torn reads without a lock** | None. `writeManifest()` (lines 70–78) writes `manifest.json.tmp` then `fs.renameSync` — atomic on NTFS and POSIX. A concurrent reader sees either the old or the new complete file, never a partial one. Taking N story locks would also introduce a new failure mode (sweep blocking/dying on a busy story), which contradicts BR-1. See ADR-001. |
| **Lock/snapshot artifacts leaking into the listing** | `.lock` and `*.tmp` are created inside story dirs (line 91, line 75), not at the state root — but B-6 filters at the root anyway as defense-in-depth. `.tmp` files inside a story dir are invisible: only `manifest.json` is read. |
| **`readJson`/`readManifest` die-on-error reuse** | Deliberately NOT reused per-story (would abort the sweep). Flagged in code comment so a future refactor doesn't "simplify" back to them. |
| **`current_phase` absent in a hand-rolled manifest** | `?? null` — entry stays healthy, no crash (analysis §3). |
| **Impact set** | `.keel/graph/codegraph.json` does not exist (Node engine repo, graph builder targets app repos). Manual impact scan: consumers of `status` are `commands/health.md` step 1 (the requesting feature — switches to `status --all`) and human CLI use. `cmdStatus` has zero internal callers besides the dispatcher `case`. Blast radius: one file, additive. |
| **Design debt** | None adjacent; dispatcher is a flat switch and the early-exit idiom already exists (`memory-check`). No god-class/abstraction concerns to flag. |

Performance: n/a for the <200ms p95 API target (local CLI); a sweep is O(#stories) stat+read, trivially fast at realistic fleet sizes.

## 3. Test plan

New suite block in the engine tests (`tests/keel-state.test.cjs` pattern — spawn the CLI, assert stdout/exit code) using a temp `.keel/state/` fixture:

| Assertion | Proves |
|-----------|--------|
| Fixture with 2 stories (`KEEL-101` feature, `KEEL-102`) → stdout parses as JSON array, length 2, sorted `KEEL-101` < `KEEL-102`, each entry has exactly `{story_id, scope, current_phase, halted}`, exit 0 | **B-1**, BR-2, BR-5 |
| No `.keel/state/` dir → stdout `[]`, exit 0 | **B-2** (and B-3 variant: empty dir → `[]`) |
| Story dir with `manifest.json` containing `{invalid` → array includes `{ story_id, error }` entry AND the healthy sibling story still listed, exit 0 | **B-5** skip-and-mark |
| Dir without manifest + stray file + `.lock` dir at root → excluded, exit 0 | B-4/B-6 |
| Manifest with `halted: true` / `scope: "defect"` → reported verbatim, exit 0 | B-7/B-8 |
| `status KEEL-102` (single story) after the change → unchanged deep object; `status NOPE` → exit 1 "no manifest" | **B-10** / AC-3 |
| Full existing engine suite green | AC-3 regression guard |

## 4. ADR

ADR-001 (`.keel/memory/decisions/ADR-001-status-all-read-only-listing.md`): `--all` is a lock-free, read-only, skip-and-mark listing. First ADR in this repo; no prior decisions to supersede.
