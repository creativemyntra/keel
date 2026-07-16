# Project Conventions

Created: 2026-07-09. Stable rules for how we write code here — one line, dated. Cap: 150 lines.

- 2026-07-09 (KEEL-102): Engine read-only listings (status --all) are lock-free and skip-and-mark corrupt entries — never abort a sweep for one bad story (ADR-001).
- 2026-07-14 (KEEL-103): All read-only engine commands are lock-free (ADR-002) — a pure reader that issues no writes must not acquire the write lock; atomic manifest writes (tmp+rename) guarantee no torn reads.
- 2026-07-14 (KEEL-103): Human-readable idle-time format: `Xh Ym` when duration >= 60 minutes; `Xm Ys` when < 60 minutes. Both values use Math.floor. Absent timestamp displays as "unknown" (never NaN).
- 2026-07-14 (KEEL-103): Human-readable inspection commands (describe) use sequential console.log to stdout — not JSON.stringify. Callers needing structured data use status <story-id>.
- 2026-07-16 (owner directive): `.keel/GUARDRAILS.md` is binding on every agent and gate — read it before starting any phase. Covers open-item classification (blocking/non-blocking), human-approval gates, no leakage, no fabrication, complete-before-handoff, commit/deploy restrictions, memory governance.
