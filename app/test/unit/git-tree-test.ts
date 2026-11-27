import { describe, it } from 'node:test'
import { strictEqual, deepStrictEqual } from 'node:assert'
import {
  computeCommitGraph,
  getLaneX,
  getGraphWidth,
  LANE_OFFSET,
  LANE_WIDTH,
  MAX_GRAPH_LANES,
} from '../../src/lib/git-tree'

describe('git-tree', () => {
  describe('geometry helpers', () => {
    it('calculates getLaneX correctly', () => {
      strictEqual(getLaneX(0), LANE_OFFSET + LANE_WIDTH / 2)
      strictEqual(getLaneX(1), LANE_OFFSET + LANE_WIDTH + LANE_WIDTH / 2)
    })

    it('clamps getLaneX within maximum allowed lanes', () => {
      const maxX = getLaneX(MAX_GRAPH_LANES - 1)
      strictEqual(getLaneX(MAX_GRAPH_LANES + 10), maxX)
    })

    it('calculates getGraphWidth correctly', () => {
      strictEqual(getGraphWidth(1), LANE_OFFSET + 1 * LANE_WIDTH + 4)
      strictEqual(getGraphWidth(3), LANE_OFFSET + 3 * LANE_WIDTH + 4)
    })
  })

  describe('computeCommitGraph', () => {
    it('returns empty rows for empty commit array', () => {
      const graph = computeCommitGraph([], new Map())
      strictEqual(graph.rows.size, 0)
      strictEqual(graph.maxLanes, 1)
    })

    it('handles a linear commit history on lane 0', () => {
      // C2 -> C1 -> C0
      const commitLookup = new Map([
        ['c2', { parentSHAs: ['c1'] }],
        ['c1', { parentSHAs: ['c0'] }],
        ['c0', { parentSHAs: [] }],
      ])
      const shas = ['c2', 'c1', 'c0']
      const graph = computeCommitGraph(shas, commitLookup)

      strictEqual(graph.maxLanes, 1)

      const row2 = graph.rows.get('c2')!
      strictEqual(row2.lane, 0)
      strictEqual(row2.incomingLines.length, 0) // tip of branch
      deepStrictEqual(row2.outgoingLines, [
        { fromLane: 0, toLane: 0, colorIndex: row2.colorIndex },
      ])

      const row1 = graph.rows.get('c1')!
      strictEqual(row1.lane, 0)
      strictEqual(row1.incomingLines.length, 1)
      strictEqual(row1.incomingLines[0].fromLane, 0)
      strictEqual(row1.incomingLines[0].toLane, 0)
      deepStrictEqual(row1.outgoingLines, [
        { fromLane: 0, toLane: 0, colorIndex: row1.colorIndex },
      ])

      const row0 = graph.rows.get('c0')!
      strictEqual(row0.lane, 0)
      strictEqual(row0.isRoot, true)
      strictEqual(row0.incomingLines.length, 1)
      strictEqual(row0.outgoingLines.length, 0) // root has no outgoing
    })

    it('handles branching and merging correctly', () => {
      // Merge commit M has parents [C1, B1]
      // B1 has parent C0
      // C1 has parent C0
      // C0 is root
      const commitLookup = new Map([
        ['M', { parentSHAs: ['C1', 'B1'] }],
        ['B1', { parentSHAs: ['C0'] }],
        ['C1', { parentSHAs: ['C0'] }],
        ['C0', { parentSHAs: [] }],
      ])
      const shas = ['M', 'B1', 'C1', 'C0']
      const graph = computeCommitGraph(shas, commitLookup)

      strictEqual(graph.maxLanes, 2)

      const rowM = graph.rows.get('M')!
      strictEqual(rowM.lane, 0)
      strictEqual(rowM.isMerge, true)
      // M branches to C1 on lane 0 and B1 on lane 1
      strictEqual(rowM.outgoingLines.length, 2)
      strictEqual(rowM.outgoingLines[0].toLane, 0)
      strictEqual(rowM.outgoingLines[1].toLane, 1)

      const rowB1 = graph.rows.get('B1')!
      strictEqual(rowB1.lane, 1)
      strictEqual(rowB1.passThroughLanes.length, 1)
      strictEqual(rowB1.passThroughLanes[0].lane, 0) // C1 passing through lane 0

      const rowC1 = graph.rows.get('C1')!
      strictEqual(rowC1.lane, 0)

      const rowC0 = graph.rows.get('C0')!
      strictEqual(rowC0.isRoot, true)
    })

    it('handles parents not present in the visible list without leaking lanes', () => {
      const commitLookup = new Map([
        ['tip', { parentSHAs: ['unknown-parent-sha'] }],
      ])
      const graph = computeCommitGraph(['tip'], commitLookup)

      strictEqual(graph.rows.size, 1)
      const tipRow = graph.rows.get('tip')!
      strictEqual(tipRow.lane, 0)
      strictEqual(tipRow.outgoingLines.length, 1)
      strictEqual(tipRow.outgoingLines[0].toLane, 0)
    })
  })
})
