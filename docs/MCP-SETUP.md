# Keel — Integration & MCP Setup Guide

Keel works **out of the box with zero configuration**. Every integration below is
optional and can be configured at install time or any time later.

**The canonical setup path is the interactive wizard:**

```
/keel:setup            # full step-by-step wizard (all integrations)
/keel:setup jira       # one integration only
/keel:setup github
/keel:setup playwright
/keel:setup slack
/keel:setup sonarqube  # SAST quality gate (PHPStan baseline always runs)
/keel:setup snyk       # SCA vulnerability DB (composer/npm audit baseline always runs)
/keel:setup status     # show what's configured, no questions asked
```

Each step offers three choices — **Configure now**, **Use default**, or
**Skip (set up later)**. Decisions are appended to `~/.keel/config/setup-audit.log`
so there is a record of who enabled what and when.

---

## Bundled MCP servers (`.mcp.json`)

The plugin ships two MCP servers. Claude Code loads them automatically when the
plugin is installed — no manual registration.

| Server | Transport | Tool prefix | Auth |
|--------|-----------|-------------|------|
| `atlassian` (Jira/Confluence) | SSE — `https://mcp.atlassian.com/v1/sse` | `mcp__plugin_keel_atlassian__*` | OAuth prompt on first use |
| `playwright` (E2E browser) | stdio — `npx @playwright/mcp@latest --headless` | `mcp__plugin_keel_playwright__*` | none (needs Node ≥ 18) |

> **Note on tool names:** plugin-bundled MCP servers are namespaced
> `mcp__plugin_<plugin>_<server>__<tool>`. Agent frontmatter in `agents/*.md`
> uses the full `mcp__plugin_keel_atlassian__*` names — if you copy an agent
> definition out of the plugin, keep the prefix in sync with how the server
> is registered in *your* setup.

---

## 1. Jira / Atlassian

**Default:** enabled, zero config. The first time an agent touches Jira you get an
OAuth prompt (run `/mcp` and authenticate the `atlassian` server if needed).

**Step-by-step (Configure now path):**

1. Run `/keel:setup jira`.
2. Authenticate when prompted (browser OAuth against your Atlassian site).
3. Give the wizard your instance URL (e.g. `https://company.atlassian.net`).
4. The wizard verifies connectivity and writes `~/.keel/config/jira.yml`.

Used by: `product-owner`, `business-analyst`, `scrum-master`, `release-manager`
agents, and (as a skill) `req` / `implement-feature`. (`sprint-planning` and
`analyze-story` were removed 2026-07-20 as dead code -- see remediation plan
item 4; their functionality lives in `req.md` and the `scrum-master` agent.)

## 2. GitHub

**Default:** the `gh` CLI, if installed and authenticated. No MCP server required.

**Step-by-step:**

1. Install the GitHub CLI: https://cli.github.com
2. Run `gh auth login` (interactive — in a Claude Code session, type `! gh auth login`).
3. Run `/keel:setup github` to record your default repository.

Prefer an MCP server instead of the CLI? Register GitHub's official remote server
in your user scope:

```
claude mcp add --scope user --transport http github https://api.githubcopilot.com/mcp/
```

then authenticate via `/mcp`.

## 3. Playwright (E2E testing)

**Default:** enabled via the bundled MCP server. Headless Chromium; browser
binaries download on first use.

**Step-by-step:**

1. Ensure Node.js ≥ 18 (`node --version`).
2. Run `/keel:setup playwright` to pick browsers, headless mode, and the E2E base URL.
3. Or pre-install browsers yourself: `npx playwright install chromium`.

Used by: the `e2e-test` skill and the QA phase of the pipeline.

**Version pinning:** `.mcp.json` ships Playwright MCP using the latest tag. Pin to a specific version (e.g. version 0.0.78) once your E2E suite is validated — latest can introduce breaking behavior changes on updates. To pin: edit the args array in `.mcp.json` and commit the change. Re-run the full E2E suite after each intentional upgrade.

**CJIS note:** Playwright screenshots are JPEG/PNG binary files — the CJIS classification gate scans text only and does NOT inspect screenshot content. All E2E test fixtures and captured application state MUST use fully synthetic, non-CJIS data by design (enforced at test-design time, not by the gate). See G-10 and the screenshot policy amendment in `.keel/GUARDRAILS.md`.

## 4. Slack notifications

**Default:** disabled.

**Step-by-step:**

1. Create an incoming webhook: https://api.slack.com/apps → New App → Incoming Webhooks → Add to Workspace.
2. Run `/keel:setup slack` and paste the webhook URL when asked.
3. The URL is stored in `~/.keel/secrets/slack.webhook` (mode 600, never committed);
   the channel goes in `~/.keel/config/slack.yml`.

---

## 5. SonarQube (SAST quality gate)

**Default:** disabled — the security phase always runs PHPStan L5+ as its SAST
baseline, so you lose nothing by skipping this. SonarQube adds quality-gate
enforcement (gate ERROR = release blocker) on top.

**Step-by-step:**

1. Have a SonarQube server (self-hosted) or a SonarCloud project, and install
   `sonar-scanner` (https://docs.sonarsource.com/sonarqube-server/latest/analyzing-source-code/scanners/sonarscanner/).
2. Generate a token: *[instance]/account/security/generate-tokens*.
3. Run `/keel:setup sonarqube` — asks for server URL + project key, stores the
   token in `~/.keel/secrets/sonarqube.token`, writes `~/.keel/config/sonarqube.yml`,
   and offers to generate `sonar-project.properties` in the repo.

## 6. Snyk (SCA vulnerability database)

**Default:** disabled — the security phase always runs `composer audit` /
`npm audit` as its SCA baseline. Snyk adds its vulnerability DB and license
checks (high/critical = release blocker) on top.

**Step-by-step:**

1. Install the CLI: https://docs.snyk.io/snyk-cli/install-or-update-the-snyk-cli.
2. Get your API token from https://app.snyk.io/account.
3. Run `/keel:setup snyk` — stores the token in `~/.keel/secrets/snyk.token`
   and writes `~/.keel/config/snyk.yml` (`severity_threshold: high`).

Every security report includes a **scanner inventory** (ran / skipped / failed) —
a configured scanner that silently didn't run fails the handshake gate.

---

## Non-interactive environments (CI / Docker)

The wizard needs an interactive Claude Code session. In CI or Docker use the
shell fallback to store tokens:

```bash
bash setup-integrations.sh jira      # prompts for URL / email / API token
bash setup-integrations.sh github    # prompts for repo / PAT
bash setup-integrations.sh slack     # prompts for webhook / channel
```

or provide secrets as environment variables (see `.env.example`) via your CI
secret store — never commit them.

## Where things live

| Path | Contents | In git? |
|------|----------|---------|
| `~/.keel/config/*.yml` | per-integration settings (`enabled`, URLs, channels) | no (user home) |
| `~/.keel/secrets/*` | tokens & webhooks, mode 600 | never |
| `~/.keel/config/setup-audit.log` | append-only audit trail of setup decisions | no |
| `.mcp.json` (plugin root) | bundled MCP server definitions | yes (shipped with plugin) |

## Troubleshooting

- **Jira tools missing** → run `/mcp`; the `atlassian` server must show as connected. Re-authenticate if expired.
- **Playwright server won't start** → check `node --version` (≥ 18) and network access to npm; run `npx -y @playwright/mcp@latest --help` manually to see the error.
- **`gh` says not authenticated** → `gh auth login`, then `gh auth status` should show your account.
- **Wizard state looks wrong** → `/keel:setup status` prints what Keel thinks is configured; edit `~/.keel/config/*.yml` directly if needed.
