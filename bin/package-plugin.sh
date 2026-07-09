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
# Run node from INSIDE the staging dir with a relative path — interpolating
# an MSYS path (/c/Users/...) into node code breaks on Windows (git-bash
# translates it to C:\c\Users\...).
if command -v node &>/dev/null; then
  (cd "$STAGING" && node -e "
    const fs = require('fs');
    const p = JSON.parse(fs.readFileSync('.claude-plugin/plugin.json', 'utf8'));
    p.version = '$VERSION';
    fs.writeFileSync('.claude-plugin/plugin.json', JSON.stringify(p, null, 2));
  ")
  echo "  ✅ Stamped version $VERSION into .claude-plugin/plugin.json"
fi

# ── Create the .plugin zip ───────────────────────────────────
# git-bash on Windows ships no `zip` — fall back to PowerShell Compress-Archive.
cd "$STAGING"
if command -v zip &>/dev/null; then
  zip -r "$BUNDLE_PATH" . -x "*.DS_Store" > /dev/null
elif command -v powershell.exe &>/dev/null; then
  # Compress-Archive only writes .zip — create as .zip, then rename
  TMP_ZIP="$BUNDLE_PATH.zip"
  powershell.exe -NoProfile -Command "Compress-Archive -Path '.\*' -DestinationPath '$(cygpath -w "$TMP_ZIP" 2>/dev/null || echo "$TMP_ZIP")' -Force" > /dev/null
  mv "$TMP_ZIP" "$BUNDLE_PATH"
else
  echo "❌ Neither zip nor powershell.exe available — cannot create bundle" >&2
  exit 1
fi
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
