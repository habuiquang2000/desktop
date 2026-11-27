import assert from 'node:assert'
import { describe, it } from 'node:test'
import * as React from 'react'

import { Remote } from '../../../src/ui/repository-settings/remote'
import { fireEvent, render, screen } from '../../helpers/ui/render'
import { IRemote } from '../../../src/models/remote'

describe('Remote repository settings UI', () => {
  it('renders a single remote with its URL and an Add remote button', () => {
    const remote: IRemote = {
      name: 'origin',
      url: 'https://github.com/desktop/desktop.git',
    }

    render(
      <Remote
        remote={remote}
        remotes={[remote]}
        onRemoteUrlChanged={() => {}}
        onAddRemote={async () => {}}
      />
    )

    const inputs = screen.getAllByRole('textbox')
    assert.equal(inputs.length, 1)
    assert.equal(
      (inputs[0] as HTMLInputElement).value,
      'https://github.com/desktop/desktop.git'
    )

    const addButton = screen.getByRole('button', { name: /Add remote/i })
    assert.ok(addButton)
  })

  it('shows add remote form when Add remote button is clicked', () => {
    const remote: IRemote = {
      name: 'origin',
      url: 'https://github.com/desktop/desktop.git',
    }

    render(
      <Remote
        remote={remote}
        remotes={[remote]}
        onRemoteUrlChanged={() => {}}
        onAddRemote={async () => {}}
      />
    )

    const addButton = screen.getByRole('button', { name: /Add remote/i })
    fireEvent.click(addButton)

    const nameInput = screen.getByLabelText(/Remote name/i)
    const urlInput = screen.getByLabelText(/Remote URL/i)
    assert.ok(nameInput)
    assert.ok(urlInput)
  })

  it('calls onAddRemote when valid name and url are entered', async () => {
    const remote: IRemote = {
      name: 'origin',
      url: 'https://github.com/desktop/desktop.git',
    }

    let addedName = ''
    let addedUrl = ''
    const onAddRemote = async (name: string, url: string) => {
      addedName = name
      addedUrl = url
    }

    render(
      <Remote
        remote={remote}
        remotes={[remote]}
        onRemoteUrlChanged={() => {}}
        onAddRemote={onAddRemote}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Add remote/i }))

    const nameInput = screen.getByLabelText(/Remote name/i)
    const urlInput = screen.getByLabelText(/Remote URL/i)

    fireEvent.change(nameInput, { target: { value: 'upstream' } })
    fireEvent.change(urlInput, {
      target: { value: 'https://github.com/other/desktop.git' },
    })

    const submitAddButton = screen.getByRole('button', { name: 'Add' })
    fireEvent.click(submitAddButton)

    assert.equal(addedName, 'upstream')
    assert.equal(addedUrl, 'https://github.com/other/desktop.git')
  })

  it('renders switch remote buttons when multiple remotes exist and calls onSwitchRemote', async () => {
    const origin: IRemote = {
      name: 'origin',
      url: 'https://github.com/desktop/desktop.git',
    }
    const upstream: IRemote = {
      name: 'upstream',
      url: 'https://github.com/fork/desktop.git',
    }

    let switchedTarget = ''
    const onSwitchRemote = async (target: string) => {
      switchedTarget = target
    }

    render(
      <Remote
        remote={origin}
        remotes={[origin, upstream]}
        onRemoteUrlChanged={() => {}}
        onSwitchRemote={onSwitchRemote}
      />
    )

    const switchButtons = screen.getAllByRole('button', {
      name: /Switch remote/i,
    })
    assert.ok(switchButtons.length >= 1)

    fireEvent.click(switchButtons[0])
    assert.equal(switchedTarget, 'upstream')
  })

  it('calls onRemoveRemote when remove button is clicked', async () => {
    const origin: IRemote = {
      name: 'origin',
      url: 'https://github.com/desktop/desktop.git',
    }
    const upstream: IRemote = {
      name: 'upstream',
      url: 'https://github.com/fork/desktop.git',
    }

    let removedTarget = ''
    const onRemoveRemote = async (name: string) => {
      removedTarget = name
    }

    render(
      <Remote
        remote={origin}
        remotes={[origin, upstream]}
        onRemoteUrlChanged={() => {}}
        onRemoveRemote={onRemoveRemote}
      />
    )

    const removeButton = screen.getByRole('button', { name: /Remove remote/i })
    assert.ok(removeButton)

    fireEvent.click(removeButton)
    assert.equal(removedTarget, 'upstream')
  })
})
