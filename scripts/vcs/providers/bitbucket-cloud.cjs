'use strict';

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const VCSProvider = require('../provider.cjs');

/**
 * Bitbucket Cloud Provider
 * MCP-first (Atlassian Rovo), fallback to REST API + curl
 */
class BitbucketCloudProvider extends VCSProvider {
  constructor(config) {
    super(config);
    this.mcpAvailable = this._checkMcpAvailable();
  }

  _checkMcpAvailable() {
    // Check if Atlassian Rovo MCP is available in environment
    // This would be true if running in Claude Code with MCP configured
    return (
      process.env.MCP_ATLASSIAN_AVAILABLE === 'true' ||
      (typeof globalThis !== 'undefined' && globalThis.mcp_atlassian_fetch)
    );
  }

  async findPullRequest(branchName, storyId) {
    try {
      if (this.mcpAvailable) {
        return await this._findPullRequestViaMcp(branchName, storyId);
      }
    } catch (err) {
      // MCP failed, fall back to curl
      console.warn(`[BB Cloud] MCP attempt failed (${err.message}), falling back to curl`);
    }

    return await this._findPullRequestViaCurl(branchName, storyId);
  }

  async _findPullRequestViaMcp(branchName, storyId) {
    // Query via Atlassian Rovo MCP
    // This assumes Rovo exposes Bitbucket REST API endpoint access
    const url = `https://api.bitbucket.org/2.0/repositories/${this.owner}/${this.repo}/pullrequests?state=MERGED`;

    try {
      // In a real MCP environment, would call:
      // const response = await globalThis.mcp_atlassian_fetch(url, { headers });
      // For now, this is a placeholder that demonstrates the intent
      throw new Error('MCP Bitbucket tools not yet available in Rovo; using curl fallback');
    } catch (err) {
      throw err;
    }
  }

  async _findPullRequestViaCurl(branchName, storyId) {
    const url = `https://api.bitbucket.org/2.0/repositories/${this.owner}/${this.repo}/pullrequests?state=MERGED`;
    const token = this._loadToken();
    const headers = token ? `-H "Authorization: Bearer ${token}"` : '';

    try {
      const cmd = `curl -s ${headers} "${url}"`;
      const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
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
      // Redact token from error
      const safeMsg = err.message.replace(/Bearer [^ "]+/g, 'Bearer [REDACTED]');
      throw new Error(`Bitbucket Cloud PR search failed: ${safeMsg}`);
    }
  }

  async getPullRequestStatus(prRef) {
    try {
      if (this.mcpAvailable) {
        return await this._getPullRequestStatusViaMcp(prRef);
      }
    } catch (err) {
      console.warn(`[BB Cloud] MCP attempt failed (${err.message}), falling back to curl`);
    }

    return await this._getPullRequestStatusViaCurl(prRef);
  }

  async _getPullRequestStatusViaMcp(prRef) {
    const url = `https://api.bitbucket.org/2.0/repositories/${this.owner}/${this.repo}/pullrequests/${prRef}`;

    try {
      // Placeholder for MCP call
      throw new Error('MCP Bitbucket tools not yet available in Rovo; using curl fallback');
    } catch (err) {
      throw err;
    }
  }

  async _getPullRequestStatusViaCurl(prRef) {
    const url = `https://api.bitbucket.org/2.0/repositories/${this.owner}/${this.repo}/pullrequests/${prRef}`;
    const token = this._loadToken();
    const headers = token ? `-H "Authorization: Bearer ${token}"` : '';

    try {
      const cmd = `curl -s ${headers} "${url}"`;
      const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
      const pr = JSON.parse(result);
      const approvals = (pr.reviewers || []).filter((r) => r.approved).length;

      return {
        state: pr.state,
        approvals,
        mergeable: pr.merge && pr.merge.can_merge,
        branch: pr.source.branch.name,
      };
    } catch (err) {
      const safeMsg = err.message.replace(/Bearer [^ "]+/g, 'Bearer [REDACTED]');
      throw new Error(`Bitbucket Cloud status query failed: ${safeMsg}`);
    }
  }

  async postComment(prRef, text) {
    const url = `https://api.bitbucket.org/2.0/repositories/${this.owner}/${this.repo}/pullrequests/${prRef}/comments`;
    const body = JSON.stringify({ content: { raw: text } });
    const token = this._loadToken();
    const headers = token ? `-H "Authorization: Bearer ${token}"` : '';

    try {
      const cmd = `curl -s -X POST ${headers} -H "Content-Type: application/json" -d '${body}' "${url}"`;
      execSync(cmd, { stdio: 'pipe' });
    } catch (err) {
      const safeMsg = err.message.replace(/Bearer [^ "]+/g, 'Bearer [REDACTED]');
      throw new Error(`Bitbucket Cloud comment post failed: ${safeMsg}`);
    }
  }

  async testConnection() {
    const url = `https://api.bitbucket.org/2.0/repositories/${this.owner}/${this.repo}`;
    const token = this._loadToken();
    const headers = token ? `-H "Authorization: Bearer ${token}"` : '';

    try {
      const cmd = `curl -s ${headers} "${url}"`;
      const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
      const data = JSON.parse(result);
      return {
        ok: true,
        message: `Bitbucket Cloud connection OK: ${data.name}`,
      };
    } catch (err) {
      const safeMsg = err.message.replace(/Bearer [^ "]+/g, 'Bearer [REDACTED]');
      return {
        ok: false,
        message: `Bitbucket Cloud connection failed: ${safeMsg}`,
      };
    }
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

module.exports = BitbucketCloudProvider;
