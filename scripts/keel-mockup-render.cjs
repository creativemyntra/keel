#!/usr/bin/env node
/**
 * keel-mockup-render.cjs
 * Render HTML mockup(s) to PNG for human design approval
 *
 * Usage:
 *   node scripts/keel-mockup-render.cjs <story-id> [--viewport desktop|mobile|both]
 *
 * Renders:
 *   docs/design/<story>-*.html → docs/design/<story>-*.png
 *   Desktop: 1440×900
 *   Mobile: 375×812
 *
 * Output: JSON array of PNG file paths + checksums
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

async function renderMockups(storyId, viewport = 'both') {
  const designDir = path.join(process.cwd(), 'docs', 'design');

  if (!fs.existsSync(designDir)) {
    console.error(`❌ Design directory not found: ${designDir}`);
    process.exit(1);
  }

  // Find all mockup HTML files for this story
  const htmlFiles = fs
    .readdirSync(designDir)
    .filter((f) => f.startsWith(`${storyId}-`) && f.endsWith('-mockup.html'))
    .map((f) => path.join(designDir, f));

  if (htmlFiles.length === 0) {
    console.error(`❌ No mockup HTML files found for story: ${storyId}`);
    console.error(`   Expected: docs/design/${storyId}-*.html`);
    process.exit(1);
  }

  const results = {
    story_id: storyId,
    timestamp: new Date().toISOString(),
    viewports: [],
    mockups: [],
  };

  const viewports = viewport === 'both' ? ['desktop', 'mobile'] : [viewport];
  results.viewports = viewports;

  console.log(`🎨 Rendering ${htmlFiles.length} mockup(s) for ${storyId}...\n`);

  for (const htmlFile of htmlFiles) {
    const baseName = path.basename(htmlFile, '.html');
    console.log(`  📄 ${baseName}`);

    for (const vp of viewports) {
      const [width, height] = vp === 'desktop' ? [1440, 900] : [375, 812];
      const pngFile = path.join(designDir, `${baseName}-${vp}.png`);

      try {
        // Use Playwright (via npx) to render
        const playwrightScript = `
          const { chromium } = require('playwright');
          (async () => {
            const browser = await chromium.launch();
            const page = await browser.newPage();
            await page.setViewportSize({ width: ${width}, height: ${height} });
            await page.goto('file://${htmlFile}');
            await page.screenshot({ path: '${pngFile}', fullPage: false });
            await browser.close();
          })();
        `;

        // Check if Playwright is available
        try {
          execSync('npx playwright --version', { stdio: 'ignore' });
        } catch {
          console.error(
            '❌ Playwright not found. Install: npm install --save-dev @playwright/test'
          );
          process.exit(1);
        }

        // Render via Node + Playwright
        const tmpScript = path.join(process.cwd(), '.keel', 'tmp-render.cjs');
        fs.mkdirSync(path.dirname(tmpScript), { recursive: true });
        fs.writeFileSync(
          tmpScript,
          'const { chromium } = require("@playwright/test");\n' + playwrightScript
        );

        execSync(`node ${tmpScript}`, { stdio: 'pipe', encoding: 'utf8' });
        fs.unlinkSync(tmpScript);

        if (!fs.existsSync(pngFile)) {
          throw new Error(`PNG not written to ${pngFile}`);
        }

        // Compute SHA256 hash of PNG file
        const pngData = fs.readFileSync(pngFile);
        const pngHash = crypto.createHash('sha256').update(pngData).digest('hex');

        results.mockups.push({
          html_file: path.relative(process.cwd(), htmlFile),
          png_file: path.relative(process.cwd(), pngFile),
          viewport: vp,
          dimensions: `${width}x${height}`,
          file_size_bytes: pngData.length,
          png_hash: pngHash,
        });

        console.log(`    ✓ ${vp} → ${path.basename(pngFile)} (${pngHash.slice(0, 8)}...)`);
      } catch (err) {
        console.error(`    ✗ ${vp} render failed: ${err.message}`);
        process.exit(1);
      }
    }
  }

  console.log(`\n✅ Rendered ${results.mockups.length} PNG(s)\n`);
  return results;
}

// CLI entry point
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/keel-mockup-render.cjs <story-id> [--viewport desktop|mobile|both]');
  console.log('Example: node scripts/keel-mockup-render.cjs STORY-123');
  process.exit(1);
}

const storyId = args[0];
let viewport = 'both';
if (args.includes('--viewport') && args[args.indexOf('--viewport') + 1]) {
  viewport = args[args.indexOf('--viewport') + 1];
}

renderMockups(storyId, viewport)
  .then((results) => {
    // Output JSON for programmatic use
    console.log('--- JSON OUTPUT ---');
    console.log(JSON.stringify(results, null, 2));

    // Also write to .keel/state for audit
    const stateDir = path.join(process.cwd(), '.keel', 'state', storyId);
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(
      path.join(stateDir, 'mockup-render-output.json'),
      JSON.stringify(results, null, 2)
    );

    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Render failed:', err.message);
    process.exit(1);
  });

module.exports = { renderMockups };
