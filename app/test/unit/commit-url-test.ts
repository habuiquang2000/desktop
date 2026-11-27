import assert from 'node:assert'
import { describe, it } from 'node:test'
import * as crypto from 'crypto'
import { createCommitURL } from '../../src/lib/commit-url'
import { gitHubRepoFixture } from '../helpers/github-repo-builder'

describe('createCommitURL', () => {
  const repo = gitHubRepoFixture({
    owner: 'desktop',
    name: 'desktop',
  })

  it('creates a commit URL without file path', () => {
    const sha = '1234567890abcdef1234567890abcdef12345678'
    const url = createCommitURL(repo, sha)
    assert.strictEqual(url, `https://github.com/desktop/desktop/commit/${sha}`)
  })

  it('creates a commit URL with file path including diff hash anchor', () => {
    const sha = '1234567890abcdef1234567890abcdef12345678'
    const filePath = 'app/src/lib/commit-url.ts'
    const fileHash = crypto.createHash('sha256').update(filePath).digest('hex')

    const url = createCommitURL(repo, sha, filePath)
    assert.strictEqual(
      url,
      `https://github.com/desktop/desktop/commit/${sha}#diff-${fileHash}`
    )
  })

  it('returns null when repository htmlURL is null', () => {
    // create a repository with null htmlURL
    const nullUrlRepo = Object.assign(
      Object.create(Object.getPrototypeOf(repo)),
      repo,
      { htmlURL: null }
    )
    const url = createCommitURL(nullUrlRepo, 'abcdef')
    assert.strictEqual(url, null)
  })
})
