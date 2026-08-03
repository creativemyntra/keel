/**
 * Global setup for visual regression testing.
 *
 * BASELINE OS CONTRACT:
 * =====================
 *
 * Visual baselines (PNG snapshots) are compared and generated on the SAME OS family.
 * Baselines are per-project, per-viewport:
 * - tests/e2e/__screenshots__/chromium-desktop/...
 * - tests/e2e/__screenshots__/chromium-mobile-375/...
 *
 * LOCAL RUNS (macOS, Windows, Linux):
 * - If a baseline exists locally, the test compares against it.
 * - If no baseline exists locally, Playwright creates one ('missing' mode).
 * - Local baselines are convenience — they are NOT the source of truth.
 *
 * CI RUNS (Linux container):
 * - Linux baselines are the committed source of truth.
 * - If a baseline is missing in CI, the test FAILS with "baseline missing"
 *   instead of silently generating it (updateSnapshots: 'none').
 * - All test machines in CI run on the same Linux OS, ensuring pixel
 *   consistency.
 *
 * BASELINE MUTATIONS:
 * - When a design change intentionally invalidates baselines, the agent
 *   reports which tests fail and which baselines changed.
 * - The human reviews the diff images (expected/actual/diff).
 * - The human runs: npx playwright test --update-snapshots
 * - The human runs: node ~/.keel/bin/keel-state.cjs visual-baseline-approve <story-id> --reviewer <name> --notes "<why>"
 * - The gate verifies the visual_baseline approval action before allowing merge.
 *
 * ENFORCEMENT:
 * - isCI (CI=true) → updateSnapshots: 'none' (fail on missing, never auto-create)
 * - Local → updateSnapshots: 'missing' (create on first run, convenience)
 * - Agents are FORBIDDEN from running --update-snapshots (human-only).
 */

export default async function () {
  // Placeholder: no-op. Document the contract above; enforcement is in config + gate.
}
