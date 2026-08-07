#!/usr/bin/env node
/**
 * analyze-push-audit.cjs — Analyze push audit log for compliance monitoring
 *
 * Parses .keel/PUSH_AUDIT.log to identify patterns in git push attempts,
 * focusing on --no-verify bypasses and enforcement trends.
 *
 * Usage:
 *   node scripts/analyze-push-audit.cjs [options]
 *
 * Options:
 *   --since N          Last N days (default: 30)
 *   --month YYYY-MM    Specific month (e.g., 2026-08)
 *   --branch NAME      Filter by branch
 *   --status STATUS    Filter by status (ALLOWED, BLOCKED, BYPASSED)
 *   --summary          Show summary only (no details)
 */

const fs = require('fs');
const path = require('path');

const auditLogPath = path.join(process.cwd(), '.keel', 'PUSH_AUDIT.log');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  since: 30,
  month: null,
  branch: null,
  status: null,
  summary: false
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--since' && args[i + 1]) {
    options.since = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--month' && args[i + 1]) {
    options.month = args[i + 1];
    i++;
  } else if (args[i] === '--branch' && args[i + 1]) {
    options.branch = args[i + 1];
    i++;
  } else if (args[i] === '--status' && args[i + 1]) {
    options.status = args[i + 1];
    i++;
  } else if (args[i] === '--summary') {
    options.summary = true;
  }
}

// Read audit log
if (!fs.existsSync(auditLogPath)) {
  console.error(`❌ Audit log not found: ${auditLogPath}`);
  process.exit(1);
}

const logContent = fs.readFileSync(auditLogPath, 'utf8');
const lines = logContent.trim().split('\n').filter(l => l.length > 0);

if (lines.length === 0) {
  console.log('📊 No audit log entries found.');
  process.exit(0);
}

// Parse log entries
const entries = lines.map(line => {
  const parts = line.split(' | ');
  if (parts.length < 4) return null;

  return {
    timestamp: new Date(parts[0].trim()),
    status: parts[1].trim(),
    branch: parts[2].trim(),
    message: parts[3].trim()
  };
}).filter(Boolean);

// Filter entries based on options
const now = new Date();
const filtered = entries.filter(entry => {
  // Date filter
  if (options.month) {
    const entryMonth = entry.timestamp.toISOString().substring(0, 7);
    if (entryMonth !== options.month) return false;
  } else {
    const daysSince = (now - entry.timestamp) / (1000 * 60 * 60 * 24);
    if (daysSince > options.since) return false;
  }

  // Branch filter
  if (options.branch && entry.branch !== options.branch) return false;

  // Status filter
  if (options.status && entry.status !== options.status) return false;

  return true;
});

// Analyze results
console.log(`\n${'='.repeat(70)}`);
console.log('PUSH AUDIT LOG ANALYSIS');
console.log('='.repeat(70));

if (options.month) {
  console.log(`\nPeriod: ${options.month}`);
} else {
  console.log(`\nPeriod: Last ${options.since} days`);
}

if (options.branch) console.log(`Branch: ${options.branch}`);
if (options.status) console.log(`Status: ${options.status}`);

console.log(`Total entries: ${filtered.length}\n`);

// Count by status
const byStatus = {};
filtered.forEach(entry => {
  byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;
});

console.log('By Status:');
Object.entries(byStatus).forEach(([status, count]) => {
  const icon = status === 'ALLOWED' ? '✅' : status === 'BLOCKED' ? '🚫' : '⚠️';
  console.log(`  ${icon} ${status}: ${count}`);
});

// Count by branch
const byBranch = {};
filtered.forEach(entry => {
  byBranch[entry.branch] = (byBranch[entry.branch] || 0) + 1;
});

console.log('\nBy Branch:');
Object.entries(byBranch)
  .sort((a, b) => b[1] - a[1])
  .forEach(([branch, count]) => {
    console.log(`  ${branch}: ${count}`);
  });

// Identify bypasses (--no-verify)
const bypasses = filtered.filter(e => e.status === 'BYPASSED' || e.message.includes('no-verify'));

if (bypasses.length > 0) {
  console.log(`\n⚠️  BYPASSES (--no-verify):`);
  console.log(`Total: ${bypasses.length}\n`);

  if (!options.summary) {
    bypasses.forEach(entry => {
      const dateStr = entry.timestamp.toISOString();
      console.log(`  ${dateStr} | ${entry.branch} | ${entry.message}`);
    });
  }

  // Identify bypasses on sensitive branches
  const sensitiveBypasses = bypasses.filter(e =>
    ['prod', 'preprod', 'stage', 'qa', 'dev'].includes(e.branch)
  );

  if (sensitiveBypasses.length > 0) {
    console.log(`\n🚨 CRITICAL: Bypasses on protection branches:`);
    sensitiveBypasses.forEach(entry => {
      console.log(`  ${entry.timestamp.toISOString()} | ${entry.branch}`);
    });
  }
} else {
  console.log('\n✅ No --no-verify bypasses found.');
}

// Blockers (enforcement failures)
const blockers = filtered.filter(e => e.status === 'BLOCKED');
if (blockers.length > 0) {
  console.log(`\n🚫 BLOCKERS (compliance enforcement):`);
  console.log(`Total: ${blockers.length}`);

  if (!options.summary) {
    blockers.forEach(entry => {
      console.log(`  ${entry.timestamp.toISOString()} | ${entry.branch}`);
    });
  }
}

// Trends
if (!options.summary && options.month === null) {
  console.log(`\n📈 Bypass Trend (per day):`);
  const byDay = {};
  bypasses.forEach(entry => {
    const day = entry.timestamp.toISOString().substring(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  });

  Object.entries(byDay)
    .sort()
    .slice(-7)  // Last 7 days
    .forEach(([day, count]) => {
      console.log(`  ${day}: ${count}`);
    });
}

console.log('\n' + '='.repeat(70) + '\n');

// Summary
if (bypasses.length === 0) {
  console.log('✅ VERDICT: No emergency bypasses detected. Enforcement is in effect.');
} else if (bypasses.length < 5) {
  console.log(`✅ VERDICT: ${bypasses.length} bypasses detected. Review each for legitimacy.`);
} else if (bypasses.length < 20) {
  console.log(`⚠️  VERDICT: ${bypasses.length} bypasses detected. Trend may need attention.`);
} else {
  console.log(`🚨 VERDICT: ${bypasses.length} bypasses detected. High bypass rate. Investigate root cause.`);
}

// Check for prod/preprod bypasses
if (sensitiveBypasses && sensitiveBypasses.length > 0) {
  console.log(`🚨 ALERT: Bypasses on prod/preprod/stage! Verify Layer 1 is still enforced.`);
}

process.exit(0);
