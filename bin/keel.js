#!/usr/bin/env node

/**
 * Keel AI-SDLC Framework CLI
 * Complete AI-powered software development lifecycle automation
 *
 * Usage: keel [command] [options]
 */

const version = "2.1.0";
const author = "Amar Singh";

// Available commands
const commands = {
  init: {
    description: "Initialize new project with Keel",
    usage: "keel init --mode=new --stack=cakephp",
    category: "setup"
  },
  brainstorm: {
    description: "Generate ideas and concepts",
    usage: "keel brainstorm --goal='Your goal'",
    category: "ideation"
  },
  req: {
    description: "Create detailed requirements",
    usage: "keel req --story=FEAT-1 --feature='Description'",
    category: "requirements"
  },
  design: {
    description: "Design system architecture",
    usage: "keel design --story=FEAT-1",
    category: "architecture"
  },
  "tdd-red": {
    description: "Write failing tests (TDD Red phase)",
    usage: "keel tdd-red --story=FEAT-1",
    category: "development"
  },
  "tdd-green": {
    description: "Write code to pass tests (TDD Green phase)",
    usage: "keel tdd-green --story=FEAT-1",
    category: "development"
  },
  "tdd-refactor": {
    description: "Refactor code (TDD Refactor phase)",
    usage: "keel tdd-refactor --story=FEAT-1",
    category: "development"
  },
  test: {
    description: "Run comprehensive tests",
    usage: "keel test --story=FEAT-1 --coverage-target=85",
    category: "testing"
  },
  sec: {
    description: "Security scanning and compliance",
    usage: "keel sec --story=FEAT-1",
    category: "security"
  },
  deploy: {
    description: "Deploy to production",
    usage: "keel deploy --story=FEAT-1 --rollout=canary",
    category: "deployment"
  }
};

function showVersion() {
  console.log(`Keel AI-SDLC Framework v${version}`);
  console.log(`Author: ${author}`);
  console.log(`Repository: https://github.com/creativemyntra/keel`);
}

function showHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          Keel AI-SDLC Framework v${version}                      ║
║   Complete AI-powered Software Development Lifecycle          ║
╚════════════════════════════════════════════════════════════════╝

USAGE:
  keel [command] [options]

COMMANDS:
`);

  // Group commands by category
  const categories = {};
  Object.entries(commands).forEach(([name, cmd]) => {
    if (!categories[cmd.category]) {
      categories[cmd.category] = [];
    }
    categories[cmd.category].push({ name, ...cmd });
  });

  // Print by category
  Object.entries(categories).forEach(([category, cmds]) => {
    console.log(`  ${category.toUpperCase()}:`);
    cmds.forEach(cmd => {
      console.log(`    ${cmd.name.padEnd(15)} ${cmd.description}`);
    });
    console.log();
  });

  console.log(`OPTIONS:
  --version       Show version
  --help          Show this help message

EXAMPLES:
  keel init --mode=new --stack=cakephp
  keel req --story=FEAT-1 --feature="Your feature"
  keel design --story=FEAT-1
  keel tdd-red --story=FEAT-1
  keel tdd-green --story=FEAT-1
  keel test --story=FEAT-1 --coverage-target=85
  keel sec --story=FEAT-1
  keel deploy --story=FEAT-1 --rollout=canary

DOCUMENTATION:
  https://github.com/creativemyntra/keel
  https://github.com/creativemyntra/keel#readme

SUPPORT:
  Issues: https://github.com/creativemyntra/keel/issues
  Email: support@creativemyntra.com
`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "-h") {
  showHelp();
  process.exit(0);
}

if (command === "--version" || command === "-v") {
  showVersion();
  process.exit(0);
}

if (commands[command]) {
  console.log(`\n🚀 Running: keel ${command}`);
  console.log(`📖 Usage: ${commands[command].usage}`);
  console.log(`\n✅ Command '${command}' executed successfully!`);
  console.log("\n💡 Tip: This is the CLI entry point. In Claude Code, use slash commands instead:");
  console.log(`   /keel ${command} [options]\n`);
  process.exit(0);
}

console.error(`\n❌ Unknown command: ${command}`);
console.error(`\nRun 'keel --help' for available commands\n`);
process.exit(1);
