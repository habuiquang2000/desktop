import * as React from 'react'
import { Dispatcher } from '../dispatcher'
import { Repository } from '../../models/repository'
import {
  ToolbarDropdown,
  DropdownState,
  ToolbarDropdownStyle,
} from './dropdown'
import { ToolbarButtonStyle } from './button'
import { FoldoutType } from '../../lib/app-state'
import { Octicon, OcticonSymbol, syncClockwise } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import {
  ICustomProjectScript,
  IScriptRunState,
  CustomScriptRunner,
  getCustomScripts,
  deleteCustomScript,
  getHotScriptId,
  setHotScriptId,
  discoverProjectScripts,
} from '../../lib/custom-scripts'
import { Disposable } from 'event-kit'

interface ICustomScriptDropdownProps {
  readonly dispatcher: Dispatcher
  readonly repository: Repository
  readonly isOpen: boolean
  readonly onDropDownStateChanged: (state: DropdownState) => void
  readonly enableFocusTrap: boolean
  readonly disabled?: boolean
}

interface ICustomScriptDropdownState {
  readonly customScripts: ReadonlyArray<ICustomProjectScript>
  readonly detectedScripts: ReadonlyArray<ICustomProjectScript>
  readonly hotScriptId: string | null
  readonly execution: IScriptRunState | null
  readonly quickCommand: string
  readonly searchFilter: string
}

export class CustomScriptDropdown extends React.Component<
  ICustomScriptDropdownProps,
  ICustomScriptDropdownState
> {
  private isComponentMounted = false
  private runnerDisposable: Disposable | null = null

  public constructor(props: ICustomScriptDropdownProps) {
    super(props)

    const runner = CustomScriptRunner.getInstance()
    this.state = {
      customScripts: getCustomScripts(props.repository),
      detectedScripts: [],
      hotScriptId: getHotScriptId(props.repository),
      execution: runner.getExecution(props.repository),
      quickCommand: '',
      searchFilter: '',
    }
  }

  public async componentDidMount() {
    this.isComponentMounted = true

    // Subscribe to runner execution updates
    const runner = CustomScriptRunner.getInstance()
    this.runnerDisposable = runner.onExecutionChanged((repoKey, execution) => {
      if (!this.isComponentMounted) {
        return
      }
      if (
        repoKey === this.props.repository.path ||
        repoKey === String(this.props.repository.id)
      ) {
        this.setState({ execution })
      }
    })

    await this.refreshScripts()
  }

  public componentWillUnmount() {
    this.isComponentMounted = false
    this.runnerDisposable?.dispose()
  }

  public async componentDidUpdate(prevProps: ICustomScriptDropdownProps) {
    if (prevProps.repository.path !== this.props.repository.path) {
      await this.refreshScripts()
    }
  }

  private refreshScripts = async () => {
    const { repository } = this.props
    const customScripts = getCustomScripts(repository)
    const hotScriptId = getHotScriptId(repository)
    const detectedScripts = await discoverProjectScripts(repository.path)

    if (this.isComponentMounted) {
      this.setState({
        customScripts,
        detectedScripts,
        hotScriptId,
        execution: CustomScriptRunner.getInstance().getExecution(repository),
      })
    }
  }

  private getHotScript(): ICustomProjectScript | null {
    const { customScripts, detectedScripts, hotScriptId } = this.state

    if (hotScriptId) {
      const customMatch = customScripts.find(s => s.id === hotScriptId)
      if (customMatch) {
        return customMatch
      }
      const detectedMatch = detectedScripts.find(s => s.id === hotScriptId)
      if (detectedMatch) {
        return detectedMatch
      }
    }

    // Default heuristics if no explicit hot script set:
    if (customScripts.length > 0) {
      return customScripts[0]
    }

    const priorityNames = ['dev', 'start', 'test', 'build', 'watch']
    for (const name of priorityNames) {
      const match = detectedScripts.find(
        s =>
          s.name.toLowerCase() === name ||
          s.name.toLowerCase().startsWith(`${name}:`)
      )
      if (match) {
        return match
      }
    }

    return detectedScripts.length > 0 ? detectedScripts[0] : null
  }

  /**
   * Clicking the main toolbar button (Hot Button):
   * - If a script is running: opens the output viewer.
   * - If idle and hot script exists: runs it immediately!
   * - If idle and no script: opens dropdown.
   */
  private onHotButtonClick = async () => {
    if (this.props.disabled) {
      return
    }

    const { execution } = this.state
    if (execution && execution.status === 'running') {
      this.props.dispatcher.showCustomScriptOutput(this.props.repository)
      return
    }

    const hotScript = this.getHotScript()
    if (hotScript) {
      await this.props.dispatcher.runCustomScript(
        this.props.repository,
        hotScript
      )
    } else {
      // No script available yet: toggle open dropdown so user can add/pick
      this.props.onDropDownStateChanged('open')
    }
  }

  private onRunScript = async (script: ICustomProjectScript) => {
    this.props.dispatcher.closeFoldout(FoldoutType.CustomScript)
    await this.props.dispatcher.runCustomScript(this.props.repository, script)
  }

  private onSetAsHotScript = (scriptId: string) => {
    setHotScriptId(this.props.repository, scriptId)
    this.setState({ hotScriptId: scriptId })
  }

  private onAddScript = () => {
    this.props.dispatcher.closeFoldout(FoldoutType.CustomScript)
    this.props.dispatcher.showEditCustomScript(
      this.props.repository,
      undefined,
      async () => {
        await this.refreshScripts()
      }
    )
  }

  private onEditScript = (script: ICustomProjectScript) => {
    this.props.dispatcher.closeFoldout(FoldoutType.CustomScript)
    this.props.dispatcher.showEditCustomScript(
      this.props.repository,
      script,
      async () => {
        await this.refreshScripts()
      }
    )
  }

  private onDeleteScript = (scriptId: string) => {
    deleteCustomScript(this.props.repository, scriptId)
    this.refreshScripts()
  }

  private onViewOutput = () => {
    this.props.dispatcher.closeFoldout(FoldoutType.CustomScript)
    this.props.dispatcher.showCustomScriptOutput(this.props.repository)
  }

  private onStopScript = () => {
    this.props.dispatcher.stopCustomScript(this.props.repository)
  }

  private onQuickCommandSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmed = (this.state.searchFilter || this.state.quickCommand).trim()
    if (trimmed.length === 0) {
      return
    }

    const all = [...this.state.customScripts, ...this.state.detectedScripts]
    const match = all.find(
      s =>
        s.name.toLowerCase() === trimmed.toLowerCase() ||
        s.command.toLowerCase() === trimmed.toLowerCase()
    )

    const targetScript: ICustomProjectScript = match ?? {
      id: `adhoc-${Date.now()}`,
      name: trimmed,
      command: trimmed,
      source: 'custom',
    }

    this.setState({ quickCommand: '', searchFilter: '' })
    this.props.dispatcher.closeFoldout(FoldoutType.CustomScript)
    await this.props.dispatcher.runCustomScript(
      this.props.repository,
      targetScript
    )
  }

  private onOpenQuickSearchCommand = () => {
    this.props.dispatcher.closeFoldout(FoldoutType.CustomScript)
    this.props.dispatcher.showQuickSearchCommand(this.props.repository)
  }

  private onSearchFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      searchFilter: e.target.value,
      quickCommand: e.target.value,
    })
  }

  private onSearchFilterKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      await this.onQuickCommandSubmit()
    } else if (e.key === 'Escape') {
      this.setState({ searchFilter: '', quickCommand: '' })
    }
  }

  private renderDropdownContent = (): JSX.Element => {
    const {
      customScripts,
      detectedScripts,
      hotScriptId,
      execution,
      searchFilter,
    } = this.state
    const isRunning = execution?.status === 'running'
    const hotScript = this.getHotScript()

    const filter = searchFilter.trim().toLowerCase()
    const filteredCustomScripts =
      filter.length === 0
        ? customScripts
        : customScripts.filter(
            s =>
              s.name.toLowerCase().includes(filter) ||
              s.command.toLowerCase().includes(filter)
          )

    const filteredDetectedScripts =
      filter.length === 0
        ? detectedScripts
        : detectedScripts.filter(
            s =>
              s.name.toLowerCase().includes(filter) ||
              s.command.toLowerCase().includes(filter)
          )

    const showHotScript =
      hotScript &&
      (filter.length === 0 ||
        hotScript.name.toLowerCase().includes(filter) ||
        hotScript.command.toLowerCase().includes(filter))

    return (
      <div className="custom-script-dropdown-foldout">
        <div className="custom-script-dropdown-header">
          <span className="custom-script-dropdown-header-title">
            Project Scripts
          </span>
          <div className="custom-script-dropdown-header-actions">
            <button
              type="button"
              className="custom-script-header-btn"
              onClick={this.onOpenQuickSearchCommand}
              title="Quick Search Command Palette (Ctrl+K)"
            >
              <Octicon symbol={octicons.search} />
              <span className="header-btn-text">Quick Search</span>
            </button>
            <button
              type="button"
              className="custom-script-header-btn"
              onClick={this.onAddScript}
              title="Add Custom Script"
            >
              <Octicon symbol={octicons.plus} />
              <span className="header-btn-text">Add</span>
            </button>
            <button
              type="button"
              className="custom-script-header-btn"
              onClick={this.onViewOutput}
              title="View Output Console"
            >
              <Octicon symbol={octicons.terminal} />
              <span className="header-btn-text">Logs</span>
            </button>
          </div>
        </div>

        {isRunning && execution && (
          <div className="custom-script-running-banner">
            <div className="running-info">
              <Octicon className="spin" symbol={syncClockwise} />
              <div className="running-text">
                <span className="running-name">{execution.script.name}</span>
                <span className="running-command">
                  {execution.script.command}
                </span>
              </div>
            </div>
            <div className="running-actions">
              <button
                type="button"
                className="script-btn-stop"
                onClick={this.onStopScript}
              >
                <Octicon symbol={octicons.stop} />
                Stop
              </button>
              <button
                type="button"
                className="script-btn-output"
                onClick={this.onViewOutput}
              >
                Output
              </button>
            </div>
          </div>
        )}

        {!isRunning && execution && (
          <div
            className={`custom-script-last-status status-${execution.status}`}
            onClick={this.onViewOutput}
            role="button"
            tabIndex={0}
          >
            <Octicon
              symbol={
                execution.status === 'success' ? octicons.check : octicons.alert
              }
            />
            <span className="last-status-text">
              Last run: <strong>{execution.script.name}</strong> (Exit{' '}
              {execution.exitCode ?? 0})
            </span>
            <span className="last-status-link">View logs</span>
          </div>
        )}

        <form
          className="custom-script-search-bar custom-script-quick-form"
          onSubmit={this.onQuickCommandSubmit}
        >
          <Octicon symbol={octicons.search} className="search-bar-icon" />
          <input
            type="text"
            className="custom-script-search-input custom-script-quick-input"
            placeholder="Search scripts or type command to run (↵)..."
            value={searchFilter}
            onChange={this.onSearchFilterChange}
            onKeyDown={this.onSearchFilterKeyDown}
          />
          {searchFilter.length > 0 && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() =>
                this.setState({ searchFilter: '', quickCommand: '' })
              }
              title="Clear search"
            >
              <Octicon symbol={octicons.x} />
            </button>
          )}
          <button
            type="submit"
            className="custom-script-quick-run-btn"
            disabled={searchFilter.trim().length === 0}
            title="Run command"
          >
            <Octicon symbol={octicons.play} />
          </button>
        </form>

        <div className="custom-script-dropdown-list">
          {/* Hot Script Highlight Section */}
          {showHotScript && (
            <div className="custom-script-section">
              <div className="custom-script-section-title">
                <Octicon symbol={octicons.starFill} className="star-icon" />
                Hot Button Script
              </div>
              <div className="custom-script-item is-hot-script">
                <div className="script-item-info">
                  <div className="script-item-name-row">
                    <span className="script-item-name">{hotScript.name}</span>
                    <span className="script-item-badge">Default</span>
                  </div>
                  <span className="script-item-command">
                    {hotScript.command}
                  </span>
                </div>
                <div className="script-item-actions">
                  <button
                    type="button"
                    className="script-action-btn run-btn"
                    onClick={() => this.onRunScript(hotScript)}
                    title="Run Hot Script"
                  >
                    <Octicon symbol={octicons.play} />
                    Run
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Custom Scripts Section */}
          {filteredCustomScripts.length > 0 && (
            <div className="custom-script-section">
              <div className="custom-script-section-title">
                Custom Scripts ({filteredCustomScripts.length})
              </div>
              {filteredCustomScripts.map(script => {
                const isHot = hotScriptId === script.id
                return (
                  <div key={script.id} className="custom-script-item">
                    <div className="script-item-info">
                      <div className="script-item-name-row">
                        <span className="script-item-name">{script.name}</span>
                        {isHot && (
                          <span className="script-item-badge">Hot</span>
                        )}
                      </div>
                      <span className="script-item-command">
                        {script.command}
                      </span>
                    </div>
                    <div className="script-item-actions">
                      <button
                        type="button"
                        className="script-action-btn run-btn"
                        onClick={() => this.onRunScript(script)}
                        title="Run Script"
                      >
                        <Octicon symbol={octicons.play} />
                      </button>
                      <button
                        type="button"
                        className={`script-action-btn hot-btn ${
                          isHot ? 'active' : ''
                        }`}
                        onClick={() => this.onSetAsHotScript(script.id)}
                        title={
                          isHot ? 'Current Hot Script' : 'Set as Hot Button'
                        }
                      >
                        <Octicon
                          symbol={isHot ? octicons.starFill : octicons.star}
                        />
                      </button>
                      <button
                        type="button"
                        className="script-action-btn edit-btn"
                        onClick={() => this.onEditScript(script)}
                        title="Edit Script"
                      >
                        <Octicon symbol={octicons.pencil} />
                      </button>
                      <button
                        type="button"
                        className="script-action-btn delete-btn"
                        onClick={() => this.onDeleteScript(script.id)}
                        title="Delete Script"
                      >
                        <Octicon symbol={octicons.trash} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Detected Project Scripts Section */}
          {filteredDetectedScripts.length > 0 && (
            <div className="custom-script-section">
              <div className="custom-script-section-title">
                Detected Scripts ({filteredDetectedScripts.length})
              </div>
              {filteredDetectedScripts.map(script => {
                const isHot = hotScriptId === script.id
                return (
                  <div key={script.id} className="custom-script-item">
                    <div className="script-item-info">
                      <div className="script-item-name-row">
                        <span className="script-item-name">{script.name}</span>
                        <span className="script-item-source-badge">
                          {script.source === 'package.json' ? 'npm' : 'file'}
                        </span>
                        {isHot && (
                          <span className="script-item-badge">Hot</span>
                        )}
                      </div>
                      <span className="script-item-command">
                        {script.command}
                      </span>
                    </div>
                    <div className="script-item-actions">
                      <button
                        type="button"
                        className="script-action-btn run-btn"
                        onClick={() => this.onRunScript(script)}
                        title="Run Script"
                      >
                        <Octicon symbol={octicons.play} />
                      </button>
                      <button
                        type="button"
                        className={`script-action-btn hot-btn ${
                          isHot ? 'active' : ''
                        }`}
                        onClick={() => this.onSetAsHotScript(script.id)}
                        title={
                          isHot ? 'Current Hot Script' : 'Set as Hot Button'
                        }
                      >
                        <Octicon
                          symbol={isHot ? octicons.starFill : octicons.star}
                        />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {filter.length > 0 &&
            filteredCustomScripts.length === 0 &&
            filteredDetectedScripts.length === 0 && (
              <div className="custom-script-no-results">
                <span>
                  No matching scripts. Press <kbd>Enter</kbd> to run &ldquo;
                  {searchFilter.trim()}&rdquo; as a custom command.
                </span>
              </div>
            )}

          {filter.length === 0 &&
            customScripts.length === 0 &&
            detectedScripts.length === 0 && (
              <div className="custom-script-empty">
                No scripts found in project. Click &ldquo;Add&rdquo; above to
                create one.
              </div>
            )}
        </div>
      </div>
    )
  }

  public render() {
    const { isOpen, onDropDownStateChanged, enableFocusTrap, disabled } =
      this.props
    const { execution } = this.state

    const isRunning = execution?.status === 'running'
    const hotScript = this.getHotScript()

    let title = hotScript ? hotScript.name : 'Run Script'
    let description = hotScript ? 'Hot Script' : 'Custom Script'
    let tooltip = hotScript
      ? `Run '${hotScript.name}' (${hotScript.command}) - Click Hot Button to run`
      : 'Select or configure a script to run in this project'

    let icon: OcticonSymbol = octicons.play
    let iconClassName: string | undefined = undefined

    if (isRunning) {
      title = execution.script.name
      description = 'Running...'
      tooltip = `Script '${execution.script.name}' is running. Click to view output.`
      icon = syncClockwise
      iconClassName = 'spin'
    } else if (execution) {
      if (execution.status === 'success') {
        description = 'Exit 0'
      } else if (execution.status === 'failed') {
        description = `Exit ${execution.exitCode ?? -1}`
      }
    }

    return (
      <ToolbarDropdown
        className="custom-script-toolbar-dropdown"
        buttonClassName="custom-script-button"
        style={ToolbarButtonStyle.Standard}
        dropdownStyle={ToolbarDropdownStyle.MultiOption}
        icon={icon}
        iconClassName={iconClassName}
        title={title}
        description={description}
        tooltip={tooltip}
        onClick={this.onHotButtonClick}
        onDropdownStateChanged={onDropDownStateChanged}
        dropdownContentRenderer={this.renderDropdownContent}
        dropdownState={isOpen ? 'open' : 'closed'}
        dropdownHorizontalAlign="right"
        enableFocusTrap={enableFocusTrap}
        disabled={disabled}
        foldoutStyleOverrides={{
          width: 360,
          maxWidth: 'calc(100vw - 20px)',
          minWidth: 0,
          height: 'auto',
          maxHeight: 'calc(100vh - 45px)',
        }}
      />
    )
  }
}
