'use strict';

const VCSProvider = require('./provider.cjs');
const GitHubProvider = require('./providers/github.cjs');
const BitbucketCloudProvider = require('./providers/bitbucket-cloud.cjs');
const BitbucketServerProvider = require('./providers/bitbucket-server.cjs');

/**
 * Factory: create provider instance from config
 * @param {object} config - VCS configuration object
 * @returns {VCSProvider} - Concrete provider instance
 * @throws Error if provider unknown or config invalid
 */
function createVCSProvider(config) {
  if (!config.provider) {
    throw new Error('VCS config missing required field: provider');
  }
  if (!config.owner) {
    throw new Error('VCS config missing required field: owner');
  }
  if (!config.repo) {
    throw new Error('VCS config missing required field: repo');
  }

  const { provider } = config;

  switch (provider) {
    case 'github':
      return new GitHubProvider(config);
    case 'github-enterprise':
      return new GitHubProvider(config);
    case 'bitbucket':
      return new BitbucketCloudProvider(config);
    case 'bitbucket-cloud':
      return new BitbucketCloudProvider(config);
    case 'bitbucket-server':
      return new BitbucketServerProvider(config);
    default:
      throw new Error(`Unknown VCS provider: ${provider}`);
  }
}

module.exports = {
  VCSProvider,
  GitHubProvider,
  BitbucketCloudProvider,
  BitbucketServerProvider,
  createVCSProvider,
};
