# Git Hook Installer

**Purpose:** Automated installation of pre-push hooks for branch strategy validation.

**Status:** Implemented (2026-08-03)

## Quick Start

### Bash (Mac/Linux)
```bash
./scripts/install-hooks.sh
```

### PowerShell (Windows)
```powershell
.\scripts\install-hooks.ps1
```

Both scripts install the same hooks. Choose based on your platform.

## What It Does

The installer:
1. ✅ Verifies you're in a git repository
2. ✅ Creates `.git/hooks/` directory (if needed)
3. ✅ Copies `pre-push` hook
4. ✅ Copies `pre-push-validate.cjs` validator
5. ✅ Makes hooks executable (Unix)
6. ✅ Verifies installation succeeded

## Installation Verification

After running the installer, verify it worked:

```bash
# Check that hook is executable (Unix)
ls -la .git/hooks/pre-push

# Test the hook
git push origin <feature-branch>:dev
```

Expected output when pushing a feature branch to dev:
```
✅ ALLOWED: feat/x → dev
```

Expected output when pushing a feature branch to qa:
```
❌ BLOCKED: BLOCK: features cannot skip to qa, must merge to dev first
   Source: feat/x
   Target: qa
   Reason: BLOCK: features cannot skip to qa, must merge to dev first

✅ What to do instead:
   1. Push to dev first:
      git push origin feat/x:dev
   ...
```

## Bash Version Details

**File:** `scripts/install-hooks.sh`

```bash
./scripts/install-hooks.sh
```

**Features:**
- Auto-detects project root
- Creates hooks directory if needed
- Falls back to inline hook creation if source doesn't exist
- Makes hooks executable with chmod +x
- Provides colored feedback (if terminal supports it)
- Lists verification steps

**Exit codes:**
- 0 = success
- 1 = error (not in git repo, installation failed)

## PowerShell Version Details

**File:** `scripts/install-hooks.ps1`

```powershell
.\scripts\install-hooks.ps1
.\scripts\install-hooks.ps1 -Quiet  # Suppress output
```

**Features:**
- Auto-detects project root
- Creates hooks directory if needed
- Falls back to inline hook creation if source doesn't exist
- Provides colored feedback (if terminal supports it)
- Optional `-Quiet` flag for CI/CD
- Lists verification steps

**Exit codes:**
- 0 = success
- 1 = error (not in git repo, installation failed)

## Hook Source Files

Hooks can be stored in two places:

**Option 1: .keel/hooks/ (Recommended for repo)**
```
.keel/hooks/
  ├── pre-push
  └── pre-push-validate.cjs
```

**Option 2: .git/hooks/ (Local, not committed)**
```
.git/hooks/
  ├── pre-push
  └── pre-push-validate.cjs
```

The installer checks for hooks in `.keel/hooks/` first. If not found, it creates inline versions in `.git/hooks/`.

## Troubleshooting

### "Not in a git repository"
**Problem:** Running script from wrong directory  
**Solution:** Run from project root: `cd /path/to/keel && ./scripts/install-hooks.sh`

### Hook not executing
**Problem:** Pre-push hook exists but isn't running  
**Solution:** Check permissions:
```bash
# Make it executable
chmod +x .git/hooks/pre-push

# Verify
ls -la .git/hooks/pre-push
# Should show: -rwxr-xr-x (or similar)
```

### "Cannot find validator"
**Problem:** pre-push-validate.cjs missing or invalid path  
**Solution:** Reinstall:
```bash
./scripts/install-hooks.sh   # or .\scripts\install-hooks.ps1 on Windows
```

### Hook always allows pushes
**Problem:** Hook exists but isn't validating  
**Possible causes:**
- Validator script can't read `.keel/config/branch-strategy.yml`
- Node.js not installed
- js-yaml module not available

**Solution:** Verify config and dependencies:
```bash
# Check config exists
cat .keel/config/branch-strategy.yml

# Check Node.js
node --version

# Check js-yaml
npm ls js-yaml
```

### Hooks break after git upgrade
**Problem:** Git update overwrites or disables hooks  
**Solution:** Reinstall after git upgrade:
```bash
./scripts/install-hooks.sh
```

## Automation

For CI/CD and container onboarding:

**In Docker/Container:**
```dockerfile
RUN cd /app && ./scripts/install-hooks.sh
```

**In CI Pipeline:**
```bash
./scripts/install-hooks.sh
```

**In npm/yarn postinstall:**
```json
{
  "scripts": {
    "postinstall": "bash ./scripts/install-hooks.sh"
  }
}
```

**In GitHub Workflow:**
```yaml
- name: Install git hooks
  run: ./scripts/install-hooks.sh
```

## Related

- `.keel/config/branch-strategy.yml` — Promotion pipeline rules
- `.keel/HOOK-SETUP.md` — Manual hook installation
- `.git/hooks/pre-push` — Pre-push hook (local)
- `.git/hooks/pre-push-validate.cjs` — Validator (local)
- `scripts/validate-pr-target.cjs` — PR validator (committed)
