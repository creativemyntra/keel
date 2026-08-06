# How Code Gets Updated to Production in GitHub

## 🔄 The Complete Code Flow

```
Developer's Machine          GitHub Repositories            Production Systems
═════════════════════════════════════════════════════════════════════════════

1. LOCAL DEVELOPMENT:
   ┌──────────────────┐
   │ git checkout     │
   │ feat/user-auth   │────┐
   │                  │    │ git push origin feat/user-auth
   │ code changes     │    │
   │ git commit       │    ↓
   │ git push         │    [GitHub: feat/user-auth branch created]
   └──────────────────┘    ↓ with code changes
                           [Code stored in feat/user-auth]

2. CREATE PR + REVIEW:
   ┌──────────────────┐
   │ gh pr create     │────┐
   │ --base dev       │    │ PR #79 created
   │ --head feat/...  │    │ (Needs 1 approval)
   └──────────────────┘    ↓
                           [GitHub: PR #79 requests merge]
                           [Code from feat/user-auth → dev]
                           [CI/CD runs tests]
                           [Team reviews code]
                           [Approver clicks "Approve"]

3. MERGE TO DEV:
   ┌──────────────────┐
   │ (GitHub UI)      │────┐
   │ Click "Merge"    │    │ Merge PR #79
   │ PR #79           │    │
   └──────────────────┘    ↓
                           [GitHub: dev branch UPDATED]
                           [feat/user-auth code now in dev]
                           [CI/CD triggers on dev]
                           [Build + test + deploy to dev environment]
                           ↓
                          [DEV SERVER: /var/www/dev/ updated]
                          [Developers test code in dev]

4. PROMOTE TO QA:
   ┌──────────────────┐
   │ gh pr create     │────┐
   │ --base qa        │    │ PR #81 created
   │ --head dev       │    │ (Needs 1 approval)
   └──────────────────┘    ↓
                           [GitHub: qa branch receives dev code]
                           [Merge PR #81]
                           ↓
                           [QA SERVER: /var/www/qa/ updated]
                           [Code now in qa for QA team testing]

5. PROMOTE TO STAGE:
   ┌──────────────────┐
   │ gh pr create     │────┐
   │ --base stage     │    │ PR #82 created
   │ --head qa        │    │ (Needs 1 approval)
   └──────────────────┘    ↓
                           [GitHub: stage branch receives qa code]
                           [Merge PR #82]
                           ↓
                           [STAGING SERVER: /var/www/stage/ updated]
                           [Code now in stage for UAT]

6. PROMOTE TO PREPROD:
   ┌──────────────────┐
   │ gh pr create     │────┐
   │ --base preprod   │    │ PR #83 created
   │ --head stage     │    │ (Needs 1 approval)
   └──────────────────┘    ↓
                           [GitHub: preprod branch receives stage code]
                           [Merge PR #83]
                           ↓
                           [PREPROD SERVER: /var/www/preprod/ updated]
                           [Code validated before production]

7. MERGE TO PRODUCTION:
   ┌──────────────────┐
   │ gh pr create     │────┐
   │ --base prod      │    │ PR #84 created
   │ --head preprod   │    │ (Needs 2 approvals - G-2)
   └──────────────────┘    ├─ Release Manager approves
                           ├─ VP Engineering approves
                           ↓
                           [GitHub: prod branch UPDATED]
                           [All code from preprod in prod]
                           [CI/CD triggers release workflow]
                           ↓
                    ┌──────────────────────┐
                    │ GITHUB ACTIONS:      │
                    │ Release Workflow     │
                    │ 1. Build plugin      │
                    │ 2. Create release    │
                    │ 3. Upload artifacts  │
                    │ 4. Distribute        │
                    └──────────────────────┘
                           ↓
                    ┌──────────────────────┐
                    │ PRODUCTION SYSTEMS:  │
                    │ 1. CDN updated       │
                    │ 2. Marketplace dist  │
                    │ 3. Plugin registry   │
                    │ 4. npm package       │
                    └──────────────────────┘
                           ↓
                    Users can install:
                    /plugin add marketplace keel

8. CREATE RELEASE TAG:
   ┌──────────────────┐
   │ git tag v3.18.2  │────┐
   │ git push --tags  │    │ Tag created
   └──────────────────┘    ↓
                           [GitHub: Release v3.18.2 created]
                           [Plugin bundle attached]
                           [Release notes published]
                           ↓
                    Users see:
                    "Keel v3.18.2 available"
                    [Download plugin]
```

---

## 📁 What's Actually in Each GitHub Branch

### Example: feat/user-auth branch

```
feat/user-auth branch on GitHub:

Before merge:
├─ src/auth/login.ts       (NEW)
├─ src/auth/jwt.ts         (NEW)
├─ tests/auth.test.ts      (NEW)
└─ (All prior dev code too)

After PR #79 merged to dev:
[These files are NOW in dev branch]
```

### dev branch

```
After merging feat/user-auth:

├─ src/auth/login.ts       (✅ From feat/user-auth PR)
├─ src/auth/jwt.ts         (✅ From feat/user-auth PR)
├─ tests/auth.test.ts      (✅ From feat/user-auth PR)
├─ src/other/feature1.ts   (from earlier feature)
├─ src/other/feature2.ts   (from earlier feature)
└─ (All merged feature code)

When dev is deployed:
→ Server gets ALL these files
→ Developers test with auth feature
```

### prod branch (LIVE)

```
After PR #84 merged (preprod → prod):

├─ src/auth/login.ts
├─ src/auth/jwt.ts
├─ tests/auth.test.ts
├─ src/other/feature1.ts
├─ src/other/feature2.ts
├─ package.json v3.18.2
├─ docs/DEVELOPER-SETUP.md (P-16)
├─ tests/e2e/fixtures.ts   (P-16)
└─ (ALL production code)

[DEPLOYED TO LIVE]
[RELEASE TAG: v3.18.2]
[AVAILABLE TO USERS]
```

---

## 🔄 How Code Actually Flows (Git Commits)

### Commit Timeline

```
Commit abc123: Developer commits to feat/user-auth
  ├─ Message: "feat(auth): add JWT login"
  ├─ Files: login.ts, jwt.ts, auth.test.ts
  └─ Location: feat/user-auth branch only

PR #79 merged to dev:
  ├─ Before: dev points to commit xyz789
  ├─ Action: git merge --ff-only feat/user-auth
  └─ After: dev points to commit abc123
     (dev NOW HAS the auth feature code)

dev branch deployed:
  ├─ CI/CD pulls: git clone + git checkout dev
  ├─ Code version: commit abc123 (with auth)
  └─ Deployed to: dev.keel.io
     (Users can test auth feature)

PR #81 merged to qa:
  ├─ qa NOW HAS: commit abc123 + all dev commits
  └─ qa server updated with auth feature

PR #82 merged to stage:
  ├─ stage NOW HAS: commit abc123 + all prior commits
  └─ stage server updated (users see auth in staging)

PR #83 merged to preprod:
  ├─ preprod NOW HAS: same code as stage
  └─ Final validation before production

PR #84 merged to prod:
  ├─ prod NOW HAS: commit abc123 + ALL merged code
  └─ [PRODUCTION UPDATED - LIVE FOR USERS]

Release tag v3.18.2:
  ├─ git tag v3.18.2 abc123
  ├─ Tags this exact commit as release
  └─ GitHub Actions distributes
     (users download keel-3.18.2.plugin)
```

---

## 🚀 How Servers Get the Updated Code

### When PR merges to dev:

```
Step 1: Developer merges PR #79 to dev
        (clicks "Confirm merge" on GitHub)

Step 2: GitHub receives merge
        └─ dev branch now points to abc123 (feat code)

Step 3: GitHub webhook triggers CI/CD
        └─ Notifies: "dev branch updated!"

Step 4: GitHub Actions workflow runs
        ├─ git clone https://github.com/creativemyntra/keel.git
        ├─ git checkout dev
        ├─ npm install
        ├─ npm test (run tests on abc123 code)
        └─ If tests pass → proceed to deploy

Step 5: Deploy to dev server
        ├─ scp -r . dev.keel.io:/var/www/dev/
        ├─ npm run build
        ├─ systemctl restart keel-dev
        └─ Dev server now running code from commit abc123

Step 6: Dev environment updated
        └─ Users visit dev.keel.io
           └─ See the auth feature (login.ts from abc123)
              └─ Can test the feature
```

### When code reaches production:

```
Step 1: PR #84 merged to prod
        (dev code + preprod validation → prod)

Step 2: prod branch updated
        └─ prod = commit abc123 + all merged features

Step 3: GitHub Actions Release Workflow triggers
        ├─ Validate: plugin.json version = tag version
        ├─ Build: npm run build → dist/keel-3.18.2.plugin
        ├─ Create Release: v3.18.2 on GitHub
        ├─ Upload: keel-3.18.2.plugin to release
        └─ Distribute:
           ├─ Upload to CDN (cloudflare, fastly, etc)
           ├─ Publish to npm registry
           ├─ Add to GitHub Actions marketplace
           └─ Add to Claude Code marketplace

Step 4: Users can install
        ├─ Download starts from CDN
        ├─ Extract keel-3.18.2.plugin
        └─ Run: /plugin add marketplace keel
           └─ Gets v3.18.2 with auth feature

Step 5: Code runs in user's environment
        └─ User's Claude Code instance has the auth feature
           (tests/e2e/fixtures.ts, playwright.config.ts, etc.)
```

---

## 🔗 The Chain: Code → GitHub Branch → Server → Users

```
Developer writes code (login.ts)
       ↓
git commit + git push origin feat/user-auth
       ↓
Code stored in feat/user-auth branch on GitHub
       ↓
Create PR #79 (feat/user-auth → dev)
       ↓
Get approval + Merge
       ↓
dev branch UPDATED on GitHub (now has login.ts)
       ↓
GitHub webhook triggers CI/CD
       ↓
CI/CD clones dev, tests it, builds it
       ↓
Deploy to dev server
       ↓
Dev server (/var/www/dev/) now has login.ts
       ↓
Developers can test auth feature in dev environment
       ↓
Create PR #81 (dev → qa)
       ↓
Merge → qa branch updated
       ↓
CI/CD deploys to qa server
       ↓
QA team tests auth feature
       ↓
Create PR #82 (qa → stage)
       ↓
Merge → stage branch updated
       ↓
[REPEAT: PR to preprod, merge, deploy]
       ↓
Create PR #84 (preprod → prod)
       ↓
2 approvals (G-2) → Merge
       ↓
prod branch UPDATED on GitHub
       ↓
CI/CD runs Release Workflow
       ↓
Build plugin bundle with login.ts + all code
       ↓
Create Release v3.18.2
       ↓
Upload plugin to CDN + registries
       ↓
Users download keel-3.18.2.plugin
       ↓
Users have auth feature running locally
       ↓
Users can now use JWT login in their projects
```

---

## 📊 Summary: GitHub Branch = Current Code State

```
When you look at GitHub:

dev branch
└─ Shows all code merged through dev
   (all features from PRs #1-79)
   (what's deployed to dev.keel.io)

qa branch
└─ Shows code at time of merge to qa
   (what's deployed to qa.keel.io)
   (QA team is testing this)

stage branch
└─ Shows code at time of merge to stage
   (what's deployed to stage.keel.io)
   (UAT team is validating this)

prod branch
└─ Shows PRODUCTION code
   (what's deployed to production)
   (what users are running)
   (has version tag v3.18.2)

Each branch = Snapshot of code at that stage
           = What's deployed to that environment
           = What users/testers are using
```

---

## ✅ Answer: How Does Prod Get Updated?

**Question:** How does code get to prod in GitHub?

**Answer:**

1. **Code merges through PR pipeline**
   - feat → dev (PR #79)
   - dev → qa (PR #81)
   - qa → stage (PR #82)
   - stage → preprod (PR #83)
   - preprod → prod (PR #84)

2. **Each merge updates that branch on GitHub**
   - Merge PR #79 → dev branch now has the code
   - Merge PR #81 → qa branch now has the code
   - Merge PR #84 → prod branch now has the code

3. **CI/CD deploys each branch to its server**
   - dev branch → deployed to dev server
   - qa branch → deployed to qa server
   - prod branch → deployed to production (users)

4. **Release tag marks production release**
   - `git tag v3.18.2` marks prod branch as official release
   - GitHub Actions builds plugin bundle
   - Distributes to marketplaces

5. **Users get the code**
   - Download plugin from marketplace
   - Install locally: `/plugin add marketplace keel`
   - User's environment has production code running

**In simple terms:**
- Prod branch on GitHub = Production code state
- When you merge PR to prod = Code updates on GitHub
- When code updates = CI/CD deploys it
- When deployed = Users can download it
- When users install = They get production code running
