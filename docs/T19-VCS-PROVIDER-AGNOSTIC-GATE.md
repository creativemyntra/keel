# T19: VCS Provider-Agnostic Approval Gate

**Task:** Refactor hardcoded GitHub references in C-0007 approval gate to support multiple VCS providers.

**Status:** COMPLETED  
**Date:** 2026-08-06  
**Owner:** Amar Singh  
**Related Findings:** C-0007-HARD-001 through C-0007-HARD-004 (hardcoded creativemyntra/keel repo)

---

## Problem Statement

The design approval gate (C-0007 in cmdApprovePhase) hardcoded the GitHub repository path:
```javascript
// ❌ BEFORE: Hardcoded repo owner/name
const prData = execSync(`gh api repos/creativemyntra/keel/pulls/${prNumber} ...`);
```

**Issues:**
1. **VCS Lockup:** Only GitHub supported; no Bitbucket, GitLab, or self-hosted support
2. **Repo Hardcoding:** Only worked for creativemyntra/keel; couldn't be used by other projects
3. **No Config Layer:** Owner/repo baked into source; no per-project configuration
4. **Fail-Open Risk:** If config missing, would silently use wrong repo instead of halting
5. **Token Storage:** No standardized secrets handling for auth tokens

---

## Solution: Provider-Agnostic Abstraction

### Architecture

```
cmdApprovePhase (C-0007)
    ↓
loadVcsConfig(.keel/vcs.yml)
    ↓
queryApprovals(vcsConfig, prNumber)
    ├─ GitHub Cloud API  (via gh CLI or https)
    ├─ GitHub Enterprise (via gh --hostname)
    ├─ Bitbucket Cloud   (v2.0 REST API)
    └─ Bitbucket Server  (v1.0 REST API + base_url)
```

### Files Modified

| File | Change | Reason |
|------|--------|--------|
| `scripts/keel-state.cjs` | Remove hardcoded GitHub calls; call vcs-providers module | Decouple approval logic from VCS |
| `scripts/lib/vcs-providers.cjs` | NEW: Provider abstraction layer | Support GitHub/Bitbucket/GitLab extensibly |
| `.keel/vcs.yml.template` | NEW: Configuration template | Reference documentation |
| `.gitignore` | Added `.keel/vcs.yml` | Prevent accidental commits of config/tokens |
| `TECHNICAL-SPECIFICATIONS.md` | Added T19 section | Document provider support + setup workflow |

### Key Features

#### 1. Auto-Detection (cmdSetupVcs)
```bash
$ keel setup-vcs
✓ Detected from git remote: https://github.com/acme/my-app.git

=== VCS Configuration Proposal ===
Provider:     github
Owner:        acme
Repo:         my-app
Token file:   ~/.keel/secrets/github.token

To accept, re-run with:
  keel setup-vcs --confirm --provider github --owner acme --repo my-app
```

**Proposal-based:** Never auto-accepts; human review required before writing config.

#### 2. Fail-Closed Design
```bash
# Missing config → HALT with diagnostic
$ keel approve-phase STORY-123 3 --via-pr 456
HALT: VCS configuration error — VCS config missing: .keel/vcs.yml
Initialize with: keel setup-vcs

# Malformed config → specific error
$ keel approve-phase STORY-123 3 --via-pr 456
HALT: VCS configuration error — Invalid provider in vcs.yml: unknown_vcs

# Provider-specific errors → detailed diagnostics
$ keel approve-phase STORY-123 3 --via-pr 456  # (Bitbucket, no token)
FAIL: Bitbucket approval requires BITBUCKET_TOKEN env var set
```

#### 3. Multi-Provider Support

**GitHub Cloud:**
```yaml
provider: github
owner: acme
repo: my-app
```

**GitHub Enterprise:**
```yaml
provider: github-enterprise
owner: acme
repo: my-app
base_url: https://github.example.com
```

**Bitbucket Cloud:**
```yaml
provider: bitbucket
owner: acme
repo: my-app
```

**Bitbucket Server/Data Center:**
```yaml
provider: bitbucket-server
owner: ACME
repo: myapp
base_url: https://bitbucket.example.com
```

#### 4. Secure Token Handling
- Tokens stored in `~/.keel/secrets/<provider>.token` (gitignored)
- Never printed, logged, or committed
- Loaded at runtime only when needed
- Fallback to `gh` CLI or `git credential` helper

---

## Implementation Notes

### Approval Filtering Logic

**Current (T19):** Accepts any PR with ≥1 approval in the configured repo.

**Future Enhancement Opportunity:** Could add story-branch correlation:
```javascript
// Not implemented yet — future T20
if (prHeadBranch !== detectBranchForStory(storyId)) {
  die(1, `PR branch mismatch: expected branch for ${storyId}, got ${prHeadBranch}`);
}
```

### Error Handling Pattern

All provider queries use explicit error messages:
- GitHub API unavailable → show GitHub-specific diagnostic
- Bitbucket token missing → show Bitbucket-specific diagnostic
- Network timeout → show timeout with provider name

No silent fallbacks; every error path communicates what went wrong and why.

---

## Testing

### Manual Verification Steps

```bash
# 1. Test auto-detection
cd /path/to/repo
keel setup-vcs
# Should detect GitHub/Bitbucket/etc. and display proposal

# 2. Test proposal-based confirmation
keel setup-vcs --confirm --provider github --owner test --repo test
# Should write .keel/vcs.yml

# 3. Verify gitignore
git status | grep vcs.yml
# Should be ignored (not listed)

# 4. Test approval gate with GitHub
keel approve-phase STORY-001 3 --via-pr 100
# Should query configured GitHub repo + require ≥1 approval

# 5. Test fail-closed behavior
rm .keel/vcs.yml
keel approve-phase STORY-001 3 --via-pr 100
# Should HALT with diagnostic: "VCS configuration error — VCS config missing"
```

### Automated Test Coverage
- Unit: vcs-providers.cjs provider detection + config loading
- Integration: cmdApprovePhase with mocked VCS APIs (future)
- E2E: real GitHub/Bitbucket queries with test PR (future, optional)

---

## Related Findings

Resolves:
- **C-0007-HARD-001:** Hardcoded GitHub API target (`repos/creativemyntra/keel`)
- **C-0007-HARD-002:** Hardcoded GitHub reviews endpoint
- **C-0007-HARD-003:** No VCS provider config exists
- **C-0007-HARD-004:** No Bitbucket/GitLab/provider-agnostic path
- **C-0007-GATE-001:** Approval validates ANY repo PR, not story-specific

Partially addressed:
- **C-0007-GATE-002:** Approval count cached; timestamp & reviewer binding added to audit log
- **C-0007-GATE-003:** Error handling now explicit (no silent fallbacks)

---

## Lessons Learned

### Hardcoding is Invisible Until Scaled
The hardcoded repo worked perfectly for the Keel project itself. It became obvious only when:
- Attempting to extend to new projects
- Adding provider support for customers
- Auditing for multi-tenancy

**Takeaway:** If a value appears in more than one place OR might vary per deployment, extract it to config at inception.

### Configuration as Governance
Requiring explicit human confirmation for `.keel/vcs.yml` (proposal-based, never auto-accept) catches misconfigurations before they cause approval bypass issues.

**Takeaway:** Config files for security-sensitive paths should require explicit approval, not silent defaults.

### Fail-Closed Design Prevents Scope Creep
By refusing to proceed without valid config, we avoid the temptation to add fallback behavior like:
- Default to GitHub if config missing
- Use an env var instead
- Hard-code a second repo as backup

**Takeaway:** Explicit failures are better than lenient fallbacks for security gates.

---

## Future Enhancements (Out of Scope for T19)

1. **T20: Story-Branch Correlation**
   - Verify PR head branch matches story's tracked branch
   - Prevent unrelated PRs from satisfying approval gate

2. **T21: GitLab Support**
   - Add `provider: gitlab` and `provider: gitlab-self-hosted`
   - Query GitLab REST API for MR approvals

3. **T22: Bitbucket Server Detection**
   - Auto-detect Bitbucket Server vs. Cloud from git remote
   - Automatically propose correct API version

4. **T23: Token Rotation**
   - Periodic refresh of VCS tokens
   - Audit log for token lifecycle

---

## Post-Implementation Fixes (Rabbit Hole Audit)

After devil's advocate review, 4 critical rabbitholes fixed:

| **RH** | **Issue** | **Fix Applied** |
|---|---|---|
| RH-1 | Bitbucket token not loaded from file | Wire vcs-providers.loadAuthToken() in both GitHub + Bitbucket paths |
| RH-2 | Token path expansion fails on Windows (`~` replace) | Use `path.join(os.homedir(), ...)` for cross-platform compat |
| RH-3 | Bitbucket API response parsing unverified | Verify `pr.reviewers[].approved` field; add curl stderr redaction (RH-5) |
| RH-4 | PR matching not implemented (req #6) | Add verifyPrBelongsToStory() + branch detection for both providers |

**Security Improvements:**
- Token file path expansion now safe on Windows
- Token env var NOT required; loaded from config file
- Error messages redact tokens before printing
- Unrelated PRs now rejected (story branch validation)

## Deployment Checklist

- [x] Code written + syntax checked
- [x] Hardcoded "creativemyntra/keel" removed entirely
- [x] `.keel/vcs.yml` added to `.gitignore`
- [x] Auto-detect + proposal logic tested
- [x] GitHub provider tested (via gh CLI)
- [x] Bitbucket Cloud provider implemented
- [x] Bitbucket Server support added
- [x] Fail-closed validation implemented
- [x] Documentation added to TECHNICAL-SPECIFICATIONS.md
- [x] Template provided: `.keel/vcs.yml.template`
- [x] **RH-1 FIXED:** Token file loading for GitHub + Bitbucket
- [x] **RH-2 FIXED:** Windows-safe token path expansion
- [x] **RH-3 FIXED:** Bitbucket API validation + error redaction
- [x] **RH-4 FIXED:** PR branch matching (story correlation)
- [ ] E2E test with real GitHub PR (optional, manual)
- [ ] E2E test with real Bitbucket Cloud PR (optional, manual)

---

**This completes T19: VCS Provider-Agnostic Approval Gate.**

For setup: `keel setup-vcs`  
For approval: `keel approve-phase <story> <phase> --via-pr <PR#>`
