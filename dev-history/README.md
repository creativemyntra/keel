# Dev History (not shipped, not part of the runtime pipeline)

This directory holds Keel's OWN internal dogfooding stories (KEEL-101 through
KEEL-105) and their associated docs — the real historical runs used to build
and validate Keel's own dashboard, describe command, and CJIS gate features.
They are cited as evidence in CHANGELOG.md, the ADRs under
`.keel/memory/decisions/`, and TECHNICAL-SPECIFICATIONS.md, so they are kept,
not deleted.

They used to live inside `.keel/state/` and `docs/{analysis,design,qa,...}` —
the exact same paths a real end user's own stories land in after `/keel:init`.
That meant every fresh install shipped 5 fake tickets mixed in with a user's
real ones, and `status --all` / `keel dashboard` / `/keel:health` in the
plugin's own repo checkout showed them by default. Moved here 2026-07-20 as an
immediate fix (see the E2E audit report, finding item 5).

**Schema incompatibility warning:** KEEL-104 artifacts span 12 phases (including `tdd-red`, `tdd-green`, and a `release-manager` at phase 12). These are **invalid against the current `agent-output-schema.json`** which caps at phase 10 and has no `tdd-*` in the agent enum. Do not use these files as templates for new stories — they will fail schema validation. For current 10-phase reference output, see `docs/examples/` (tracked in the fix backlog).

**This is a partial fix.** `marketplace.json`'s plugin entry uses
`"source": "."` — a directory-source install ships the entire repo tree,
`dev-history/` included, unless Claude Code's installer applies its own
filtering for directory sources (not verified from outside the installer).
The real fix is a process one: cut releases from a packaged/tagged artifact
(bin/package-plugin.sh already respects package.json's `files` allowlist,
which excludes this directory) rather than pointing the published marketplace
entry at raw HEAD. Tracked in the remediation plan, item 5.
