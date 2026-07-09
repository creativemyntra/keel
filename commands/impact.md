---
description: CodeGraph impact analysis — find every component affected by changing a class or file.
argument-hint: <ClassName | path/to/File.php>
---

Run impact analysis for: $ARGUMENTS

1. Build (or rebuild) the dependency graph, then query reverse dependencies:
   ```bash
   node ~/.keel/bin/build-codegraph.cjs . --impact "$ARGUMENTS"
   ```
   Rebuild first without `--impact` if the graph in `.keel/graph/codegraph.json`
   is older than the latest commit touching `src/`.
2. Present the impact set: direct dependents first, then transitive, with file
   paths and edge types (use / extends / implements / references).
3. For each direct dependent, check whether a test file covers it (Glob for a
   matching test in `tests/`) — flag dependents with no test coverage as the
   highest-risk part of the change.
4. Recommend: which files need review, which tests must run, and whether the
   blast radius justifies a state snapshot before implementation.

The graph is regex-based static analysis — it over-includes rather than misses.
Treat an empty impact set as "verify manually", not as proof of isolation.
