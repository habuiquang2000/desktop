import * as React from 'react'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'

export interface IDragHandleOutProps {
  /** User-facing label of the panel being dragged (e.g. "Diff", "Sidebar", "Repository List") */
  readonly label: string

  /** Called when the user drags the handle out or clicks to detach */
  readonly onDragOut: (screenX?: number, screenY?: number) => void

  /** Optional single-click handler if different from onDragOut */
  readonly onClick?: () => void

  /** Custom tooltip / aria-label */
  readonly tooltip?: string

  /** Compact mode (icon only) */
  readonly compact?: boolean

  /** Custom class name */
  readonly className?: string
}

interface IDragHandleOutState {
  readonly isDragging: boolean
  readonly dragDistance: number
  readonly mouseX: number
  readonly mouseY: number
}

/**
 * A Photoshop-style "Drag Handle Out" component.
 * Allows users to click and drag outward to detach or undock any panel.
 * Displays a live cursor-following ghost preview during drag.
 */
export class DragHandleOut extends React.Component<
  IDragHandleOutProps,
  IDragHandleOutState
> {
  private startX = 0
  private startY = 0
  private lastScreenX = 0
  private lastScreenY = 0
  private readonly dragThreshold = 25

  public constructor(props: IDragHandleOutProps) {
    super(props)
    this.state = {
      isDragging: false,
      dragDistance: 0,
      mouseX: 0,
      mouseY: 0,
    }
  }

  public componentWillUnmount() {
    this.removeDragListeners()
  }

  private onMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    // Only primary mouse button
    if (event.button !== 0) {
      return
    }

    event.preventDefault()
    this.startX = event.clientX
    this.startY = event.clientY
    this.lastScreenX = event.screenX
    this.lastScreenY = event.screenY

    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('mouseup', this.onMouseUp)

    this.setState({
      isDragging: true,
      dragDistance: 0,
      mouseX: event.clientX,
      mouseY: event.clientY,
    })
  }

  private onMouseMove = (event: MouseEvent) => {
    const deltaX = event.clientX - this.startX
    const deltaY = event.clientY - this.startY
    const distance = Math.hypot(deltaX, deltaY)

    this.lastScreenX = event.screenX
    this.lastScreenY = event.screenY

    this.setState({
      dragDistance: distance,
      mouseX: event.clientX,
      mouseY: event.clientY,
    })
  }

  private onMouseUp = () => {
    const { dragDistance } = this.state
    this.removeDragListeners()

    if (dragDistance >= this.dragThreshold) {
      this.props.onDragOut(this.lastScreenX, this.lastScreenY)
    }

    this.setState({
      isDragging: false,
      dragDistance: 0,
    })
  }

  private onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // If not dragging (or drag didn't fire onMouseUp), handle click
    if (this.props.onClick) {
      this.props.onClick()
    } else {
      this.props.onDragOut()
    }
  }

  private onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (this.props.onClick) {
        this.props.onClick()
      } else {
        this.props.onDragOut()
      }
    }
  }

  private removeDragListeners() {
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('mouseup', this.onMouseUp)
  }

  public render() {
    const { label, compact, tooltip, className } = this.props
    const { isDragging, dragDistance, mouseX, mouseY } = this.state
    const isDetachable = dragDistance >= this.dragThreshold
    const defaultTooltip = `Click or drag handle out to undock ${label}`
    const ariaLabel = tooltip ?? defaultTooltip

    return (
      <div
        className={`drag-handle-out-wrapper ${className ?? ''} ${
          compact ? 'compact' : ''
        }`}
      >
        <div
          className={`drag-handle-out ${isDragging ? 'dragging' : ''} ${
            isDetachable ? 'threshold-reached' : ''
          }`}
          onMouseDown={this.onMouseDown}
          onClick={this.onClick}
          onKeyDown={this.onKeyDown}
          role="button"
          tabIndex={0}
          aria-label={ariaLabel}
        >
          <Octicon symbol={octicons.grabber} className="drag-grip-icon" />
          {!compact && <span className="drag-handle-text">Drag Out</span>}
        </div>

        {isDragging && (
          <div className="drag-to-detach-ghost-overlay">
            <div
              className={`drag-to-detach-ghost ${isDetachable ? 'ready' : ''}`}
              style={{
                left: mouseX + 16,
                top: mouseY + 16,
              }}
            >
              <Octicon
                symbol={isDetachable ? octicons.unfold : octicons.grabber}
              />
              <span>
                {isDetachable
                  ? `Release to undock ${label}`
                  : `Drag outward to undock ${label}`}
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }
}
