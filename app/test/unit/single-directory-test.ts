/* eslint-disable no-sync */
import { describe, it } from 'node:test'
import assert from 'node:assert'
import * as Path from 'path'
import * as Fs from 'fs'
import * as Os from 'os'
import {
  getSingleDirectoryPath,
  getProfileDirectoryPath,
  getDataDirectoryPath,
  getRepoTreeDirectoryPath,
  getProfileGitConfigPath,
  ensureSingleDirectoryStructure,
  mergeAllDataToOne,
} from '../../src/lib/single-directory'

describe('single-directory', () => {
  it('resolves consistent directory structure paths', () => {
    const root = getSingleDirectoryPath()
    assert.ok(root && root.length > 0)

    const profile = getProfileDirectoryPath()
    assert.strictEqual(profile, Path.join(root, 'profile'))

    const data = getDataDirectoryPath()
    assert.strictEqual(data, root)

    const repoTree = getRepoTreeDirectoryPath()
    assert.strictEqual(repoTree, Path.join(root, 'repo tree'))

    const gitConfig = getProfileGitConfigPath()
    assert.strictEqual(gitConfig, Path.join(profile, '.gitconfig'))
  })

  it('respects GITHUB_DESKTOP_HOME environment variable override', () => {
    const originalHome = process.env.GITHUB_DESKTOP_HOME
    const tempDir = Path.join(Os.tmpdir(), `gh-desktop-test-${Date.now()}`)
    try {
      process.env.GITHUB_DESKTOP_HOME = tempDir
      assert.strictEqual(getSingleDirectoryPath(), Path.resolve(tempDir))
      assert.strictEqual(
        getProfileDirectoryPath(),
        Path.join(Path.resolve(tempDir), 'profile')
      )
      assert.strictEqual(
        getRepoTreeDirectoryPath(),
        Path.join(Path.resolve(tempDir), 'repo tree')
      )
    } finally {
      if (originalHome !== undefined) {
        process.env.GITHUB_DESKTOP_HOME = originalHome
      } else {
        delete process.env.GITHUB_DESKTOP_HOME
      }
    }
  })

  it('ensures single directory structure and initializes profile gitconfig', () => {
    const originalHome = process.env.GITHUB_DESKTOP_HOME
    const originalGitConfigGlobal = process.env.GIT_CONFIG_GLOBAL
    const tempDir = Path.join(Os.tmpdir(), `gh-single-dir-${Date.now()}`)

    try {
      process.env.GITHUB_DESKTOP_HOME = tempDir
      ensureSingleDirectoryStructure()

      assert.ok(Fs.existsSync(tempDir), 'root directory must exist')
      assert.ok(
        Fs.existsSync(Path.join(tempDir, 'profile')),
        'profile directory must exist'
      )
      assert.ok(
        Fs.existsSync(Path.join(tempDir, 'repo tree')),
        'repo tree directory must exist'
      )

      const gitConfigFile = Path.join(tempDir, 'profile', '.gitconfig')
      assert.ok(Fs.existsSync(gitConfigFile), '.gitconfig must exist')
      const content = Fs.readFileSync(gitConfigFile, 'utf8')
      assert.ok(
        content.includes('[include]'),
        'gitconfig should include ~/.gitconfig'
      )
      assert.strictEqual(process.env.GIT_CONFIG_GLOBAL, gitConfigFile)
    } finally {
      if (originalHome !== undefined) {
        process.env.GITHUB_DESKTOP_HOME = originalHome
      } else {
        delete process.env.GITHUB_DESKTOP_HOME
      }
      if (originalGitConfigGlobal !== undefined) {
        process.env.GIT_CONFIG_GLOBAL = originalGitConfigGlobal
      } else {
        delete process.env.GIT_CONFIG_GLOBAL
      }
      Fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('merges legacy data and repositories into single directory', () => {
    const originalHome = process.env.GITHUB_DESKTOP_HOME
    const tempDir = Path.join(Os.tmpdir(), `gh-single-dir-merge-${Date.now()}`)

    try {
      process.env.GITHUB_DESKTOP_HOME = tempDir
      ensureSingleDirectoryStructure()
      mergeAllDataToOne()

      assert.ok(Fs.existsSync(tempDir))
      assert.ok(Fs.existsSync(Path.join(tempDir, 'profile')))
      assert.ok(Fs.existsSync(Path.join(tempDir, 'repo tree')))
    } finally {
      if (originalHome !== undefined) {
        process.env.GITHUB_DESKTOP_HOME = originalHome
      } else {
        delete process.env.GITHUB_DESKTOP_HOME
      }
      Fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
