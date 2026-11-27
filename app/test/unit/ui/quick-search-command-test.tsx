import assert from 'node:assert'
import { describe, it, beforeEach } from 'node:test'
import * as React from 'react'
import { QuickSearchCommandDialog } from '../../../src/ui/custom-scripts/quick-search-command-dialog'
import { fireEvent, render, screen } from '../../helpers/ui/render'
import { Repository } from '../../../src/models/repository'
import { Dispatcher } from '../../../src/ui/dispatcher'
import {
  saveCustomScript,
  ICustomProjectScript,
} from '../../../src/lib/custom-scripts'

describe('QuickSearchCommandDialog component', () => {
  const repository = new Repository(
    'test-quick-search-repo',
    9999,
    null,
    false
  )

  beforeEach(() => {
    localStorage.clear()
  })

  it('renders quick search dialog with search input and scripts', () => {
    const script: ICustomProjectScript = {
      id: 'test-script-1',
      name: 'Run Tests',
      command: 'npm test',
      source: 'custom',
    }
    saveCustomScript(repository, script)

    let dismissed = false
    const dispatcher = {} as Dispatcher

    render(
      <QuickSearchCommandDialog
        repository={repository}
        dispatcher={dispatcher}
        onDismissed={() => {
          dismissed = true
        }}
      />
    )

    const input = screen.getByPlaceholderText(
      'Type script or command to run (e.g. dev, test, build, lint)...'
    )
    assert.ok(input)
    assert.ok(screen.getByText('Run Tests'))
    assert.ok(screen.getByText('npm test'))
    assert.equal(dismissed, false)
  })

  it('filters scripts as user types into search query', () => {
    const script1: ICustomProjectScript = {
      id: 'script-build',
      name: 'Build App',
      command: 'npm run build',
      source: 'custom',
    }
    const script2: ICustomProjectScript = {
      id: 'script-lint',
      name: 'Lint Code',
      command: 'npm run lint',
      source: 'custom',
    }
    saveCustomScript(repository, script1)
    saveCustomScript(repository, script2)

    const dispatcher = {} as Dispatcher

    render(
      <QuickSearchCommandDialog
        repository={repository}
        dispatcher={dispatcher}
        onDismissed={() => {}}
      />
    )

    const input = screen.getByPlaceholderText(
      'Type script or command to run (e.g. dev, test, build, lint)...'
    )

    assert.ok(screen.getByText('Build App'))
    assert.ok(screen.getByText('Lint Code'))

    fireEvent.change(input, { target: { value: 'lint' } })

    assert.equal(screen.queryByText('Build App'), null)
    assert.ok(screen.getByText('Lint Code'))
  })

  it('navigates with ArrowUp and ArrowDown and executes on Enter', async () => {
    const script1: ICustomProjectScript = {
      id: 'script-one',
      name: 'First Script',
      command: 'npm run first',
      source: 'custom',
    }
    const script2: ICustomProjectScript = {
      id: 'script-two',
      name: 'Second Script',
      command: 'npm run second',
      source: 'custom',
    }
    saveCustomScript(repository, script1)
    saveCustomScript(repository, script2)

    let executedScript: ICustomProjectScript | null = null
    let dismissed = false
    const dispatcher = {
      runCustomScript: async (_repo: Repository, s: ICustomProjectScript) => {
        executedScript = s
      },
    } as unknown as Dispatcher

    render(
      <QuickSearchCommandDialog
        repository={repository}
        dispatcher={dispatcher}
        onDismissed={() => {
          dismissed = true
        }}
      />
    )

    const input = screen.getByPlaceholderText(
      'Type script or command to run (e.g. dev, test, build, lint)...'
    )

    // Press ArrowDown to select second item
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    // Press Enter to execute
    fireEvent.keyDown(input, { key: 'Enter' })

    const result = executedScript as ICustomProjectScript | null
    assert.ok(result !== null)
    assert.equal(result.name, 'Second Script')
    assert.equal(result.command, 'npm run second')
    assert.equal(dismissed, true)
  })

  it('runs ad-hoc custom command when query does not match existing scripts', async () => {
    let executedScript: ICustomProjectScript | null = null
    let dismissed = false
    const dispatcher = {
      runCustomScript: async (_repo: Repository, s: ICustomProjectScript) => {
        executedScript = s
      },
    } as unknown as Dispatcher

    render(
      <QuickSearchCommandDialog
        repository={repository}
        dispatcher={dispatcher}
        onDismissed={() => {
          dismissed = true
        }}
      />
    )

    const input = screen.getByPlaceholderText(
      'Type script or command to run (e.g. dev, test, build, lint)...'
    )

    fireEvent.change(input, { target: { value: 'git status -s' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    const result = executedScript as ICustomProjectScript | null
    assert.ok(result !== null)
    assert.equal(result.name, 'git status -s')
    assert.equal(result.command, 'git status -s')
    assert.equal(dismissed, true)
  })

  it('dismisses dialog when Escape is pressed', () => {
    let dismissed = false
    const dispatcher = {} as Dispatcher

    render(
      <QuickSearchCommandDialog
        repository={repository}
        dispatcher={dispatcher}
        onDismissed={() => {
          dismissed = true
        }}
      />
    )

    const input = screen.getByPlaceholderText(
      'Type script or command to run (e.g. dev, test, build, lint)...'
    )

    fireEvent.keyDown(input, { key: 'Escape' })
    assert.equal(dismissed, true)
  })
})
