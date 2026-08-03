# gh pr create wrapper with branch strategy validation
#
# Usage:
#   .\scripts\create-pr.ps1                  # Current branch -> dev
#   .\scripts\create-pr.ps1 -Target qa       # Current branch -> qa
#   .\scripts\create-pr.ps1 -Source feat/x -Target dev  # Explicit
#
# This wrapper validates the PR target against branch strategy before creating.

param(
    [Parameter(Position = 0)]
    [string]$Target = "dev",

    [Parameter()]
    [string]$Source = ""
)

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Validator = "$ProjectRoot\scripts\validate-pr-target.cjs"

# Get source branch (current branch or explicit)
if ([string]::IsNullOrEmpty($Source)) {
    $Source = & git rev-parse --abbrev-ref HEAD
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ERROR: Could not get current branch"
        exit 2
    }
}

Write-Host "Validating PR: $Source → $Target" -ForegroundColor Cyan
Write-Host ""

# Validate PR target
& node "$Validator" "$Source" "$Target" 2>&1
$ValidateExit = $LASTEXITCODE

if ($ValidateExit -ne 0) {
    # Validation failed - validator already showed error message
    Write-Host ""
    Write-Host "❌ Cannot create PR with invalid target branch." -ForegroundColor Red
    Write-Host "   Fix the target branch and try again."
    exit 1
}

# Validation passed - create PR
Write-Host ""
Write-Host "Creating PR: $Source → $Target..." -ForegroundColor Cyan
Write-Host ""

& gh pr create `
    --base "$Target" `
    --head "$Source" `
    --fill

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create PR" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ PR created successfully!" -ForegroundColor Green
