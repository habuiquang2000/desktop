import assert from 'node:assert'
import { describe, it } from 'node:test'
import { TeamMentionFilter } from '../../../src/lib/markdown-filters/team-mention-filter'
import { GitHubRepository } from '../../../src/models/github-repository'
import { Owner } from '../../../src/models/owner'
import { getDotComAPIEndpoint } from '../../../src/lib/api'

describe('TeamMentionFilter', () => {
  const orgOwner = new Owner(
    'desktop',
    getDotComAPIEndpoint(),
    1,
    'Organization'
  )
  const userOwner = new Owner('john', getDotComAPIEndpoint(), 2, 'User')

  const orgRepo = new GitHubRepository(
    'desktop',
    orgOwner,
    1,
    false,
    'https://github.com/desktop/desktop',
    'https://github.com/desktop/desktop.git',
    null,
    null,
    null,
    null
  )

  const userRepo = new GitHubRepository(
    'personal-project',
    userOwner,
    2,
    false,
    'https://github.com/john/personal-project',
    'https://github.com/john/personal-project.git',
    null,
    null,
    null,
    null
  )

  it('transforms @org/team into team profile anchor link when repo belongs to org', async () => {
    const filter = new TeamMentionFilter(orgRepo)
    const textNode = document.createTextNode('cc: @desktop/engineering team')

    const nodes = await filter.filter(textNode)
    assert.ok(nodes)
    assert.strictEqual(nodes.length, 3)

    assert.strictEqual(nodes[0].textContent, 'cc: ')
    const link = nodes[1] as HTMLAnchorElement
    assert.strictEqual(link.nodeName, 'A')
    assert.strictEqual(
      link.href,
      'https://github.com/orgs/desktop/teams/engineering'
    )
    assert.strictEqual(link.textContent, '@desktop/engineering')
    assert.strictEqual(nodes[2].textContent, ' team')
  })

  it('returns null when repo belongs to a User instead of an Organization', async () => {
    const filter = new TeamMentionFilter(userRepo)
    const textNode = document.createTextNode('cc: @john/team')

    const nodes = await filter.filter(textNode)
    assert.strictEqual(nodes, null)
  })

  it('returns null when text does not match org team pattern', async () => {
    const filter = new TeamMentionFilter(orgRepo)
    const textNode = document.createTextNode('No teams mentioned here.')

    const nodes = await filter.filter(textNode)
    assert.strictEqual(nodes, null)
  })
})
