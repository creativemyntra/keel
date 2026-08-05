/**
 * KEEL-105 — Dashboard Host-header allowlist — E2E browser tests (Playwright).
 *
 * Runs the REAL server (`node scripts/keel-dashboard.cjs --port <N>` against
 * the real repo state) and drives a real Chromium browser.
 *
 * Scope note (per phase-2 BA decision, ADR-004): a browser CANNOT send an
 * arbitrary Host header — it always derives Host from the navigated URL. So
 * the disallowed-Host (403) and missing-Host (400) branches are NOT browser
 * flows; they are covered by the raw-socket Node suite
 * tests/keel-dashboard-host-e2e.test.cjs (19 tests). The browser-relevant
 * assertion for this story is the positive one: a real browser navigating to
 * an allowed host (localhost / 127.0.0.1) passes the allowlist guard and the
 * dashboard renders completely normally, with the KEEL-105 response-header
 * contract (nosniff, no-store) intact.
 *
 * The [::1] allowlist entry is likewise not browser-testable here: the server
 * intentionally binds 127.0.0.1 (IPv4 loopback only, AC-4), so no IPv6
 * connection can be established. The [::1] Host value is exercised at the
 * header-parsing level by the unit suite (tests/keel-dashboard.test.cjs).
 *
 * AC map (browser-relevant slice):
 *   AC-1  allowed hosts render normally in a real browser:
 *         http://localhost:<port> and http://127.0.0.1:<port> → HTTP 200,
 *         full dashboard HTML, security headers present, zero console errors
 *   AC-5  the 10 pre-existing KEEL-104 Playwright tests stay green
 *         (tests/e2e/KEEL-104-dashboard.spec.ts — run in the same session)
 *
 * Evidence screenshots: docs/e2e-evidence/KEEL-105/
 */
import { test, expect } from '@playwright/test';
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVIDENCE_DIR = path.join(REPO_ROOT, 'docs', 'e2e-evidence', 'KEEL-105');

const PORT = Number(process.env.KEEL_E2E_HOST_PORT ?? 7894);

// ─── helpers (same pattern as KEEL-104 spec) ─────────────────────────────────

interface ServerHandle {
  proc: ChildProcess;
  stdout: string;
  stderr: string;
}

function startServer(args: string[], cwd: string): ServerHandle {
  const proc = spawn(process.execPath, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const handle: ServerHandle = { proc, stdout: '', stderr: '' };
  proc.stdout!.on('data', (d) => (handle.stdout += d.toString()));
  proc.stderr!.on('data', (d) => (handle.stderr += d.toString()));
  return handle;
}

function killTree(proc: ChildProcess): void {
  if (proc.pid == null || proc.killed) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
    } else {
      proc.kill('SIGKILL');
    }
  } catch {
    /* process already gone */
  }
}

async function waitForServer(port: number, timeoutMs = 15000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise<boolean>((resolve) => {
      const req = http.get({ host: '127.0.0.1', port, path: '/', timeout: 1000 }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server on port ${port} did not respond within ${timeoutMs}ms`);
}

function collectPageErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/** Shared assertion: the dashboard rendered fully and normally on this page. */
async function expectDashboardRendered(page: import('@playwright/test').Page): Promise<void> {
  await expect(page).toHaveTitle('Keel Pipeline Dashboard');
  await expect(page.locator('h1')).toHaveText('Keel Pipeline Dashboard');
  await expect(page.locator('thead th')).toHaveText([
    'Story ID', 'Title', 'Scope', 'Current Phase', 'Status', 'Idle Time',
  ]);
  // At least one story row must be present (derived from real .keel/state/)
  await expect(page.locator('tbody tr')).not.toHaveCount(0);
  await expect(page.locator('footer')).toContainText(`Port ${PORT}`);
}

// ─── AC-1 — allowed hosts render normally in a real browser ─────────────────

test.describe('KEEL-105 dashboard host allowlist — allowed hosts via real browser', () => {
  let server: ServerHandle;

  test.beforeAll(async () => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    server = startServer(
      [path.join(REPO_ROOT, 'scripts', 'keel-dashboard.cjs'), '--port', String(PORT)],
      REPO_ROOT,
    );
    await waitForServer(PORT);
  });

  test.afterAll(() => {
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'allowed-host-startup-stdout.txt'),
      `command: node scripts/keel-dashboard.cjs --port ${PORT}\n--- stdout ---\n${server.stdout}\n--- stderr ---\n${server.stderr}\n`,
    );
    killTree(server.proc);
  });

  test('AC-1: browser at http://localhost:<port> (Host: localhost:<port>) gets 200 and full dashboard', async ({ page }) => {
    const errors = collectPageErrors(page);

    const nav = await page.goto(`http://localhost:${PORT}/`);
    expect(nav?.status()).toBe(200);

    // Allowlist guard passed AND the KEEL-105 header contract is on the
    // allowed-path response too (nosniff / no-store, HTML content type).
    const headers = nav!.headers();
    expect(headers['content-type']).toContain('text/html');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['cache-control']).toBe('no-store');

    await expectDashboardRendered(page);

    expect(errors).toEqual([]);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'ac1-allowed-host-localhost.png'),
      fullPage: true,
    });
  });

  test('AC-1: browser at http://127.0.0.1:<port> (Host: 127.0.0.1:<port>) gets 200 and full dashboard', async ({ page }) => {
    const errors = collectPageErrors(page);

    const nav = await page.goto(`http://127.0.0.1:${PORT}/`);
    expect(nav?.status()).toBe(200);

    const headers = nav!.headers();
    expect(headers['content-type']).toContain('text/html');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['cache-control']).toBe('no-store');

    await expectDashboardRendered(page);

    expect(errors).toEqual([]);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'ac1-allowed-host-127.0.0.1.png'),
      fullPage: true,
    });
  });

  test('AC-1/AC-2 boundary: allowed host + unknown path still routes to 404 (guard does not swallow routing)', async ({ page, request }) => {
    // With an allowed Host the request must reach the KEEL-104 router: /nope
    // is a 404 'Not found', NOT a 403 — proving the guard only rejects on
    // Host, never on path (disallowed-Host 403s are covered by the Node
    // raw-socket suite, tests/keel-dashboard-host-e2e.test.cjs).
    const res = await request.get(`http://localhost:${PORT}/nope`);
    expect(res.status()).toBe(404);
    expect(await res.text()).toBe('Not found');

    const nav = await page.goto(`http://localhost:${PORT}/nope`);
    expect(nav?.status()).toBe(404);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'allowed-host-404-routing.png'),
    });
  });
});
