# MCP Setup Wizard for Keel AI-SDLC Framework

**Interactive guide to configure Model Context Protocol (MCP) integrations**

This wizard helps you connect Keel to external tools and services for enhanced AI-powered development workflow.

---

## Quick Start

```bash
/keel setup-mcp
# or
/keel init --with-mcp=interactive
```

---

## Supported Integrations

### Tier 1: Recommended (Out-of-Box)
- ✅ **GitHub** — Repository, PR, issue management
- ✅ **Jira** — Project tracking, issue management
- ✅ **Playwright** — Browser automation, E2E testing
- ✅ **SonarQube** — Code quality & security scanning

### Tier 2: Enhanced (Optional)
- ✅ **Slack** — Team notifications & alerts
- ✅ **Confluence** — Documentation & knowledge base
- ✅ **Linear** — Alternative issue tracking
- ✅ **Datadog** — Monitoring & observability
- ✅ **PagerDuty** — On-call & incident management

### Tier 3: Advanced (Domain-Specific)
- ✅ **Stripe** — Payment processing integration
- ✅ **AWS** — Cloud infrastructure (EC2, RDS, Lambda)
- ✅ **Notion** — Wiki & documentation
- ✅ **Asana** — Project management alternative
- ✅ **Analytics** — GA4, Mixpanel, Amplitude

---

## Setup Wizard: Interactive Mode

### Step 1: Select MCPs to Configure

```
Keel MCP Setup Wizard
=====================

Available integrations:

[ ] GitHub            (Repository & PR management)
[ ] Jira              (Project tracking & issues)
[ ] Playwright        (E2E testing & browser automation)
[ ] SonarQube         (Code quality scanning)
[ ] Slack             (Team notifications)
[ ] Confluence        (Documentation & knowledge base)
[ ] Linear            (Issue tracking)
[ ] Datadog           (Monitoring & observability)
[ ] PagerDuty         (On-call & incidents)
[ ] Stripe            (Payment processing)
[ ] AWS               (Cloud infrastructure)
[ ] Notion            (Wiki & documentation)
[ ] Asana             (Project management)

Which MCPs would you like to configure? (space-separated numbers or names)
> 
```

### Step 2: Configure Each MCP

For each selected MCP, you'll be prompted for:
1. **API Key/Token** (if required)
2. **Base URL** (if applicable)
3. **Workspace/Organization ID**
4. **Project/Board ID** (if applicable)
5. **Permissions & Scopes**

---

## Individual MCP Setup Guides

### 1. GitHub Integration

**Recommended for:** Repository management, PR automation, issue linking

**Setup:**

```yaml
# .claude/.mcp/github.yml
---
name: github
type: oauth
auth_method: personal-access-token
config:
  token: ${GITHUB_TOKEN}  # Create at github.com/settings/tokens
  scopes:
    - repo              # Full repo access
    - workflow          # GitHub Actions
    - read:org          # Organization access
  repositories:
    - creativemyntra/keel
    - creativemyntra/[your-project]
  
availability: "production"
features:
  - read_repositories
  - create_pr
  - comment_issues
  - list_workflows
  - trigger_actions
```

**Setup Steps:**

1. **Generate Personal Access Token (PAT):**
   ```bash
   # github.com → Settings → Developer settings → Personal access tokens
   # Scopes: repo, workflow, read:org
   # Copy token to .env: GITHUB_TOKEN=ghp_xxxxx
   ```

2. **Add to `.claude/.mcp/github.yml`:**
   ```bash
   echo "GITHUB_TOKEN=ghp_xxxxx" >> .env
   cp .claude/mcp-templates/github.yml .claude/.mcp/github.yml
   ```

3. **Test Connection:**
   ```bash
   /keel test-mcp --type=github
   # Expected: ✓ Authenticated as [username]
   ```

**Keel Integration Points:**
- `dev-agent`: Create feature branches, push code, open PRs
- `test-agent`: Comment test results on PRs
- `sec-agent`: Add security findings as PR comments
- `deploy-agent`: Create deployment tags, manage releases

---

### 2. Jira Integration

**Recommended for:** Issue tracking, sprint planning, acceptance criteria linking

**Setup:**

```yaml
# .claude/.mcp/jira.yml
---
name: jira
type: oauth
auth_method: api-token
config:
  instance: "https://vidocqstudios.atlassian.net"  # Your Jira instance
  email: "your-email@company.com"
  api_token: ${JIRA_API_TOKEN}  # Create at id.atlassian.com/manage-profile/security/api-tokens
  project_key: "H30"              # Or your project key
  
availability: "production"
features:
  - read_issues
  - update_issues
  - create_issues
  - add_comments
  - transition_status
  - link_issues
```

**Setup Steps:**

1. **Generate Jira API Token:**
   ```bash
   # https://id.atlassian.com/manage-profile/security/api-tokens → Create API token
   # Copy to .env: JIRA_API_TOKEN=xxxxxx
   ```

2. **Configure `.claude/.mcp/jira.yml`:**
   ```yaml
   instance: "https://[your-domain].atlassian.net"
   email: "your-email@company.com"
   api_token: ${JIRA_API_TOKEN}
   project_key: "KEEL"  # Your project key
   ```

3. **Test Connection:**
   ```bash
   /keel test-mcp --type=jira
   # Expected: ✓ Connected to KEEL project (20 issues)
   ```

**Keel Integration Points:**
- `req-agent`: Read requirement stories, update issue status
- `design-agent`: Link design docs to Jira tickets
- `dev-agent`: Auto-update story status to "In Progress"
- `test-agent`: Add test results as issue comments
- `deploy-agent`: Transition issue to "Done" post-release

**Example: Auto-Linking Story to Design Doc:**
```yaml
# req-agent output automatically includes:
story_id: "KEEL-42"
jira_link: "https://vidocqstudios.atlassian.net/browse/KEEL-42"
status_update: "In Design"
```

---

### 3. Playwright Integration

**Recommended for:** E2E testing, browser automation, visual regression testing

**Setup:**

```yaml
# .claude/.mcp/playwright.yml
---
name: playwright
type: direct
auth_method: none
config:
  browsers:
    - chromium   # Default
    - firefox    # Optional
    - webkit     # Optional
  headless: true
  timeout: 30000  # 30 seconds
  base_url: "https://uat-example.com"  # Your UAT environment
  
availability: "testing"
features:
  - browser_navigate
  - browser_click
  - browser_type
  - browser_screenshot
  - browser_snapshot
  - read_console_logs
  - read_network_requests
```

**Setup Steps:**

1. **Install Playwright (in test environment):**
   ```bash
   npm install -D playwright
   # or
   pip install playwright
   ```

2. **Configure `.claude/.mcp/playwright.yml`:**
   ```yaml
   base_url: "https://uat-app.example.com"
   browsers:
     - chromium
   headless: true
   timeout: 30000
   ```

3. **Test Connection:**
   ```bash
   /keel test-mcp --type=playwright
   # Expected: ✓ Playwright ready (chromium installed)
   ```

**Keel Integration Points:**
- `test-agent`: Run E2E tests, capture screenshots, validate UI
- `sec-agent`: Automated security testing (form injection, CSRF)
- `qa-agent`: Visual regression, accessibility scanning

**Example: Automated E2E Test from AC:**
```gherkin
Scenario: User subscribes to monthly premium plan
  Given user is logged in and on the pricing page
  When user clicks "Subscribe" for "Monthly Premium"
  And user enters valid Visa card (4242 4242 4242 4242)
  And user reviews subscription summary
  And user clicks "Confirm & Subscribe"
  Then Stripe payment succeeds
  And subscription record created in database
  And "premium" feature flag set for user
  And user redirected to subscription confirmation page
  And user sees "Welcome to Premium! Your subscription is active."
```

↓ Playwright auto-generates:
```javascript
// tests/e2e/subscription.spec.ts
test('User subscribes to monthly premium plan', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'user@example.com');
  await page.click('[data-testid="subscribe-monthly"]');
  // ... full test implementation
  await expect(page).toContainText('Welcome to Premium!');
});
```

---

### 4. SonarQube Integration

**Recommended for:** Code quality, security scanning, technical debt tracking

**Setup:**

```yaml
# .claude/.mcp/sonarqube.yml
---
name: sonarqube
type: direct
auth_method: token
config:
  instance: "https://sonarqube.example.com"  # Your SonarQube instance
  token: ${SONARQUBE_TOKEN}
  project_key: "com.example:keel"
  
availability: "production"
features:
  - analyze_project
  - get_metrics
  - list_issues
  - get_quality_gate_status
  - get_code_coverage
```

**Setup Steps:**

1. **Generate SonarQube Token:**
   ```bash
   # SonarQube Dashboard → User profile → Security → Generate token
   # Copy to .env: SONARQUBE_TOKEN=squ_xxxxx
   ```

2. **Configure `.claude/.mcp/sonarqube.yml`:**
   ```yaml
   instance: "https://sonarqube.example.com"
   token: ${SONARQUBE_TOKEN}
   project_key: "com.example:keel"
   ```

3. **Test Connection:**
   ```bash
   /keel test-mcp --type=sonarqube
   # Expected: ✓ Connected to project com.example:keel
   # Lines of Code: 15,234
   # Quality Gate: PASSED
   ```

**Keel Integration Points:**
- `sec-agent`: Get SAST scan results, quality metrics
- `dev-agent`: Check code coverage before merge
- `qa-agent`: Validate quality gate before release

**Example: SEC-Agent Report with SonarQube:**
```markdown
## Security Scan Results (SonarQube)

| Finding | Severity | Count |
|---------|----------|-------|
| SQL Injection (CWE-89) | CRITICAL | 0 |
| Cross-Site Scripting (CWE-79) | HIGH | 0 |
| Insecure Cryptography | HIGH | 0 |
| Missing Input Validation | MEDIUM | 2 |
| Dead Code | LOW | 5 |

**Quality Gate:** ✅ PASSED
- Coverage: 87% (target: ≥80%)
- Duplication: 2.3% (target: <5%)
- Maintainability: A (target: A/B)
```

---

### 5. Slack Integration

**Recommended for:** Team notifications, alerts, approvals

**Setup:**

```yaml
# .claude/.mcp/slack.yml
---
name: slack
type: oauth
auth_method: bot-token
config:
  workspace_id: "T0G9QKQ16"  # Your workspace ID
  bot_token: ${SLACK_BOT_TOKEN}  # xoxb-xxxxx
  channels:
    - "#keel-ci"          # Pipeline notifications
    - "#keel-releases"    # Release updates
    - "#security-alerts"  # Security findings
  
availability: "production"
features:
  - send_message
  - send_file
  - react_message
  - list_channels
  - get_channel_info
```

**Setup Steps:**

1. **Create Slack App:**
   ```bash
   # https://api.slack.com/apps → Create New App
   # Name: "Keel AI-SDLC"
   # Workspace: [Your workspace]
   ```

2. **Configure Permissions:**
   ```
   OAuth & Permissions → Scopes (Bot Token Scopes):
   - chat:write
   - files:write
   - reactions:write
   - channels:read
   - users:read
   ```

3. **Get Bot Token:**
   ```bash
   # Copy from https://api.slack.com/apps/[APP_ID]/general
   # Add to .env: SLACK_BOT_TOKEN=xoxb_xxxxx
   ```

4. **Install to Workspace:**
   ```bash
   # OAuth & Permissions → Install App to Workspace
   ```

**Keel Integration Points:**
- `dev-agent`: Notify on PR creation
- `test-agent`: Post test results summary
- `sec-agent`: Alert on security findings (HIGH/CRITICAL)
- `deploy-agent`: Notify on canary rollout progress

**Example: Deployment Notification:**
```
🚀 Deployment Started: KEEL-42 (Subscription System)

Rollout Strategy: Canary (10% → 50% → 100%)
Timeline: 72 hours
Stage 1: Database Migration ✅ Complete (2026-07-20 2:00 AM UTC)
Stage 2: Code Deployment ✅ Complete (4:00 AM UTC)
Stage 3: Canary 10% ⏳ In Progress (6:00 AM UTC)
  Error Rate: 0.05% (target: <0.1%) ✅
  API Latency p95: 95ms (target: <200ms) ✅
  Payment Success: 99.8% (target: >99%) ✅

Next: Expand to 50% in 2 hours (if stable)
```

---

### 6. Confluence Integration

**Recommended for:** Documentation, knowledge base, runbooks

**Setup:**

```yaml
# .claude/.mcp/confluence.yml
---
name: confluence
type: oauth
auth_method: api-token
config:
  instance: "https://company.atlassian.net/wiki"
  space_key: "KEEL"  # Documentation space
  email: "your-email@company.com"
  api_token: ${CONFLUENCE_API_TOKEN}
  
availability: "production"
features:
  - create_page
  - update_page
  - get_page
  - add_comment
  - search_content
```

**Setup Steps:**

1. **Use Same Jira Token:**
   ```bash
   # Confluence uses same API token as Jira
   # CONFLUENCE_API_TOKEN = JIRA_API_TOKEN
   ```

2. **Configure `.claude/.mcp/confluence.yml`:**
   ```yaml
   instance: "https://company.atlassian.net/wiki"
   space_key: "KEEL"  # Your documentation space
   email: "your-email@company.com"
   api_token: ${CONFLUENCE_API_TOKEN}
   ```

3. **Test Connection:**
   ```bash
   /keel test-mcp --type=confluence
   # Expected: ✓ Connected to KEEL space (45 pages)
   ```

**Keel Integration Points:**
- `design-agent`: Publish design docs to Confluence
- `deploy-agent`: Create runbooks in Confluence
- `sec-agent`: Publish security reports

---

### 7. Linear Integration

**Recommended for:** Alternative issue tracking (Notion-like UI)

**Setup:**

```yaml
# .claude/.mcp/linear.yml
---
name: linear
type: direct
auth_method: api-token
config:
  api_key: ${LINEAR_API_KEY}
  team_id: "KE"  # Your team ID
  
availability: "production"
features:
  - create_issue
  - update_issue
  - list_issues
  - add_comment
  - link_issues
```

**Setup Steps:**

1. **Generate Linear API Key:**
   ```bash
   # https://linear.app/settings/account/api → Create API key
   # Copy to .env: LINEAR_API_KEY=lin_xxxxx
   ```

2. **Configure `.claude/.mcp/linear.yml`:**
   ```yaml
   api_key: ${LINEAR_API_KEY}
   team_id: "KE"  # Your team ID
   ```

---

### 8. Datadog Integration

**Recommended for:** Monitoring, metrics, observability

**Setup:**

```yaml
# .claude/.mcp/datadog.yml
---
name: datadog
type: direct
auth_method: api-keys
config:
  api_key: ${DATADOG_API_KEY}
  app_key: ${DATADOG_APP_KEY}
  site: "datadoghq.com"  # or datadoghq.eu
  
availability: "production"
features:
  - query_metrics
  - get_monitors
  - get_dashboards
  - search_logs
  - create_event
```

**Setup Steps:**

1. **Generate Datadog API Keys:**
   ```bash
   # https://app.datadoghq.com/account/settings/agent/advanced
   # API Key: Copy to DATADOG_API_KEY
   # App Key: Copy to DATADOG_APP_KEY
   ```

2. **Configure `.claude/.mcp/datadog.yml`:**
   ```yaml
   api_key: ${DATADOG_API_KEY}
   app_key: ${DATADOG_APP_KEY}
   site: "datadoghq.com"
   ```

**Keel Integration Points:**
- `deploy-agent`: Query metrics during canary rollout
- Monitor payment success rate, API latency, error rate

---

### 9. PagerDuty Integration

**Recommended for:** On-call management, incident routing

**Setup:**

```yaml
# .claude/.mcp/pagerduty.yml
---
name: pagerduty
type: direct
auth_method: api-token
config:
  api_token: ${PAGERDUTY_API_TOKEN}
  escalation_policy_id: "P8XXXXX"
  
availability: "production"
features:
  - trigger_incident
  - get_incidents
  - list_escalation_policies
  - acknowledge_incident
```

---

## Complete Setup Configuration

### `.claude/.mcp/config.yml`

```yaml
---
# MCP Configuration Registry
# Auto-loaded by /keel commands

mcps:
  # Tier 1: Recommended
  github:
    enabled: true
    priority: 1
    config_file: .mcp/github.yml
    
  jira:
    enabled: true
    priority: 1
    config_file: .mcp/jira.yml
    
  playwright:
    enabled: true
    priority: 1
    config_file: .mcp/playwright.yml
    
  sonarqube:
    enabled: true
    priority: 1
    config_file: .mcp/sonarqube.yml
  
  # Tier 2: Enhanced
  slack:
    enabled: true
    priority: 2
    config_file: .mcp/slack.yml
    
  confluence:
    enabled: true
    priority: 2
    config_file: .mcp/confluence.yml
    
  # Tier 3: Advanced
  stripe:
    enabled: false
    priority: 3
    config_file: .mcp/stripe.yml

# Default behavior
defaults:
  timeout: 30000        # 30 seconds
  retry_attempts: 3
  retry_backoff: 2      # Exponential backoff
  cache_ttl: 300        # 5 minutes

# Notification channels
notifications:
  slack: true
  email: false
  pagerduty: false

# Monitoring & observability
monitoring:
  track_mcp_latency: true
  alert_on_failure: true
  log_all_requests: true  # GDPR: handle PII
```

### `.env` Template

```bash
# GitHub
GITHUB_TOKEN=ghp_xxxxx

# Jira & Confluence
JIRA_API_TOKEN=xxxxx
JIRA_INSTANCE=https://company.atlassian.net

# SonarQube
SONARQUBE_TOKEN=squ_xxxxx
SONARQUBE_INSTANCE=https://sonarqube.example.com

# Slack
SLACK_BOT_TOKEN=xoxb_xxxxx
SLACK_WORKSPACE_ID=T0G9QKQ16

# Datadog
DATADOG_API_KEY=xxxxx
DATADOG_APP_KEY=xxxxx

# PagerDuty
PAGERDUTY_API_TOKEN=xxxxx

# Linear
LINEAR_API_KEY=lin_xxxxx

# Playwright
PLAYWRIGHT_BASE_URL=https://uat-app.example.com
PLAYWRIGHT_HEADLESS=true

# Stripe (if used)
STRIPE_API_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

---

## Validation & Testing

### Test All MCPs

```bash
/keel test-mcp --all
```

**Output:**
```
Testing MCP Connections
========================

✅ GitHub              (Authenticated as @user)
✅ Jira                (Connected to KEEL project, 42 issues)
✅ Playwright          (Chromium ready, headless mode)
✅ SonarQube           (Quality gate: PASSED)
✅ Slack               (Connected to #keel-ci)
✅ Confluence          (KEEL space: 25 pages)
⚠️ Linear              (Not configured)
⚠️ Stripe              (Not configured)

Tier 1 (Recommended): 4/4 ✅
Tier 2 (Enhanced):    2/3 ⚠️
Tier 3 (Advanced):    0/3 ⚠️

Summary: Ready for Phase 1-5 execution
```

### Test Specific MCP

```bash
/keel test-mcp --type=github --verbose
# Output:
# ✅ Token valid
# ✅ Scopes: repo, workflow, read:org
# ✅ Repositories accessible: 2
#   - creativemyntra/keel
#   - creativemyntra/example-app
# ✅ API rate limit: 4,998/5,000 remaining
```

---

## Agent Integration Matrix

| Agent | GitHub | Jira | Playwright | SonarQube | Slack | Confluence |
|-------|--------|------|------------|-----------|-------|------------|
| **init-agent** | Configure | Register | Setup env | Setup | None | None |
| **brainstorm-agent** | None | Create epic | None | None | Post ideas | Publish |
| **req-agent** | None | Link story | None | None | Request approval | Document |
| **design-agent** | None | Update status | None | None | Post design | Publish design |
| **dev-agent** | Create PR | Update story | None | Check coverage | Notify | None |
| **test-agent** | Comment results | Link tests | Run E2E | Check quality | Post results | None |
| **sec-agent** | Security review | Link findings | Run tests | Get scan | Alert issues | Publish report |
| **deploy-agent** | Create release | Close story | None | None | Notify rollout | Create runbook |

---

## Troubleshooting

### "MCP Connection Failed"

```bash
# Check credentials
/keel test-mcp --type=github --debug

# Verify token format
echo $GITHUB_TOKEN

# Check network connectivity
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

### "Rate Limit Exceeded"

**GitHub:**
- Increase cache TTL in config.yml
- Request higher rate limits (github.com/settings/applications)

**Jira:**
- Use API tokens instead of passwords
- Implement exponential backoff in config

### "Invalid Credentials"

```bash
# Regenerate token
# GitHub: github.com/settings/tokens
# Jira: id.atlassian.com/manage-profile/security/api-tokens
# SonarQube: [instance]/user/security/tokens

# Update .env
export GITHUB_TOKEN=ghp_xxxxx
/keel test-mcp --type=github
```

---

## Security Best Practices

### 1. Token Management

✅ **DO:**
- Store tokens in `.env` (git-ignored)
- Rotate tokens every 90 days
- Use minimal scopes
- Use separate tokens for CI/CD

❌ **DON'T:**
- Commit tokens to git
- Use the same token across environments
- Log tokens in debug output
- Share tokens in chat/email

### 2. Environment-Specific Credentials

```bash
# .env.local (never commit)
GITHUB_TOKEN=ghp_dev_xxxxx      # Dev token

# CI/CD secrets (e.g., GitHub Actions)
secrets.GITHUB_TOKEN = ghp_prod_xxxxx  # Production token
```

### 3. Audit Logging

```yaml
# .claude/.mcp/audit-log.yml
---
audit:
  log_all_mcp_calls: true
  log_file: logs/mcp-audit.log
  retention_days: 90
  
  redact:
    - tokens
    - api_keys
    - passwords
    - credit_card_numbers
```

### 4. Scope Minimization

**GitHub (Recommended):**
```
- repo (full access)
- workflow (Actions)
- read:org (public org info only)
```

**Jira (Recommended):**
```
- read:jira-work
- write:jira-work
- read:jira-user
```

---

## Next Steps

1. **Run Setup Wizard:**
   ```bash
   /keel setup-mcp
   ```

2. **Test Connections:**
   ```bash
   /keel test-mcp --all
   ```

3. **Start First Phase:**
   ```bash
   /keel init --mode=new --stack=cakephp
   ```

4. **Begin Workflow:**
   ```bash
   /keel brainstorm --goal="Your feature idea"
   ```

---

**Setup Status:** Ready to begin Keel AI-SDLC with full MCP integrations! 🚀

