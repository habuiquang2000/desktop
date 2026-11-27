export const NUM_PALETTE_COLORS = 8
export const MAX_GRAPH_LANES = 8
export const LANE_WIDTH = 16
export const LANE_OFFSET = 10
export const ROW_HEIGHT = 50
export const NODE_RADIUS = 4
export const MERGE_NODE_RADIUS = 5

export interface ICommitGraphLine {
  readonly fromLane: number
  readonly toLane: number
  readonly colorIndex: number
}

export interface ICommitGraphRow {
  readonly sha: string
  /** Lane index (0-based) where the commit node dot is placed */
  readonly lane: number
  /** Color index for this commit node */
  readonly colorIndex: number
  /** Whether this commit is a merge commit (has >= 2 parents) */
  readonly isMerge: boolean
  /** Whether this commit has no parents */
  readonly isRoot: boolean
  /** Active lanes passing through this row without connecting to this node */
  readonly passThroughLanes: ReadonlyArray<{
    readonly lane: number
    readonly colorIndex: number
  }>
  /** Lines entering the row from the top and connecting to the commit node */
  readonly incomingLines: ReadonlyArray<ICommitGraphLine>
  /** Lines exiting the commit node and connecting to the bottom of the row */
  readonly outgoingLines: ReadonlyArray<ICommitGraphLine>
}

export interface ICommitGraph {
  readonly rows: Map<string, ICommitGraphRow>
  readonly maxLanes: number
}

export interface ICommitLike {
  readonly parentSHAs: ReadonlyArray<string>
}

/** Get the horizontal pixel center for a given lane index. */
export function getLaneX(lane: number): number {
  const clampedLane = Math.max(0, Math.min(MAX_GRAPH_LANES - 1, lane))
  return LANE_OFFSET + clampedLane * LANE_WIDTH + LANE_WIDTH / 2
}

/** Get the total SVG width needed for the graph given maxLanes. */
export function getGraphWidth(maxLanes: number): number {
  const clampedLanes = Math.max(1, Math.min(MAX_GRAPH_LANES, maxLanes))
  return LANE_OFFSET + clampedLanes * LANE_WIDTH + 4
}

/**
 * Computes a visual commit DAG tree layout for the provided list of commits.
 * Returns an ICommitGraph containing row-by-row rendering instructions.
 */
export function computeCommitGraph(
  commitSHAs: ReadonlyArray<string>,
  commitLookup: Map<string, ICommitLike>
): ICommitGraph {
  const rows = new Map<string, ICommitGraphRow>()

  if (commitSHAs.length === 0) {
    return { rows, maxLanes: 1 }
  }

  const allKnownSHAs = new Set(commitSHAs)
  const activeLanes: Array<string | null> = []
  const laneColors: Array<number> = []
  let nextColorIndex = 0
  let maxLanesEver = 1

  for (let i = 0; i < commitSHAs.length; i++) {
    const sha = commitSHAs[i]
    const commit = commitLookup.get(sha)
    const rawParents = commit?.parentSHAs ?? []
    // Filter duplicates while preserving order
    const parentSHAs = Array.from(new Set(rawParents))
    const isMerge = parentSHAs.length > 1
    const isRoot = parentSHAs.length === 0

    // Find all active lanes expecting this commit
    const matchingLanes: number[] = []
    for (let l = 0; l < activeLanes.length; l++) {
      if (activeLanes[l] === sha) {
        matchingLanes.push(l)
      }
    }

    let commitLane: number
    let commitColor: number

    if (matchingLanes.length > 0) {
      commitLane = matchingLanes[0]
      commitColor = laneColors[commitLane]
    } else {
      let emptyIndex = activeLanes.indexOf(null)
      if (emptyIndex === -1) {
        emptyIndex = activeLanes.length
        activeLanes.push(null)
        laneColors.push(0)
      }
      commitLane = emptyIndex
      commitColor = nextColorIndex++ % NUM_PALETTE_COLORS
      laneColors[commitLane] = commitColor
    }

    // Pass-through lanes: active lanes not in matchingLanes and not commitLane
    const passThroughLanes: Array<{ lane: number; colorIndex: number }> = []
    for (let l = 0; l < activeLanes.length; l++) {
      if (
        activeLanes[l] !== null &&
        !matchingLanes.includes(l) &&
        l !== commitLane
      ) {
        passThroughLanes.push({ lane: l, colorIndex: laneColors[l] })
      }
    }

    // Incoming lines: from top of the cell into the commit node
    const incomingLines: ICommitGraphLine[] = []
    for (const l of matchingLanes) {
      incomingLines.push({
        fromLane: l,
        toLane: commitLane,
        colorIndex: laneColors[l],
      })
    }

    // Outgoing lines: from commit node to bottom of the cell
    const outgoingLines: ICommitGraphLine[] = []

    if (isRoot) {
      // Root commit: lane ends here
      activeLanes[commitLane] = null
      for (const l of matchingLanes) {
        if (l !== commitLane) {
          activeLanes[l] = null
        }
      }
    } else {
      // Primary parent
      const p0 = parentSHAs[0]
      let existingLaneForP0 = -1
      for (let l = 0; l < activeLanes.length; l++) {
        if (activeLanes[l] === p0 && !matchingLanes.includes(l)) {
          existingLaneForP0 = l
          break
        }
      }

      if (existingLaneForP0 !== -1) {
        outgoingLines.push({
          fromLane: commitLane,
          toLane: existingLaneForP0,
          colorIndex: commitColor,
        })
        activeLanes[commitLane] = null
      } else {
        outgoingLines.push({
          fromLane: commitLane,
          toLane: commitLane,
          colorIndex: commitColor,
        })
        if (allKnownSHAs.has(p0)) {
          activeLanes[commitLane] = p0
        } else {
          activeLanes[commitLane] = null
        }
      }

      // Secondary parents (merge commits)
      for (let pIdx = 1; pIdx < parentSHAs.length; pIdx++) {
        const pk = parentSHAs[pIdx]
        let existingLane = -1
        for (let l = 0; l < activeLanes.length; l++) {
          if (activeLanes[l] === pk && !matchingLanes.includes(l)) {
            existingLane = l
            break
          }
        }

        if (existingLane !== -1) {
          outgoingLines.push({
            fromLane: commitLane,
            toLane: existingLane,
            colorIndex: laneColors[existingLane],
          })
        } else if (allKnownSHAs.has(pk)) {
          let freeSlot = activeLanes.indexOf(null)
          if (freeSlot === -1) {
            freeSlot = activeLanes.length
            activeLanes.push(null)
            laneColors.push(0)
          }
          activeLanes[freeSlot] = pk
          const newColor = nextColorIndex++ % NUM_PALETTE_COLORS
          laneColors[freeSlot] = newColor
          outgoingLines.push({
            fromLane: commitLane,
            toLane: freeSlot,
            colorIndex: newColor,
          })
        } else {
          // Parent outside known commits: draw branch stub down
          let freeSlot = activeLanes.indexOf(null)
          if (freeSlot === -1) {
            freeSlot = activeLanes.length
            activeLanes.push(null)
            laneColors.push(0)
          }
          const stubColor = nextColorIndex++ % NUM_PALETTE_COLORS
          outgoingLines.push({
            fromLane: commitLane,
            toLane: freeSlot,
            colorIndex: stubColor,
          })
          activeLanes[freeSlot] = null
        }
      }

      // Free remaining matching lanes that converged here
      for (const l of matchingLanes) {
        if (l !== commitLane) {
          activeLanes[l] = null
        }
      }
    }

    // Trim trailing empty lanes
    while (
      activeLanes.length > 0 &&
      activeLanes[activeLanes.length - 1] === null
    ) {
      activeLanes.pop()
      laneColors.pop()
    }

    // Track max lanes used
    maxLanesEver = Math.max(maxLanesEver, activeLanes.length, commitLane + 1)
    for (const l of passThroughLanes) {
      maxLanesEver = Math.max(maxLanesEver, l.lane + 1)
    }
    for (const line of incomingLines) {
      maxLanesEver = Math.max(maxLanesEver, line.fromLane + 1, line.toLane + 1)
    }
    for (const line of outgoingLines) {
      maxLanesEver = Math.max(maxLanesEver, line.fromLane + 1, line.toLane + 1)
    }

    rows.set(sha, {
      sha,
      lane: commitLane,
      colorIndex: commitColor,
      isMerge,
      isRoot,
      passThroughLanes,
      incomingLines,
      outgoingLines,
    })
  }

  return {
    rows,
    maxLanes: Math.min(MAX_GRAPH_LANES, Math.max(1, maxLanesEver)),
  }
}
