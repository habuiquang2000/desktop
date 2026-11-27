import { fireEvent, render, screen } from '../../helpers/ui/render'
import assert from 'node:assert'
import { it } from 'node:test'
import * as React from 'react'
import { DragHandleOut } from '../../../src/ui/popout/drag-handle-out'

it('renders DragHandleOut with label and default tooltip', () => {
  render(<DragHandleOut label="Diff View" onDragOut={() => {}} />)
  const button = screen.getByRole('button', {
    name: 'Click or drag handle out to undock Diff View',
  })
  assert.ok(button)
  assert.ok(screen.getByText('Drag Out'))
})

it('renders in compact mode without text label', () => {
  render(
    <DragHandleOut
      label="Sidebar"
      onDragOut={() => {}}
      compact={true}
      tooltip="Custom tooltip"
    />
  )
  const button = screen.getByRole('button', { name: 'Custom tooltip' })
  assert.ok(button)
  assert.strictEqual(screen.queryByText('Drag Out'), null)
})

it('fires onDragOut when clicked or triggered via keyboard', () => {
  let dragOutCalls = 0
  render(
    <DragHandleOut
      label="Test Panel"
      onDragOut={() => {
        dragOutCalls++
      }}
    />
  )
  const button = screen.getByRole('button')

  fireEvent.click(button)
  assert.strictEqual(dragOutCalls, 1)

  fireEvent.keyDown(button, { key: 'Enter' })
  assert.strictEqual(dragOutCalls, 2)

  fireEvent.keyDown(button, { key: ' ' })
  assert.strictEqual(dragOutCalls, 3)
})

it('fires onDragOut with screen coordinates when dragged past threshold', () => {
  let coords: { x?: number; y?: number } = {}
  render(
    <DragHandleOut
      label="Diff"
      onDragOut={(x, y) => {
        coords = { x, y }
      }}
    />
  )
  const button = screen.getByRole('button')

  // Mouse down at client (100, 100), screen (300, 300)
  fireEvent.mouseDown(button, {
    button: 0,
    clientX: 100,
    clientY: 100,
    screenX: 300,
    screenY: 300,
  })

  // Mouse move by 60px (> 45px threshold) to screen (360, 300)
  fireEvent.mouseMove(document, {
    clientX: 160,
    clientY: 100,
    screenX: 360,
    screenY: 300,
  })

  // Mouse up to drop
  fireEvent.mouseUp(document)

  assert.strictEqual(coords.x, 360)
  assert.strictEqual(coords.y, 300)
})
