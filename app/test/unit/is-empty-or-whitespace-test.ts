import assert from 'node:assert'
import { describe, it } from 'node:test'
import { isEmptyOrWhitespace } from '../../src/lib/is-empty-or-whitespace'

describe('isEmptyOrWhitespace', () => {
  it('returns true for empty string', () => {
    assert.strictEqual(isEmptyOrWhitespace(''), true)
  })

  it('returns true for whitespace-only strings', () => {
    assert.strictEqual(isEmptyOrWhitespace('   '), true)
    assert.strictEqual(isEmptyOrWhitespace('\t\n\r '), true)
    assert.strictEqual(isEmptyOrWhitespace('\u00A0'), true)
  })

  it('returns false for non-whitespace strings', () => {
    assert.strictEqual(isEmptyOrWhitespace('a'), false)
    assert.strictEqual(isEmptyOrWhitespace('  word  '), false)
    assert.strictEqual(isEmptyOrWhitespace('123'), false)
    assert.strictEqual(isEmptyOrWhitespace('🚀'), false)
  })
})
