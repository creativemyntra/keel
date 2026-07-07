# Plugin Add Marketplace Skill

**Install plugins from GitHub Marketplace directly into Keel**

---

## Overview

Simple command to add plugins from GitHub Marketplace to your Keel project.

```bash
/plugin add marketplace creativemyntra/ai-sdlc-governance
/plugin add marketplace https://github.com/creativemyntra/ai-sdlc-governance.git
/plugin add marketplace creativemyntra/ai-sdlc-governance@v1.2.0
```

---

## Quick Start

### Add a Plugin (GitHub Shorthand)

```bash
/plugin add marketplace creativemyntra/ai-sdlc-governance
```

**What happens:**
1. ✅ Fetches plugin.json from GitHub repo
2. ✅ Validates plugin compatibility with Keel
3. ✅ Downloads plugin from releases
4. ✅ Installs to `.keel/plugins/ai-sdlc-governance/`
5. ✅ Generates configuration file
6. ✅ Displays setup instructions

**Output:**
```
📥 Adding plugin: creativemyntra/ai-sdlc-governance

[1/5] Fetching plugin.json from GitHub...
  ✅ Found plugin.json
  ✅ Valid schema

[2/5] Validating compatibility...
  ✅ Keel v2.1.0 (requires ≥2.0.0)
  ✅ Node.js v18.0.0 (requires ≥16.0.0)
  ✅ All dependencies satisfied

[3/5] Downloading plugin...
  ✅ Downloaded v1.2.0 (latest)
  ✅ Verified checksum

[4/5] Installing plugin...
  ✅ Extracted to .keel/plugins/ai-sdlc-governance/
  ✅ Created symlink

[5/5] Generating configuration...
  ✅ Created .keel/config/ai-sdlc-governance.yml
  ✅ Created .keel/secrets/ directory

🎉 Successfully installed: creativemyntra/ai-sdlc-governance@v1.2.0

📝 Next steps:
  1. Review configuration: .keel/config/ai-sdlc-governance.yml
  2. Add credentials if needed: ~/.keel/secrets/
  3. Initialize plugin: /plugin governance init
  4. Check status: /plugin governance status

📖 Documentation: https://github.com/creativemyntra/ai-sdlc-governance
```

---

## Commands

### Add from GitHub (Shorthand)

```bash
# Latest version
/plugin add marketplace creativemyntra/ai-sdlc-governance

# Specific version
/plugin add marketplace creativemyntra/ai-sdlc-governance@v1.2.0

# From branch
/plugin add marketplace creativemyntra/ai-sdlc-governance@main

# From full git URL
/plugin add marketplace https://github.com/creativemyntra/ai-sdlc-governance.git

# With all options
/plugin add marketplace creativemyntra/ai-sdlc-governance \
  --version=v1.2.0 \
  --no-config \
  --force
```

### Installation Steps Breakdown

#### Step 1: Fetch plugin.json

```bash
/plugin add marketplace creativemyntra/ai-sdlc-governance

[1/5] Fetching plugin.json from GitHub...
```

**What it does:**
```
GET https://api.github.com/repos/creativemyntra/ai-sdlc-governance/contents/plugin.json
↓
Parses plugin.json structure
↓
Validates required fields:
  ✅ name
  ✅ version
  ✅ description
  ✅ author
  ✅ license
  ✅ keel.minVersion
  ✅ keel.command
```

#### Step 2: Validate Compatibility

```bash
[2/5] Validating compatibility...
```

**Checks:**
```
✅ Keel version compatibility
   Your Keel: v2.1.0
   Plugin requires: ≥2.0.0, <3.0.0
   Status: ✅ Compatible

✅ Node.js version
   Your Node.js: v18.0.0
   Plugin requires: ≥16.0.0
   Status: ✅ Compatible

✅ Dependencies
   [List any missing dependencies]
   Status: ✅ All satisfied

⚠️ Optional dependencies (missing, but OK)
   redis: ✗ (optional)
   postgresql: ✗ (optional)
```

#### Step 3: Download Plugin

```bash
[3/5] Downloading plugin...
```

**Process:**
```
Find latest release matching version
↓
Download plugin.tar.gz (or .zip)
  Size: 2.3 MB
  Speed: 5.2 MB/s
  Time: 0.4s
↓
Verify checksum (SHA256)
  Expected: abc123def456...
  Actual:   abc123def456...
  Status: ✅ Match
```

#### Step 4: Install Plugin

```bash
[4/5] Installing plugin...
```

**Installation steps:**
```
Extract archive
↓
Check directory structure
  ✅ plugin.json exists
  ✅ index.js exists
  ✅ README.md exists
↓
Move to .keel/plugins/[plugin-name]/
↓
Create symlink (optional)
↓
Install dependencies (npm, pip, etc)
```

#### Step 5: Generate Configuration

```bash
[5/5] Generating configuration...
```

**Created files:**
```
.keel/config/[plugin-name].yml      ← Plugin configuration template
.keel/config/[plugin-name].defaults ← Default values
.keel/plugins/[plugin-name]/        ← Plugin directory
  ├── plugin.json
  ├── index.js
  ├── README.md
  └── ...
```

---

## Real-World Examples

### Example 1: Add Governance Plugin

```bash
/plugin add marketplace creativemyntra/ai-sdlc-governance

Output:
📥 Adding plugin: creativemyntra/ai-sdlc-governance

[1/5] Fetching plugin.json... ✅
[2/5] Validating compatibility... ✅
[3/5] Downloading plugin... ✅
[4/5] Installing plugin... ✅
[5/5] Generating configuration... ✅

🎉 Successfully installed: creativemyntra/ai-sdlc-governance@v1.2.0

Next steps:
  /plugin governance init
  /plugin governance enforce --strict
```

### Example 2: Add Multiple Plugins

```bash
/plugin add marketplace creativemyntra/ai-sdlc-governance
/plugin add marketplace acme-corp/compliance-checker
/plugin add marketplace myteam/advanced-testing

Result:
✅ 3 plugins installed and configured
✅ All configurations created
✅ Ready to use
```

### Example 3: Install Specific Version

```bash
/plugin add marketplace creativemyntra/ai-sdlc-governance@v1.1.0

Output:
📥 Adding plugin: creativemyntra/ai-sdlc-governance@v1.1.0
  ⚠️  Note: Latest version is v1.2.0
     Upgrade with: /plugin update creativemyntra/ai-sdlc-governance

[1/5] Fetching plugin.json... ✅
[2/5] Validating compatibility... ✅
[3/5] Downloading plugin... ✅ (v1.1.0)
[4/5] Installing plugin... ✅
[5/5] Generating configuration... ✅

🎉 Successfully installed: creativemyntra/ai-sdlc-governance@v1.1.0
```

### Example 4: Force Install (Skip Validation)

```bash
/plugin add marketplace creativemyntra/ai-sdlc-governance --force

Output:
📥 Adding plugin: creativemyntra/ai-sdlc-governance

⚠️ Force mode enabled - skipping compatibility checks

[1/5] Fetching plugin.json... ✅
[2/5] Skipping validation (force mode)
[3/5] Downloading plugin... ✅
[4/5] Installing plugin... ✅
[5/5] Generating configuration... ✅

🎉 Successfully installed (forced)
```

---

## Configuration Files Generated

### Main Plugin Config (.keel/config/[plugin-name].yml)

Automatically generated from plugin's template:

```yaml
# Plugin: creativemyntra/ai-sdlc-governance
# Version: 1.2.0
# Auto-generated by /plugin add marketplace

enabled: true
version: 1.2.0

# Plugin-specific settings (from plugin template)
governance:
  strict_mode: false
  policies:
    - code-review
    - test-coverage
    - security-scan

# Integrations this plugin provides
integrations:
  jira:
    enabled: false
    url: ""
    email: ""
    # token stored in: ~/.keel/secrets/governance.jira.token

  slack:
    enabled: false
    # webhook stored in: ~/.keel/secrets/governance.slack.webhook
```

### Secrets Storage (.keel/secrets/)

Protected directory for API credentials:

```
~/.keel/secrets/
├── governance.jira.token      ← Jira API token
├── governance.slack.webhook   ← Slack webhook
└── compliance.pci.token       ← Compliance tool token
```

**.gitignore automatically includes:**
```
.keel/secrets/
```

---

## Verification Steps

After installation, verify plugin is working:

```bash
# Check plugin status
/plugin governance status

Output:
📦 Plugin: creativemyntra/ai-sdlc-governance
  Version: 1.2.0
  Status: ✅ Installed and enabled
  Location: .keel/plugins/ai-sdlc-governance
  Config: .keel/config/ai-sdlc-governance.yml
  
Available commands:
  /plugin governance init
  /plugin governance enforce
  /plugin governance audit
  /plugin governance status
  /plugin governance validate
```

---

## Error Handling

### Plugin Not Found

```bash
/plugin add marketplace invalid/plugin-name

❌ Plugin not found on GitHub
  Searched: https://github.com/invalid/plugin-name
  
Possible issues:
  - Repository doesn't exist
  - No plugin.json in repository
  - Repository is private (requires token)

Try:
  1. Check spelling: /plugin search plugin-name
  2. Verify on GitHub: https://github.com/invalid/plugin-name
  3. If private, set GitHub token: /plugin config github-token
```

### Incompatible Version

```bash
/plugin add marketplace future-plugin@v3.0.0

⚠️ Compatibility check failed:
  Plugin requires: Keel ≥3.0.0
  You have: Keel v2.1.0
  
Options:
  1. Upgrade Keel: /keel upgrade
  2. Install older version: /plugin add marketplace future-plugin@v2.1.0
  3. Force install: /plugin add marketplace future-plugin@v3.0.0 --force
```

### Installation Failed

```bash
/plugin add marketplace problematic/plugin

❌ Installation failed at step 4

Error: Plugin validation failed
  Missing required file: index.js
  
Troubleshooting:
  1. Check plugin repository: https://github.com/problematic/plugin
  2. Report issue: /plugin report-issue problematic/plugin
  3. Try again: /plugin add marketplace problematic/plugin --force
```

---

## Advanced Options

### Install Without Config

```bash
/plugin add marketplace creativemyntra/ai-sdlc-governance --no-config

Result:
  ✅ Plugin installed
  ⭕ Configuration NOT auto-generated
  → Create config manually: /plugin governance init
```

### Install to Custom Location

```bash
/plugin add marketplace creativemyntra/ai-sdlc-governance \
  --path=/custom/path/plugins

Result:
  ✅ Installed to /custom/path/plugins/ai-sdlc-governance
```

### Install from Local Directory

```bash
/plugin add marketplace /path/to/local/plugin

Result:
  ✅ Plugin copied from local directory
  ✅ Symlink created for development
```

### Install with Custom Branch

```bash
/plugin add marketplace creativemyntra/ai-sdlc-governance@develop

Result:
  ✅ Installed from 'develop' branch (latest develop commit)
```

---

## Workflow: Complete Example

```bash
# 1. Search for plugins
/plugin marketplace search governance
→ Lists 5 governance plugins

# 2. Get info about one
/plugin marketplace info creativemyntra/ai-sdlc-governance
→ Shows details, readme, compatibility

# 3. Add the plugin
/plugin add marketplace creativemyntra/ai-sdlc-governance

Output:
📥 Adding plugin: creativemyntra/ai-sdlc-governance

[1/5] Fetching plugin.json... ✅
[2/5] Validating compatibility... ✅
[3/5] Downloading plugin... ✅ (4.2 MB)
[4/5] Installing plugin... ✅
[5/5] Generating configuration... ✅

🎉 Successfully installed: creativemyntra/ai-sdlc-governance@v1.2.0

# 4. Initialize the plugin
/plugin governance init

Output:
✅ Governance plugin initialized
  Created: .keel/config/ai-sdlc-governance.yml
  Next: Configure in .keel/config/ai-sdlc-governance.yml

# 5. Configure if needed
nano .keel/config/ai-sdlc-governance.yml
# Add: Jira URL, email, API token

# 6. Use the plugin
/plugin governance enforce

Output:
🔍 Enforcing governance rules...
  ✅ Code review requirement: PASS
  ✅ Test coverage (85%): PASS
  ✅ Security scan: PASS
  
Result: All governance rules enforced ✅
```

---

## Marketplace Plugin Directory

Official plugins available:

```bash
# Governance
/plugin add marketplace creativemyntra/ai-sdlc-governance

# Compliance
/plugin add marketplace acme-corp/compliance-checker

# Testing
/plugin add marketplace myteam/advanced-testing

# Security
/plugin add marketplace enterprise-sec/security-scanner

# Monitoring
/plugin add marketplace observability-team/keel-monitoring
```

---

## Plugin Add Command Reference

| Command | Example | Result |
|---------|---------|--------|
| Add latest | `/plugin add marketplace owner/repo` | Installs latest version |
| Add version | `/plugin add marketplace owner/repo@v1.0.0` | Installs specific version |
| Add branch | `/plugin add marketplace owner/repo@main` | Installs from branch |
| Add URL | `/plugin add marketplace https://github.com/.../repo.git` | Installs from full URL |
| Add local | `/plugin add marketplace /path/to/plugin` | Installs from local directory |
| No config | `/plugin add marketplace owner/repo --no-config` | Skips config generation |
| Custom path | `/plugin add marketplace owner/repo --path=/custom/path` | Custom install location |
| Force | `/plugin add marketplace owner/repo --force` | Skips validation |

---

## File Structure After Add

After running `/plugin add marketplace creativemyntra/ai-sdlc-governance`:

```
project/
├── .keel/
│   ├── plugins/
│   │   └── ai-sdlc-governance/
│   │       ├── plugin.json
│   │       ├── index.js
│   │       ├── README.md
│   │       ├── LICENSE
│   │       └── ...
│   ├── config/
│   │   └── ai-sdlc-governance.yml    ← Generated
│   ├── secrets/
│   │   └── governance.tokens/         ← Created
│   └── .gitignore                    ← Updated
│
├── node_modules/
│   └── (plugin dependencies)
│
└── .gitignore
    # .keel/secrets/ already added
```

---

## Security

### Token Management

Tokens are stored separately and securely:

```
~/.keel/secrets/
├── governance.jira.token          ← File permissions: 600
├── governance.slack.webhook       ← File permissions: 600
└── compliance.pci.token           ← File permissions: 600
```

**Never in config files:**
```yaml
# ✅ CORRECT - Token in separate file
github:
  token_file: ~/.keel/secrets/governance.github.token

# ❌ WRONG - Token in config (gets committed)
github:
  token: "ghp_..." # NEVER DO THIS
```

### .gitignore Protection

Automatically updated:
```
.keel/secrets/        ← Never committed
.keel/plugins/        ← Can be committed or excluded
.keel/config/         ← Can be committed (no secrets)
```

---

## Status

✅ **Plugin Add Marketplace Command** — Ready to use  
✅ **5-Step Installation Process** — Automated and safe  
✅ **Compatibility Checking** — Validates before install  
✅ **Configuration Generation** — Auto-creates YAML configs  
✅ **Error Handling** — Clear error messages  
✅ **Security** — Tokens stored securely  
✅ **GitHub Integration** — Direct marketplace support  

---

## Usage Examples

### Simplest Case
```bash
/plugin add marketplace creativemyntra/ai-sdlc-governance
# → Installs latest, generates config, ready to use
```

### With Version
```bash
/plugin add marketplace creativemyntra/ai-sdlc-governance@v1.2.0
# → Installs specific version
```

### Full URL
```bash
/plugin add marketplace https://github.com/creativemyntra/ai-sdlc-governance.git
# → Works with full GitHub URLs too
```

### From Branch
```bash
/plugin add marketplace creativemyntra/ai-sdlc-governance@develop
# → Installs from develop branch (for testing)
```

---

## Next: Complete Setup

Users can now:

```bash
# 1. Initialize Keel
/keel init --mode=new --stack=cakephp

# 2. Add governance plugin
/plugin add marketplace creativemyntra/ai-sdlc-governance

# 3. Start developing
/keel req --story=KEEL-1
# → Automatically enforces governance rules from plugin
```

---

**Keel Plugin Add Marketplace Command**  
**Author: Amar Singh**  
**License: MIT**  
**Status: Production Ready ✅**

