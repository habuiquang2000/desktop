import * as React from 'react'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'

interface IPopoutControlsProps {
  /** Label describing the panel (e.g. "Diff", "Sidebar") */
  readonly label: string

  /** Called when the user clicks pop out or finishes dragging to detach */
  readonly onDetach: () => void

  /** Optional className for the container */
  readonly className?: string

  /** Whether the control should be rendered compactly (e.g. icon-only for tight headers) */
  readonly compact?: boolean
}

interface IPopoutControlsState {
  readonly isDragging: boolean
  readonly dragDistance: number
}

/**
 * Provides a "Pop Out" button and a Photoshop-style "Drag to Detach" handle
 * allowing users to either click or drag to pop a panel out of the main window.
 */
export class PopoutControls extends React.Component<
  IPopoutControlsProps,
  IPopoutControlsState
> {
  private startX = 0
  private startY = 0
  private readonly dragThreshold = 50

  public constructor(props: IPopoutControlsProps) {
    super(props)
    this.state = {
      isDragging: false,
      dragDistance: 0,
    }
  }

  public componentWillUnmount() {
    this.removeDragListeners()
  }

  private onMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    // Only respond to primary mouse button
    if (event.button !== 0) {
      return
    }

    event.preventDefault()
    this.startX = event.clientX
    this.startY = event.clientY

    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('mouseup', this.onMouseUp)

    this.setState({ isDragging: true, dragDistance: 0 })
  }

  private onMouseMove = (event: MouseEvent) => {
    const deltaX = event.clientX - this.startX
    const deltaY = event.clientY - this.startY
    const distance = Math.hypot(deltaX, deltaY)

    this.setState({ dragDistance: distance })
  }

  private onMouseUp = () => {
    const { dragDistance } = this.state
    this.removeDragListeners()

    if (dragDistance >= this.dragThreshold) {
      this.props.onDetach()
    }

    this.setState({ isDragging: false, dragDistance: 0 })
  }

  private removeDragListeners() {
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('mouseup', this.onMouseUp)
  }

  public render() {
    const { label, compact } = this.props
    const { isDragging, dragDistance } = this.state
    const isDetachable = dragDistance >= this.dragThreshold

    return (
      <div
        className={`popout-controls ${this.props.className ?? ''} ${
          compact ? 'compact' : ''
        }`}
      >
        <div
          className={`drag-to-detach-handle ${isDragging ? 'dragging' : ''} ${
            isDetachable ? 'threshold-reached' : ''
          }`}
          onMouseDown={this.onMouseDown}
          role="button"
          tabIndex={-1}
          aria-label={`Drag to detach ${label}`}
        >
          <Octicon symbol={octicons.grabber} />
          {!compact && <span className="handle-label">Drag</span>}
        </div>

        <button
          type="button"
          className="popout-button button-component"
          onClick={this.props.onDetach}
          aria-label={`Pop out ${label} into external window`}
        >
          <Octicon symbol={octicons.linkExternal} />
          {!compact && <span className="popout-label">Pop Out</span>}
        </button>

        {isDragging && (
          <div className="drag-to-detach-ghost-overlay">
            <div
              className={`drag-to-detach-ghost ${isDetachable ? 'ready' : ''}`}
            >
              <Octicon
                symbol={isDetachable ? octicons.unfold : octicons.grabber}
              />
              <span>
                {isDetachable
                  ? `Release to pop out ${label}`
                  : `Drag further to detach ${label}`}
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }
}
