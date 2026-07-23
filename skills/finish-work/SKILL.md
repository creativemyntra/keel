---
name: finish-work
description: Finish work on a branch or ticket — creates a PR to dev with an industry-standard description and transitions Jira to In Review.
---

# finish-work

Create a PR from the current feature branch to `dev`, with a complete industry-standard
description. Optionally transitions the linked Jira ticket to "In Review".

## When to use

Invoke when the developer says:
- "finish work on HART-302"
- "finish work on feat/hart-302-payment-timeout"
- "create PR for my branch"
- "I'm done, create PR"
- "submit my work"
- "/keel:finish-work"

## Instructions

### Step 1 — Identify branch and ticket

1. Get current branch: run `git rev-parse --abbrev-ref HEAD`
2. Extract ticket ID from branch name if present (any alphanumeric-dash segment like `HART-302`, `BUG-7`)
3. If the user provided a ticket ID explicitly, use that instead
4. If no ticket found in branch name and user didn't provide one, proceed without Jira integration (PR-only mode)

### Step 2 — Gather commit info

Run `git log origin/dev..HEAD --oneline` to get the list of commits on this branch that are not yet on dev. If the result is empty, inform the user: "No commits ahead of dev — nothing to submit."

Also run `git diff origin/dev...HEAD --name-only` to get the list of changed files.

### Step 3 — Fetch Jira ticket (if ticket found)

Use `getJiraIssue` MCP tool to fetch:
- `summary` — used as PR title basis
- `issuetype.name` — maps to branch prefix
- `status.name` — current status
- `description` — business context for PR body

If MCP call fails, continue in PR-only mode without Jira data.

### Step 4 — Build PR title and body

**Title format:** `{type}({scope}): {summary or description}`
- Derive `type` from branch prefix: `feat/` → `feat`, `fix/` → `fix`, `chore/` → `chore`, etc.
- Derive `scope` from the component area touched (infer from changed file paths)
- Max 72 characters

**Body template (industry standard):**

```markdown
## Overview

{1-2 sentence summary of what this PR does and why — from ticket summary or commit messages}

Jira: [{TICKET-ID}](https://vidocqstudios.atlassian.net/browse/{TICKET-ID})

---

## Changes

{bullet list of changed files grouped by area}

---

## Commits

{list of commits from git log, one per line}

---

## Testing

- [ ] Unit tests pass locally
- [ ] Manual testing completed for changed flows
- [ ] No regressions observed

---

## Breaking Changes

None <!-- update if applicable -->

---

## Checklist

- [x] Branch follows naming convention (G-14)
- [x] Commits follow conventional format (G-12)
- [x] No direct push to protected branch (G-13)
- [ ] Self-reviewed diff before submitting
- [ ] Peer review requested

---

## Notes for Reviewer

{any context the reviewer needs — edge cases, deployment notes, dependencies}

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Fill all sections with real data from git log and Jira. Do not leave template placeholders unfilled.

### Step 5 — Create the PR via GitHub API

Read the GitHub token from `~/.keel/secrets/github.token` (format: `ghp_...` on one line).

If token file is missing:
- Warn: "No GitHub token found at ~/.keel/secrets/github.token"
- Print the PR creation URL for manual creation:
  `https://github.com/creativemyntra/keel/compare/dev...{branch}`
- Print the full PR body for copy-paste
- Stop here

If token exists, call the GitHub REST API:
```
POST https://api.github.com/repos/creativemyntra/keel/pulls
{
  "title": "{title}",
  "body": "{body}",
  "head": "{branch}",
  "base": "dev",
  "maintainer_can_modify": true
}
```

Use PowerShell `Invoke-RestMethod` for the API call. Store token in a local variable — do not log it or include it in output.

Report: PR URL, PR number, base/head branches.

### Step 6 — Transition Jira ticket to In Review (if ticket found)

Use `getTransitionsForJiraIssue` to find the "In Review" or "Code Review" or "PR Open" transition.

If found, call `transitionJiraIssue` with that transition ID.

If not found, warn: "No 'In Review' transition found — update status manually in Jira."

### Step 7 — Print summary

```
PR created: #{number}
  {pr_url}
  {branch} → dev
  {commit_count} commits, {file_count} files changed

Jira: {TICKET-ID} → {new_status}

Reviewer reminder:
  Ask a teammate to review at the PR URL above.
  Merge only after approval — G-13 enforces PR-first policy.
```

## Rules

- Never push directly to dev — only create the PR
- Never merge the PR — developer or reviewer merges from GitHub UI
- If the branch has 0 commits ahead of dev, stop and inform the user
- Token must never appear in PR body, commit messages, or tool output
- If Jira MCP is unavailable, create the PR in PR-only mode — do not block on Jira
- If GitHub API returns 422 (PR already exists), fetch and report the existing PR URL
