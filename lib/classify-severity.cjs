/**
 * classifySeverity — Determine if matched CJIS categories contain 'hard' severity patterns.
 * Hard → CJIS_VIOLATION (blocking). Otherwise → SUSPECT (warning).
 * @param {Set<string>} matched — Category names detected in content
 * @param {Array} patterns — Pattern objects with {category, severity, ...}
 * @returns {{category: string, matched: string[]}} — Violation level + matched categories
 */
function classifySeverity(matched, patterns) {
  const hard = [...matched].some((c) => patterns.find((p) => p.category === c)?.severity === 'hard');
  return { category: hard ? 'CJIS_VIOLATION' : 'SUSPECT', matched: [...matched] };
}

module.exports = classifySeverity;
