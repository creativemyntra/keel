# GitHub Branch Protection Setup

One-time setup by repo admin. Required to enforce G-13 server-side.
Client-side hooks (`scripts/keel-push-guard.cjs`) can be bypassed with
`--no-verify`; GitHub branch protection rules cannot.

## Branches to protect: `dev`, `master`, `prod`

Apply these settings to all three branches at:
`https://github.com/creativemyntra/keel/settings/branches`

### Required settings (all three branches)

| Setting | Value |
|---------|-------|
| Require a pull request before merging | ON |
| Required approving reviews | 1 (dev) / 1 (master) / 2 (prod) |
| Dismiss stale pull request approvals when new commits are pushed | ON |
| Require review from code owners | ON (if CODEOWNERS file exists) |
| Require status checks to pass before merging | ON |
| Require branches to be up to date before merging | ON |
| Allow force pushes | OFF |
| Allow deletions | OFF |

### Status checks to require

Add these once CI is configured:

- `keel-version-audit` (G-6)
- `keel-commit-msg` (G-12)

### `prod` — additional restrictions

- Required approving reviews: **2**
- Restrict who can push: release manager only
- Require linear history: ON

## CODEOWNERS file (recommended)

Create `.github/CODEOWNERS` to auto-assign reviewers:

```
# Default owner for all files
*   @amar-singh-matellio

# Release-critical paths require release manager sign-off
scripts/   @amar-singh-matellio
.keel/     @amar-singh-matellio
hooks/     @amar-singh-matellio
```

## Branch naming convention (G-13 + G-14)

Branch names MUST include the Jira ticket ID. Use `keel-start-work` to
auto-generate compliant names (see G-14).

| Prefix | Jira type | Example |
|--------|-----------|---------|
| `feat/` | Story, Epic | `feat/hart-150-add-retry-logic` |
| `fix/` | Bug | `fix/hart-302-payment-timeout` |
| `hotfix/` | Critical prod bug | `hotfix/hart-310-data-loss` |
| `refactor/` | Refactor task | `refactor/hart-220-extract-service` |
| `perf/` | Performance | `perf/hart-205-reduce-latency` |
| `test/` | Test task | `test/hart-215-add-coverage` |
| `docs/` | Docs task | `docs/hart-230-update-readme` |
| `chore/` | Task, Sub-task | `chore/hart-200-update-deps` |
| `ci/` | CI/CD task | `ci/hart-225-add-lint-step` |
| `epic/` | Epic (alternative) | `epic/hart-100-payment-overhaul` |
| `release/` | Release prep | `release/v3.17.0` |
| `spike/` | Exploratory work | `spike/hart-240-evaluate-sdk` |

## Developer workflow (G-14 start-work automation)

```bash
# 1. Start work — creates branch + transitions Jira to In Progress
node scripts/keel-start-work.cjs HART-302
#  -> creates fix/hart-302-payment-timeout from dev
#  -> pushes branch to marketplace with upstream tracking
#  -> transitions HART-302 to "In Progress" in Jira

# 2. Make changes, commit (G-12 enforces format; branch name provides ticket ref)
git add ...
git commit -m "fix(payments): handle timeout on slow networks"
# No need to repeat ticket ID in body -- branch name carries it implicitly

# 3. Push additional commits (G-13 hook allows feature branches)
git push

# 4. Open PR to dev on GitHub, get approval
#    https://github.com/creativemyntra/keel/compare/dev...fix/hart-302-payment-timeout

# 5. After approval: merge via GitHub UI -- triggers deploy to dev environment

# 6. When ready: promote dev -> master -> prod (G-11, separate PRs)
```

### First-time Jira credential setup

```bash
# Generate API token at:
#   https://id.atlassian.com/manage-profile/security/api-tokens
echo "jira-user:api-token" > ~/.keel/secrets/jira.token
chmod 600 ~/.keel/secrets/jira.token
```
