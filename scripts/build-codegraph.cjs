#!/usr/bin/env node
/**
 * Keel CodeGraph v1 — static dependency graph extractor for PHP projects.
 *
 * Scans src/ and tests/ for namespace, use, extends, implements, and
 * `new ClassName` / `ClassName::` references, and emits a queryable graph:
 *
 *   .keel/graph/codegraph.json
 *   {
 *     "generated_at": "...",
 *     "nodes": { "<FQCN>": { "file": "src/...", "kind": "class|interface|trait" } },
 *     "edges": [ { "from": "<FQCN>", "to": "<FQCN>", "type": "use|extends|implements|references" } ]
 *   }
 *
 * Usage:
 *   node scripts/build-codegraph.js [projectRoot]         # build the graph
 *   node scripts/build-codegraph.js --impact <ClassOrFile> # reverse-dependency query
 *
 * This is intentionally regex-based (no PHP runtime required). It over-includes
 * rather than misses: a false edge costs a moment of review; a missed edge
 * costs a production regression.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const impactIdx = args.indexOf('--impact');
const impactTarget = impactIdx >= 0 ? args[impactIdx + 1] : null;
const root = path.resolve(
  args.filter((a, i) => impactIdx < 0 || (i !== impactIdx && i !== impactIdx + 1))[0] || '.'
);
const graphPath = path.join(root, '.keel', 'graph', 'codegraph.json');

function phpFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'vendor' || entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      phpFiles(p, out);
    } else if (entry.name.endsWith('.php')) {
      out.push(p);
    }
  }
  return out;
}

function buildGraph() {
  const nodes = {};
  const edges = [];
  const files = [...phpFiles(path.join(root, 'src')), ...phpFiles(path.join(root, 'tests'))];

  // pass 1: declared classes/interfaces/traits
  const declarations = []; // { fqcn, file, kind, source }
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const nsMatch = source.match(/^\s*namespace\s+([\w\\]+)\s*;/m);
    const ns = nsMatch ? nsMatch[1] : '';
    const declRe = /^\s*(?:final\s+|abstract\s+)?(class|interface|trait|enum)\s+(\w+)/gm;
    let m;
    while ((m = declRe.exec(source)) !== null) {
      const fqcn = ns ? `${ns}\\${m[2]}` : m[2];
      nodes[fqcn] = { file: path.relative(root, file).replace(/\\/g, '/'), kind: m[1] };
      declarations.push({ fqcn, file, kind: m[1], source, ns });
    }
  }

  const shortToFqcn = {};
  for (const fqcn of Object.keys(nodes)) {
    const short = fqcn.split('\\').pop();
    (shortToFqcn[short] = shortToFqcn[short] || []).push(fqcn);
  }

  // pass 2: edges
  for (const decl of declarations) {
    const { fqcn, source } = decl;
    const imports = {}; // alias/short -> FQCN
    const useRe = /^\s*use\s+([\w\\]+)(?:\s+as\s+(\w+))?\s*;/gm;
    let m;
    while ((m = useRe.exec(source)) !== null) {
      const target = m[1];
      const alias = m[2] || target.split('\\').pop();
      imports[alias] = target;
      if (nodes[target] && target !== fqcn) {
        edges.push({ from: fqcn, to: target, type: 'use' });
      }
    }
    const resolve = (name) => {
      const clean = name.replace(/^\\/, '');
      if (imports[clean]) return imports[clean];
      if (nodes[clean]) return clean;
      if (decl.ns && nodes[`${decl.ns}\\${clean}`]) return `${decl.ns}\\${clean}`;
      if (shortToFqcn[clean] && shortToFqcn[clean].length === 1) return shortToFqcn[clean][0];
      return null;
    };
    const extRe = /(?:class|interface|enum)\s+\w+\s+extends\s+([\w\\]+)/g;
    while ((m = extRe.exec(source)) !== null) {
      const to = resolve(m[1]);
      if (to && to !== fqcn) edges.push({ from: fqcn, to, type: 'extends' });
    }
    const implRe = /class\s+\w+[^{]*implements\s+([\w\\,\s]+)\{/g;
    while ((m = implRe.exec(source)) !== null) {
      for (const iface of m[1].split(',')) {
        const to = resolve(iface.trim());
        if (to && to !== fqcn) edges.push({ from: fqcn, to, type: 'implements' });
      }
    }
    const refRe = /(?:new\s+([\w\\]+)\s*\(|([\w\\]+)::(?!class))/g;
    while ((m = refRe.exec(source)) !== null) {
      const name = m[1] || m[2];
      if (['self', 'static', 'parent'].includes(name)) continue;
      const to = resolve(name);
      if (to && to !== fqcn) edges.push({ from: fqcn, to, type: 'references' });
    }
  }

  // dedupe edges
  const seen = new Set();
  const unique = edges.filter((e) => {
    const key = `${e.from}|${e.to}|${e.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const graph = { generated_at: new Date().toISOString(), nodes, edges: unique };
  fs.mkdirSync(path.dirname(graphPath), { recursive: true });
  fs.writeFileSync(graphPath, JSON.stringify(graph, null, 2));
  console.log(`CodeGraph: ${Object.keys(nodes).length} nodes, ${unique.length} edges → ${path.relative(root, graphPath)}`);
  return graph;
}

function impact(graph, target) {
  // target can be an FQCN, a short class name, or a file path
  const norm = target.replace(/\\\\/g, '\\');
  let start = Object.keys(graph.nodes).filter(
    (n) => n === norm || n.endsWith(`\\${norm}`) || graph.nodes[n].file === norm.replace(/\\/g, '/')
  );
  if (start.length === 0) {
    console.error(`No node matches "${target}". Rebuild the graph or check the name.`);
    process.exit(1);
  }
  // BFS over reverse edges
  const reverse = {};
  for (const e of graph.edges) (reverse[e.to] = reverse[e.to] || []).push(e);
  const visited = new Set(start);
  const queue = [...start.map((n) => ({ node: n, depth: 0 }))];
  const result = [];
  while (queue.length) {
    const { node, depth } = queue.shift();
    for (const e of reverse[node] || []) {
      if (!visited.has(e.from)) {
        visited.add(e.from);
        result.push({ dependent: e.from, via: e.type, on: node, depth: depth + 1, file: graph.nodes[e.from].file });
        queue.push({ node: e.from, depth: depth + 1 });
      }
    }
  }
  console.log(`Impact analysis for: ${start.join(', ')}`);
  console.log(`Direct + transitive dependents: ${result.length}\n`);
  for (const r of result.sort((a, b) => a.depth - b.depth)) {
    console.log(`  [depth ${r.depth}] ${r.dependent} (${r.via} ${r.on})  →  ${r.file}`);
  }
  if (result.length === 0) console.log('  (no dependents — change is isolated)');
}

if (impactTarget) {
  if (!fs.existsSync(graphPath)) {
    console.log('Graph missing — building first…');
    impact(buildGraph(), impactTarget);
  } else {
    impact(JSON.parse(fs.readFileSync(graphPath, 'utf8')), impactTarget);
  }
} else {
  buildGraph();
}
