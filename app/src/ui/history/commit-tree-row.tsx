import * as React from 'react'
import {
  ICommitGraphRow,
  getLaneX,
  ROW_HEIGHT,
  NODE_RADIUS,
  MERGE_NODE_RADIUS,
} from '../../lib/git-tree'

interface ICommitTreeRowProps {
  readonly graphRow: ICommitGraphRow
  readonly width: number
}

/**
 * Renders the visual Git DAG tree column for a single commit row.
 */
export class CommitTreeRow extends React.PureComponent<ICommitTreeRowProps> {
  public render() {
    const { graphRow, width } = this.props
    const nodeY = ROW_HEIGHT / 2
    const nodeX = getLaneX(graphRow.lane)

    return (
      <svg
        className="git-tree-svg"
        width={width}
        height={ROW_HEIGHT}
        aria-hidden="true"
        focusable="false"
      >
        {/* Pass-through lines */}
        {graphRow.passThroughLanes.map(({ lane, colorIndex }, idx) => {
          const x = getLaneX(lane)
          return (
            <path
              key={`pass-${lane}-${idx}`}
              d={`M ${x} 0 L ${x} ${ROW_HEIGHT}`}
              className={`git-tree-line git-tree-color-${colorIndex}`}
            />
          )
        })}

        {/* Incoming lines */}
        {graphRow.incomingLines.map(({ fromLane, toLane, colorIndex }, idx) => {
          const fromX = getLaneX(fromLane)
          const toX = getLaneX(toLane)
          const d =
            fromLane === toLane
              ? `M ${toX} 0 L ${toX} ${nodeY}`
              : `M ${fromX} 0 C ${fromX} ${nodeY / 2}, ${toX} ${
                  nodeY / 2
                }, ${toX} ${nodeY}`

          return (
            <path
              key={`in-${fromLane}-${toLane}-${idx}`}
              d={d}
              className={`git-tree-line git-tree-color-${colorIndex}`}
            />
          )
        })}

        {/* Outgoing lines */}
        {graphRow.outgoingLines.map(({ fromLane, toLane, colorIndex }, idx) => {
          const fromX = getLaneX(fromLane)
          const toX = getLaneX(toLane)
          const midY = nodeY + (ROW_HEIGHT - nodeY) / 2
          const d =
            fromLane === toLane
              ? `M ${fromX} ${nodeY} L ${fromX} ${ROW_HEIGHT}`
              : `M ${fromX} ${nodeY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${ROW_HEIGHT}`

          return (
            <path
              key={`out-${fromLane}-${toLane}-${idx}`}
              d={d}
              className={`git-tree-line git-tree-color-${colorIndex}`}
            />
          )
        })}

        {/* Commit node dot */}
        {graphRow.isMerge ? (
          <>
            <circle
              cx={nodeX}
              cy={nodeY}
              r={MERGE_NODE_RADIUS}
              className={`git-tree-node git-tree-node-merge git-tree-color-${graphRow.colorIndex}`}
            />
            <circle
              cx={nodeX}
              cy={nodeY}
              r={MERGE_NODE_RADIUS - 2.5}
              className="git-tree-node-inner"
            />
          </>
        ) : (
          <circle
            cx={nodeX}
            cy={nodeY}
            r={NODE_RADIUS}
            className={`git-tree-node git-tree-color-${graphRow.colorIndex}`}
          />
        )}
      </svg>
    )
  }
}
