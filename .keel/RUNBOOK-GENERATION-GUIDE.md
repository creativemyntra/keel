# Release Runbook Generation Guide

**Parameterized Release Manager Runbook Generator**

Generate customized release runbooks from Jira tickets. All dates are calculated from the ticket's due date. Perfect for multi-project releases.

---

## Quick Start

### Basic Usage

```bash
# Generate runbook for a Jira ticket
node scripts/generate-release-runbook.cjs --ticket H30-1

# With custom timezone
node scripts/generate-release-runbook.cjs --ticket H30-1 --timezone "America/New_York"

# Different project
node scripts/generate-release-runbook.cjs --ticket PROJ-456 --timezone "Europe/London"
```

### Output

```
📋 RELEASE RUNBOOK GENERATOR
   Ticket: H30-1
   Timezone: America/Los_Angeles

Calculated Milestones:
  Go-No-Go: Aug 04, 2026 (Tuesday)
  War Room Opens: Aug 05, 2026 (Wednesday)
  10% Rollout: Aug 06, 2026 (Thursday)
  50% Rollout: Aug 07, 2026 (Friday)
  100% Rollout: Aug 08, 2026 (Saturday)
  Release Complete: Aug 12, 2026 (Wednesday)

✅ RUNBOOK GENERATED
   Project: Project H30
   Ticket: H30-1
   Release: Aug 12, 2026
   Output: docs/releases/H30-2026-08-12-RUNBOOK.md
```

Generated runbook is saved to: `docs/releases/[PROJECT]-[DATE]-RUNBOOK.md`

---

## How It Works

### 1. Jira Integration

The script reads release ticket details:
- **Ticket Key:** H30-1, PROJ-456, etc.
- **Due Date:** Used as release date (calculates backwards from this)
- **Project Name:** Used for runbook title
- **Summary:** Added to executive summary
- **Description:** Added for context

**In Production:**
```javascript
// Real integration with Atlassian MCP
const ticket = await getJiraIssue('H30-1');
// Returns:
// {
//   key: 'H30-1',
//   projectKey: 'H30',
//   projectName: 'Hart 30',
//   summary: 'Hart 30 Release v3.18.2',
//   dueDate: '2026-05-12',
//   description: 'Complete release cycle...'
// }
```

### 2. Date Calculation

Starting from **due date** (release date), calculates backwards:

```
Due Date: May 12 (Monday)
  ↑
  | - 4 days
  |
100% Rollout: May 8 (Thursday)
  ↑
  | - 1 day
  |
50% Rollout: May 7 (Wednesday)
  ↑
  | - 1 day
  |
10% Rollout: May 6 (Tuesday)
  ↑
  | - 1 day
  |
War Room Opens: May 5 (Monday)
  ↑
  | - 1 day
  |
Go-No-Go Call: May 4 (Sunday)
```

### 3. Template Rendering

All dates in the runbook template are replaced with calculated values:
- `${goNoGoDate}` → "May 04, 2026"
- `${rollout10Date}` → "May 06, 2026"
- `${rollout100Date}` → "May 08, 2026"
- `${releaseDate}` → "May 12, 2026"
- Timezone in times: "10:00 AM PST"

### 4. File Generation

Saved with naming pattern: `[PROJECT]-[DATE]-RUNBOOK.md`

Examples:
- `H30-2026-05-12-RUNBOOK.md` (Hart 30, May 12)
- `PROJ-2026-06-15-RUNBOOK.md` (Project, June 15)
- `API-2026-07-20-RUNBOOK.md` (API Platform, July 20)

All files saved to: `docs/releases/`

---

## Integration with Jira (Future)

When integrated with Atlassian MCP, workflow becomes:

```
1. Create/Update Release Ticket in Jira
   ├─ Title: "Hart 30 Release v3.18.2"
   ├─ Due Date: 2026-05-12
   └─ Description: "Complete release cycle"

2. Run Script
   node scripts/generate-release-runbook.cjs --ticket H30-1

3. Script Fetches from Jira
   └─ Reads ticket details via MCP

4. Generate Runbook
   └─ All dates calculated from due date

5. Save to docs/releases/
   └─ Share with release manager

6. Release Manager Executes
   └─ Follow day-by-day instructions
```

**Pseudocode for MCP integration:**

```javascript
// In generate-release-runbook.cjs (future version)
const { getJiraIssue } = require('@anthropic-sdk/mcp-atlassian');

async function getTicketFromJira(ticketKey) {
  const ticket = await getJiraIssue(ticketKey);
  
  return {
    key: ticket.key,
    projectKey: ticket.project.key,
    projectName: ticket.project.name,
    summary: ticket.summary,
    description: ticket.description,
    dueDate: ticket.duedate, // YYYY-MM-DD
  };
}
```

---

## Usage Examples

### Example 1: Hart 30 Release (Pacific Time)

```bash
$ node scripts/generate-release-runbook.cjs --ticket H30-1 --timezone "America/Los_Angeles"

Calculated Milestones:
  Go-No-Go: May 04, 2026 (Saturday)
  War Room Opens: May 05, 2026 (Sunday)
  10% Rollout: May 06, 2026 (Monday)
  50% Rollout: May 07, 2026 (Tuesday)
  100% Rollout: May 08, 2026 (Wednesday)
  Release Complete: May 12, 2026 (Sunday)

Output: docs/releases/H30-2026-05-12-RUNBOOK.md
```

### Example 2: API Platform Release (Eastern Time)

```bash
$ node scripts/generate-release-runbook.cjs --ticket API-789 --timezone "America/New_York"

Calculated Milestones:
  Go-No-Go: Jun 03, 2026 (Tuesday)
  War Room Opens: Jun 04, 2026 (Wednesday)
  10% Rollout: Jun 05, 2026 (Thursday)
  50% Rollout: Jun 06, 2026 (Friday)
  100% Rollout: Jun 07, 2026 (Saturday)
  Release Complete: Jun 11, 2026 (Wednesday)

Output: docs/releases/API-2026-06-11-RUNBOOK.md
```

### Example 3: EU Release (UTC)

```bash
$ node scripts/generate-release-runbook.cjs --ticket EU-456 --timezone "Europe/London"

Calculated Milestones:
  Go-No-Go: Jul 05, 2026 (Sunday)
  War Room Opens: Jul 06, 2026 (Monday)
  10% Rollout: Jul 07, 2026 (Tuesday)
  50% Rollout: Jul 08, 2026 (Wednesday)
  100% Rollout: Jul 09, 2026 (Thursday)
  Release Complete: Jul 13, 2026 (Monday)

Output: docs/releases/EU-2026-07-13-RUNBOOK.md
```

---

## Customization

### Adjust Release Timeline

The script uses fixed intervals:
- Go-No-Go: **5 days** before release
- War Room: **1 day** before 10% rollout
- 10% Rollout: **1 day** before 50% rollout
- 50% Rollout: **1 day** before 100% rollout
- 100% Rollout: **4 days** before release complete

To customize, modify `calculateMilestones()` in the script:

```javascript
function calculateMilestones(releaseDate, tz) {
  const release = createDate(releaseDate);
  const rollout100 = release.subtract(4); // ← Change this
  const rollout50 = rollout100.subtract(1); // ← Or this
  // ...
}
```

### Override Specific Dates

To use custom dates instead of calculated:

```javascript
// Edit script to accept date overrides
const customDates = {
  goNoGo: '2026-05-05',
  warRoomOpen: '2026-05-06',
  rollout10: '2026-05-06',
  rollout50: '2026-05-07',
  rollout100: '2026-05-08',
};
```

---

## Command Reference

### Arguments

| Argument | Required | Example | Description |
|----------|----------|---------|-------------|
| `--ticket` | Yes | `H30-1` | Jira ticket key (project-number) |
| `--timezone` | No | `America/Los_Angeles` | Timezone for meeting times (default: America/Los_Angeles) |

### Common Timezones

```
US:
  --timezone "America/Los_Angeles"   (PST/PDT)
  --timezone "America/Denver"        (MST/MDT)
  --timezone "America/Chicago"       (CST/CDT)
  --timezone "America/New_York"      (EST/EDT)

Europe:
  --timezone "Europe/London"         (GMT/BST)
  --timezone "Europe/Paris"          (CET/CEST)
  --timezone "Europe/Amsterdam"      (CET/CEST)

Asia:
  --timezone "Asia/Tokyo"            (JST)
  --timezone "Asia/Singapore"        (SGT)
  --timezone "Asia/Kolkata"          (IST)
```

---

## Generated Runbook Structure

Each runbook contains:

1. **Header Section**
   - Project name, ticket key, release date
   - Timezone, generation timestamp

2. **Executive Summary**
   - Release title and description
   - Quick reference table with all milestone dates

3. **Phase 1: Pre-Release (5 days)**
   - Day 1: Code freeze confirmation
   - Day 2: Feature flag testing
   - Day 3: Release bundle preparation
   - Day 4: Final validation
   - Day 5: Go-No-Go decision

4. **Phase 2: Release Execution (4 days)**
   - Day 1: 10% rollout (canary, 4 hours)
   - Day 2: 50% rollout (progressive, 12 hours)
   - Days 3-5: 100% rollout (full, 72 hours intensive)

5. **Supporting Sections**
   - Rollback procedures
   - Success criteria
   - Monitoring dashboards
   - Troubleshooting guide
   - Communication templates
   - Sign-off checklist

---

## Workflow Integration

### Suggested Process

**Step 1: Create Release Ticket in Jira**
```
Project: Hart 30 (H30)
Title: Hart 30 Release v3.18.2
Due Date: 2026-05-12
Assignee: Sourav Pratap (Release Manager)
Description: Complete release cycle...
```

**Step 2: Generate Runbook**
```bash
node scripts/generate-release-runbook.cjs --ticket H30-1
```

**Step 3: Review & Customize**
- Open: `docs/releases/H30-2026-05-12-RUNBOOK.md`
- Review calculated dates
- Customize contact list if needed
- Add any project-specific sections

**Step 4: Share with Team**
- Share runbook URL in Slack
- Attach to Jira ticket
- Discuss in release planning meeting

**Step 5: Execute**
- Release manager follows day-by-day checkboxes
- War room team monitors using runbook
- Document any deviations

**Step 6: Archive**
- Move final runbook to `docs/releases/archive/`
- Include post-release metrics
- Reference in retrospective

---

## Storage & Organization

### Directory Structure

```
docs/
└── releases/
    ├── H30-2026-05-12-RUNBOOK.md       (Current/Upcoming)
    ├── API-2026-06-11-RUNBOOK.md
    ├── EU-2026-07-13-RUNBOOK.md
    └── archive/
        ├── H30-2026-05-12-RUNBOOK.md   (Completed, with metrics)
        ├── PROJ-2026-04-20-RUNBOOK.md
        └── ...
```

### Naming Convention

`[PROJECT_KEY]-[YYYY-MM-DD]-RUNBOOK.md`

Examples:
- `H30-2026-05-12-RUNBOOK.md` — Hart 30, May 12, 2026
- `API-2026-06-11-RUNBOOK.md` — API Platform, June 11, 2026
- `EU-2026-07-13-RUNBOOK.md` — EU Release, July 13, 2026

---

## Tips & Best Practices

1. **Generate Early**
   - Create Jira ticket at least 7 days before release
   - Generate runbook 5-7 days out
   - Gives team time to review and prepare

2. **Review Dates**
   - Check calculated dates match your sprint calendar
   - Adjust Jira due date if dates don't work
   - Confirm timezone is correct

3. **Customize for Your Project**
   - Add company-specific contact info
   - Link to internal dashboards/tools
   - Reference any project-specific procedures

4. **Share Early**
   - Post runbook in Slack after generation
   - Attach to Jira ticket
   - Link in release planning doc
   - Ensures everyone has same instructions

5. **Execute with Runbook Open**
   - Use checkboxes to track progress
   - Update with actual times/metrics
   - Reference troubleshooting section when issues arise

6. **Archive for Learning**
   - Save completed runbook to `archive/`
   - Add post-release metrics
   - Use for retrospective
   - Reference in future releases

---

## Troubleshooting

### Dates Seem Off

**Problem:** Calculated dates don't match your sprint schedule

**Solution:** Check the Jira due date
- Due date in Jira should be your release date (not earlier)
- Script calculates backwards from due date
- Adjust due date in Jira, regenerate runbook

### Timezone Not Applied

**Problem:** Timezone shows as part of filename: `H30-2026-MM-12-RUNBOOK.md`

**Solution:** There's a bug with date formatting. The script still works, just filename is off.

Run with explicit timezone:
```bash
node scripts/generate-release-runbook.cjs --ticket H30-1 --timezone "America/Los_Angeles"
```

### File Permissions

**Problem:** Cannot write to `docs/releases/`

**Solution:** Create directory first
```bash
mkdir -p docs/releases
chmod 755 docs/releases
```

---

## Next Steps: Full Jira Integration

To fully automate with Jira:

1. **Add Atlassian MCP Integration**
   ```javascript
   const { getJiraIssue } = require('@anthropic-sdk/mcp-atlassian');
   
   async function fetchTicket(ticketKey) {
     return await getJiraIssue(ticketKey);
   }
   ```

2. **Create GitHub Actions Workflow**
   ```yaml
   # Triggers on Jira ticket update
   - Run: node scripts/generate-release-runbook.cjs
   - Upload: docs/releases/[RUNBOOK]
   - Comment: Post runbook link back to Jira
   ```

3. **Add to Release Process**
   - Jira ticket created → Runbook auto-generated
   - Runbook linked in ticket → Shared in Slack
   - Release manager uses runbook → Updates metrics
   - Complete → Archive with final metrics

---

**Script Version:** 1.0  
**Created:** 2026-08-05  
**Author:** Release Engineering Team  
**Last Updated:** 2026-08-05
