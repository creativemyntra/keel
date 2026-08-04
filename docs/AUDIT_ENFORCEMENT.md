# Audit Log Append-Only Enforcement

## Feature Summary

Added server-side and pre-push enforcement to ensure audit logs (`.keel/state/*/audit-log.jsonl`) are **append-only** and cannot be tampered with. This provides immutable audit trails required for compliance (CJIS ≥ 1 year).

## Components Added

### 1. scripts/keel-audit-guard.cjs
Server-side guard that validates audit logs on every push.

**Features:**
- Fetches remote version of audit logs via `git show origin/branch:path`
- Verifies remote version is a line-prefix of local version (append-only)
- Detects modified lines (byte-for-byte comparison)
- Detects deleted lines (line count check)
- Verifies hash chain integrity on new entries using `verifyChain()`
- Blocks push with clear error messages on any violation

**Exit codes:**
- `0` = all audit logs passed integrity checks
- `1` = append-only violation or chain integrity failure

### 2. scripts/test-audit-append-only.cjs
Automated test suite with 3 test cases:

1. **Valid append** — new lines added to audit log (PASS)
2. **Mid-file edit** — existing line modified (BLOCK)
3. **Line deletion** — existing line removed (BLOCK)

All 3 tests pass ✓

### 3. Integration Points

#### Pre-Push Hook (`.git/hooks/pre-push`)
Updated to call `keel-audit-guard.cjs` after branch strategy validation:
```bash
# 1. Branch strategy checks (pre-push-validate.cjs)
# 2. Audit log append-only checks (keel-audit-guard.cjs) ← NEW
```

#### CI Workflow (`.github/workflows/ci.yml`)
Added step to verify audit logs on every push:
```yaml
- name: Verify audit log integrity
  run: node scripts/test-audit-log-integrity.cjs
```

#### Push Guard (scripts/keel-push-guard.cjs)
Updated to call audit guard on all branches:
```javascript
if (!runAuditGuard(raw)) {
  process.exit(1);
}
```

### 4. Documentation

#### docs/AUDIT_LOG_RETENTION.md
Complete retention policy covering:
- Append-only enforcement mechanics
- Compliance requirements (CJIS ≥ 1 year)
- Archival strategy (export to immutable storage)
- Example archive export code

## Violation Detection

### Blocked Scenarios

```
❌ Modify an existing line (line 2 changed action field)
   Error: line 2: local line differs from remote (content modified)

❌ Delete an existing line (remove line 2)
   Error: 3 remote lines, only 2 local lines (deleted lines)

❌ Reorder lines (hash chain break)
   Error: hash chain broken on new entries:
          Line 3: hash chain broken — expected abc… got xyz…
```

### Allowed Scenarios

```
✅ Add new entries to audit log (append only)
   Result: 2 existing lines unchanged, 1 new line(s) added
```

## Usage

### Local Development
Pre-push hook automatically runs on `git push`:
```bash
git push origin feat/my-feature
# Pre-push validation runs:
# 1. Branch strategy check
# 2. Audit log append-only check ← NEW
# If any audit log is tampered, push is blocked
```

### CI
Audit log integrity verified on every push:
```bash
npm test  # runs existing tests
node scripts/test-audit-log-integrity.cjs  # NEW
node scripts/test-audit-append-only.cjs  # NEW (if issues found)
```

### Manual Verification
```bash
# Check all audit logs for integrity
node scripts/test-audit-log-integrity.cjs

# Test append-only enforcement logic
node scripts/test-audit-append-only.cjs

# Verify specific audit log
node scripts/keel-state.cjs verify STORY-ID
```

## Related

- [Audit Log Retention Policy](./AUDIT_LOG_RETENTION.md)
- [Audit Chain Hashing](./AUDIT_CHAIN.md) (existing documentation)
- [scripts/lib/audit-chain.cjs](../scripts/lib/audit-chain.cjs) — shared chain verification module
- [CJIS Compliance](./CJIS.md) — compliance requirements this feature supports
