# Keel Lessons (incident-derived)

## L-1 (2026-07-09, KEEL-101): user-facing messages hard-code paths that migrations miss
Pattern: instructional text duplicated in runtime strings, not swept when the engine path moved. Prevention: any path-migration change greps ALL user-facing message strings for the old invocation; regression test asserts messages reference the installed path.
