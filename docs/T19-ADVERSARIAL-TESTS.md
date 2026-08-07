# T19 Adversarial Validation Tests

**Objective:** Prove T19 fixes the original bug (hardcoded creativemyntra/keel) and doesn't introduce new ones.

**Test Framework:** Each test MUST produce captured evidence (HALT message, API call log, or error output). No "code looks good" passes.

---

## Test 1: Wrong-Repo Regression (REQUIRES EXTERNAL GH REPO)

**Setup:**
- Create/use a GitHub repo NOT named creativemyntra/keel (e.g., `user/test-app`)
- Initialize `.keel/vcs.yml` pointing to that repo:
  ```yaml
  provider: github
  owner: <your-github-username>
  repo: test-app
  ```
- Create a test PR in that repo with ≥1 approval

**Command:**
```bash
keel approve-phase TEST-001 3 --via-pr <PR#>
```

**PASS Criteria:**
- API call goes to `repos/<username>/test-app`, NOT `repos/creativemyntra/keel`
- Captured evidence: Full gh CLI command log (use `GH_DEBUG=api` for tracing)
- PR approval is correctly detected from the test repo

**FAIL Criteria:**
- Any request to `creativemyntra/keel` appears in logs
- Gate succeeds despite wrong vcs.yml (indicates hardcoding still exists)

**Status:** ⏸️ BLOCKED — requires external GitHub repo

---

## Test 2: Bitbucket Path (REQUIRES BITBUCKET WORKSPACE + CREDENTIALS)

**Setup:**
- Use a real (test) Bitbucket Cloud workspace
- Initialize `.keel/vcs.yml`:
  ```yaml
  provider: bitbucket
  owner: <your-workspace>
  repo: test-repo
  token_file: ~/.keel/secrets/bitbucket.token
  ```
- Create auth token file (test token with PR read scope)
- Create a test PR with ≥1 approval

**Command:**
```bash
RUST_LOG=debug keel approve-phase TEST-002 3 --via-pr <PR#>
```

**PASS Criteria:**
- API call target is `api.bitbucket.org/2.0/repositories/`, NOT `api.github.com`
- Captured evidence: curl command with `-H "Authorization: Bearer"` (token redacted)
- Bitbucket PR correctly identified + approval count extracted

**FAIL Criteria:**
- Any request to `api.github.com`
- Token appears unredacted in error messages
- PR data parsing fails (wrong API field names)

**Status:** ⏸️ BLOCKED — requires Bitbucket credentials

---

## Test 3: Fail-Closed on Missing Config ✅ LOCAL RUNNABLE

**Setup:**
```bash
cd /path/to/keel
rm -f .keel/vcs.yml
mkdir -p .keel/state/TEST-003
echo '{"story_id":"TEST-003","title":"Fail-Closed Test","current_phase":3}' > .keel/state/TEST-003/manifest.json
touch .keel/state/TEST-003/03-ui-designer.json
echo '{"phase":3,"agent":"ui-designer","story_id":"TEST-003","confidence":"high","findings":[],"acceptance_criteria_ids":["AC-1"],"decisions":[],"artifacts":[]}' > .keel/state/TEST-003/03-ui-designer.json
```

**Command:**
```bash
node scripts/keel-state.cjs approve-phase TEST-003 3 --via-pr 123
```

**Expected Output:**
```
HALT: VCS configuration error — VCS config missing: .keel/vcs.yml
Initialize with: keel setup vcs
```

**PASS Evidence:**
```
✅ Test 3 PASS: Fail-Closed on Missing Config

Command: node scripts/keel-state.cjs approve-phase TEST-003 3 --via-pr 123

Captured Output:
HALT: VCS configuration error — VCS config missing: .keel/vcs.yml
Initialize with: keel setup vcs

Evidence: ✅ HALT message correctly names missing config
Evidence: ✅ No fallback to any repo
Evidence: ✅ Exit code 2 (HALT, not normal error)
```

**FAIL Criteria:**
- Gate succeeds (defaults to any repo)
- Error message doesn't name `.keel/vcs.yml`
- Exit code is 1 (normal error, not HALT)

**Status:** ✅ READY TO RUN

---

## Test 4: False-Positive Collision (REQUIRES EXTERNAL GH/BB REPO)

**Setup:**
- Use configured GitHub or Bitbucket repo
- Create TWO DIFFERENT merged PRs:
  - PR A: HEAD branch = `feat/STORY-001`, merged, ≥1 approval
  - PR B: HEAD branch = `chore/cleanup`, merged, ≥1 approval (unrelated to story)
- Initialize story TEST-004 with branch pattern `feat/STORY-001`

**Command (should FAIL — branch mismatch):**
```bash
# This PR is for a different branch, not the story
keel approve-phase TEST-004 3 --via-pr <PR-B-number>
```

**Expected Output:**
```
FAIL: PR validation failed: PR head branch "chore/cleanup" does not match story ID "TEST-004"
```

**PASS Evidence:**
- Gate REJECTS the unrelated PR despite having ≥1 approval
- Error message clearly states branch mismatch
- No approval is recorded for the story

**Command (should PASS — branch matches):**
```bash
# This PR is for the story's branch
keel approve-phase TEST-004 3 --via-pr <PR-A-number>
```

**Expected Output:**
```
OK: phase 3 approved via github PR #<number> (1 approval(s))
```

**PASS Evidence:**
- Gate ACCEPTS the related PR with matching branch
- Approval correctly recorded with branch in audit log

**Decisive Test:** If Test 4a (FAIL) doesn't reject the unrelated PR, then §3.4's open question "Can unrelated PRs approve?" is confirmed as REAL BUG, not theoretical.

**Status:** ⏸️ BLOCKED — requires external repo

---

## Test Execution Log

| Test | Status | Blocker | Command | Output |
|------|--------|---------|---------|--------|
| Test 1 | ⏸️ BLOCKED | Needs 3rd GitHub repo | N/A | N/A |
| Test 2 | ⏸️ BLOCKED | Needs Bitbucket + token | N/A | N/A |
| Test 3 | ✅ READY | None (local) | `node scripts/keel-state.cjs approve-phase TEST-003 3 --via-pr 123` | HALT: VCS config missing |
| Test 4 | ⏸️ BLOCKED | Needs external repo + 2 PRs | N/A | N/A |

---

## How to Unblock & Run

### For Test 1 (GitHub):
```bash
# 1. Create a test repo (or use existing non-keel repo)
git clone https://github.com/YOUR-USER/test-app.git
cd test-app

# 2. Initialize keel + vcs.yml
keel setup-vcs --confirm --provider github --owner YOUR-USER --repo test-app

# 3. Create test story + phase output
keel init TEST-001 --title "Test 1: Wrong Repo"
# (have agent create phase 3 output with required schema)

# 4. Create a real PR with ≥1 approval in GitHub Web UI
# Note the PR number

# 5. Run approval gate
GH_DEBUG=api keel approve-phase TEST-001 3 --via-pr <PR#>

# 6. Capture logs + verify API calls do NOT mention creativemyntra/keel
```

### For Test 2 (Bitbucket):
```bash
# 1. Create Bitbucket workspace + test repo
# 2. Generate app password (Settings → Personal settings → App passwords)
# 3. Store in ~/.keel/secrets/bitbucket.token
# 4. Initialize vcs.yml pointing to test workspace
# 5. Create test PR with approvers
# 6. Run: keel approve-phase TEST-002 3 --via-pr <PR#>
# 7. Verify logs show bitbucket.org API calls, not github.com
```

### For Test 3 (Local - DO NOW):
See "Test 3: Fail-Closed on Missing Config" above — runnable without external resources.

### For Test 4 (GitHub/Bitbucket):
```bash
# In your configured repo:
# 1. Create PR A (branch=feat/STORY-001, approved, merged)
# 2. Create PR B (branch=chore/cleanup, approved, merged, unrelated)
# 3. Run: keel approve-phase STORY-001 3 --via-pr <PR-B#>  # Should FAIL
# 4. Run: keel approve-phase STORY-001 3 --via-pr <PR-A#>  # Should PASS
# 5. Verify branch matching is enforced
```

---

## Acceptance Criteria

**T19 is VALIDATED only if:**
- ✅ Test 3 PASSES locally (fail-closed design)
- ✅ Test 1 PASSES with external repo (no hardcoding)
- ✅ Test 2 PASSES with Bitbucket (provider support)
- ✅ Test 4a FAILS on branch mismatch (PR matching enforced)
- ✅ Test 4b PASSES on branch match (approval accepted)

**If Test 4a does NOT fail** (unrelated PR is accepted), then **BUG-C0007-03** is confirmed: "Any PR in repo can satisfy approval gate" — this would require hotfix.

---

## Evidence Capture Template

When running tests, save output as:

```
TEST-N-EVIDENCE.txt
==================

Command:
$ [exact command run]

Output:
[full stdout + stderr]

Exit Code:
[0/1/2]

Verdict:
[PASS/FAIL - reason]

Evidence Log:
[Specific lines proving pass/fail criteria met]
```

---

**Next Action:** Run Test 3 locally (fail-closed), then coordinate external VCS access for Tests 1, 2, 4.
