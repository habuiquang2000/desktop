import assert from 'node:assert'
import { afterEach, beforeEach, describe, it } from 'node:test'
import {
  clearAllFileSelections,
  forgetFileSelections,
  getRememberedFileSelection,
  getRememberedFileSelections,
  storeFileSelections,
} from '../../src/lib/stores/helpers/file-selection-storage'
import { Repository } from '../../src/models/repository'

function createRepository(id: number) {
  return new Repository(`/repositories/${id}`, id, null, false)
}

describe('file selection storage', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('stores and retrieves marked and unmarked file selections for a repository', () => {
    const repo = createRepository(1)

    assert.strictEqual(getRememberedFileSelection(repo, 'file1.ts'), undefined)

    // Mark file1 as included
    storeFileSelections(repo, ['file1.ts'], true)
    assert.strictEqual(getRememberedFileSelection(repo, 'file1.ts'), true)

    // Unmark file2 as excluded
    storeFileSelections(repo, ['file2.ts'], false)
    assert.strictEqual(getRememberedFileSelection(repo, 'file2.ts'), false)

    const selections = getRememberedFileSelections(repo)
    assert.deepStrictEqual(selections, {
      'file1.ts': true,
      'file2.ts': false,
    })
  })

  it('keeps selections independent across different repositories', () => {
    const repo1 = createRepository(1)
    const repo2 = createRepository(2)

    storeFileSelections(repo1, ['file.ts'], true)
    storeFileSelections(repo2, ['file.ts'], false)

    assert.strictEqual(getRememberedFileSelection(repo1, 'file.ts'), true)
    assert.strictEqual(getRememberedFileSelection(repo2, 'file.ts'), false)
  })

  it('forgets selections for committed or discarded files', () => {
    const repo = createRepository(1)

    storeFileSelections(repo, ['file1.ts', 'file2.ts', 'file3.ts'], true)
    assert.strictEqual(getRememberedFileSelection(repo, 'file1.ts'), true)
    assert.strictEqual(getRememberedFileSelection(repo, 'file2.ts'), true)
    assert.strictEqual(getRememberedFileSelection(repo, 'file3.ts'), true)

    forgetFileSelections(repo, ['file1.ts', 'file2.ts'])

    assert.strictEqual(getRememberedFileSelection(repo, 'file1.ts'), undefined)
    assert.strictEqual(getRememberedFileSelection(repo, 'file2.ts'), undefined)
    assert.strictEqual(getRememberedFileSelection(repo, 'file3.ts'), true)
  })

  it('clears all file selections for a repository', () => {
    const repo1 = createRepository(1)
    const repo2 = createRepository(2)

    storeFileSelections(repo1, ['file1.ts'], true)
    storeFileSelections(repo2, ['file2.ts'], true)

    clearAllFileSelections(repo1)

    assert.strictEqual(getRememberedFileSelection(repo1, 'file1.ts'), undefined)
    assert.strictEqual(getRememberedFileSelection(repo2, 'file2.ts'), true)
  })
})
