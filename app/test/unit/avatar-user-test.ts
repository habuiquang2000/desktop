import assert from 'node:assert'
import { describe, it } from 'node:test'
import {
  getAvatarUserFromAuthor,
  getAvatarUsersForCommit,
} from '../../src/models/avatar'
import { Commit } from '../../src/models/commit'
import { CommitIdentity } from '../../src/models/commit-identity'
import { gitHubRepoFixture } from '../helpers/github-repo-builder'

describe('avatar', () => {
  const dotComRepo = gitHubRepoFixture({
    owner: 'desktop',
    name: 'desktop',
  })

  describe('getAvatarUserFromAuthor', () => {
    it('creates an IAvatarUser from author and repo', () => {
      const author = new CommitIdentity(
        'Alice',
        'alice@example.com',
        new Date()
      )
      const user = getAvatarUserFromAuthor(author, dotComRepo)
      assert.deepStrictEqual(user, {
        email: 'alice@example.com',
        name: 'Alice',
        endpoint: dotComRepo.endpoint,
        avatarURL: undefined,
      })
    })

    it('sets endpoint to null when repository is null', () => {
      const author = new CommitIdentity('Bob', 'bob@example.com', new Date())
      const user = getAvatarUserFromAuthor(author, null)
      assert.strictEqual(user.endpoint, null)
    })
  })

  describe('getAvatarUsersForCommit', () => {
    it('returns author when authored by committer', () => {
      const author = new CommitIdentity(
        'Alice',
        'alice@example.com',
        new Date()
      )
      const commit = new Commit(
        'sha',
        's',
        'sum',
        'body',
        author,
        author,
        [],
        [],
        []
      )

      const avatarUsers = getAvatarUsersForCommit(dotComRepo, commit)
      assert.strictEqual(avatarUsers.length, 1)
      assert.strictEqual(avatarUsers[0].name, 'Alice')
      assert.strictEqual(avatarUsers[0].email, 'alice@example.com')
    })

    it('includes co-authors and distinct committer', () => {
      const author = new CommitIdentity(
        'Alice',
        'alice@example.com',
        new Date()
      )
      const committer = new CommitIdentity(
        'Charlie',
        'charlie@example.com',
        new Date()
      )
      const trailers = [
        { token: 'Co-Authored-By', value: 'Bob <bob@example.com>' },
      ]
      const commit = new Commit(
        'sha',
        's',
        'sum',
        'body',
        author,
        committer,
        [],
        trailers,
        []
      )

      const avatarUsers = getAvatarUsersForCommit(dotComRepo, commit)
      assert.strictEqual(avatarUsers.length, 3)
      assert.strictEqual(avatarUsers[0].name, 'Alice')
      assert.strictEqual(avatarUsers[1].name, 'Bob')
      assert.strictEqual(avatarUsers[2].name, 'Charlie')
    })

    it('omits web-flow committer', () => {
      const author = new CommitIdentity(
        'Alice',
        'alice@example.com',
        new Date()
      )
      const webFlowCommitter = new CommitIdentity(
        'GitHub',
        'noreply@github.com',
        new Date()
      )
      const commit = new Commit(
        'sha',
        's',
        'sum',
        'body',
        author,
        webFlowCommitter,
        [],
        [],
        []
      )

      const avatarUsers = getAvatarUsersForCommit(dotComRepo, commit)
      assert.strictEqual(avatarUsers.length, 1)
      assert.strictEqual(avatarUsers[0].name, 'Alice')
    })

    it('remaps copilot-swe-agent[bot] with stealth email to Copilot', () => {
      const author = new CommitIdentity(
        'copilot-swe-agent[bot]',
        '198982489+Copilot@users.noreply.github.com',
        new Date()
      )
      const commit = new Commit(
        'sha',
        's',
        'sum',
        'body',
        author,
        author,
        [],
        [],
        []
      )

      const avatarUsers = getAvatarUsersForCommit(dotComRepo, commit)
      assert.strictEqual(avatarUsers.length, 1)
      assert.strictEqual(avatarUsers[0].name, 'Copilot')
    })
  })
})
