#!/usr/bin/env node
/**
 * keel-dashboard-host-e2e.test.cjs
 *
 * E2E-node suite for the KEEL-105 Host-header allowlist (ADR-004).
 * Spawns the REAL dashboard server (node scripts/keel-dashboard.cjs --port N,
 * loopback bind) in a temp project root and exercises the wire contract:
 *
 *   AC-1  allowed loopback Host literals (+ port / case variants) -> 200 HTML
 *   AC-2  disallowed Host -> 403 "Forbidden", static plain text, zero echo,
 *         guard precedes routing (bad Host + unknown path -> 403 not 404)
 *   AC-3  missing Host -> 400 "Bad Request" — sent as a RAW-SOCKET HTTP/1.0
 *         request (design D-7: Node's HTTP/1.1 parser pre-rejects Host-less
 *         requests with its own 400 before the handler, so the handler branch
 *         is only reachable via HTTP/1.0 / raw socket)
 *   AC-4  valid Host + unknown path -> unchanged 404 "Not found" baseline
 *
 * Red-check hook: KEEL_DASHBOARD_MUTANT=<abs path> spawns that script instead
 * of scripts/keel-dashboard.cjs, so phase-6 can prove every test fails against
 * a guard-neutered copy (generated into os.tmpdir(), never the repo).
 *
 * Run:  node tests/keel-dashboard-host-e2e.test.cjs
 * Exit: 0 = all pass, 1 = one or more failures
 *
 * Style: zero-dependency assert harness identical to keel-dashboard.test.cjs.
 */
'use strict';

const fs   = require('fs');
const os   = require('os');
const net  = require('net');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const SCRIPT = process.env.KEEL_DASHBOARD_MUTANT ||
  path.join(__dirname, '..', 'scripts', 'keel-dashboard.cjs');

// ─── Harness ──────────────────────────────────────────────────────────────────

const results = [];

function assert(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: cond ? '' : (detail || 'assertion failed') });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  <-- ' + (detail || 'assertion failed')}`);
}

function finish() {
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length} / ${results.length} passed`);
  if (failed.length) {
    console.log('\nFailed tests:');
    failed.forEach((r) => console.log(`  FAIL  ${r.name}  <-- ${r.detail}`));
  }
  process.exit(failed.length ? 1 : 0);
}

// ─── Fixture: temp project root with one story ────────────────────────────────

function makeProjectRoot() {
  const root = path.join(os.tmpdir(), `keel-host-e2e-${process.pid}-${Date.now()}`);
  const storyDir = path.join(root, '.keel', 'state', 'E2E-HOST-1');
  fs.mkdirSync(storyDir, { recursive: true });
  fs.writeFileSync(path.join(storyDir, 'manifest.json'), JSON.stringify({
    story_id:        'E2E-HOST-1',
    title:           'Host allowlist e2e fixture',
    scope:           'feature',
    current_phase:   6,
    halted:          false,
    updated_at:      '2026-07-16T00:00:00.000Z',
    expected_phases: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  }, null, 2));
  return root;
}

// ─── Server lifecycle ─────────────────────────────────────────────────────────

/** Spawns the dashboard; resolves the child once "Dashboard:" hits stdout. */
function startServer(cwd, port) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT, '--port', String(port)], {
      cwd, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '', err = '', settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; child.kill(); reject(new Error(`server not up in 10s; stdout="${out}" stderr="${err}"`)); }
    }, 10_000);
    child.stdout.on('data', (c) => {
      out += String(c);
      if (!settled && out.includes('Dashboard: http://localhost:')) {
        settled = true; clearTimeout(timer); resolve(child);
      }
    });
    child.stderr.on('data', (c) => { err += String(c); });
    child.on('exit', (code) => {
      if (!settled) { settled = true; clearTimeout(timer); reject(new Error(`server exited early (code=${code}); stderr="${err}"`)); }
    });
  });
}

// ─── HTTP clients ─────────────────────────────────────────────────────────────

/**
 * HTTP/1.1 GET via http.request with an EXPLICIT Host header value.
 * Connects to 127.0.0.1:<port> regardless of the Host header sent.
 */
function requestWithHost(port, hostHeader, reqPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: reqPath || '/',
      method: 'GET',
      headers: { Host: hostHeader },
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.setTimeout(5000, () => { req.destroy(new Error('client timeout')); });
    req.on('error', reject);
    req.end();
  });
}

/**
 * Raw-socket request (design D-7). Writes the given request text verbatim and
 * returns { statusLine, status, body, raw }. Required for the missing-Host
 * case: Node's HTTP/1.1 parser rejects Host-less HTTP/1.1 before the handler,
 * so only an HTTP/1.0 request line reaches the handler's 400 branch.
 */
function rawRequest(port, requestText) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1', () => socket.write(requestText));
    let raw = '', settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      const statusLine = raw.split('\r\n')[0] || '';
      const m = statusLine.match(/^HTTP\/1\.[01] (\d{3})/);
      const sep = raw.indexOf('\r\n\r\n');
      resolve({
        statusLine,
        status: m ? parseInt(m[1], 10) : null,
        body:   sep >= 0 ? raw.slice(sep + 4) : '',
        raw,
      });
    };
    socket.setEncoding('utf8');
    socket.on('data', (c) => { raw += c; });
    socket.on('end', done);
    socket.on('close', done);
    socket.on('error', (e) => { if (!settled) { settled = true; reject(e); } });
    setTimeout(() => { socket.destroy(); done(); }, 5000).unref();
  });
}

// ─── Suite ────────────────────────────────────────────────────────────────────

async function main() {
  const root = makeProjectRoot();

  // Ephemeral-ish port; retry twice on startup collision.
  let child = null, port = 0;
  for (let attempt = 0; attempt < 3 && !child; attempt++) {
    port = 21000 + Math.floor(Math.random() * 20000);
    try { child = await startServer(root, port); } catch (e) {
      if (attempt === 2) {
        assert('K105 e2e: dashboard server starts', false, e.message);
        finish();
      }
    }
  }

  try {
    // ── K105 AC-1: allowed Host literals → 200 HTML ──────────────────────────

    {
      const r = await requestWithHost(port, `localhost:${port}`, '/');
      assert(
        'K105 AC-1 e2e: Host localhost:<port> returns 200',
        r.status === 200,
        `status=${r.status}`
      );
      assert(
        'K105 AC-1 e2e: 200 body is dashboard HTML containing the fixture story',
        r.body.includes('<!DOCTYPE html>') && r.body.includes('E2E-HOST-1'),
        `body starts "${r.body.slice(0, 80)}"`
      );
    }

    {
      const r = await requestWithHost(port, `127.0.0.1:${port}`, '/');
      assert(
        'K105 AC-1 e2e: Host 127.0.0.1:<port> returns 200 (port-suffix variant)',
        r.status === 200,
        `status=${r.status}`
      );
    }

    {
      const r = await requestWithHost(port, `[::1]:${port}`, '/');
      assert(
        'K105 AC-1 e2e: Host [::1]:<port> returns 200 (bracketed IPv6 literal)',
        r.status === 200,
        `status=${r.status}`
      );
    }

    {
      const r = await requestWithHost(port, `LOCALHOST:${port}`, '/');
      assert(
        'K105 AC-1 e2e: Host LOCALHOST:<port> returns 200 (case-insensitive)',
        r.status === 200,
        `status=${r.status}`
      );
    }

    {
      const r = await requestWithHost(port, 'localhost', '/');
      assert(
        'K105 AC-1 e2e: Host localhost (no port suffix) returns 200',
        r.status === 200,
        `status=${r.status}`
      );
    }

    // ── K105 AC-2: disallowed Host → 403, static, zero echo ──────────────────

    {
      const r = await requestWithHost(port, 'evil.com', '/');
      assert(
        'K105 AC-2 e2e: Host evil.com returns 403',
        r.status === 403,
        `status=${r.status}`
      );
      assert(
        'K105 AC-2 e2e: 403 body is exactly "Forbidden"',
        r.body === 'Forbidden',
        `body="${r.body}"`
      );
      assert(
        'K105 AC-2 e2e: 403 Content-Type is text/plain; charset=utf-8',
        r.headers['content-type'] === 'text/plain; charset=utf-8',
        `content-type="${r.headers['content-type']}"`
      );
      assert(
        'K105 AC-2 e2e: 403 has X-Content-Type-Options nosniff',
        r.headers['x-content-type-options'] === 'nosniff',
        `x-content-type-options="${r.headers['x-content-type-options']}"`
      );
      assert(
        'K105 AC-2 e2e: 403 has Cache-Control no-store',
        r.headers['cache-control'] === 'no-store',
        `cache-control="${r.headers['cache-control']}"`
      );
      const surface = r.body + JSON.stringify(r.headers);
      assert(
        'K105 AC-2 e2e: 403 response echoes no request data (Host value absent)',
        !surface.includes('evil.com'),
        `response surface contains the Host value`
      );
    }

    {
      const r = await requestWithHost(port, `evil.com:${port}`, '/');
      assert(
        'K105 AC-2 e2e: Host evil.com:<port> returns 403 (port does not whitelist)',
        r.status === 403,
        `status=${r.status}`
      );
    }

    {
      const r = await requestWithHost(port, `localhost.evil.com:${port}`, '/');
      assert(
        'K105 AC-2 e2e: Host localhost.evil.com:<port> returns 403 (rebinding suffix)',
        r.status === 403,
        `status=${r.status}`
      );
    }

    {
      const r = await requestWithHost(port, 'evil.com', '/nope');
      assert(
        'K105 AC-2 e2e: bad Host + unknown path returns 403 not 404 (guard before routing)',
        r.status === 403,
        `status=${r.status} body="${r.body}"`
      );
    }

    // ── K105 AC-3: missing Host via raw-socket HTTP/1.0 → 400 (design D-7) ───

    {
      const r = await rawRequest(port, 'GET / HTTP/1.0\r\n\r\n');
      assert(
        'K105 AC-3 e2e: raw HTTP/1.0 request without Host returns 400',
        r.status === 400,
        `status line: "${r.statusLine}" raw starts "${r.raw.slice(0, 80)}"`
      );
      assert(
        'K105 AC-3 e2e: missing-Host body is exactly "Bad Request"',
        r.body === 'Bad Request',
        `body="${r.body}"`
      );
    }

    {
      // Guard also holds at the HTTP/1.0 layer for a PRESENT bad Host.
      const r = await rawRequest(port, 'GET / HTTP/1.0\r\nHost: evil.com\r\n\r\n');
      assert(
        'K105 AC-2 e2e: raw HTTP/1.0 with Host evil.com returns 403 (layer consistency)',
        r.status === 403 && r.body === 'Forbidden',
        `status=${r.status} body="${r.body}"`
      );
    }

    // ── K105 AC-4: baseline branches unchanged behind the guard ──────────────

    {
      const r = await requestWithHost(port, `localhost:${port}`, '/nope');
      assert(
        'K105 AC-4 e2e: valid Host + /nope returns 404 "Not found" (baseline intact)',
        r.status === 404 && r.body === 'Not found',
        `status=${r.status} body="${r.body}"`
      );
    }
  } catch (e) {
    assert('K105 e2e: suite completed without transport errors', false, e.message);
  } finally {
    if (child) child.kill();
  }

  finish();
}

main();
