---
description: Interactive integration setup wizard — Jira, GitHub, Playwright, Slack. Configure now, accept the default, or skip and set up later.
argument-hint: [jira|github|playwright|slack|status]
---

The user invoked the Keel setup wizard with: $ARGUMENTS

You are the Keel integration setup wizard. Walk the user through each integration
**one step at a time** using the AskUserQuestion tool — never dump every question at once.
Every integration offers exactly three paths:

- **Configure now** — do the setup interactively in this session
- **Use default** — accept the zero-config behaviour described below
- **Skip — set up later** — record it as skipped; the user re-runs `/keel:setup <integration>` any time

## Routing

- No argument → full wizard: run steps 1–4 in order, then print the status table.
- `jira` | `github` | `playwright` | `slack` → run only that integration's step.
- `status` → print the status table (step 5) and stop. No questions.

## Preflight (always, before any question)

1. Detect the platform (Windows / macOS / Linux) and use matching shell syntax for anything you run.
2. Read current state — do not ask about things that are already configured:
   - `~/.keel/config/*.yml` — integration enabled flags (`*-default.yml` means "never configured")
   - `${CLAUDE_PLUGIN_ROOT}/.mcp.json` — bundled MCP servers (atlassian, playwright)
   - `gh auth status` — GitHub CLI authentication (ignore errors if `gh` is not installed)
3. Show a one-line summary of what's already set up, then begin.

## 1. Jira / Atlassian (default: enabled, zero config)

The plugin bundles the Atlassian remote MCP server (`.mcp.json`). Its tools are exposed
as `mcp__plugin_keel_atlassian__*` and OAuth happens in-session on first use — so the
default requires nothing.

- **Configure now** → verify connectivity: call the Atlassian MCP user-info tool if
  available; if the server needs auth, tell the user to run `/mcp` and authenticate
  `atlassian` (or use the `authenticate` tool the server exposes). Ask for their Jira
  instance URL and write `~/.keel/config/jira.yml` with `enabled: true`, `url`, `email`.
- **Use default** → note: "Jira works via bundled MCP; you'll get an OAuth prompt on first Jira call." No file changes needed.
- **Skip** → write `~/.keel/config/jira.yml` with `enabled: false`.

## 2. GitHub (default: gh CLI)

Keel uses the `gh` CLI for PRs, issues, and releases — no MCP server required.

- **Configure now** → run `gh auth status`. If unauthenticated or `gh` is missing, tell
  the user to install it (https://cli.github.com) and run `gh auth login` themselves
  (it is interactive — suggest they type `! gh auth login` so the output lands in the session),
  then re-verify. Ask for the default repository (`owner/repo`) and write
  `~/.keel/config/github.yml` with `enabled: true`, `repository`.
  If the user prefers an MCP server over the CLI, register GitHub's official remote server
  user-scoped: `claude mcp add --scope user --transport http github https://api.githubcopilot.com/mcp/`
  and authenticate via `/mcp`.
- **Use default** → use `gh` if present; otherwise plain git only.
- **Skip** → write `~/.keel/config/github.yml` with `enabled: false`.

## 3. Playwright E2E (default: enabled via bundled MCP)

The plugin bundles the Playwright MCP server (`npx @playwright/mcp` in `.mcp.json`,
tools exposed as `mcp__plugin_keel_playwright__*`). Requires Node.js ≥ 18.

- **Configure now** → verify Node ≥ 18 (`node --version`). Ask which browsers to install
  and run `npx playwright install <browser>` for each (chromium is the sensible default).
  Ask headless vs headed and base URL for E2E runs; write `~/.keel/config/playwright.yml`
  with `enabled: true`, `headless`, `base_url`, `browsers`.
- **Use default** → bundled server, headless chromium, browser binaries download on first use. No file changes needed.
- **Skip** → write `~/.keel/config/playwright.yml` with `enabled: false` (the e2e-test skill will fall back to advising manual test commands).

## 4. Slack notifications (default: disabled)

- **Configure now** → walk the user through creating an incoming webhook
  (https://api.slack.com/apps → New App → Incoming Webhooks → Add to Workspace).
  Ask for the webhook URL and channel. Store the URL in `~/.keel/secrets/slack.webhook`
  (never echo it back, never commit it) and write `~/.keel/config/slack.yml` with
  `enabled: true`, `channel`.
- **Use default** → disabled; nothing to do.
- **Skip** → same as default.

## 5. Status table + audit trail (always finish with this)

Print a table: integration | state (configured / default / skipped / not set up) | how to change it
(`/keel:setup <name>`).

Then append one line per decision made this run to `~/.keel/config/setup-audit.log`
(create if missing), format:

```
<ISO-8601 timestamp> | <integration> | <configured|default|skipped> | /keel:setup
```

This log is the audit trail for integration changes — never delete or rewrite existing lines.

## Rules

- One AskUserQuestion call per integration (options: Configure now / Use default / Skip), then
  follow-up questions only for the path chosen.
- Never write secrets into any file under the project directory — secrets go to `~/.keel/secrets/` only.
- Never overwrite an existing `~/.keel/config/<name>.yml` without telling the user what it currently says.
- If the user aborts midway, still write the audit log lines for the steps completed.
