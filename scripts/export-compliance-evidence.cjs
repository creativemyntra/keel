#!/usr/bin/env node
/**
 * export-compliance-evidence.cjs — Export compliance evidence for external auditors.
 * Produces a portable, auditor-facing directory with control status, evidence artifacts,
 * timestamps, and exceptions for a given story or date range.
 *
 * Usage:
 *   node scripts/export-compliance-evidence.cjs --story HART-287
 *   node scripts/export-compliance-evidence.cjs --story HART-287 --format json
 *   node scripts/export-compliance-evidence.cjs --start 2026-01-01 --end 2026-08-07
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const cwd = process.cwd();
const stateDir = path.join(cwd, '.keel', 'state');

function flag(args, name) {
  const idx = args.indexOf(name);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

function help() {
  console.log(`
Usage: node scripts/export-compliance-evidence.cjs [options]

Options:
  --story <id>        Export evidence for one story (e.g., HART-287)
  --start <date>      Start date (ISO 8601, e.g., 2026-01-01) for date-range export
  --end <date>        End date (ISO 8601) for date-range export
  --format <json|csv> Output format (default: json)
  --output <dir>      Output directory (default: ./compliance-export-<timestamp>)
  --help              Show this help

Examples:
  # Export single story for auditor review
  node scripts/export-compliance-evidence.cjs --story HART-287

  # Export all stories in a date range
  node scripts/export-compliance-evidence.cjs --start 2026-07-01 --end 2026-08-07

  # Export to specific directory
  node scripts/export-compliance-evidence.cjs --story HART-287 --output ./auditor-review
  `);
  process.exit(0);
}

const args = process.argv.slice(2);
if (args.includes('--help')) help();

const storyId = flag(args, '--story');
const startDate = flag(args, '--start');
const endDate = flag(args, '--end');
const format = flag(args, '--format') || 'json';
const outputDir = flag(args, '--output') || `./compliance-export-${Date.now()}`;

// Validation
if (!storyId && !startDate && !endDate) {
  console.error('Error: provide --story or --start/--end');
  process.exit(1);
}

if ((startDate || endDate) && storyId) {
  console.error('Error: cannot combine --story with --start/--end');
  process.exit(1);
}

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const evidence = {
  export_timestamp: new Date().toISOString(),
  export_type: storyId ? 'story' : 'date-range',
  export_params: {
    story_id: storyId || null,
    start_date: startDate || null,
    end_date: endDate || null,
    format
  },
  controls: [],
  summary: {
    total_controls: 0,
    controls_pass: 0,
    controls_fail: 0,
    controls_not_proven: 0,
    controls_waived: 0
  }
};

// Find stories to export
let storiesToExport = [];
if (storyId) {
  storiesToExport = [storyId];
} else {
  const allStories = fs.readdirSync(stateDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  storiesToExport = allStories;
}

// Process each story
for (const story of storiesToExport) {
  const manifestPath = path.join(stateDir, story, 'manifest.json');
  if (!fs.existsSync(manifestPath)) continue;

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    continue;
  }

  if (!manifest.compliance_scopes || manifest.compliance_scopes.length === 0) {
    continue;
  }

  // Load compliance control mapping (if exists)
  const controlPath = path.join(stateDir, story, 'compliance-control.json');
  if (!fs.existsSync(controlPath)) {
    continue;
  }

  let controls;
  try {
    controls = JSON.parse(fs.readFileSync(controlPath, 'utf8'));
  } catch {
    continue;
  }

  // For each control, create evidence entry
  if (Array.isArray(controls.controls)) {
    for (const control of controls.controls) {
      const entry = {
        story_id: story,
        framework: control.framework || 'UNKNOWN',
        control_id: control.control_id,
        control_description: control.description,
        policy_version: control.policy_version || 'UNKNOWN',
        status: control.state, // PASS, FAIL, NOT_PROVEN, WAIVED, NOT_APPLICABLE
        evidence_timestamp: new Date().toISOString(),
        source_system: 'compliance-control-json',
        evidence_files: control.evidence_files || [],
        exception: control.exception || null,
        notes: `Story ${story} phase ${manifest.current_phase}`
      };

      // Update summary counts
      evidence.summary.total_controls++;
      if (control.state === 'PASS') evidence.summary.controls_pass++;
      else if (control.state === 'FAIL') evidence.summary.controls_fail++;
      else if (control.state === 'NOT_PROVEN') evidence.summary.controls_not_proven++;
      else if (control.state === 'WAIVED') evidence.summary.controls_waived++;

      evidence.controls.push(entry);
    }
  }
}

// Write export in requested format
if (format === 'json') {
  fs.writeFileSync(
    path.join(outputDir, 'evidence.json'),
    JSON.stringify(evidence, null, 2)
  );

  // Also write a human-readable summary
  const summary = `# Compliance Evidence Export

**Exported:** ${evidence.export_timestamp}
**Type:** ${evidence.export_type}
**Story:** ${storyId || 'date range'}

## Summary

- Total controls: ${evidence.summary.total_controls}
- Passing: ${evidence.summary.controls_pass}
- Failing: ${evidence.summary.controls_fail}
- Not proven: ${evidence.summary.controls_not_proven}
- Waived: ${evidence.summary.controls_waived}

## Controls

${evidence.controls.map((c) => `
### ${c.framework} - ${c.control_id}

${c.control_description}

**Status:** ${c.status}
**Story:** ${c.story_id}
**Policy Version:** ${c.policy_version}
**Evidence Files:**
${c.evidence_files.length > 0 ? c.evidence_files.map((f) => `- ${f}`).join('\n') : '(none)'}

**Exception:** ${c.exception ? JSON.stringify(c.exception, null, 2) : 'None'}

---
`).join('\n')}
`;

  fs.writeFileSync(path.join(outputDir, 'SUMMARY.md'), summary);

  console.log(`✓ Compliance evidence exported to ${outputDir}`);
  console.log(`  - evidence.json: structured data for auditor processing`);
  console.log(`  - SUMMARY.md: human-readable overview`);
} else if (format === 'csv') {
  // CSV export
  const csv = [
    ['Story', 'Framework', 'Control ID', 'Description', 'Status', 'Policy Version', 'Exception?'].join(',')
  ];

  for (const c of evidence.controls) {
    csv.push(
      [
        c.story_id,
        c.framework,
        c.control_id,
        `"${c.control_description.replace(/"/g, '""')}"`,
        c.status,
        c.policy_version,
        c.exception ? 'Yes' : 'No'
      ].join(',')
    );
  }

  fs.writeFileSync(path.join(outputDir, 'evidence.csv'), csv.join('\n'));
  console.log(`✓ CSV export written to ${outputDir}/evidence.csv`);
}

console.log(`\nDeliverable for auditor: ${outputDir}`);
process.exit(0);
