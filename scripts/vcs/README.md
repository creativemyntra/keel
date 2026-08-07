# Keel VCS Provider Abstraction (T19.2)

Modular, multi-provider VCS integration for Keel's approval gates.

## Structure

```
vcs/
├── provider.cjs              # VCSProvider base class (abstract interface)
├── index.cjs                 # Factory: createVCSProvider(config)
├── resolve.cjs               # Config loader: resolveVcsProvider() (fail-closed)
└── providers/
    ├── github.cjs            # GitHub Cloud + Enterprise
    ├── bitbucket-cloud.cjs   # Bitbucket Cloud (MCP-ready)
    └── bitbucket-server.cjs  # Bitbucket Server (stub, not implemented)
```

## Quick Start

### Use in Code

```javascript
// Load config from .keel/vcs.yml and get provider instance
const { resolveVcsProvider } = require('./vcs/resolve.cjs');
const provider = resolveVcsProvider();

// Or instantiate directly
const { createVCSProvider } = require('./vcs/index.cjs');
const provider = createVCSProvider({
  provider: 'github',
  owner: 'myorg',
  repo: 'myapp',
});

// Query PR status
const status = await provider.getPullRequestStatus(456);
console.log(status.approvals, status.branch, status.mergeable);

// Test connection
const result = await provider.testConnection();
console.log(result.ok, result.message);
```

### Command-Line

```bash
# Initialize VCS config (auto-detect from git remote)
keel setup-vcs

# Confirm + write config
keel setup-vcs --confirm --provider github --owner myorg --repo myapp

# Use in approval gate
keel approve-phase STORY-123 3 --via-pr 456
```

## Provider Interface

All providers implement `VCSProvider`:

```javascript
class VCSProvider {
  // Find PR by branch name, validate story ID match
  async findPullRequest(branchName, storyId)
    // → {number, state, branch} or null

  // Get PR approval status
  async getPullRequestStatus(prRef)
    // → {state, approvals, mergeable, branch}

  // Post comment to PR (for audit trails)
  async postComment(prRef, text)
    // → void

  // Test VCS connection (used at setup time)
  async testConnection()
    // → {ok: boolean, message: string}

  // Resolve config context
  resolveRepoContext()
    // → {provider, owner, repo, base_url}
}
```

## Configuration

**File:** `.keel/vcs.yml` (auto-generated, gitignored)

```yaml
provider: github              # github | github-enterprise | bitbucket | bitbucket-server
owner: myorg
repo: myapp
base_url: ""                  # (optional, for self-hosted)
token_file: ~/.keel/secrets/github.token  # (gitignored)
```

## Fail-Closed Design

- ✅ Missing config → **HALT** with diagnostic (exit code 2)
- ✅ Malformed config → **HALT** with diagnostic
- ✅ API errors → explicit error, never silent fallback
- ✅ Tokens → loaded from file, never committed, redacted from errors

## MCP Integration (Future)

Bitbucket Cloud provider is MCP-ready. When Atlassian Rovo exposes Bitbucket tools:

1. Check if MCP is available: `_checkMcpAvailable()`
2. Try MCP path: `_findPullRequestViaMcp()`
3. Fall back to curl: `_findPullRequestViaCurl()`

No code changes needed outside provider methods.

## Known Limitations

1. **Bitbucket Server** → Stub only. Use Bitbucket Cloud or GitHub.
2. **Async Methods** → Declared `async` but use `execSync` internally (sync execution for CLI compatibility).
3. **MCP Tools** → Awaiting Atlassian Rovo Bitbucket API exposure.

## Adding a New Provider

### Step 1: Create Provider Class

```javascript
// scripts/vcs/providers/gitlab.cjs
const VCSProvider = require('../provider.cjs');

class GitLabProvider extends VCSProvider {
  async findPullRequest(branchName, storyId) {
    // Query GitLab REST API
  }

  async getPullRequestStatus(prRef) {
    // Query MR approvals
  }

  async postComment(prRef, text) {
    // Post comment to MR
  }

  async testConnection() {
    // Verify credentials + repo access
  }
}

module.exports = GitLabProvider;
```

### Step 2: Register in Factory

```javascript
// scripts/vcs/index.cjs
const GitLabProvider = require('./providers/gitlab.cjs');

function createVCSProvider(config) {
  switch (config.provider) {
    // ...existing cases...
    case 'gitlab':
      return new GitLabProvider(config);
    default:
      throw new Error(`Unknown VCS provider: ${config.provider}`);
  }
}
```

### Step 3: Document Configuration

Update `.keel/vcs.yml.template` and TECHNICAL-SPECIFICATIONS.md.

## Testing

```bash
# Verify module loads
node -c scripts/vcs/provider.cjs
node -c scripts/vcs/index.cjs
node -c scripts/vcs/resolve.cjs
node -c scripts/vcs/providers/*.cjs

# Test factory
node -e "const vcs = require('./scripts/vcs/index.cjs'); console.log(vcs.createVCSProvider({provider: 'github', owner: 'test', repo: 'test'}))"

# Test fail-closed design
node -e "const r = require('./scripts/vcs/resolve.cjs'); r.resolveVcsProvider()" # Should HALT
```

## See Also

- Migration guide: `docs/T19.2-VCS-PROVIDER-MIGRATION.md`
- Approval gate: `scripts/keel-state.cjs` — `cmdApprovePhase()`
- Setup command: `scripts/keel-state.cjs` — `cmdSetupVcs()`
