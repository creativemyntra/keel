/**
 * vcs-provider-interface.cjs — T19: Abstract VCS Provider interface
 *
 * Defines the contract all VCS providers must implement:
 * - GitHub Cloud/Enterprise
 * - Bitbucket Cloud/Server
 * - GitLab (future)
 *
 * Exports:
 *   class VCSProvider (abstract base)
 *   class GitHubProvider extends VCSProvider
 *   class BitbucketProvider extends VCSProvider
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Base VCS Provider interface (abstract-like)
class VCSProvider {
  constructor(config) {
    this.provider = config.provider;
    this.owner = config.owner;
    this.repo = config.repo;
    this.baseUrl = config.base_url || '';
    this.tokenFile = config.token_file || `~/.keel/secrets/${config.provider}.token`;
    this.token = this._loadToken();
  }

  _loadToken() {
    let expanded = this.tokenFile;
    if (expanded.startsWith('~')) {
      expanded = path.join(os.homedir(), expanded.slice(1));
    }
    if (!fs.existsSync(expanded)) {
      return null;
    }
    try {
      const token = fs.readFileSync(expanded, 'utf8').trim();
      return token || null;
    } catch {
      return null;
    }
  }

  /**
   * Resolve full repository context from config
   * @returns {{provider, owner, repo, base_url}}
   */
  resolveRepoContext() {
    return {
      provider: this.provider,
      owner: this.owner,
      repo: this.repo,
      base_url: this.baseUrl,
    };
  }

  /**
   * Find pull request by branch name AND story ID (filtered search, not "any PR")
   * @param {string} branchName - PR head branch name
   * @param {string} storyId - Story identifier (for validation)
   * @returns {Promise<{number, state, branch} | null>} PR object or null if not found/doesn't match story
   * @throws if API fails or branch doesn't match story
   */
  async findPullRequest(branchName, storyId) {
    throw new Error('findPullRequest() not implemented by subclass');
  }

  /**
   * Get pull request approval status
   * @param {number|string} prRef - PR number or ref
   * @returns {Promise<{state, approvals, mergeable}>}
   * @throws if PR not found or API fails
   */
  async getPullRequestStatus(prRef) {
    throw new Error('getPullRequestStatus() not implemented by subclass');
  }

  /**
   * Post comment to pull request (for audit trail, feedback)
   * @param {number|string} prRef - PR number or ref
   * @param {string} text - Comment text
   * @returns {Promise<void>}
   * @throws if posting fails
   */
  async postComment(prRef, text) {
    throw new Error('postComment() not implemented by subclass');
  }

  /**
   * Test connection to VCS (used at setup time before writing vcs.yml)
   * @returns {Promise<{ok: boolean, message: string}>}
   */
  async testConnection() {
    throw new Error('testConnection() not implemented by subclass');
  }
}

// GitHub Cloud / Enterprise Provider
class GitHubProvider extends VCSProvider {
  async findPullRequest(branchName, storyId) {
    // Search for PRs with matching branch; validate storyId is in branch
    const ghCmd = this.baseUrl
      ? `gh api repos/${this.owner}/${this.repo}/pulls --hostname ${this.baseUrl} --jq '.[] | select(.head.ref == "${branchName}")'`
      : `gh api repos/${this.owner}/${this.repo}/pulls --jq '.[] | select(.head.ref == "${branchName}")'`;

    try {
      const result = execSync(ghCmd, { encoding: 'utf8', stdio: 'pipe', env: this._ghEnv() });
      if (!result.trim()) return null;

      const prs = result.trim().split('\n').map(line => JSON.parse(line));
      if (prs.length === 0) return null;

      // Validate branch matches story (branchName should contain storyId)
      const storyPattern = new RegExp(storyId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (!storyPattern.test(branchName)) {
        throw new Error(`PR branch "${branchName}" does not match story ID "${storyId}"`);
      }

      return {
        number: prs[0].number,
        state: prs[0].state,
        branch: prs[0].head.ref,
      };
    } catch (err) {
      if (err.message.includes('does not match')) throw err;
      throw new Error(`GitHub PR search failed: ${err.message}`);
    }
  }

  async getPullRequestStatus(prRef) {
    const ghCmd = this.baseUrl
      ? `gh api repos/${this.owner}/${this.repo}/pulls/${prRef} --hostname ${this.baseUrl}`
      : `gh api repos/${this.owner}/${this.repo}/pulls/${prRef}`;

    const reviewsCmd = this.baseUrl
      ? `gh api repos/${this.owner}/${this.repo}/pulls/${prRef}/reviews --hostname ${this.baseUrl} --jq '[.[] | select(.state == "APPROVED")] | length'`
      : `gh api repos/${this.owner}/${this.repo}/pulls/${prRef}/reviews --jq '[.[] | select(.state == "APPROVED")] | length'`;

    try {
      const prData = JSON.parse(execSync(ghCmd, { encoding: 'utf8', stdio: 'pipe', env: this._ghEnv() }));
      const approvals = parseInt(execSync(reviewsCmd, { encoding: 'utf8', stdio: 'pipe', env: this._ghEnv() }), 10) || 0;

      return {
        state: prData.state,
        approvals,
        mergeable: prData.mergeable,
      };
    } catch (err) {
      throw new Error(`GitHub status query failed: ${err.message}`);
    }
  }

  async postComment(prRef, text) {
    const ghCmd = this.baseUrl
      ? `gh pr comment ${prRef} --body "${text.replace(/"/g, '\\"')}" --hostname ${this.baseUrl}`
      : `gh pr comment ${prRef} --body "${text.replace(/"/g, '\\"')}"`;

    try {
      execSync(ghCmd, { stdio: 'pipe', env: this._ghEnv() });
    } catch (err) {
      throw new Error(`GitHub comment post failed: ${err.message}`);
    }
  }

  async testConnection() {
    const ghCmd = this.baseUrl
      ? `gh api repos/${this.owner}/${this.repo} --hostname ${this.baseUrl} --jq '.name'`
      : `gh api repos/${this.owner}/${this.repo} --jq '.name'`;

    try {
      const result = execSync(ghCmd, { encoding: 'utf8', stdio: 'pipe', env: this._ghEnv() });
      return {
        ok: true,
        message: `GitHub connection OK: ${result.trim()}`,
      };
    } catch (err) {
      return {
        ok: false,
        message: `GitHub connection failed: ${err.message}`,
      };
    }
  }

  _ghEnv() {
    const env = Object.assign({}, process.env);
    if (this.token) env.GH_TOKEN = this.token;
    return env;
  }
}

// Bitbucket Cloud Provider
class BitbucketCloudProvider extends VCSProvider {
  async findPullRequest(branchName, storyId) {
    const url = `https://api.bitbucket.org/2.0/repositories/${this.owner}/${this.repo}/pullrequests?state=MERGED`;
    const headers = this.token ? { Authorization: `Bearer ${this.token}` } : {};

    try {
      const result = execSync(`curl -s -H "Authorization: Bearer ${this.token || ''}" "${url}"`, { encoding: 'utf8' });
      const data = JSON.parse(result);
      const prs = (data.values || []).filter((pr) => pr.source.branch.name === branchName);

      if (prs.length === 0) return null;

      // Validate branch matches story
      const storyPattern = new RegExp(storyId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (!storyPattern.test(branchName)) {
        throw new Error(`PR branch "${branchName}" does not match story ID "${storyId}"`);
      }

      return {
        number: prs[0].id,
        state: prs[0].state,
        branch: prs[0].source.branch.name,
      };
    } catch (err) {
      if (err.message.includes('does not match')) throw err;
      throw new Error(`Bitbucket PR search failed: ${err.message}`);
    }
  }

  async getPullRequestStatus(prRef) {
    const url = `https://api.bitbucket.org/2.0/repositories/${this.owner}/${this.repo}/pullrequests/${prRef}`;

    try {
      const result = execSync(`curl -s -H "Authorization: Bearer ${this.token || ''}" "${url}"`, { encoding: 'utf8' });
      const pr = JSON.parse(result);
      const approvals = (pr.reviewers || []).filter((r) => r.approved).length;

      return {
        state: pr.state,
        approvals,
        mergeable: pr.merge && pr.merge.can_merge,
      };
    } catch (err) {
      throw new Error(`Bitbucket status query failed: ${err.message}`);
    }
  }

  async postComment(prRef, text) {
    const url = `https://api.bitbucket.org/2.0/repositories/${this.owner}/${this.repo}/pullrequests/${prRef}/comments`;
    const body = JSON.stringify({ content: { raw: text } });

    try {
      execSync(`curl -s -X POST -H "Authorization: Bearer ${this.token || ''}" -H "Content-Type: application/json" -d '${body}' "${url}"`, { stdio: 'pipe' });
    } catch (err) {
      throw new Error(`Bitbucket comment post failed: ${err.message}`);
    }
  }

  async testConnection() {
    const url = `https://api.bitbucket.org/2.0/repositories/${this.owner}/${this.repo}`;

    try {
      const result = execSync(`curl -s -H "Authorization: Bearer ${this.token || ''}" "${url}"`, { encoding: 'utf8' });
      const data = JSON.parse(result);
      return {
        ok: true,
        message: `Bitbucket connection OK: ${data.name}`,
      };
    } catch (err) {
      return {
        ok: false,
        message: `Bitbucket connection failed: ${err.message}`,
      };
    }
  }
}

// Bitbucket Server / Data Center Provider
class BitbucketServerProvider extends VCSProvider {
  async findPullRequest(branchName, storyId) {
    const url = `${this.baseUrl}/rest/api/1.0/projects/${this.owner}/repos/${this.repo}/pull-requests`;

    try {
      const result = execSync(`curl -s -H "Authorization: Bearer ${this.token || ''}" "${url}"`, { encoding: 'utf8' });
      const data = JSON.parse(result);
      const prs = (data.values || []).filter((pr) => pr.fromRef.repository.name === branchName || pr.fromRef.id === branchName);

      if (prs.length === 0) return null;

      // Validate branch matches story
      const storyPattern = new RegExp(storyId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (!storyPattern.test(branchName)) {
        throw new Error(`PR branch "${branchName}" does not match story ID "${storyId}"`);
      }

      return {
        number: prs[0].id,
        state: prs[0].state,
        branch: prs[0].fromRef.id,
      };
    } catch (err) {
      if (err.message.includes('does not match')) throw err;
      throw new Error(`Bitbucket Server PR search failed: ${err.message}`);
    }
  }

  async getPullRequestStatus(prRef) {
    const url = `${this.baseUrl}/rest/api/1.0/projects/${this.owner}/repos/${this.repo}/pull-requests/${prRef}`;

    try {
      const result = execSync(`curl -s -H "Authorization: Bearer ${this.token || ''}" "${url}"`, { encoding: 'utf8' });
      const pr = JSON.parse(result);
      const approvals = (pr.reviewers || []).filter((r) => r.approved).length;

      return {
        state: pr.state,
        approvals,
        mergeable: pr.canMerge,
      };
    } catch (err) {
      throw new Error(`Bitbucket Server status query failed: ${err.message}`);
    }
  }

  async postComment(prRef, text) {
    const url = `${this.baseUrl}/rest/api/1.0/projects/${this.owner}/repos/${this.repo}/pull-requests/${prRef}/comments`;
    const body = JSON.stringify({ text });

    try {
      execSync(`curl -s -X POST -H "Authorization: Bearer ${this.token || ''}" -H "Content-Type: application/json" -d '${body}' "${url}"`, { stdio: 'pipe' });
    } catch (err) {
      throw new Error(`Bitbucket Server comment post failed: ${err.message}`);
    }
  }

  async testConnection() {
    const url = `${this.baseUrl}/rest/api/1.0/projects/${this.owner}/repos/${this.repo}`;

    try {
      const result = execSync(`curl -s -H "Authorization: Bearer ${this.token || ''}" "${url}"`, { encoding: 'utf8' });
      const data = JSON.parse(result);
      return {
        ok: true,
        message: `Bitbucket Server connection OK: ${data.name}`,
      };
    } catch (err) {
      return {
        ok: false,
        message: `Bitbucket Server connection failed: ${err.message}`,
      };
    }
  }
}

// Factory: create provider from config
function createVCSProvider(config) {
  switch (config.provider) {
    case 'github':
      return new GitHubProvider(config);
    case 'github-enterprise':
      return new GitHubProvider(config);
    case 'bitbucket':
      return new BitbucketCloudProvider(config);
    case 'bitbucket-server':
      return new BitbucketServerProvider(config);
    default:
      throw new Error(`Unknown VCS provider: ${config.provider}`);
  }
}

module.exports = {
  VCSProvider,
  GitHubProvider,
  BitbucketCloudProvider,
  BitbucketServerProvider,
  createVCSProvider,
};
