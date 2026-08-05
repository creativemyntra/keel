# Playwright E2E Test Flow for Keel Plugin

## Overview
Playwright drives **real browser** tests against a **real running server**. Tests validate plugin CLI commands by spinning up a web dashboard and verifying the UI/API.

---

## Test Architecture

### Configuration (playwright.config.ts)

| Setting | Local Dev | CI |
|---------|-----------|-----|
| Browser | 3 projects: Chromium, Firefox, WebKit | Headless Chromium only |
| Speed | Slow-motion 300ms (visible) | Fast (headless) |
| Server | Auto-started (php -S localhost:8000) | Auto-started |
| Parallelization | Single worker (headed visible) | Parallel (headless) |
| Screenshots | On failure + manual | On failure + manual |
| Video | Always record | Only on failure |
| Snapshots | Auto-create on first run | Fail on missing |
| Reporters | List + HTML + JSON | List + JSON (CI) |

### Test Projects (Browsers)
```
projects: [
  { name: 'chromium', use: devices['Desktop Chrome'] },
  { name: 'firefox', use: devices['Desktop Firefox'] },
  { name: 'webkit', use: devices['Desktop Safari'] }
]
```

Each test runs **3 times** (once per browser, independent).

---

## Test Files & What They Test

### 1. **KEEL-104-dashboard.spec.ts** (Pipeline Status Dashboard)

**What it tests:**
- `node bin/keel.js dashboard --port=7891` (server startup)
- Dashboard web UI renders story table correctly
- Stories sorted by updated_at DESC
- Auto-refresh via meta tag
- Port override flag works
- Empty state when no stories

**Flow:**
```
1. Start real keel.js dashboard process on port 7891
2. Wait for server to respond (HTTP GET /)
3. Open Chromium browser → http://localhost:7891
4. Assert table rows, headers, sort order
5. Take screenshots (docs/e2e-evidence/KEEL-104/)
6. Kill process tree
```

**Console Error Capture:**
```typescript
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`);
```

---

### 2. **KEEL-105-dashboard-host.spec.ts** (Dashboard Hosting)

**What it tests:**
- Dashboard serves full HTML (not SPA)
- Security headers present (no XSS vulnerability)
- Dashboard works on custom port
- Renders complete without errors

**Flow:**
```
1. Start dashboard on port 7891 + 7892 (dual-server test)
2. Fetch raw HTML via HTTP
3. Verify Content-Type, X-Content-Type-Options headers
4. Assert no inline script XSS vectors
5. Console error capture (same as KEEL-104)
```

---

### 3. **P-16-visual-advanced.spec.ts** (Visual Regression Testing)

**What it tests:**
- Playwright snapshot system (baseline comparison)
- MASKS array (dynamic content filtering)
- stablePage fixture behavior
- Screenshot naming conventions

**Flow:**
```
1. Navigate to http://localhost:8000/test-page
2. Stabilize: wait for network, animations, clear focus
3. Take snapshot with MASKS applied
4. Compare against baseline (tests/e2e/__screenshots__/chromium/...)
5. On first run: create baseline
6. On subsequent runs: diff if changed
```

**Baseline Storage:**
```
tests/e2e/__screenshots__/
├── chromium/
│   └── P-16-visual-advanced.spec.ts/
│       ├── no-mask-unmasked.png          (baseline)
│       ├── component-renders-actual.png  (on failure)
│       └── component-renders-diff.png    (on failure)
├── firefox/
└── webkit/
```

---

### 4. **profile-upload.spec.ts** (User Profile Upload Flow)

**What it tests:**
- File upload from profile form
- JPEG validation
- Mobile viewport responsiveness (375x812)
- Form submission and success state

**Flow:**
```
1. Navigate to /profile page
2. Upload valid JPEG file
3. Assert success message appears
4. Test responsive (sets viewport to 375x812)
5. Verify form still interactive on mobile
```

---

## Fixtures (tests/e2e/fixtures.ts)

### Before Fixes (Broken ❌)
```typescript
export const stablePage = test.extend({
  stablePage: async ({ page }, use) => {
    await use(page);  // ← NO STABILIZATION!
  },
});
```
**Problem:** Fixture was a no-op. Tests had no error capture.

### After Fixes (Fixed ✅)
```typescript
export const stablePage = test.extend({
  stablePage: async ({ page }, use) => {
    // Capture console errors automatically
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`);

    await use(page);

    // Report errors to test output
    if (errors.length > 0) {
      console.warn(`Page errors: ${errors.join('; ')}`);
    }
  },
});
```

**What it does:**
- ✅ Auto-captures console.error and pageerror
- ✅ Warns in test output if errors found
- ✅ Useful for debugging plugin issues

---

## Test Execution Flow

### Local (Developer)
```bash
# Start tests
npx playwright test

# What happens:
# 1. playwright.config.ts loads
# 2. webServer spawns: cd tests/fixture-app && php -S localhost:8000
# 3. Waits for http://localhost:8000 to respond
# 4. Launches Chromium (headed, slow-motion 300ms)
# 5. Runs tests in tests/e2e/*.spec.ts
# 6. On failure: saves screenshot + video
# 7. Generates HTML report: playwright-report/html/index.html
# 8. Browser stays open so you can debug
```

### CI (GitHub Actions)
```bash
# Run tests
CI=true npx playwright test

# What happens:
# 1. Sets headless: true, workers: auto (parallel)
# 2. Disables slow-motion (300ms → 0ms)
# 3. webServer spawns same as local
# 4. Runs all tests headless in parallel
# 5. On failure: video + screenshot saved
# 6. JSON report sent to CI system
# 7. Exit code: 0 = PASS, 1 = FAIL
```

---

## Server Integration

### Fixed Port (After V-3 fix)
**Before:**
```typescript
// In agents/e2e-engineer.md (BROKEN)
const APP_URL = 'http://localhost:8080';  // ← Hardcoded!
await page.goto(APP_URL);
```

**After:**
```typescript
// In agents/e2e-engineer.md (FIXED)
await page.goto('/subscriptions');  // ← Uses baseURL from config
```

**Config resolves to:**
```typescript
baseURL: process.env.KEEL_APP_URL ?? process.env.BASE_URL ?? 'http://localhost:8000'
webServer: { command: 'cd tests/fixture-app && php -S localhost:8000' }
```

---

## What Gets Captured on Failure

### Screenshots
```
playwright-report/test-results/
├── KEEL-104-dashboard.spec.ts-chromium/
│   ├── test-AC-1-server-starts-1-actual.png
│   ├── test-AC-1-server-starts-1-expected.png  (if snapshot test)
│   └── test-AC-1-server-starts-1-diff.png      (diff overlay)
```

### Video
```
playwright-report/test-results/
└── KEEL-104-dashboard.spec.ts-chromium-video.webm
```

### Console Error Capture (After Fix)
```
✓ test-AC-1-server-starts (12.3s)
  Page errors during test: console.error: Undefined variable foo
```

---

## Visual Baseline Workflow

### First Run
```
1. Test takes snapshot
2. No baseline exists
3. Config: updateSnapshots: 'missing' → creates baseline
4. Tests PASS automatically
```

### Subsequent Runs
```
1. Test takes snapshot
2. Baseline exists
3. Playwright compares pixel-by-pixel (threshold: 0.1)
4. If match: PASS
5. If diff: FAIL + saves actual/diff images
```

### Human Approval
```bash
# When a snapshot changes intentionally:
1. Developer reviews diff images in playwright-report/
2. Developer runs: npx playwright test --update-snapshots
3. Developer runs: node ~/.keel/bin/keel-state.cjs visual-baseline-approve STORY-ID --reviewer "Name" --notes "Why changed"
4. Handshake gate verifies approval before merge
```

---

## Known Issues (Before Fixes)

| Issue | Symptom | Fixed By |
|-------|---------|----------|
| **V-1** | PNG hashes corrupted | Read binary, not UTF-8 |
| **V-2** | Can't verify baseline approvals | Corrected audit log reading |
| **V-3** | Tests connect to wrong port (8080 vs 8000) | Changed to relative URLs |
| **V-4** | Docs mislead about project names | Updated to match config |
| **V-5** | stablePage fixture broken (no-op) | Added console error capture |
| **V-6** | Console errors missed | Auto-capture in fixture |

---

## After Fixes: What Works

✅ Tests run out-of-box (correct port)
✅ Console errors auto-captured
✅ Baseline approval workflow functional
✅ Snapshots compare correctly (binary PNG hashes)
✅ Docs match actual test projects

---

## How to Run Tests Locally

```bash
# Install dependencies
npm install

# Run all tests (watches for changes)
npx playwright test

# Run specific test file
npx playwright test KEEL-104

# Run with UI mode (interactive)
npx playwright test --ui

# Run headed (visible browser)
npx playwright test --headed

# Update snapshots (if intentional visual change)
npx playwright test --update-snapshots

# Generate HTML report
npx playwright show-report
```

---

## Summary

**Playwright test flow:**
1. Start real server (PHP dev server on :8000)
2. Launch real browser (Chromium/Firefox/WebKit)
3. Navigate to test URLs
4. Assert UI behavior (tables, forms, links)
5. Capture console errors automatically (after fix)
6. Take snapshots for visual regression
7. Generate HTML report with evidence

**For plugin developers:** Tests validate that your plugin CLI commands produce correct dashboard output, with automatic error detection and visual proof.

