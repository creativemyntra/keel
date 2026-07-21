# Keel AI-SDLC Framework v3.16.1 - Maintainer Handoff

**Document Version:** 2.0  
**Last Updated:** 2026-07-21  
**Prepared By:** Amar Singh  
**For:** Future Development Team & Maintainers  
**Status:** PRODUCTION  

---

## ðŸŽ¯ Purpose

This document provides complete context for future developers taking over Keel AI-SDLC Framework maintenance and development. It captures the "why," "what," and "how" of the system so that new team members can contribute effectively.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Repository Structure](#repository-structure)
3. [Getting Started](#getting-started)
4. [Development Workflow](#development-workflow)
5. [Branching Strategy](#branching-strategy)
6. [Release Process](#release-process)
7. [Testing Requirements](#testing-requirements)
8. [Common Tasks](#common-tasks)
9. [Troubleshooting](#troubleshooting)
10. [Key Contacts & Resources](#key-contacts--resources)

---

## Project Overview

### What is Keel?

Keel AI-SDLC Framework is an enterprise-grade, AI-powered software development lifecycle automation platform that orchestrates autonomous agents across 8 development phases to deliver production-ready features in 2-4 hours instead of 2 weeks.

### Key Facts

- **Language:** JavaScript (Node.js)
- **Current Version:** 3.16.1
- **Status:** Production-ready
- **Release Date:** 2026-07-20
- **Platforms Supported:** CakePHP, Laravel, Django, Rails
- **Distribution Channels:** Claude Code, npm, Docker, GitHub Action

### Success Metrics

- âœ… Code Coverage: 95% (target: â‰¥80%)
- âœ… Vulnerabilities: 0
- âœ… Tests Passing: 5/5 (100%)
- âœ… Development Speed: 99.4% faster than traditional

---

## Repository Structure

### Directory Layout

```
keel/
â”œâ”€â”€ .claude/                      # Claude Code plugin configuration
â”‚   â”œâ”€â”€ agents/                   # 15 autonomous agent definitions
â”‚   â”‚   â”œâ”€â”€ keel-orchestrator.md
â”‚   â”‚   â”œâ”€â”€ keel-product-owner.md
â”‚   â”‚   â”œâ”€â”€ keel-business-analyst.md
â”‚   â”‚   â”œâ”€â”€ keel-solution-architect.md
â”‚   â”‚   â”œâ”€â”€ keel-software-engineer.md
â”‚   â”‚   â”œâ”€â”€ keel-qa-engineer.md
â”‚   â”‚   â”œâ”€â”€ keel-security-engineer.md
â”‚   â”‚   â”œâ”€â”€ keel-technical-writer.md
â”‚   â”‚   â”œâ”€â”€ keel-release-manager.md
â”‚   â”‚   â”œâ”€â”€ keel-scrum-master.md
â”‚   â”‚   â”œâ”€â”€ keel-audit-agent.md
â”‚   â”‚   â”œâ”€â”€ keel-state-management-agent.md
â”‚   â”‚   â””â”€â”€ keel-handshake-agent.md
â”‚   â”œâ”€â”€ settings.json             # MCP configuration
â”‚   â””â”€â”€ plugin.yml                # Claude Code manifest
â”œâ”€â”€ .claude-plugin/               # Plugin system files
â”‚   â”œâ”€â”€ marketplace.json
â”‚   â””â”€â”€ skills/                   # 6 available skills (5 dead ones removed
â”‚       â”‚                        # 2026-07-20: sprint-planning, create-prd,
â”‚       â”‚                        # analyze-story, generate-tests, generate-report
â”‚       â”‚                        # -- see remediation plan item 4)
â”‚       â”œâ”€â”€ keel/
â”‚       â”œâ”€â”€ investigate-defect/
â”‚       â”œâ”€â”€ create-mom/
â”‚       â”œâ”€â”€ e2e-test/
â”‚       â”œâ”€â”€ review-code/
â”‚       â”œâ”€â”€ release-check/
â”‚       â””â”€â”€ implement-feature/
â”œâ”€â”€ .github/                      # GitHub Actions workflows
â”‚   â””â”€â”€ workflows/
â”‚       â””â”€â”€ release.yml           # Automated release pipeline
â”œâ”€â”€ bin/                          # CLI entry point
â”‚   â””â”€â”€ keel.js                   # Main command handler
â”œâ”€â”€ docs/                         # Architecture & design docs
â”‚   â”œâ”€â”€ brainstorms/
â”‚   â”œâ”€â”€ design/
â”‚   â””â”€â”€ requirements/
â”œâ”€â”€ stack-profiles/               # Stack-specific configurations
â”‚   â””â”€â”€ cakephp.md
â”œâ”€â”€ package.json                  # npm package config
â”œâ”€â”€ plugin.json                   # Plugin manifest
â”œâ”€â”€ action.yml                    # GitHub Action manifest
â”œâ”€â”€ CHANGELOG.md                  # Version history
â”œâ”€â”€ RELEASE-NOTES-v3.0.2.md      # Release notes
â”œâ”€â”€ README.md                     # Main documentation
â”œâ”€â”€ TECHNICAL-SPECIFICATIONS.md   # System specifications
â”œâ”€â”€ docs/MAINTAINER-HANDOFF.md    # This file (was HANDOFF-DOCUMENTATION.md â€” old name collided with per-story handoff-log.md)
â””â”€â”€ .gitignore                    # Excluded files

```

### Key Files Explained

| File | Purpose | Owner |
|------|---------|-------|
| `agents/*.md` | Autonomous agent definitions | Agent Logic |
| `skills/*/SKILL.md` | Skill implementations | Skill System |
| `bin/keel.js` | CLI entry point | CLI Handler |
| `plugin.json` | Plugin metadata & distribution config | Plugin System |
| `action.yml` | GitHub Action specification | GitHub Integration |
| `package.json` | npm package configuration | Package Management |
| `CHANGELOG.md` | Version history & changes | Release Management |
| `RELEASE-NOTES-*.md` | Release-specific documentation | Release Management |

---

## Getting Started

### Prerequisites

- Node.js â‰¥16.0.0
- npm â‰¥7.0.0
- Git
- GitHub account (for contributions)

### Installation for Development

```bash
# Clone repository
git clone https://github.com/creativemyntra/keel.git
cd keel

# Install dependencies
npm install

# Verify installation
npm run test

# Start developing on develop branch
git checkout develop
```

### Setting Up Your Development Environment

```bash
# 1. Create local configuration
cp .env.example .env

# 2. Configure git
git config user.name "Your Name"
git config user.email "your.email@example.com"

# 3. Install pre-commit hooks (if applicable)
npm run setup:hooks

# 4. Verify everything works
npm run test
npm run lint
```

---

## Development Workflow

### The TDD Cycle (for Keel itself)

**Red Phase:** Write failing test
```bash
npm run test -- --watch
# Write test in tests/unit/feature.test.js
```

**Green Phase:** Write implementation
```bash
# Implement in bin/keel.js or agents/*
# Tests should pass
npm run test
```

**Refactor Phase:** Clean up code
```bash
npm run lint
npm run format
npm run test  # Ensure still passing
```

### Adding a New Skill

1. Create skill directory:
```bash
mkdir -p skills/my-skill
```

2. Create SKILL.md:
```bash
# Copy template from an existing skill
cp skills/release-check/SKILL.md \
   skills/my-skill/SKILL.md
```

3. Update plugin.json:
```json
"skills": [
  {
    "name": "keel:my-skill",
    "path": "skills/my-skill",
    "description": "Description of what skill does"
  }
]
```

4. Test:
```bash
npm run test
npm run lint
```

### Adding a New Agent

1. Create agent file:
```bash
touch agents/my-agent.md
```

2. Define agent structure (copy from existing agent)

3. Update plugin.json agents array

4. Test with Keel orchestrator

---

## Branching Strategy

### Branch Types

#### Production Branch: `master`
- **Purpose:** Production deployment
- **Contains:** Only essential files (clean, no dev artifacts)
- **Protection:** Requires PR review
- **Tags:** Version tags (v3.1.0, etc.)
- **What to Merge:** Only tested, approved code

#### Development Branch: `develop`
- **Purpose:** Main development
- **Contains:** All files including test/audit/dev docs
- **Base for:** Feature branches
- **Merging:** Squash when not critical, preserve history for releases

#### Feature Branches: `feature/FEAT-001-description`
- **From:** develop
- **Naming:** feature/JIRA-ID-short-description
- **Into:** develop (via PR)
- **Lifespan:** Until merged

#### Hotfix Branches: `hotfix/CRIT-001-description`
- **From:** master
- **When:** Production critical issue
- **Into:** Both master and develop
- **Naming:** hotfix/CRIT-ID-short-description

### Workflow Example

```bash
# Feature development
git checkout develop
git pull origin develop
git checkout -b feature/KEEL-001-new-skill

# Make changes
git add .
git commit -m "feat: Add new skill

Description of change..."

# Push and create PR
git push origin feature/KEEL-001-new-skill
# Create PR on GitHub (develop <- feature/KEEL-001)

# After review & approval, merge via GitHub UI
# Delete branch after merge
```

---

## Release Process

### Pre-Release Checklist

- [ ] All PRs merged and reviewed
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Version bumped in plugin.json
- [ ] RELEASE-NOTES-v*.md created
- [ ] All tests passing
- [ ] Code coverage â‰¥85%
- [ ] Security audit clean
- [ ] Documentation reviewed
- [ ] `hooks/hooks.json` registers `keel-classify-gate.cjs` on `UserPromptSubmit`, `PreToolUse`, `PostToolUse` (v3.16.0+)
- [ ] `config/cjis-patterns.json` patterns reviewed â€” Forseti-format placeholders still pending real format strings from Forseti

### CJIS Gate Notes (v3.16.0)

`scripts/keel-classify-gate.cjs` is the CJIS Data Classification Gate introduced in v3.16.0. It must be wired in `hooks/hooks.json` for any story touching CJIS-adjacent data â€” absence is a HIGH finding (see G-10 in `.keel/GUARDRAILS.md`).

**Forseti follow-up:** Pattern entries in `config/cjis-patterns.json` marked `[FORSETI-FORMAT-PENDING]` are placeholder strings. Until real format strings are supplied from Forseti, the gate detects only the patterns that are fully defined. New maintainers should chase this with the Forseti integration owner before relying on the gate for full CJIS coverage.

### Release Steps

#### 1. Create Release Branch
```bash
git checkout -b release/v3.1.0 origin/develop
```

#### 2. Update Version Files
```bash
# Update in: package.json, plugin.json, action.yml
# Edit: CHANGELOG.md, RELEASE-NOTES-vX.Y.Z.md
```

#### 3. Commit Release Bump
```bash
git add .
git commit -m "chore: Bump to v3.1.0 - Release"
git push origin release/v3.1.0
```

#### 4. Create PR to Master
```bash
# Create PR: master <- release/v3.1.0
# Get approval from release manager
```

#### 5. Merge to Master
```bash
# Merge PR (keep commit history)
# Delete release branch
```

#### 6. Create Git Tag
```bash
git checkout master
git pull origin master
git tag v3.1.0
git push origin v3.1.0
```

#### 7. Create GitHub Release
```bash
# Go to: https://github.com/creativemyntra/keel/releases/new
# Tag: v3.1.0
# Title: "Keel v3.1.0 - [Description]"
# Description: [Copy from RELEASE-NOTES-vX.Y.Z.md]
# Publish
```

#### 8. Publish to Distribution Channels
```bash
# npm
npm publish --access public

# Docker
docker build -t amarsingh/keel:3.1.0 .
docker push amarsingh/keel:3.1.0

# GitHub Marketplace: Auto-discovered after release
```

#### 9. Merge Back to Develop
```bash
git checkout develop
git pull origin develop
git merge master
git push origin develop
```

---

## Testing Requirements

### Unit Tests

```bash
npm run test:unit

# Test files: tests/unit/*.test.js
# Coverage target: â‰¥85%
# Frameworks: Jest
```

### Integration Tests

```bash
npm run test:integration

# Test files: tests/integration/*.test.js
# Cover: Agent communication, phase transitions
```

### E2E Tests

```bash
npm run test:e2e

# Test complete workflows
# Framework: Playwright
```

### Running All Tests

```bash
npm run test

# Runs: unit, integration, e2e
# Output: Coverage report
# Exit code: 0 if all pass
```

### Code Quality

```bash
npm run lint      # ESLint
npm run format    # Prettier
npm run quality   # SonarQube (if available)
```

---

## Common Tasks

### Adding Support for New Stack

```bash
# 1. Create stack profile
touch stack-profiles/newstack.md

# 2. Define stack-specific configurations
# - Directory structure
# - File templates
# - Build commands
# - Test commands
# - Deploy commands

# 3. Update init-agent to support new stack
# 4. Add tests for new stack
# 5. Update documentation

# 6. Test
npm run test
```

### Creating a New Phase Agent

```bash
# 1. Create agent file
touch agents/my-phase-agent.md

# 2. Define agent with:
# - Role/responsibility
# - Inputs required
# - Outputs produced
# - Quality gates
# - Example interaction

# 3. Update orchestrator to handle phase
# 4. Add phase to SDLC flow
# 5. Document in agent guide
```

### Debugging an Agent

```bash
# 1. Enable debug logging
DEBUG=keel:* npm start

# 2. Run with verbose output
npm start -- --verbose

# 3. Check agent logs
less .keel/logs/agent.log

# 4. Test agent in isolation
npm run test -- tests/agents/agent-name.test.js
```

### Running Keel on Local Project

```bash
# 1. Install locally
npm link

# 2. Initialize project
keel init --mode=new --stack=cakephp --path=/path/to/project

# 3. Run phase
keel req --story=FEAT-001 --feature="Your feature"

# 4. Check output
ls -la /path/to/project/docs/
```

---

## Troubleshooting

### Common Issues

#### Issue: "Module not found" error
**Cause:** Dependencies not installed
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

#### Issue: Tests failing locally but passing in CI
**Cause:** Environment difference
**Solution:**
```bash
# Check Node version
node --version  # Should be â‰¥16.0.0

# Clear cache
npm cache clean --force
npm install

# Run tests with CI environment
CI=true npm test
```

#### Issue: Agent not responding
**Cause:** Agent definition incomplete or syntax error
**Solution:**
```bash
# Validate agent file
npm run lint agents/agent-name.md

# Check agent log
DEBUG=keel:* npm start

# Verify agent is registered
grep "keel-agent-name" plugin.json
```

#### Issue: GitHub Action not triggering
**Cause:** Workflow syntax error
**Solution:**
```bash
# Validate workflow
npm run lint .github/workflows/*.yml

# Check Action marketplace listing
# Re-publish release if needed
```

---

## Key Contacts & Resources

### Important Links

- **Repository:** https://github.com/creativemyntra/keel
- **Issue Tracker:** https://github.com/creativemyntra/keel/issues
- **Discussions:** https://github.com/creativemyntra/keel/discussions
- **GitHub Marketplace:** https://github.com/marketplace/actions/keel-ai-sdlc
- **npm Package:** https://www.npmjs.com/package/@amarsingh/keel

### Documentation Files

| Document | Purpose |
|----------|---------|
| README.md | User guide & overview |
| QUICK-START-CLAUDE-CODE.md | Quick reference for Claude Code users |
| ALL-AGENTS-COMPLETE-GUIDE.md | Comprehensive agent documentation |
| TECHNICAL-SPECIFICATIONS.md | System architecture & specs |
| CHANGELOG.md | Version history |
| RELEASE-NOTES-v*.md | Release-specific info |

### Key Contacts

- **Original Author:** Amar Singh
- **Email:** support@creativemyntra.com
- **GitHub:** @creativemyntra
- **For Security Issues:** support@creativemyntra.com

### Development Standards

- **Code Style:** ESLint + Prettier
- **Testing:** Jest (unit), Playwright (E2E)
- **Documentation:** Markdown (md)
- **Git Convention:** Conventional Commits
- **License:** MIT

---

## Maintenance Schedule

### Daily
- Monitor GitHub issues
- Review open PRs
- Check CI/CD pipeline status

### Weekly
- Run security audit (`npm audit`)
- Review test coverage trends
- Check dependency updates

### Monthly
- Update dependencies (if needed)
- Review performance metrics
- Update documentation if needed

### Quarterly
- Full security scan
- Performance optimization review
- Architecture review

---

## Final Notes

### For New Team Members

1. **Read first:** README.md, QUICK-START-CLAUDE-CODE.md
2. **Understand:** ALL-AGENTS-COMPLETE-GUIDE.md
3. **Deep dive:** TECHNICAL-SPECIFICATIONS.md
4. **Set up:** Follow "Getting Started" section above
5. **Contribute:** Pick an issue labeled "good first issue"

### For Maintainers

1. Keep documentation updated with code changes
2. Review all PRs before merging to master
3. Maintain test coverage â‰¥85%
4. Update CHANGELOG before releases
5. Follow the release process exactly

### Success Criteria

This handoff is successful when:
- âœ… New developers can set up environment in <30 minutes
- âœ… New developers can contribute a feature in <2 hours
- âœ… All tests pass consistently
- âœ… Code quality metrics maintained
- âœ… Documentation stays current

---

**Document Version:** 2.0  
**Last Updated:** 2026-07-21  
**Prepared By:** Amar Singh  
**Status:** PRODUCTION  
**Next Review:** 2026-10-20 (quarterly)

---

## Questions or Issues?

- **For technical questions:** Check GitHub Discussions
- **For bugs:** File a GitHub Issue
- **For security:** Email support@creativemyntra.com
- **For contributions:** Read CONTRIBUTING.md (if exists)
