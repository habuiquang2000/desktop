import * as React from 'react'
import { Dispatcher } from '../dispatcher'
import { Repository } from '../../models/repository'
import { IRemote } from '../../models/remote'
import { ToolbarDropdown, DropdownState } from './dropdown'
import { FoldoutType } from '../../lib/app-state'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { PopupType } from '../../models/popup'
import { RepositorySettingsTab } from '../repository-settings/repository-settings'
import { showContextualMenu, IMenuItem } from '../../lib/menu-item'
import { clipboard } from 'electron'

interface IRemoteDropdownItemProps {
  readonly remote: IRemote
  readonly isActive: boolean
  readonly isOrigin: boolean
  readonly onSelect: (remote: IRemote) => void
}

class RemoteDropdownItem extends React.PureComponent<IRemoteDropdownItemProps> {
  private onClick = () => {
    this.props.onSelect(this.props.remote)
  }

  public render() {
    const { remote, isActive, isOrigin } = this.props
    return (
      <button
        className={`remote-dropdown-item ${isActive ? 'is-active' : ''}`}
        onClick={this.onClick}
        type="button"
      >
        <div className="remote-dropdown-item-icon">
          <Octicon symbol={octicons.server} />
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
          {isActive ? (
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
  readonly disabled?: boolean
}

export class RemoteDropdown extends React.Component<IRemoteDropdownProps> {
  private onSelectRemote = async (targetRemote: IRemote) => {
    if (this.props.disabled) {
      return
    }

    const { dispatcher, repository, remote } = this.props
    dispatcher.closeFoldout(FoldoutType.Remote)

    if (remote !== null && remote.name === targetRemote.name) {
      return
    }

    const currentPrimary = remote?.name ?? 'origin'
    await dispatcher.switchRemote(repository, currentPrimary, targetRemote.name)
  }

  private onAddRemote = () => {
    this.props.dispatcher.closeFoldout(FoldoutType.Remote)
    this.props.dispatcher.showPopup({
      type: PopupType.RepositorySettings,
      repository: this.props.repository,
      initialSelectedTab: RepositorySettingsTab.Remote,
    })
  }

  private onRemoteSettings = () => {
    this.props.dispatcher.closeFoldout(FoldoutType.Remote)
    this.props.dispatcher.showPopup({
      type: PopupType.RepositorySettings,
      repository: this.props.repository,
      initialSelectedTab: RepositorySettingsTab.Remote,
    })
  }

  private onContextMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (this.props.disabled) {
      return
    }

    const { remote, repository } = this.props
    const items: IMenuItem[] = []

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

  private renderDropdownContent = (): JSX.Element => {
    const { remotes, remote } = this.props
    const activeRemoteName = remote?.name ?? null

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
                onSelect={this.onSelectRemote}
              />
            ))
          )}
        </div>

        <div className="remote-dropdown-footer">
          <button
            className="remote-dropdown-action-item"
            onClick={this.onAddRemote}
            type="button"
          >
            <Octicon symbol={octicons.plus} />
            <span>{__DARWIN__ ? 'Add Remote…' : 'Add remote…'}</span>
          </button>
          <button
            className="remote-dropdown-action-item"
            onClick={this.onRemoteSettings}
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
    const currentState: DropdownState = isOpen ? 'open' : 'closed'

    const title =
      remote !== null ? remote.name : __DARWIN__ ? 'No Remote' : 'No remote'
    const description = __DARWIN__ ? 'Current Remote' : 'Current remote'
    const tooltip =
      remote !== null
        ? `${remote.name} (${remote.url})`
        : 'No remote configured for this repository'

    return (
      <ToolbarDropdown
        className="remote-toolbar-dropdown"
        icon={octicons.server}
        title={title}
        description={description}
        tooltip={tooltip}
        onDropdownStateChanged={this.props.onDropDownStateChanged}
        onContextMenu={this.onContextMenu}
        dropdownContentRenderer={this.renderDropdownContent}
        dropdownState={currentState}
        enableFocusTrap={enableFocusTrap}
        disabled={disabled}
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
