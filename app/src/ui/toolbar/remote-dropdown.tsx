import * as React from 'react'
import { Dispatcher } from '../dispatcher'
import { Repository } from '../../models/repository'
import { IRemote } from '../../models/remote'
import { ToolbarDropdown, DropdownState } from './dropdown'
import { FoldoutType } from '../../lib/app-state'
import { Octicon, OcticonSymbol, syncClockwise } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { PopupType } from '../../models/popup'
import { RepositorySettingsTab } from '../repository-settings/repository-settings'
import { showContextualMenu, IMenuItem } from '../../lib/menu-item'
import { clipboard } from 'electron'

interface IRemoteDropdownItemProps {
  readonly remote: IRemote
  readonly isActive: boolean
  readonly isOrigin: boolean
  readonly isSwitching?: boolean
  readonly isTarget?: boolean
  readonly onSelect: (remote: IRemote) => void
}

class RemoteDropdownItem extends React.PureComponent<IRemoteDropdownItemProps> {
  private onClick = () => {
    if (this.props.isSwitching) {
      return
    }
    this.props.onSelect(this.props.remote)
  }

  public render() {
    const { remote, isActive, isOrigin, isSwitching, isTarget } = this.props
    return (
      <button
        className={`remote-dropdown-item ${isActive ? 'is-active' : ''} ${
          isTarget ? 'is-switching' : ''
        }`}
        onClick={this.onClick}
        disabled={isSwitching}
        type="button"
      >
        <div className="remote-dropdown-item-icon">
          {isTarget ? (
            <Octicon className="spin" symbol={syncClockwise} />
          ) : (
            <Octicon symbol={octicons.server} />
          )}
        </div>
        <div className="remote-dropdown-item-info">
          <div className="remote-dropdown-item-name-row">
            <span className="remote-dropdown-item-name">{remote.name}</span>
            {isOrigin && (
              <span className="remote-dropdown-primary-badge">Primary</span>
            )}
          </div>
          <span className="remote-dropdown-item-url">{remote.url}</span>
        </div>
        <div className="remote-dropdown-item-check">
          {isTarget ? (
            <Octicon className="spin" symbol={syncClockwise} />
          ) : isActive ? (
            <Octicon symbol={octicons.check} />
          ) : (
            <span className="remote-dropdown-switch-label">Switch</span>
          )}
        </div>
      </button>
    )
  }
}

interface IRemoteDropdownProps {
  readonly dispatcher: Dispatcher
  readonly repository: Repository
  readonly remote: IRemote | null
  readonly remotes: ReadonlyArray<IRemote>
  readonly isOpen: boolean
  readonly onDropDownStateChanged: (state: DropdownState) => void
  readonly enableFocusTrap: boolean
  readonly isSwitchingRemote?: boolean
  readonly disabled?: boolean
}

interface IRemoteDropdownState {
  readonly isSwitchingRemote: boolean
  readonly targetRemoteName: string | null
  readonly isSyncingFork: boolean
}

export class RemoteDropdown extends React.Component<
  IRemoteDropdownProps,
  IRemoteDropdownState
> {
  private isComponentMounted = false

  public constructor(props: IRemoteDropdownProps) {
    super(props)
    this.state = {
      isSwitchingRemote: false,
      targetRemoteName: null,
      isSyncingFork: false,
    }
  }

  public componentDidMount() {
    this.isComponentMounted = true
  }

  public componentWillUnmount() {
    this.isComponentMounted = false
  }

  public componentDidUpdate(prevProps: IRemoteDropdownProps) {
    if (
      prevProps.isSwitchingRemote &&
      !this.props.isSwitchingRemote &&
      this.state.isSwitchingRemote
    ) {
      this.setState({
        isSwitchingRemote: false,
        targetRemoteName: null,
      })
    }
  }

  private get isSwitching(): boolean {
    return (
      (this.props.isSwitchingRemote ?? false) || this.state.isSwitchingRemote
    )
  }

  private onSelectRemote = async (targetRemote: IRemote) => {
    if (this.props.disabled || this.isSwitching) {
      return
    }

    const { dispatcher, repository, remote } = this.props
    dispatcher.closeFoldout(FoldoutType.Remote)

    if (remote !== null && remote.name === targetRemote.name) {
      return
    }

    this.setState({
      isSwitchingRemote: true,
      targetRemoteName: targetRemote.name,
    })

    try {
      const currentPrimary = remote?.name ?? 'origin'
      await dispatcher.switchRemote(
        repository,
        currentPrimary,
        targetRemote.name
      )
    } finally {
      if (this.isComponentMounted) {
        this.setState({
          isSwitchingRemote: false,
          targetRemoteName: null,
        })
      }
    }
  }

  private onAddRemote = () => {
    if (this.isSwitching) {
      return
    }
    this.props.dispatcher.closeFoldout(FoldoutType.Remote)
    this.props.dispatcher.showPopup({
      type: PopupType.RepositorySettings,
      repository: this.props.repository,
      initialSelectedTab: RepositorySettingsTab.Remote,
    })
  }

  private onRemoteSettings = () => {
    if (this.isSwitching) {
      return
    }
    this.props.dispatcher.closeFoldout(FoldoutType.Remote)
    this.props.dispatcher.showPopup({
      type: PopupType.RepositorySettings,
      repository: this.props.repository,
      initialSelectedTab: RepositorySettingsTab.Remote,
    })
  }

  private onSyncFork = async () => {
    if (this.props.disabled || this.isSwitching || this.state.isSyncingFork) {
      return
    }

    this.props.dispatcher.closeFoldout(FoldoutType.Remote)
    this.setState({ isSyncingFork: true })

    try {
      await this.props.dispatcher.syncForkFromUpstream(this.props.repository)
    } finally {
      if (this.isComponentMounted) {
        this.setState({ isSyncingFork: false })
      }
    }
  }

  private onOpenSyncForkOnGitHub = () => {
    const ghRepo = this.props.repository.gitHubRepository
    if (ghRepo !== null && ghRepo.htmlURL !== null) {
      this.props.dispatcher.closeFoldout(FoldoutType.Remote)
      this.props.dispatcher.openInBrowser(ghRepo.htmlURL)
    }
  }

  private onContextMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (this.props.disabled || this.isSwitching) {
      return
    }

    const { remote, repository, remotes } = this.props
    const items: IMenuItem[] = []

    const hasUpstream =
      remotes.some(r => r.name === 'upstream') ||
      repository.gitHubRepository?.fork === true

    if (hasUpstream) {
      items.push({
        label: __DARWIN__
          ? 'Sync Fork from Upstream'
          : 'Sync fork from upstream',
        action: this.onSyncFork,
      })

      if (repository.gitHubRepository !== null) {
        items.push({
          label: __DARWIN__
            ? 'Open Sync Fork on GitHub'
            : 'Open sync fork on GitHub',
          action: this.onOpenSyncForkOnGitHub,
        })
      }

      items.push({ type: 'separator' })
    }

    if (remote !== null) {
      items.push({
        label: __DARWIN__ ? 'Copy Remote URL' : 'Copy remote URL',
        action: () => {
          clipboard.writeText(remote.url)
        },
      })

      if (repository.gitHubRepository !== null) {
        items.push({
          label: __DARWIN__ ? 'View on GitHub' : 'View on GitHub',
          action: () => {
            this.props.dispatcher.openInBrowser(remote.url)
          },
        })
      }

      items.push({ type: 'separator' })
    }

    items.push({
      label: __DARWIN__ ? 'Repository Settings…' : 'Repository settings…',
      action: () => {
        this.props.dispatcher.showPopup({
          type: PopupType.RepositorySettings,
          repository,
          initialSelectedTab: RepositorySettingsTab.Remote,
        })
      },
    })

    showContextualMenu(items)
  }

  private onDropdownStateChanged = (
    state: DropdownState,
    source: 'keyboard' | 'pointer'
  ) => {
    if (this.isSwitching && state === 'open') {
      return
    }
    this.props.onDropDownStateChanged(state)
  }

  private renderDropdownContent = (): JSX.Element => {
    const { remotes, remote, repository } = this.props
    const activeRemoteName = remote?.name ?? null
    const isSwitching = this.isSwitching
    const isSyncingFork = this.state.isSyncingFork
    const targetRemoteName = this.state.targetRemoteName
    const hasUpstream =
      remotes.some(r => r.name === 'upstream') ||
      repository.gitHubRepository?.fork === true

    return (
      <div className="remote-dropdown-foldout">
        <div className="remote-dropdown-header">
          <span className="remote-dropdown-header-title">
            {__DARWIN__ ? 'Remote Repositories' : 'Remote repositories'}
          </span>
        </div>

        <div className="remote-dropdown-list">
          {remotes.length === 0 ? (
            <div className="remote-dropdown-empty">
              No remote repositories configured
            </div>
          ) : (
            remotes.map(r => (
              <RemoteDropdownItem
                key={r.name}
                remote={r}
                isActive={r.name === activeRemoteName}
                isOrigin={r.name === 'origin'}
                isSwitching={isSwitching}
                isTarget={isSwitching && r.name === targetRemoteName}
                onSelect={this.onSelectRemote}
              />
            ))
          )}
        </div>

        <div className="remote-dropdown-footer">
          {hasUpstream && (
            <button
              className="remote-dropdown-action-item remote-dropdown-sync-fork"
              onClick={this.onSyncFork}
              disabled={isSwitching || isSyncingFork}
              type="button"
            >
              <Octicon
                symbol={syncClockwise}
                className={isSyncingFork ? 'spin' : undefined}
              />
              <span>
                {isSyncingFork
                  ? __DARWIN__
                    ? 'Syncing Fork…'
                    : 'Syncing fork…'
                  : __DARWIN__
                  ? 'Sync Fork from Upstream'
                  : 'Sync fork from upstream'}
              </span>
            </button>
          )}
          <button
            className="remote-dropdown-action-item"
            onClick={this.onAddRemote}
            disabled={isSwitching || isSyncingFork}
            type="button"
          >
            <Octicon symbol={octicons.plus} />
            <span>{__DARWIN__ ? 'Add Remote…' : 'Add remote…'}</span>
          </button>
          <button
            className="remote-dropdown-action-item"
            onClick={this.onRemoteSettings}
            disabled={isSwitching || isSyncingFork}
            type="button"
          >
            <Octicon symbol={octicons.gear} />
            <span>{__DARWIN__ ? 'Remote Settings…' : 'Remote settings…'}</span>
          </button>
        </div>
      </div>
    )
  }

  public render() {
    const { isOpen, enableFocusTrap, remote, disabled } = this.props
    const isSwitching = this.isSwitching
    const targetName = this.state.targetRemoteName
    const currentState: DropdownState =
      isOpen && !isSwitching ? 'open' : 'closed'

    let title =
      remote !== null ? remote.name : __DARWIN__ ? 'No Remote' : 'No remote'
    let description = __DARWIN__ ? 'Current Remote' : 'Current remote'
    let tooltip =
      remote !== null
        ? `${remote.name} (${remote.url})`
        : 'No remote configured for this repository'
    let icon: OcticonSymbol = octicons.server
    let iconClassName: string | undefined = undefined

    if (isSwitching) {
      if (targetName !== null) {
        title = targetName
        tooltip = `Switching remote to ${targetName}…`
      } else {
        tooltip = 'Switching remote…'
      }
      description = __DARWIN__ ? 'Switching Remote…' : 'Switching remote…'
      icon = syncClockwise
      iconClassName = 'spin'
    }

    return (
      <ToolbarDropdown
        className="remote-toolbar-dropdown"
        icon={icon}
        iconClassName={iconClassName}
        title={title}
        description={description}
        tooltip={tooltip}
        onDropdownStateChanged={this.onDropdownStateChanged}
        onContextMenu={this.onContextMenu}
        dropdownContentRenderer={this.renderDropdownContent}
        dropdownState={currentState}
        enableFocusTrap={enableFocusTrap}
        disabled={disabled || isSwitching}
        foldoutStyleOverrides={{
          width: 320,
          maxWidth: '90vw',
          height: 'auto',
          maxHeight: 'calc(100vh - 40px)',
        }}
      />
    )
  }
}
