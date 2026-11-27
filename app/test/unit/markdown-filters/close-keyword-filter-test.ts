import assert from 'node:assert'
import { describe, it } from 'node:test'
import {
  CloseKeywordFilter,
  isIssueClosingContext,
} from '../../../src/lib/markdown-filters/close-keyword-filter'
import { gitHubRepoFixture } from '../../helpers/github-repo-builder'

describe('CloseKeywordFilter', () => {
  const repo = gitHubRepoFixture({
    owner: 'desktop',
    name: 'desktop',
  })

  describe('isIssueClosingContext', () => {
    it('returns true for Commit and PullRequest contexts', () => {
      assert.strictEqual(isIssueClosingContext('Commit'), true)
      assert.strictEqual(isIssueClosingContext('PullRequest'), true)
    })

    it('returns false for other contexts', () => {
      assert.strictEqual(isIssueClosingContext('PullRequestComment'), false)
      assert.strictEqual(isIssueClosingContext('IssueComment'), false)
      assert.strictEqual(isIssueClosingContext('ReleaseNotes' as any), false)
    })
  })

  describe('filter', () => {
    it('replaces close keywords with styled spans containing tooltips', async () => {
      const filter = new CloseKeywordFilter('PullRequest', repo)
      const textNode = document.createTextNode('Closes #1234')

      const nodes = await filter.filter(textNode)
      assert.ok(nodes)
      assert.strictEqual(nodes.length, 3)

      const span = nodes[1] as HTMLSpanElement
      assert.strictEqual(span.nodeName, 'SPAN')
      assert.strictEqual(span.className, 'issue-keyword')
      assert.strictEqual(span.textContent, 'Closes')
      assert.strictEqual(span.ariaLabel, 'This pull request closes #1234.')

      assert.strictEqual(nodes[2].textContent, ' #1234')
    })

    it('recognizes various closing keywords: Fixes, Resolves, Closed', async () => {
      const filter = new CloseKeywordFilter('PullRequest', repo)
      const textNode = document.createTextNode('Fixes #456 and resolves #789')

      const nodes = await filter.filter(textNode)
      assert.ok(nodes)
      const spans = nodes.filter(
        n => n.nodeName === 'SPAN'
      ) as HTMLSpanElement[]
      assert.strictEqual(spans.length, 2)
      assert.strictEqual(spans[0].textContent, 'Fixes')
      assert.strictEqual(spans[1].textContent, 'resolves')
    })

    it('returns null when text does not match closing keywords', async () => {
      const filter = new CloseKeywordFilter('PullRequest', repo)
      const textNode = document.createTextNode('Just mentioning #1234 here')

      const nodes = await filter.filter(textNode)
      assert.strictEqual(nodes, null)
    })

    it('returns null for non-text nodes', async () => {
      const filter = new CloseKeywordFilter('PullRequest', repo)
      const divNode = document.createElement('div')

      const nodes = await filter.filter(divNode)
      assert.strictEqual(nodes, null)
    })
  })
})
