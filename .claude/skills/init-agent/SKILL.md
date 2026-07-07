# init-agent SKILL

---
governed-by: ai-sdlc-governance
skill_version: 0.1.0
phase: 1
mode: new-project-only
---

## Overview

**init-agent** scaffolds a new Keel AI-SDLC project from bare repository. Runs in **NEW-PROJECT MODE ONLY** (Phase 1). Legacy project onboarding is Phase 5.

**Command:** `/keel init --mode=new`  
**Branch:** `keel/init` (ephemeral, human-merged)  
**Governance:** Fully subject to CLAUDE.md hard rules. Never merges, never closes issues, always via PR.

## Invocation

```bash
/keel init --mode=new [--stack=cakephp]
```

**Prompt Flow:**
1. Confirm new project mode (no existing src/ or tests/ allowed)
2. Prompt for stack (default: `cakephp`; Phase 1 only supports cakephp)
3. Scaffold directory structure
4. Generate Phase 1 stub files (Phase 4 CI content is placeholder only)
5. Structural validation (dry-run)
6. Output schema + findings

## Deliverables (Phase 1 Scope)

### 1. Directory Structure Scaffold

Create (if not exists):

```
project-root/
├── .claude/
│   ├── CLAUDE.md                          [copied from template]
│   ├── agent-output-schema.json           [copied from template]
│   └── skills/
│       ├── init-agent/                    [this agent]
│       │   ├── SKILL.md
│       │   └── state_ref                  [agent state tracking, phase 2+]
│       ├── req-agent/                     [stub, phase 2]
│       ├── design-agent/                  [stub, phase 3]
│       ├── dev-agent/                     [stub, phase 4]
│       ├── test-agent/                    [stub, phase 4]
│       ├── sec-agent/                     [stub, phase 4]
│       ├── deploy-agent/                  [stub, phase 5]
│       ├── maint-agent/                   [stub, phase 5]
│       └── audit-agent/                   [stub, phase 5]
├── stack-profiles/
│   └── cakephp.md                         [copied from template]
└── state/
    └── .gitkeep                           [reserved for audit-agent, phase 6]
```

### 2. Stub Files (Phase 4 CI Content)

Create empty/placeholder files for Phase 4+ integration:

**`.github/workflows/ci-php.yml`** — comment header only:
```yaml
# Phase 4: CI/CD Pipeline Configuration
# Content scaffold: lint, test, coverage, SAST gates
# Do not commit secrets; use GitHub Actions secrets for API keys
```

**`.env.example`** — template structure:
```
# CakePHP 4 Environment Template (Phase 1 Scaffold)
# Copy to .env and populate with non-secret values
DEBUG=false
CAKEPHP_SECURITY_SALT=change-me-in-production
```

**`composer.json`** — basic dependencies (Phase 1 reference only, may be overridden in Phase 2):
```json
{
  "name": "keel-project/new-app",
  "description": "Keel AI-SDLC scaffolded CakePHP 4.4 project",
  "require": {
    "php": ">=8.1",
    "cakephp/cakephp": "^4.4"
  },
  "require-dev": {
    "phpunit/phpunit": "^9.5",
    "phpstan/phpstan": "^1.10",
    "squizlabs/php_codesniffer": "^3.7"
  }
}
```

**`phpstan.neon`** — static analysis baseline:
```yaml
parameters:
  level: 5
  paths:
    - src/
  reportUnmatchedIgnoredErrors: false
```

**`phpunit.xml`** — test runner configuration:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit>
  <testsuites>
    <testsuite name="Unit">
      <directory>tests/TestCase</directory>
    </testsuite>
  </testsuites>
  <coverage>
    <include>
      <directory suffix=".php">src/</directory>
    </include>
    <report>
      <clover outputFile="build/clover.xml"/>
    </report>
  </coverage>
</phpunit>
```

### 3. Structural Validation (Dry-Run)

Before outputting schema, **dry-run validation** confirms:
- [ ] All scaffold directories present
- [ ] All stub files parse valid (YAML, JSON, XML syntax)
- [ ] No .git conflicts (working tree clean post-scaffold)
- [ ] Governance files readable (CLAUDE.md, agent-output-schema.json)

**Dry-Run Output Example:**
```
✓ Structural validation passed
  - 9 directories created
  - 7 configuration files valid (syntax checked)
  - CLAUDE.md: 340 tokens (under 400 limit)
  - agent-output-schema.json: valid JSON schema (draft-07)
  - stack-profiles/cakephp.md: 210 lines, valid markdown
  - All files committable (no secrets detected)
```

If validation fails, output HIGH-severity finding + block lane2_ready.

## Output Contract

Agent outputs `agent-output-schema.json` with:

**status:** `success` (all scaffold deliverables present) | `partial` (some files missing, manual remediation needed) | `blocked` (validation failed)

**confidence:** Derived per schema rules:
- `high` = status=success, 0 HIGH findings, fallback_triggered=false
- `medium` = status=success, only LOW/INFO findings
- `low` = status=partial, any HIGH finding, or 2+ validation retries

**findings:** Ordered by severity. Examples:
- HIGH: missing critical scaffold directory
- MEDIUM: stub file syntax invalid (user must fix before Phase 2)
- LOW: documentation template incomplete (can proceed, address in Phase 2)
- INFO: stack choice logged (CakePHP 4.4 selected)

**artifacts_written:** List all scaffold files created (directories + files)

**lane2_ready:** True only if status=success AND 0 HIGH findings AND dry-run validation passed

**blocking_issues:** Empty for Phase 1 scaffold (no upstream blockers)

## Error Handling

| Scenario | Action | Severity |
|----------|--------|----------|
| Project not empty (src/ or tests/ exist) | Reject scaffold, output HIGH finding, block lane2_ready | HIGH |
| Stack not recognized | Reject, prompt retry | HIGH |
| Stub file syntax invalid | Output MEDIUM finding, log file path, allow partial status | MEDIUM |
| Dry-run validation fails | Output HIGH finding, set status=blocked | HIGH |
| Git working tree dirty | Require clean state before scaffold (governance rule: no destructive ops) | MEDIUM |

## Phase 1 Scope Boundaries

**Include:**
- Directory structure scaffold
- Governance files (CLAUDE.md, schema)
- Stack profile reference (cakephp.md)
- Configuration stub files (comments, no live secrets)
- Dry-run validation

**Exclude (Phase 2+):**
- Actual CakePHP project generation (bin/cake bake)
- Requirement elicitation (req-agent in Phase 2)
- Architecture design (design-agent in Phase 3)
- Development scaffold (dev-agent in Phase 4)
- Test generation (test-agent in Phase 4)
- CI/CD workflow content (deploy-agent in Phase 5)

## Next Steps

After init-agent completes with lane2_ready=true:

1. **Human Review:** PR review of scaffold
2. **Merge to main** (human approval)
3. **Phase 2 Entry:** req-agent takes over with scaffolded project as baseline

---

**Last Updated:** Phase 1 Init | **Next Agent:** Phase 2 (req-agent)
