#!/bin/bash
# Keel AI-SDLC Framework - Automated Setup Wizard
# Industry-standard interactive configuration

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          Keel AI-SDLC Framework - Setup Wizard                ║"
echo "║                                                                ║"
echo "║  Complete AI-SDLC pipeline automation with integrations       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Counters
STEP=1
TOTAL_STEPS=6

# Helper functions
progress_bar() {
  local current=$1
  local total=$2
  local width=40
  local percent=$((current * 100 / total))
  local filled=$((width * current / total))

  printf "\r["
  printf "%${filled}s" | tr ' ' '='
  printf "%$((width - filled))s" | tr ' ' '-'
  printf "] %d%%" $percent
}

section_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Step $STEP/$TOTAL_STEPS: $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
  echo -e "${RED}❌ $1${NC}"
}

# ==============================================================================
# STEP 1: Installation Method
# ==============================================================================
STEP=1
section_header "Choose Installation Method"

echo "Select how you want to install Keel:"
echo ""
echo "  1) Claude Code Skill (Recommended for individual developers)"
echo "  2) npm Global Package (For CLI usage across projects)"
echo "  3) Docker Container (For CI/CD and containerized workflows)"
echo "  4) GitHub Action (For GitHub workflows)"
echo ""

read -p "Select installation method (1-4, default: 1): " INSTALL_METHOD
INSTALL_METHOD=${INSTALL_METHOD:-1}

case $INSTALL_METHOD in
  1)
    INSTALL_TYPE="claude-code-skill"
    success "Selected: Claude Code Skill"
    ;;
  2)
    INSTALL_TYPE="npm-global"
    success "Selected: npm Global Package"
    ;;
  3)
    INSTALL_TYPE="docker"
    success "Selected: Docker Container"
    ;;
  4)
    INSTALL_TYPE="github-action"
    success "Selected: GitHub Action"
    ;;
  *)
    error "Invalid selection"
    exit 1
    ;;
esac

echo ""

# ==============================================================================
# STEP 2: Verify Prerequisites
# ==============================================================================
STEP=2
section_header "Verify Prerequisites"

MISSING_PREREQS=0

echo "Checking requirements..."
echo ""

# Check Git
if command -v git &> /dev/null; then
  success "Git $(git --version | awk '{print $3}')"
else
  error "Git not found - required for installation"
  MISSING_PREREQS=$((MISSING_PREREQS + 1))
fi

# Check Node.js
if command -v node &> /dev/null; then
  success "Node.js $(node --version)"
else
  warning "Node.js not found - required for some features"
fi

# Check npm
if command -v npm &> /dev/null; then
  success "npm $(npm --version)"
else
  warning "npm not found"
fi

# Check Docker (if docker installation)
if [ "$INSTALL_TYPE" = "docker" ]; then
  if command -v docker &> /dev/null; then
    success "Docker $(docker --version | awk '{print $3}')"
  else
    error "Docker not found - required for Docker installation"
    MISSING_PREREQS=$((MISSING_PREREQS + 1))
  fi
fi

echo ""

if [ $MISSING_PREREQS -gt 0 ]; then
  error "Please install missing prerequisites and try again"
  exit 1
fi

success "All prerequisites met"
echo ""

# ==============================================================================
# STEP 3: Configure Project
# ==============================================================================
STEP=3
section_header "Configure Your Project"

echo "Project configuration:"
echo ""

read -p "Project name (default: my-keel-project): " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-my-keel-project}

echo ""
echo "Select tech stack:"
echo "  1) CakePHP 4.4 + PHP 8.1 (Recommended)"
echo "  2) Laravel 10 + PHP 8.2"
echo "  3) Django 4.2 + Python 3.9+"
echo "  4) Ruby on Rails 7"
echo ""

read -p "Select stack (1-4, default: 1): " STACK_CHOICE
STACK_CHOICE=${STACK_CHOICE:-1}

case $STACK_CHOICE in
  1) STACK="cakephp" ;;
  2) STACK="laravel" ;;
  3) STACK="django" ;;
  4) STACK="rails" ;;
  *) STACK="cakephp" ;;
esac

success "Project: $PROJECT_NAME"
success "Stack: $STACK"
echo ""

# ==============================================================================
# STEP 4: Configure Integrations (Jira, Playwright, etc)
# ==============================================================================
STEP=4
section_header "Configure Optional Integrations"

echo "Keel can integrate with external tools for enhanced workflow:"
echo ""

# Jira Integration
read -p "Configure Jira integration? (y/n, default: y): " SETUP_JIRA
SETUP_JIRA=${SETUP_JIRA:-y}

JIRA_CONFIG=""
if [ "$SETUP_JIRA" = "y" ] || [ "$SETUP_JIRA" = "Y" ]; then
  echo ""
  echo -e "${BLUE}→ Jira Configuration${NC}"
  read -p "  Jira instance URL (e.g., https://company.atlassian.net): " JIRA_URL
  read -p "  Jira email address: " JIRA_EMAIL
  read -sp "  Jira API token (hidden): " JIRA_TOKEN
  echo ""

  mkdir -p ~/.keel/secrets
  echo "$JIRA_TOKEN" > ~/.keel/secrets/jira.token
  chmod 600 ~/.keel/secrets/jira.token

  JIRA_CONFIG="true"
  success "Jira configured"
else
  JIRA_CONFIG="false"
  warning "Jira integration skipped"
fi

echo ""

# Playwright MCP Integration
read -p "Configure Playwright (E2E testing) integration? (y/n, default: y): " SETUP_PLAYWRIGHT
SETUP_PLAYWRIGHT=${SETUP_PLAYWRIGHT:-y}

PLAYWRIGHT_CONFIG=""
if [ "$SETUP_PLAYWRIGHT" = "y" ] || [ "$SETUP_PLAYWRIGHT" = "Y" ]; then
  echo ""
  echo -e "${BLUE}→ Playwright Configuration${NC}"

  echo "Select browsers:"
  read -p "  Install Chromium? (y/n, default: y): " PW_CHROMIUM
  PW_CHROMIUM=${PW_CHROMIUM:-y}

  read -p "  Install Firefox? (y/n, default: n): " PW_FIREFOX
  PW_FIREFOX=${PW_FIREFOX:-n}

  read -p "  Install WebKit? (y/n, default: n): " PW_WEBKIT
  PW_WEBKIT=${PW_WEBKIT:-n}

  read -p "  Headless mode? (y/n, default: y): " PW_HEADLESS
  PW_HEADLESS=${PW_HEADLESS:-y}

  PLAYWRIGHT_CONFIG="true"
  success "Playwright configured"
else
  PLAYWRIGHT_CONFIG="false"
  warning "Playwright integration skipped"
fi

echo ""

# GitHub Integration
read -p "Configure GitHub integration? (y/n, default: y): " SETUP_GITHUB
SETUP_GITHUB=${SETUP_GITHUB:-y}

GITHUB_CONFIG=""
if [ "$SETUP_GITHUB" = "y" ] || [ "$SETUP_GITHUB" = "Y" ]; then
  echo ""
  echo -e "${BLUE}→ GitHub Configuration${NC}"
  read -sp "  GitHub Personal Access Token (leave empty to skip): " GITHUB_TOKEN
  echo ""
  read -p "  Repository (owner/repo): " GITHUB_REPO

  if [ -n "$GITHUB_TOKEN" ]; then
    mkdir -p ~/.keel/secrets
    echo "$GITHUB_TOKEN" > ~/.keel/secrets/github.token
    chmod 600 ~/.keel/secrets/github.token
  fi

  GITHUB_CONFIG="true"
  success "GitHub configured"
else
  GITHUB_CONFIG="false"
  warning "GitHub integration skipped"
fi

echo ""

# Slack Integration
read -p "Configure Slack notifications? (y/n, default: n): " SETUP_SLACK
SETUP_SLACK=${SETUP_SLACK:-n}

SLACK_CONFIG=""
if [ "$SETUP_SLACK" = "y" ] || [ "$SETUP_SLACK" = "Y" ]; then
  echo ""
  echo -e "${BLUE}→ Slack Configuration${NC}"
  read -p "  Slack Webhook URL: " SLACK_WEBHOOK
  read -p "  Channel (default: #development): " SLACK_CHANNEL
  SLACK_CHANNEL=${SLACK_CHANNEL:-"#development"}

  SLACK_CONFIG="true"
  success "Slack configured"
else
  SLACK_CONFIG="false"
fi

echo ""

# ==============================================================================
# STEP 5: Install Keel
# ==============================================================================
STEP=5
section_header "Install Keel Framework"

case $INSTALL_TYPE in
  claude-code-skill)
    echo "Installing as Claude Code Skill..."
    KEEL_DIR="${HOME}/.claude/skills/keel-framework"
    mkdir -p "$(dirname "$KEEL_DIR")"
    if [ -d "$KEEL_DIR/.git" ]; then
      echo "Updating existing installation..."
      git -C "$KEEL_DIR" pull
    else
      git clone https://github.com/creativemyntra/keel.git "$KEEL_DIR"
    fi
    success "Installed at $KEEL_DIR"
    ;;

  npm-global)
    echo "Installing as npm Global Package..."
    npm install -g @amarsingh/keel
    success "Installed globally"
    ;;

  docker)
    echo "Pulling Docker image..."
    docker pull amarsingh/keel:latest
    success "Docker image ready"
    ;;

  github-action)
    echo "GitHub Action ready to use"
    success "Add to your workflow: uses: creativemyntra/keel@v3.0.2"
    ;;
esac

echo ""

# ==============================================================================
# STEP 6: Create Configuration Files
# ==============================================================================
STEP=6
section_header "Create Configuration Files"

# Create .keel directory
KEEL_CONFIG_DIR=".keel"
mkdir -p "$KEEL_CONFIG_DIR/config"

# Create main config file
cat > "$KEEL_CONFIG_DIR/keel.config.yml" << EOF
# Keel AI-SDLC Framework Configuration
# Generated by setup wizard

project:
  name: "$PROJECT_NAME"
  stack: "$STACK"

integrations:
  jira:
    enabled: $JIRA_CONFIG
EOF

if [ ! -z "$JIRA_URL" ]; then
  cat >> "$KEEL_CONFIG_DIR/keel.config.yml" << EOF
    url: "$JIRA_URL"
    email: "$JIRA_EMAIL"
EOF
fi

cat >> "$KEEL_CONFIG_DIR/keel.config.yml" << EOF

  playwright:
    enabled: $PLAYWRIGHT_CONFIG
EOF

if [ "$PLAYWRIGHT_CONFIG" = "true" ]; then
  cat >> "$KEEL_CONFIG_DIR/keel.config.yml" << EOF
    headless: $PW_HEADLESS
    browsers:
      chromium: $PW_CHROMIUM
      firefox: $PW_FIREFOX
      webkit: $PW_WEBKIT
EOF
fi

cat >> "$KEEL_CONFIG_DIR/keel.config.yml" << EOF

  github:
    enabled: $GITHUB_CONFIG
EOF

if [ ! -z "$GITHUB_REPO" ]; then
  cat >> "$KEEL_CONFIG_DIR/keel.config.yml" << EOF
    repository: "$GITHUB_REPO"
EOF
fi

cat >> "$KEEL_CONFIG_DIR/keel.config.yml" << EOF

  slack:
    enabled: $SLACK_CONFIG
EOF

if [ "$SLACK_CONFIG" = "true" ]; then
  cat >> "$KEEL_CONFIG_DIR/keel.config.yml" << EOF
    channel: "$SLACK_CHANNEL"
EOF
fi

success "Created .keel/keel.config.yml"

# Create integration config files
if [ "$JIRA_CONFIG" = "true" ]; then
  cat > "$KEEL_CONFIG_DIR/config/jira.yml" << EOF
# Jira Integration Configuration
jira:
  url: "$JIRA_URL"
  email: "$JIRA_EMAIL"
  # API token stored in: ~/.keel/secrets/jira.token

integrations:
  sync_issues: true
  auto_create_pr: true
  update_on_deploy: true
EOF
  success "Created .keel/config/jira.yml"
fi

if [ "$PLAYWRIGHT_CONFIG" = "true" ]; then
  cat > "$KEEL_CONFIG_DIR/config/playwright.yml" << EOF
# Playwright E2E Testing Configuration
playwright:
  headless: $PW_HEADLESS
  timeout: 30000
  retries: 2

browsers:
  chromium: $PW_CHROMIUM
  firefox: $PW_FIREFOX
  webkit: $PW_WEBKIT

screenshot_on_failure: true
trace_on_failure: true
EOF
  success "Created .keel/config/playwright.yml"
fi

if [ "$GITHUB_CONFIG" = "true" ]; then
  cat > "$KEEL_CONFIG_DIR/config/github.yml" << EOF
# GitHub Integration Configuration
github:
  repository: "$GITHUB_REPO"
  # Token stored in: ~/.keel/secrets/github.token

features:
  sync_prs: true
  auto_create_release: true
  update_issues: true
  post_comments: true
EOF
  success "Created .keel/config/github.yml"
fi

if [ "$SLACK_CONFIG" = "true" ]; then
  cat > "$KEEL_CONFIG_DIR/config/slack.yml" << EOF
# Slack Notifications Configuration
slack:
  channel: "$SLACK_CHANNEL"
  # Webhook URL stored in: ~/.keel/secrets/slack.webhook

events:
  on_phase_complete: true
  on_error: true
  on_deployment: true
EOF
  success "Created .keel/config/slack.yml"
fi

# Create .gitignore entry
if [ -f ".gitignore" ]; then
  if ! grep -q ".keel/secrets" .gitignore; then
    echo ".keel/secrets" >> .gitignore
  fi
else
  echo ".keel/secrets" > .gitignore
fi
success "Updated .gitignore"

echo ""

# ==============================================================================
# COMPLETION SUMMARY
# ==============================================================================
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete! ✅                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo -e "${GREEN}Configuration Summary:${NC}"
echo "  Project Name: $PROJECT_NAME"
echo "  Tech Stack: $STACK"
echo "  Installation: $INSTALL_TYPE"
echo ""

echo -e "${GREEN}Integrations Configured:${NC}"
if [ "$JIRA_CONFIG" = "true" ]; then echo "  ✅ Jira"; else echo "  ⭕ Jira"; fi
if [ "$PLAYWRIGHT_CONFIG" = "true" ]; then echo "  ✅ Playwright"; else echo "  ⭕ Playwright"; fi
if [ "$GITHUB_CONFIG" = "true" ]; then echo "  ✅ GitHub"; else echo "  ⭕ GitHub"; fi
if [ "$SLACK_CONFIG" = "true" ]; then echo "  ✅ Slack"; else echo "  ⭕ Slack"; fi
echo ""

echo -e "${GREEN}Configuration Files:${NC}"
echo "  📁 .keel/keel.config.yml (main config)"
echo "  📁 .keel/config/jira.yml (if enabled)"
echo "  📁 .keel/config/playwright.yml (if enabled)"
echo "  📁 .keel/config/github.yml (if enabled)"
echo "  📁 .keel/config/slack.yml (if enabled)"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo ""

case $INSTALL_TYPE in
  claude-code-skill)
    echo "  1. Restart Claude Code"
    echo "  2. Run: /keel init --mode=new --stack=$STACK"
    echo "  3. Create first feature: /keel req --story=KEEL-1"
    ;;
  npm-global)
    echo "  1. Run: keel init --mode=new --stack=$STACK"
    echo "  2. Create first feature: keel req --story=KEEL-1"
    ;;
  docker)
    echo "  1. Run: docker run -it -v \$(pwd):/app amarsingh/keel:latest keel init --mode=new"
    ;;
  github-action)
    echo "  1. Add to your workflow:"
    echo "     - uses: amarsingh/keel@v2.1.0"
    echo "       with:"
    echo "         phase: 'init'"
    echo "         stack: '$STACK'"
    ;;
esac

echo ""
echo "  📖 Documentation: https://github.com/creativemyntra/keel#readme"
echo "  💬 Support: https://github.com/creativemyntra/keel/issues"
echo ""

if [ "$INSTALL_TYPE" = "claude-code-skill" ] || [ "$INSTALL_TYPE" = "npm-global" ]; then
  echo -e "${BLUE}Verify Installation:${NC}"
  if [ "$INSTALL_TYPE" = "claude-code-skill" ]; then
    echo "  /keel --version"
  else
    echo "  keel --version"
  fi
  echo ""
fi

echo -e "${GREEN}🎉 Ready to start developing with Keel!${NC}"
echo ""
