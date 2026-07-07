# MCP Documentation Index

**Complete guide to Keel's Model Context Protocol (MCP) integrations**

---

## Quick Navigation

| Document | Purpose | Time | Audience |
|----------|---------|------|----------|
| **[MCP-QUICK-START.md](MCP-QUICK-START.md)** | Setup in 5 minutes | 5 min | Everyone (start here!) |
| **[MCP-SETUP-WIZARD.md](MCP-SETUP-WIZARD.md)** | Detailed integration guide | 30 min | Deep dive users |
| **[MCP-INTEGRATION-MATRIX.md](MCP-INTEGRATION-MATRIX.md)** | Phase-by-phase workflow | 15 min | Understanding integrations |
| **[mcp-templates/](mcp-templates/)** | Configuration templates | Ref | Configuration |

---

## Start Here (Choose Your Path)

### Path A: "Just Get Me Running" (5 minutes)
1. Read: [MCP-QUICK-START.md](MCP-QUICK-START.md) — first 3 sections
2. Run: `/keel setup-mcp --mode=quick`
3. Copy: `cp .env.example .env` + fill in tokens
4. Test: `/keel test-mcp --all`
5. Go: `/keel init --mode=new --stack=cakephp`

**Result:** ✅ Ready for Phase 1-5 with Keel

---

### Path B: "I Need to Understand Everything" (30 minutes)
1. Read: [MCP-QUICK-START.md](MCP-QUICK-START.md) — full guide
2. Read: [MCP-SETUP-WIZARD.md](MCP-SETUP-WIZARD.md) — all sections
3. Read: [MCP-INTEGRATION-MATRIX.md](MCP-INTEGRATION-MATRIX.md) — workflow details
4. Review: `.claude/mcp-templates/*.yml` — configuration options
5. Run: `/keel setup-mcp --mode=interactive`

**Result:** ✅ Complete understanding of all MCPs and configurations

---

### Path C: "Help! Something is Broken" (Troubleshooting)
1. Run: `/keel test-mcp --all --verbose`
2. Check: [MCP-QUICK-START.md](MCP-QUICK-START.md) — "Common Setup Issues"
3. Read: [MCP-SETUP-WIZARD.md](MCP-SETUP-WIZARD.md) — "Troubleshooting Guide"
4. Verify: Token format in `.env`
5. Regenerate: Token at provider (if expired)

**Result:** ✅ Issue resolved

---

## MCP Overview

### What is MCP?
Model Context Protocol (MCP) allows Keel to integrate with external tools and services:
- **Jira** for issue tracking
- **GitHub** for code management
- **Playwright** for E2E testing
- **SonarQube** for code quality
- **Slack** for notifications
- **Confluence** for documentation
- ...and 10+ more tools

### Why Use MCPs in Keel?
✅ Automates artifact creation (docs, PRs, issues)  
✅ Syncs status across all tools  
✅ Provides real-time team notifications  
✅ Enables end-to-end workflow automation  
✅ Tracks progress through all 5 phases  

### How Keel Uses MCPs

**Example: Feature Development with KEEL-42**

```
Phase 1.5: Brainstorm
  ↓
  Jira: Create epic KEEL-E1
  Slack: "Monetization brainstorm started (5 concepts)"
  Confluence: Publish brainstorm doc

Phase 2: Requirements
  ↓
  Jira: Link req doc to KEEL-42
  Slack: "Requirements ready, needs PO review"
  Confluence: Publish requirement doc

Phase 3: Design
  ↓
  Jira: Update status to "In Design"
  Slack: "Design complete, tech review needed"
  Confluence: Publish design + OpenAPI spec

Phase 4: Development (Parallel)
  ↓
  GitHub: Create PR keel/dev/KEEL-42
  Jira: Status → "In Progress"
  SonarQube: Check coverage (87% ✅)
  
  Playwright: Run E2E tests (5/5 ✅)
  GitHub: Comment test results on PR
  
  SonarQube: SAST scan (0 critical findings ✅)
  Slack: "All tests passing, ready for merge"

Phase 5: Deployment
  ↓
  GitHub: Create release v1.0.0-KEEL-42
  Jira: Status → "Done"
  Slack: "Canary 10% stable (0.05% error rate) → Expanding to 50%"
  Confluence: Publish deployment runbook
```

---

## Supported MCPs

### Tier 1: Recommended (Required)
| MCP | Purpose | Setup Time | Used By |
|-----|---------|-----------|---------|
| **GitHub** | Code repository & PRs | 2 min | All agents |
| **Jira** | Issue tracking | 3 min | All agents |
| **Playwright** | E2E testing & browser automation | 5 min | test-agent, sec-agent |
| **SonarQube** | Code quality & SAST scanning | 3 min | dev-agent, sec-agent |

**Setup:** All 4 required for Phases 1-5

---

### Tier 2: Enhanced (Recommended)
| MCP | Purpose | Setup Time | Used By |
|-----|---------|-----------|---------|
| **Slack** | Team notifications & alerts | 3 min | All agents |
| **Confluence** | Documentation & runbooks | 0 min (uses Jira token) | brainstorm, req, design, sec, deploy |
| **Linear** | Alternative issue tracking | 2 min | Alternative to Jira |
| **Datadog** | Monitoring & observability | 3 min | deploy-agent |

**Setup:** Optional (Slack + Confluence highly recommended)

---

### Tier 3: Advanced (Domain-Specific)
| MCP | Purpose | Setup Time | Used By |
|-----|---------|-----------|---------|
| **PagerDuty** | On-call & incident management | 3 min | deploy-agent |
| **Stripe** | Payment processing | 5 min | Payment features |
| **AWS** | Cloud infrastructure | 5 min | Deployment |
| **Notion** | Wiki & documentation | 3 min | Alternative to Confluence |
| **Asana** | Project management | 3 min | Alternative to Jira |

**Setup:** Optional (only if using these services)

---

## Configuration Files

### Location: `.claude/mcp-templates/`

Each MCP has a template configuration file:

```
.claude/mcp-templates/
├── github.yml           # GitHub OAuth + scopes
├── jira.yml             # Jira API token + project setup
├── playwright.yml       # Playwright browsers + timeouts
├── sonarqube.yml        # SonarQube instance + quality gates
├── slack.yml            # Slack bot token + channels
├── config.yml           # Global MCP registry & defaults
└── (confluence, linear, datadog, pagerduty, aws, stripe, notion, asana)
```

### How to Use Templates

```bash
# Copy template to actual config
cp .claude/mcp-templates/github.yml .claude/.mcp/github.yml

# Edit with your values
nano .claude/.mcp/github.yml

# Or set via environment variables (.env)
export GITHUB_TOKEN=ghp_xxxxx
```

---

## Environment Variables (.env)

### Template: `.env.example`

```bash
# Copy template
cp .env.example .env

# Fill in required values
nano .env

# Add to .gitignore (already done)
cat .gitignore | grep .env
```

### Required Variables (Tier 1)
```bash
GITHUB_TOKEN=ghp_xxxxx
JIRA_API_TOKEN=xxxxx
JIRA_INSTANCE=https://company.atlassian.net
SONARQUBE_TOKEN=squ_xxxxx
SONARQUBE_INSTANCE=https://sonarqube.example.com
PLAYWRIGHT_BASE_URL=https://uat-app.example.com
```

### Optional Variables (Tier 2)
```bash
SLACK_BOT_TOKEN=xoxb_xxxxx
CONFLUENCE_API_TOKEN=${JIRA_API_TOKEN}
LINEAR_API_KEY=lin_xxxxx
DATADOG_API_KEY=xxxxx
DATADOG_APP_KEY=xxxxx
```

---

## Command Reference

### Setup Commands

```bash
# Interactive setup wizard
/keel setup-mcp

# Quick setup (5 minutes)
/keel setup-mcp --mode=quick

# Interactive with detailed options
/keel setup-mcp --mode=interactive

# Add more MCPs later
/keel setup-mcp --add=slack,confluence
```

### Testing Commands

```bash
# Test all MCPs
/keel test-mcp --all

# Test specific MCP
/keel test-mcp --type=github
/keel test-mcp --type=jira

# Verbose output (debug)
/keel test-mcp --all --verbose

# Benchmark latency
/keel test-mcp --all --benchmark
```

### Troubleshooting Commands

```bash
# Check token format
echo $GITHUB_TOKEN

# View current config
cat .claude/.mcp/github.yml

# Test specific connection
/keel test-mcp --type=github --test-connection

# Get debug info
/keel test-mcp --type=github --debug
```

---

## Security Best Practices

### Do's ✅
```bash
# Store tokens in .env (git-ignored)
GITHUB_TOKEN=ghp_xxxxx

# Rotate tokens every 90 days
# github.com/settings/tokens → Regenerate

# Use minimal scopes
# Scopes: repo, workflow (not admin, delete_repo)

# Separate tokens per environment
GITHUB_TOKEN_DEV=ghp_dev_xxxxx
GITHUB_TOKEN_PROD=ghp_prod_xxxxx
```

### Don'ts ❌
```bash
# DON'T: Commit tokens to git
git add .env  # ❌ .env is in .gitignore

# DON'T: Log tokens
console.log($GITHUB_TOKEN)  # ❌

# DON'T: Share tokens in chat/email
# Use git secret management instead

# DON'T: Use same token across environments
# Create separate tokens for dev/staging/prod
```

### Token Rotation

```bash
# Every 90 days:

# 1. Generate new token at provider
#    github.com/settings/tokens

# 2. Update .env
GITHUB_TOKEN=ghp_new_xxxxx

# 3. Test connection
/keel test-mcp --type=github

# 4. Revoke old token
#    github.com/settings/tokens → Delete

# 5. Done!
```

---

## Troubleshooting Checklist

### Before Running `/keel setup-mcp`:

- [ ] Create GitHub token (github.com/settings/tokens)
- [ ] Create Jira API token (id.atlassian.com/manage-profile/security/api-tokens)
- [ ] Create SonarQube token (your-instance/account/security/generate-tokens)
- [ ] Internet connection working
- [ ] All tokens copied completely (no extra spaces)

### If Setup Fails:

- [ ] Run: `/keel test-mcp --all --verbose`
- [ ] Check: Token format in `.env` (no quotes, no trailing spaces)
- [ ] Verify: Instance URLs (no trailing slash)
- [ ] Confirm: Tokens not expired
- [ ] Try: Regenerate token, update .env, test again

### If Tests Fail:

```bash
# Most common issue: wrong token format
echo $GITHUB_TOKEN
# Should output: ghp_xxxxxxxxxxxxx

# Second: wrong instance URL
grep JIRA_INSTANCE .env
# Should NOT have trailing slash

# Third: token expired
# Regenerate at provider, update .env, test again
```

---

## Next Steps

### 1. Immediate (Now)
```bash
/keel setup-mcp --mode=quick
/keel test-mcp --all
```

### 2. First Project
```bash
/keel init --mode=new --stack=cakephp
/keel brainstorm --goal="Your feature"
```

### 3. Learn More
- **Phase workflows:** See [MCP-INTEGRATION-MATRIX.md](MCP-INTEGRATION-MATRIX.md)
- **Configuration details:** See [MCP-SETUP-WIZARD.md](MCP-SETUP-WIZARD.md)
- **Individual MCPs:** See `.claude/mcp-templates/*.yml`

### 4. Add More MCPs
```bash
/keel setup-mcp --add=slack,confluence
/keel test-mcp --all
```

---

## FAQ

### Q: Do I need all MCPs?
**A:** No. Tier 1 (GitHub, Jira, Playwright, SonarQube) are required. Add Tier 2 (Slack, Confluence) as needed.

### Q: How do I rotate tokens?
**A:** Every 90 days: regenerate at provider → update `.env` → test connection → revoke old token.

### Q: Can I use Jira Cloud instead of on-premise?
**A:** Yes! Cloud or on-premise both work. Just use the instance URL from your Jira domain.

### Q: What if my SonarQube is self-hosted?
**A:** Same process. Update `SONARQUBE_INSTANCE` to your self-hosted URL.

### Q: Can I skip Slack/Confluence?
**A:** Yes! They're optional. You'll just miss notifications and docs auto-publication.

### Q: How often do I need to regenerate tokens?
**A:** Recommended: Every 90 days. Required: If token is compromised or expires.

### Q: What if a token expires?
**A:** Regenerate at provider, update `.env`, run `/keel test-mcp --all`, continue working.

---

## Support

**Having issues?**
1. Check: [MCP-QUICK-START.md#Troubleshooting](MCP-QUICK-START.md#troubleshooting-checklist)
2. Debug: `/keel test-mcp --all --verbose`
3. Review: [MCP-SETUP-WIZARD.md#Troubleshooting](MCP-SETUP-WIZARD.md#troubleshooting)
4. Report: Create issue on GitHub with output from step 2

**Want to add a new MCP?**
1. Create: `.claude/mcp-templates/[new-tool].yml`
2. Update: `.claude/.mcp/config.yml` to register
3. Test: `/keel test-mcp --type=[new-tool]`
4. Document: Update this index

---

## Summary

✅ **Tier 1 Setup (5 min):** GitHub, Jira, Playwright, SonarQube  
✅ **Tier 2 Setup (3 min):** Slack, Confluence  
✅ **Test All:** `/keel test-mcp --all`  
✅ **Start Building:** `/keel init --mode=new --stack=cakephp`  

**Ready? Let's go! 🚀**

```bash
/keel setup-mcp --mode=quick
```

---

**Documentation Version:** 1.0  
**Last Updated:** 2026-07-07  
**Status:** Production Ready

