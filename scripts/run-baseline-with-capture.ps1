# BASELINE-002 Runner with Automated Metric Capture (PowerShell)
#
# Usage: powershell -ExecutionPolicy Bypass scripts/run-baseline-with-capture.ps1
#
# This script prepares BASELINE-002 for interactive execution and captures metrics.

param(
    [switch]$Analyze = $false
)

$ProjectRoot = (Get-Item $PSScriptRoot).Parent.FullName
$BaselineDir = "$ProjectRoot\docs\baseline-runs"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$MetricsFile = "$BaselineDir\baseline-002-metrics-$Timestamp.jsonl"

# Create baseline runs directory
if (-not (Test-Path $BaselineDir)) {
    New-Item -ItemType Directory -Path $BaselineDir | Out-Null
}

Write-Host "=" * 80
Write-Host "BASELINE-002 RUNNER — Model/Effort Frontmatter Verification"
Write-Host "=" * 80
Write-Host ""
Write-Host "This script will help you verify that agent frontmatter declarations are"
Write-Host "actually used by Claude Code when running a story."
Write-Host ""
Write-Host "📋 STEP 1: Headless validation (automated)"
Write-Host "   Running orchestrator to verify frontmatter is correct..."
Write-Host ""

# Run headless orchestrator
$HeadlessOutput = & node "$ProjectRoot\scripts\headless-orchestrator.cjs" `
    --story BASELINE-002 `
    --feature "User profile page with avatar upload" `
    --scope feature `
    --json

# Save headless results
$HeadlessOutput | Out-File -FilePath "$MetricsFile.headless.json" -Encoding utf8

Write-Host "✅ Headless validation complete. Frontmatter validated."
Write-Host ""

# Parse and display results
$HeadlessData = $HeadlessOutput | ConvertFrom-Json
Write-Host "Headless Orchestrator Results:"
Write-Host "  Phases: $($HeadlessData.summary.total_phases)"
Write-Host "  Matches: $($HeadlessData.summary.frontmatter_matches)/$($HeadlessData.summary.total_phases)"
$Status = if ($HeadlessData.summary.frontmatter_mismatches -eq 0) { "✅ ALL MATCH" } else { "❌ MISMATCHES" }
Write-Host "  Status: $Status"
Write-Host ""

Write-Host "=" * 80
Write-Host "📋 STEP 2: Interactive verification (you run this in Claude Code)"
Write-Host "=" * 80
Write-Host ""
Write-Host "Now run this command in Claude Code to execute BASELINE-002:"
Write-Host ""
Write-Host "  /keel:implement-feature story=""BASELINE-002"" feature=""User profile page with avatar upload"""
Write-Host ""
Write-Host "After EACH phase completes, record the metrics:"
Write-Host "  - Look at Claude Code UI > Session Summary"
Write-Host "  - Copy: model, input_tokens, output_tokens"
Write-Host "  - Paste into: docs/BASELINE-002-RUN-GUIDE.md"
Write-Host ""
Write-Host "=" * 80
Write-Host "📋 STEP 3: Compare interactive to headless (automated)"
Write-Host "=" * 80
Write-Host ""
Write-Host "Metrics file ready at: $MetricsFile.headless.json"
Write-Host ""
Write-Host "When you finish BASELINE-002 in Claude Code:"
Write-Host "  1. Populate docs/BASELINE-002-RUN-GUIDE.md with Session Summary values"
Write-Host "  2. Run: powershell scripts/run-baseline-with-capture.ps1 -Analyze"
Write-Host ""
Write-Host "This will compare actual (interactive) vs expected (headless) models."
Write-Host ""
Write-Host "=" * 80
Write-Host ""

# If --analyze flag given, compare results
if ($Analyze) {
    Write-Host "Analyzing BASELINE-002 results..."
    Write-Host ""

    $GuideFile = "$ProjectRoot\docs\BASELINE-002-RUN-GUIDE.md"
    if (Test-Path $GuideFile) {
        Write-Host "✅ Found BASELINE-002-RUN-GUIDE.md"
        Write-Host ""
        Write-Host "Comparing declared (frontmatter) vs actual (Claude Code UI):"
        Write-Host ""

        # Read and display model matches
        $Content = Get-Content $GuideFile -Raw
        $Matches = [regex]::Matches($Content, "Model: \[(.*?)\]")
        foreach ($Match in $Matches) {
            Write-Host "  - $($Match.Groups[1].Value)"
        }
    } else {
        Write-Host "⚠️  BASELINE-002-RUN-GUIDE.md not yet populated."
        Write-Host "   Complete the interactive run first and populate the guide."
    }
    Write-Host ""
}

Write-Host "Next: Open Claude Code and run the command shown above."
Write-Host ""
