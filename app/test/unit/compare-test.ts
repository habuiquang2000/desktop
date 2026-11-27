import assert from 'node:assert'
import { describe, it } from 'node:test'
import {
  compare,
  compareDescending,
  caseInsensitiveEquals,
  caseInsensitiveCompare,
  caseInsensitiveCompareDescending,
} from '../../src/lib/compare'

describe('compare', () => {
  it('compares values in ascending order', () => {
    assert.strictEqual(compare(1, 2), -1)
    assert.strictEqual(compare(2, 1), 1)
    assert.strictEqual(compare(2, 2), 0)
    assert.strictEqual(compare('apple', 'banana'), -1)
    assert.strictEqual(compare('cherry', 'banana'), 1)
    assert.strictEqual(compare('same', 'same'), 0)
  })

  it('compares values in descending order', () => {
    assert.strictEqual(compareDescending(1, 2), 1)
    assert.strictEqual(compareDescending(2, 1), -1)
    assert.strictEqual(compareDescending(2, 2), 0)
    assert.strictEqual(compareDescending('apple', 'banana'), 1)
    assert.strictEqual(compareDescending('cherry', 'banana'), -1)
    assert.strictEqual(compareDescending('same', 'same'), 0)
  })

  it('checks case-insensitive equality', () => {
    assert.strictEqual(caseInsensitiveEquals('Hello', 'hello'), true)
    assert.strictEqual(caseInsensitiveEquals('TEST', 'test'), true)
    assert.strictEqual(caseInsensitiveEquals('abc', 'def'), false)
  })

  it('compares strings case-insensitively ascending', () => {
    assert.strictEqual(caseInsensitiveCompare('Apple', 'banana'), -1)
    assert.strictEqual(caseInsensitiveCompare('Cherry', 'banana'), 1)
    assert.strictEqual(caseInsensitiveCompare('Same', 'same'), 0)
  })

  it('compares strings case-insensitively descending', () => {
    assert.strictEqual(caseInsensitiveCompareDescending('Apple', 'banana'), 1)
    assert.strictEqual(caseInsensitiveCompareDescending('Cherry', 'banana'), -1)
    assert.strictEqual(caseInsensitiveCompareDescending('Same', 'same'), 0)
  })

  it('supports chaining with || for multi-property sorting', () => {
    const items = [
      { first: 'John', last: 'Doe' },
      { first: 'Jane', last: 'Doe' },
      { first: 'Alice', last: 'Smith' },
    ]

    items.sort((a, b) => compare(a.last, b.last) || compare(a.first, b.first))

    assert.deepStrictEqual(items, [
      { first: 'Jane', last: 'Doe' },
      { first: 'John', last: 'Doe' },
      { first: 'Alice', last: 'Smith' },
    ])
  })
})
