import * as React from 'react'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { DragHandleOut } from './drag-handle-out'

export { DragHandleOut } from './drag-handle-out'

interface IPopoutControlsProps {
  /** Label describing the panel (e.g. "Diff", "Sidebar") */
  readonly label: string

  /** Called when the user clicks pop out or finishes dragging to detach */
  readonly onDetach: (screenX?: number, screenY?: number) => void

  /** Optional className for the container */
  readonly className?: string

  /** Whether the control should be rendered compactly (e.g. icon-only for tight headers) */
  readonly compact?: boolean
}

/**
 * Provides both a Photoshop-style "Drag Handle Out" handle and a 1-click "Pop Out" button.
 */
export class PopoutControls extends React.Component<IPopoutControlsProps, {}> {
  private onPopOutClick = () => {
    this.props.onDetach()
  }

  public render() {
    const { label, compact, className } = this.props

    return (
      <div
        className={`popout-controls ${className ?? ''} ${
          compact ? 'compact' : ''
        }`}
      >
        <DragHandleOut
          label={label}
          onDragOut={this.props.onDetach}
          compact={compact}
        />

        <button
          type="button"
          className="popout-button button-component"
          onClick={this.onPopOutClick}
          aria-label={`Pop out ${label} into external window`}
        >
          <Octicon symbol={octicons.linkExternal} />
          {!compact && <span className="popout-label">Pop Out</span>}
        </button>
      </div>
    )
  }
}
