#!/bin/bash
# Keel AI-SDLC Framework - Optional Integration Setup
# Run ONLY if you want to configure Jira, GitHub, or Slack
# Completely optional - Keel works without these!

set -e

if [ -z "$1" ]; then
  echo "Usage: setup-integrations.sh [jira|github|slack]"
  echo ""
  echo "Examples:"
  echo "  setup-integrations.sh jira       # Configure Jira"
  echo "  setup-integrations.sh github     # Configure GitHub"
  echo "  setup-integrations.sh slack      # Configure Slack"
  exit 1
fi

INTEGRATION=$1

case $INTEGRATION in
  jira)
    echo "═══════════════════════════════════════════════════════════"
    echo "Configure Jira Integration (Optional)"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    read -p "Jira URL (e.g., https://company.atlassian.net): " JIRA_URL
    read -p "Jira Email: " JIRA_EMAIL
    read -sp "Jira API Token (hidden): " JIRA_TOKEN
    echo ""

    mkdir -p ~/.keel/secrets ~/.keel/config

    # Save config
    cat > ~/.keel/config/jira.yml << EOF
jira:
  enabled: true
  url: $JIRA_URL
  email: $JIRA_EMAIL
EOF

    # Save token securely
    echo "$JIRA_TOKEN" > ~/.keel/secrets/jira.token
    chmod 600 ~/.keel/secrets/jira.token

    echo ""
    echo "✅ Jira configured successfully!"
    ;;

  github)
    echo "═══════════════════════════════════════════════════════════"
    echo "Configure GitHub Integration (Optional)"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    read -p "GitHub Repository (e.g., owner/repo): " GITHUB_REPO
    read -sp "GitHub Personal Access Token (hidden): " GITHUB_TOKEN
    echo ""

    mkdir -p ~/.keel/secrets ~/.keel/config

    # Save config
    cat > ~/.keel/config/github.yml << EOF
github:
  enabled: true
  repository: $GITHUB_REPO
EOF

    # Save token securely
    echo "$GITHUB_TOKEN" > ~/.keel/secrets/github.token
    chmod 600 ~/.keel/secrets/github.token

    echo ""
    echo "✅ GitHub configured successfully!"
    ;;

  slack)
    echo "═══════════════════════════════════════════════════════════"
    echo "Configure Slack Integration (Optional)"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "Steps:"
    echo "1. Go to: https://api.slack.com/apps"
    echo "2. Create New App → From scratch"
    echo "3. Go to 'Incoming Webhooks'"
    echo "4. Click 'Add New Webhook to Workspace'"
    echo "5. Select channel and authorize"
    echo ""
    read -p "Slack Webhook URL: " SLACK_WEBHOOK
    read -p "Slack Channel (e.g., #keel-notifications): " SLACK_CHANNEL

    mkdir -p ~/.keel/secrets ~/.keel/config

    # Save config
    cat > ~/.keel/config/slack.yml << EOF
slack:
  enabled: true
  channel: $SLACK_CHANNEL
EOF

    # Save webhook securely
    echo "$SLACK_WEBHOOK" > ~/.keel/secrets/slack.webhook
    chmod 600 ~/.keel/secrets/slack.webhook

    echo ""
    echo "✅ Slack configured successfully!"
    ;;

  *)
    echo "Unknown integration: $INTEGRATION"
    echo "Use: jira, github, or slack"
    exit 1
    ;;
esac

echo ""
echo "Configuration saved to: ~/.keel/config/ and ~/.keel/secrets/"
echo "Ready to use! 🚀"
