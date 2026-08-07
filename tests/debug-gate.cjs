#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');

const fixture = 'tests/cjis-fixtures/hard-match-any.json';
const data = fs.readFileSync(fixture, 'utf8');

console.log('Input fixture:', data);
console.log('\n--- Running gate ---\n');

const gate = spawn('node', ['scripts/keel-classify-gate.cjs', '--stage=prompt']);

gate.stdout.on('data', (d) => { console.log('[STDOUT]', d.toString()); });
gate.stderr.on('data', (d) => { console.log('[STDERR]', d.toString()); });
gate.on('close', (code) => {
  console.log(`\n--- Gate exited with code: ${code} ---`);
});

gate.stdin.write(data);
gate.stdin.end();
