import * as React from 'react'
import { Repository } from '../../models/repository'
import { Dispatcher } from '../dispatcher'
import { Dialog, DialogContent } from '../dialog'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import {
  ICustomProjectScript,
  getCustomScripts,
  getHotScriptId,
  discoverProjectScripts,
} from '../../lib/custom-scripts'

interface IQuickSearchCommandDialogProps {
  readonly repository: Repository
  readonly dispatcher: Dispatcher
  readonly onDismissed: () => void
}

interface IQuickSearchCommandDialogState {
  readonly allScripts: ReadonlyArray<ICustomProjectScript>
  readonly hotScriptId: string | null
  readonly searchQuery: string
  readonly selectedIndex: number
}

export class QuickSearchCommandDialog extends React.Component<
  IQuickSearchCommandDialogProps,
  IQuickSearchCommandDialogState
> {
  private inputRef = React.createRef<HTMLInputElement>()
  private listContainerRef = React.createRef<HTMLDivElement>()

  public constructor(props: IQuickSearchCommandDialogProps) {
    super(props)

    this.state = {
      allScripts: getCustomScripts(props.repository),
      hotScriptId: getHotScriptId(props.repository),
      searchQuery: '',
      selectedIndex: 0,
    }
  }

  public async componentDidMount() {
    const { repository } = this.props
    const custom = getCustomScripts(repository)
    const detected = await discoverProjectScripts(repository.path)
    const hotScriptId = getHotScriptId(repository)

    // Merge custom scripts and detected scripts without duplicates
    const seenIds = new Set<string>()
    const combined: ICustomProjectScript[] = []

    for (const s of [...custom, ...detected]) {
      if (!seenIds.has(s.id)) {
        seenIds.add(s.id)
        combined.push(s)
      }
    }

    this.setState({
      allScripts: combined,
      hotScriptId,
    })

    this.inputRef.current?.focus()
  }

  private onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      searchQuery: e.target.value,
      selectedIndex: 0,
    })
  }

  private getFilteredScripts(): ReadonlyArray<ICustomProjectScript> {
    const { allScripts, searchQuery, hotScriptId } = this.state
    const query = searchQuery.trim().toLowerCase()

    if (query.length === 0) {
      // Sort hot script to top
      if (hotScriptId) {
        const hot = allScripts.find(s => s.id === hotScriptId)
        if (hot) {
          const rest = allScripts.filter(s => s.id !== hotScriptId)
          return [hot, ...rest]
        }
      }
      return allScripts
    }

    const filtered = allScripts.filter(
      s =>
        s.name.toLowerCase().includes(query) ||
        s.command.toLowerCase().includes(query)
    )

    // If query does not exactly match any command, offer it as an ad-hoc command option
    const exactMatch = allScripts.some(
      s => s.command.toLowerCase() === query || s.name.toLowerCase() === query
    )

    if (!exactMatch && query.length > 0) {
      const adHocScript: ICustomProjectScript = {
        id: `adhoc-${query}`,
        name: searchQuery.trim(),
        command: searchQuery.trim(),
        source: 'custom',
      }
      return [adHocScript, ...filtered]
    }

    return filtered
  }

  private onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const items = this.getFilteredScripts()
    if (items.length === 0) {
      if (e.key === 'Escape') {
        e.preventDefault()
        this.props.onDismissed()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.setState(
        prevState => ({
          selectedIndex: (prevState.selectedIndex + 1) % items.length,
        }),
        () => this.scrollSelectedItemIntoView()
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.setState(
        prevState => ({
          selectedIndex:
            (prevState.selectedIndex - 1 + items.length) % items.length,
        }),
        () => this.scrollSelectedItemIntoView()
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = items[this.state.selectedIndex]
      if (selected) {
        this.runScript(selected)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.props.onDismissed()
    }
  }

  private scrollSelectedItemIntoView() {
    if (!this.listContainerRef.current) {
      return
    }
    const selectedEl = this.listContainerRef.current.querySelector(
      '.quick-search-item.is-selected'
    )
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' })
    }
  }

  private runScript = async (script: ICustomProjectScript) => {
    this.props.onDismissed()
    await this.props.dispatcher.runCustomScript(this.props.repository, script)
  }

  public render() {
    const { searchQuery, selectedIndex, hotScriptId } = this.state
    const filtered = this.getFilteredScripts()

    return (
      <Dialog
        id="quick-search-command-dialog"
        title="Quick Search Command"
        onDismissed={this.props.onDismissed}
        onSubmit={this.props.onDismissed}
      >
        <DialogContent className="quick-search-command-content">
          <div className="quick-search-input-wrapper">
            <Octicon symbol={octicons.search} className="search-icon" />
            <input
              ref={this.inputRef}
              type="text"
              className="quick-search-input"
              placeholder="Type script or command to run (e.g. dev, test, build, lint)..."
              value={searchQuery}
              onChange={this.onSearchChange}
              onKeyDown={this.onKeyDown}
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                className="quick-search-clear-btn"
                onClick={() => this.setState({ searchQuery: '', selectedIndex: 0 })}
                title="Clear search"
              >
                <Octicon symbol={octicons.x} />
              </button>
            )}
          </div>

          <div
            ref={this.listContainerRef}
            className="quick-search-results-list"
            role="listbox"
          >
            {filtered.map((script, index) => {
              const isSelected = index === selectedIndex
              const isHot = hotScriptId === script.id
              const isAdHoc = script.id.startsWith('adhoc-')

              let badgeText = ''
              let badgeClass = ''

              if (isAdHoc) {
                badgeText = 'Run Command'
                badgeClass = 'badge-adhoc'
              } else if (isHot) {
                badgeText = 'Hot Script'
                badgeClass = 'badge-hot'
              } else if (script.source === 'package.json') {
                badgeText = 'npm'
                badgeClass = 'badge-npm'
              } else if (script.source === 'file') {
                badgeText = 'file'
                badgeClass = 'badge-file'
              } else {
                badgeText = 'custom'
                badgeClass = 'badge-custom'
              }

              return (
                <div
                  key={script.id}
                  className={`quick-search-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => this.runScript(script)}
                  onMouseEnter={() => this.setState({ selectedIndex: index })}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="item-icon">
                    <Octicon symbol={octicons.play} />
                  </div>
                  <div className="item-content">
                    <div className="item-header-row">
                      <span className="item-name">{script.name}</span>
                      <span className={`item-badge ${badgeClass}`}>
                        {badgeText}
                      </span>
                    </div>
                    <span className="item-command">{script.command}</span>
                  </div>
                  {isSelected && (
                    <div className="item-action-hint">
                      <kbd className="key-hint">↵ Run</kbd>
                    </div>
                  )}
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div className="quick-search-empty">
                No matching scripts found. Type a command and press Enter to run it.
              </div>
            )}
          </div>

          <div className="quick-search-footer-hint">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> to navigate
            </span>
            <span>
              <kbd>↵ Enter</kbd> to run
            </span>
            <span>
              <kbd>Esc</kbd> to close
            </span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }
}
