# Install git hooks for branch strategy validation
#
# Usage:
#   .\scripts\install-hooks.ps1
#
# This script delegates to the bash installer for cross-platform consistency.

param(
    [switch]$Quiet = $false
)

function Write-Status {
    param([string]$Message, [string]$Color = "White")
    if (-not $Quiet) {
        Write-Host $Message -ForegroundColor $Color
    }
}

# Get project root
if ($PSScriptRoot) {
    $ProjectRoot = Split-Path -Parent $PSScriptRoot
} else {
    $ProjectRoot = (Get-Location).Path
}

# Verify we're in a git repo
$GitDir = Join-Path $ProjectRoot ".git"
if (-not (Test-Path $GitDir)) {
    Write-Status "ERROR: Not in a git repository" "Red"
    Write-Status "Run this script from the project root" "Red"
    exit 1
}

# Check for bash
$BashPath = (Get-Command bash -ErrorAction SilentlyContinue).Source
if (-not $BashPath) {
    Write-Status "ERROR: bash is not installed" "Red"
    Write-Status "This script requires bash (Git Bash, WSL, or similar)" "Red"
    Write-Status "Install Git for Windows or enable WSL" "Red"
    exit 1
}

# Run bash installer
$BashInstallerPath = Join-Path $ProjectRoot "scripts\install-hooks.sh"
if (-not (Test-Path $BashInstallerPath)) {
    Write-Status "ERROR: Bash installer not found" "Red"
    Write-Status "Expected: $BashInstallerPath" "Red"
    exit 1
}

Write-Status "Delegating to bash installer..." "Cyan"
Write-Status ""

# Run bash script (it handles all the setup)
& bash $BashInstallerPath
exit $LASTEXITCODE
