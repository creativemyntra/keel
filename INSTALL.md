# Keel — Installation Guide

Install Keel as a marketplace plugin in **Claude Code**.

---

## Option A — Claude Code Terminal (fastest)

```bash
# 1. Add the keel marketplace source
claude plugin marketplace add https://github.com/creativemyntra/keel

# 2. Install the plugin
claude plugin install keel

# 3. Verify
claude plugin list
```

On the first session after install, Keel initializes `~/.keel` automatically
(config + secrets directories). Then run `/keel:init` in your project.

---

## Option B — Claude Desktop

1. Open **Claude Desktop → Settings → Capabilities → Plugins**
2. Click **Add Marketplace Source**
3. Enter: `https://github.com/creativemyntra/keel`
4. Find **Keel AI-SDLC** in the list → click **Install**
5. Open any project folder → type `/keel:init`

---

## Option C — Local install from cloned repo

```bash
git clone https://github.com/creativemyntra/keel
cd keel
claude plugin install .
```

---

## Option D — GitHub Action (CI/CD)

```yaml
- uses: creativemyntra/keel@v3.2.0
  with:
    story: FEAT-1
    phase: full-pipeline
```

---

## Commands

All commands are namespaced under the plugin: `/keel:<command>`.

| Command | Description |
|---------|-------------|
| `/keel:init` | Scaffold or adopt a project |
| `/keel:brainstorm --goal="..."` | Generate feature ideas |
| `/keel:req --story=FEAT-1` | Write BDD requirements |
| `/keel:design --story=FEAT-1` | Architecture, DB schema, API contracts |
| `/keel:tdd-red --story=FEAT-1` | Write failing tests |
| `/keel:tdd-green --story=FEAT-1` | Implement to pass tests |
| `/keel:tdd-refactor --story=FEAT-1` | Refactor with tests green |
| `/keel:test --story=FEAT-1` | Run full test suite + coverage gate |
| `/keel:sec --story=FEAT-1` | OWASP security scan |
| `/keel:impact <Class or file>` | CodeGraph impact analysis (blast radius of a change) |
| `/keel:deploy --story=FEAT-1` | Release gate + staged rollout |

## Agents

13 agents install with the plugin (invoke via the Task tool or let the
orchestrator route): `keel:orchestrator`, `keel:product-owner`,
`keel:business-analyst`, `keel:solution-architect`, `keel:software-engineer`,
`keel:qa-engineer`, `keel:security-engineer`, `keel:technical-writer`,
`keel:release-manager`, `keel:scrum-master`, plus infrastructure agents
`keel:handshake-agent`, `keel:state-management-agent`, `keel:audit-agent`.

## Skills

| Skill | Trigger |
|-------|---------|
| `keel:sprint-planning` | "plan sprint" |
| `keel:create-prd` | "create PRD" |
| `keel:analyze-story` | "analyze story" |
| `keel:investigate-defect` | "RCA", "investigate bug" |
| `keel:create-mom` | "minutes of meeting" |
| `keel:generate-tests` | "generate tests" |
| `keel:e2e-test` | "e2e test", "playwright" |
| `keel:review-code` | "review code" |
| `keel:release-check` | "release check", "go/no-go" |
| `keel:implement-feature` | "implement feature", "build this" |

---

## Optional Integrations

Jira works out of the box through the bundled Atlassian MCP server (`.mcp.json`) —
you'll be prompted to authenticate on first use.

For GitHub/Slack shell integrations:

```bash
bash setup-integrations.sh github
bash setup-integrations.sh slack
```

---

## Requirements

- Claude Code ≥ 1.0.0 **or** Claude Desktop
- PHP 8.1 + Composer (for CakePHP projects)
- Node.js ≥ 18 (only for the optional npm CLI)
