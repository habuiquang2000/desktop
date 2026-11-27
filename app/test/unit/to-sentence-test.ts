import assert from 'node:assert'
import { describe, it } from 'node:test'
import { toSentence } from '../../src/lib/to_sentence'

describe('toSentence', () => {
  it('returns empty string for empty array', () => {
    assert.strictEqual(toSentence([]), '')
  })

  it('returns single element as-is', () => {
    assert.strictEqual(toSentence(['apple']), 'apple')
  })

  it('joins two elements with " and "', () => {
    assert.strictEqual(toSentence(['apple', 'banana']), 'apple and banana')
  })

  it('joins three or more elements with commas and Oxford comma', () => {
    assert.strictEqual(
      toSentence(['apple', 'banana', 'cherry']),
      'apple, banana, and cherry'
    )
    assert.strictEqual(
      toSentence(['one', 'two', 'three', 'four']),
      'one, two, three, and four'
    )
  })
})
