---
name: start-work
description: Begin work on a feature, bug, or task. Creates a git branch and optionally links to a Jira ticket via MCP.
---

# start-work

Begin work on a feature, bug, or task. Creates a git branch and optionally transitions a Jira ticket to "In Progress".

## When to use

Invoke when the user says:
- "start work on PROJ-123"
- "start work on [description]"
- "begin PROJ-123"
- "create branch for PROJ-123"
- "I want to work on [ticket or description]"

## Instructions

### Step 1 — Determine input type

The user may provide:
- A **ticket ID** (any alphanumeric-dash format, e.g. HART-302, ASW-14, BUG-7)
- A **description** (free text, e.g. "add retry logic for payment failures")
- Both (e.g. "start work on HART-302 — add retry logic")

Extract whichever is present. Ticket ID takes priority.

### Step 2 — If a ticket ID is given: fetch from Jira via MCP

Use the Jira MCP tool to fetch the ticket:
- Call `getJiraIssue` with the ticket key
- Extract: summary, issue type (Bug / Story / Task / Epic / Sub-task), current status
- Display ticket details to the user before creating the branch

If the MCP call fails (ticket not found, auth error, network issue):
- Inform the user and ask them to provide the description manually
- Fall through to Step 3 with description only

### Step 3 — Determine branch name

Map the issue type to a branch prefix:

| Issue type | Prefix |
|------------|--------|
| Bug | `fix` |
| Story | `feat` |
| Feature | `feat` |
| Epic | `feat` |
| Task | `chore` |
| Sub-task | `chore` |
| Spike | `spike` |
| (unknown) | `feat` |

Build the branch name:
- **Ticket given:** `{prefix}/{ticket-id-lowercase}-{summary-slug}`
  - e.g. `fix/hart-302-payment-timeout-on-slow-networks`
- **Description only:** `{prefix}/{description-slug}`
  - Ask the user for the prefix type if not obvious from context
  - e.g. `feat/add-retry-logic-for-payments`

Slugify rules:
- Lowercase
- Replace spaces and special characters with hyphens
- Remove non-alphanumeric characters except hyphens
- Max 50 characters total after the prefix
- No trailing hyphens

Show the proposed branch name to the user and confirm before creating.

### Step 4 — Create the git branch

Run these git commands:
1. Detect the remote: check `git remote` — prefer `marketplace`, fallback `origin`
2. `git fetch {remote} dev` — get latest dev
3. `git checkout -b {branch} {remote}/dev` — create branch from dev
4. `git push --set-upstream {remote} {branch}` — push and set upstream

If any git command fails:
- Show the exact error
- Do NOT try to fix silently — surface the failure to the user

### Step 5 — Transition Jira ticket (only if ticket was given)

Use the Jira MCP to transition the ticket:
1. Call `getTransitionsForJiraIssue` with the ticket key
2. Find the "In Progress" or equivalent transition
3. Call `transitionJiraIssue` with the found transition ID

If no "In Progress" transition exists or the call fails:
- Warn the user and ask them to transition manually in Jira
- This is NOT a fatal error — branch creation is already done

### Step 6 — Print summary

Print a clear summary:
```
Branch ready: {branch}

Next steps:
  git add ...
  git commit -m "{prefix}(<scope>): <description>"
  git push
  Then open a PR to dev on GitHub when ready.
```

## Rules

- Always confirm the branch name before creating it (Step 3 confirmation).
- Never create a branch if already on a branch other than dev/master/main without warning the user first.
- If the user is already on a feature branch, warn: "You're on {current-branch}. Should I still create a new branch from dev?"
- Branch creation and Jira transition are independent: a Jira failure does not undo the branch.
- Never guess the ticket status — always fetch from Jira MCP.
- Ticket ID format is flexible — accept any project-key pattern the user provides, do not validate against a hardcoded regex.
- No credentials or token files are needed — Jira auth is handled entirely by the MCP connection.
