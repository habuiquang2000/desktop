import assert from 'node:assert'
import { describe, it } from 'node:test'
import {
  DiffSelection,
  DiffSelectionType,
} from '../../src/models/diff/diff-selection'

describe('DiffSelection', () => {
  it('initializes with All selected', () => {
    const selection = DiffSelection.fromInitialSelection(DiffSelectionType.All)
    assert.strictEqual(selection.getSelectionType(), DiffSelectionType.All)
    assert.strictEqual(selection.isSelected(0), true)
    assert.strictEqual(selection.isSelected(10), true)
  })

  it('initializes with None selected', () => {
    const selection = DiffSelection.fromInitialSelection(DiffSelectionType.None)
    assert.strictEqual(selection.getSelectionType(), DiffSelectionType.None)
    assert.strictEqual(selection.isSelected(0), false)
    assert.strictEqual(selection.isSelected(10), false)
  })

  it('switches to Partial when a line is deselected from All', () => {
    const selection = DiffSelection.fromInitialSelection(
      DiffSelectionType.All
    ).withLineSelection(2, false)

    assert.strictEqual(selection.getSelectionType(), DiffSelectionType.Partial)
    assert.strictEqual(selection.isSelected(0), true)
    assert.strictEqual(selection.isSelected(1), true)
    assert.strictEqual(selection.isSelected(2), false)
  })

  it('switches to Partial when a line is selected from None', () => {
    const selection = DiffSelection.fromInitialSelection(
      DiffSelectionType.None
    ).withLineSelection(5, true)

    assert.strictEqual(selection.getSelectionType(), DiffSelectionType.Partial)
    assert.strictEqual(selection.isSelected(4), false)
    assert.strictEqual(selection.isSelected(5), true)
  })

  it('toggles line selection', () => {
    const selection = DiffSelection.fromInitialSelection(
      DiffSelectionType.None
    ).withToggleLineSelection(1)

    assert.strictEqual(selection.isSelected(1), true)

    const toggledBack = selection.withToggleLineSelection(1)
    assert.strictEqual(toggledBack.isSelected(1), false)
  })

  it('updates selection over a range', () => {
    const selection = DiffSelection.fromInitialSelection(
      DiffSelectionType.None
    ).withRangeSelection(2, 3, true) // selects 2, 3, 4

    assert.strictEqual(selection.isSelected(1), false)
    assert.strictEqual(selection.isSelected(2), true)
    assert.strictEqual(selection.isSelected(3), true)
    assert.strictEqual(selection.isSelected(4), true)
    assert.strictEqual(selection.isSelected(5), false)

    assert.strictEqual(selection.isRangeSelected(2, 3), DiffSelectionType.All)
    assert.strictEqual(
      selection.isRangeSelected(1, 2),
      DiffSelectionType.Partial
    )
    assert.strictEqual(selection.isRangeSelected(5, 2), DiffSelectionType.None)
  })

  it('computes selection type accurately with selectableLines set', () => {
    const selectable = new Set([0, 1])
    let selection = DiffSelection.fromInitialSelection(
      DiffSelectionType.All
    ).withSelectableLines(selectable)

    assert.strictEqual(selection.getSelectionType(), DiffSelectionType.All)

    selection = selection.withLineSelection(0, false)
    assert.strictEqual(selection.getSelectionType(), DiffSelectionType.Partial)

    selection = selection.withLineSelection(1, false)
    assert.strictEqual(selection.getSelectionType(), DiffSelectionType.None)
  })

  it('supports withSelectAll and withSelectNone resets', () => {
    const selection = DiffSelection.fromInitialSelection(
      DiffSelectionType.None
    ).withLineSelection(1, true)

    const all = selection.withSelectAll()
    assert.strictEqual(all.getSelectionType(), DiffSelectionType.All)

    const none = all.withSelectNone()
    assert.strictEqual(none.getSelectionType(), DiffSelectionType.None)
  })
})
