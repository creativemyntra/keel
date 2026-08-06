#!/usr/bin/env node
/**
 * Keel Version Setter - Atomically update ALL version references
 *
 * Usage: node scripts/keel-version-set.cjs 3.19.0
 *
 * This ensures all 11 version files are updated consistently, preventing
 * the "self-consistent at wrong value" bug where one file gets missed.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

const newVersion = process.argv[2];

// Validate version format
if (!newVersion || !/^\d+\.\d+\.\d+/.test(newVersion)) {
  console.error(`${RED}❌ Invalid version format${RESET}`);
  console.error('   Usage: node scripts/keel-version-set.cjs 3.19.0');
  process.exit(1);
}

console.log(`${YELLOW}🔧 Keel Version Setter${RESET}`);
console.log(`   Setting all files to: ${GREEN}${newVersion}${RESET}\n`);

// All files to update
const FILES_TO_UPDATE = [
  {
    path: 'package.json',
    transform: (content) => content.replace(
      /"version"\s*:\s*"[^"]+"/,
      `"version": "${newVersion}"`
    ),
    description: 'package.json'
  },
  {
    path: '.claude-plugin/plugin.json',
    transform: (content) => content.replace(
      /"version"\s*:\s*"[^"]+"/,
      `"version": "${newVersion}"`
    ),
    description: '.claude-plugin/plugin.json'
  },
  {
    path: '.claude-plugin/marketplace.json',
    transform: (content) => {
      // marketplace.json has nested structure
      const lines = content.split('\n');
      return lines.map(line => {
        if (line.includes('"version"')) {
          return line.replace(
            /"version"\s*:\s*"[^"]+"/,
            `"version": "${newVersion}"`
          );
        }
        return line;
      }).join('\n');
    },
    description: '.claude-plugin/marketplace.json'
  },
  {
    path: 'package-lock.json',
    transform: (content) => {
      const lines = content.split('\n');
      return lines.map((line, idx) => {
        if (line.includes('"version"') && (lines[idx - 1]?.includes('"keel"') || lines[idx - 1]?.includes('root'))) {
          return line.replace(
            /"version"\s*:\s*"[^"]+"/,
            `"version": "${newVersion}"`
          );
        }
        return line;
      }).join('\n');
    },
    description: 'package-lock.json'
  },
  {
    path: 'README.md',
    transform: (content) => content.replace(
      /v\d+\.\d+\.\d+/g,
      `v${newVersion}`
    ),
    description: 'README.md'
  },
  {
    path: 'INSTALL.md',
    transform: (content) => content.replace(
      /v\d+\.\d+\.\d+/g,
      `v${newVersion}`
    ),
    description: 'INSTALL.md'
  },
  {
    path: 'TECHNICAL-SPECIFICATIONS.md',
    transform: (content) => content.replace(
      /v\d+\.\d+\.\d+/g,
      `v${newVersion}`
    ),
    description: 'TECHNICAL-SPECIFICATIONS.md'
  },
  {
    path: 'QUICK-START-CLAUDE-CODE.md',
    transform: (content) => content.replace(
      /v\d+\.\d+\.\d+/g,
      `v${newVersion}`
    ),
    description: 'QUICK-START-CLAUDE-CODE.md'
  },
  {
    path: 'CHANGELOG.md',
    transform: (content) => {
      // Update first version entry (assumes latest is first)
      return content.replace(
        /^## \[\d+\.\d+\.\d+\]/m,
        `## [${newVersion}]`
      );
    },
    description: 'CHANGELOG.md (latest entry)'
  },
  {
    path: 'bin/keel.js',
    transform: (content) => {
      return content
        .replace(
          /const VERSION\s*=\s*['"][^'"]+['"]/,
          `const VERSION   = '${newVersion}'`
        )
        .replace(
          /v\d+\.\d+\.\d+ -- /,
          `v${newVersion} -- `
        );
    },
    description: 'bin/keel.js'
  },
  {
    path: 'action.yml',
    transform: (content) => content.replace(
      /Release:\s*v\d+\.\d+\.\d+/,
      `Release: v${newVersion}`
    ),
    description: 'action.yml'
  },
];

let updated = 0;
let failed = 0;

console.log(`${YELLOW}Updating files...${RESET}`);
console.log('─'.repeat(60));

for (const file of FILES_TO_UPDATE) {
  const filePath = path.join(process.cwd(), file.path);

  if (!fs.existsSync(filePath)) {
    console.log(`${YELLOW}⚠️  MISSING${RESET}: ${file.description}`);
    continue;
  }

  try {
    const originalContent = fs.readFileSync(filePath, 'utf-8');
    const newContent = file.transform(originalContent);

    if (originalContent === newContent) {
      console.log(`${YELLOW}ℹ️  UNCHANGED${RESET}: ${file.description}`);
      continue;
    }

    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`${GREEN}✓${RESET} Updated: ${file.description}`);
    updated++;
  } catch (e) {
    console.log(`${RED}✗${RESET} Failed to update: ${file.description}`);
    console.log(`   Error: ${e.message}`);
    failed++;
  }
}

console.log('─'.repeat(60));
console.log(`\n${YELLOW}Summary${RESET}`);
console.log(`   Updated: ${GREEN}${updated}${RESET} files`);
if (failed > 0) {
  console.log(`   Failed: ${RED}${failed}${RESET} files`);
}

if (failed > 0) {
  console.log(`\n${RED}❌ Some files failed to update${RESET}`);
  process.exit(1);
}

console.log(`\n${GREEN}✅ All version files updated to ${newVersion}${RESET}\n`);
console.log(`${YELLOW}Next steps:${RESET}`);
console.log('  1. Review changes: git diff');
console.log('  2. Run audit: node scripts/version-audit-comprehensive.cjs');
console.log('  3. Commit: git add . && git commit -m "chore: version bump → ' + newVersion + '"');
console.log('  4. Push: git push origin <branch>\n');

process.exit(0);
