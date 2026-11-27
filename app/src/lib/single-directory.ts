/* eslint-disable no-sync */
import * as Path from 'path'
import * as Fs from 'fs'
import * as Os from 'os'

/**
 * Returns the root path of the unified single directory used across all
 * application instances (including development builds, production releases,
 * and releases installed from GitHub).
 */
export function getSingleDirectoryPath(): string {
  if (process.env.GITHUB_DESKTOP_HOME) {
    return Path.resolve(process.env.GITHUB_DESKTOP_HOME)
  }
  if (process.env.GITHUB_DESKTOP_DATA_DIR) {
    return Path.resolve(process.env.GITHUB_DESKTOP_DATA_DIR)
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { app } = require('electron')
    if (app && typeof app.getPath === 'function') {
      try {
        const appData = app.getPath('appData')
        if (appData) {
          return Path.join(appData, 'GitHub Desktop')
        }
      } catch {
        // Fall back below if electron app is not yet initialized
      }
    }
  } catch {
    // Electron not available (e.g. non-electron worker or unit test)
  }

  if (process.platform === 'win32') {
    const appData =
      process.env.APPDATA || Path.join(Os.homedir(), 'AppData', 'Roaming')
    return Path.join(appData, 'GitHub Desktop')
  } else if (process.platform === 'darwin') {
    return Path.join(
      Os.homedir(),
      'Library',
      'Application Support',
      'GitHub Desktop'
    )
  } else {
    const configHome =
      process.env.XDG_CONFIG_HOME || Path.join(Os.homedir(), '.config')
    return Path.join(configHome, 'GitHub Desktop')
  }
}

/**
 * Returns the path to the 'profile' directory inside the unified single directory.
 * Stores user profile settings, credentials, and git configuration.
 */
export function getProfileDirectoryPath(): string {
  return Path.join(getSingleDirectoryPath(), 'profile')
}

/**
 * Returns the path to the 'data' directory (Electron userData).
 * Under the standard layout, the root unified directory holds standard release
 * databases, caches, logs, and state so it is 100% shared and compatible with
 * releases installed by GitHub.
 */
export function getDataDirectoryPath(): string {
  return getSingleDirectoryPath()
}

/**
 * Returns the path to the 'repo tree' directory where cloned repositories
 * are organized by default.
 */
export function getRepoTreeDirectoryPath(): string {
  return Path.join(getSingleDirectoryPath(), 'repo tree')
}

/**
 * Returns the path to the unified profile gitconfig file.
 */
export function getProfileGitConfigPath(): string {
  return Path.join(getProfileDirectoryPath(), '.gitconfig')
}

/**
 * Merges legacy separate directories (such as 'GitHub Desktop-dev' and
 * legacy 'Documents/GitHub' repositories) into the single unified directory once.
 */
export function mergeAllDataToOne(): void {
  const singleDir = getSingleDirectoryPath()
  const repoTreeDir = getRepoTreeDirectoryPath()

  try {
    // 1. Detect and merge legacy dev data directory if it exists
    const appData =
      process.platform === 'win32'
        ? process.env.APPDATA || Path.join(Os.homedir(), 'AppData', 'Roaming')
        : process.platform === 'darwin'
        ? Path.join(Os.homedir(), 'Library', 'Application Support')
        : process.env.XDG_CONFIG_HOME || Path.join(Os.homedir(), '.config')

    const devDir = Path.join(appData, 'GitHub Desktop-dev')
    if (Fs.existsSync(devDir) && devDir !== singleDir) {
      const devItems = Fs.readdirSync(devDir)
      for (const item of devItems) {
        const srcPath = Path.join(devDir, item)
        const destPath = Path.join(singleDir, item)
        if (!Fs.existsSync(destPath)) {
          Fs.cpSync(srcPath, destPath, { recursive: true })
        }
      }
    }

    // 2. Detect and copy legacy Documents/GitHub repositories into repo tree
    const legacyDocsGithub = Path.join(Os.homedir(), 'Documents', 'GitHub')
    const altDocsGithub = Path.join(Os.homedir(), 'Documents', 'Github')
    for (const legacyPath of [legacyDocsGithub, altDocsGithub]) {
      if (Fs.existsSync(legacyPath)) {
        const repoItems = Fs.readdirSync(legacyPath)
        for (const repoItem of repoItems) {
          const srcRepo = Path.join(legacyPath, repoItem)
          const destRepo = Path.join(repoTreeDir, repoItem)
          if (Fs.existsSync(srcRepo) && !Fs.existsSync(destRepo)) {
            try {
              const stat = Fs.statSync(srcRepo)
              if (stat.isDirectory()) {
                Fs.cpSync(srcRepo, destRepo, { recursive: true })
              }
            } catch {
              // Ignore single item error
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to merge legacy data to single directory', e)
  }
}

/**
 * Ensures the single directory layout exists on disk:
 * - Root unified directory
 * - 'profile' subdirectory with initial .gitconfig including ~/.gitconfig
 * - 'repo tree' subdirectory for cloned repositories
 * - Merges any existing data across dev and release directories into one
 */
export function ensureSingleDirectoryStructure(): void {
  const singleDir = getSingleDirectoryPath()
  const profileDir = getProfileDirectoryPath()
  const repoTreeDir = getRepoTreeDirectoryPath()
  const gitConfigPath = getProfileGitConfigPath()

  try {
    if (!Fs.existsSync(singleDir)) {
      Fs.mkdirSync(singleDir, { recursive: true })
    }
    if (!Fs.existsSync(profileDir)) {
      Fs.mkdirSync(profileDir, { recursive: true })
    }
    if (!Fs.existsSync(repoTreeDir)) {
      Fs.mkdirSync(repoTreeDir, { recursive: true })
    }

    if (!Fs.existsSync(gitConfigPath)) {
      const initialConfig =
        '# GitHub Desktop Unified Profile\n[include]\n\tpath = ~/.gitconfig\n'
      Fs.writeFileSync(gitConfigPath, initialConfig, 'utf8')
    }

    mergeAllDataToOne()

    process.env.GIT_CONFIG_GLOBAL = gitConfigPath
  } catch (e) {
    console.error('Failed to ensure single directory structure', e)
  }
}

/**
 * Sets up Electron app identity and user data paths to enforce the unified
 * single directory across all instances, whether development or official release.
 */
export function setupAppSingleDirectory(): void {
  ensureSingleDirectoryStructure()

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { app } = require('electron')
    if (app && typeof app.setName === 'function') {
      app.name = 'GitHub Desktop'
      app.setName('GitHub Desktop')

      if (!process.argv.some(arg => arg.startsWith('--user-data-dir'))) {
        app.setPath('userData', getDataDirectoryPath())
      }
    }
  } catch (e) {
    console.error('Failed to configure Electron app paths', e)
  }
}
