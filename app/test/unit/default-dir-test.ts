import { describe, it } from 'node:test'
import assert from 'node:assert'
import * as Path from 'path'
import {
  getDefaultDir,
  setDefaultDir,
  getRepoTreePath,
} from '../../src/ui/lib/default-dir'

describe('default-dir', () => {
  it('returns repo tree path when no custom directory is saved in localStorage', async () => {
    localStorage.removeItem('last-clone-location')
    const defaultDir = await getDefaultDir()
    const repoTree = await getRepoTreePath()
    assert.strictEqual(defaultDir, repoTree)
    assert.ok(defaultDir.endsWith('repo tree'))
  })

  it('respects explicitly saved clone location', async () => {
    const customPath = Path.resolve('/custom/clone/path')
    setDefaultDir(customPath)
    const defaultDir = await getDefaultDir()
    assert.strictEqual(defaultDir, customPath)
    localStorage.removeItem('last-clone-location')
  })
})
