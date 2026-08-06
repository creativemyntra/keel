/**
 * vcs-providers.cjs — T19: Provider-agnostic VCS approval gate integration.
 *
 * Abstracts GitHub and Bitbucket (Cloud + Server) so approve-phase (C-0007)
 * can work with any provider. Auth tokens stored in ~/.keel/secrets/ (gitignored).
 *
 * Exports:
 *   detectVcsFromRemote() → {provider, owner, repo, base_url} or throws
 *   loadVcsConfig(vcsYmlPath) → validated config object or throws
 *   queryApprovals(vcsConfig, prNumber) → {pr_number, approver_count, state} or throws
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');
const os = require('os');

function die(msg) { throw new Error(msg); }

// Parse git remote URL → {provider, owner, repo, base_url}
// Handles: github.com, bitbucket.org, self-hosted via https://host/org/repo.git
function detectVcsFromRemote(remoteUrl) {
  const url = remoteUrl.trim();

  // SSH: git@github.com:creativemyntra/keel.git
  const sshMatch = url.match(/^git@([^:]+):([^/]+)\/(.+?)(\.git)?$/);
  if (sshMatch) {
    const [, host, owner, repo] = sshMatch;
    if (host === 'github.com') return { provider: 'github', owner, repo, base_url: '' };
    if (host === 'bitbucket.org') return { provider: 'bitbucket', owner, repo, base_url: '' };
    // Self-hosted via SSH (infer from path structure)
    return { provider: 'bitbucket-server', owner, repo, base_url: `https://${host}` };
  }

  // HTTPS: https://github.com/creativemyntra/keel.git or https://bitbucket.example.com/scm/org/repo.git
  const httpsMatch = url.match(/^https:\/\/([^/]+)\/(.+?)\/(.+?)(\.git)?$/);
  if (httpsMatch) {
    const [, host, owner, repo] = httpsMatch;
    if (host === 'github.com') return { provider: 'github', owner, repo, base_url: '' };
    if (host === 'bitbucket.org') return { provider: 'bitbucket', owner, repo, base_url: '' };
    // Self-hosted
    if (host.includes('bitbucket')) return { provider: 'bitbucket-server', owner, repo, base_url: `https://${host}` };
    if (host.includes('github')) return { provider: 'github-enterprise', owner, repo, base_url: `https://${host}` };
    die(`Unrecognized VCS host: ${host} — configure manually in .keel/vcs.yml`);
  }

  die(`Cannot parse git remote URL: ${url} — configure .keel/vcs.yml manually`);
}

// Load and validate .keel/vcs.yml
function loadVcsConfig(vcsYmlPath) {
  if (!fs.existsSync(vcsYmlPath)) {
    die(`VCS config missing: ${vcsYmlPath} — initialize with: keel setup vcs`);
  }

  let content;
  try { content = fs.readFileSync(vcsYmlPath, 'utf8'); }
  catch (e) { die(`Cannot read VCS config: ${e.message}`); }

  // Minimal YAML parsing (comments, key: value, empty lines only)
  const lines = content.split('\n').filter(l => !l.trim().startsWith('#') && l.trim());
  const config = {};
  for (const line of lines) {
    const [key, ...rest] = line.split(':');
    if (!key || !rest.length) continue;
    config[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '');
  }

  // Validate required fields
  const provider = config.provider;
  if (!['github', 'github-enterprise', 'bitbucket', 'bitbucket-server'].includes(provider)) {
    die(`Invalid provider in vcs.yml: ${provider} — must be github|bitbucket|github-enterprise|bitbucket-server`);
  }

  const owner = config.owner;
  if (!owner) die('VCS config missing: owner (github: org/username, bitbucket: workspace)');

  const repo = config.repo;
  if (!repo) die('VCS config missing: repo (github: repo name, bitbucket: repo_slug)');

  // For self-hosted, base_url is required
  if (provider.includes('-enterprise') || provider.includes('-server')) {
    const baseUrl = config.base_url;
    if (!baseUrl) die(`VCS config missing: base_url required for ${provider}`);
  }

  return {
    provider,
    owner,
    repo,
    base_url: config.base_url || '',
    token_file: config.token_file || `~/.keel/secrets/${provider}.token`,
  };
}

// Load auth token from ~/.keel/secrets/<provider>.token (gitignored)
// RH-2 FIX: Use path.join(os.homedir()) instead of string replace for Windows compat
function loadAuthToken(tokenFile) {
  let expanded = tokenFile;
  if (tokenFile.startsWith('~')) {
    expanded = path.join(os.homedir(), tokenFile.slice(1)); // Remove leading ~, join with homedir
  }
  if (!fs.existsSync(expanded)) {
    console.warn(`note: auth token not found at ${expanded} — will attempt CLI/credential fallback`);
    return null; // Fallback: let CLI (gh, git credential) handle auth
  }
  try {
    const token = fs.readFileSync(expanded, 'utf8').trim();
    if (!token) {
      console.warn(`note: auth token file empty at ${expanded} — will attempt CLI/credential fallback`);
      return null;
    }
    return token;
  } catch (err) {
    console.warn(`note: cannot read auth token at ${expanded}: ${err.message} — will attempt CLI/credential fallback`);
    return null;
  }
}

// Query GitHub API for PR approvals
// Returns: {pr_number, state, approver_count}
function queryGitHubApprovals(owner, repo, prNumber, baseUrl = '', token = null) {
  const host = baseUrl ? new URL(baseUrl).hostname : 'api.github.com';
  const pathPrefix = baseUrl ? '/api/v3' : '';

  return new Promise((resolve, reject) => {
    const url = `${baseUrl || 'https://api.github.com'}/repos/${owner}/${repo}/pulls/${prNumber}/reviews`;
    const options = { hostname: host };
    if (token) options.headers = { Authorization: `token ${token}` };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const reviews = JSON.parse(data);
          if (!Array.isArray(reviews)) {
            return reject(new Error(`GitHub API returned non-array: ${typeof reviews}`));
          }
          const approvals = reviews.filter((r) => r.state === 'APPROVED').length;
          resolve({ pr_number: prNumber, state: 'active', approver_count: approvals });
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Query Bitbucket Cloud API for PR approvals
// Returns: {pr_number, state, approver_count}
function queryBitbucketCloudApprovals(owner, repo, prNumber, token = null) {
  return new Promise((resolve, reject) => {
    const url = `https://api.bitbucket.org/2.0/repositories/${owner}/${repo}/pullrequests/${prNumber}`;
    const options = {
      hostname: 'api.bitbucket.org',
      headers: {}
    };
    if (token) {
      options.headers.Authorization = `Bearer ${token}`;
    }

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const pr = JSON.parse(data);
          const reviewers = (pr.reviewers || []).filter((r) => r.approved).length;
          resolve({ pr_number: prNumber, state: pr.state, approver_count: reviewers });
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Query Bitbucket Server/Data Center API for PR approvals
// Returns: {pr_number, state, approver_count}
function queryBitbucketServerApprovals(baseUrl, owner, repo, prNumber, token = null) {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}/rest/api/1.0/projects/${owner}/repos/${repo}/pull-requests/${prNumber}`;
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {}
    };
    if (token) {
      options.headers.Authorization = `Bearer ${token}`;
    }

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const pr = JSON.parse(data);
          const approvals = (pr.reviewers || []).filter((r) => r.approved).length;
          resolve({ pr_number: prNumber, state: pr.state, approver_count: approvals });
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Main entry point: query approvals for a PR
// vcsConfig: result of loadVcsConfig()
// prNumber: GitHub PR# or Bitbucket PR#
// Returns: {pr_number, state, approver_count} or rejects
async function queryApprovals(vcsConfig, prNumber) {
  const token = loadAuthToken(vcsConfig.token_file);

  switch (vcsConfig.provider) {
    case 'github':
      return await queryGitHubApprovals(vcsConfig.owner, vcsConfig.repo, prNumber, '', token);
    case 'github-enterprise':
      return await queryGitHubApprovals(vcsConfig.owner, vcsConfig.repo, prNumber, vcsConfig.base_url, token);
    case 'bitbucket':
      return await queryBitbucketCloudApprovals(vcsConfig.owner, vcsConfig.repo, prNumber, token);
    case 'bitbucket-server':
      return await queryBitbucketServerApprovals(vcsConfig.base_url, vcsConfig.owner, vcsConfig.repo, prNumber, token);
    default:
      throw new Error(`Unknown VCS provider: ${vcsConfig.provider}`);
  }
}

module.exports = {
  detectVcsFromRemote,
  loadVcsConfig,
  queryApprovals,
  loadAuthToken,
};
