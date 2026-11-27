import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { updateChangedFiles } from '../../../../src/lib/stores/updates/changes-state'
import {
  WorkingDirectoryStatus,
  WorkingDirectoryFileChange,
  AppFileStatusKind,
} from '../../../../src/models/status'
import {
  DiffSelection,
  DiffSelectionType,
  DiffType,
  IBinaryDiff,
} from '../../../../src/models/diff'
import {
  createState,
  createStatus,
} from '../../../helpers/changes-state-helper'
import {
  ChangesSelectionKind,
  ChangesWorkingDirectorySelection,
} from '../../../../src/lib/app-state'
import { Repository } from '../../../../src/models/repository'
import { storeFileSelections } from '../../../../src/lib/stores/helpers/file-selection-storage'

const allSelected = DiffSelection.fromInitialSelection(DiffSelectionType.All)
const noneSelected = DiffSelection.fromInitialSelection(DiffSelectionType.None)

const files = [
  new WorkingDirectoryFileChange(
    'README.md',
    { kind: AppFileStatusKind.Modified },
    allSelected
  ),
  new WorkingDirectoryFileChange(
    'app/package.json',
    { kind: AppFileStatusKind.Modified },
    noneSelected
  ),
]

describe('updateChangedFiles', () => {
  describe('workingDirectory', () => {
    let partiallySelectedFile: WorkingDirectoryFileChange
    let oldWorkingDirectory: WorkingDirectoryStatus

    beforeEach(() => {
      const partialFileSelection = noneSelected
        .withSelectableLines(new Set([1, 2, 3, 4, 5, 6]))
        .withLineSelection(1, true)
        .withLineSelection(2, true)
        .withLineSelection(3, true)

      partiallySelectedFile = new WorkingDirectoryFileChange(
        'app/index.ts',
        { kind: AppFileStatusKind.New },
        partialFileSelection
      )

      const filesWithPartialChange = [...files, partiallySelectedFile]

      oldWorkingDirectory = WorkingDirectoryStatus.fromFiles(
        filesWithPartialChange
      )
    })

    it('clears partial selection on file when clearPartialState is true', () => {
      const prevState = createState({
        workingDirectory: oldWorkingDirectory,
      })

      const status = createStatus({
        workingDirectory: oldWorkingDirectory,
      })

      const { workingDirectory } = updateChangedFiles(prevState, status, true)

      const partialFile = workingDirectory.findFileWithID(
        partiallySelectedFile.id
      )

      assert(partialFile !== null)
      assert.equal(
        partialFile.selection.getSelectionType(),
        DiffSelectionType.None
      )
    })

    it('preserves partial selection on file when clearPartialState is false', () => {
      const prevState = createState({
        workingDirectory: oldWorkingDirectory,
      })

      const status = createStatus({
        workingDirectory: oldWorkingDirectory,
      })

      const { workingDirectory } = updateChangedFiles(prevState, status, false)

      const partialFile = workingDirectory.findFileWithID(
        partiallySelectedFile.id
      )

      assert(partialFile !== null)
      assert.equal(
        partialFile.selection.getSelectionType(),
        DiffSelectionType.Partial
      )
    })

    it('does not return same working directory object', () => {
      const oldWorkingDirectory = WorkingDirectoryStatus.fromFiles(files)
      const prevState = createState({
        workingDirectory: oldWorkingDirectory,
      })

      const status = createStatus({
        workingDirectory: oldWorkingDirectory,
      })

      const { workingDirectory } = updateChangedFiles(prevState, status, false)

      assert.notEqual(workingDirectory, oldWorkingDirectory)
    })
  })

  describe('selectedFileIDs', () => {
    it('selects the first file if none found in state', () => {
      const prevState = createState({})

      const status = createStatus({
        workingDirectory: WorkingDirectoryStatus.fromFiles(files),
      })
      const { selection } = updateChangedFiles(prevState, status, false)

      assert.equal(selection.kind, ChangesSelectionKind.WorkingDirectory)
      const workingDirectorySelection =
        selection as ChangesWorkingDirectorySelection
      const { selectedFileIDs } = workingDirectorySelection
      assert.equal(selectedFileIDs.length, 1)
      // NOTE: `updateChangedFiles` sorts the paths and `app/package.json` will
      // appear in list before `README.md`
      assert.equal(selectedFileIDs[0], files[1].id)
    })

    it('remembers previous selection if file is found in status', () => {
      const firstFile = files[0].id
      const prevState = createState({
        selection: {
          kind: ChangesSelectionKind.WorkingDirectory,
          selectedFileIDs: [firstFile],
          diff: null,
        },
      })

      const status = createStatus({
        workingDirectory: WorkingDirectoryStatus.fromFiles(files),
      })
      const { selection } = updateChangedFiles(prevState, status, false)

      assert.equal(selection.kind, ChangesSelectionKind.WorkingDirectory)
      const workingDirectorySelection =
        selection as ChangesWorkingDirectorySelection
      const { selectedFileIDs } = workingDirectorySelection
      assert.equal(selectedFileIDs.length, 1)
      assert.equal(selectedFileIDs[0], firstFile)
    })

    it('clears selection if no files found in status', () => {
      const firstFile = files[0].id
      const prevState = createState({
        selection: {
          kind: ChangesSelectionKind.WorkingDirectory,
          selectedFileIDs: [firstFile],
          diff: null,
        },
      })

      const status = createStatus({})
      const { selection } = updateChangedFiles(prevState, status, false)

      assert.equal(selection.kind, ChangesSelectionKind.WorkingDirectory)
      const workingDirectorySelection =
        selection as ChangesWorkingDirectorySelection
      const { selectedFileIDs } = workingDirectorySelection
      assert.equal(selectedFileIDs.length, 0)
    })
  })

  describe('diff', () => {
    it('clears diff if selected file is not in previous state', () => {
      const workingDirectory = WorkingDirectoryStatus.fromFiles(files)

      const prevState = createState({
        workingDirectory: workingDirectory,
        selection: {
          kind: ChangesSelectionKind.WorkingDirectory,
          // an unknown file was set as selected last time
          selectedFileIDs: ['id-from-file-not-in-status'],
          diff: { kind: DiffType.Binary },
        },
      })

      const status = createStatus({ workingDirectory })
      const { selection } = updateChangedFiles(prevState, status, false)

      assert.equal(selection.kind, ChangesSelectionKind.WorkingDirectory)

      const workingDirectorySelection =
        selection as ChangesWorkingDirectorySelection
      assert(workingDirectorySelection.diff === null)
    })

    it('returns same diff if selected file from previous state is found', () => {
      const workingDirectory = WorkingDirectoryStatus.fromFiles(files)

      // first file was selected the last time we updated state
      const selectedFileIDs = [files[0].id]
      const diff: IBinaryDiff = { kind: DiffType.Binary }

      const prevState = createState({
        workingDirectory,
        selection: {
          kind: ChangesSelectionKind.WorkingDirectory,
          selectedFileIDs,
          diff,
        },
      })

      // same working directory is provided as last time
      const status = createStatus({ workingDirectory })

      const { selection } = updateChangedFiles(prevState, status, false)
      assert.equal(selection.kind, ChangesSelectionKind.WorkingDirectory)
      const workingDirectorySelection =
        selection as ChangesWorkingDirectorySelection
      assert.equal(workingDirectorySelection.diff, diff)
    })
  })

  describe('remembered file selections for any repository', () => {
    const repository = new Repository('/path/to/repo', 42, null, false)

    beforeEach(() => {
      localStorage.clear()
    })

    it('auto unmarks newly changed files when not previously remembered', () => {
      const prevState = createState({
        workingDirectory: WorkingDirectoryStatus.fromFiles([]),
      })

      const status = createStatus({
        workingDirectory: WorkingDirectoryStatus.fromFiles(files),
      })

      const { workingDirectory } = updateChangedFiles(
        prevState,
        status,
        false,
        repository
      )

      assert.equal(workingDirectory.files.length, 2)
      for (const file of workingDirectory.files) {
        assert.equal(
          file.selection.getSelectionType(),
          DiffSelectionType.None,
          `Expected ${file.path} to be auto unmarked`
        )
      }
    })

    it('restores marked and unmarked state from remembered repository selections', () => {
      storeFileSelections(repository, ['README.md'], true)
      storeFileSelections(repository, ['app/package.json'], false)

      const prevState = createState({
        workingDirectory: WorkingDirectoryStatus.fromFiles([]),
      })

      const status = createStatus({
        workingDirectory: WorkingDirectoryStatus.fromFiles(files),
      })

      const { workingDirectory } = updateChangedFiles(
        prevState,
        status,
        false,
        repository
      )

      const readme = workingDirectory.files.find(f => f.path === 'README.md')
      const pkg = workingDirectory.files.find(f => f.path === 'app/package.json')

      assert(readme !== undefined)
      assert.equal(
        readme.selection.getSelectionType(),
        DiffSelectionType.All,
        'Expected README.md to be marked (DiffSelectionType.All)'
      )

      assert(pkg !== undefined)
      assert.equal(
        pkg.selection.getSelectionType(),
        DiffSelectionType.None,
        'Expected app/package.json to be unmarked (DiffSelectionType.None)'
      )
    })

    it('preserves remembered selection across renames via oldPath', () => {
      storeFileSelections(repository, ['old-name.ts'], true)

      const renamedFile = new WorkingDirectoryFileChange(
        'new-name.ts',
        {
          kind: AppFileStatusKind.Renamed,
          oldPath: 'old-name.ts',
          renameIncludesModifications: false,
        },
        allSelected
      )

      const prevState = createState({
        workingDirectory: WorkingDirectoryStatus.fromFiles([]),
      })

      const status = createStatus({
        workingDirectory: WorkingDirectoryStatus.fromFiles([renamedFile]),
      })

      const { workingDirectory } = updateChangedFiles(
        prevState,
        status,
        false,
        repository
      )

      assert.equal(workingDirectory.files.length, 1)
      assert.equal(
        workingDirectory.files[0].selection.getSelectionType(),
        DiffSelectionType.All,
        'Expected renamed file to inherit marked state from oldPath'
      )
    })
  })
})
