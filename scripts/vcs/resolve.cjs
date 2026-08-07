'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { createVCSProvider } = require('./index.cjs');

const KEEL_ROOT = path.join(__dirname, '../../');
const VCS_CONFIG_PATH = path.join(KEEL_ROOT, '.keel', 'vcs.yml');

/**
 * Load and validate VCS configuration
 * FAIL-CLOSED: missing or malformed config → explicit error, no fallback
 *
 * @returns {object} - Validated configuration
 * @throws Error with diagnostic if config missing/invalid
 */
function loadVcsConfig() {
  if (!fs.existsSync(VCS_CONFIG_PATH)) {
    const err = new Error(
      `HALT: VCS configuration error — VCS config missing: ${VCS_CONFIG_PATH}\n` +
      `Initialize with: keel setup-vcs`
    );
    err.code = 'VCS_CONFIG_MISSING';
    err.exitCode = 2;
    throw err;
  }

  let config;
  try {
    const raw = fs.readFileSync(VCS_CONFIG_PATH, 'utf8');
    config = yaml.load(raw);
  } catch (err) {
    const e = new Error(
      `HALT: VCS configuration error — Malformed YAML in ${VCS_CONFIG_PATH}\n` +
      `Error: ${err.message}`
    );
    e.code = 'VCS_CONFIG_INVALID';
    e.exitCode = 2;
    throw e;
  }

  // Validate required fields
  const required = ['provider', 'owner', 'repo'];
  for (const field of required) {
    if (!config[field]) {
      const err = new Error(
        `HALT: VCS configuration error — Missing required field in ${VCS_CONFIG_PATH}: ${field}`
      );
      err.code = 'VCS_CONFIG_INCOMPLETE';
      err.exitCode = 2;
      throw err;
    }
  }

  return config;
}

/**
 * Resolve VCS provider instance
 * Loads config, validates it, instantiates provider
 *
 * @returns {VCSProvider} - Provider instance ready to use
 * @throws Error if config invalid or provider unknown
 */
function resolveVcsProvider() {
  const config = loadVcsConfig();

  try {
    const provider = createVCSProvider(config);
    return provider;
  } catch (err) {
    const e = new Error(
      `HALT: VCS configuration error — ${err.message}`
    );
    e.code = 'VCS_PROVIDER_INVALID';
    e.exitCode = 2;
    throw e;
  }
}

/**
 * Check if VCS config exists (for setup workflow)
 * @returns {boolean}
 */
function vcsConfigExists() {
  return fs.existsSync(VCS_CONFIG_PATH);
}

module.exports = {
  loadVcsConfig,
  resolveVcsProvider,
  vcsConfigExists,
  VCS_CONFIG_PATH,
};
