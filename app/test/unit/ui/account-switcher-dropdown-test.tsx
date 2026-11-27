import assert from 'node:assert'
import { describe, it } from 'node:test'
import * as React from 'react'

import { AccountSwitcherDropdown } from '../../../src/ui/toolbar/account-switcher-dropdown'
import { TitleBar } from '../../../src/ui/window/title-bar'
import { fireEvent, render, screen } from '../../helpers/ui/render'
import { Account } from '../../../src/models/account'
import { Repository } from '../../../src/models/repository'
import { Dispatcher } from '../../../src/ui/dispatcher'
import { PopupType } from '../../../src/models/popup'
import { RepositorySettingsTab } from '../../../src/ui/repository-settings/repository-settings'

class MockDispatcher {
  public switchRemoteCalls: Array<{
    repository: Repository
    currentPrimaryName: string
    targetRemoteName: string
  }> = []

  public switchedAccounts: Account[] = []
  public popupsShown: any[] = []
  public closedFoldouts: any[] = []

  public switchRemote = async (
    repository: Repository,
    currentPrimaryName: string,
    targetRemoteName: string
  ) => {
    this.switchRemoteCalls.push({
      repository,
      currentPrimaryName,
      targetRemoteName,
    })
  }

  public switchActiveAccount = async (account: Account) => {
    this.switchedAccounts.push(account)
  }

  public showPopup = (popup: any) => {
    this.popupsShown.push(popup)
  }

  public closeFoldout = (foldout: any) => {
    this.closedFoldouts.push(foldout)
  }

  public postError = () => {}
}

function createAccount(login: string, name: string): Account {
  return new Account(
    login,
    'https://api.github.com',
    'token123',
    [],
    'https://avatars.githubusercontent.com/u/12345?v=4',
    12345,
    name
  )
}

describe('AccountSwitcherDropdown UI', () => {
  it('renders circular avatar profile button', () => {
    const account = createAccount('testuser', 'Test User')
    const dispatcher = new MockDispatcher()

    render(
      <AccountSwitcherDropdown
        dispatcher={dispatcher as unknown as Dispatcher}
        accounts={[account]}
        activeAccount={account}
        isOpen={false}
        onDropDownStateChanged={() => {}}
        enableFocusTrap={true}
        currentRepository={null}
      />
    )

    const button = screen.getByRole('button', {
      name: /Test User \(@testuser\)/i,
    })
    assert.ok(button)
    assert.ok(
      button.closest('.title-bar-profile-button') !== null ||
        button.classList.contains('title-bar-profile-button')
    )
  })

  it('renders profile overview and Remotes section with "remote -v" badge when open', () => {
    const account = createAccount('habuiquang2000', 'Bùi Quang Hà')
    const dispatcher = new MockDispatcher()

    render(
      <AccountSwitcherDropdown
        dispatcher={dispatcher as unknown as Dispatcher}
        accounts={[account]}
        activeAccount={account}
        isOpen={true}
        onDropDownStateChanged={() => {}}
        enableFocusTrap={true}
        currentRepository={null}
      />
    )

    // User profile overview
    assert.ok(screen.getByText('Bùi Quang Hà'))
    assert.ok(screen.getByText('@habuiquang2000'))
    assert.ok(screen.getByText('GitHub.com'))

    // Remotes section with "remote -v"
    assert.ok(screen.getByText('Select Remote'))
    assert.ok(screen.getByText('remote -v'))
    assert.ok(screen.getByText('No repository opened'))

    // Actions
    assert.ok(screen.getByText('Manage accounts…'))
    assert.ok(screen.getByText(/Sign out of @habuiquang2000/i))
  })

  it('shows no remotes configured when repository has no remotes and opens manage remotes', async () => {
    const account = createAccount('testuser', 'Test User')
    const dispatcher = new MockDispatcher()
    const repository = new Repository('/path/to/repo', 1, null, false)

    render(
      <AccountSwitcherDropdown
        dispatcher={dispatcher as unknown as Dispatcher}
        accounts={[account]}
        activeAccount={account}
        isOpen={true}
        onDropDownStateChanged={() => {}}
        enableFocusTrap={true}
        currentRepository={repository}
        remotes={[]}
      />
    )

    assert.ok(screen.getByText('Select Remote'))
    assert.ok(screen.getByText('remote -v'))
    assert.ok(
      screen.getByText('No remotes configured for this repository.')
    )

    const addRemoteButton = screen.getByRole('button', {
      name: /Add remote…/i,
    })
    fireEvent.click(addRemoteButton)

    assert.equal(dispatcher.popupsShown.length, 1)
    assert.equal(
      dispatcher.popupsShown[0].type,
      PopupType.RepositorySettings
    )
    assert.equal(
      dispatcher.popupsShown[0].initialSelectedTab,
      RepositorySettingsTab.Remote
    )
  })

  it('renders remotes like "remote -v" and switches remote when clicked', async () => {
    const repository = new Repository('/path/to/repo', 1, null, false)
    const account = createAccount('testuser', 'Test User')
    const dispatcher = new MockDispatcher()

    const remotes = [
      { name: 'origin', url: 'https://github.com/desktop/desktop.git' },
      { name: 'upstream', url: 'https://github.com/upstream/desktop.git' },
    ]

    render(
      <AccountSwitcherDropdown
        dispatcher={dispatcher as unknown as Dispatcher}
        accounts={[account]}
        activeAccount={account}
        isOpen={true}
        onDropDownStateChanged={() => {}}
        enableFocusTrap={true}
        currentRepository={repository}
        remotes={remotes}
      />
    )

    // Check remote names are rendered
    assert.ok(screen.getByText('origin'))
    assert.ok(screen.getByText('upstream'))

    // Check remote -v style elements
    const tags = screen.getAllByText('(fetch, push)')
    assert.equal(tags.length, 2)

    // URLs rendered
    assert.ok(screen.getByText('https://github.com/desktop/desktop.git'))
    assert.ok(screen.getByText('https://github.com/upstream/desktop.git'))

    // Origin is the primary remote
    assert.ok(screen.getByText('Primary'))

    // Click upstream to switch remote
    const upstreamRow = screen.getByRole('button', {
      name: /Switch primary remote to upstream/i,
    })
    fireEvent.click(upstreamRow)

    assert.equal(dispatcher.switchRemoteCalls.length, 1)
    assert.equal(dispatcher.switchRemoteCalls[0].targetRemoteName, 'upstream')
    assert.equal(dispatcher.switchRemoteCalls[0].currentPrimaryName, 'origin')
  })

  it('allows activating account when activeAccount is null and accounts exist', () => {
    const account = createAccount('existinguser', 'Existing User')
    const dispatcher = new MockDispatcher()

    render(
      <AccountSwitcherDropdown
        dispatcher={dispatcher as unknown as Dispatcher}
        accounts={[account]}
        activeAccount={null}
        isOpen={true}
        onDropDownStateChanged={() => {}}
        enableFocusTrap={true}
        currentRepository={null}
      />
    )

    assert.ok(screen.getByText('Select an account'))
    const accountRow = screen.getByRole('button', {
      name: /@existinguser/i,
    })
    fireEvent.click(accountRow)

    assert.equal(dispatcher.switchedAccounts.length, 1)
    assert.equal(dispatcher.switchedAccounts[0].login, 'existinguser')
  })

  it('renders TitleBar with rightElements', () => {
    const { container } = render(
      <TitleBar
        titleBarStyle="dark"
        windowState="normal"
        rightElements={<div data-testid="profile-elem">profile</div>}
      >
        <div data-testid="menubar-elem">menu</div>
      </TitleBar>
    )

    assert.ok(screen.getByTestId('profile-elem'))
    assert.ok(screen.getByTestId('menubar-elem'))
    const appIcon = container.querySelector('.app-icon')
    assert.ok(appIcon !== null)
  })
})
