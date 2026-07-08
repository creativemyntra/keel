# Keel — Installation Guide

Install keel as a marketplace plugin in **Claude Code (terminal)** or **Claude Desktop (Cowork)**.

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

First run drops into the setup wizard automatically.  
Or trigger it manually: `/keel init`

---

## Option B — Claude Desktop (Cowork)

1. Open **Claude Desktop → Settings → Capabilities → Plugins**
2. Click **Add Marketplace Source**
3. Enter: `https://github.com/creativemyntra/keel`
4. Find **Keel AI-SDLC** in the list → click **Install**
5. Open any project folder → type `/keel init`

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
- uses: creativemyntra/keel@v3.0.2
  with:
    story: FEAT-1
    phase: full-pipeline
```

---

## Optional Integrations

After install, connect your tools:

```bash
# Jira
bash setup-integrations.sh jira

# GitHub  
bash setup-integrations.sh github

# Slack
bash setup-integrations.sh slack
```

---

## Available Commands

| Command | Description |
|---------|-------------|
| `/keel init` | Scaffold or adopt a project |
| `/keel req --story=FEAT-1` | Write BDD requirements |
| `/keel tdd-red --story=FEAT-1` | Write failing tests |
| `/keel tdd-green --story=FEAT-1` | Implement to pass tests |
| `/keel test --story=FEAT-1` | Run full test suite |
| `/keel sec --story=FEAT-1` | OWASP security scan |
| `/keel deploy --story=FEAT-1` | Deploy with canary rollout |

## Available Skills

| Skill | Trigger |
|-------|---------|
| `keel:sprint-planning` | "plan sprint", "/sprint" |
| `keel:create-prd` | "create PRD", "/keel req" |
| `keel:analyze-story` | "analyze story" |
| `keel:investigate-defect` | "RCA", "investigate bug" |
| `keel:create-mom` | "minutes of meeting", "/mom" |
| `keel:generate-tests` | "generate tests" |
| `keel:e2e-test` | "e2e test", "playwright" |
| `keel:review-code` | "review code", "code review" |
| `keel:release-check` | "release check", "go/no-go" |
| `keel:implement-feature` | "implement feature", "build this" |

---

## Requirements

- Claude Code ≥ 1.0.0 **or** Claude Desktop (Cowork mode)
- Node.js ≥ 18 (for packaging scripts)
- PHP 8.1 + Composer (for CakePHP projects)
