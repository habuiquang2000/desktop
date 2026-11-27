import * as React from 'react'
import classNames from 'classnames'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'

export interface IDraggablePanelBarProps {
  /** User-facing label of the panel being dragged (e.g. "Diff", "Sidebar", "Repositories") */
  readonly label: string

  /** Called when the user drags the bar out to detach/undock */
  readonly onDragOut?: (screenX?: number, screenY?: number) => void

  /** Class name */
  readonly className?: string

  /** Whether dragging is disabled */
  readonly disabled?: boolean

  /** Children to render inside the bar */
  readonly children: React.ReactNode

  /** Custom title / tooltip */
  readonly tooltip?: string
}

interface IDraggablePanelBarState {
  readonly isDragging: boolean
  readonly dragDistance: number
  readonly mouseX: number
  readonly mouseY: number
}

/**
 * Wraps any panel's top header bar (e.g. Diff header, Sidebar tabs, Docked Repositories bar)
 * into a Photoshop-style draggable surface.
 * Users click and drag the bar itself to tear it off / undock it into an external window.
 */
export class DraggablePanelBar extends React.Component<
  IDraggablePanelBarProps,
  IDraggablePanelBarState
> {
  private startX = 0
  private startY = 0
  private lastScreenX = 0
  private lastScreenY = 0
  private isMouseDown = false
  private barElement: HTMLDivElement | null = null
  private readonly dragThreshold = 45

  public constructor(props: IDraggablePanelBarProps) {
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
    if (this.barElement) {
      this.barElement.removeEventListener('mousedown', this.onMouseDown)
    }
  }

  private onBarRef = (element: HTMLDivElement | null) => {
    if (this.barElement) {
      this.barElement.removeEventListener('mousedown', this.onMouseDown)
    }
    this.barElement = element
    if (this.barElement) {
      this.barElement.addEventListener('mousedown', this.onMouseDown)
    }
  }

  private onMouseDown = (event: MouseEvent) => {
    // Only primary (left) mouse button
    if (event.button !== 0 || !this.props.onDragOut || this.props.disabled) {
      return
    }

    const target = event.target as HTMLElement | null
    // If user clicked inside an input, textarea, select, or editable element, let native interaction proceed
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) {
      return
    }

    this.startX = event.clientX
    this.startY = event.clientY
    this.lastScreenX = event.screenX
    this.lastScreenY = event.screenY
    this.isMouseDown = true

    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('mouseup', this.onMouseUp)
  }

  private onMouseMove = (event: MouseEvent) => {
    if (!this.isMouseDown) {
      return
    }

    const deltaX = event.clientX - this.startX
    const deltaY = event.clientY - this.startY
    const distance = Math.hypot(deltaX, deltaY)

    this.lastScreenX = event.screenX
    this.lastScreenY = event.screenY

    // Only activate visual drag overlay once moved past subtle deadzone (> 6px)
    if (!this.state.isDragging && distance > 6) {
      this.setState({
        isDragging: true,
        dragDistance: distance,
        mouseX: event.clientX,
        mouseY: event.clientY,
      })
    } else if (this.state.isDragging) {
      this.setState({
        dragDistance: distance,
        mouseX: event.clientX,
        mouseY: event.clientY,
      })
    }
  }

  private onMouseUp = () => {
    this.removeDragListeners()

    const wasDragging = this.state.isDragging
    const { dragDistance } = this.state
    this.isMouseDown = false

    if (wasDragging && dragDistance >= this.dragThreshold) {
      this.props.onDragOut?.(this.lastScreenX, this.lastScreenY)
    }

    this.setState({
      isDragging: false,
      dragDistance: 0,
    })
  }

  private removeDragListeners() {
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('mouseup', this.onMouseUp)
  }

  public render() {
    const { label, className, onDragOut, disabled, tooltip } = this.props
    const { isDragging, dragDistance, mouseX, mouseY } = this.state
    const isDetachable = dragDistance >= this.dragThreshold
    const canDrag = Boolean(onDragOut) && !disabled

    const defaultTitle = canDrag
      ? `Click and drag bar to undock ${label}`
      : undefined

    return (
      <div
        ref={this.onBarRef}
        role="region"
        className={classNames('draggable-panel-bar', className, {
          'is-dragging': isDragging,
          'can-drag': canDrag,
        })}
        aria-label={tooltip ?? defaultTitle}
      >
        {this.props.children}

        {isDragging && (
          <div className="drag-to-detach-ghost-overlay">
            <div
              className={classNames('drag-to-detach-ghost', {
                ready: isDetachable,
              })}
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
