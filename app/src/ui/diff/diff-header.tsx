import * as React from 'react'
import { PathLabel } from '../lib/path-label'
import { AppFileStatus } from '../../models/status'
import { IDiff, DiffType } from '../../models/diff'
import { Octicon, iconForStatus } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { mapStatus } from '../../lib/status'
import { DiffOptions } from './diff-options'
import { Tooltip, TooltipDirection } from '../lib/tooltip'
import { createObservableRef } from '../lib/observable-ref'
import { PopoutControls } from '../popout/popout-controls'

interface IDiffHeaderProps {
  readonly path: string
  readonly status: AppFileStatus
  readonly diff: IDiff | null

  /** Whether we should display side by side diffs. */
  readonly showSideBySideDiff: boolean

  /** Called when the user changes the side by side diffs setting. */
  readonly onShowSideBySideDiffChanged: (checked: boolean) => void

  /** Whether we should hide whitespace in diffs. */
  readonly hideWhitespaceInDiff: boolean

  /** Called when the user changes the hide whitespace in diffs setting. */
  readonly onHideWhitespaceInDiffChanged: (checked: boolean) => Promise<void>

  /** Called when the user opens the diff options popover */
  readonly onDiffOptionsOpened: () => void

  /** Whether this file can be edited in the inline code editor */
  readonly canEditInCodeEditor?: boolean

  /** Whether the inline code editor is currently active */
  readonly isCodeEditorMode?: boolean

  /** Whether the inline code editor has unsaved changes */
  readonly hasUnsavedEditorChanges?: boolean

  /** Called when the user toggles between diff view and code editor */
  readonly onToggleCodeEditor?: () => void

  /** Called when the user clicks Save in the code editor header */
  readonly onSaveCodeEditor?: () => void

  /** Called when the user clicks or drags to pop out the diff */
  readonly onDetachDiff?: () => void
}

/** Displays information about a file */
export class DiffHeader extends React.Component<IDiffHeaderProps, {}> {
  private toggleButtonRef = createObservableRef<HTMLButtonElement>()

  public render() {
    const status = this.props.status
    const fileStatus = mapStatus(status)

    return (
      <div className="header">
        <PathLabel path={this.props.path} status={this.props.status} />

        {this.renderCodeEditorControls()}
        {this.renderDiffOptions()}
        {this.renderPopoutControls()}

        <Octicon
          symbol={iconForStatus(status)}
          className={'status status-' + fileStatus.toLowerCase()}
          title={fileStatus}
        />
      </div>
    )
  }

  private renderPopoutControls() {
    if (!this.props.onDetachDiff) {
      return null
    }

    return (
      <PopoutControls
        label="Diff"
        onDetach={this.props.onDetachDiff}
        compact={true}
      />
    )
  }

  private renderCodeEditorControls() {
    if (!this.props.canEditInCodeEditor || !this.props.onToggleCodeEditor) {
      return null
    }

    const isEditor = Boolean(this.props.isCodeEditorMode)
    const toggleLabel = isEditor ? 'View Diff' : 'Edit in Code Editor'

    return (
      <div className="code-editor-header-controls">
        {isEditor &&
          this.props.hasUnsavedEditorChanges &&
          this.props.onSaveCodeEditor && (
            <button
              type="button"
              className="code-editor-save-button"
              onClick={this.props.onSaveCodeEditor}
              aria-label="Save file"
            >
              <Octicon symbol={octicons.check} />
              <span>Save</span>
            </button>
          )}
        <button
          type="button"
          className="code-editor-toggle-button"
          aria-label={toggleLabel}
          aria-pressed={isEditor}
          onClick={this.props.onToggleCodeEditor}
          ref={this.toggleButtonRef}
        >
          <Tooltip
            target={this.toggleButtonRef}
            direction={TooltipDirection.NORTH}
            applyAriaDescribedBy={false}
          >
            {toggleLabel}
          </Tooltip>
          <Octicon symbol={isEditor ? octicons.diff : octicons.code} />
          <span>{isEditor ? 'Diff' : 'Edit'}</span>
        </button>
      </div>
    )
  }

  private renderDiffOptions() {
    if (
      this.props.diff?.kind === DiffType.Submodule ||
      this.props.isCodeEditorMode
    ) {
      return null
    }

    return (
      <DiffOptions
        isInteractiveDiff={true}
        onHideWhitespaceChangesChanged={
          this.props.onHideWhitespaceInDiffChanged
        }
        hideWhitespaceChanges={this.props.hideWhitespaceInDiff}
        onShowSideBySideDiffChanged={this.props.onShowSideBySideDiffChanged}
        showSideBySideDiff={this.props.showSideBySideDiff}
        onDiffOptionsOpened={this.props.onDiffOptionsOpened}
      />
    )
  }
}
