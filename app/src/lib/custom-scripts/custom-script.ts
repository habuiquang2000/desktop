import * as Fs from 'fs/promises'
import * as Path from 'path'
import { Repository } from '../../models/repository'

export interface ICustomProjectScript {
  readonly id: string
  readonly name: string
  readonly command: string
  readonly source: 'package.json' | 'file' | 'custom'
  readonly filePath?: string
  readonly runInTerminal?: boolean
  readonly workingDirectory?: string
}

export type ScriptRunStatus = 'idle' | 'running' | 'success' | 'failed'

export interface IScriptRunState {
  readonly script: ICustomProjectScript
  readonly status: ScriptRunStatus
  readonly exitCode: number | null
  readonly startTime: number
  readonly endTime: number | null
  readonly output: ReadonlyArray<string>
}

function getCustomScriptsStorageKey(repository: Repository): string {
  return `custom-project-scripts-${
    repository.id >= 0 ? repository.id : repository.path
  }`
}

function getHotScriptStorageKey(repository: Repository): string {
  return `custom-project-hot-script-${
    repository.id >= 0 ? repository.id : repository.path
  }`
}

/**
 * Get user-defined custom scripts for the given repository.
 */
export function getCustomScripts(
  repository: Repository
): ReadonlyArray<ICustomProjectScript> {
  try {
    const raw = localStorage.getItem(getCustomScriptsStorageKey(repository))
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Save or update a user-defined custom script for the given repository.
 */
export function saveCustomScript(
  repository: Repository,
  script: ICustomProjectScript
): void {
  const scripts = getCustomScripts(repository)
  const existingIndex = scripts.findIndex(s => s.id === script.id)
  let updated: ReadonlyArray<ICustomProjectScript>

  if (existingIndex >= 0) {
    const copy = [...scripts]
    copy[existingIndex] = script
    updated = copy
  } else {
    updated = [...scripts, script]
  }

  try {
    localStorage.setItem(
      getCustomScriptsStorageKey(repository),
      JSON.stringify(updated)
    )
  } catch (e) {
    log.warn('Failed to save custom script to localStorage', e)
  }
}

/**
 * Delete a user-defined custom script for the given repository.
 */
export function deleteCustomScript(
  repository: Repository,
  scriptId: string
): void {
  const scripts = getCustomScripts(repository)
  const updated = scripts.filter(s => s.id !== scriptId)

  try {
    localStorage.setItem(
      getCustomScriptsStorageKey(repository),
      JSON.stringify(updated)
    )
  } catch (e) {
    log.warn('Failed to delete custom script from localStorage', e)
  }

  // Clear hot script if it was the deleted script
  if (getHotScriptId(repository) === scriptId) {
    setHotScriptId(repository, null)
  }
}

/**
 * Get the ID of the current hot button script for the repository.
 */
export function getHotScriptId(repository: Repository): string | null {
  try {
    return localStorage.getItem(getHotScriptStorageKey(repository))
  } catch {
    return null
  }
}

/**
 * Set the ID of the current hot button script for the repository.
 */
export function setHotScriptId(
  repository: Repository,
  scriptId: string | null
): void {
  try {
    if (scriptId === null) {
      localStorage.removeItem(getHotScriptStorageKey(repository))
    } else {
      localStorage.setItem(getHotScriptStorageKey(repository), scriptId)
    }
  } catch (e) {
    log.warn('Failed to save hot script ID to localStorage', e)
  }
}

/**
 * Auto-discover runnable scripts in the project directory:
 * - package.json npm scripts (strictly using npm)
 * - script files in ./scripts or project root (.sh, .bash, .ps1, .bat, .cmd, .py, .js, .ts)
 */
export async function discoverProjectScripts(
  repositoryPath: string
): Promise<ReadonlyArray<ICustomProjectScript>> {
  const discovered: ICustomProjectScript[] = []

  // 1. Discover package.json scripts
  try {
    const pkgPath = Path.join(repositoryPath, 'package.json')
    const content = await Fs.readFile(pkgPath, 'utf8')
    const parsed = JSON.parse(content)
    if (
      parsed &&
      typeof parsed.scripts === 'object' &&
      parsed.scripts !== null
    ) {
      for (const name of Object.keys(parsed.scripts)) {
        discovered.push({
          id: `pkg:${name}`,
          name,
          command: `npm run ${name}`,
          source: 'package.json',
        })
      }
    }
  } catch {
    // package.json does not exist or invalid JSON; ignore
  }

  // 2. Discover script files in scripts/ and project root
  const directoriesToSearch = [
    Path.join(repositoryPath, 'scripts'),
    repositoryPath,
  ]

  const supportedExtensions = new Set([
    '.sh',
    '.bash',
    '.ps1',
    '.bat',
    '.cmd',
    '.py',
    '.js',
    '.ts',
  ])

  for (const dir of directoriesToSearch) {
    try {
      const entries = await Fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isFile()) {
          continue
        }

        const ext = Path.extname(entry.name).toLowerCase()
        if (!supportedExtensions.has(ext)) {
          continue
        }

        // Avoid common non-executable / config files in root
        if (
          dir === repositoryPath &&
          (entry.name.startsWith('.') ||
            entry.name.includes('config') ||
            entry.name.includes('setup'))
        ) {
          continue
        }

        const relativePath = Path.relative(
          repositoryPath,
          Path.join(dir, entry.name)
        )
        const normalizedRelPath = relativePath.split(Path.sep).join('/')
        const scriptCommand = buildCommandForScriptFile(normalizedRelPath, ext)

        discovered.push({
          id: `file:${normalizedRelPath}`,
          name: entry.name,
          command: scriptCommand,
          source: 'file',
          filePath: normalizedRelPath,
        })
      }
    } catch {
      // Directory may not exist; ignore
    }
  }

  return discovered
}

/**
 * Format execution command cross-platform for a script file.
 */
function buildCommandForScriptFile(relativePath: string, ext: string): string {
  const isWindows = process.platform === 'win32'

  switch (ext) {
    case '.ps1':
      return isWindows
        ? `powershell -ExecutionPolicy Bypass -File ".\\${relativePath.replace(
            /\//g,
            '\\'
          )}"`
        : `pwsh -File "./${relativePath}"`
    case '.sh':
    case '.bash':
      return `bash "./${relativePath}"`
    case '.bat':
    case '.cmd':
      return isWindows
        ? `".\\${relativePath.replace(/\//g, '\\')}"`
        : `sh "./${relativePath}"`
    case '.py':
      return `python "./${relativePath}"`
    case '.js':
      return `node "./${relativePath}"`
    case '.ts':
      return `npx tsx "./${relativePath}"`
    default:
      return `./${relativePath}`
  }
}
