# Developer Setup Guide for Keel

**Get started using Keel to build and test features.**

---

## Prerequisites

- Node.js 18+ (for Playwright + ESM)
- Claude Code plugin installed: `claude plugin install keel`
- Git
- Your project repository cloned

---

## Step 1: Install & Initialize Keel

### Installation

If you haven't installed the Keel plugin yet:

```bash
claude plugin install keel
```

Verify:
```bash
claude plugin list
# Should show: keel v3.18.0 [x]
```

### Initialize Your Project

```bash
/keel:init --mode=new --stack=cakephp
# or: --stack=nodejs, --stack=python, etc.
```

This creates:
```
.keel/
  ├── config/           (CJIS patterns, injection patterns)
  ├── economy.yml       (token budgets)
  ├── state/            (story state files)
  └── watch/            (coverage baselines)
```

---

## Step 2: Set Up Your Development Environment

### Node Dependencies

```bash
npm install
npm run build
```

### Environment Variables

Create `.env.local` (gitignored):

```bash
# App
KEEL_APP_URL=http://localhost:3000

# Testing
CI=false
KEEL_HEADLESS=0  # Use headed browser locally

# Optional: Visual regression tolerance
KEEL_VISUAL_MAXDIFF=0  # pixel-perfect (0 = strict)
```

### Start Your App

```bash
npm run dev
# or your app's equivalent start command
```

Verify it's running:
```bash
curl -s http://localhost:3000/health
# Should return 200 OK
```

---

## Step 3: Use Keel for Your First Feature

### Start Work on a Story

```bash
/keel:start-work FEAT-1
# Creates branch: feat/feat-1-your-summary
# Transitions Jira ticket to "In Progress"
```

### Run the Full 10-Phase Pipeline

```bash
/keel:implement-feature --story=FEAT-1
```

Keel automatically runs:
1. Product Owner (requirements)
2. Business Analyst (functional spec)
3. UI Designer (mockups + design tokens)
4. Solution Architect (architecture, DB schema)
5. **Software Engineer** (code + unit tests) — you implement here
6. QA Engineer (test validation)
7. E2E Engineer (Playwright browser tests)
8. Security Engineer (OWASP + SAST)
9. Technical Writer (docs + changelog)
10. Release Manager (go/no-go decision)

**Note:** Phases 1–4 and 9–10 are usually agent-only. You participate in phase 5 (implementation).

### Check Progress

```bash
/keel:health --story=FEAT-1
# Shows current phase, blockers, next steps
```

---

## Step 4: Review Generated Artifacts

After each phase, check:

```
.keel/state/FEAT-1/
├── 01-product-owner.json        (requirements approved)
├── 02-business-analyst.json     (functional spec)
├── 03-ui-designer.json          (mockups + design tokens)
├── 04-solution-architect.json   (architecture + schema)
├── 05-software-engineer.json    (implementation plan)
├── 06-qa-engineer.json          (test results)
├── 07-e2e-engineer.json         (E2E tests + screenshots)
├── 08-security-engineer.json    (security findings)
├── 09-technical-writer.json     (docs)
└── 10-release-manager.json      (go/no-go verdict)
```

Each phase output is committed to git — your audit trail.

---

## Step 5: Write Code (Phase 5)

When the orchestrator reaches phase 5, implement the feature:

```bash
# Branch is already created: feat/feat-1-your-summary
git checkout feat/feat-1-your-summary

# Make your changes
# Unit tests must reach >= 80% coverage on changed lines

# Commit changes
git add .
git commit -m "feat(your-feature): description

Refs FEAT-1"

# Push to origin
git push origin feat/feat-1-your-summary
```

The handshake gate will verify coverage before advancing to QA.

---

## Step 6: Write E2E Tests (Phase 7)

When phase 7 (E2E Engineer) runs, you can prepare Playwright tests:

### Setup Playwright

```bash
npm install --save-dev @playwright/test
```

### Copy Keel's E2E Fixtures

```bash
cp node_modules/@keel/framework/tests/e2e/fixtures.ts tests/e2e/
```

### Write Your Tests

```typescript
// tests/e2e/my-feature.spec.ts
import { test, expect } from './fixtures';
import { stabilize } from './fixtures';

test('user can create subscription', async ({ page }) => {
  await page.goto('/');
  await stabilize(page);
  
  // Your test here
  await expect(page).toHaveScreenshot('homepage.png');
});
```

### Generate Baselines

```bash
npx playwright test --update-snapshots
```

Commit to git:
```bash
git add tests/e2e/__screenshots__/
git commit -m "test(e2e): add visual regression baselines"
```

**Read:** [E2E Visual Regression Guide](E2E-VISUAL-REGRESSION.md)

---

## Step 7: Handle Findings & Rework

If a phase finds issues:

1. **Phase gate report** shows findings in `.keel/state/FEAT-1/NN-phase.json`
2. **Blockers** = must fix before advancing
3. **Non-blockers** = documented for future work

**Fix blockers:**

```bash
# Read the blocker
cat .keel/state/FEAT-1/06-qa-engineer.json | jq '.blockers'

# Fix the issue in your code/tests
git commit -m "fix: resolve QA blocker - test coverage"

# Push
git push origin feat/feat-1-your-summary

# Request phase retry
/keel:health --story=FEAT-1
# Follow instructions to re-run the phase
```

---

## Step 8: Merge & Release

Once all phases pass:

```bash
# Create release PR
/keel:finish-work --story=FEAT-1

# Opens a PR from your branch → main
# Release manager approves
# Merged automatically (GitHub branch protection enforces this)
```

**Staged rollout:**

```bash
/keel:release-check
# Deploys with feature flags: 10% → 50% → 100%
# Monitors for regressions
```

---

## Helpful Commands

| Command | Purpose |
|---------|---------|
| `/keel:health` | Check current phase, blockers, next steps |
| `/keel:implement-feature` | Run all phases automatically |
| `/keel:investigate-defect` | Run phases for bug fixes (express lane) |
| `/keel:review-code` | Human code review + merge |
| `/keel:release-check` | Pre-release validation + staged deployment |
| `keel dashboard` | Web UI of all stories (read-only) |

---

## Documentation Structure

Once you're familiar with the basics, check:

- **[docs/INDEX.md](../INDEX.md)** — All documentation organized by phase + topic
- **[E2E Visual Regression](E2E-VISUAL-REGRESSION.md)** — Playwright testing
- **[Workflow](../WORKFLOW.md)** — Git workflow, CI/CD, branch protection
- **[MCP Setup](../MCP-SETUP.md)** — Model Context Protocol (Jira integration)
- **[Technical Specifications](../../TECHNICAL-SPECIFICATIONS.md)** — System architecture

---

## Troubleshooting

### "Phase failed. What do I do?"

Check the phase output:
```bash
cat .keel/state/YOUR-STORY/NN-phase.json | jq '.blockers'
```

Fix the issue, commit, and request a retry.

### "E2E tests won't run"

Make sure your app is running:
```bash
curl -s $KEEL_APP_URL/health
# Should return 200 OK
```

Set the correct URL:
```bash
export KEEL_APP_URL="http://localhost:YOUR_PORT"
```

### "Coverage gate blocked me"

Unit test coverage on changed lines must be ≥ 80%. Check coverage:
```bash
npm run coverage
# or: npx jest --coverage
```

Add missing tests or adjust coverage threshold in `.keel/economy.yml`.

### "How do I check what Jira says?"

The orchestrator reads from Jira automatically. Check:
```bash
/keel:from-jira FEAT-1
# Shows what the ticket says
```

Or link manually:
```bash
/keel:start-work FEAT-1
```

---

## Next Steps

1. **Install Keel:** `claude plugin install keel`
2. **Initialize:** `/keel:init --stack=YOUR_STACK`
3. **Start a feature:** `/keel:start-work FEAT-1`
4. **Implement:** Phase 5 runs when you're ready
5. **Test:** Phase 7 (Playwright) ready for E2E tests
6. **Release:** Phase 10 handles go/no-go

---

## Support

- **Keel GitHub:** https://github.com/creativemyntra/keel
- **Full Documentation:** [docs/INDEX.md](../INDEX.md)
- **E2E Testing:** [E2E-VISUAL-REGRESSION.md](E2E-VISUAL-REGRESSION.md)
- **Workflow:** [WORKFLOW.md](../WORKFLOW.md)

---

**Last updated:** 2026-08-03  
**Keel version:** 3.18.0+
