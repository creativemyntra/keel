#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# bin/package-plugin.sh
# Packages the Keel plugin into a distributable .plugin bundle.
#
# Usage:
#   bash bin/package-plugin.sh [VERSION]
#
# Output:
#   dist/keel-<VERSION>.plugin
# ─────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-$(node -p "require('$ROOT/.claude-plugin/plugin.json').version" 2>/dev/null || echo "dev")}"
DIST="$ROOT/dist"
BUNDLE_NAME="keel-$VERSION.plugin"
BUNDLE_PATH="$DIST/$BUNDLE_NAME"
STAGING="$DIST/.staging-$VERSION"

echo "📦 Packaging Keel v$VERSION → $BUNDLE_NAME"

# ── Clean up ────────────────────────────────────────────────
rm -rf "$STAGING" "$BUNDLE_PATH"
mkdir -p "$STAGING" "$DIST"

# ── Copy root files ──────────────────────────────────────────
cp "$ROOT/action.yml"               "$STAGING/"
cp "$ROOT/README.md"                "$STAGING/"
cp "$ROOT/CHANGELOG.md"             "$STAGING/"
cp "$ROOT/LICENSE"                  "$STAGING/"
cp "$ROOT/.env.example"             "$STAGING/" 2>/dev/null || true
cp "$ROOT/agent-output-schema.json" "$STAGING/" 2>/dev/null || true
cp "$ROOT/.mcp.json"                "$STAGING/" 2>/dev/null || true

# ── Copy scripts ─────────────────────────────────────────────
# setup-integrations.sh is the non-interactive (CI/Docker) fallback;
# interactive setup is the /keel:setup command in commands/setup.md.
for script in setup-integrations.sh; do
  [ -f "$ROOT/$script" ] && cp "$ROOT/$script" "$STAGING/"
done

# ── Copy directories ─────────────────────────────────────────
declare -a DIRS=(".claude-plugin" "commands" "agents" "skills" "hooks" "scripts" "bin" "docs" "stack-profiles")
for dir in "${DIRS[@]}"; do
  if [ -d "$ROOT/$dir" ]; then
    cp -r "$ROOT/$dir" "$STAGING/$dir"
    echo "  ✅ Included $dir/"
  else
    echo "  ⚠️  Skipped $dir/ (not found)"
  fi
done

# ── Remove excluded patterns ─────────────────────────────────
find "$STAGING" -name "*.log"        -delete
find "$STAGING" -name "*.tmp"        -delete
find "$STAGING" -name ".DS_Store"    -delete
find "$STAGING" -name "__pycache__"  -type d -exec rm -rf {} + 2>/dev/null || true
find "$STAGING" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
rm -rf "$STAGING/.git"
rm -rf "$STAGING/.keel/secrets" 2>/dev/null || true

# ── Stamp version into the manifest ─────────────────────────
if command -v node &>/dev/null; then
  node -e "
    const fs = require('fs');
    const path = '$STAGING/.claude-plugin/plugin.json';
    const p = JSON.parse(fs.readFileSync(path, 'utf8'));
    p.version = '$VERSION';
    fs.writeFileSync(path, JSON.stringify(p, null, 2));
  "
  echo "  ✅ Stamped version $VERSION into .claude-plugin/plugin.json"
fi

# ── Create the .plugin zip ───────────────────────────────────
cd "$STAGING"
zip -r "$BUNDLE_PATH" . -x "*.DS_Store" > /dev/null
cd "$ROOT"

# ── Generate checksum ────────────────────────────────────────
if command -v sha256sum &>/dev/null; then
  sha256sum "$BUNDLE_PATH" > "$BUNDLE_PATH.sha256"
  echo "  ✅ SHA-256: $(cat "$BUNDLE_PATH.sha256" | awk '{print $1}')"
elif command -v shasum &>/dev/null; then
  shasum -a 256 "$BUNDLE_PATH" > "$BUNDLE_PATH.sha256"
fi

# ── Cleanup staging ──────────────────────────────────────────
rm -rf "$STAGING"

# ── Summary ──────────────────────────────────────────────────
SIZE=$(du -sh "$BUNDLE_PATH" | cut -f1)
echo ""
echo "✅ Plugin bundle ready:"
echo "   Path:    $BUNDLE_PATH"
echo "   Size:    $SIZE"
echo "   Install: /plugin add file $BUNDLE_PATH"
