import assert from 'node:assert'
import { describe, it } from 'node:test'
import { DiffLine, DiffLineType } from '../../src/models/diff/diff-line'

describe('DiffLine', () => {
  it('instantiates and provides content without marker', () => {
    const addLine = new DiffLine('+const x = 1', DiffLineType.Add, 10, null, 15)
    assert.strictEqual(addLine.text, '+const x = 1')
    assert.strictEqual(addLine.content, 'const x = 1')
    assert.strictEqual(addLine.type, DiffLineType.Add)
    assert.strictEqual(addLine.originalLineNumber, 10)
    assert.strictEqual(addLine.oldLineNumber, null)
    assert.strictEqual(addLine.newLineNumber, 15)
    assert.strictEqual(addLine.noTrailingNewLine, false)
  })

  it('determines isIncludeableLine correctly', () => {
    const addLine = new DiffLine('+add', DiffLineType.Add, 1, null, 1)
    const deleteLine = new DiffLine('-del', DiffLineType.Delete, 1, 1, null)
    const contextLine = new DiffLine(' ctx', DiffLineType.Context, 1, 1, 1)
    const hunkLine = new DiffLine(
      '@@ -1,1 +1,1 @@',
      DiffLineType.Hunk,
      null,
      null,
      null
    )

    assert.strictEqual(addLine.isIncludeableLine(), true)
    assert.strictEqual(deleteLine.isIncludeableLine(), true)
    assert.strictEqual(contextLine.isIncludeableLine(), false)
    assert.strictEqual(hunkLine.isIncludeableLine(), false)
  })

  it('returns a new instance with withNoTrailingNewLine', () => {
    const line = new DiffLine('+line', DiffLineType.Add, 1, null, 1, false)
    const updated = line.withNoTrailingNewLine(true)

    assert.strictEqual(updated.noTrailingNewLine, true)
    assert.strictEqual(line.noTrailingNewLine, false)
    assert.strictEqual(updated.text, line.text)
    assert.strictEqual(updated.type, line.type)
  })

  it('checks equality with other DiffLine', () => {
    const a = new DiffLine('+test', DiffLineType.Add, 1, null, 1, false)
    const b = new DiffLine('+test', DiffLineType.Add, 1, null, 1, false)
    const c = new DiffLine('+other', DiffLineType.Add, 1, null, 1, false)

    assert.strictEqual(a.equals(b), true)
    assert.strictEqual(a.equals(c), false)
  })
})
