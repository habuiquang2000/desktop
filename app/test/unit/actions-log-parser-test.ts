import assert from 'node:assert'
import { describe, it } from 'node:test'
import { ActionsLogParser } from '../../src/lib/actions-log-parser/action-log-parser'
import { ESC } from '../../src/lib/actions-log-parser/actions-logs-ansii'

describe('ActionsLogParser', () => {
  it('parses basic log lines with line numbers and permalink', () => {
    const raw = 'First line\nSecond line\nThird line'
    const parser = new ActionsLogParser(raw, 'https://github.com/run#step')
    const lines = parser.getParsedLogLinesTemplateData()

    assert.strictEqual(lines.length, 3)
    assert.strictEqual(lines[0].lineNumber, 1)
    assert.strictEqual(lines[0].lineUrl, 'https://github.com/run#step:1')
    assert.strictEqual(
      lines[0].lineContent[0].output[0].entry.trim(),
      'First line'
    )
    assert.strictEqual(lines[1].lineNumber, 2)
    assert.strictEqual(lines[2].lineNumber, 3)
  })

  it('extracts ISO 8601 timestamps and strips them from content', () => {
    const raw = '2023-01-01T12:00:00.1234567Z Running build...'
    const parser = new ActionsLogParser(raw, 'prefix')
    const lines = parser.getParsedLogLinesTemplateData()

    assert.strictEqual(lines.length, 1)
    assert.strictEqual(
      lines[0].lineContent[0].output[0].entry,
      'Running build...'
    )
    assert.ok(lines[0].timeStamp?.includes('2023'))
  })

  it('parses pipeline commands: error, warning, notice, debug, command', () => {
    const raw = [
      '##[error]Something went wrong',
      '##[warning]This is deprecated',
      '##[notice]FYI note',
      '##[debug]Variable x = 5',
      '##[command]npm test',
    ].join('\n')

    const parser = new ActionsLogParser(raw, 'prefix')
    const lines = parser.getParsedLogLinesTemplateData()

    assert.strictEqual(lines[0].isError, true)
    assert.strictEqual(lines[0].className, 'log-line-error')
    assert.strictEqual(
      lines[0].lineContent[0].output[0].entry.trim(),
      'Something went wrong'
    )

    assert.strictEqual(lines[1].isWarning, true)
    assert.strictEqual(lines[1].className, 'log-line-warning')

    assert.strictEqual(lines[2].isNotice, true)
    assert.strictEqual(lines[2].className, 'log-line-notice')

    assert.strictEqual(lines[3].className, 'log-line-debug')
    assert.strictEqual(lines[4].className, 'log-line-command')
  })

  it('handles collapsible groups: group and endgroup', () => {
    const raw = [
      '##[group]Build Steps',
      'step 1 done',
      'step 2 done',
      '##[endgroup]',
      'after group',
    ].join('\n')

    const parser = new ActionsLogParser(raw, 'prefix')
    const lines = parser.getParsedLogLinesTemplateData()

    // ##[endgroup] is consumed and not rendered as a log line
    assert.strictEqual(lines.length, 4)
    assert.strictEqual(lines[0].isGroup, true)
    assert.strictEqual(lines[0].inGroup, false)
    assert.strictEqual(lines[1].inGroup, true)
    assert.strictEqual(lines[2].inGroup, true)
    assert.strictEqual(lines[3].inGroup, false)
  })

  it('parses ANSI formatting and colors', () => {
    const raw = `${ESC}[1mBold Text${ESC}[0m Normal ${ESC}[31mRed Text${ESC}[0m`
    const parser = new ActionsLogParser(raw, 'prefix')
    const lines = parser.getParsedLogLinesTemplateData()

    assert.strictEqual(lines.length, 1)
    const content = lines[0].lineContent
    assert.ok(content.some(c => c.classes.includes('text-bold')))
    assert.ok(content.some(c => c.classes.includes('ansifg-r')))
  })

  it('auto-links URLs in logs', () => {
    const raw = 'Visit https://github.com/desktop/desktop for details'
    const parser = new ActionsLogParser(raw, 'prefix')
    const lines = parser.getParsedLogLinesTemplateData()

    assert.strictEqual(lines.length, 1)
    const outputs = lines[0].lineContent[0].output
    const urlEntry = outputs.find(
      o => o.entryUrl === 'https://github.com/desktop/desktop'
    )
    assert.ok(urlEntry)
  })
})
