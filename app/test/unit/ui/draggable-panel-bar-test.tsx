import { fireEvent, render, screen } from '../../helpers/ui/render'
import assert from 'node:assert'
import { it } from 'node:test'
import * as React from 'react'
import { DraggablePanelBar } from '../../../src/ui/popout/draggable-panel-bar'

it('renders children and applies can-drag class when onDragOut is provided', () => {
  render(
    <DraggablePanelBar label="Diff" onDragOut={() => {}}>
      <span data-testid="bar-content">Diff Header Title</span>
    </DraggablePanelBar>
  )

  const content = screen.getByTestId('bar-content')
  assert.ok(content)
  const bar = content.parentElement
  assert.ok(bar)
  assert.ok(bar.classList.contains('can-drag'))
  assert.strictEqual(
    bar.getAttribute('aria-label'),
    'Click and drag bar to undock Diff'
  )
})

it('does not allow dragging when onDragOut is missing or disabled is true', () => {
  const { container } = render(
    <DraggablePanelBar label="Sidebar" disabled={true} onDragOut={() => {}}>
      <span>Sidebar Header</span>
    </DraggablePanelBar>
  )

  const bar = container.querySelector('.draggable-panel-bar')
  assert.ok(bar)
  assert.strictEqual(bar.classList.contains('can-drag'), false)
})

it('allows clicking buttons inside the bar without triggering drag-to-detach', () => {
  let buttonClicks = 0
  let dragOutCalls = 0

  render(
    <DraggablePanelBar
      label="Diff"
      onDragOut={() => {
        dragOutCalls++
      }}
    >
      <button
        onClick={() => {
          buttonClicks++
        }}
      >
        Options
      </button>
    </DraggablePanelBar>
  )

  const button = screen.getByRole('button', { name: 'Options' })
  fireEvent.click(button)

  assert.strictEqual(buttonClicks, 1)
  assert.strictEqual(dragOutCalls, 0)
})

it('ignores dragging when initiated inside an input field', () => {
  let dragOutCalls = 0

  render(
    <DraggablePanelBar
      label="Repositories"
      onDragOut={() => {
        dragOutCalls++
      }}
    >
      <input placeholder="Filter repositories" />
    </DraggablePanelBar>
  )

  const input = screen.getByPlaceholderText('Filter repositories')

  fireEvent.mouseDown(input, {
    button: 0,
    clientX: 50,
    clientY: 50,
    screenX: 200,
    screenY: 200,
  })

  fireEvent.mouseMove(document, {
    clientX: 120,
    clientY: 50,
    screenX: 270,
    screenY: 200,
  })

  fireEvent.mouseUp(document)

  assert.strictEqual(dragOutCalls, 0)
})

it('initiates drag and calls onDragOut with screen coordinates when dragged past threshold', () => {
  let detachedCoords: { x?: number; y?: number } = {}

  render(
    <DraggablePanelBar
      label="Diff Panel"
      onDragOut={(x, y) => {
        detachedCoords = { x, y }
      }}
    >
      <div className="title">File Diff</div>
    </DraggablePanelBar>
  )

  const bar = screen.getByText('File Diff').parentElement!

  // Mousedown on bar at client (100, 100), screen (300, 300)
  fireEvent.mouseDown(bar, {
    button: 0,
    clientX: 100,
    clientY: 100,
    screenX: 300,
    screenY: 300,
  })

  // Mouse move 60px (> 45px threshold)
  fireEvent.mouseMove(document, {
    clientX: 160,
    clientY: 100,
    screenX: 360,
    screenY: 300,
  })

  // Check ghost text
  assert.ok(screen.getByText('Release to undock Diff Panel'))

  // Drop
  fireEvent.mouseUp(document)

  assert.strictEqual(detachedCoords.x, 360)
  assert.strictEqual(detachedCoords.y, 300)
})

it('does not detach if dragged less than threshold before mouse up', () => {
  let dragOutCalls = 0

  render(
    <DraggablePanelBar
      label="Sidebar"
      onDragOut={() => {
        dragOutCalls++
      }}
    >
      <div className="title">Sidebar Tabs</div>
    </DraggablePanelBar>
  )

  const bar = screen.getByText('Sidebar Tabs').parentElement!

  fireEvent.mouseDown(bar, {
    button: 0,
    clientX: 100,
    clientY: 100,
    screenX: 300,
    screenY: 300,
  })

  // Moved only 20px (< 45px)
  fireEvent.mouseMove(document, {
    clientX: 120,
    clientY: 100,
    screenX: 320,
    screenY: 300,
  })

  fireEvent.mouseUp(document)

  assert.strictEqual(dragOutCalls, 0)
})
