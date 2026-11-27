import assert from 'node:assert'
import { describe, it } from 'node:test'
import {
  createLogParser,
  createForEachRefParser,
} from '../../src/lib/git/git-delimiter-parser'

describe('git-delimiter-parser', () => {
  describe('createLogParser', () => {
    it('generates expected format arguments', () => {
      const { formatArgs } = createLogParser({ sha: '%H', summary: '%s' })
      assert.deepStrictEqual(formatArgs, ['-z', '--format=%H%x00%s'])
    })

    it('parses formatted string output into entries', () => {
      const { parse } = createLogParser({ sha: '%H', summary: '%s' })
      const raw = 'sha1\0summary 1\0sha2\0summary 2\0'
      const parsed = parse(raw)

      assert.deepStrictEqual(parsed, [
        { sha: 'sha1', summary: 'summary 1' },
        { sha: 'sha2', summary: 'summary 2' },
      ])
    })

    it('parses buffer output into buffer entries', () => {
      const { parse } = createLogParser({ sha: '%H', summary: '%s' })
      const buf = Buffer.from('sha1\0summary 1\0sha2\0summary 2\0')
      const parsed = parse(buf)

      assert.strictEqual(parsed.length, 2)
      assert.strictEqual(parsed[0].sha.toString(), 'sha1')
      assert.strictEqual(parsed[0].summary.toString(), 'summary 1')
      assert.strictEqual(parsed[1].sha.toString(), 'sha2')
      assert.strictEqual(parsed[1].summary.toString(), 'summary 2')
    })
  })

  describe('createForEachRefParser', () => {
    it('generates expected format arguments', () => {
      const { formatArgs } = createForEachRefParser({
        ref: '%(refname)',
        sha: '%(objectname)',
      })
      assert.deepStrictEqual(formatArgs, [
        '--format=%00%(refname)%00%(objectname)%00',
      ])
    })

    it('parses for-each-ref output with newline delimiters', () => {
      const { parse } = createForEachRefParser({
        ref: '%(refname)',
        sha: '%(objectname)',
      })
      const raw =
        '\x00refs/heads/main\x00111111\x00\n\x00refs/heads/feature\x00222222\x00\n'
      const parsed = parse(raw)

      assert.deepStrictEqual(parsed, [
        { ref: 'refs/heads/main', sha: '111111' },
        { ref: 'refs/heads/feature', sha: '222222' },
      ])
    })

    it('throws when expected newline is missing', () => {
      const { parse } = createForEachRefParser({
        ref: '%(refname)',
        sha: '%(objectname)',
      })
      const corrupted =
        '\x00refs/heads/main\x00111111\x00BAD\x00refs/heads/feature\x00222222\x00\n'
      assert.throws(() => parse(corrupted), /Expected newline/)
    })
  })
})
