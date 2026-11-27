import assert from 'node:assert'
import { describe, it } from 'node:test'
import { getFileFromExceedsError } from '../../src/lib/helpers/regex'

describe('regex / getFileFromExceedsError', () => {
  it('extracts filename and file size from GitHub file size error', () => {
    const error =
      "remote: error: File LargeFile.exe is 150.00 MB; this exceeds GitHub's file size limit of 100.00 MB"
    const files = getFileFromExceedsError(error)

    assert.deepStrictEqual(files, ['LargeFile.exe (150.00 MB)'])
  })

  it('extracts multiple files from multi-line error', () => {
    const error = [
      "remote: error: File path/to/dataset.zip is 250.50 MB; this exceeds GitHub's file size limit of 100.00 MB",
      "remote: error: File videos/demo.mp4 is 120.00 MB; this exceeds GitHub's file size limit of 100.00 MB",
    ].join('\n')

    const files = getFileFromExceedsError(error)
    assert.deepStrictEqual(files, [
      'path/to/dataset.zip (250.50 MB)',
      'videos/demo.mp4 (120.00 MB)',
    ])
  })

  it('returns empty array when error message has no size limit exceedings', () => {
    const error = 'fatal: unable to access repository: 403 Forbidden'
    assert.deepStrictEqual(getFileFromExceedsError(error), [])
  })

  it('returns empty array when beginning and ending match counts do not match', () => {
    const corrupted =
      'remote: error: File broken.dat is 200 MB; something else happened'
    assert.deepStrictEqual(getFileFromExceedsError(corrupted), [])
  })
})
