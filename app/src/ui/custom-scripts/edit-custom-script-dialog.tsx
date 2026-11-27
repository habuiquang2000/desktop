import * as React from 'react'
import { Repository } from '../../models/repository'
import { Dispatcher } from '../dispatcher'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { TextBox } from '../lib/text-box'
import { Checkbox, CheckboxValue } from '../lib/checkbox'
import { Row } from '../lib/row'
import {
  ICustomProjectScript,
  saveCustomScript,
  setHotScriptId,
  getHotScriptId,
} from '../../lib/custom-scripts'

interface IEditCustomScriptDialogProps {
  readonly repository: Repository
  readonly dispatcher: Dispatcher
  readonly onDismissed: () => void
  readonly script?: ICustomProjectScript
  readonly onSave?: (script: ICustomProjectScript) => void
}

interface IEditCustomScriptDialogState {
  readonly name: string
  readonly command: string
  readonly workingDirectory: string
  readonly runInTerminal: boolean
  readonly isHotScript: boolean
  readonly error: string | null
}

export class EditCustomScriptDialog extends React.Component<
  IEditCustomScriptDialogProps,
  IEditCustomScriptDialogState
> {
  public constructor(props: IEditCustomScriptDialogProps) {
    super(props)

    const isEdit = props.script !== undefined
    const currentHotId = getHotScriptId(props.repository)
    const isHotScript = isEdit
      ? currentHotId === props.script?.id
      : currentHotId === null

    this.state = {
      name: props.script?.name ?? '',
      command: props.script?.command ?? '',
      workingDirectory: props.script?.workingDirectory ?? '',
      runInTerminal: props.script?.runInTerminal ?? false,
      isHotScript,
      error: null,
    }
  }

  private onNameChanged = (name: string) => {
    this.setState({ name, error: null })
  }

  private onCommandChanged = (command: string) => {
    this.setState({ command, error: null })
  }

  private onWorkingDirectoryChanged = (workingDirectory: string) => {
    this.setState({ workingDirectory })
  }

  private onRunInTerminalChanged = (
    event: React.FormEvent<HTMLInputElement>
  ) => {
    this.setState({ runInTerminal: event.currentTarget.checked })
  }

  private onIsHotScriptChanged = (event: React.FormEvent<HTMLInputElement>) => {
    this.setState({ isHotScript: event.currentTarget.checked })
  }

  private onSubmit = () => {
    const { name, command, workingDirectory, runInTerminal, isHotScript } =
      this.state
    const trimmedName = name.trim()
    const trimmedCommand = command.trim()

    if (trimmedName.length === 0) {
      this.setState({ error: 'Script name cannot be empty.' })
      return
    }

    if (trimmedCommand.length === 0) {
      this.setState({ error: 'Command cannot be empty.' })
      return
    }

    const scriptId =
      this.props.script?.id ??
      `custom-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

    const updatedScript: ICustomProjectScript = {
      id: scriptId,
      name: trimmedName,
      command: trimmedCommand,
      source: 'custom',
      runInTerminal,
      workingDirectory:
        workingDirectory.trim().length > 0
          ? workingDirectory.trim()
          : undefined,
    }

    saveCustomScript(this.props.repository, updatedScript)

    if (isHotScript) {
      setHotScriptId(this.props.repository, updatedScript.id)
    }

    this.props.onSave?.(updatedScript)
    this.props.onDismissed()
  }

  public render() {
    const isEdit = this.props.script !== undefined
    const title = isEdit ? 'Edit Custom Script' : 'Add Custom Script'

    return (
      <Dialog
        id="edit-custom-script-dialog"
        title={title}
        onDismissed={this.props.onDismissed}
        onSubmit={this.onSubmit}
      >
        <DialogContent>
          {this.state.error && (
            <div className="custom-script-dialog-error" role="alert">
              {this.state.error}
            </div>
          )}

          <Row>
            <TextBox
              label="Script Name"
              placeholder="e.g. Build Dev, Run Tests, Deploy"
              value={this.state.name}
              onValueChanged={this.onNameChanged}
              autoFocus={true}
            />
          </Row>

          <Row>
            <TextBox
              label="Command"
              placeholder="e.g. npm run dev, ./scripts/build.sh, pytest"
              value={this.state.command}
              onValueChanged={this.onCommandChanged}
            />
          </Row>

          <Row>
            <TextBox
              label="Working Directory (optional)"
              placeholder="Leave empty for project root"
              value={this.state.workingDirectory}
              onValueChanged={this.onWorkingDirectoryChanged}
            />
          </Row>

          <Row>
            <Checkbox
              label="Run in external terminal window"
              value={
                this.state.runInTerminal ? CheckboxValue.On : CheckboxValue.Off
              }
              onChange={this.onRunInTerminalChanged}
            />
          </Row>

          <Row>
            <Checkbox
              label="Set as default Hot Button script"
              value={
                this.state.isHotScript ? CheckboxValue.On : CheckboxValue.Off
              }
              onChange={this.onIsHotScriptChanged}
            />
          </Row>
        </DialogContent>

        <DialogFooter>
          <OkCancelButtonGroup
            okButtonText={isEdit ? 'Save Changes' : 'Add Script'}
            cancelButtonText="Cancel"
          />
        </DialogFooter>
      </Dialog>
    )
  }
}
