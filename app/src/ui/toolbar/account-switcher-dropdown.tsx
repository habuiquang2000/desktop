import * as React from 'react'
import { Dispatcher } from '../dispatcher'
import { Account, getFriendlyEndpoint } from '../../models/account'
import { Repository } from '../../models/repository'
import { ToolbarDropdown, DropdownState } from './dropdown'
import { FoldoutType } from '../../lib/app-state'
import { Avatar } from '../lib/avatar'
import { IAvatarUser } from '../../models/avatar'
import { lookupPreferredEmail } from '../../lib/email'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { PopupType } from '../../models/popup'
import { PreferencesTab } from '../../models/preferences'
import { RepositorySettingsTab } from '../repository-settings/repository-settings'
import { IRemote } from '../../models/remote'
import { getRemotes } from '../../lib/git/remote'
import classNames from 'classnames'

interface IAccountSwitcherDropdownProps {
  readonly dispatcher: Dispatcher
  readonly accounts: ReadonlyArray<Account>
  readonly activeAccount: Account | null
  readonly isOpen: boolean
  readonly onDropDownStateChanged: (state: DropdownState) => void
  readonly enableFocusTrap: boolean
  readonly currentRepository: Repository | null
  /** Optional pre-loaded remotes. If omitted, remotes are loaded asynchronously. */
  readonly remotes?: ReadonlyArray<IRemote>
}

interface IAccountSwitcherDropdownState {
  readonly showAddAccountOptions: boolean
  readonly showAccountsList: boolean
  readonly remotes: ReadonlyArray<IRemote>
  readonly isLoadingRemotes: boolean
  readonly isSwitchingRemote: boolean
}

interface IAccountRowProps {
  readonly account: Account
  readonly isActive: boolean
  readonly accounts: ReadonlyArray<Account>
  readonly onSelectAccount: (account: Account) => void
}

class AccountRow extends React.Component<IAccountRowProps> {
  private onClick = () => {
    this.props.onSelectAccount(this.props.account)
  }

  private onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this.props.onSelectAccount(this.props.account)
    }
  }

  public render() {
    const { account, isActive, accounts } = this.props
    const avatarUser: IAvatarUser = {
      avatarURL: account.avatarURL,
      email: lookupPreferredEmail(account),
      name: account.name,
      endpoint: account.endpoint,
    }

    const rowClasses = classNames('account-switcher-row', {
      'is-active': isActive,
    })

    return (
      <div
        className={rowClasses}
        onClick={this.onClick}
        onKeyDown={this.onKeyDown}
        role="button"
        tabIndex={0}
      >
        <Avatar accounts={accounts} user={avatarUser} size={28} />
        <div className="account-info">
          <div className="account-name-row">
            <span className="account-login">@{account.login}</span>
            {account.name.length > 0 && (
              <span className="account-friendly-name">({account.name})</span>
            )}
          </div>
          <div className="account-endpoint-row">
            <span className="account-endpoint">
              {getFriendlyEndpoint(account.endpoint)}
            </span>
          </div>
        </div>
        {isActive && (
          <Octicon className="active-icon" symbol={octicons.check} />
        )}
      </div>
    )
  }
}

interface IRemoteRowProps {
  readonly remote: IRemote
  readonly isPrimary: boolean
  readonly isSwitching: boolean
  readonly onSelectRemote: (name: string) => void
}

class RemoteRow extends React.Component<IRemoteRowProps> {
  private onClick = () => {
    if (!this.props.isPrimary && !this.props.isSwitching) {
      this.props.onSelectRemote(this.props.remote.name)
    }
  }

  private onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!this.props.isPrimary && !this.props.isSwitching) {
        this.props.onSelectRemote(this.props.remote.name)
      }
    }
  }

  public render() {
    const { remote, isPrimary, isSwitching } = this.props
    const rowClasses = classNames('remote-switcher-row', {
      'is-active': isPrimary,
      'is-switching': isSwitching,
    })

    return (
      <div
        className={rowClasses}
        onClick={this.onClick}
        onKeyDown={this.onKeyDown}
        role="button"
        tabIndex={0}
        aria-label={
          isPrimary
            ? `Primary remote: ${remote.name}`
            : `Switch primary remote to ${remote.name}`
        }
      >
        <div className="remote-row-main">
          <div className="remote-name-row">
            <span className="remote-name">{remote.name}</span>
            <span className="remote-type-tag">(fetch, push)</span>
            {isPrimary && <span className="remote-badge primary">Primary</span>}
          </div>
          <div className="remote-url-row">
            <span className="remote-url">{remote.url}</span>
          </div>
        </div>
        {isPrimary && (
          <Octicon className="active-icon" symbol={octicons.check} />
        )}
      </div>
    )
  }
}

export class AccountSwitcherDropdown extends React.Component<
  IAccountSwitcherDropdownProps,
  IAccountSwitcherDropdownState
> {
  private isComponentMounted = false

  public constructor(props: IAccountSwitcherDropdownProps) {
    super(props)
    this.state = {
      showAddAccountOptions: false,
      showAccountsList: false,
      remotes: props.remotes ?? [],
      isLoadingRemotes: false,
      isSwitchingRemote: false,
    }
  }

  public componentDidMount() {
    this.isComponentMounted = true
    if (this.props.remotes !== undefined) {
      this.setState({ remotes: this.props.remotes, isLoadingRemotes: false })
    } else {
      this.loadRemotes(this.props.currentRepository)
    }
  }

  public componentWillUnmount() {
    this.isComponentMounted = false
  }

  public componentDidUpdate(prevProps: IAccountSwitcherDropdownProps) {
    if (this.props.remotes !== undefined) {
      if (this.props.remotes !== prevProps.remotes) {
        this.setState({ remotes: this.props.remotes, isLoadingRemotes: false })
      }
    } else if (
      prevProps.currentRepository !== this.props.currentRepository ||
      (!prevProps.isOpen && this.props.isOpen)
    ) {
      this.loadRemotes(this.props.currentRepository)
    }
  }

  private loadRemotes = async (repository: Repository | null) => {
    if (this.props.remotes !== undefined) {
      if (this.isComponentMounted) {
        this.setState({ remotes: this.props.remotes, isLoadingRemotes: false })
      }
      return
    }

    if (repository === null) {
      if (this.isComponentMounted) {
        this.setState({ remotes: [], isLoadingRemotes: false })
      }
      return
    }

    if (this.isComponentMounted) {
      this.setState({ isLoadingRemotes: true })
    }

    try {
      const remotes = await getRemotes(repository)
      if (
        this.isComponentMounted &&
        this.props.currentRepository?.path === repository.path
      ) {
        this.setState({ remotes, isLoadingRemotes: false })
      }
    } catch {
      if (
        this.isComponentMounted &&
        this.props.currentRepository?.path === repository.path
      ) {
        this.setState({ remotes: [], isLoadingRemotes: false })
      }
    }
  }

  private onSelectAccount = (account: Account) => {
    this.props.dispatcher.switchActiveAccount(account)
    if (this.isComponentMounted) {
      this.setState({ showAccountsList: false })
    }
  }

  private onSelectRemote = async (targetRemoteName: string) => {
    const { currentRepository } = this.props
    if (currentRepository === null) {
      return
    }

    const primaryRemote =
      this.state.remotes.find(r => r.name === 'origin') ??
      (this.state.remotes.length > 0 ? this.state.remotes[0] : null)

    if (primaryRemote && primaryRemote.name === targetRemoteName) {
      return
    }

    const currentPrimaryName = primaryRemote?.name ?? 'origin'
    this.setState({ isSwitchingRemote: true })

    try {
      await this.props.dispatcher.switchRemote(
        currentRepository,
        currentPrimaryName,
        targetRemoteName
      )
      await this.loadRemotes(currentRepository)
    } catch (e) {
      this.props.dispatcher.postError(
        e instanceof Error ? e : new Error(String(e))
      )
    } finally {
      if (this.isComponentMounted) {
        this.setState({ isSwitchingRemote: false })
      }
    }
  }

  private onManageRemotes = () => {
    const { currentRepository } = this.props
    this.props.dispatcher.closeFoldout(FoldoutType.AccountSwitcher)
    if (currentRepository !== null) {
      this.props.dispatcher.showPopup({
        type: PopupType.RepositorySettings,
        repository: currentRepository,
        initialSelectedTab: RepositorySettingsTab.Remote,
      })
    }
  }

  private onManageAccounts = () => {
    this.props.dispatcher.closeFoldout(FoldoutType.AccountSwitcher)
    this.props.dispatcher.showPopup({
      type: PopupType.Preferences,
      initialSelectedTab: PreferencesTab.Accounts,
    })
  }

  private onDotComSignIn = () => {
    this.props.dispatcher.closeFoldout(FoldoutType.AccountSwitcher)
    this.props.dispatcher.showDotComSignInDialog()
  }

  private onEnterpriseSignIn = () => {
    this.props.dispatcher.closeFoldout(FoldoutType.AccountSwitcher)
    this.props.dispatcher.showEnterpriseSignInDialog()
  }

  private onSignOutActiveAccount = () => {
    const { activeAccount } = this.props
    if (activeAccount === null) {
      return
    }

    this.props.dispatcher.closeFoldout(FoldoutType.AccountSwitcher)
    this.props.dispatcher.removeAccount(activeAccount)
  }

  private toggleAddAccountOptions = (e: React.MouseEvent) => {
    e.stopPropagation()
    this.setState(prevState => ({
      showAddAccountOptions: !prevState.showAddAccountOptions,
    }))
  }

  private toggleAccountsList = (e: React.MouseEvent) => {
    e.stopPropagation()
    this.setState(prevState => ({
      showAccountsList: !prevState.showAccountsList,
    }))
  }

  private renderAccountRow = (account: Account) => {
    const isActive =
      this.props.activeAccount !== null &&
      this.props.activeAccount.endpoint === account.endpoint &&
      this.props.activeAccount.id === account.id

    return (
      <AccountRow
        key={`${account.endpoint}/${account.login}/${account.id}`}
        account={account}
        isActive={isActive}
        accounts={this.props.accounts}
        onSelectAccount={this.onSelectAccount}
      />
    )
  }

  private renderProfileHeader(): JSX.Element {
    const { activeAccount, accounts } = this.props
    const { showAccountsList } = this.state

    if (activeAccount === null) {
      return (
        <div className="account-switcher-header profile-overview">
          <div className="profile-main-row">
            <div className="title-bar-profile-avatar-wrapper signed-out profile-card-avatar">
              <Octicon symbol={octicons.person} />
            </div>
            <div className="profile-details">
              <span className="profile-name">
                {accounts.length > 0 ? 'Select an account' : 'Not signed in'}
              </span>
              <span className="profile-endpoint">GitHub</span>
            </div>
          </div>
          {accounts.length > 0 && (
            <div className="account-list">
              {accounts.map(this.renderAccountRow)}
            </div>
          )}
        </div>
      )
    }

    const avatarUser: IAvatarUser = {
      avatarURL: activeAccount.avatarURL,
      email: lookupPreferredEmail(activeAccount),
      name: activeAccount.name,
      endpoint: activeAccount.endpoint,
    }

    return (
      <div className="account-switcher-header profile-overview">
        <div className="profile-main-row">
          <div className="title-bar-profile-avatar-wrapper profile-card-avatar">
            <Avatar accounts={accounts} user={avatarUser} size={36} />
          </div>
          <div className="profile-details">
            {activeAccount.name.length > 0 && (
              <span className="profile-name">{activeAccount.name}</span>
            )}
            <span className="profile-login">@{activeAccount.login}</span>
            <span className="profile-endpoint">
              {getFriendlyEndpoint(activeAccount.endpoint)}
            </span>
          </div>
          {accounts.length > 1 && (
            <button
              className="switch-account-toggle-btn"
              onClick={this.toggleAccountsList}
              type="button"
              aria-label="Switch account"
            >
              <span>{accounts.length}</span>
              <Octicon
                symbol={
                  showAccountsList ? octicons.chevronUp : octicons.chevronDown
                }
              />
            </button>
          )}
        </div>

        {showAccountsList && accounts.length > 1 && (
          <div className="account-list">
            {accounts.map(this.renderAccountRow)}
          </div>
        )}
      </div>
    )
  }

  private renderRemotesSection(): JSX.Element {
    const { currentRepository } = this.props
    const { remotes, isLoadingRemotes, isSwitchingRemote } = this.state

    const primaryRemote =
      remotes.find(r => r.name === 'origin') ??
      (remotes.length > 0 ? remotes[0] : null)

    return (
      <div className="remote-switcher-section">
        <div className="remote-section-header">
          <div className="remote-header-title-group">
            <Octicon symbol={octicons.server} />
            <span className="remote-header-title">Select Remote</span>
            <span className="remote-v-badge">remote -v</span>
          </div>
          {currentRepository && (
            <span className="remote-count">
              {remotes.length} {remotes.length === 1 ? 'remote' : 'remotes'}
            </span>
          )}
        </div>

        {currentRepository === null ? (
          <div className="remote-empty-state">No repository opened</div>
        ) : isLoadingRemotes ? (
          <div className="remote-empty-state">Loading remotes…</div>
        ) : remotes.length === 0 ? (
          <div className="remote-empty-state">
            <span>No remotes configured for this repository.</span>
            <button
              className="remote-action-item"
              onClick={this.onManageRemotes}
              type="button"
            >
              <Octicon symbol={octicons.plus} />
              <span>Add remote…</span>
            </button>
          </div>
        ) : (
          <div className="remote-list">
            {remotes.map(remote => (
              <RemoteRow
                key={remote.name}
                remote={remote}
                isPrimary={remote.name === primaryRemote?.name}
                isSwitching={isSwitchingRemote}
                onSelectRemote={this.onSelectRemote}
              />
            ))}
          </div>
        )}

        {currentRepository !== null && remotes.length > 0 && (
          <div className="remote-footer-actions">
            <button
              className="remote-action-link"
              onClick={this.onManageRemotes}
              type="button"
            >
              <Octicon symbol={octicons.gear} />
              <span>Manage remotes…</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  private renderDropdownContent = (): JSX.Element => {
    const { activeAccount } = this.props
    const { showAddAccountOptions } = this.state

    return (
      <div className="account-switcher-foldout">
        {this.renderProfileHeader()}
        {this.renderRemotesSection()}

        <div className="account-switcher-actions">
          <div className="action-button-group">
            <button
              className="account-action-item"
              onClick={this.toggleAddAccountOptions}
              type="button"
            >
              <Octicon symbol={octicons.plus} />
              <span>Add account…</span>
              <Octicon
                className="chevron-icon"
                symbol={
                  showAddAccountOptions
                    ? octicons.chevronUp
                    : octicons.chevronDown
                }
              />
            </button>
            {showAddAccountOptions && (
              <div className="add-account-suboptions">
                <button
                  className="suboption-item"
                  onClick={this.onDotComSignIn}
                  type="button"
                >
                  <Octicon symbol={octicons.markGithub} />
                  <span>GitHub.com</span>
                </button>
                <button
                  className="suboption-item"
                  onClick={this.onEnterpriseSignIn}
                  type="button"
                >
                  <Octicon symbol={octicons.server} />
                  <span>GitHub Enterprise</span>
                </button>
              </div>
            )}
          </div>

          <button
            className="account-action-item"
            onClick={this.onManageAccounts}
            type="button"
          >
            <Octicon symbol={octicons.gear} />
            <span>Manage accounts…</span>
          </button>

          {activeAccount !== null && (
            <button
              className="account-action-item sign-out-action"
              onClick={this.onSignOutActiveAccount}
              type="button"
            >
              <Octicon symbol={octicons.signOut} />
              <span>Sign out of @{activeAccount.login}</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  private renderCircularProfileImage(): JSX.Element {
    const { activeAccount, accounts } = this.props

    if (activeAccount !== null) {
      const avatarUser: IAvatarUser = {
        avatarURL: activeAccount.avatarURL,
        email: lookupPreferredEmail(activeAccount),
        name: activeAccount.name,
        endpoint: activeAccount.endpoint,
      }

      return (
        <div className="title-bar-profile-avatar-wrapper">
          <Avatar
            accounts={accounts}
            user={avatarUser}
            size={22}
            tooltip={false}
          />
        </div>
      )
    }

    return (
      <div className="title-bar-profile-avatar-wrapper signed-out">
        <Octicon symbol={octicons.person} />
      </div>
    )
  }

  public render() {
    const { isOpen, enableFocusTrap, activeAccount } = this.props
    const currentState: DropdownState = isOpen ? 'open' : 'closed'

    const tooltip = isOpen
      ? undefined
      : activeAccount !== null
      ? activeAccount.name.length > 0
        ? `${activeAccount.name} (@${activeAccount.login})`
        : `@${activeAccount.login}`
      : 'Profile and remotes'

    return (
      <ToolbarDropdown
        className="title-bar-profile-dropdown"
        buttonClassName="title-bar-profile-button"
        tooltip={tooltip}
        ariaLabel={tooltip}
        onDropdownStateChanged={this.props.onDropDownStateChanged}
        dropdownContentRenderer={this.renderDropdownContent}
        dropdownState={currentState}
        dropdownHorizontalAlign="right"
        showDisclosureArrow={false}
        enableFocusTrap={enableFocusTrap}
        foldoutStyleOverrides={{
          width: 340,
          maxWidth: '90vw',
          height: 'auto',
          maxHeight: 'calc(100vh - 40px)',
        }}
      >
        {this.renderCircularProfileImage()}
      </ToolbarDropdown>
    )
  }
}
