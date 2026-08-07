'use strict';

/**
 * VCS Provider Base Class
 * All providers (GitHub, Bitbucket, etc.) extend this interface
 */
class VCSProvider {
  constructor(config) {
    this.provider = config.provider;
    this.owner = config.owner;
    this.repo = config.repo;
    this.baseUrl = config.base_url || '';
    this.tokenFile = config.token_file || `~/.keel/secrets/${config.provider}.token`;
  }

  /**
   * Find pull request by branch name AND story ID (filtered search, not "any PR")
   * @param {string} branchName - PR head branch name
   * @param {string} storyId - Story identifier (for validation)
   * @returns {Promise<{number, state, branch} | null>} PR object or null if not found/doesn't match story
   * @throws if API fails or branch doesn't match story
   */
  async findPullRequest(branchName, storyId) {
    throw new Error(`${this.constructor.name}.findPullRequest() not implemented`);
  }

  /**
   * Get pull request approval status
   * @param {number|string} prRef - PR number or ref
   * @returns {Promise<{state, approvals, mergeable}>}
   * @throws if PR not found or API fails
   */
  async getPullRequestStatus(prRef) {
    throw new Error(`${this.constructor.name}.getPullRequestStatus() not implemented`);
  }

  /**
   * Post comment to pull request (for audit trail, feedback)
   * @param {number|string} prRef - PR number or ref
   * @param {string} text - Comment text
   * @returns {Promise<void>}
   * @throws if posting fails
   */
  async postComment(prRef, text) {
    throw new Error(`${this.constructor.name}.postComment() not implemented`);
  }

  /**
   * Test connection to VCS (used at setup time before writing vcs.yml)
   * @returns {Promise<{ok: boolean, message: string}>}
   */
  async testConnection() {
    throw new Error(`${this.constructor.name}.testConnection() not implemented`);
  }

  /**
   * Resolve repo context from config
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
}

module.exports = VCSProvider;
