import assert from 'node:assert'
import { describe, it } from 'node:test'
import { clamp } from '../../src/lib/clamp'

describe('clamp', () => {
  it('returns value within range', () => {
    assert.strictEqual(clamp(5, 0, 10), 5)
    assert.strictEqual(clamp(0, 0, 10), 0)
    assert.strictEqual(clamp(10, 0, 10), 10)
    assert.strictEqual(clamp(-5, -10, 0), -5)
  })

  it('clamps value below min', () => {
    assert.strictEqual(clamp(-1, 0, 10), 0)
    assert.strictEqual(clamp(-100, -50, 50), -50)
  })

  it('clamps value above max', () => {
    assert.strictEqual(clamp(15, 0, 10), 10)
    assert.strictEqual(clamp(100, -50, 50), 50)
  })

  it('works with IConstrainedValue', () => {
    assert.strictEqual(clamp({ value: 5, min: 0, max: 10 }), 5)
    assert.strictEqual(clamp({ value: -5, min: 0, max: 10 }), 0)
    assert.strictEqual(clamp({ value: 25, min: 0, max: 10 }), 10)
  })

  it('handles default min and max', () => {
    assert.strictEqual(clamp(42, -Infinity, Infinity), 42)
    assert.strictEqual(clamp(-999, -Infinity, Infinity), -999)
  })
})
