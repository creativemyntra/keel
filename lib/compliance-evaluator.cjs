#!/usr/bin/env node
/**
 * compliance-evaluator.cjs — Reusable compliance evaluation logic.
 * Single implementation callable from:
 * - Keel checkRegistry (scripts/keel-state.cjs)
 * - Git pre-push hook (.git/hooks/pre-push)
 * - GitHub Actions workflow (.github/workflows/compliance-check.yml)
 *
 * All three entry points write results to the same audit trail with entry_point tag.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Evaluate compliance for a story.
 * Returns: { passed: boolean, checks: [{id, status, detail}], errors: [string] }
 *
 * Inputs:
 *   - storyId: story identifier (e.g., "HART-287")
 *   - phase: current phase (1-10)
 *   - manifest: story manifest (from .keel/state/<story>/manifest.json)
 *   - cwd: working directory (defaults to process.cwd())
 *   - entryPoint: 'keel'|'git-pre-push'|'github-actions' (for audit trail tagging)
 *
 * Returns: {
 *   passed: boolean (true if all non-SKIP checks passed),
 *   checks: [{id, status, detail}, ...],
 *   errors: [string] (parse errors, missing files, etc.),
 *   timestamp: ISO string,
 *   entry_point: string
 * }
 */
function evaluateCompliance(opts = {}) {
  const {
    storyId,
    phase,
    manifest = {},
    cwd = process.cwd(),
    entryPoint = 'unknown'
  } = opts;

  const results = {
    passed: true,
    checks: [],
    errors: [],
    timestamp: new Date().toISOString(),
    entry_point: entryPoint
  };

  // Quick sanity check
  if (!storyId || !Number.isInteger(phase) || phase < 1 || phase > 10) {
    results.errors.push(`Invalid input: storyId="${storyId}", phase=${phase}`);
    results.passed = false;
    return results;
  }

  const stateDir = path.join(cwd, '.keel', 'state', storyId);

  // ===== C-0014: compliance_scope_declared =====
  if (!manifest.compliance_scopes || manifest.compliance_scopes.length === 0) {
    results.checks.push({
      id: 'C-0014',
      status: 'SKIP',
      detail: 'story is not compliance-scoped'
    });
  } else {
    // CJIS scope
    if (manifest.compliance_scopes.includes('cjis')) {
      const cjisProfilePath = path.join(cwd, 'config', 'cjis-application-profile.json');
      if (!fs.existsSync(cjisProfilePath)) {
        results.checks.push({
          id: 'C-0014',
          status: 'FAIL',
          detail: `story is CJIS-scoped but application profile not found: ${cjisProfilePath}`
        });
        results.passed = false;
      }
    }
    // HIPAA scope
    if (manifest.compliance_scopes.includes('hipaa')) {
      const hipaaProfilePath = path.join(cwd, 'config', 'hipaa-application-profile.json');
      if (!fs.existsSync(hipaaProfilePath)) {
        results.checks.push({
          id: 'C-0014',
          status: 'FAIL',
          detail: `story is HIPAA-scoped but application profile not found: ${hipaaProfilePath}`
        });
        results.passed = false;
      }
    }
    if (results.checks.filter((c) => c.id === 'C-0014').length === 0) {
      results.checks.push({
        id: 'C-0014',
        status: 'PASS',
        detail: `compliance scope declared and profiles found for: ${manifest.compliance_scopes.join(', ')}`
      });
    }
  }

  // ===== C-0015: compliance_evidence_present =====
  if (!manifest.compliance_scopes || manifest.compliance_scopes.length === 0) {
    results.checks.push({
      id: 'C-0015',
      status: 'SKIP',
      detail: 'story is not compliance-scoped'
    });
  } else if (phase < 8) {
    results.checks.push({
      id: 'C-0015',
      status: 'SKIP',
      detail: 'compliance evidence check required at phase 8+ only'
    });
  } else {
    const prescannedFile = path.join(stateDir, 'prescan.json');
    if (!fs.existsSync(prescannedFile)) {
      results.checks.push({
        id: 'C-0015',
        status: 'FAIL',
        detail: `compliance evidence missing before security phase: ${prescannedFile}`
      });
      results.passed = false;
    } else {
      results.checks.push({
        id: 'C-0015',
        status: 'PASS',
        detail: 'prescan.json present — compliance evidence collected before security phase'
      });
    }
  }

  // ===== C-0016: compliance_evidence_fresh =====
  if (!manifest.compliance_scopes || manifest.compliance_scopes.length === 0) {
    results.checks.push({
      id: 'C-0016',
      status: 'SKIP',
      detail: 'story is not compliance-scoped'
    });
  } else if (phase < 8) {
    results.checks.push({
      id: 'C-0016',
      status: 'SKIP',
      detail: 'evidence freshness check required at phase 8+ only'
    });
  } else {
    const prescannedFile = path.join(stateDir, 'prescan.json');
    if (!fs.existsSync(prescannedFile)) {
      results.checks.push({
        id: 'C-0016',
        status: 'FAIL',
        detail: 'prescan.json not found (check C-0015 first)'
      });
      results.passed = false;
    } else {
      try {
        const stats = fs.statSync(prescannedFile);
        const ageMs = Date.now() - stats.mtimeMs;
        const ageHours = Math.round(ageMs / (1000 * 60 * 60));
        const maxAgeHours = 7 * 24; // 7-day freshness threshold

        if (ageHours > maxAgeHours) {
          results.checks.push({
            id: 'C-0016',
            status: 'FAIL',
            detail: `compliance evidence is ${ageHours}h old (max ${maxAgeHours}h)`
          });
          results.passed = false;
        } else {
          results.checks.push({
            id: 'C-0016',
            status: 'PASS',
            detail: `compliance evidence is ${ageHours}h old (within ${maxAgeHours}h threshold)`
          });
        }
      } catch (e) {
        results.errors.push(`Error checking prescan.json freshness: ${e.message}`);
        results.passed = false;
      }
    }
  }

  // ===== C-0017: compliance_pattern_provenance =====
  if (!manifest.compliance_scopes || manifest.compliance_scopes.length === 0) {
    results.checks.push({
      id: 'C-0017',
      status: 'SKIP',
      detail: 'No compliance scopes declared'
    });
  } else {
    const registryFileMap = {
      'cjis': 'cjis-data-element-registry.json',
      'hipaa': 'hipaa-data-element-registry.json',
      'soc2': 'soc2-control-registry.json',
      'nibrs': 'nibrs-pattern-registry.json'
    };

    const allViolations = [];
    let totalActivePatterns = 0;
    let registryCheckFailed = false;

    for (const scope of manifest.compliance_scopes) {
      const registryFile = registryFileMap[scope];
      if (!registryFile) continue; // Unknown scope, skip

      const registryPath = path.join(cwd, 'config', registryFile);
      if (!fs.existsSync(registryPath)) {
        results.checks.push({
          id: 'C-0017',
          status: 'FAIL',
          detail: `${scope} registry not found: ${registryPath}`
        });
        results.passed = false;
        registryCheckFailed = true;
        break;
      }

      try {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        const allPatterns = [
          ...(registry.general_pii_patterns || []),
          ...(registry.cjis_specific_patterns || []),
          ...(registry.hipaa_specific_patterns || []),
          ...(registry.soc2_controls || []),
          ...(registry.nibrs_patterns || [])
        ];

        const scopeViolations = allPatterns.filter((p) => {
          if (p.status !== 'ACTIVE') return false;
          return !p.source || !p.approved_by;
        });

        if (scopeViolations.length > 0) {
          allViolations.push({ scope, violations: scopeViolations });
        }

        totalActivePatterns += allPatterns.filter((p) => p.status === 'ACTIVE').length;
      } catch (e) {
        results.errors.push(`${scope} registry parse error: ${e.message}`);
        results.passed = false;
        registryCheckFailed = true;
        break;
      }
    }

    if (!registryCheckFailed) {
      if (allViolations.length > 0) {
        const details = allViolations.map(({ scope, violations }) => {
          const badPatterns = violations.map((p) => p.category).join(', ');
          return `${scope}: ${violations.length} pattern(s) [${badPatterns}]`;
        }).join(' | ');
        results.checks.push({
          id: 'C-0017',
          status: 'FAIL',
          detail: `ACTIVE patterns lack governance: ${details}`
        });
        results.passed = false;
      } else {
        results.checks.push({
          id: 'C-0017',
          status: 'PASS',
          detail: `all ${totalActivePatterns} ACTIVE patterns across ${manifest.compliance_scopes.join(', ')} have source + approver`
        });
      }
    }
  }

  // ===== C-0018: compliance_control_terminal_state =====
  if (!manifest.compliance_scopes || manifest.compliance_scopes.length === 0) {
    results.checks.push({
      id: 'C-0018',
      status: 'SKIP',
      detail: 'story is not compliance-scoped'
    });
  } else if (phase < 8) {
    results.checks.push({
      id: 'C-0018',
      status: 'SKIP',
      detail: 'compliance control terminal state check required at phase 8+ only'
    });
  } else {
    const controlFile = path.join(stateDir, 'compliance-control.json');
    if (!fs.existsSync(controlFile)) {
      results.checks.push({
        id: 'C-0018',
        status: 'FAIL',
        detail: `compliance control mapping missing: ${controlFile}`
      });
      results.passed = false;
    } else {
      try {
        const controls = JSON.parse(fs.readFileSync(controlFile, 'utf8'));
        if (!Array.isArray(controls.controls)) {
          results.errors.push('compliance control file missing "controls" array');
          results.passed = false;
        } else {
          const blocking = controls.controls.filter((c) => {
            if (c.state === 'PASS' || c.state === 'NOT_APPLICABLE') return false;
            if (c.state === 'FAIL' || c.state === 'NOT_PROVEN') {
              if (c.exception && c.exception.approved_by && c.exception.exception_expiry_date) {
                const expiryDate = new Date(c.exception.exception_expiry_date);
                if (expiryDate > new Date()) return false;
              }
              return true;
            }
            return false;
          });

          if (blocking.length > 0) {
            const details = blocking.map((c) => c.control_id).join(', ');
            results.checks.push({
              id: 'C-0018',
              status: 'FAIL',
              detail: `${blocking.length} compliance control(s) without approved exception: ${details}`
            });
            results.passed = false;
          } else {
            results.checks.push({
              id: 'C-0018',
              status: 'PASS',
              detail: `all compliance controls in terminal state (${controls.controls.length} controls)`
            });
          }
        }
      } catch (e) {
        results.errors.push(`Compliance control file parse error: ${e.message}`);
        results.passed = false;
      }
    }
  }

  // Compute overall passed status: all checks must be PASS or SKIP (no FAIL)
  const failedChecks = results.checks.filter((c) => c.status === 'FAIL');
  if (failedChecks.length > 0) {
    results.passed = false;
  }

  return results;
}

// Export for use by different entry points
module.exports = {
  evaluateCompliance
};
