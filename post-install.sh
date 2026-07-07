#!/bin/bash
# Keel AI-SDLC Framework - Zero-Config Post-Install
# Runs automatically after /plugin add marketplace keel
# NO user interaction - just works!

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          Keel AI-SDLC Framework Installed! 🎉                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Create secrets directory if needed
mkdir -p ~/.keel/secrets
chmod 700 ~/.keel/secrets

# Create default config directory
mkdir -p ~/.keel/config
chmod 700 ~/.keel/config

# Create default MCP configs with sensible defaults
cat > ~/.keel/config/jira-default.yml << 'EOF'
# Jira Integration (Optional)
# To enable: Set JIRA_URL, JIRA_EMAIL, and token in ~/.keel/secrets/jira.token
# Then rename this file to jira.yml

jira:
  enabled: false
  url: ""  # Will be set via setup wizard or environment
  email: ""  # Will be set via setup wizard or environment
  # API token stored separately in: ~/.keel/secrets/jira.token
EOF

cat > ~/.keel/config/github-default.yml << 'EOF'
# GitHub Integration (Optional)
# To enable: Set GITHUB_TOKEN in ~/.keel/secrets/github.token
# Then rename this file to github.yml

github:
  enabled: false
  repository: ""  # owner/repo format
  # Token stored separately in: ~/.keel/secrets/github.token
EOF

cat > ~/.keel/config/playwright-default.yml << 'EOF'
# Playwright Integration (Optional)
# Works out of the box with defaults

playwright:
  enabled: true
  headless: true
  timeout: 30000
  browsers:
    chromium: true
    firefox: false
    webkit: false
EOF

cat > ~/.keel/config/slack-default.yml << 'EOF'
# Slack Integration (Optional)
# To enable: Set SLACK_WEBHOOK_URL in ~/.keel/secrets/slack.webhook
# Then rename this file to slack.yml

slack:
  enabled: false
  webhook_url: ""  # Will be set via environment
  channel: "#keel-notifications"
EOF

# Create .gitignore entry for secrets
echo "# Keel secrets - never commit!" >> ~/.gitignore 2>/dev/null || true
echo "~/.keel/secrets/" >> ~/.gitignore 2>/dev/null || true

echo "✅ Installation complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "READY TO USE:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  /keel --version                    # Check installation"
echo "  /keel init --mode=new --stack=cakephp  # Start new project"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "OPTIONAL: Configure integrations later"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Jira:      bash ~/.claude/skills/keel-framework/setup-integrations.sh jira"
echo "GitHub:    bash ~/.claude/skills/keel-framework/setup-integrations.sh github"
echo "Slack:     bash ~/.claude/skills/keel-framework/setup-integrations.sh slack"
echo ""
echo "Docs: ~/.claude/skills/keel-framework/README.md"
echo ""
