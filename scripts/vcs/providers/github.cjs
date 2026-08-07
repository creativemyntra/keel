'use strict';

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const VCSProvider = require('../provider.cjs');

/**
 * GitHub Cloud / Enterprise Provider
 * Uses gh CLI for authentication + API calls
 */
class GitHubProvider extends VCSProvider {
  async findPullRequest(branchName, storyId) {
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
        branch: prData.head.ref,
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
    const token = this._loadToken();
    if (token) env.GH_TOKEN = token;
    return env;
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
}

module.exports = GitHubProvider;
