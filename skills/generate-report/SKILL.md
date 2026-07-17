---
name: generate-report
description: Generate a self-contained HTML pipeline report for any story. Reads all phase JSON files and the manifest, produces docs/reports/<story-id>-pipeline-report.html. Can be run at any point — partial pipelines produce a partial report.
---

# generate-report

Generate a single-page HTML pipeline report for a keel story.

## When to use

- After any phase completes, to see current progress
- After the full pipeline finishes, as the shareable deliverable
- As part of release (the release-manager invokes it as a final step)

## Instructions

1. Determine the story ID (from context or ask the user).
2. Run:
   ```bash
   node ~/.keel/bin/keel-state.cjs report <story-id>
   ```
3. The report is written to `docs/reports/<story-id>-pipeline-report.html`.
4. To view it, serve it locally:
   ```bash
   node -e "
   const http=require('http'),fs=require('fs'),path=require('path');
   http.createServer((q,r)=>{
     const f=path.join('docs/reports','<story-id>-pipeline-report.html');
     r.writeHead(200,{'Content-Type':'text/html'});
     r.end(fs.readFileSync(f));
   }).listen(7771,()=>console.log('Open: http://localhost:7771'));
   "
   ```
5. Report to the user: `docs/reports/<story-id>-pipeline-report.html` — open in browser.

## What the report contains

| Section | Source |
|---------|--------|
| Status badge (COMPLETE / IN PROGRESS / HALTED) | manifest.json |
| Phases complete progress bar | manifest + phase files |
| Test suite summary | software-engineer phase findings |
| Coverage per file | software-engineer + qa-engineer findings |
| E2E test summary | e2e-engineer findings |
| UI mockup links | ui-designer artifacts |
| Security findings | security-engineer findings |
| Acceptance criteria chips | phase-1 output |
| Phase pipeline table | all phase files |
| Per-phase findings detail | all phase files |
| Decisions log | all phase files |
| Artifacts list | all phase files |

## Rules

- Zero dependencies — runs with Node.js built-ins only.
- The report is fully self-contained HTML (inline CSS, no CDN).
- Running it multiple times on the same story overwrites the previous report.
- A partial pipeline produces a partial report — PENDING phases show as grey rows.
