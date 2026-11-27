import assert from 'node:assert'
import { describe, it } from 'node:test'
import {
  findAssociatedPullRequest,
  isPullRequestAssociatedWithBranch,
} from '../../src/lib/helpers/pull-request-matching'
import { Branch, BranchType } from '../../src/models/branch'
import { PullRequest, PullRequestRef } from '../../src/models/pull-request'
import { IRemote } from '../../src/models/remote'
import { gitHubRepoFixture } from '../helpers/github-repo-builder'

describe('pull-request-matching', () => {
  const repo = gitHubRepoFixture({
    owner: 'desktop',
    name: 'desktop',
  })

  const remote: IRemote = {
    name: 'origin',
    url: 'https://github.com/desktop/desktop.git',
  }

  const branchTip = { sha: '1234567' }
  const localBranch = new Branch(
    'feature-1',
    'origin/feature-1',
    branchTip,
    BranchType.Local,
    'refs/heads/feature-1'
  )

  const headRef = new PullRequestRef('feature-1', '1234567', repo)
  const baseRef = new PullRequestRef('main', '0000000', repo)
  const pr = new PullRequest(
    new Date(),
    'Add awesome feature',
    101,
    headRef,
    baseRef,
    'author-user',
    false,
    'PR body description'
  )

  it('associates branch when upstream without remote matches head ref', () => {
    assert.strictEqual(
      isPullRequestAssociatedWithBranch(localBranch, pr, remote),
      true
    )
  })

  it('returns false when head ref does not match branch upstream', () => {
    const otherHeadRef = new PullRequestRef('other-branch', '1234567', repo)
    const otherPr = new PullRequest(
      new Date(),
      'Other PR',
      102,
      otherHeadRef,
      baseRef,
      'author-user',
      false,
      ''
    )
    assert.strictEqual(
      isPullRequestAssociatedWithBranch(localBranch, otherPr, remote),
      false
    )
  })

  it('finds associated pull request from list', () => {
    const prList = [pr]
    const found = findAssociatedPullRequest(localBranch, prList, remote)
    assert.strictEqual(found, pr)
  })

  it('returns null if branch has no upstream', () => {
    const branchWithoutUpstream = new Branch(
      'feature-2',
      null,
      branchTip,
      BranchType.Local,
      'refs/heads/feature-2'
    )
    const found = findAssociatedPullRequest(branchWithoutUpstream, [pr], remote)
    assert.strictEqual(found, null)
  })

  it('returns null if no pull request in list matches', () => {
    const found = findAssociatedPullRequest(localBranch, [], remote)
    assert.strictEqual(found, null)
  })
})
