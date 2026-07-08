# Audit Record — MCP Setup Wizard Rework (v3.3.0)

| Field | Value |
|-------|-------|
| **Date** | 2026-07-08 |
| **Branch** | `feature/mcp-setup-wizard` |
| **Requested by** | Amar Singh |
| **Executed by** | Claude Code (Fable 5) session, reviewed change-by-change |
| **Type** | Root-cause fix (no patch work) — replaces the broken setup path, does not layer on top of it |

## Problem (evidence)

The "MCP setup wizard" advertised by the docs did not set up any MCP servers and was
unreachable from the plugin install flow:

1. **Wizard ↔ MCP disconnect** — `setup-wizard.sh` and `setup-integrations.sh` wrote
   `~/.keel/config/*.yml` and `~/.keel/secrets/*`, but a repo-wide grep confirmed **no code
   ever read those files back**, and neither script touched `.mcp.json` or ran `claude mcp add`.
2. **Unreachable** — since the v3.1 plugin restructure, install is `claude plugin install keel`;
   nothing in that flow invoked `setup-wizard.sh`, and there was no `/keel:setup` command.
3. **Legacy install path** — `setup-wizard.sh` Step 5 performed the pre-plugin install
   (git clone into `~/.claude/skills/keel-framework`), plus `npm install -g @amarsingh/keel`
   and `docker pull amarsingh/keel:latest` — both channels unpublished (repo secrets pending) —
   with mixed version strings (v3.0.2, v2.1.0 against current v3.2.0).
4. **Broken agent tool allowlists** — agents declared `mcp__atlassian__getJiraIssue` etc., but
   plugin-bundled MCP servers are namespaced `mcp__plugin_keel_atlassian__*` (verified live:
   the bundled server exposes `mcp__plugin_keel_atlassian__authenticate`). The declared tools
   could never resolve.
5. **Missing servers** — `.mcp.json` bundled only Atlassian; no Playwright or GitHub MCP anywhere,
   despite README listing Playwright as an integration.
6. **Doc rot** — `.env.example` referenced nonexistent commands (`/keel test-mcp`,
   `/keel setup-mcp`) and `.claude/MCP-QUICK-START.md`; the README Documentation section linked
   ~15 nonexistent files (verified by existence check); `setup-wizard.sh` collected a Slack
   webhook but never saved it.
7. **Platform gap** — both wizards were bash-only; unusable natively on Windows.

## Decision

Make the wizard native to Claude Code (an interactive slash command driven by
AskUserQuestion), keep zero-config defaults in the bundled `.mcp.json`, and retire the
legacy bash wizard. Per-integration "Configure now / Use default / Skip (set up later)"
with an append-only audit log of decisions.

## Changes

| # | File | Change |
|---|------|--------|
| 1 | `commands/setup.md` | **New** `/keel:setup` interactive wizard (full run, per-integration, `status`) |
| 2 | `.mcp.json` | Added bundled Playwright MCP server (`npx @playwright/mcp@latest --headless`) |
| 3 | `agents/product-owner.md`, `agents/business-analyst.md`, `agents/scrum-master.md`, `agents/release-manager.md` | Tool prefix `mcp__atlassian__*` → `mcp__plugin_keel_atlassian__*` |
| 4 | `setup-wizard.sh` | **Removed** (legacy; superseded by `/keel:setup`) |
| 5 | `bin/package-plugin.sh` | Stopped bundling `setup-wizard.sh`; comment documents the CI fallback split |
| 6 | `scripts/init-keel-home.sh` | First-run message points to `/keel:setup`; playwright default notes the bundled MCP server |
| 7 | `docs/MCP-SETUP.md` | **New** step-by-step integration guide (replaces broken `.claude/MCP-SETUP-WIZARD.md` link) |
| 8 | `README.md` | Integrations section rewritten around `/keel:setup`; Documentation section now links only files that exist |
| 9 | `INSTALL.md` | `/keel:setup` in command table + rewritten Optional Integrations |
| 10 | `commands/keel.md` | `/keel:setup` added to the router table |
| 11 | `.env.example` | Dead references replaced with `/keel:setup` and `docs/MCP-SETUP.md` |
| 12 | `CHANGELOG.md`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `package.json`, `Dockerfile` | v3.3.0 |

Kept: `setup-integrations.sh` — still the non-interactive token-storage fallback for CI/Docker
(referenced by `Dockerfile` and `package.json` files list).

## Validation (see commit for exact outputs)

- [x] JSON valid: `.mcp.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `package.json`, `hooks/hooks.json` — all parse OK
- [x] Bash syntax: `bash -n` on `scripts/init-keel-home.sh`, `bin/package-plugin.sh`, `setup-integrations.sh` — all OK
- [x] No stale references: repo-wide grep for `setup-wizard.sh`, `mcp__atlassian__`, `.claude/MCP`, `test-mcp`, `setup-mcp` returns only historical CHANGELOG/release-notes entries and this record
- [x] All markdown links in README Documentation section, INSTALL.md, and QUICK-START resolve to files in the repo (11/11 OK)
- [x] Version consistency: 3.3.0 across plugin.json, marketplace.json, package.json, Dockerfile LABEL, CHANGELOG heading
