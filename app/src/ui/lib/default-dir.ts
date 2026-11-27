import * as Path from 'path'
import { getDocumentsPath } from './app-proxy'
import { getPath } from '../main-process-proxy'
import { getRepoTreeDirectoryPath } from '../../lib/single-directory'

const localStorageKey = 'last-clone-location'

let cachedRepoTreePath: string | null = null

/** The path to the default repo tree directory. */
export async function getRepoTreePath(): Promise<string> {
  if (!cachedRepoTreePath) {
    try {
      const userData = await getPath('userData')
      if (userData && typeof userData === 'string' && userData.length > 0) {
        cachedRepoTreePath = Path.join(userData, 'repo tree')
      }
    } catch {
      // Fallback if userData cannot be resolved
    }

    if (!cachedRepoTreePath) {
      cachedRepoTreePath = getRepoTreeDirectoryPath()
    }
  }

  return cachedRepoTreePath
}

/** The path to the default directory. */
export async function getDefaultDir(): Promise<string> {
  const saved = localStorage.getItem(localStorageKey)
  if (saved && saved.length > 0) {
    try {
      const docs = await getDocumentsPath()
      if (docs && typeof docs === 'string') {
        const legacyDefault = Path.join(docs, 'GitHub')
        if (saved === legacyDefault) {
          const repoTree = await getRepoTreePath()
          localStorage.setItem(localStorageKey, repoTree)
          return repoTree
        }
      }
    } catch {
      // Ignore legacy check error
    }
    return saved
  }

  return getRepoTreePath()
}

export function setDefaultDir(path: string) {
  localStorage.setItem(localStorageKey, path)
}
