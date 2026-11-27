import assert from 'node:assert'
import { describe, it } from 'node:test'
import { getTipSha } from '../../src/lib/tip'
import { Branch, BranchType } from '../../src/models/branch'
import { TipState, Tip } from '../../src/models/tip'

describe('getTipSha', () => {
  it('returns sha for Valid tip state', () => {
    const branch = new Branch(
      'main',
      'origin/main',
      { sha: 'abcdef1234567890' },
      BranchType.Local,
      'refs/heads/main'
    )
    const tip: Tip = { kind: TipState.Valid, branch }
    assert.strictEqual(getTipSha(tip), 'abcdef1234567890')
  })

  it('returns currentSha for Detached tip state', () => {
    const tip: Tip = {
      kind: TipState.Detached,
      currentSha: 'deadbeef12345678',
    }
    assert.strictEqual(getTipSha(tip), 'deadbeef12345678')
  })

  it('returns (unknown) for Unborn tip state', () => {
    const tip: Tip = { kind: TipState.Unborn, ref: 'refs/heads/main' }
    assert.strictEqual(getTipSha(tip), '(unknown)')
  })

  it('returns (unknown) for Unknown tip state', () => {
    const tip: Tip = { kind: TipState.Unknown }
    assert.strictEqual(getTipSha(tip), '(unknown)')
  })
})
