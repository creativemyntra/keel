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

## Branch naming convention (enforced client-side by G-13 hook)

| Prefix | Use for |
|--------|---------|
| `feature/` | New features (maps to a Jira story) |
| `fix/` | Bug fixes (maps to a Jira bug ticket) |
| `hotfix/` | Critical prod fixes |
| `refactor/` | Code restructuring |
| `perf/` | Performance improvements |
| `test/` | Test additions |
| `docs/` | Documentation only |
| `chore/` | Dependency bumps, tooling |
| `ci/` | CI/CD pipeline changes |
| `release/` | Release preparation |
| `spike/` | Exploratory / throwaway work |

## Developer workflow after these settings are applied

```bash
# 1. Create a feature branch from dev
git checkout dev && git pull marketplace dev
git checkout -b feature/HART-302-fix-payment-timeout

# 2. Make changes, commit (G-12 enforces message format + Jira ticket)
git add ...
git commit -m "fix(payments): handle timeout on slow networks

Fixes HART-302"

# 3. Push feature branch (G-13 hook allows this)
git push marketplace feature/HART-302-fix-payment-timeout

# 4. Open PR to dev on GitHub, get approval
#    https://github.com/creativemyntra/keel/compare/dev...feature/HART-302-fix-payment-timeout

# 5. After approval: merge via GitHub UI — triggers deploy to dev environment

# 6. When ready: promote dev -> master -> prod (G-11, separate PRs)
```
