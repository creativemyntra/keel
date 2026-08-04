'use strict';

const crypto = require('crypto');

/**
 * Compute SHA-256 hash of a line of text (prev_hash input).
 * Used to chain audit log entries via prev_hash field.
 *
 * @param {string} prevLineText - Full text of previous line (or 'genesis' for line 1)
 * @returns {string} SHA-256 hex digest
 */
function chainHash(prevLineText) {
  return crypto.createHash('sha256').update(prevLineText, 'utf8').digest('hex');
}

/**
 * Verify the hash chain integrity of audit log lines.
 * Returns array of error strings; empty array means chain is valid.
 * Checks both prev_hash chain and self_hash integrity.
 *
 * @param {string[]} lines - Array of JSON-parsed audit log lines (as strings before parsing)
 * @returns {string[]} Array of error messages (empty = valid)
 */
function verifyChain(lines) {
  const crypto = require('crypto');
  const errors = [];
  let prevLineText = 'genesis';

  function sha256line(text) {
    return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
  }

  for (let i = 0; i < lines.length; i++) {
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch (e) {
      errors.push(`Line ${i + 1}: JSON parse error: ${e.message}`);
      prevLineText = lines[i]; // Advance to next line regardless
      continue;
    }

    // Verify prev_hash chain
    if (entry.prev_hash !== undefined) {
      const expected = chainHash(prevLineText);
      if (entry.prev_hash !== expected) {
        errors.push(`Line ${i + 1}: hash chain broken — expected ${expected.slice(0, 12)}… got ${String(entry.prev_hash).slice(0, 12)}…`);
      }
    }

    // Verify self_hash integrity
    if (entry.self_hash !== undefined) {
      const entryForHash = { ...entry };
      delete entryForHash.self_hash;
      const computed = sha256line(JSON.stringify(entryForHash));
      if (entry.self_hash !== computed) {
        errors.push(`Line ${i + 1}: self_hash mismatch — entry content altered`);
      }
    }

    // Move to next line
    prevLineText = lines[i];
  }

  return errors;
}

module.exports = { chainHash, verifyChain };
