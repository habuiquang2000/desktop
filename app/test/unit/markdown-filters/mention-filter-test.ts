import assert from 'node:assert'
import { describe, it } from 'node:test'
import { MentionFilter } from '../../../src/lib/markdown-filters/mention-filter'
import { gitHubRepoFixture } from '../../helpers/github-repo-builder'

describe('MentionFilter', () => {
  const repo = gitHubRepoFixture({
    owner: 'desktop',
    name: 'desktop',
  })

  it('transforms @username into user profile anchor link', async () => {
    const filter = new MentionFilter(repo)
    const textNode = document.createTextNode('Hey @octocat, take a look!')

    const nodes = await filter.filter(textNode)
    assert.ok(nodes)
    assert.strictEqual(nodes.length, 3)

    assert.strictEqual(nodes[0].textContent, 'Hey ')
    const link = nodes[1] as HTMLAnchorElement
    assert.strictEqual(link.nodeName, 'A')
    assert.strictEqual(link.href, 'https://github.com/octocat')
    assert.strictEqual(link.textContent, '@octocat')
    assert.strictEqual(nodes[2].textContent, ', take a look!')
  })

  it('handles enterprise managed users (EMU) with underscores', async () => {
    const filter = new MentionFilter(repo)
    const textNode = document.createTextNode(
      'Assigned to @mona_corp for review.'
    )

    const nodes = await filter.filter(textNode)
    assert.ok(nodes)
    const link = nodes.find(n => n.nodeName === 'A') as HTMLAnchorElement
    assert.ok(link)
    assert.strictEqual(link.href, 'https://github.com/mona_corp')
    assert.strictEqual(link.textContent, '@mona_corp')
  })

  it('returns null when text does not contain @ mentions', async () => {
    const filter = new MentionFilter(repo)
    const textNode = document.createTextNode(
      'No user handles in this sentence.'
    )

    const nodes = await filter.filter(textNode)
    assert.strictEqual(nodes, null)
  })
})
