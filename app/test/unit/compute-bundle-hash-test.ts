import assert from 'node:assert'
import { describe, it } from 'node:test'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import {
  bundleFiles,
  computeBundleHash,
  computeBundleHashSync,
} from '../../src/lib/compute-bundle-hash'

describe('compute-bundle-hash', () => {
  it('contains expected core bundle files in fixed order', () => {
    assert.ok(bundleFiles.includes('main.js'))
    assert.ok(bundleFiles.includes('renderer.js'))
    assert.ok(bundleFiles.includes('index.html'))
    assert.strictEqual(bundleFiles.length, 7)
  })

  it('computes consistent async and sync hashes across bundle files', async () => {
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'desktop-bundle-hash-')
    )
    try {
      for (const file of bundleFiles) {
        await fs.writeFile(path.join(tempDir, file), `content for ${file}`)
      }

      const asyncHash = await computeBundleHash(tempDir)
      const syncHash = computeBundleHashSync(tempDir)

      assert.strictEqual(typeof asyncHash, 'string')
      assert.strictEqual(asyncHash.length, 64)
      assert.strictEqual(asyncHash, syncHash)

      // Modifying one file must change the computed hash
      await fs.writeFile(path.join(tempDir, 'renderer.js'), 'modified content')
      const modifiedHash = await computeBundleHash(tempDir)
      assert.notStrictEqual(modifiedHash, asyncHash)
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true })
    }
  })
})
