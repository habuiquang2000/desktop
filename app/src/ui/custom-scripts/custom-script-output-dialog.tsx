import * as React from 'react'
import { Repository } from '../../models/repository'
import { Dispatcher } from '../dispatcher'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { Button } from '../lib/button'
import { Octicon, syncClockwise } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { CustomScriptRunner, IScriptRunState } from '../../lib/custom-scripts'
import { clipboard } from 'electron'
import { Disposable } from 'event-kit'

interface ICustomScriptOutputDialogProps {
  readonly repository: Repository
  readonly dispatcher: Dispatcher
  readonly onDismissed: () => void
}

interface ICustomScriptOutputDialogState {
  readonly execution: IScriptRunState | null
  readonly copySuccess: boolean
}

export class CustomScriptOutputDialog extends React.Component<
  ICustomScriptOutputDialogProps,
  ICustomScriptOutputDialogState
> {
  private outputContainerRef = React.createRef<HTMLPreElement>()
  private runnerDisposable: Disposable | null = null

  public constructor(props: ICustomScriptOutputDialogProps) {
    super(props)
    const runner = CustomScriptRunner.getInstance()
    this.state = {
      execution: runner.getExecution(props.repository),
      copySuccess: false,
    }
  }

  public componentDidMount() {
    const runner = CustomScriptRunner.getInstance()
    this.runnerDisposable = runner.onExecutionChanged((repoKey, execution) => {
      if (
        repoKey === this.props.repository.path ||
        repoKey === String(this.props.repository.id)
      ) {
        this.setState({ execution }, () => {
          this.scrollToBottom()
        })
      }
    })
    this.scrollToBottom()
  }

  public componentWillUnmount() {
    this.runnerDisposable?.dispose()
  }

  private scrollToBottom() {
    if (this.outputContainerRef.current) {
      this.outputContainerRef.current.scrollTop =
        this.outputContainerRef.current.scrollHeight
    }
  }

  private onStop = () => {
    CustomScriptRunner.getInstance().stop(this.props.repository)
  }

  private onRerun = async () => {
    const { execution } = this.state
    if (!execution) {
      return
    }
    await this.props.dispatcher.runCustomScript(
      this.props.repository,
      execution.script
    )
  }

  private onCopy = () => {
    const { execution } = this.state
    if (!execution || execution.output.length === 0) {
      return
    }
    clipboard.writeText(execution.output.join('\n'))
    this.setState({ copySuccess: true })
    setTimeout(() => {
      this.setState({ copySuccess: false })
    }, 2000)
  }

  private onClear = () => {
    CustomScriptRunner.getInstance().clearOutput(this.props.repository)
    this.setState({ execution: null })
  }

  public render() {
    const { execution, copySuccess } = this.state
    const isRunning = execution?.status === 'running'
    const scriptName = execution?.script.name ?? 'Custom Script'

    return (
      <Dialog
        id="custom-script-output-dialog"
        title={`Script Output: ${scriptName}`}
        onDismissed={this.props.onDismissed}
        onSubmit={this.props.onDismissed}
      >
        <DialogContent className="custom-script-output-content">
          <div className="custom-script-output-header">
            <div className="custom-script-output-meta">
              <span className="custom-script-command">
                <code>
                  {execution?.script.command || 'No script executed yet'}
                </code>
              </span>
              {execution && (
                <div className="custom-script-status-badges">
                  {isRunning ? (
                    <span className="script-badge badge-running">
                      <Octicon className="spin" symbol={syncClockwise} />
                      Running
                    </span>
                  ) : execution.status === 'success' ? (
                    <span className="script-badge badge-success">
                      <Octicon symbol={octicons.check} />
                      Success (Exit 0)
                    </span>
                  ) : (
                    <span className="script-badge badge-failed">
                      <Octicon symbol={octicons.alert} />
                      Failed (Exit {execution.exitCode ?? -1})
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="custom-script-output-actions">
              {isRunning ? (
                <Button onClick={this.onStop} className="stop-button">
                  <Octicon symbol={octicons.stop} />
                  Stop
                </Button>
              ) : (
                execution && (
                  <Button onClick={this.onRerun}>
                    <Octicon symbol={octicons.play} />
                    Rerun
                  </Button>
                )
              )}
              <Button
                onClick={this.onCopy}
                disabled={!execution || execution.output.length === 0}
              >
                <Octicon symbol={octicons.copy} />
                {copySuccess ? 'Copied!' : 'Copy'}
              </Button>
              <Button onClick={this.onClear} disabled={isRunning || !execution}>
                Clear
              </Button>
            </div>
          </div>

          <pre
            ref={this.outputContainerRef}
            className="custom-script-terminal-output"
            tabIndex={0}
          >
            {execution && execution.output.length > 0
              ? execution.output.join('\n')
              : 'No output available.'}
          </pre>
        </DialogContent>

        <DialogFooter>
          <OkCancelButtonGroup okButtonText="Close" />
        </DialogFooter>
      </Dialog>
    )
  }
}
