import assert from 'node:assert'
import { describe, it } from 'node:test'
import { isBranchPushable } from '../../src/lib/helpers/push-control'
import { IAPIPushControl } from '../../src/lib/api'

function createPushControl(partial: Partial<IAPIPushControl>): IAPIPushControl {
  return {
    allow_actor: true,
    required_status_checks: [],
    required_approving_review_count: 0,
    pattern: null,
    required_signatures: false,
    required_linear_history: false,
    allow_deletions: false,
    allow_force_pushes: false,
    ...partial,
  }
}

describe('isBranchPushable', () => {
  it('returns true when user is allowed and no merge requirements exist', () => {
    const pushControl = createPushControl({
      allow_actor: true,
      required_status_checks: [],
      required_approving_review_count: 0,
    })
    assert.strictEqual(isBranchPushable(pushControl), true)
  })

  it('returns false when allow_actor is false', () => {
    const pushControl = createPushControl({
      allow_actor: false,
      required_status_checks: [],
      required_approving_review_count: 0,
    })
    assert.strictEqual(isBranchPushable(pushControl), false)
  })

  it('returns false when status checks are required', () => {
    const pushControl = createPushControl({
      allow_actor: true,
      required_status_checks: ['ci/build', 'ci/test'],
      required_approving_review_count: 0,
    })
    assert.strictEqual(isBranchPushable(pushControl), false)
  })

  it('returns false when approving reviews are required', () => {
    const pushControl = createPushControl({
      allow_actor: true,
      required_status_checks: [],
      required_approving_review_count: 1,
    })
    assert.strictEqual(isBranchPushable(pushControl), false)
  })

  it('handles undefined or non-array required_status_checks gracefully', () => {
    const pushControl = createPushControl({
      allow_actor: true,
      required_status_checks: undefined as any,
      required_approving_review_count: 0,
    })
    assert.strictEqual(isBranchPushable(pushControl), true)
  })
})
