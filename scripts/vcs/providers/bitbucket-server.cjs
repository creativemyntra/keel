'use strict';

const VCSProvider = require('../provider.cjs');

/**
 * Bitbucket Server / Data Center Provider
 * Stub: not yet implemented
 */
class BitbucketServerProvider extends VCSProvider {
  async findPullRequest(branchName, storyId) {
    throw new Error(
      'Bitbucket Server/Data Center support is not yet implemented. ' +
      'Please use Bitbucket Cloud or GitHub. ' +
      'To request Server support, contact the keel team.'
    );
  }

  async getPullRequestStatus(prRef) {
    throw new Error(
      'Bitbucket Server/Data Center support is not yet implemented. ' +
      'Please use Bitbucket Cloud or GitHub.'
    );
  }

  async postComment(prRef, text) {
    throw new Error(
      'Bitbucket Server/Data Center support is not yet implemented. ' +
      'Please use Bitbucket Cloud or GitHub.'
    );
  }

  async testConnection() {
    return {
      ok: false,
      message: 'Bitbucket Server/Data Center support is not yet implemented. Please use Bitbucket Cloud or GitHub.',
    };
  }
}

module.exports = BitbucketServerProvider;
