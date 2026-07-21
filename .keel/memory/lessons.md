# Keel Lessons (incident-derived)

## L-1 (2026-07-09, KEEL-101): user-facing messages hard-code paths that migrations miss
Pattern: instructional text duplicated in runtime strings, not swept when the engine path moved. Prevention: any path-migration change greps ALL user-facing message strings for the old invocation; regression test asserts messages reference the installed path.

## L-2 (2026-07-17, KEEL-105): PO brief carried stale regression baseline from prior story
Pattern: the intake brief stated "129 tests" copied from the KEEL-104 release notes without re-running the suite. The count was wrong at intake time. Prevention: all quantitative figures in PO briefs must be marked `[BASELINE: ~N — verify at phase 2]`; the Business Analyst resolves every placeholder by running the actual tool before handing off (G-9).

## L-3 (2026-07-17, KEEL-105): handshake gate suggested identity relabeling on schema mismatch
Pattern: when engine validate rejected a phase output due to an enum mismatch, the gate advised re-emitting the output under a different agent name to satisfy the schema. This corrupts the audit trail and hides framework-version skew. Prevention: schema/enum mismatch = immediate HALT and human escalation — never relabeling (G-8).
