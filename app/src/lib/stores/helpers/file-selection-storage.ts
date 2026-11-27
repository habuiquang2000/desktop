import { Repository } from '../../../models/repository'

/**
 * Generates the localStorage key for a repository's remembered file selection.
 */
function getFileSelectionStorageKey(repository: Repository): string {
  const repoKey = repository.id >= 0 ? `${repository.id}` : repository.path
  return `repo-file-selection-${repoKey}`
}

/**
 * Returns a map of relative file path -> boolean (true = marked, false = unmarked)
 * for the specified repository.
 */
export function getRememberedFileSelections(
  repository: Repository
): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(getFileSelectionStorageKey(repository))
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * Returns the remembered selection state for a specific file path,
 * or undefined if not previously recorded.
 */
export function getRememberedFileSelection(
  repository: Repository,
  path: string
): boolean | undefined {
  const selections = getRememberedFileSelections(repository)
  return selections[path]
}

/**
 * Persist marked (true) or unmarked (false) selection state for files in a repository.
 */
export function storeFileSelections(
  repository: Repository,
  paths: ReadonlyArray<string>,
  include: boolean
): void {
  try {
    const selections = getRememberedFileSelections(repository)
    for (const path of paths) {
      selections[path] = include
    }
    localStorage.setItem(
      getFileSelectionStorageKey(repository),
      JSON.stringify(selections)
    )
  } catch (e) {
    log.warn('Failed to store file selections in localStorage', e)
  }
}

/**
 * Remove remembered selections for files that were committed, discarded, or removed.
 */
export function forgetFileSelections(
  repository: Repository,
  paths: ReadonlyArray<string>
): void {
  try {
    const selections = getRememberedFileSelections(repository)
    let modified = false
    for (const path of paths) {
      if (path in selections) {
        delete selections[path]
        modified = true
      }
    }
    if (modified) {
      if (Object.keys(selections).length === 0) {
        localStorage.removeItem(getFileSelectionStorageKey(repository))
      } else {
        localStorage.setItem(
          getFileSelectionStorageKey(repository),
          JSON.stringify(selections)
        )
      }
    }
  } catch (e) {
    log.warn('Failed to update file selections in localStorage', e)
  }
}

/**
 * Clear all remembered selections for a given repository.
 */
export function clearAllFileSelections(repository: Repository): void {
  try {
    localStorage.removeItem(getFileSelectionStorageKey(repository))
  } catch (e) {
    log.warn('Failed to clear file selections from localStorage', e)
  }
}
