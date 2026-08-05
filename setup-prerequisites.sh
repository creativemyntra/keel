#!/bin/bash
# Keel AI-SDLC Framework - System Prerequisites Setup
# Run this ONCE after cloning the keel repo, before installing the Claude Code plugin
# This script configures system-level settings required for Keel to work properly

set -e

echo "═══════════════════════════════════════════════════════════"
echo "Keel AI-SDLC Framework - Prerequisites Setup"
echo "═══════════════════════════════════════════════════════════"
echo ""

# 1. Configure Git Safe Directories (Windows/macOS/Linux compatibility)
echo "📋 Configuring Git safe directories..."

KEEL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER_HOME="$(eval echo ~)"

# Add keel directory as safe
git config --global --add safe.directory "$KEEL_DIR" 2>/dev/null || true
echo "  ✓ Added: $KEEL_DIR"

# Add user home directory as safe
git config --global --add safe.directory "$USER_HOME" 2>/dev/null || true
echo "  ✓ Added: $USER_HOME"

# List all safe directories
echo ""
echo "📋 Git safe directories configured:"
git config --global --get-all safe.directory 2>/dev/null | sed 's/^/  - /' || echo "  (none)"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Prerequisites setup complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Run: npm install"
echo "  2. Then: claude plugin install ."
echo "  3. Or use: claude plugin marketplace add https://github.com/creativemyntra/keel"
echo ""
