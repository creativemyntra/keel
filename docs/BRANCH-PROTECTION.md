# Branch Protection & Developer Workflow

## GitHub branch protection setup

One-time setup by repo admin. Required to enforce G-13 server-side.
Client-side hooks (`scripts/keel-push-guard.cjs`) can be bypassed with
`--no-verify`; GitHub branch protection rules cannot.

**Settings page:** `https://github.com/creativemyntra/keel/settings/branches`

### Required settings — all three protected branches (`dev`, `master`, `prod`)

| Setting | Value |
|---------|-------|
| Require a pull request before merging | ON |
| Required approving reviews | 1 (dev / master) — 2 (prod) |
| Dismiss stale pull request approvals when new commits are pushed | ON |
| Require review from code owners | ON (if CODEOWNERS configured) |
| Require status checks to pass before merging | ON |
| Require branches to be up to date before merging | ON |
| Allow force pushes | OFF |
| Allow deletions | OFF |

### `prod` — additional restrictions

| Setting | Value |
|---------|-------|
| Required approving reviews | **2** |
| Restrict who can push | Release manager only |
| Require linear history | ON |

### Status checks to require (add once CI is configured)

- `keel-version-audit` — G-6 version stamp consistency
- `keel-commit-msg` — G-12 conventional commit format

---

## CODEOWNERS (recommended)

Create `.github/CODEOWNERS`:

```
# Default: all files require release manager review
*          @amar-singh-matellio

# Release-critical paths
scripts/   @amar-singh-matellio
.keel/     @amar-singh-matellio
hooks/     @amar-singh-matellio
skills/    @amar-singh-matellio
```

---

## Complete developer workflow

### Prerequisites (one-time per machine)

```bash
# 1. Install git hooks after cloning
node scripts/install-hooks.cjs

# 2. Save GitHub token for PR automation (keel:finish-work)
#    Generate at: https://github.com/settings/tokens/new  (scope: repo)
echo "ghp_your_token" > ~/.keel/secrets/github.token
chmod 600 ~/.keel/secrets/github.token   # Linux/Mac

# Jira auth is handled by the Atlassian MCP connection — no separate token needed
```

---

### Step-by-step: feature / bug / task

```
┌─────────────────────────────────────────────────────────────┐
│  DEVELOPER                          CLAUDE CODE / GITHUB    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  "start work on HART-302"                                   │
│         │                                                   │
│         ▼  keel:start-work skill                            │
│         ├─ Fetches ticket from Jira (MCP)                   │
│         ├─ Creates branch: fix/hart-302-payment-timeout     │
│         ├─ Pushes branch to remote                          │
│         └─ Transitions HART-302 → In Progress               │
│                                                             │
│  git add ...                                                │
│  git commit -m "fix(payments): handle timeout"              │
│         │                                                   │
│         ▼  G-12 commit-msg hook                             │
│         ├─ Validates conventional format (type/scope/subject)│
│         ├─ Warns if no tracker reference (advisory only)    │
│         └─ Blocks: bad format / unknown type / past tense   │
│                                                             │
│  git push                                                   │
│         │                                                   │
│         ▼  G-13 push guard hook                             │
│         ├─ Blocks push to dev/master/prod (hard stop)       │
│         ├─ Allows feature branch push                       │
│         └─ Prints: "Ask Claude Code: finish work on BRANCH" │
│                                                             │
│  "finish work on HART-302"                                  │
│         │                                                   │
│         ▼  keel:finish-work skill                           │
│         ├─ Reads commits ahead of dev (git log)             │
│         ├─ Fetches Jira ticket for PR body context (MCP)    │
│         ├─ Creates PR to dev via GitHub API                  │
│         │    (token from ~/.keel/secrets/github.token)      │
│         └─ Transitions HART-302 → In Review                 │
│                                                             │
│         ▼  GitHub PR review                                 │
│         ├─ Reviewer approves PR                             │
│         └─ Merge → code lands on dev                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Promotion chain (G-11)

After feature work lands on dev, promote through the chain — each step is a separate PR:

```
dev ──PR──▶ master ──PR──▶ prod
```

**dev → master**
- `keel:finish-work` creates this PR, or ask: "create PR dev to master"
- 1 approval required

**master → prod**
- Ask Claude Code after dev→master is merged: "create prod PR"
- 2 approvals required + release manager sign-off (G-2)
- Do not merge until explicitly authorized

---

## Branch naming convention (G-14 — recommended, not enforced)

Branches created by `keel:start-work` follow this convention automatically.
Manual branches should follow the same pattern where possible.

| Prefix | When to use | Example |
|--------|-------------|---------|
| `feat/` | Story, Epic, new feature | `feat/hart-150-add-retry-logic` |
| `fix/` | Bug | `fix/hart-302-payment-timeout` |
| `hotfix/` | Critical prod fix | `hotfix/hart-310-data-loss` |
| `refactor/` | Code restructure | `refactor/hart-220-extract-service` |
| `perf/` | Performance improvement | `perf/hart-205-reduce-latency` |
| `test/` | Test additions | `test/hart-215-add-coverage` |
| `docs/` | Documentation only | `docs/hart-230-update-readme` |
| `chore/` | Deps, tooling, tasks | `chore/hart-200-update-deps` |
| `ci/` | CI/CD pipeline | `ci/hart-225-add-lint-step` |
| `epic/` | Epic-level branch | `epic/hart-100-payment-overhaul` |
| `release/` | Release prep | `release/v3.17.0` |
| `spike/` | Exploratory work | `spike/hart-240-evaluate-sdk` |

Ticket ID in branch name is **recommended**, not mandatory — work may start from
a plain description with no ticket (`feat/add-retry-logic`). The G-14 push guard
warns (advisory, exit 0) if no standard type prefix is found.

---

## Guardrail reference

| Guardrail | What it does | Enforcement |
|-----------|--------------|-------------|
| G-6 | Version stamp consistency | pre-commit + pre-push hook (blocks) |
| G-11 | dev → master → prod order, no skipping | GUARDRAILS.md + manual verification |
| G-12 | Conventional commit format | commit-msg hook (blocks on bad format, warns on missing ticket) |
| G-13 | No direct push to dev/master/prod | pre-push hook (blocks) + GitHub branch protection |
| G-14 | Start-work / finish-work automation | `keel:start-work` + `keel:finish-work` skills |

---

## Skills reference

| Skill | Invoke | Does |
|-------|--------|------|
| `keel:start-work` | "start work on TICKET-ID" | Creates branch, pushes, transitions Jira → In Progress |
| `keel:finish-work` | "finish work on BRANCH" | Creates PR to dev via API, transitions Jira → In Review |
