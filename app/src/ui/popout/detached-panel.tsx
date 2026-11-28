import * as React from 'react'
import * as ReactDOM from 'react-dom'
import classNames from 'classnames'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { Button } from '../lib/button'

export interface IDetachedPanelProps {
  /** Unique ID for the detached panel */
  readonly id: string

  /** User visible title for the panel */
  readonly title: string

  /** Whether the panel is currently detached into a floating panel */
  readonly isDetached: boolean

  /** Callback invoked when the panel should reattach to the main window */
  readonly onReattach: () => void

  /** The content to be rendered (either inline or in the floating window) */
  readonly children: React.ReactNode

  /** Optional icon to display in header/placeholder */
  readonly icon?: octicons.OcticonSymbolVariants

  /** Optional description for the in-app placeholder when detached */
  readonly placeholderDescription?: string

  /** Class name to apply to the container */
  readonly className?: string

  /** Initial screen coordinates (from a drag-out drop) to place the new window */
  readonly initialPosition?: { readonly x: number; readonly y: number }
}

interface IDetachedPanelState {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly isDragging: boolean
  readonly isResizing: boolean
  readonly isNearDockZone: boolean
}

function getInitialDimensions(id: string): { width: number; height: number } {
  const winW = typeof window !== 'undefined' ? window.innerWidth : 1200
  const winH = typeof window !== 'undefined' ? window.innerHeight : 800

  if (id === 'sidebar') {
    return {
      width: Math.min(420, Math.max(320, winW - 60)),
      height: Math.min(680, Math.max(400, winH - 80)),
    }
  }
  if (id === 'diff') {
    return {
      width: Math.min(960, Math.max(540, winW - 60)),
      height: Math.min(680, Math.max(420, winH - 80)),
    }
  }
  return {
    width: Math.min(750, Math.max(400, winW - 60)),
    height: Math.min(550, Math.max(300, winH - 80)),
  }
}

function getInitialPosition(
  initialPosition: { x: number; y: number } | undefined,
  width: number,
  height: number
): { x: number; y: number } {
  const winW = typeof window !== 'undefined' ? window.innerWidth : 1200
  const winH = typeof window !== 'undefined' ? window.innerHeight : 800

  if (initialPosition) {
    let targetX = initialPosition.x
    let targetY = initialPosition.y

    const screenLeft =
      typeof window !== 'undefined' ? (window.screenLeft ?? window.screenX ?? 0) : 0
    const screenTop =
      typeof window !== 'undefined' ? (window.screenTop ?? window.screenY ?? 0) : 0

    if (targetX >= screenLeft && targetX <= screenLeft + winW) {
      targetX -= screenLeft
    }
    if (targetY >= screenTop && targetY <= screenTop + winH) {
      targetY -= screenTop
    }

    let x = Math.round(targetX - width / 2)
    let y = Math.round(targetY - 24)

    x = Math.max(16, Math.min(x, winW - width - 16))
    y = Math.max(40, Math.min(y, winH - height - 16))
    return { x, y }
  }

  const x = Math.max(16, Math.round((winW - width) / 2))
  const y = Math.max(40, Math.round((winH - height) / 2))
  return { x, y }
}

/**
 * Manages rendering content either inline or within an in-app floating panel
 * (no new OS windows are opened). Provides smooth Chrome-tab-style tear-off
 * and snap-back docking.
 */
export class DetachedPanel extends React.Component<
  IDetachedPanelProps,
  IDetachedPanelState
> {
  private dragStartX = 0
  private dragStartY = 0
  private panelStartX = 0
  private panelStartY = 0
  private isPanelDragging = false

  private resizeStartX = 0
  private resizeStartY = 0
  private resizeStartWidth = 0
  private resizeStartHeight = 0
  private isPanelResizing = false

  private placeholderRef = React.createRef<HTMLDivElement>()
  private floatingRef = React.createRef<HTMLDivElement>()

  public constructor(props: IDetachedPanelProps) {
    super(props)
    const dims = getInitialDimensions(props.id)
    const pos = getInitialPosition(props.initialPosition, dims.width, dims.height)

    this.state = {
      x: pos.x,
      y: pos.y,
      width: dims.width,
      height: dims.height,
      isDragging: false,
      isResizing: false,
      isNearDockZone: false,
    }
  }

  public componentDidMount() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.onKeyDown)
    }
  }

  public componentDidUpdate(prevProps: IDetachedPanelProps) {
    if (!prevProps.isDetached && this.props.isDetached) {
      const dims = getInitialDimensions(this.props.id)
      const pos = getInitialPosition(
        this.props.initialPosition,
        dims.width,
        dims.height
      )
      this.setState({
        x: pos.x,
        y: pos.y,
        width: dims.width,
        height: dims.height,
        isNearDockZone: false,
      })
    }
  }

  public componentWillUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyDown)
      window.removeEventListener('mousemove', this.onPanelDragMouseMove)
      window.removeEventListener('mouseup', this.onPanelDragMouseUp)
      window.removeEventListener('mousemove', this.onResizerMouseMove)
      window.removeEventListener('mouseup', this.onResizerMouseUp)
    }
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (!this.props.isDetached) {
      return
    }

    if (event.key === 'Escape') {
      this.props.onReattach()
    }
  }

  private onHeaderMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }

    const target = event.target as HTMLElement | null
    if (target?.closest('button, a, input, [role="button"]')) {
      return
    }

    event.preventDefault()
    this.dragStartX = event.clientX
    this.dragStartY = event.clientY
    this.panelStartX = this.state.x
    this.panelStartY = event.clientY ? this.state.y : 0
    this.isPanelDragging = true

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', this.onPanelDragMouseMove)
      window.addEventListener('mouseup', this.onPanelDragMouseUp)
    }

    this.setState({ isDragging: true })
  }

  private onPanelDragMouseMove = (event: MouseEvent) => {
    if (!this.isPanelDragging) {
      return
    }

    const deltaX = event.clientX - this.dragStartX
    const deltaY = event.clientY - this.dragStartY
    let newX = this.panelStartX + deltaX
    let newY = this.panelStartY + deltaY

    const winW = typeof window !== 'undefined' ? window.innerWidth : 1200
    const winH = typeof window !== 'undefined' ? window.innerHeight : 800

    newX = Math.max(10, Math.min(newX, winW - 120))
    newY = Math.max(30, Math.min(newY, winH - 50))

    let isNearDockZone = false
    if (this.placeholderRef.current) {
      const rect = this.placeholderRef.current.getBoundingClientRect()
      if (
        event.clientX >= rect.left - 60 &&
        event.clientX <= rect.right + 60 &&
        event.clientY >= rect.top - 60 &&
        event.clientY <= rect.bottom + 60
      ) {
        isNearDockZone = true
      }
    }

    this.setState({
      x: newX,
      y: newY,
      isNearDockZone,
    })
  }

  private onPanelDragMouseUp = () => {
    this.isPanelDragging = false
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this.onPanelDragMouseMove)
      window.removeEventListener('mouseup', this.onPanelDragMouseUp)
    }

    if (this.state.isNearDockZone) {
      this.setState({ isDragging: false, isNearDockZone: false })
      this.props.onReattach()
      return
    }

    this.setState({ isDragging: false, isNearDockZone: false })
  }

  private onHeaderDoubleClick = () => {
    this.props.onReattach()
  }

  private onResizerMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }
    event.preventDefault()
    event.stopPropagation()

    this.resizeStartX = event.clientX
    this.resizeStartY = event.clientY
    this.resizeStartWidth = this.state.width
    this.resizeStartHeight = this.state.height
    this.isPanelResizing = true

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', this.onResizerMouseMove)
      window.addEventListener('mouseup', this.onResizerMouseUp)
    }

    this.setState({ isResizing: true })
  }

  private onResizerMouseMove = (event: MouseEvent) => {
    if (!this.isPanelResizing) {
      return
    }

    const deltaX = event.clientX - this.resizeStartX
    const deltaY = event.clientY - this.resizeStartY

    const winW = typeof window !== 'undefined' ? window.innerWidth : 1200
    const winH = typeof window !== 'undefined' ? window.innerHeight : 800

    const newWidth = Math.max(
      300,
      Math.min(winW - this.state.x - 16, this.resizeStartWidth + deltaX)
    )
    const newHeight = Math.max(
      200,
      Math.min(winH - this.state.y - 16, this.resizeStartHeight + deltaY)
    )

    this.setState({
      width: newWidth,
      height: newHeight,
    })
  }

  private onResizerMouseUp = () => {
    this.isPanelResizing = false
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this.onResizerMouseMove)
      window.removeEventListener('mouseup', this.onResizerMouseUp)
    }
    this.setState({ isResizing: false })
  }

  private renderFloatingPanel(): JSX.Element {
    const { icon, title, children } = this.props
    const { x, y, width, height, isDragging, isResizing } = this.state
    const panelIcon = icon ?? octicons.screenFull

    return (
      <div
        ref={this.floatingRef}
        role="dialog"
        aria-label={title}
        className={classNames('floating-undocked-panel', {
          'is-dragging': isDragging,
          'is-resizing': isResizing,
        })}
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <header
          className="floating-panel-header"
          onMouseDown={this.onHeaderMouseDown}
          onDoubleClick={this.onHeaderDoubleClick}
          aria-label="Floating panel header. Drag to move, double-click to dock back"
        >
          <div className="title-area">
            <Octicon symbol={panelIcon} className="floating-title-icon" />
            <span className="floating-title-text">{title}</span>
            <span className="floating-badge">Floating</span>
          </div>

          <div className="header-actions">
            <Button
              className="dock-back-button"
              onClick={this.props.onReattach}
              ariaLabel="Dock back into main window (Esc or Double-click header)"
            >
              <Octicon symbol={octicons.unfold} />
              <span>Dock Back into Window</span>
            </Button>
            <button
              type="button"
              className="floating-close-button button-component"
              onClick={this.props.onReattach}
              aria-label="Dock back into main window"
            >
              <Octicon symbol={octicons.x} />
            </button>
          </div>
        </header>

        <div className="floating-panel-content">{children}</div>

        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <div
          role="separator"
          aria-label="Resize panel"
          className="floating-panel-resizer"
          onMouseDown={this.onResizerMouseDown}
        />
      </div>
    )
  }

  private renderPlaceholder(): JSX.Element {
    const icon = this.props.icon ?? octicons.screenFull
    const description =
      this.props.placeholderDescription ??
      'Viewing in an in-app floating panel. Drag it back here, double-click its header, or click below to re-dock.'
    const { isNearDockZone } = this.state

    return (
      <div
        ref={this.placeholderRef}
        className={classNames('panel blankslate detached-panel-placeholder', {
          'dock-snap-target-active': isNearDockZone,
        })}
      >
        <Octicon
          symbol={isNearDockZone ? octicons.unfold : icon}
          className="placeholder-icon"
        />
        <div className="placeholder-title">
          {isNearDockZone
            ? `Release to Dock ${this.props.title}`
            : `${this.props.title} is detached`}
        </div>
        <div className="placeholder-subtitle">{description}</div>
        <div className="placeholder-actions">
          <Button
            type="submit"
            className="dock-back-button"
            onClick={this.props.onReattach}
          >
            <Octicon symbol={octicons.unfold} />
            <span>Dock Back into Main Window</span>
          </Button>
        </div>
      </div>
    )
  }

  public render() {
    const { isDetached, className } = this.props

    if (isDetached) {
      return (
        <div className={`detached-panel-container ${className ?? ''}`}>
          {this.renderPlaceholder()}
          {typeof document !== 'undefined' &&
            document.body &&
            ReactDOM.createPortal(this.renderFloatingPanel(), document.body)}
        </div>
      )
    }

    return (
      <div className={`attached-panel-container ${className ?? ''}`}>
        {this.props.children}
      </div>
    )
  }
}
