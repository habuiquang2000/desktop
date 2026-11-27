import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { Button } from '../lib/button'

interface IDetachedPanelProps {
  /** Unique ID for the detached panel */
  readonly id: string

  /** User visible title for the panel */
  readonly title: string

  /** Whether the panel is currently detached into a separate window */
  readonly isDetached: boolean

  /** Callback invoked when the panel should reattach to the main window */
  readonly onReattach: () => void

  /** The content to be rendered (either inline or in the external window) */
  readonly children: React.ReactNode

  /** Optional icon to display in header/placeholder */
  readonly icon?: octicons.OcticonSymbolVariants

  /** Optional description for the in-app placeholder when detached */
  readonly placeholderDescription?: string

  /** Class name to apply to the container */
  readonly className?: string
}

interface IDetachedPanelState {
  readonly externalWindow: Window | null
  readonly portalContainer: HTMLDivElement | null
}

/**
 * Manages rendering content either inline or within a detached floating window
 * using a React Portal. When detached, the main window displays a placeholder
 * with a quick "Dock Back" action.
 */
export class DetachedPanel extends React.Component<
  IDetachedPanelProps,
  IDetachedPanelState
> {
  public constructor(props: IDetachedPanelProps) {
    super(props)
    this.state = {
      externalWindow: null,
      portalContainer: null,
    }
  }

  public componentDidMount() {
    if (this.props.isDetached) {
      this.openExternalWindow()
    }
  }

  public componentDidUpdate(prevProps: IDetachedPanelProps) {
    if (!prevProps.isDetached && this.props.isDetached) {
      this.openExternalWindow()
    } else if (prevProps.isDetached && !this.props.isDetached) {
      this.closeExternalWindow()
    } else if (this.state.externalWindow && this.props.isDetached) {
      this.syncThemeAndStyles(this.state.externalWindow)
    }
  }

  public componentWillUnmount() {
    this.closeExternalWindow()
  }

  private openExternalWindow() {
    if (this.state.externalWindow && !this.state.externalWindow.closed) {
      this.state.externalWindow.focus()
      return
    }

    const { id, title } = this.props
    const win = window.open(
      'about:blank',
      `github-desktop-detached-${id}`,
      'width=1100,height=800,menubar=no,toolbar=no,location=no,status=no'
    )

    if (!win) {
      // Window opening blocked or failed
      this.props.onReattach()
      return
    }

    win.document.title = `GitHub Desktop - ${title}`

    // Ensure CSS styles and themes match the main window
    this.syncThemeAndStyles(win)

    const portalContainer = win.document.createElement('div')
    portalContainer.className = 'detached-panel-root'
    win.document.body.appendChild(portalContainer)

    win.addEventListener('beforeunload', this.onWindowClosed)

    this.setState({
      externalWindow: win,
      portalContainer,
    })
  }

  private syncThemeAndStyles(win: Window) {
    if (!win || win.closed || !win.document) {
      return
    }

    // Match root classes for theme (theme-dark, theme-light, etc.)
    win.document.documentElement.className = document.documentElement.className
    win.document.body.className = `${document.body.className} detached-window-body`

    // Clone all stylesheets and styles from main document if not already cloned
    const existingStyles = win.document.head.querySelectorAll(
      'style, link[rel="stylesheet"]'
    )
    if (existingStyles.length === 0) {
      const sourceNodes = document.head.querySelectorAll(
        'style, link[rel="stylesheet"]'
      )
      sourceNodes.forEach(node => {
        try {
          win.document.head.appendChild(node.cloneNode(true))
        } catch {
          // Ignore copy failures
        }
      })
    }
  }

  private closeExternalWindow() {
    const { externalWindow } = this.state
    if (externalWindow && !externalWindow.closed) {
      externalWindow.removeEventListener('beforeunload', this.onWindowClosed)
      externalWindow.close()
    }
    this.setState({
      externalWindow: null,
      portalContainer: null,
    })
  }

  private onWindowClosed = () => {
    this.setState({
      externalWindow: null,
      portalContainer: null,
    })
    this.props.onReattach()
  }

  private renderDetachedContent(): JSX.Element | null {
    const { portalContainer } = this.state
    if (!portalContainer) {
      return null
    }

    const icon = this.props.icon ?? octicons.screenFull

    const detachedView = (
      <div className="detached-window-container">
        <header className="detached-window-header">
          <div className="title-area">
            <Octicon symbol={icon} className="detached-title-icon" />
            <span className="detached-title-text">{this.props.title}</span>
          </div>

          <div className="header-actions">
            <Button
              className="dock-back-button"
              onClick={this.props.onReattach}
            >
              <Octicon symbol={octicons.unfold} />
              <span>Dock Back into Window</span>
            </Button>
          </div>
        </header>

        <div className="detached-window-content">{this.props.children}</div>
      </div>
    )

    return ReactDOM.createPortal(detachedView, portalContainer)
  }

  private renderPlaceholder(): JSX.Element {
    const icon = this.props.icon ?? octicons.screenFull
    const description =
      this.props.placeholderDescription ??
      'Viewing and interacting in a separate floating window. Close that window or click below to re-dock.'

    return (
      <div className="panel blankslate detached-panel-placeholder">
        <Octicon symbol={icon} className="placeholder-icon" />
        <div className="placeholder-title">{this.props.title} is detached</div>
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
          {this.renderDetachedContent()}
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
