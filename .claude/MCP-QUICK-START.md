# MCP Quick Start Guide

**5-minute setup to get Keel working with your favorite tools**

---

## The Fastest Path to Setup

### Step 1: Run Setup Wizard (2 minutes)

```bash
/keel setup-mcp --mode=quick
```

This will:
- Ask which MCPs you want to configure
- Guide you through creating API tokens
- Test connections
- Save configuration

### Step 2: Create `.env` File (2 minutes)

Copy this template and fill in your tokens:

```bash
# Copy template
cp .env.example .env

# Edit with your tokens
nano .env
# or
code .env
```

**What to add:**

```bash
# GitHub (Required)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx

# Jira (Required)
JIRA_API_TOKEN=xxxxxxxxxxxxxxxx
JIRA_INSTANCE=https://company.atlassian.net

# SonarQube (Required)
SONARQUBE_TOKEN=squ_xxxxxxxxxxxxx
SONARQUBE_INSTANCE=https://sonarqube.example.com

# Slack (Optional but recommended)
SLACK_BOT_TOKEN=xoxb_xxxxxxxxxxxxx

# Playwright (Required for testing)
PLAYWRIGHT_BASE_URL=https://uat-app.example.com
```

### Step 3: Verify Setup (1 minute)

```bash
/keel test-mcp --all
```

Expected output:
```
✅ GitHub              (Authenticated)
✅ Jira                (Connected)
✅ Playwright          (Ready)
✅ SonarQube           (Quality gate: PASSED)
⚠️ Slack               (Not configured)
```

### Step 4: Start Building! (Ongoing)

```bash
/keel brainstorm --goal="Your feature idea"
```

---

## Where to Get Each Token

### GitHub Token
1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name: `keel-ai-sdlc`
4. Scopes: `repo`, `workflow`, `read:org`
5. Copy token to `.env`: `GITHUB_TOKEN=ghp_xxxxx`

**Expires:** No expiration (or set custom)

### Jira API Token
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Name: `keel-ai-sdlc`
4. Copy token
5. Add to `.env`:
   ```bash
   JIRA_API_TOKEN=xxxxx
   JIRA_INSTANCE=https://company.atlassian.net
   ```

**Your email:** Same email you use to log in to Jira

**Expires:** Never (but you can revoke)

### SonarQube Token
1. Log in to your SonarQube instance: `https://sonarqube.example.com`
2. Click your avatar → "My Account" → "Security"
3. Click "Generate Tokens"
4. Name: `keel-ai-sdlc`
5. Copy token
6. Add to `.env`:
   ```bash
   SONARQUBE_TOKEN=squ_xxxxx
   SONARQUBE_INSTANCE=https://sonarqube.example.com
   ```

**Project Key:** Find at `[instance]/projects` (e.g., `com.example:keel`)

### Slack Bot Token
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: `Keel AI-SDLC`
4. Workspace: [Your workspace]
5. Go to "OAuth & Permissions"
6. Scopes → Add:
   - `chat:write`
   - `files:write`
   - `reactions:write`
7. Go back to "Basic Information" → "Install to Workspace"
8. Copy "Bot User OAuth Token"
9. Add to `.env`:
   ```bash
   SLACK_BOT_TOKEN=xoxb_xxxxx
   ```

**Channel Setup:** The bot will auto-post to `#keel-ci`, `#keel-releases`, `#security-alerts`

---

## Minimal Required Setup

**If you only have time for 5 minutes, do THIS:**

```bash
# 1. Create GitHub token at github.com/settings/tokens
# Copy: ghp_xxxxx

# 2. Create .env with just GitHub
cat > .env << 'EOF'
GITHUB_TOKEN=ghp_xxxxx
EOF

# 3. Test
/keel test-mcp --type=github

# 4. Start
/keel init --mode=new --stack=cakephp

# ✅ You're ready! Add other integrations later:
/keel setup-mcp --add=jira,sonarqube
```

---

## Common Setup Issues

### "Invalid token format"
```bash
# Check token is copied completely
echo $GITHUB_TOKEN
# Should output: ghp_xxxxxxxxxxxxxxxxxxxxx

# Verify in .env (no extra spaces)
grep GITHUB_TOKEN .env
# Should output: GITHUB_TOKEN=ghp_xxxxx (no quotes or spaces)
```

### "Token has expired"
```bash
# GitHub tokens don't expire by default
# If you see this, regenerate:
# github.com/settings/tokens → Regenerate

# For Jira, regenerate at:
# id.atlassian.com/manage-profile/security/api-tokens
```

### "Connection refused"
```bash
# Check your instance URL
# ❌ Wrong: https://company.atlassian.net/ (trailing slash)
# ✅ Right: https://company.atlassian.net (no slash)

# Test with curl:
curl -u your-email@company.com:$JIRA_API_TOKEN \
  https://company.atlassian.net/rest/api/3/myself
```

### "Rate limit exceeded"
```bash
# Most MCPs have rate limits:
# - GitHub: 5,000 requests/hour (for auth)
# - Jira: 180 requests/minute

# Solution: Wait 1 hour or request higher limits
# GitHub Enterprise: Increase your limit at github.com/account/settings
```

---

## Verify Each Integration

```bash
# Test GitHub
/keel test-mcp --type=github --verbose

# Test Jira
/keel test-mcp --type=jira --verbose

# Test SonarQube
/keel test-mcp --type=sonarqube --verbose

# Test all
/keel test-mcp --all
```

---

## Next: Configure Additional MCPs

After running the quick start, you can add more MCPs:

```bash
# Add Slack
/keel setup-mcp --add=slack

# Add Confluence
/keel setup-mcp --add=confluence

# Add Linear
/keel setup-mcp --add=linear
```

---

## MCP Configuration Locations

- **Main config:** `.claude/.mcp/config.yml`
- **Templates:** `.claude/mcp-templates/`
- **Credentials:** `.env` (git-ignored)
- **Logs:** `logs/mcp.log`

---

## Using MCPs in Keel Workflow

### Phase 1.5: Brainstorm
```bash
# Posts ideas to Slack, publishes to Confluence
/keel brainstorm --goal="Increase monetization"
# → Slack #keel-ci: "Brainstorm started: Monetization (5 concepts)"
# → Confluence: KEEL space, new page created
```

### Phase 2: Requirements
```bash
# Links to Jira story, publishes docs
/keel req --story=KEEL-42 --feature="Subscription system"
# → Jira KEEL-42: Status → "In Design"
# → Confluence: Design doc published
```

### Phase 3: Design
```bash
# Updates Jira, posts design links to Slack
/keel design --story=KEEL-42 --focus=all
# → Jira KEEL-42: Add design doc link
# → Slack #keel-ci: "Design complete for KEEL-42"
```

### Phase 4: Dev, Test, Security (Parallel)
```bash
# dev-agent: Pushes code to GitHub
# test-agent: Runs Playwright E2E, comments on PR
# sec-agent: Runs SonarQube scan, posts findings to Slack
/keel dev --story=KEEL-42 --scope=all &
/keel test --story=KEEL-42 --scope=all &
/keel sec --story=KEEL-42 --scope=all
```

### Phase 5: Deploy
```bash
# Updates Jira, posts rollout progress to Slack, creates runbook in Confluence
/keel deploy --story=KEEL-42 --mode=execute --rollout=canary
# → Slack #keel-releases: "Canary 10% - Error rate 0.05%, Latency 95ms ✅"
# → Jira KEEL-42: Status → "Done"
# → Confluence: Runbook published
```

---

## Troubleshooting Matrix

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Connection refused` | Wrong URL | Check instance URL (no trailing slash) |
| `Invalid credentials` | Wrong token format | Regenerate token, copy completely |
| `Rate limit exceeded` | Too many requests | Wait 1 hour or request higher limit |
| `SSL verification failed` | Self-signed cert | Add to `security.tls_verify: false` in config.yml |
| `Timeout` | Network/server slow | Increase timeout in `.mcp/[service].yml` |
| `Auth failure` | Expired token | Regenerate token at provider |

---

## Advanced: Environment-Specific Tokens

```bash
# .env.development (dev token with limited scope)
GITHUB_TOKEN=ghp_dev_xxxxx
JIRA_INSTANCE=https://dev.atlassian.net

# .env.production (separate prod token)
GITHUB_TOKEN=ghp_prod_xxxxx
JIRA_INSTANCE=https://company.atlassian.net

# Load correct env:
source .env.$(NODE_ENV || echo "development")
```

---

## Next Steps

1. ✅ Run `/keel setup-mcp`
2. ✅ Add tokens to `.env`
3. ✅ Test with `/keel test-mcp --all`
4. ✅ Start first project: `/keel init --mode=new`
5. ✅ Read [MCP-SETUP-WIZARD.md](MCP-SETUP-WIZARD.md) for detailed config

**Questions?** Check `.claude/MCP-SETUP-WIZARD.md` for complete documentation.

---

**You're ready to build with Keel + MCPs! 🚀**

