#!/bin/bash
# Keel — idempotent first-run setup. Invoked by the SessionStart hook.
# Creates ~/.keel config/secrets dirs and default integration configs.
# Safe to run on every session start: exits fast if already initialized.

set -e

KEEL_HOME="${KEEL_HOME:-$HOME/.keel}"

# Fast path: already initialized
[ -f "$KEEL_HOME/.initialized" ] && exit 0

mkdir -p "$KEEL_HOME/secrets" "$KEEL_HOME/config"
chmod 700 "$KEEL_HOME/secrets" "$KEEL_HOME/config" 2>/dev/null || true

write_default() {
  # only write if the file doesn't exist — never clobber user config
  [ -f "$1" ] || cat > "$1"
}

write_default "$KEEL_HOME/config/jira-default.yml" << 'EOF'
# Jira Integration (Optional)
# To enable: set url/email below, put your API token in ~/.keel/secrets/jira.token,
# then rename this file to jira.yml
jira:
  enabled: false
  url: ""
  email: ""
EOF

write_default "$KEEL_HOME/config/github-default.yml" << 'EOF'
# GitHub Integration (Optional)
# To enable: put a token in ~/.keel/secrets/github.token, rename to github.yml
github:
  enabled: false
  repository: ""   # owner/repo
EOF

write_default "$KEEL_HOME/config/playwright-default.yml" << 'EOF'
# Playwright Integration (Optional) — works out of the box
playwright:
  enabled: true
  headless: true
  timeout: 30000
  browsers:
    chromium: true
    firefox: false
    webkit: false
EOF

write_default "$KEEL_HOME/config/slack-default.yml" << 'EOF'
# Slack Integration (Optional)
# To enable: put webhook URL in ~/.keel/secrets/slack.webhook, rename to slack.yml
slack:
  enabled: false
  channel: "#keel-notifications"
EOF

touch "$KEEL_HOME/.initialized"
echo "Keel: initialized $KEEL_HOME (config + secrets directories created)"
