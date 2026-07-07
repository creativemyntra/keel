#!/bin/bash
# Keel AI-SDLC Framework - One-Click GitHub Marketplace Plugin Setup
# Install Keel directly from GitHub Marketplace

set -e

echo "🚀 Keel AI-SDLC Framework - Installation Setup"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

if ! command -v git &> /dev/null; then
    echo "❌ Git is required but not installed."
    exit 1
fi
echo "✅ Git installed"

if ! command -v npm &> /dev/null; then
    echo "⚠️  npm not found - will skip npm installation"
    NPM_AVAILABLE=false
else
    echo "✅ npm installed"
    NPM_AVAILABLE=true
fi

if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker not found - will skip Docker installation"
    DOCKER_AVAILABLE=false
else
    echo "✅ Docker installed"
    DOCKER_AVAILABLE=true
fi

echo ""
echo -e "${BLUE}📍 Installation Options:${NC}"
echo ""
echo "1️⃣  Claude Code Skill (Recommended)"
echo "   - Uses your Claude subscription"
echo "   - No external API key needed"
echo "   - Access: /keel [command]"
echo ""
echo "2️⃣  npm Package (Global)"
echo "   - Install as CLI tool"
echo "   - Available globally: keel [command]"
if [ "$NPM_AVAILABLE" = false ]; then
    echo "   - ❌ npm not available"
fi
echo ""
echo "3️⃣  Docker Image (Containerized)"
echo "   - Self-contained environment"
echo "   - Pull: docker pull amarsingh/keel"
if [ "$DOCKER_AVAILABLE" = false ]; then
    echo "   - ❌ Docker not available"
fi
echo ""
echo "4️⃣  GitHub Action (CI/CD)"
echo "   - Use in workflows"
echo "   - Access: uses: amarsingh/keel@v2.1.0"
echo ""

# Read user choice
read -p "Select installation option (1-4, default: 1): " choice
choice=${choice:-1}

KEEL_DIR="${HOME}/.claude/skills/keel-framework"

case $choice in
    1)
        echo ""
        echo -e "${BLUE}📦 Installing as Claude Code Skill...${NC}"
        echo ""

        mkdir -p "$(dirname "$KEEL_DIR")"

        if [ -d "$KEEL_DIR" ]; then
            echo "⚠️  Keel already installed at $KEEL_DIR"
            read -p "Update existing installation? (y/n): " update
            if [ "$update" != "y" ]; then
                echo "❌ Installation cancelled"
                exit 1
            fi
            cd "$KEEL_DIR"
            git pull origin main
        else
            echo "📥 Cloning Keel repository..."
            git clone https://github.com/amarsingh/keel.git "$KEEL_DIR"
            cd "$KEEL_DIR"
        fi

        echo ""
        echo -e "${GREEN}✅ Installation Complete!${NC}"
        echo ""
        echo -e "${BLUE}📝 Quick Start:${NC}"
        echo "   /keel init --mode=new --stack=cakephp"
        echo ""
        echo -e "${BLUE}📚 Documentation:${NC}"
        echo "   /keel --help"
        echo "   cat $KEEL_DIR/README.md"
        echo ""
        echo -e "${YELLOW}💡 Next Steps:${NC}"
        echo "   1. Restart Claude Code"
        echo "   2. Run: /keel init --mode=new --stack=cakephp"
        echo "   3. Follow the prompts to initialize your project"
        echo ""
        ;;

    2)
        if [ "$NPM_AVAILABLE" = false ]; then
            echo "❌ npm is required but not installed"
            exit 1
        fi

        echo ""
        echo -e "${BLUE}📦 Installing as npm Global Package...${NC}"
        echo ""

        npm install -g @amarsingh/keel

        echo ""
        echo -e "${GREEN}✅ Installation Complete!${NC}"
        echo ""
        echo -e "${BLUE}📝 Quick Start:${NC}"
        echo "   keel init --mode=new --stack=cakephp"
        echo ""
        echo -e "${BLUE}📚 Documentation:${NC}"
        echo "   keel --help"
        echo ""
        echo -e "${YELLOW}💡 Next Steps:${NC}"
        echo "   1. Open terminal"
        echo "   2. Run: keel init --mode=new --stack=cakephp"
        echo "   3. Follow the prompts"
        echo ""
        ;;

    3)
        if [ "$DOCKER_AVAILABLE" = false ]; then
            echo "❌ Docker is required but not installed"
            exit 1
        fi

        echo ""
        echo -e "${BLUE}🐳 Setting up Docker Image...${NC}"
        echo ""

        docker pull amarsingh/keel:latest

        echo ""
        echo -e "${GREEN}✅ Docker Image Ready!${NC}"
        echo ""
        echo -e "${BLUE}📝 Quick Start:${NC}"
        echo "   docker run -it -v \$(pwd):/app amarsingh/keel:latest keel init --mode=new"
        echo ""
        echo -e "${BLUE}🐳 Useful Commands:${NC}"
        echo "   docker pull amarsingh/keel:latest     # Get latest version"
        echo "   docker images | grep keel              # Verify installation"
        echo "   docker run amarsingh/keel:latest --help"
        echo ""
        echo -e "${YELLOW}💡 Next Steps:${NC}"
        echo "   1. Create a project directory: mkdir my-keel-project && cd my-keel-project"
        echo "   2. Run: docker run -it -v \$(pwd):/app amarsingh/keel:latest keel init --mode=new"
        echo "   3. Follow the prompts"
        echo ""
        ;;

    4)
        echo ""
        echo -e "${BLUE}⚙️  GitHub Action Setup...${NC}"
        echo ""

        echo "📄 Add to your GitHub Actions workflow:"
        echo ""
        cat << 'EOF'
name: Keel AI-SDLC Pipeline
on: [push, pull_request]

jobs:
  keel-dev:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Initialize Keel
        uses: amarsingh/keel@v2.1.0
        with:
          phase: 'init'
          mode: 'new'
          stack: 'cakephp'

      - name: Create Requirements
        uses: amarsingh/keel@v2.1.0
        with:
          phase: 'req'
          story-id: 'KEEL-1'
          feature: 'Your feature description'

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: keel-output
          path: docs/
EOF

        echo ""
        echo -e "${GREEN}✅ Setup Instructions Ready!${NC}"
        echo ""
        echo -e "${BLUE}📝 Steps:${NC}"
        echo "   1. Copy workflow above into .github/workflows/keel.yml"
        echo "   2. Commit and push to GitHub"
        echo "   3. View execution in Actions tab"
        echo ""
        echo -e "${BLUE}📚 Configuration:${NC}"
        echo "   phase: init, brainstorm, req, design, dev, test, sec, deploy"
        echo "   stack: cakephp, laravel, django, rails"
        echo "   mode: interactive, batch, plan, execute"
        echo ""
        ;;

    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "════════════════════════════════════════"
echo -e "${GREEN}🎉 Setup Complete!${GREEN}"
echo "════════════════════════════════════════"
echo ""
echo "📖 Full Documentation: https://github.com/amarsingh/keel#readme"
echo "💬 Issues & Support: https://github.com/amarsingh/keel/issues"
echo "📝 License: MIT (Author: Amar Singh)"
echo ""
