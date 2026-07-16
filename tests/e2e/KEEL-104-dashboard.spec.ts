/**
 * KEEL-104 — Pipeline status web dashboard — E2E browser tests (Playwright).
 *
 * Runs the REAL server (`node bin/keel.js dashboard --port=N` and
 * `node scripts/keel-dashboard.cjs`) and drives a real Chromium browser.
 *
 * AC map:
 *   AC-1  server starts, stdout "Dashboard: http://localhost:<port>", default port 7772
 *   AC-2  table renders story id / title / scope / phase name / status badge / idle time
 *   AC-3  stories sorted by updated_at DESC
 *   AC-4  auto-refresh via <meta http-equiv="refresh" content="30">
 *   AC-5  --port flag overrides default
 *   AC-6  empty state: "No stories found. Run keel init <story-id> to start."
 *   AC-7  regression guard on keel-state.cjs `status --all` (backend-only — covered
 *         in phase 8 integration tests; no browser surface, no E2E here)
 *
 * Evidence screenshots: docs/e2e-evidence/KEEL-104/
 */
import { test, expect } from '@playwright/test';
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as http from 'node:http';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVIDENCE_DIR = path.join(REPO_ROOT, 'docs', 'e2e-evidence', 'KEEL-104');

const CLI_PORT = Number(process.env.KEEL_E2E_PORT ?? 7891);
const EMPTY_PORT = CLI_PORT + 1; // 7892
const XSS_PORT = CLI_PORT + 2;   // 7893
const DEFAULT_PORT = 7772;       // AC-1 default

// ─── helpers ─────────────────────────────────────────────────────────────────

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

/** Kill the whole process tree (keel.js spawns the dashboard as a grandchild). */
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

/** Poll until the server answers GET / (any status) or time out. */
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

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
});

// ─── AC-1 / AC-2 / AC-3 / AC-4 / AC-5 — real repo state via keel CLI ─────────

test.describe('KEEL-104 dashboard — real repo state via `keel dashboard --port`', () => {
  let server: ServerHandle;
  const BASE = `http://localhost:${CLI_PORT}`;

  test.beforeAll(async () => {
    server = startServer(
      [path.join(REPO_ROOT, 'bin', 'keel.js'), 'dashboard', `--port=${CLI_PORT}`],
      REPO_ROOT,
    );
    await waitForServer(CLI_PORT);
  });

  test.afterAll(() => {
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'ac1-ac5-startup-stdout.txt'),
      `command: node bin/keel.js dashboard --port=${CLI_PORT}\n--- stdout ---\n${server.stdout}\n--- stderr ---\n${server.stderr}\n`,
    );
    killTree(server.proc);
  });

  test('AC-1/AC-5: startup stdout announces overridden port', () => {
    expect(server.stdout).toContain(`Dashboard: http://localhost:${CLI_PORT}`);
  });

  test('AC-2: page loads with title, header and a 6-column table of all 4 stories', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto(BASE);

    await expect(page).toHaveTitle('Keel Pipeline Dashboard');
    await expect(page.locator('h1')).toHaveText('Keel Pipeline Dashboard');

    // 6 column headers in the designed order
    await expect(page.locator('thead th')).toHaveText([
      'Story ID', 'Title', 'Scope', 'Current Phase', 'Status', 'Idle Time',
    ]);

    // 4 story rows (KEEL-101..104 exist in .keel/state/)
    await expect(page.locator('tbody tr')).toHaveCount(4);

    // KEEL-104 row: title, scope, phase name (not number only), badge, idle
    const row104 = page.locator('tbody tr', { hasText: 'KEEL-104' });
    await expect(row104.locator('td').nth(1)).toHaveText('Add pipeline status web dashboard');
    await expect(row104.locator('td').nth(2)).toHaveText('feature');
    await expect(row104.locator('td').nth(3)).toHaveText('Phase 9 — E2E Engineer');
    await expect(row104.locator('td').nth(4).locator('span')).toHaveText('IN PROGRESS');

    // Idle time convention: "Xh Ym" (>= 60 min) or "Xm Ys" (< 60 min) or "unknown"
    const idleCells = await page.locator('tbody tr td:nth-child(6)').allTextContents();
    expect(idleCells).toHaveLength(4);
    for (const idle of idleCells) {
      expect(idle.trim()).toMatch(/^(\d+h \d+m|\d+m \d+s|unknown)$/);
    }

    expect(errors).toEqual([]);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'ac2-ac3-dashboard-table.png'), fullPage: true });
  });

  test('AC-2: status badges show correct state and color per story', async ({ page }) => {
    await page.goto(BASE);

    // KEEL-104: 8 of 12 phase files -> IN PROGRESS (amber #d97706)
    const badge104 = page.locator('tbody tr', { hasText: 'KEEL-104' }).locator('td').nth(4).locator('span');
    await expect(badge104).toHaveText('IN PROGRESS');
    await expect(badge104).toHaveCSS('background-color', 'rgb(217, 119, 6)');

    // KEEL-101/102/103: all expected phase files present -> COMPLETE (green #16a34a)
    for (const id of ['KEEL-101', 'KEEL-102', 'KEEL-103']) {
      const badge = page.locator('tbody tr', { hasText: id }).locator('td').nth(4).locator('span');
      await expect(badge).toHaveText('COMPLETE');
      await expect(badge).toHaveCSS('background-color', 'rgb(22, 163, 74)');
    }
  });

  test('AC-3: stories sorted by updated_at descending', async ({ page }) => {
    await page.goto(BASE);
    const ids = await page.locator('tbody tr td:first-child').allTextContents();
    // manifest updated_at: 104=07-14T15:57, 103=07-14T10:14, 102=07-09T17:43, 101=07-09T14:03
    expect(ids.map((s) => s.trim())).toEqual(['KEEL-104', 'KEEL-103', 'KEEL-102', 'KEEL-101']);
  });

  test('AC-4: auto-refresh meta tag present with 30s interval', async ({ page }) => {
    await page.goto(BASE);
    const meta = page.locator('meta[http-equiv="refresh"]');
    await expect(meta).toHaveAttribute('content', '30');
  });

  test('AC-5: footer shows the overridden port', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('footer')).toContainText(`Port ${CLI_PORT}`);
  });

  test('unknown path returns 404 Not found', async ({ page, request }) => {
    const res = await request.get(`${BASE}/nonexistent`);
    expect(res.status()).toBe(404);
    expect(await res.text()).toBe('Not found');

    const nav = await page.goto(`${BASE}/nonexistent`);
    expect(nav?.status()).toBe(404);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '404-not-found.png') });
  });
});

// ─── AC-6 — empty state ──────────────────────────────────────────────────────

test.describe('KEEL-104 dashboard — empty state (no .keel/state directory)', () => {
  let server: ServerHandle;
  let tmpDir: string;
  const BASE = `http://localhost:${EMPTY_PORT}`;

  test.beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keel104-empty-'));
    server = startServer(
      [path.join(REPO_ROOT, 'scripts', 'keel-dashboard.cjs'), '--port', String(EMPTY_PORT)],
      tmpDir,
    );
    await waitForServer(EMPTY_PORT);
  });

  test.afterAll(() => {
    killTree(server.proc);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('AC-6: shows "No stories found." with keel init hint; no table rendered', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto(BASE);

    await expect(page.locator('main')).toContainText('No stories found.');
    await expect(page.locator('main')).toContainText('keel init <story-id>');
    await expect(page.locator('table')).toHaveCount(0);
    await expect(page.locator('header')).toContainText('0 stories');

    expect(errors).toEqual([]);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'ac6-empty-state.png'), fullPage: true });
  });
});

// ─── XSS safety — manifest-sourced content must be escaped ───────────────────

test.describe('KEEL-104 dashboard — XSS safety (malicious manifest content)', () => {
  let server: ServerHandle;
  let tmpDir: string;
  const BASE = `http://localhost:${XSS_PORT}`;
  const EVIL_TITLE = `<script>alert('xss')</script><img src=x onerror=alert(2)>`;

  test.beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keel104-xss-'));
    const storyDir = path.join(tmpDir, '.keel', 'state', 'EVIL-1');
    fs.mkdirSync(storyDir, { recursive: true });
    fs.writeFileSync(
      path.join(storyDir, 'manifest.json'),
      JSON.stringify({
        story_id: 'EVIL-1',
        title: EVIL_TITLE,
        scope: 'feature',
        expected_phases: [1, 2, 3],
        current_phase: 1,
        updated_at: new Date().toISOString(),
      }, null, 2),
    );
    server = startServer(
      [path.join(REPO_ROOT, 'scripts', 'keel-dashboard.cjs'), '--port', String(XSS_PORT)],
      tmpDir,
    );
    await waitForServer(XSS_PORT);
  });

  test.afterAll(() => {
    killTree(server.proc);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('malicious title is escaped: rendered as text, no script/img injected, no dialogs', async ({ page }) => {
    const errors = collectPageErrors(page);
    let dialogCount = 0;
    page.on('dialog', async (d) => { dialogCount++; await d.dismiss(); });

    await page.goto(BASE);
    // give any injected script a moment to fire before asserting
    await page.waitForTimeout(500);

    // Payload appears as literal text in the title cell
    const titleCell = page.locator('tbody tr', { hasText: 'EVIL-1' }).locator('td').nth(1);
    await expect(titleCell).toHaveText(EVIL_TITLE);

    // No executable elements injected into the DOM
    await expect(page.locator('script')).toHaveCount(0);
    await expect(page.locator('img')).toHaveCount(0);

    expect(dialogCount).toBe(0);
    expect(errors).toEqual([]);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'xss-escaped.png'), fullPage: true });
  });
});

// ─── AC-1 — default port 7772 ────────────────────────────────────────────────

test.describe('KEEL-104 dashboard — default port (no --port flag)', () => {
  let server: ServerHandle;
  let tmpDir: string;

  test.beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keel104-default-'));
    server = startServer([path.join(REPO_ROOT, 'scripts', 'keel-dashboard.cjs')], tmpDir);
    await waitForServer(DEFAULT_PORT);
  });

  test.afterAll(() => {
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'ac1-default-port-stdout.txt'),
      `command: node scripts/keel-dashboard.cjs (no --port flag)\n--- stdout ---\n${server.stdout}\n--- stderr ---\n${server.stderr}\n`,
    );
    killTree(server.proc);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('AC-1: defaults to port 7772 and serves the dashboard', async ({ page }) => {
    expect(server.stdout).toContain(`Dashboard: http://localhost:${DEFAULT_PORT}`);
    await page.goto(`http://localhost:${DEFAULT_PORT}`);
    await expect(page).toHaveTitle('Keel Pipeline Dashboard');
    await expect(page.locator('footer')).toContainText(`Port ${DEFAULT_PORT}`);
  });
});
