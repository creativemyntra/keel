# ADR-001: `status --all` is a lock-free read-only listing with skip-and-mark error handling

**Status:** Accepted | **Date:** 2026-07-09 | **Story:** KEEL-102 | **Supersedes:** none (first ADR)

## Context

`keel-state.cjs status --all` must summarize every story under `.keel/state/` for the health sweep (`commands/health.md` step 1). Every existing mutating command serializes via `withLock()` (per-story `.lock` dir), and every existing read of a manifest goes through `readManifest()`/`readJson()`, which `die(1)` on a missing or corrupt file. A fleet sweep breaks both habits: it reads N stories at once, possibly while another agent process is mid-write, and one broken story must not hide the other N-1.

## Options considered

1. **Lock-everything:** acquire each story's `.lock` before reading its manifest.
   - Pros: symmetric with mutators; guarantees no read during a write window.
   - Cons: a sweep can block up to `LOCK_WAIT_MS` per busy story or fail on a wedged lock, turning an observation into a failure (violates the exit-0 contract, BR-1); adds write-side contention from a pure reader; solves a problem that atomic writes already solve.
2. **Read-only, no locks (chosen):** enumerate dirs, read each `manifest.json` directly, per-entry `try/catch`.
3. **Abort-on-first-corrupt manifest:** reuse `readJson()` and let it `die`.
   - Cons: one bad file hides the status of every healthy story — the opposite of a health sweep's purpose.

## Decision

`status --all` takes **no lock** and performs **no writes** (no snapshot, no audit-log append, no manifest touch). Corrupt or unreadable manifests are handled by **skip-and-mark**: the sweep emits `{ "story_id": "<dirname>", "error": "<reason>" }` for that story and continues. The only nonzero exit is when `.keel/state/` itself cannot be read.

## Why lock-free is safe

`writeManifest()` writes `manifest.json.tmp` then `fs.renameSync(tmp, file)`. rename is atomic on the same volume on both NTFS and POSIX, so a concurrent reader sees either the complete old manifest or the complete new one — never a torn file. The lock exists to serialize read-modify-**write** cycles between mutators; a pure reader gains nothing from it. (If a reader ever races the rename window on a platform where rename briefly unlinks, the failure mode degrades gracefully to a B-5 marked entry, not a crash.)

## Consequences

- Health sweeps are non-blocking, side-effect-free, and always exit 0 on per-story problems — story breakage is surfaced as data.
- The listing is a point-in-time snapshot; an entry can be one write stale relative to a concurrent mutator. Acceptable: callers needing authoritative depth use `status <id>`.
- `cmdStatusAll` must NOT reuse `readJson`/`readManifest` (they die on error); future refactors must preserve the local try/catch.
- Any future `--all`-style fleet command (e.g. `verify --all`) should follow this pattern: read-only, lock-free, skip-and-mark, exit 0 unless the state root itself is unreadable.
