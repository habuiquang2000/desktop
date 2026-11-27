import assert from 'node:assert'
import { describe, it } from 'node:test'
import * as React from 'react'

import { RemoteDropdown } from '../../../src/ui/toolbar/remote-dropdown'
import { fireEvent, render, screen } from '../../helpers/ui/render'
import { IRemote } from '../../../src/models/remote'
import { Repository } from '../../../src/models/repository'
import { Dispatcher } from '../../../src/ui/dispatcher'
import { PopupType } from '../../../src/models/popup'
import { RepositorySettingsTab } from '../../../src/ui/repository-settings/repository-settings'

describe('RemoteDropdown toolbar component', () => {
  const repository = new Repository('test-path', -1, null, false)
  const origin: IRemote = {
    name: 'origin',
    url: 'https://github.com/desktop/desktop.git',
  }
  const upstream: IRemote = {
    name: 'upstream',
    url: 'https://github.com/fork/desktop.git',
  }

  it('renders toolbar button with active remote name', () => {
    const dispatcher = {} as Dispatcher

    render(
      <RemoteDropdown
        dispatcher={dispatcher}
        repository={repository}
        remote={origin}
        remotes={[origin, upstream]}
        isOpen={false}
        onDropDownStateChanged={() => {}}
        enableFocusTrap={false}
      />
    )

    const titleElement = screen.getByText('origin')
    assert.ok(titleElement)
    const descElement = screen.getByText(/Current remote/i)
    assert.ok(descElement)
  })

  it('renders No remote when no remote is configured', () => {
    const dispatcher = {} as Dispatcher

    render(
      <RemoteDropdown
        dispatcher={dispatcher}
        repository={repository}
        remote={null}
        remotes={[]}
        isOpen={false}
        onDropDownStateChanged={() => {}}
        enableFocusTrap={false}
      />
    )

    const titleElement = screen.getByText(/No remote/i)
    assert.ok(titleElement)
  })

  it('renders list of remotes and switches remote when clicked', async () => {
    let switchedPrimary = ''
    let switchedTarget = ''
    let closedFoldout = false

    const dispatcher = {
      switchRemote: async (
        _repo: Repository,
        primary: string,
        target: string
      ) => {
        switchedPrimary = primary
        switchedTarget = target
      },
      closeFoldout: () => {
        closedFoldout = true
      },
    } as unknown as Dispatcher

    render(
      <RemoteDropdown
        dispatcher={dispatcher}
        repository={repository}
        remote={origin}
        remotes={[origin, upstream]}
        isOpen={true}
        onDropDownStateChanged={() => {}}
        enableFocusTrap={false}
      />
    )

    const upstreamButton = screen.getByText('upstream')
    assert.ok(upstreamButton)

    fireEvent.click(upstreamButton)

    assert.equal(switchedPrimary, 'origin')
    assert.equal(switchedTarget, 'upstream')
    assert.equal(closedFoldout, true)
  })

  it('opens repository settings on Remote tab when Add remote is clicked', () => {
    let shownPopup: any = null

    const dispatcher = {
      showPopup: (popup: any) => {
        shownPopup = popup
      },
      closeFoldout: () => {},
    } as unknown as Dispatcher

    render(
      <RemoteDropdown
        dispatcher={dispatcher}
        repository={repository}
        remote={origin}
        remotes={[origin]}
        isOpen={true}
        onDropDownStateChanged={() => {}}
        enableFocusTrap={false}
      />
    )

    const addRemoteButton = screen.getByText(/Add remote…/i)
    assert.ok(addRemoteButton)

    fireEvent.click(addRemoteButton)

    assert.ok(shownPopup)
    assert.equal(shownPopup.type, PopupType.RepositorySettings)
    assert.equal(shownPopup.initialSelectedTab, RepositorySettingsTab.Remote)
  })

  it('renders loading state when isSwitchingRemote is true', () => {
    const dispatcher = {} as Dispatcher

    render(
      <RemoteDropdown
        dispatcher={dispatcher}
        repository={repository}
        remote={origin}
        remotes={[origin, upstream]}
        isOpen={false}
        onDropDownStateChanged={() => {}}
        enableFocusTrap={false}
        isSwitchingRemote={true}
      />
    )

    const descElement = screen.getByText(/Switching remote/i)
    assert.ok(descElement)

    const button = screen.getByRole('button')
    assert.ok(button)
    assert.equal(button.getAttribute('aria-disabled'), 'true')
  })

  it('does not allow opening dropdown when switching remote', () => {
    let opened = false
    const dispatcher = {} as Dispatcher

    render(
      <RemoteDropdown
        dispatcher={dispatcher}
        repository={repository}
        remote={origin}
        remotes={[origin, upstream]}
        isOpen={false}
        onDropDownStateChanged={state => {
          if (state === 'open') {
            opened = true
          }
        }}
        enableFocusTrap={false}
        isSwitchingRemote={true}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    assert.equal(opened, false)
  })

  it('renders Sync fork from upstream when upstream remote exists and triggers sync', async () => {
    let syncedRepo: Repository | null = null
    let closedFoldout = false

    const dispatcher = {
      syncForkFromUpstream: async (repo: Repository) => {
        syncedRepo = repo
        return true
      },
      closeFoldout: () => {
        closedFoldout = true
      },
    } as unknown as Dispatcher

    render(
      <RemoteDropdown
        dispatcher={dispatcher}
        repository={repository}
        remote={origin}
        remotes={[origin, upstream]}
        isOpen={true}
        onDropDownStateChanged={() => {}}
        enableFocusTrap={false}
      />
    )

    const syncButton = screen.getByText(/Sync fork from upstream/i)
    assert.ok(syncButton)

    fireEvent.click(syncButton)

    assert.equal(syncedRepo, repository)
    assert.equal(closedFoldout, true)
  })

  it('does not render Sync fork button when no upstream exists', () => {
    const dispatcher = {} as Dispatcher

    render(
      <RemoteDropdown
        dispatcher={dispatcher}
        repository={repository}
        remote={origin}
        remotes={[origin]}
        isOpen={true}
        onDropDownStateChanged={() => {}}
        enableFocusTrap={false}
      />
    )

    const syncButton = screen.queryByText(/Sync fork from upstream/i)
    assert.equal(syncButton, null)
  })
})
