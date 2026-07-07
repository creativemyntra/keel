# Plugin Registry & Marketplace Discovery Skill

**Discover, install, and manage plugins and extensions for Keel AI-SDLC Framework**

---

## Overview

Keel Plugin Registry enables a full plugin ecosystem where users can:
- Discover plugins from multiple sources
- Add complementary tools to their workflow
- Manage plugin dependencies and compatibility
- Share and distribute custom tools

---

## Quick Start

### Add a Plugin from GitHub

**Shorthand (owner/repo):**
```bash
/plugin marketplace add creativemyntra/ai-sdlc-governance
```

**Full Git URL (.git required):**
```bash
/plugin marketplace add https://github.com/creativemyntra/ai-sdlc-governance.git
```

**With version:**
```bash
/plugin marketplace add creativemyntra/ai-sdlc-governance@v1.2.0
/plugin marketplace add creativemyntra/ai-sdlc-governance@latest
```

---

## Commands

### Discover Plugins

```bash
# Search plugin registry
/plugin marketplace search "governance"
# → Lists matching plugins

/plugin marketplace search "testing"
# → Lists testing-related plugins

/plugin marketplace search "ai-sdlc"
# → Lists AI-SDLC ecosystem plugins
```

**Output:**
```
📦 Plugin Search Results for "governance"

1. creativemyntra/ai-sdlc-governance (⭐ 45)
   Description: Enterprise governance rules for AI-SDLC
   Tags: governance, policy, compliance, enterprise
   Latest: v1.2.0
   Install: /plugin marketplace add creativemyntra/ai-sdlc-governance

2. acme-corp/compliance-checker (⭐ 23)
   Description: Compliance validation for Keel workflows
   Tags: compliance, policy, security, audit
   Latest: v2.1.0
   Install: /plugin marketplace add acme-corp/compliance-checker

3. example-org/policy-enforcer (⭐ 12)
   Description: Policy enforcement for development workflows
   Tags: policy, governance, devops
   Latest: v1.0.5
   Install: /plugin marketplace add example-org/policy-enforcer
```

### Browse Categories

```bash
# List plugin categories
/plugin marketplace categories

# Browse by category
/plugin marketplace browse governance
/plugin marketplace browse testing
/plugin marketplace browse security
/plugin marketplace browse deployment
```

**Available Categories:**
- governance (policy, compliance, enterprise rules)
- testing (test frameworks, QA tools)
- security (scanning, SAST, DAST)
- deployment (rollout, infrastructure)
- monitoring (observability, alerts)
- integration (external services, APIs)
- documentation (docs generation, wikis)
- custom (user-created plugins)

### View Plugin Details

```bash
# Get plugin info
/plugin marketplace info creativemyntra/ai-sdlc-governance

# View all versions
/plugin marketplace versions creativemyntra/ai-sdlc-governance
```

**Output:**
```
📦 creativemyntra/ai-sdlc-governance

Description: Enterprise governance rules for AI-SDLC
Author: Creative Myntra
License: MIT
Repository: https://github.com/creativemyntra/ai-sdlc-governance
Documentation: https://github.com/creativemyntra/ai-sdlc-governance/blob/main/README.md
Stars: 45
Weekly Downloads: 127

Latest Version: v1.2.0 (Released: 2026-07-05)
  - Added policy-as-code validation
  - Support for custom compliance rules
  - Enterprise SSO integration

Dependencies:
  - Keel ≥ v2.0.0
  - Node.js ≥ 16.0.0

Tags: governance, policy, compliance, enterprise
Install: /plugin marketplace add creativemyntra/ai-sdlc-governance
```

### Add a Plugin

**From GitHub (shorthand):**
```bash
/plugin marketplace add creativemyntra/ai-sdlc-governance
# → Installs latest version from GitHub

/plugin marketplace add creativemyntra/ai-sdlc-governance@v1.2.0
# → Installs specific version

/plugin marketplace add creativemyntra/ai-sdlc-governance@main
# → Installs from branch
```

**From Git URL:**
```bash
/plugin marketplace add https://github.com/creativemyntra/ai-sdlc-governance.git
# → Installs from URL

/plugin marketplace add https://github.com/creativemyntra/ai-sdlc-governance.git@v1.2.0
# → Installs specific version
```

**From Local Directory:**
```bash
/plugin marketplace add /path/to/local/plugin
# → Installs from local directory (development)
```

**Output:**
```
📥 Installing plugin: creativemyntra/ai-sdlc-governance...

✅ Validating plugin structure
✅ Checking dependencies
  - Keel v2.1.0 ✅ (requires ≥2.0.0)
  - Node.js v18.0.0 ✅ (requires ≥16.0.0)
✅ Downloading from GitHub
✅ Installing v1.2.0
✅ Running plugin setup
✅ Verifying installation

🎉 Successfully installed creativemyntra/ai-sdlc-governance@v1.2.0

📝 Next steps:
  1. Review plugin configuration: .keel/plugins/ai-sdlc-governance/config.yml
  2. Enable in your project: /plugin governance init
  3. Read docs: https://github.com/creativemyntra/ai-sdlc-governance/blob/main/README.md
```

### List Installed Plugins

```bash
# List all installed plugins
/plugin marketplace list

# List with details
/plugin marketplace list --verbose

# List by category
/plugin marketplace list --filter=governance
```

**Output:**
```
📦 Installed Plugins (4)

1. ✅ creativemyntra/ai-sdlc-governance v1.2.0
   Enabled: Yes
   Last updated: 2 days ago
   Command: /plugin governance [command]
   
2. ✅ acme-corp/compliance-checker v2.1.0
   Enabled: Yes
   Last updated: 5 days ago
   Command: /plugin compliance [command]

3. ⚠️  example-org/policy-enforcer v1.0.5
   Enabled: No (disabled)
   Last updated: 3 weeks ago
   Command: /plugin policy [command]
   
4. ✅ myteam/custom-validators v0.1.0
   Enabled: Yes
   Last updated: just now
   Command: /plugin validate [command]

💡 Manage plugins:
  - Enable:  /plugin marketplace enable example-org/policy-enforcer
  - Disable: /plugin marketplace disable example-org/policy-enforcer
  - Update:  /plugin marketplace update example-org/policy-enforcer
  - Remove:  /plugin marketplace remove example-org/policy-enforcer
```

### Update Plugins

```bash
# Update all plugins
/plugin marketplace update --all

# Update specific plugin
/plugin marketplace update creativemyntra/ai-sdlc-governance

# Update to specific version
/plugin marketplace update creativemyntra/ai-sdlc-governance@v1.3.0
```

**Output:**
```
🔄 Updating plugins...

creativemyntra/ai-sdlc-governance
  Current: v1.2.0
  Latest:  v1.3.0
  Changes:
    - Fixed policy validation bug
    - Added support for custom rules
    - Improved performance by 20%
  
  ✅ Update v1.2.0 → v1.3.0? (y/n): y
  ✅ Updated successfully
  
✅ All plugins up to date
```

### Enable/Disable Plugins

```bash
# Disable a plugin
/plugin marketplace disable example-org/policy-enforcer
# → Plugin installed but not active

# Enable a plugin
/plugin marketplace enable example-org/policy-enforcer
# → Plugin becomes active
```

### Remove Plugins

```bash
# Uninstall a plugin
/plugin marketplace remove example-org/policy-enforcer

# Force remove (skip confirmation)
/plugin marketplace remove example-org/policy-enforcer --force
```

### Check Plugin Compatibility

```bash
# Check if plugin is compatible
/plugin marketplace check creativemyntra/ai-sdlc-governance

# Output:
# ✅ Compatible with your Keel installation
#    - Keel v2.1.0 (requires ≥2.0.0) ✅
#    - Node.js v18.0.0 (requires ≥16.0.0) ✅
#    - All dependencies satisfied ✅
```

### View Plugin Changelog

```bash
# View plugin release history
/plugin marketplace changelog creativemyntra/ai-sdlc-governance

# Show last 5 versions
/plugin marketplace changelog creativemyntra/ai-sdlc-governance --limit=5
```

---

## Create Your Own Plugin

### Plugin Structure

```
my-plugin/
├── README.md
├── plugin.json
├── package.json
├── index.js (or your main file)
├── .keel/
│   ├── skills/
│   │   └── my-skill/SKILL.md
│   └── config.yml
└── tests/
    └── plugin.test.js
```

### Plugin Metadata (`plugin.json`)

```json
{
  "name": "creativemyntra/ai-sdlc-governance",
  "displayName": "AI-SDLC Governance",
  "version": "1.2.0",
  "description": "Enterprise governance rules for AI-SDLC",
  "author": "Creative Myntra",
  "license": "MIT",
  "repository": "https://github.com/creativemyntra/ai-sdlc-governance",
  "keywords": ["governance", "policy", "compliance", "enterprise"],
  "category": "governance",
  "homepage": "https://github.com/creativemyntra/ai-sdlc-governance",
  "bugs": "https://github.com/creativemyntra/ai-sdlc-governance/issues",
  
  "keel": {
    "minVersion": "2.0.0",
    "maxVersion": "*",
    "command": "governance",
    "description": "Enterprise governance enforcement"
  },
  
  "dependencies": {
    "node": ">=16.0.0"
  },
  
  "optionalDependencies": {
    "redis": ">=6.0.0"
  },
  
  "engines": {
    "node": ">=16.0.0"
  }
}
```

### Publish Your Plugin

```bash
# Step 1: Create GitHub repository
# Step 2: Create plugin.json
# Step 3: Commit and tag release
git tag -a v1.2.0 -m "Version 1.2.0"
git push origin v1.2.0

# Step 4: Plugin is automatically discoverable!
# Users can now install:
# /plugin marketplace add creativemyntra/ai-sdlc-governance
```

**That's it!** No submission form needed. GitHub releases are auto-discovered.

---

## Plugin Ecosystem Examples

### Example 1: Add Governance Plugin

```bash
# Add governance rules
/plugin marketplace add creativemyntra/ai-sdlc-governance

# Initialize governance in your project
/plugin governance init

# Enforce policies
/plugin governance enforce --strict

# Check compliance
/plugin governance audit
```

### Example 2: Add Compliance Checker

```bash
# Add compliance validation
/plugin marketplace add acme-corp/compliance-checker

# Check compliance
/plugin compliance check --framework=pci

# Generate report
/plugin compliance report --format=html
```

### Example 3: Chain Multiple Plugins

```bash
# Install governance
/plugin marketplace add creativemyntra/ai-sdlc-governance

# Install compliance
/plugin marketplace add acme-corp/compliance-checker

# Install testing framework
/plugin marketplace add myteam/advanced-testing

# Use together in workflow
/keel req --story=KEEL-1
/plugin governance enforce
/keel design --story=KEEL-1
/plugin compliance check
/keel tdd-red --story=KEEL-1
/plugin testing validate
/keel deploy --story=KEEL-1
/plugin governance audit
```

---

## Plugin Marketplace Registry

### Public Registry (Auto-Discovered)

Plugins are auto-discovered from:
- 🟢 GitHub: Any repo with valid `plugin.json` in releases
- 📦 npm: Any package with `keel-plugin` keyword
- 🐳 Docker Hub: Any image tagged `keel-plugin`

### Search & Discovery

```bash
# Search GitHub
/plugin marketplace search "governance" --source=github

# Search npm
/plugin marketplace search "governance" --source=npm

# Search Docker
/plugin marketplace search "governance" --source=docker

# Search all sources
/plugin marketplace search "governance" --source=all
```

### Curated Registry (Community)

Popular plugins listed at:
```
https://github.com/amarsingh/keel/wiki/Plugin-Registry
```

**To get your plugin featured:**
1. Create plugin with proper `plugin.json`
2. Release on GitHub with tag
3. Add to registry via PR or issue

---

## Plugin Configuration

### Global Plugin Settings

**Location:** `.keel/plugins/config.yml`

```yaml
# Plugin Registry Settings
registry:
  enabled: true
  sources:
    - github
    - npm
    - docker
  auto_discover: true
  update_check: weekly

# Plugin Management
plugins:
  auto_load: true
  auto_enable_new: false
  check_compatibility: true

# Security
security:
  verify_signatures: false  # Enable in future
  allow_local_plugins: true
  sandbox_mode: false
```

### Individual Plugin Config

**Location:** `.keel/plugins/[plugin-name]/config.yml`

```yaml
enabled: true
auto_start: true
log_level: info

# Plugin-specific settings
governance:
  strict_mode: true
  policies:
    - pci
    - sox
    - gdpr
  custom_rules: custom-rules.yml
```

---

## Compatibility Management

### Version Constraints

```bash
# Install specific version
/plugin marketplace add creativemyntra/ai-sdlc-governance@v1.2.0

# Install from branch
/plugin marketplace add creativemyntra/ai-sdlc-governance@develop

# Install with semver
/plugin marketplace add creativemyntra/ai-sdlc-governance@"^1.2.0"  # ≥1.2.0 <2.0.0
/plugin marketplace add creativemyntra/ai-sdlc-governance@"~1.2.0"  # ≥1.2.0 <1.3.0
```

### Dependency Resolution

Plugin manager automatically:
- ✅ Checks Keel version compatibility
- ✅ Verifies Node.js version
- ✅ Resolves plugin dependencies
- ✅ Detects conflicts
- ✅ Prevents incompatible installs

**Example:**
```bash
/plugin marketplace add some-plugin@v2.0.0

❌ Compatibility check failed:
   - Plugin requires Keel ≥3.0.0
   - You have Keel v2.1.0
   - Update Keel first: /keel upgrade
```

---

## Security & Trust

### Plugin Verification

```bash
# Check plugin source
/plugin marketplace verify creativemyntra/ai-sdlc-governance

# Output:
# ✅ Repository verified (GitHub)
# ✅ Author verified (creativemyntra)
# ✅ License verified (MIT)
# ✅ Release signed (future feature)
```

### Sandboxing (Future)

```bash
# Install in sandbox mode (test before use)
/plugin marketplace add example/plugin --sandbox

# Run sandboxed plugin
/plugin example command --sandbox

# If safe, promote to trusted
/plugin marketplace trust example/plugin
```

---

## Best Practices

### For Plugin Users

✅ Check plugin stars and usage  
✅ Review GitHub repository  
✅ Read README and documentation  
✅ Test in development first  
✅ Monitor plugin logs  
✅ Update regularly  

### For Plugin Developers

✅ Include comprehensive README  
✅ Create proper `plugin.json`  
✅ Test compatibility with multiple Keel versions  
✅ Use semantic versioning  
✅ Publish releases on GitHub  
✅ Document configuration  
✅ Handle errors gracefully  
✅ Provide clear examples  

---

## Troubleshooting

### Plugin Not Found

```bash
/plugin marketplace add unknown/plugin

❌ Plugin not found in any registry
   Searched in: GitHub, npm, Docker Hub
   
Try:
  - /plugin marketplace search [name]
  - Check spelling and capitalization
  - Use full GitHub URL: https://github.com/owner/repo.git
```

### Compatibility Issues

```bash
/plugin marketplace add plugin-v2

⚠️  Compatibility warning:
   - Plugin requires Node.js ≥18.0.0
   - You have Node.js v16.0.0
   
Options:
  1. Upgrade Node.js: brew upgrade node
  2. Install compatible version: /plugin marketplace add plugin@v1.0.0
  3. Force install: /plugin marketplace add plugin --force
```

### Plugin Not Working

```bash
# Check plugin status
/plugin marketplace info my-plugin

# View plugin logs
/plugin marketplace logs my-plugin

# Debug mode
/plugin marketplace enable my-plugin --debug

# Reset plugin
/plugin marketplace reset my-plugin
```

---

## Commands Summary

| Command | Purpose |
|---------|---------|
| `/plugin marketplace search [term]` | Search for plugins |
| `/plugin marketplace add [owner/repo]` | Install plugin |
| `/plugin marketplace list` | List installed |
| `/plugin marketplace info [plugin]` | Get details |
| `/plugin marketplace update [plugin]` | Update plugin |
| `/plugin marketplace remove [plugin]` | Uninstall |
| `/plugin marketplace enable [plugin]` | Enable plugin |
| `/plugin marketplace disable [plugin]` | Disable plugin |
| `/plugin marketplace check [plugin]` | Check compatibility |
| `/plugin marketplace verify [plugin]` | Verify source |

---

## Example Plugin Ecosystem

### Keel Core (Your Base)
```
Keel AI-SDLC Framework v2.1.0
├── 8 Autonomous Agents
├── 5 Development Phases
└── TDD Workflow
```

### Extended with Plugins
```
Keel AI-SDLC Framework v2.1.0
├── creativemyntra/ai-sdlc-governance    (policy enforcement)
├── acme-corp/compliance-checker         (PCI compliance)
├── example-org/advanced-testing         (extra test frameworks)
└── myteam/custom-validators            (custom rules)
```

---

## Status

✅ **Plugin Registry Ready** — Discover and add plugins  
✅ **Version Management** — Compatibility checking  
✅ **Auto-Discovery** — GitHub, npm, Docker  
✅ **CLI Integration** — `/plugin marketplace [commands]`  
✅ **Extensible** — Easy to create your own plugins  

---

## Next Steps

1. **Discover plugins:**
   ```bash
   /plugin marketplace search governance
   ```

2. **Add a plugin:**
   ```bash
   /plugin marketplace add creativemyntra/ai-sdlc-governance
   ```

3. **View installed:**
   ```bash
   /plugin marketplace list
   ```

4. **Create your own:**
   - Create GitHub repo with `plugin.json`
   - Release on GitHub
   - Auto-discoverable!

---

**Keel Plugin Registry — Extensible AI-SDLC Framework Ecosystem** 🎉

