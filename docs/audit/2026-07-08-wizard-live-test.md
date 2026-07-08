# Audit Record — /keel:setup Live Test & Refinements (v3.3.1)

| Field | Value |
|-------|-------|
| **Date** | 2026-07-08 |
| **Branch** | `feature/wizard-test-refinements` |
| **Requested by** | Amar Singh |
| **Executed by** | Claude Code (Fable 5) session, following `commands/setup.md` verbatim |
| **Relates to** | [2026-07-08-mcp-setup-wizard.md](2026-07-08-mcp-setup-wizard.md) (v3.3.0) |

## Test run (evidence)

Full wizard executed end-to-end on a Windows 11 host, all four integrations:

| Step | Preflight found | User choice | Result |
|------|----------------|-------------|--------|
| 1/4 Jira | Bundled Atlassian MCP loaded, unauthenticated; `jira-default.yml` untouched | Use default | No changes; OAuth deferred to first Jira call |
| 2/4 GitHub | `gh` CLI **not installed** | Use default | Plain-git fallback; option text adapted to reflect missing `gh` |
| 3/4 Playwright | Node v26.1.0 (≥ 18 ✓); bundled MCP server present in `.mcp.json` | Use default | No changes; headless Chromium on first use |
| 4/4 Slack | `slack-default.yml` untouched (disabled) | Use default | Disabled, nothing to do |

Audit log written: 4 entries appended to `~/.keel/config/setup-audit.log`
(`2026-07-08T21:45:46+05:30 | <integration> | default | /keel:setup`).

**Outcome: PASS — no functional defects.** Preflight correctly read state before asking,
questions were one-per-integration with the three-way choice, no secrets were requested
on the default path, and the flow was fully Windows-native (no bash).

## Observations → refinements shipped in v3.3.1

1. **BOM hazard (real, hit during the session):** Windows PowerShell 5.1
   `Out-File`/`Add-Content -Encoding utf8` prepend a UTF-8 BOM — this corrupted a git
   commit subject earlier in the same session and would corrupt the audit log's first
   entry. `commands/setup.md` §5 now mandates BOM-free UTF-8 with a concrete
   `[IO.File]::AppendAllText` recipe.
2. **Preflight-aware options:** during the test the GitHub option text was adapted
   ad hoc because `gh` was missing. Now codified as a rule: preflight results must
   shape option descriptions (missing `gh`, Node < 18, already-configured integrations).
3. **Step numbering:** `1/4 … 4/4` headers were used in the test and made the wizard's
   length visible; now required by the spec.

Non-issues noted for the record: the host's `~/.keel/config/*-default.yml` files were
created by a pre-3.1 script version (wording drift, harmless — `write_default` never
clobbers), and the `.initialized` marker was absent, so the next SessionStart re-runs
the idempotent init once.

## Validation

- [x] JSON valid: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `package.json`
- [x] Version consistency: 3.3.1 across plugin.json, marketplace.json, package.json, Dockerfile LABEL, CHANGELOG heading
- [x] `commands/setup.md` edits are spec-only (no behaviour contradiction with v3.3.0 flow)
