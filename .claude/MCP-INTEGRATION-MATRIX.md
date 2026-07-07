# MCP Integration Matrix — Keel Framework

**Complete mapping of which MCPs are used by each agent and workflow**

---

## Agent × MCP Usage Matrix

| Phase | Agent | GitHub | Jira | Playwright | SonarQube | Slack | Confluence |
|-------|-------|--------|------|------------|-----------|-------|------------|
| **1** | init-agent | Setup repos | Register | Setup env | Setup | None | None |
| **1.5** | brainstorm-agent | Push docs | Create epic | None | None | Post ideas | Publish |
| **2** | req-agent | Push req docs | Link story | None | None | Notify | Publish req |
| **3** | design-agent | Push design | Update status | None | None | Post review | Publish design |
| **4a** | dev-agent | Create PR | Mark in-progress | None | Check coverage | PR notify | None |
| **4b** | test-agent | Comment results | Link tests | Run E2E tests | Get baseline | Post results | None |
| **4c** | sec-agent | Security review | Link findings | Run security tests | SAST scan | Alert issues | Publish report |
| **5** | deploy-agent | Create release | Close story | None | None | Rollout status | Create runbook |

---

## Phase-by-Phase Workflow with MCPs

### Phase 1: Init-Agent — Project Scaffolding

**Command:** `/keel init --mode=new --stack=cakephp`

| MCP | Action | Details |
|-----|--------|---------|
| **GitHub** | Create repository | Clone starter template, configure `.gitignore` |
| **Jira** | Register project | Create KEEL project, setup board, configure workflows |
| **Playwright** | Setup environment | Install browsers, configure base URL |
| **SonarQube** | Configure project | Create project key, set quality gate |
| **Slack** | *(optional)* | Create #keel-ci channel for notifications |

**Example Output:**
```
Initializing Keel AI-SDLC Framework
===================================

✅ GitHub: Repository created
   → https://github.com/yourorg/keel
   → Cloned starter template
   → .gitignore configured

✅ Jira: Project registered
   → Project key: KEEL
   → Board created (Scrum board)
   → Workflows: To Do → In Progress → Done

✅ Playwright: Environment ready
   → Chromium installed
   → Base URL: https://uat-app.example.com

✅ SonarQube: Project configured
   → Project key: com.example:keel
   → Quality gate: PASSED

✅ Slack: Channel created
   → #keel-ci → Notifications enabled

Framework initialized! 🚀
Next: /keel brainstorm --goal="Your feature"
```

---

### Phase 1.5: Brainstorm-Agent — Feature Ideation

**Command:** `/keel brainstorm --goal="Increase monetization" --mode=both`

| MCP | Action | Details |
|-----|--------|---------|
| **Jira** | Create epic | KEEL-E1: Monetization Phase 1 |
| **Slack** | Post ideas | "5 concepts generated, top 2 approved" |
| **Confluence** | Publish brainstorm | docs/brainstorms/monetization-strategy.md |

**Workflow:**
```
1. brainstorm-agent generates 5 concepts (divergence phase)
2. brainstorm-agent scores & converges on top 2 (convergence phase)
3. Jira epic created: KEEL-E1
   → Story KEEL-42: Subscription Tiers (8.7/10)
   → Story KEEL-50: Enterprise Licensing (7.3/10)
4. Slack notification:
   🧠 Brainstorm Complete: Monetization Strategy
   ✅ 5 concepts generated
   ✅ Top 2 approved (Subscription Tiers, Enterprise)
   📋 Details: [link to Confluence]
5. Confluence published:
   → KEEL space → /brainstorms/monetization-strategy.md
```

---

### Phase 2: Req-Agent — Requirements & BDD Acceptance Criteria

**Command:** `/keel req --story=KEEL-42 --feature="User subscription management" --mode=interactive`

| MCP | Action | Details |
|-----|--------|---------|
| **Jira** | Link requirement | Update KEEL-42 with links to req doc |
| **Slack** | Notify reviewers | "@team: Design review needed for KEEL-42" |
| **Confluence** | Publish requirements | docs/requirements/KEEL-42.md |

**Workflow:**
```
1. req-agent generates requirements document
   - 9+ functional requirements (MUST/SHOULD/COULD)
   - 5+ BDD acceptance criteria
   - Risk matrix, dependencies, metrics
2. Jira story updated:
   → KEEL-42 status: "In Design"
   → Link to: docs/requirements/KEEL-42.md
   → Links to epic: KEEL-E1
3. Slack notification:
   📝 Requirements Ready: KEEL-42
   ✅ 9 functional requirements
   ✅ 5 BDD acceptance criteria (Given/When/Then)
   👥 Reviewers needed: PO, Tech Lead
   📋 Details: [link to doc]
4. Confluence published:
   → KEEL space → /requirements/KEEL-42.md
   → Gherkin format: /requirements/KEEL-42.gherkin
```

---

### Phase 3: Design-Agent — Architecture Design

**Command:** `/keel design --story=KEEL-42 --focus=all`

| MCP | Action | Details |
|-----|--------|---------|
| **Jira** | Link design doc | Update KEEL-42 with design artifact |
| **Slack** | Post design review | "Design complete, technical review needed" |
| **Confluence** | Publish design | docs/design/KEEL-42-subscription.md + OpenAPI spec |

**Workflow:**
```
1. design-agent generates complete design
   - OpenAPI 3.0 specification
   - Database schema (ER diagram + DDL)
   - System architecture diagram
   - Integration points with Stripe, email service
   - Trade-off analysis & deployment strategy
2. Jira story updated:
   → KEEL-42 status: "In Design"
   → Attachment: design.openapi.yaml
   → Link: docs/design/KEEL-42-subscription.md
3. Slack notification:
   🏗️ Design Complete: KEEL-42
   ✅ OpenAPI specification (4 endpoints)
   ✅ Database schema (3 tables)
   ✅ Architecture diagram
   👥 Tech review needed: Engineering Lead
   📋 Details: [link to doc]
4. Confluence published:
   → KEEL space → /design/KEEL-42-subscription.md
   → OpenAPI YAML included
   → Architecture diagram embedded
```

---

### Phase 4a: Dev-Agent — Code Generation

**Command:** `/keel dev --story=KEEL-42 --scope=all`

| MCP | Action | Details |
|-----|--------|---------|
| **GitHub** | Push code → Create PR | Feature branch keel/dev/KEEL-42 |
| **Jira** | Update issue status | KEEL-42 → "In Progress" |
| **SonarQube** | *(via CI/CD pipeline)* | Check code quality, coverage |

**Workflow:**
```
1. dev-agent generates implementation code
   - src/Service/SubscriptionService.php
   - src/Controller/SubscriptionsController.php
   - src/Model/Entity/Subscription.php
   - db/migrations/20260715_000_create_subscription_tables.php
2. Code quality checks:
   - ✅ PSR-12 lint (PHPCBF)
   - ✅ PHPStan level 5 (strict types)
   - ✅ No secrets leaked
3. GitHub:
   → Push to branch: keel/dev/KEEL-42
   → Create PR → keel/dev/KEEL-42 → main
   → Set PR description with design doc link
   → Request code reviewers
4. Jira updated:
   → KEEL-42 status: "In Progress"
   → PR link in comments
5. SonarQube:
   → Triggered by CI/CD (GitHub Actions)
   → Scan code coverage (target: ≥80%)
   → Check for security issues
```

---

### Phase 4b: Test-Agent — Test Suite Generation

**Command:** `/keel test --story=KEEL-42 --scope=all`

| MCP | Action | Details |
|-----|--------|---------|
| **Playwright** | Run E2E tests | Browser automation tests for AC |
| **GitHub** | Comment on PR | Test results, coverage report |
| **Jira** | Link test results | KEEL-42 → Test execution report |
| **Slack** | Post summary | "✅ All tests passing (87% coverage)" |

**Workflow:**
```
1. test-agent generates test suite
   - Unit tests: Services, Models (9+ tests)
   - Integration tests: API endpoints (5+ tests)
   - E2E tests: User workflows (via Playwright)
   - Performance tests: Latency targets (<2s)
   - Security tests: Auth, CSRF, input validation
2. Test execution:
   ✅ Unit tests: 14/14 passing
   ✅ Integration tests: 7/7 passing
   ✅ E2E tests: 5/5 passing (Playwright)
   ✅ Coverage: 87% (target: ≥80%)
3. GitHub PR update:
   → Comment: "✅ Test Results"
   → Coverage: 87% (line coverage report)
   → Link to coverage report
4. Playwright E2E Test Example:
   Given user is logged in
   When user clicks "Subscribe" for monthly plan
   And user enters card 4242 4242 4242 4242
   And user clicks "Confirm & Subscribe"
   Then subscription is created
   And feature flag "premium_access" is set
   And confirmation email is sent
5. Slack notification:
   ✅ All Tests Passing: KEEL-42
   Unit: 14/14 ✅
   Integration: 7/7 ✅
   E2E: 5/5 ✅
   Coverage: 87% ✅
6. Jira:
   → Link test execution report
   → Add comment: "All tests passing, ready for security review"
```

---

### Phase 4c: Sec-Agent — Security Scanning

**Command:** `/keel sec --story=KEEL-42 --scope=all`

| MCP | Action | Details |
|-----|--------|---------|
| **SonarQube** | SAST scan | PHPStan L5 + Semgrep |
| **GitHub** | Comment security review | Findings on PR |
| **Slack** | Alert on HIGH/CRITICAL | ⚠️ Security issues found |
| **Jira** | Link security report | KEEL-42 → docs/security/... |
| **Confluence** | Publish report | Security scan detailed results |

**Workflow:**
```
1. sec-agent performs security scanning
   - SAST: PHPStan L5 + Semgrep patterns
   - Dependency audit: Composer audit (no vulns)
   - OWASP Top 10 assessment
   - PCI compliance baseline (Level 1)
2. Scan results:
   ✅ SAST: PASSED (0 HIGH/CRITICAL findings)
   ✅ Dependencies: PASSED (no vulnerabilities)
   ✅ OWASP: 8/10 threats mitigated
   ✅ PCI: Level 1 baseline MET (no card storage, Stripe tokenization)
3. GitHub PR update:
   → Comment: "✅ Security Review PASSED"
   → Detailed findings with line numbers
   → Remediation guidance
4. Slack alert (only if findings):
   🔒 Security Review: KEEL-42
   Status: ✅ PASSED
   
   Findings:
   0 CRITICAL
   0 HIGH
   2 MEDIUM (Missing input validation)
   5 LOW (Dead code)
   
   Action: None required, all MED/LOW findings documented
5. Jira updated:
   → KEEL-42 status: "Testing"
   → Link to: docs/security/KEEL-42-security-scan.md
6. Confluence published:
   → KEEL space → /security/KEEL-42-security-scan.md
   → Detailed findings + recommendations
```

---

### Phase 5: Deploy-Agent — Production Deployment

**Command:** `/keel deploy --story=KEEL-42 --mode=execute --rollout=canary`

| MCP | Action | Details |
|-----|--------|---------|
| **Jira** | Close story | KEEL-42 → "Done" |
| **GitHub** | Create release | Tag: v1.0.0-KEEL-42 |
| **Slack** | Post rollout updates | Canary 10% → 50% → 100% |
| **Confluence** | Publish runbook | Deployment procedures + troubleshooting |

**Workflow:**
```
1. Deploy-agent generates deployment plan
   - Stage 1: Database migration (off-hours, 2 AM)
   - Stage 2: Code deployment (4 AM)
   - Stage 3: Canary rollout (10% → 50% → 100%)
   - Monitoring & alerts
   - Rollback procedures
2. Deployment execution:

   **Day 1, 2:00 AM UTC**
   Database Migration:
   → Pre-deployment backup created (hart30-prod-pre-keel42-20260720)
   → Migration runs: 20260715_000_create_subscription_tables.php
   → Verification: ✅ All tables created, indexes added
   
   **Day 1, 4:00 AM UTC**
   Code Deployment:
   → API code deployed to production
   → Feature flag: subscription_enabled = false (disabled)
   → Health check: curl https://api.example.com/health → 200 OK

   **Day 1, 6:00 AM UTC**
   Canary 10% (5K users):
   → Feature flag enabled for 10%
   → Monitoring: Error rate 0.05%, Latency 95ms, Payment success 99.8%
   → ✅ STABLE → Proceed to 50%

   **Day 1, 10:00 AM UTC**
   Canary 50% (25K users):
   → Feature flag expanded to 50%
   → Monitoring: Error rate 0.04%, Latency 92ms, Payment success 99.9%
   → Support tickets: <5 (all resolved)
   → ✅ STABLE → Proceed to 100%

   **Day 2, 10:00 AM UTC**
   Full Rollout 100% (all users):
   → Feature flag enabled for all
   → Intensive monitoring: 72+ hours
   → Alert thresholds:
     - Error rate >1%
     - Latency >200ms
     - Payment success <99%
   → ✅ STABLE → Monitoring complete

3. Slack notifications:
   🚀 Deployment Started: KEEL-42
   Strategy: Canary (10% → 50% → 100%)
   Timeline: 72 hours
   ---
   
   ✅ Stage 1: Database Migration (2:00 AM)
   Tables created, migration verified
   
   ✅ Stage 2: Code Deployment (4:00 AM)
   API ready, health check passed
   
   🔄 Stage 3a: Canary 10% (6:00 AM)
   Users: 5K | Error: 0.05% | Latency: 95ms | Payments: 99.8%
   Status: ✅ STABLE
   
   🔄 Stage 3b: Canary 50% (10:00 AM)
   Users: 25K | Error: 0.04% | Latency: 92ms | Payments: 99.9%
   Status: ✅ STABLE → Expand to 100%
   
   🔄 Stage 3c: Full Rollout 100% (Day 2, 10:00 AM)
   Users: All | Monitoring: 72+ hours
   Status: ✅ STABLE
   
   ✅ Deployment Complete!
   🎉 KEEL-42 Subscription System Live

4. GitHub release:
   → Tag: v1.0.0-KEEL-42
   → Release notes:
     - 9 features implemented
     - 87% test coverage
     - 0 security findings
     - Stripe integration tested

5. Jira updated:
   → KEEL-42 status: "Done"
   → Resolution: "Fixed"
   → Comment: "Released to production 2026-07-21 with canary rollout"

6. Confluence published:
   → Runbook: /deployment/KEEL-42-runbook.md
   → Deployment plan: /deployment/KEEL-42-deployment-plan.md
   → Operational procedures & troubleshooting
```

---

## MCP Feature Summary

### GitHub
**Purpose:** Repository & code management  
**Used By:** All agents for code push, PR creation, release management  
**Key Features:**
- Create branches (keel/[phase]/[story-id])
- Push code commits
- Create pull requests with descriptions
- Comment on PRs (test results, security findings)
- Create releases & tags
- Trigger workflows (CI/CD)

**Example Output:**
```
✅ GitHub: Code push successful
   Branch: keel/dev/KEEL-42
   Commit: "feat: subscription system (KEEL-42)"
   PR: #123 → keel/dev/KEEL-42 → main
   Reviewers: 2 requested
   CI Status: Pending
```

---

### Jira
**Purpose:** Issue tracking & project management  
**Used By:** All agents for story status, linking artifacts, creating epics  
**Key Features:**
- Create stories, epics, sub-tasks
- Link documents & artifacts
- Update story status (To Do → In Progress → Testing → Done)
- Add comments & attachments
- Query sprints & projects
- Transition workflows

**Example Output:**
```
✅ Jira: Story updated
   Story: KEEL-42 (User Subscription Management)
   Status: In Progress → Testing
   Links: 
     - Design: docs/design/KEEL-42-subscription.md
     - Tests: docs/testing/KEEL-42-tests.md
   Comments: "All tests passing, 87% coverage"
```

---

### Playwright
**Purpose:** E2E testing & browser automation  
**Used By:** test-agent & sec-agent for E2E tests, visual regression, security testing  
**Key Features:**
- Navigate to URLs
- Fill forms, click buttons
- Run assertions
- Capture screenshots
- Record videos (on failure)
- Check console logs
- Simulate network conditions

**Example Test:**
```javascript
test('User subscribes to monthly premium', async ({ page }) => {
  await page.goto('/pricing');
  await page.click('[data-testid="subscribe-monthly"]');
  await page.fill('[data-testid="card-number"]', '4242424242424242');
  await page.click('[data-testid="submit"]');
  await expect(page).toContainText('Welcome to Premium!');
});
```

---

### SonarQube
**Purpose:** Code quality & security scanning  
**Used By:** dev-agent (coverage check), sec-agent (SAST scan)  
**Key Features:**
- SAST scanning (PHPStan L5 + Semgrep)
- Code coverage analysis (target: ≥80%)
- Duplication detection
- Maintainability rating
- Security hotspots
- Quality gate validation

**Example Output:**
```
✅ SonarQube: Quality gate PASSED
   Coverage: 87% (target: ≥80%) ✅
   Duplication: 2.3% (target: <5%) ✅
   Maintainability: A (target: A/B) ✅
   Security Hotspots: 0 ✅
   Issues: 0 HIGH/CRITICAL ✅
```

---

### Slack
**Purpose:** Team notifications & alerts  
**Used By:** All agents for real-time updates  
**Key Features:**
- Send messages to channels
- Post rich formatted blocks
- Send files & attachments
- React with emojis
- Thread replies
- Mention users/channels

**Example Notification:**
```
🚀 Deployment Started: KEEL-42

Phase: Canary Rollout (10% → 50% → 100%)
Timeline: 72 hours
Status: 🟢 Canary 10% STABLE (Error: 0.05%, Latency: 95ms)

Next: Expand to 50% in 4 hours
```

---

### Confluence
**Purpose:** Documentation & knowledge base  
**Used By:** brainstorm, req, design, sec, deploy agents for publishing docs  
**Key Features:**
- Create & update pages
- Embed content
- Add comments
- Search pages
- Link to Jira issues
- Version control

**Example Output:**
```
✅ Confluence: Design doc published
   Page: /KEEL/design/KEEL-42-subscription.md
   Space: KEEL
   Linked to Jira: KEEL-42
   Comments: 2 (reviewers feedback)
```

---

## Integration Best Practices

### 1. Token Security
```bash
# ✅ DO: Store in .env (git-ignored)
GITHUB_TOKEN=ghp_xxxxx

# ❌ DON'T: Hardcode in scripts
export GITHUB_TOKEN=ghp_xxxxx
```

### 2. Error Handling
```bash
# ✅ DO: Check MCP connection first
/keel test-mcp --all

# Then run pipeline
/keel init --mode=new --stack=cakephp
```

### 3. Monitoring
```bash
# ✅ DO: Monitor MCP latency
/keel test-mcp --all --benchmark

# Results show response times for each MCP
```

### 4. Logging
```bash
# ✅ DO: Enable audit logging (production)
# .claude/.mcp/config.yml:
logging:
  audit_trail: true
  log_file: logs/mcp-audit.log
```

---

## Troubleshooting by Phase

### Phase 1-2: GitHub/Jira Issues
```bash
# Test GitHub
/keel test-mcp --type=github --verbose

# Test Jira
/keel test-mcp --type=jira --verbose

# Check credentials
echo $GITHUB_TOKEN
echo $JIRA_API_TOKEN
```

### Phase 4: SonarQube/Playwright Issues
```bash
# Test SonarQube
/keel test-mcp --type=sonarqube --verbose

# Test Playwright
/keel test-mcp --type=playwright --verbose

# Check Playwright browsers installed
npm list -g @playwright
```

### Phase 5: Slack/Confluence Issues
```bash
# Test Slack
/keel test-mcp --type=slack --verbose

# Check bot token
echo $SLACK_BOT_TOKEN | cut -c1-20

# Test message send
/keel test-mcp --type=slack --test-send="#keel-ci"
```

---

**Next:** See [MCP-QUICK-START.md](MCP-QUICK-START.md) to get started! 🚀

