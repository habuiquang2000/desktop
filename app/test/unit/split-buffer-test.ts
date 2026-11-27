import assert from 'node:assert'
import { describe, it } from 'node:test'
import { splitBuffer } from '../../src/lib/split-buffer'

describe('splitBuffer', () => {
  it('splits a buffer using single-character delimiter', () => {
    const buf = Buffer.from('foo\0bar\0baz')
    const chunks = splitBuffer(buf, '\0')
    assert.strictEqual(chunks.length, 3)
    assert.strictEqual(chunks[0].toString(), 'foo')
    assert.strictEqual(chunks[1].toString(), 'bar')
    assert.strictEqual(chunks[2].toString(), 'baz')
  })

  it('splits a buffer using multi-character delimiter', () => {
    const buf = Buffer.from('one<DELIM>two<DELIM>three')
    const chunks = splitBuffer(buf, '<DELIM>')
    assert.strictEqual(chunks.length, 3)
    assert.strictEqual(chunks[0].toString(), 'one')
    assert.strictEqual(chunks[1].toString(), 'two')
    assert.strictEqual(chunks[2].toString(), 'three')
  })

  it('handles delimiter at the beginning and end', () => {
    const buf = Buffer.from('\0hello\0')
    const chunks = splitBuffer(buf, '\0')
    assert.strictEqual(chunks.length, 3)
    assert.strictEqual(chunks[0].toString(), '')
    assert.strictEqual(chunks[1].toString(), 'hello')
    assert.strictEqual(chunks[2].toString(), '')
  })

  it('returns single chunk if delimiter is not found', () => {
    const buf = Buffer.from('no-delimiters-here')
    const chunks = splitBuffer(buf, ':')
    assert.strictEqual(chunks.length, 1)
    assert.strictEqual(chunks[0].toString(), 'no-delimiters-here')
  })

  it('handles empty buffer', () => {
    const buf = Buffer.alloc(0)
    const chunks = splitBuffer(buf, '\0')
    assert.strictEqual(chunks.length, 1)
    assert.strictEqual(chunks[0].length, 0)
  })
})
