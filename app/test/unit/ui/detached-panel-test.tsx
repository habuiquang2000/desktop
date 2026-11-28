import { fireEvent, render, screen } from '../../helpers/ui/render'
import assert from 'node:assert'
import { it } from 'node:test'
import * as React from 'react'
import { DetachedPanel } from '../../../src/ui/popout/detached-panel'

it('renders children inline when isDetached is false', () => {
  render(
    <DetachedPanel
      id="test-panel"
      title="Test Panel"
      isDetached={false}
      onReattach={() => {}}
    >
      <div data-testid="inline-content">Inline Content</div>
    </DetachedPanel>
  )

  assert.ok(screen.getByTestId('inline-content'))
  assert.strictEqual(screen.queryByText('Test Panel is detached'), null)
})

it('renders placeholder and floating panel without creating new windows when isDetached is true', () => {
  let reattachCalled = false

  render(
    <DetachedPanel
      id="diff"
      title="Diff View"
      isDetached={true}
      onReattach={() => {
        reattachCalled = true
      }}
      initialPosition={{ x: 400, y: 300 }}
    >
      <div data-testid="floating-content">Diff Content</div>
    </DetachedPanel>
  )

  // Shows placeholder with re-dock button
  assert.ok(screen.getByText('Diff View is detached'))
  const dockBackButtons = screen.getAllByRole('button', {
    name: /Dock Back/i,
  })
  assert.ok(dockBackButtons.length > 0)

  // Content is rendered inside floating panel
  assert.ok(screen.getByTestId('floating-content'))

  // Clicking dock back triggers onReattach
  fireEvent.click(dockBackButtons[0])
  assert.strictEqual(reattachCalled, true)
})

it('triggers onReattach when Escape key is pressed while detached', () => {
  let reattachCalled = false

  render(
    <DetachedPanel
      id="sidebar"
      title="Repository Sidebar"
      isDetached={true}
      onReattach={() => {
        reattachCalled = true
      }}
    >
      <div>Sidebar Content</div>
    </DetachedPanel>
  )

  fireEvent.keyDown(window, { key: 'Escape' })
  assert.strictEqual(reattachCalled, true)
})

it('triggers onReattach when double clicking floating panel header', () => {
  let reattachCalled = false

  render(
    <DetachedPanel
      id="diff"
      title="Diff View"
      isDetached={true}
      onReattach={() => {
        reattachCalled = true
      }}
    >
      <div>Diff Content</div>
    </DetachedPanel>
  )

  const header = screen.getByLabelText(
    'Floating panel header. Drag to move, double-click to dock back'
  )
  assert.ok(header)
  fireEvent.doubleClick(header)
  assert.strictEqual(reattachCalled, true)
})
