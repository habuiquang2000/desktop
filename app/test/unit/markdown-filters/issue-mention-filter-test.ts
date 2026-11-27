import assert from 'node:assert'
import { describe, it } from 'node:test'
import { IssueMentionFilter } from '../../../src/lib/markdown-filters/issue-mention-filter'
import { gitHubRepoFixture } from '../../helpers/github-repo-builder'

describe('IssueMentionFilter', () => {
  const repo = gitHubRepoFixture({
    owner: 'desktop',
    name: 'desktop',
  })

  it('transforms #1234 into an anchor link', async () => {
    const filter = new IssueMentionFilter(repo)
    const textNode = document.createTextNode('See #1234 for details')

    const nodes = await filter.filter(textNode)
    assert.ok(nodes)
    assert.strictEqual(nodes.length, 3)

    assert.strictEqual(nodes[0].textContent, 'See ')
    const link = nodes[1] as HTMLAnchorElement
    assert.strictEqual(link.nodeName, 'A')
    assert.strictEqual(
      link.href,
      'https://github.com/desktop/desktop/issues/1234'
    )
    assert.strictEqual(link.textContent, '#1234')
    assert.strictEqual(nodes[2].textContent, ' for details')
  })

  it('transforms gh-1234 marker', async () => {
    const filter = new IssueMentionFilter(repo)
    const textNode = document.createTextNode('Reference gh-5678.')

    const nodes = await filter.filter(textNode)
    assert.ok(nodes)
    const link = nodes.find(n => n.nodeName === 'A') as HTMLAnchorElement
    assert.ok(link)
    assert.strictEqual(
      link.href,
      'https://github.com/desktop/desktop/issues/5678'
    )
    assert.strictEqual(link.textContent, 'gh-5678')
  })

  it('simplifies same-repo prefix desktop/desktop#123 to #123', async () => {
    const filter = new IssueMentionFilter(repo)
    const textNode = document.createTextNode('Check desktop/desktop#999 now')

    const nodes = await filter.filter(textNode)
    assert.ok(nodes)
    const link = nodes.find(n => n.nodeName === 'A') as HTMLAnchorElement
    assert.ok(link)
    assert.strictEqual(
      link.href,
      'https://github.com/desktop/desktop/issues/999'
    )
    assert.strictEqual(link.textContent, '#999')
  })

  it('keeps cross-repository owner/repo#123 link text', async () => {
    const filter = new IssueMentionFilter(repo)
    const textNode = document.createTextNode('Refer to atom/atom#42.')

    const nodes = await filter.filter(textNode)
    assert.ok(nodes)
    const link = nodes.find(n => n.nodeName === 'A') as HTMLAnchorElement
    assert.ok(link)
    assert.strictEqual(link.href, 'https://github.com/atom/atom/issues/42')
    assert.strictEqual(link.textContent, 'atom/atom#42')
  })

  it('returns null when no issue mention is present', async () => {
    const filter = new IssueMentionFilter(repo)
    const textNode = document.createTextNode('No issues mentioned here!')

    const nodes = await filter.filter(textNode)
    assert.strictEqual(nodes, null)
  })
})
