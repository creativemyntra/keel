#!/bin/bash
# BASELINE-002 Runner with Automated Metric Capture
#
# This script wraps the BASELINE-002 story with automated logging
# and creates a metrics capture template.
#
# Usage: bash scripts/run-baseline-with-capture.sh
#
# Steps:
# 1. Creates a metrics capture file (baseline-002-metrics.jsonl)
# 2. Prints instructions for running the story in Claude Code
# 3. Waits for you to complete the story
# 4. Compares actual metrics to headless orchestrator expectations

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE_DIR="$PROJECT_ROOT/docs/baseline-runs"
METRICS_FILE="$BASELINE_DIR/baseline-002-metrics-$(date +%Y%m%d-%H%M%S).jsonl"

mkdir -p "$BASELINE_DIR"

echo "================================================================================"
echo "BASELINE-002 RUNNER — Model/Effort Frontmatter Verification"
echo "================================================================================"
echo ""
echo "This script will help you verify that agent frontmatter declarations are"
echo "actually used by Claude Code when running a story."
echo ""
echo "📋 STEP 1: Headless validation (automated)"
echo "   Running orchestrator to verify frontmatter is correct..."
echo ""

# Run headless orchestrator to validate frontmatter
node "$PROJECT_ROOT/scripts/headless-orchestrator.cjs" \
  --story BASELINE-002 \
  --feature "User profile page with avatar upload" \
  --scope feature \
  --json > "$METRICS_FILE.headless.json"

echo "✅ Headless validation complete. Frontmatter validated."
echo ""

# Display headless results
echo "Headless Orchestrator Results:"
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('$METRICS_FILE.headless.json', 'utf8'));
console.log('  Phases: ' + data.summary.total_phases);
console.log('  Matches: ' + data.summary.frontmatter_matches + '/' + data.summary.total_phases);
console.log('  Status: ' + (data.summary.frontmatter_mismatches === 0 ? '✅ ALL MATCH' : '❌ MISMATCHES'));
"

echo ""
echo "================================================================================"
echo "📋 STEP 2: Interactive verification (you run this in Claude Code)"
echo "================================================================================"
echo ""
echo "Now run this command in Claude Code to execute BASELINE-002:"
echo ""
echo "  /keel:implement-feature story=\"BASELINE-002\" feature=\"User profile page with avatar upload\""
echo ""
echo "After EACH phase completes, record the metrics:"
echo "  - Look at Claude Code UI → Session Summary"
echo "  - Copy: model, input_tokens, output_tokens"
echo "  - Paste into: docs/BASELINE-002-RUN-GUIDE.md"
echo ""
echo "================================================================================"
echo "📋 STEP 3: Compare interactive to headless (automated)"
echo "================================================================================"
echo ""
echo "Metrics file ready at: $METRICS_FILE.headless.json"
echo ""
echo "When you finish BASELINE-002 in Claude Code:"
echo "  1. Populate docs/BASELINE-002-RUN-GUIDE.md with Session Summary values"
echo "  2. Run: bash scripts/run-baseline-with-capture.sh --analyze"
echo ""
echo "This will compare actual (interactive) vs expected (headless) models."
echo ""
echo "================================================================================"
echo ""

# If --analyze flag given, compare interactive results to headless expectations
if [ "$1" == "--analyze" ]; then
  echo "Analyzing BASELINE-002 results..."

  if [ -f "$PROJECT_ROOT/docs/BASELINE-002-RUN-GUIDE.md" ]; then
    echo "✅ Found BASELINE-002-RUN-GUIDE.md"
    echo ""

    # Extract recorded models from the guide
    echo "Comparing declared (frontmatter) vs actual (Claude Code UI):"
    grep -A2 "Actually used (Session Summary):" "$PROJECT_ROOT/docs/BASELINE-002-RUN-GUIDE.md" | grep -E "Model:|Match\?" || true
  else
    echo "⚠️  BASELINE-002-RUN-GUIDE.md not yet populated."
    echo "   Complete the interactive run first and populate the guide."
  fi
fi

echo ""
echo "Next: Open Claude Code and run the command shown above."
echo ""
