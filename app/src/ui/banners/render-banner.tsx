import * as React from 'react'

import { assertNever } from '../../lib/fatal-error'

import { Banner, BannerType } from '../../models/banner'

import { Dispatcher } from '../dispatcher'
import { MergeConflictsBanner } from './merge-conflicts-banner'

import { SuccessfulMerge } from './successful-merge'
import { RebaseConflictsBanner } from './rebase-conflicts-banner'
import { SuccessfulRebase } from './successful-rebase'
import { BranchAlreadyUpToDate } from './branch-already-up-to-date-banner'
import { SuccessfulCherryPick } from './successful-cherry-pick'
import { CherryPickConflictsBanner } from './cherry-pick-conflicts-banner'
import { CherryPickUndone } from './cherry-pick-undone'
import { OpenThankYouCard } from './open-thank-you-card'
import { SuccessfulSquash } from './successful-squash'
import { SuccessBanner } from './success-banner'
import { Banner as BannerUI } from './banner'
import { LinkButton } from '../lib/link-button'
import { ConflictsFoundBanner } from './conflicts-found-banner'
import { OSVersionNoLongerSupportedBanner } from './os-version-no-longer-supported-banner'

interface IForkUpdateFailedBannerProps {
  readonly message: string
  readonly url?: string
  readonly dispatcher: Dispatcher
  readonly onDismissed: () => void
}

class ForkUpdateFailedBanner extends React.Component<IForkUpdateFailedBannerProps> {
  private onOpenUrl = () => {
    if (this.props.url) {
      this.props.dispatcher.openInBrowser(this.props.url)
    }
  }

  public render() {
    const { message, url, onDismissed } = this.props
    return (
      <BannerUI key="fork-update-failed" onDismissed={onDismissed}>
        {message}
        {url && (
          <>
            {' '}
            <LinkButton onClick={this.onOpenUrl}>Open on GitHub</LinkButton>
          </>
        )}
      </BannerUI>
    )
  }
}

export function renderBanner(
  banner: Banner,
  dispatcher: Dispatcher,
  onDismissed: () => void
): JSX.Element {
  switch (banner.type) {
    case BannerType.SuccessfulMerge:
      return (
        <SuccessfulMerge
          ourBranch={banner.ourBranch}
          theirBranch={banner.theirBranch}
          onDismissed={onDismissed}
          key={'successful-merge'}
        />
      )
    case BannerType.MergeConflictsFound:
      return (
        <MergeConflictsBanner
          dispatcher={dispatcher}
          ourBranch={banner.ourBranch}
          popup={banner.popup}
          onDismissed={onDismissed}
          key={'merge-conflicts'}
        />
      )
    case BannerType.SuccessfulRebase:
      return (
        <SuccessfulRebase
          targetBranch={banner.targetBranch}
          baseBranch={banner.baseBranch}
          onDismissed={onDismissed}
          key={'successful-rebase'}
        />
      )
    case BannerType.RebaseConflictsFound:
      return (
        <RebaseConflictsBanner
          dispatcher={dispatcher}
          targetBranch={banner.targetBranch}
          onOpenDialog={banner.onOpenDialog}
          onDismissed={onDismissed}
          key={'merge-conflicts'}
        />
      )
    case BannerType.BranchAlreadyUpToDate:
      return (
        <BranchAlreadyUpToDate
          ourBranch={banner.ourBranch}
          theirBranch={banner.theirBranch}
          onDismissed={onDismissed}
          key={'branch-already-up-to-date'}
        />
      )
    case BannerType.SuccessfulCherryPick:
      return (
        <SuccessfulCherryPick
          key="successful-cherry-pick"
          targetBranchName={banner.targetBranchName}
          countCherryPicked={banner.count}
          onDismissed={onDismissed}
          onUndo={banner.onUndo}
        />
      )
    case BannerType.CherryPickConflictsFound:
      return (
        <CherryPickConflictsBanner
          targetBranchName={banner.targetBranchName}
          onOpenConflictsDialog={banner.onOpenConflictsDialog}
          onDismissed={onDismissed}
          key={'cherry-pick-conflicts'}
        />
      )
    case BannerType.CherryPickUndone:
      return (
        <CherryPickUndone
          key="cherry-pick-undone"
          targetBranchName={banner.targetBranchName}
          countCherryPicked={banner.countCherryPicked}
          onDismissed={onDismissed}
        />
      )
    case BannerType.OpenThankYouCard:
      return (
        <OpenThankYouCard
          key="open-thank-you-card"
          emoji={banner.emoji}
          onDismissed={onDismissed}
          onOpenCard={banner.onOpenCard}
          onThrowCardAway={banner.onThrowCardAway}
        />
      )
    case BannerType.SuccessfulSquash:
      return (
        <SuccessfulSquash
          key="successful-squash"
          count={banner.count}
          onDismissed={onDismissed}
          onUndo={banner.onUndo}
        />
      )
    case BannerType.SquashUndone: {
      const pluralized = banner.commitsCount === 1 ? 'commit' : 'commits'
      return (
        <SuccessBanner
          key="squash-undone"
          timeout={5000}
          onDismissed={onDismissed}
        >
          Squash of {banner.commitsCount} {pluralized} undone.
        </SuccessBanner>
      )
    }
    case BannerType.SuccessfulReorder: {
      const pluralized = banner.count === 1 ? 'commit' : 'commits'

      return (
        <SuccessBanner
          key="successful-reorder"
          timeout={15000}
          onDismissed={onDismissed}
          onUndo={banner.onUndo}
        >
          <span>
            Successfully reordered {banner.count} {pluralized}.
          </span>
        </SuccessBanner>
      )
    }
    case BannerType.ReorderUndone: {
      const pluralized = banner.commitsCount === 1 ? 'commit' : 'commits'
      return (
        <SuccessBanner
          key="reorder-undone"
          timeout={5000}
          onDismissed={onDismissed}
        >
          Reorder of {banner.commitsCount} {pluralized} undone.
        </SuccessBanner>
      )
    }
    case BannerType.ConflictsFound:
      return (
        <ConflictsFoundBanner
          operationDescription={banner.operationDescription}
          onOpenConflictsDialog={banner.onOpenConflictsDialog}
          onDismissed={onDismissed}
          key={'conflicts-found'}
        ></ConflictsFoundBanner>
      )
    case BannerType.OSVersionNoLongerSupported:
      return <OSVersionNoLongerSupportedBanner onDismissed={onDismissed} />
    case BannerType.SuccessfulMirror:
      return (
        <SuccessBanner
          key="successful-mirror"
          timeout={5000}
          onDismissed={onDismissed}
        >
          Successfully mirrored repository to{' '}
          <strong>{banner.destinationUrl}</strong>.
        </SuccessBanner>
      )
    case BannerType.SuccessfulForkUpdate:
      return (
        <SuccessBanner
          key="successful-fork-update"
          timeout={5000}
          onDismissed={onDismissed}
        >
          Successfully synced <strong>{banner.branch}</strong> from upstream
          {banner.mergeType && banner.mergeType !== 'none'
            ? ` (${banner.mergeType})`
            : ''}
          .
        </SuccessBanner>
      )
    case BannerType.ForkUpdateFailed:
      return (
        <ForkUpdateFailedBanner
          key="fork-update-failed"
          message={banner.message}
          url={banner.url}
          dispatcher={dispatcher}
          onDismissed={onDismissed}
        />
      )
    default:
      return assertNever(banner, `Unknown popup type: ${banner}`)
  }
}
