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
})
