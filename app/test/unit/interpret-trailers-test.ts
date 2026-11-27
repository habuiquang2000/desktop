import assert from 'node:assert'
import { describe, it } from 'node:test'
import {
  isCoAuthoredByTrailer,
  parseSingleUnfoldedTrailer,
  parseRawUnfoldedTrailers,
} from '../../src/lib/git/interpret-trailers'

describe('interpret-trailers', () => {
  describe('isCoAuthoredByTrailer', () => {
    it('returns true for Co-Authored-By with varying casing', () => {
      assert.strictEqual(
        isCoAuthoredByTrailer({
          token: 'Co-Authored-By',
          value: 'Alice <a@b.com>',
        }),
        true
      )
      assert.strictEqual(
        isCoAuthoredByTrailer({
          token: 'co-authored-by',
          value: 'Alice <a@b.com>',
        }),
        true
      )
      assert.strictEqual(
        isCoAuthoredByTrailer({
          token: 'CO-AUTHORED-BY',
          value: 'Alice <a@b.com>',
        }),
        true
      )
    })

    it('returns false for other trailer tokens', () => {
      assert.strictEqual(
        isCoAuthoredByTrailer({
          token: 'Signed-off-by',
          value: 'Alice <a@b.com>',
        }),
        false
      )
      assert.strictEqual(
        isCoAuthoredByTrailer({ token: 'Fixes', value: '#123' }),
        false
      )
    })
  })

  describe('parseSingleUnfoldedTrailer', () => {
    it('parses trailer using colon separator', () => {
      const trailer = parseSingleUnfoldedTrailer(
        'Signed-off-by: Markus <m@gh.com>',
        ':'
      )
      assert.deepStrictEqual(trailer, {
        token: 'Signed-off-by',
        value: 'Markus <m@gh.com>',
      })
    })

    it('trims whitespace around token and value', () => {
      const trailer = parseSingleUnfoldedTrailer(
        '  Co-Authored-By  :   Bob <b@gh.com>  ',
        ':'
      )
      assert.deepStrictEqual(trailer, {
        token: 'Co-Authored-By',
        value: 'Bob <b@gh.com>',
      })
    })

    it('supports custom separators', () => {
      const trailer = parseSingleUnfoldedTrailer(
        'Custom-Key = Custom Value',
        '=:'
      )
      assert.deepStrictEqual(trailer, {
        token: 'Custom-Key',
        value: 'Custom Value',
      })
    })

    it('returns null if no separator matches or line starts with separator', () => {
      assert.strictEqual(
        parseSingleUnfoldedTrailer('No separator here', ':'),
        null
      )
      assert.strictEqual(parseSingleUnfoldedTrailer(':Value only', ':'), null)
    })
  })

  describe('parseRawUnfoldedTrailers', () => {
    it('parses multi-line trailers', () => {
      const raw = [
        'Signed-off-by: Markus <m@gh.com>',
        'Co-Authored-By: Alice <a@gh.com>',
        'Co-Authored-By: Bob <b@gh.com>',
      ].join('\n')

      const parsed = parseRawUnfoldedTrailers(raw, ':')
      assert.strictEqual(parsed.length, 3)
      assert.strictEqual(parsed[0].token, 'Signed-off-by')
      assert.strictEqual(parsed[1].token, 'Co-Authored-By')
      assert.strictEqual(parsed[1].value, 'Alice <a@gh.com>')
      assert.strictEqual(parsed[2].value, 'Bob <b@gh.com>')
    })

    it('ignores invalid or empty lines', () => {
      const raw = '\nInvalid line\nSigned-off-by: Markus <m@gh.com>\n\n'
      const parsed = parseRawUnfoldedTrailers(raw, ':')
      assert.strictEqual(parsed.length, 1)
      assert.strictEqual(parsed[0].token, 'Signed-off-by')
    })
  })
})
