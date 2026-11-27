import assert from 'node:assert'
import { describe, it } from 'node:test'
import { isWebFlowCommitter } from '../../src/lib/web-flow-committer'
import { Commit } from '../../src/models/commit'
import { CommitIdentity } from '../../src/models/commit-identity'
import { gitHubRepoFixture } from '../helpers/github-repo-builder'

function createCommit(
  authorName: string,
  authorEmail: string,
  committerName: string,
  committerEmail: string
) {
  const author = new CommitIdentity(authorName, authorEmail, new Date())
  const committer = new CommitIdentity(
    committerName,
    committerEmail,
    new Date()
  )
  return new Commit(
    '1234567890abcdef',
    '1234567',
    'Summary',
    'Body',
    author,
    committer,
    [],
    [],
    []
  )
}

describe('isWebFlowCommitter', () => {
  it('returns false when repository is null', () => {
    const commit = createCommit(
      'User',
      'user@test.com',
      'GitHub',
      'noreply@github.com'
    )
    assert.strictEqual(isWebFlowCommitter(commit, null as any), false)
  })

  it('returns true for dotcom web flow committer', () => {
    const repo = gitHubRepoFixture({ owner: 'desktop', name: 'desktop' })
    const commit = createCommit(
      'User',
      'user@test.com',
      'GitHub',
      'noreply@github.com'
    )
    assert.strictEqual(isWebFlowCommitter(commit, repo), true)
  })

  it('returns false for dotcom non-web flow committer', () => {
    const repo = gitHubRepoFixture({ owner: 'desktop', name: 'desktop' })
    const commit = createCommit(
      'User',
      'user@test.com',
      'Other',
      'noreply@github.com'
    )
    assert.strictEqual(isWebFlowCommitter(commit, repo), false)

    const commit2 = createCommit(
      'User',
      'user@test.com',
      'GitHub',
      'other@github.com'
    )
    assert.strictEqual(isWebFlowCommitter(commit2, repo), false)
  })

  it('returns true for GitHub Enterprise web flow committer', () => {
    const repo = gitHubRepoFixture({
      owner: 'enterprise-org',
      name: 'enterprise-repo',
      endpoint: 'https://ghe.example.com/api/v3',
    })
    const commit = createCommit(
      'User',
      'user@test.com',
      'GitHub Enterprise',
      'custom-noreply@example.com'
    )
    assert.strictEqual(isWebFlowCommitter(commit, repo), true)
  })

  it('returns false for GitHub Enterprise non-web flow committer', () => {
    const repo = gitHubRepoFixture({
      owner: 'enterprise-org',
      name: 'enterprise-repo',
      endpoint: 'https://ghe.example.com/api/v3',
    })
    const commit = createCommit(
      'User',
      'user@test.com',
      'Regular User',
      'user@example.com'
    )
    assert.strictEqual(isWebFlowCommitter(commit, repo), false)
  })
})
