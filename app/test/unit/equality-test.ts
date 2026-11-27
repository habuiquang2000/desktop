import assert from 'node:assert'
import { describe, it } from 'node:test'
import {
  structuralEquals,
  shallowEquals,
  arrayEquals,
  mapKeysEqual,
} from '../../src/lib/equality'
import { createEqualityHash } from '../../src/models/equality-hash'

describe('equality', () => {
  describe('structuralEquals', () => {
    it('compares deeply equal objects', () => {
      const a = { x: 1, y: { z: 'foo' } }
      const b = { x: 1, y: { z: 'foo' } }
      assert.strictEqual(structuralEquals(a, b), true)
    })

    it('returns false for structurally different objects', () => {
      const a = { x: 1, y: { z: 'foo' } }
      const b = { x: 1, y: { z: 'bar' } }
      assert.strictEqual(structuralEquals(a, b), false)
    })
  })

  describe('shallowEquals', () => {
    it('returns true for same reference', () => {
      const obj = { a: 1 }
      assert.strictEqual(shallowEquals(obj, obj), true)
    })

    it('returns true for shallow equal objects', () => {
      assert.strictEqual(
        shallowEquals({ a: 1, b: '2' }, { a: 1, b: '2' }),
        true
      )
    })

    it('returns false for nested object inequality by reference', () => {
      assert.strictEqual(shallowEquals({ a: {} }, { a: {} }), false)
    })

    it('returns false for different keys or length', () => {
      assert.strictEqual(shallowEquals({ a: 1 }, { a: 1, b: 2 }), false)
      assert.strictEqual(shallowEquals({ a: 1 }, { b: 1 }), false)
    })

    it('returns false when either argument is null or non-object', () => {
      assert.strictEqual(shallowEquals(null, {}), false)
      assert.strictEqual(shallowEquals({}, null), false)
      assert.strictEqual(shallowEquals(undefined, {}), false)
      assert.strictEqual(shallowEquals(42, {}), false)
    })
  })

  describe('arrayEquals', () => {
    it('returns true for identical references or both empty', () => {
      const arr = [1, 2]
      assert.strictEqual(arrayEquals(arr, arr), true)
      assert.strictEqual(arrayEquals([], []), true)
    })

    it('returns true for arrays with identical elements in order', () => {
      assert.strictEqual(arrayEquals(['a', 'b'], ['a', 'b']), true)
    })

    it('returns false for arrays with different lengths or elements', () => {
      assert.strictEqual(arrayEquals(['a'], ['a', 'b']), false)
      assert.strictEqual(arrayEquals(['a', 'b'], ['b', 'a']), false)
      assert.strictEqual(arrayEquals([{}], [{}]), false)
    })
  })

  describe('mapKeysEqual', () => {
    it('returns true for same map reference or empty maps', () => {
      const map = new Map<string, number>()
      assert.strictEqual(mapKeysEqual(map, map), true)
      assert.strictEqual(mapKeysEqual(new Map(), new Map()), true)
    })

    it('returns true for maps with the exact same keys', () => {
      const m1 = new Map([
        ['a', 1],
        ['b', 2],
      ])
      const m2 = new Map([
        ['b', 99],
        ['a', 100],
      ])
      assert.strictEqual(mapKeysEqual(m1, m2), true)
    })

    it('returns false for maps with different keys or sizes', () => {
      const m1 = new Map([['a', 1]])
      const m2 = new Map([
        ['a', 1],
        ['b', 2],
      ])
      const m3 = new Map([['c', 1]])
      assert.strictEqual(mapKeysEqual(m1, m2), false)
      assert.strictEqual(mapKeysEqual(m1, m3), false)
    })
  })

  describe('createEqualityHash', () => {
    it('joins hashable items with plus', () => {
      assert.strictEqual(createEqualityHash('repo', 123, true), 'repo+123+true')
      assert.strictEqual(createEqualityHash('a', null, undefined), 'a++')
      assert.strictEqual(createEqualityHash(), '')
    })
  })
})
