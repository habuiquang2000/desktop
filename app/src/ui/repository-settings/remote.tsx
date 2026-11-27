import * as React from 'react'
import { IRemote } from '../../models/remote'
import { TextBox } from '../lib/text-box'
import { Button } from '../lib/button'
import { Checkbox, CheckboxValue } from '../lib/checkbox'
import { Row } from '../lib/row'
import { Octicon, syncClockwise } from '../octicons'
import * as octicons from '../octicons/octicons.generated'

interface IRemoteProps {
  /** The primary remote being shown. */
  readonly remote: IRemote

  /** All configured remotes for the repository. */
  readonly remotes?: ReadonlyArray<IRemote>

  /** The map of remote name to current (possibly edited) URL. */
  readonly remoteUrls?: ReadonlyMap<string, string>

  /** The function to call when a remote URL is changed. */
  readonly onRemoteUrlChanged: (url: string, name?: string) => void

  /** Called when the user adds a new remote. */
  readonly onAddRemote?: (name: string, url: string) => Promise<void>

  /** Called when the user switches the primary remote to another remote. */
  readonly onSwitchRemote?: (targetRemoteName: string) => Promise<void>

  /** Called when the user removes a remote. */
  readonly onRemoveRemote?: (name: string) => Promise<void>

  /** Whether auto-syncing mirror on push is enabled */
  readonly autoSyncMirror?: boolean

  /** Called when auto-syncing mirror option changes */
  readonly onAutoSyncMirrorChanged?: (autoSync: boolean) => void

  /** Called when user wants to push mirror now */
  readonly onPushMirrorNow?: () => Promise<void>

  /** Called to open the Mirror Repository dialog */
  readonly onOpenMirrorDialog?: () => void
}

interface IRemoteState {
  readonly isAddingRemote: boolean
  readonly newRemoteName: string
  readonly newRemoteUrl: string
  readonly addRemoteError: string | null
  readonly isSubmitting: boolean
}

/** The Remote component for managing repository remotes. */
interface IRemoteCardProps {
  readonly remote: IRemote
  readonly isPrimary: boolean
  readonly hasMultipleRemotes: boolean
  readonly isSubmitting: boolean
  readonly label: string
  readonly url: string
  readonly onSwitchRemote?: (name: string) => void
  readonly onRemoveRemote?: (name: string) => void
  readonly onRemoteUrlChanged: (url: string, name?: string) => void
}

class RemoteCard extends React.Component<IRemoteCardProps> {
  private onSwitchRemote = () => {
    this.props.onSwitchRemote?.(this.props.remote.name)
  }

  private onRemoveRemote = () => {
    this.props.onRemoveRemote?.(this.props.remote.name)
  }

  private onRemoteUrlChanged = (url: string) => {
    this.props.onRemoteUrlChanged(url, this.props.remote.name)
  }

  public render() {
    const {
      remote,
      isPrimary,
      hasMultipleRemotes,
      isSubmitting,
      label,
      url,
      onSwitchRemote,
      onRemoveRemote,
    } = this.props

    return (
      <div className={`remote-card ${isPrimary ? 'primary-remote' : ''}`}>
        <div className="remote-card-header">
          <div className="remote-name-wrapper">
            <span className="remote-name">{remote.name}</span>
            {isPrimary && <span className="primary-badge">Primary</span>}
          </div>
          <div className="remote-card-actions">
            {!isPrimary && onSwitchRemote && (
              <Button
                size="small"
                className="switch-remote-button"
                onClick={this.onSwitchRemote}
                disabled={isSubmitting}
              >
                <Octicon symbol={octicons.arrowSwitch} />
                Switch remote
              </Button>
            )}
            {!isPrimary && onRemoveRemote && hasMultipleRemotes && (
              <Button
                size="small"
                className="remove-remote-button"
                onClick={this.onRemoveRemote}
                disabled={isSubmitting}
                tooltip="Remove remote"
                ariaLabel="Remove remote"
              >
                <Octicon symbol={octicons.trash} />
              </Button>
            )}
          </div>
        </div>
        <TextBox
          placeholder="Remote URL"
          label={label}
          value={url}
          onValueChanged={this.onRemoteUrlChanged}
          disabled={isSubmitting}
        />
      </div>
    )
  }
}

export class Remote extends React.Component<IRemoteProps, IRemoteState> {
  public constructor(props: IRemoteProps) {
    super(props)
    this.state = {
      isAddingRemote: false,
      newRemoteName: '',
      newRemoteUrl: '',
      addRemoteError: null,
      isSubmitting: false,
    }
  }

  private getRemotes(): ReadonlyArray<IRemote> {
    if (this.props.remotes && this.props.remotes.length > 0) {
      return this.props.remotes
    }
    return [this.props.remote]
  }

  private getPrimaryRemoteName(): string {
    const remotes = this.getRemotes()
    const origin = remotes.find(r => r.name === 'origin')
    if (origin) {
      return origin.name
    }
    return this.props.remote?.name ?? remotes[0]?.name ?? 'origin'
  }

  private getUrlForRemote(remote: IRemote): string {
    return this.props.remoteUrls?.get(remote.name) ?? remote.url
  }

  private onToggleAddRemote = () => {
    this.setState(prevState => ({
      isAddingRemote: !prevState.isAddingRemote,
      newRemoteName: '',
      newRemoteUrl: '',
      addRemoteError: null,
    }))
  }

  private onNewRemoteNameChanged = (name: string) => {
    this.setState({ newRemoteName: name, addRemoteError: null })
  }

  private onNewRemoteUrlChanged = (url: string) => {
    this.setState({ newRemoteUrl: url, addRemoteError: null })
  }

  private onAddRemoteSubmit = async () => {
    const name = this.state.newRemoteName.trim()
    const url = this.state.newRemoteUrl.trim()

    if (name.length === 0) {
      this.setState({ addRemoteError: 'Remote name cannot be empty.' })
      return
    }

    if (/\s/.test(name)) {
      this.setState({
        addRemoteError: 'Remote name cannot contain whitespace.',
      })
      return
    }

    if (/[\\/:*?"<>|]/.test(name) || name.includes('..')) {
      this.setState({
        addRemoteError: 'Remote name contains invalid characters.',
      })
      return
    }

    const remotes = this.getRemotes()
    if (remotes.some(r => r.name === name)) {
      this.setState({
        addRemoteError: `A remote named '${name}' already exists.`,
      })
      return
    }

    if (url.length === 0) {
      this.setState({ addRemoteError: 'Remote URL cannot be empty.' })
      return
    }

    this.setState({ isSubmitting: true, addRemoteError: null })
    try {
      if (this.props.onAddRemote) {
        await this.props.onAddRemote(name, url)
      }
      this.setState({
        isAddingRemote: false,
        newRemoteName: '',
        newRemoteUrl: '',
        isSubmitting: false,
        addRemoteError: null,
      })
    } catch (e) {
      this.setState({
        isSubmitting: false,
        addRemoteError: `Failed to add remote: ${e}`,
      })
    }
  }

  private onSwitchRemote = async (targetRemoteName: string) => {
    if (this.props.onSwitchRemote) {
      this.setState({ isSubmitting: true })
      try {
        await this.props.onSwitchRemote(targetRemoteName)
      } finally {
        this.setState({ isSubmitting: false })
      }
    }
  }

  private onQuickSwitch = async () => {
    const remotes = this.getRemotes()
    const primaryName = this.getPrimaryRemoteName()
    const otherRemote = remotes.find(r => r.name !== primaryName)
    if (otherRemote) {
      await this.onSwitchRemote(otherRemote.name)
    }
  }

  private onRemoveRemote = async (name: string) => {
    if (this.props.onRemoveRemote) {
      this.setState({ isSubmitting: true })
      try {
        await this.props.onRemoveRemote(name)
      } finally {
        this.setState({ isSubmitting: false })
      }
    }
  }

  private renderAddRemoteSection() {
    if (!this.state.isAddingRemote) {
      return null
    }

    const canSubmit =
      this.state.newRemoteName.trim().length > 0 &&
      this.state.newRemoteUrl.trim().length > 0

    return (
      <div className="add-remote-section">
        <h3>
          {__DARWIN__ ? 'Add Remote Repository' : 'Add remote repository'}
        </h3>
        <TextBox
          label="Remote name"
          placeholder="e.g. upstream"
          value={this.state.newRemoteName}
          onValueChanged={this.onNewRemoteNameChanged}
          disabled={this.state.isSubmitting}
          autoFocus={true}
        />
        <TextBox
          label="Remote URL"
          placeholder="https://github.com/owner/repository.git"
          value={this.state.newRemoteUrl}
          onValueChanged={this.onNewRemoteUrlChanged}
          disabled={this.state.isSubmitting}
        />
        {this.state.addRemoteError && (
          <div className="add-remote-error">{this.state.addRemoteError}</div>
        )}
        <div className="add-remote-actions">
          <Button
            type="button"
            onClick={this.onAddRemoteSubmit}
            disabled={this.state.isSubmitting || !canSubmit}
          >
            Add
          </Button>
          <Button
            type="button"
            onClick={this.onToggleAddRemote}
            disabled={this.state.isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  private onAutoSyncChanged = (event: React.FormEvent<HTMLInputElement>) => {
    this.props.onAutoSyncMirrorChanged?.(event.currentTarget.checked)
  }

  private onPushMirror = async () => {
    if (this.props.onPushMirrorNow) {
      this.setState({ isSubmitting: true })
      try {
        await this.props.onPushMirrorNow()
      } finally {
        this.setState({ isSubmitting: false })
      }
    }
  }

  public render() {
    const remotes = this.getRemotes()
    const primaryName = this.getPrimaryRemoteName()
    const hasMultipleRemotes = remotes.length > 1
    const mirrorRemote = remotes.find(r => r.name === 'mirror')

    return (
      <div className="remote-settings-container">
        <div className="remote-header-row">
          <div className="remote-header-title">
            {__DARWIN__ ? 'Remote Repositories' : 'Remote repositories'}
          </div>
          <div className="remote-header-actions">
            {hasMultipleRemotes && this.props.onSwitchRemote && (
              <Button
                size="small"
                className="switch-remote-button"
                onClick={this.onQuickSwitch}
                disabled={this.state.isSubmitting}
              >
                <Octicon symbol={octicons.arrowSwitch} />
                Switch remote
              </Button>
            )}
            {this.props.onAddRemote && (
              <Button
                size="small"
                className="add-remote-button"
                onClick={this.onToggleAddRemote}
                disabled={this.state.isSubmitting}
              >
                <Octicon symbol={octicons.plus} />
                Add remote
              </Button>
            )}
          </div>
        </div>

        {this.renderAddRemoteSection()}

        <div className="remotes-list">
          {remotes.map(remote => {
            const isPrimary = remote.name === primaryName
            const label = isPrimary
              ? __DARWIN__
                ? `Primary Remote Repository (${remote.name}) URL`
                : `Primary remote repository (${remote.name}) URL`
              : __DARWIN__
              ? `Remote Repository (${remote.name}) URL`
              : `Remote repository (${remote.name}) URL`

            return (
              <RemoteCard
                key={remote.name}
                remote={remote}
                isPrimary={isPrimary}
                hasMultipleRemotes={hasMultipleRemotes}
                isSubmitting={this.state.isSubmitting}
                label={label}
                url={this.getUrlForRemote(remote)}
                onSwitchRemote={
                  this.props.onSwitchRemote ? this.onSwitchRemote : undefined
                }
                onRemoveRemote={
                  this.props.onRemoveRemote ? this.onRemoveRemote : undefined
                }
                onRemoteUrlChanged={this.props.onRemoteUrlChanged}
              />
            )
          })}
        </div>

        <div className="mirror-settings-section">
          <div className="remote-header-row">
            <div className="remote-header-title">
              {__DARWIN__ ? 'Mirror Repository' : 'Mirror repository'}
            </div>
            {this.props.onOpenMirrorDialog && (
              <Button
                size="small"
                onClick={this.props.onOpenMirrorDialog}
                disabled={this.state.isSubmitting}
              >
                <Octicon symbol={octicons.repo} />
                Mirror repository…
              </Button>
            )}
          </div>
          <p className="mirror-section-description">
            Mirroring pushes all branches, tags, and commits to a secondary
            repository using <code>git push --mirror</code>.
          </p>
          {mirrorRemote && (
            <div className="mirror-remote-card">
              <Row>
                <Checkbox
                  label="Automatically push mirror when pushing repository"
                  value={
                    this.props.autoSyncMirror
                      ? CheckboxValue.On
                      : CheckboxValue.Off
                  }
                  onChange={this.onAutoSyncChanged}
                />
              </Row>
              {this.props.onPushMirrorNow && (
                <Row>
                  <Button
                    size="small"
                    onClick={this.onPushMirror}
                    disabled={this.state.isSubmitting}
                  >
                    <Octicon symbol={syncClockwise} />
                    Push mirror now
                  </Button>
                </Row>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
}
