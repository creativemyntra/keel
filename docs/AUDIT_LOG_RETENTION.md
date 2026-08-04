# Audit Log Retention Policy

## Overview

Audit logs (`.keel/state/*/audit-log.jsonl`) are **append-only**, **git-tracked**, and subject to strict retention requirements for compliance (CJIS ≥ 1 year).

## Append-Only Enforcement

### What Is Append-Only?

Audit logs can only grow — no line can be modified, deleted, or reordered once committed. This ensures:
- **Integrity**: Log tampering is immediately detectable
- **Compliance**: Immutable records satisfy audit requirements
- **Traceability**: Every phase, decision, and action is permanently recorded

### How It Works

1. **Pre-Push Guard** (`scripts/keel-push-guard.cjs` → `scripts/keel-audit-guard.cjs`)
   - On every push to any branch, checks all modified `audit-log.jsonl` files
   - Verifies remote version is a line-prefix of local version
   - Verifies no existing lines were modified (byte-for-byte identical)
   - Verifies hash chain is valid on any new entries
   - Blocks with `AUDIT LOG INTEGRITY CHECK FAILED` if violation detected

2. **CI Verification** (`.github/workflows/ci.yml`)
   - Runs `scripts/test-audit-log-integrity.cjs` on every push
   - Verifies all audit logs pass chain integrity check
   - Fails CI if any log is corrupted

3. **Chain Hashing** (`scripts/lib/audit-chain.cjs`)
   - Each entry has `prev_hash` (SHA-256 of full previous line or 'genesis')
   - Each entry has `self_hash` (SHA-256 of entry without self_hash field)
   - Detects both modification and reordering

### Violation Examples

```bash
# ✗ BLOCKED — modifying an existing line
Line 2: local line differs from remote (content modified)

# ✗ BLOCKED — deleting a line
3 remote lines, only 2 local lines (deleted lines)

# ✗ BLOCKED — broken hash chain on new entries
Hash chain broken on new entries:
  Line 3: hash chain broken — expected abc... got xyz...
```

## Retention & Archival

### Git Is a Working Copy

`.keel/state/*/audit-log.jsonl` is committed to git for:
- Code review (audit context in PRs)
- CI enforcement
- Local development reference

Git is **NOT** an archival system and has limitations:
- Size constraints (repo bloat over time)
- History cleanup (rebase, force-push)
- Rotation not built-in
- No automatic backup

### Compliance Requirement

**CJIS ≥ 1 year**: Audit logs must be retained for minimum 1 year per CJIS standards.

### Recommended Archival Strategy

1. **Monthly Export** (automated)
   - Export audit logs to immutable storage (S3, Azure Blob with WORM, GCS)
   - Compress and sign with org certificate
   - Store with metadata: date range, story counts, hash verification

2. **Local Offline Backup**
   - Periodic tape/cold storage backup of full audit corpus
   - Keep alongside source code archives
   - Document retention schedule

3. **Deletion Policy**
   - After 1+ years in immutable archive AND backup is verified:
     - Remove from git (via `git filter-branch` or `bfg-repo-cleaner`)
     - Keep only in archive
     - Document removal in compliance log

### Example Archive Export (Node.js)

```javascript
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const stateRoot = '.keel/state';
const timestamp = new Date().toISOString().split('T')[0];
const archivePath = `archives/audit-logs-${timestamp}.jsonl`;

const stories = fs.readdirSync(stateRoot);
for (const story of stories) {
  const auditLog = path.join(stateRoot, story, 'audit-log.jsonl');
  if (fs.existsSync(auditLog)) {
    const content = fs.readFileSync(auditLog, 'utf8');
    fs.appendFileSync(archivePath, content);
  }
}

// Sign archive
const sig = crypto.createHmac('sha256', process.env.ARCHIVE_SECRET)
  .update(fs.readFileSync(archivePath))
  .digest('hex');
fs.writeFileSync(`${archivePath}.sig`, sig);
```

## Related Documentation

- [Audit Log Chain Verification](./AUDIT_CHAIN.md) — hash chain mechanics
- [CJIS Compliance Checklist](./CJIS.md) — audit requirements
- [State Management Guide](./STATE_MANAGEMENT.md) — `.keel/state/` structure
