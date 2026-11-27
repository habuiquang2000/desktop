import assert from 'node:assert'
import { afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import * as React from 'react'

import { Repository } from '../../../src/models/repository'
import type { Dispatcher } from '../../../src/ui/dispatcher'
import { fireEvent, render, screen } from '../../helpers/ui/render'
import { captureClipboardWrites } from '../../helpers/ui/electron'
import { enableTestTimers, resetTestTimers } from '../../helpers/ui/timers'
import type { RepositoryType } from '../../../src/lib/git/rev-parse'

const missingRepoPath = 'D:\\test\\missing-repo'
const repository = new Repository(missingRepoPath, 1, null, true)

const getRepositoryType = mock.fn(
  async (_path: string): Promise<RepositoryType> => ({
    kind: 'missing',
  })
)

before(() => {
  mock.module('../../../src/lib/git/index.ts', {
    namedExports: {
      getRepositoryType,
      addSafeDirectory: async () => {},
    },
  })
})

function createDispatcher() {
  const postError = mock.fn((_error: unknown) => {})
  const refreshRepository = mock.fn(async (_repository: Repository) => {})
  const removeRepository = mock.fn(async () => {})
  const relocateRepository = mock.fn(async () => {})

  return {
    postError,
    refreshRepository,
    removeRepository,
    relocateRepository,
    dispatcher: {
      postError,
      refreshRepository,
      removeRepository,
      relocateRepository,
    } as unknown as Dispatcher,
  }
}

describe('MissingRepository', () => {
  let clipboardCapture: ReturnType<typeof captureClipboardWrites>

  beforeEach(() => {
    enableTestTimers(['setTimeout'])
    clipboardCapture = captureClipboardWrites()
  })

  afterEach(() => {
    clipboardCapture.restore()
    resetTestTimers()
  })

  it('renders copy button and copies the missing repository path', async () => {
    const { MissingRepository } = await import(
      '../../../src/ui/missing-repository'
    )
    const dispatcher = createDispatcher()

    render(
      <MissingRepository
        dispatcher={dispatcher.dispatcher}
        repository={repository}
      />
    )

    const copyButton = await screen.findByRole('button', {
      name: 'Copy path',
    })

    fireEvent.click(copyButton)

    assert.deepEqual(clipboardCapture.writes, [missingRepoPath])
  })
})
