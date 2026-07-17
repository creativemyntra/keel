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
const BADGE_PORT = CLI_PORT + 4; // 7895 (+3 = 7894 is reserved by the KEEL-105 spec)
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

/**
 * KEEL-105 maintenance: expectations for the "real repo state" block are now
 * derived from the live manifests instead of a hard-coded July-2026 snapshot
 * (which rotted the moment story KEEL-105 was initialised). This mirrors only
 * the trivial, documented sort contract (updated_at DESC, ISO-8601
 * lexicographic; error rows last) — not the server's rendering logic.
 */
interface ExpectedStory { id: string; updated_at: string; error: boolean }

function readExpectedStories(): ExpectedStory[] {
  const stateDir = path.join(REPO_ROOT, '.keel', 'state');
  const rows: ExpectedStory[] = [];
  for (const ent of fs.readdirSync(stateDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    try {
      const m = JSON.parse(
        fs.readFileSync(path.join(stateDir, ent.name, 'manifest.json'), 'utf8'),
      );
      rows.push({ id: m.story_id || ent.name, updated_at: m.updated_at || '', error: false });
    } catch {
      rows.push({ id: ent.name, updated_at: '', error: true });
    }
  }
  rows.sort((a, b) => {
    if (a.error && !b.error) return 1;
    if (!a.error && b.error) return -1;
    return (b.updated_at || '').localeCompare(a.updated_at || '');
  });
  return rows;
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

  test('AC-2: page loads with title, header and a 6-column table of every story in .keel/state', async ({ page }) => {
    const errors = collectPageErrors(page);
    const expected = readExpectedStories();
    await page.goto(BASE);

    await expect(page).toHaveTitle('Keel Pipeline Dashboard');
    await expect(page.locator('h1')).toHaveText('Keel Pipeline Dashboard');

    // 6 column headers in the designed order
    await expect(page.locator('thead th')).toHaveText([
      'Story ID', 'Title', 'Scope', 'Current Phase', 'Status', 'Idle Time',
    ]);

    // one row per story directory in .keel/state/ (derived, not hard-coded)
    expect(expected.length).toBeGreaterThanOrEqual(4);
    await expect(page.locator('tbody tr')).toHaveCount(expected.length);

    // KEEL-104 row: title, scope, phase label, badge — the story is closed, so
    // its manifest (current_phase 13 → plain "Phase 13" label, COMPLETE) is frozen.
    const row104 = page.locator('tbody tr', { hasText: 'KEEL-104' });
    await expect(row104.locator('td').nth(1)).toHaveText('Add pipeline status web dashboard');
    await expect(row104.locator('td').nth(2)).toHaveText('feature');
    await expect(row104.locator('td').nth(3)).toHaveText('Phase 13');
    await expect(row104.locator('td').nth(4).locator('span')).toHaveText('COMPLETE');

    // Every phase cell uses the designed label format
    const phaseCells = await page.locator('tbody tr td:nth-child(4)').allTextContents();
    for (const label of phaseCells) {
      expect(label.trim()).toMatch(/^(Phase \d+( — .+)?|unknown)$/);
    }

    // Idle time convention: "Xh Ym" (>= 60 min) or "Xm Ys" (< 60 min) or "unknown"
    const idleCells = await page.locator('tbody tr td:nth-child(6)').allTextContents();
    expect(idleCells).toHaveLength(expected.length);
    for (const idle of idleCells) {
      expect(idle.trim()).toMatch(/^(\d+h \d+m|\d+m \d+s|unknown)$/);
    }

    expect(errors).toEqual([]);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'ac2-ac3-dashboard-table.png'), fullPage: true });
  });

  test('AC-2: status badges show correct state and color per story', async ({ page }) => {
    await page.goto(BASE);

    // KEEL-101..104 are closed stories: all expected phase files are present
    // on disk forever -> COMPLETE (green #16a34a). Frozen facts, safe to pin.
    for (const id of ['KEEL-101', 'KEEL-102', 'KEEL-103', 'KEEL-104']) {
      const badge = page.locator('tbody tr', { hasText: id }).locator('td').nth(4).locator('span');
      await expect(badge).toHaveText('COMPLETE');
      await expect(badge).toHaveCSS('background-color', 'rgb(22, 163, 74)');
    }

    // Full badgeHtml() text -> background-color mapping, asserted in the
    // browser over EVERY rendered badge (scripts/keel-dashboard.cjs lines
    // 135-140). The unit suite (tests/keel-dashboard.test.cjs) asserts badge
    // TEXT only, so this browser-level check is the sole guard on the colors.
    // Deriving the expected color from each badge's own text at test time
    // keeps the assertion exact for in-flight stories (KEEL-105, KEEL-106+)
    // regardless of which state they are in when the suite runs. Error rows
    // render an em-dash instead of a badge span, hence the valid-row count.
    const BADGE_COLORS: Record<string, string> = {
      'COMPLETE':    'rgb(22, 163, 74)',   // #16a34a green
      'IN PROGRESS': 'rgb(217, 119, 6)',   // #d97706 amber
      'HALTED':      'rgb(220, 38, 38)',   // #dc2626 red
    };
    const badgeLocator = page.locator('tbody tr td:nth-child(5) span');
    const badgeCount = await badgeLocator.count();
    expect(badgeCount).toBe(readExpectedStories().filter((s) => !s.error).length);
    for (let i = 0; i < badgeCount; i++) {
      const badge = badgeLocator.nth(i);
      const text = (await badge.textContent())?.trim() ?? '';
      expect(Object.keys(BADGE_COLORS)).toContain(text);
      await expect(badge).toHaveCSS('background-color', BADGE_COLORS[text]);
    }
  });

  test('AC-3: stories sorted by updated_at descending', async ({ page }) => {
    await page.goto(BASE);
    const ids = await page.locator('tbody tr td:first-child').allTextContents();
    // Expected order derived from live manifests (updated_at DESC, error rows last)
    const expected = readExpectedStories().map((s) => s.id);
    expect(ids.map((s) => s.trim())).toEqual(expected);
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

// ─── AC-2 — badge color truth table (deterministic fixture) ──────────────────
//
// The live-repo badge test above derives expected colors from whatever badge
// text is rendered, so a state absent from the repo at run time (e.g. HALTED,
// or IN PROGRESS once every story closes) would not be exercised there. This
// fixture pins one story per deriveStatus() state so all three text->color
// pairs are asserted in the browser on every run, independent of repo state.

test.describe('KEEL-104 dashboard — badge color truth table (fixture with all three states)', () => {
  let server: ServerHandle;
  let tmpDir: string;
  const BASE = `http://localhost:${BADGE_PORT}`;

  test.beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keel104-badges-'));
    const stateDir = path.join(tmpDir, '.keel', 'state');
    const now = new Date().toISOString();
    const mkStory = (id: string, extra: Record<string, unknown>, phaseFiles: string[]) => {
      const dir = path.join(stateDir, id);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({
        story_id: id, title: `${id} fixture`, scope: 'feature',
        expected_phases: [1, 2], current_phase: 2, updated_at: now, ...extra,
      }, null, 2));
      for (const f of phaseFiles) fs.writeFileSync(path.join(dir, f), '{}');
    };
    mkStory('FIX-COMPLETE', {}, ['01-a.json', '02-b.json']); // all expected phases done
    mkStory('FIX-PROGRESS', {}, ['01-a.json']);              // partial -> IN PROGRESS
    mkStory('FIX-HALTED', { halted: true }, ['01-a.json']);  // manifest.halted -> HALTED
    server = startServer(
      [path.join(REPO_ROOT, 'scripts', 'keel-dashboard.cjs'), '--port', String(BADGE_PORT)],
      tmpDir,
    );
    await waitForServer(BADGE_PORT);
  });

  test.afterAll(() => {
    killTree(server.proc);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('AC-2: COMPLETE green, IN PROGRESS amber, HALTED red — all three asserted', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto(BASE);

    const cases: Array<[string, string, string]> = [
      ['FIX-COMPLETE', 'COMPLETE',    'rgb(22, 163, 74)'],  // #16a34a
      ['FIX-PROGRESS', 'IN PROGRESS', 'rgb(217, 119, 6)'],  // #d97706
      ['FIX-HALTED',   'HALTED',      'rgb(220, 38, 38)'],  // #dc2626
    ];
    for (const [id, text, color] of cases) {
      const badge = page.locator('tbody tr', { hasText: id }).locator('td').nth(4).locator('span');
      await expect(badge).toHaveText(text);
      await expect(badge).toHaveCSS('background-color', color);
    }

    expect(errors).toEqual([]);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'ac2-badge-color-truth-table.png'), fullPage: true });
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
