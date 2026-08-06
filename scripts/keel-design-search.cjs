#!/usr/bin/env node
/**
 * keel-design-search.cjs
 * Query the design-intelligence database by product type + keywords
 *
 * Usage:
 *   node scripts/keel-design-search.cjs "fintech dashboard" --product-type saas-dashboard
 *   node scripts/keel-design-search.cjs "landing page" --product-type landing-page --keywords hero cta
 *   node scripts/keel-design-search.cjs "data table" --product-type data-table
 */

const fs = require('fs');
const path = require('path');

const DESIGN_INTELLIGENCE_DIR = path.join(__dirname, '..', '.keel', 'design-intelligence');

// Load all design intelligence databases
function loadDatabase(filename) {
  const filePath = path.join(DESIGN_INTELLIGENCE_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  ${filename} not found at ${filePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`❌ Failed to parse ${filename}:`, err.message);
    return null;
  }
}

// Main search
function search(query, options = {}) {
  const { productType, keywords = [] } = options;

  const palettesDb = loadDatabase('palettes.json');
  const fontDb = loadDatabase('font-pairings.json');
  const guidelinesDb = loadDatabase('ux-guidelines.json');
  const patternsDb = loadDatabase('product-patterns.json');

  const results = {
    query,
    product_type: productType,
    palettes: [],
    fonts: [],
    critical_guidelines: [],
    patterns: [],
  };

  // Search palettes
  if (palettesDb && palettesDb.palettes) {
    results.palettes = palettesDb.palettes.filter((p) => {
      if (productType && !p.product_types.includes(productType)) return false;
      if (keywords.length > 0) {
        const text = `${p.name} ${p.description} ${p.rationale}`.toLowerCase();
        return keywords.some((kw) => text.includes(kw.toLowerCase()));
      }
      return true;
    });
  }

  // Search font pairings
  if (fontDb && fontDb.pairings) {
    results.fonts = fontDb.pairings.filter((f) => {
      if (productType && !f.product_types.includes(productType)) return false;
      if (keywords.length > 0) {
        const text = `${f.name} ${f.rationale}`.toLowerCase();
        return keywords.some((kw) => text.includes(kw.toLowerCase()));
      }
      return true;
    });
  }

  // Search CRITICAL guidelines
  if (guidelinesDb && guidelinesDb.guidelines) {
    results.critical_guidelines = guidelinesDb.guidelines.filter(
      (g) => g.priority === 'CRITICAL'
    );
  }

  // Search product patterns
  if (patternsDb && patternsDb.product_patterns) {
    results.patterns = patternsDb.product_patterns.filter((p) => {
      if (productType && p.product_type !== productType) return false;
      if (keywords.length > 0) {
        const text = `${p.name} ${p.description}`.toLowerCase();
        return keywords.some((kw) => text.includes(kw.toLowerCase()));
      }
      return true;
    });
  }

  return results;
}

// Format and print results
function printResults(results) {
  console.log(`\n✨ Design Intelligence Search Results\n`);
  console.log(`Query: "${results.query}" | Product Type: ${results.product_type || 'any'}\n`);

  // Palettes
  if (results.palettes.length > 0) {
    console.log(`📋 PALETTES (${results.palettes.length}):`);
    results.palettes.forEach((p) => {
      console.log(`  • ${p.name} (ID: ${p.id})`);
      console.log(`    → Product types: ${p.product_types.join(', ')}`);
      console.log(`    → Rationale: ${p.rationale}`);
      console.log(`    → Primary: ${p.colors.primary}, Accent: ${p.colors.accent}`);
    });
    console.log('');
  }

  // Fonts
  if (results.fonts.length > 0) {
    console.log(`🔤 FONT PAIRINGS (${results.fonts.length}):`);
    results.fonts.forEach((f) => {
      console.log(`  • ${f.name} (ID: ${f.id})`);
      console.log(
        `    → Display: ${f.display_font.name} | Body: ${f.body_font.name} | Mono: ${f.mono_font.name}`
      );
      console.log(`    → Rationale: ${f.rationale}`);
      console.log(`    → Contrast target: ${f.contrast_target}`);
    });
    console.log('');
  }

  // Critical Guidelines
  if (results.critical_guidelines.length > 0) {
    console.log(`⚠️  CRITICAL GUIDELINES (${results.critical_guidelines.length}):`);
    results.critical_guidelines.forEach((g) => {
      console.log(`  • [${g.category}] ${g.guideline}`);
      if (g.details) {
        if (g.details.requirement) {
          console.log(`    → Requirement: ${g.details.requirement}`);
        }
        if (g.details.text_primary) {
          console.log(`    → Text primary: ${g.details.text_primary.requirement}`);
        }
        if (g.details.ui_components) {
          console.log(`    → UI components: ${g.details.ui_components.requirement}`);
        }
        if (g.details.min_width) {
          console.log(`    → Min width: ${g.details.min_width}px`);
        }
        if (g.details.min_height) {
          console.log(`    → Min height: ${g.details.min_height}px`);
        }
      }
    });
    console.log('');
  }

  // Patterns
  if (results.patterns.length > 0) {
    console.log(`🎨 PRODUCT PATTERNS (${results.patterns.length}):`);
    results.patterns.forEach((p) => {
      console.log(`  • ${p.name}`);
      console.log(`    → Product type: ${p.product_type}`);
      console.log(`    → Description: ${p.description}`);
      console.log(`    → Layout structure: ${p.layout_structure.slice(0, 2).join(', ')}...`);
      console.log(`    → Palette recommendations: ${p.palette_recommendations.join(', ')}`);
      console.log(`    → Font recommendations: ${p.font_recommendations.join(', ')}`);
    });
    console.log('');
  }

  // Summary
  const total = results.palettes.length + results.fonts.length + results.critical_guidelines.length + results.patterns.length;
  console.log(
    `Summary: ${total} items found (${results.palettes.length} palettes, ${results.fonts.length} fonts, ${results.critical_guidelines.length} guidelines, ${results.patterns.length} patterns)`
  );
  console.log('');
}

// CLI entry point
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(
    'Usage: node scripts/keel-design-search.cjs "<query>" --product-type <type> [--keywords ...]'
  );
  console.log(
    'Example: node scripts/keel-design-search.cjs "dashboard" --product-type saas-dashboard'
  );
  process.exit(1);
}

const query = args[0];
let productType = null;
let keywords = [];

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--product-type' && args[i + 1]) {
    productType = args[i + 1];
    i++;
  } else if (args[i] === '--keywords') {
    keywords = args.slice(i + 1);
    break;
  }
}

const results = search(query, { productType, keywords });
printResults(results);

// Also output JSON to stdout for programmatic use
console.log('--- JSON OUTPUT ---');
console.log(JSON.stringify(results, null, 2));

module.exports = { search, loadDatabase };
