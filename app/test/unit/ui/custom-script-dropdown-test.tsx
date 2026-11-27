import assert from 'node:assert'
import { describe, it, beforeEach } from 'node:test'
import * as React from 'react'
import { CustomScriptDropdown } from '../../../src/ui/toolbar/custom-script-dropdown'
import { fireEvent, render, screen } from '../../helpers/ui/render'
import { Repository } from '../../../src/models/repository'
import { Dispatcher } from '../../../src/ui/dispatcher'
import {
  saveCustomScript,
  setHotScriptId,
  ICustomProjectScript,
} from '../../../src/lib/custom-scripts'

describe('CustomScriptDropdown toolbar component', () => {
  const repository = new Repository(
    'test-custom-script-ui-repo',
    8888,
    null,
    false
  )

  beforeEach(() => {
    localStorage.clear()
  })

  it('renders toolbar hot button with default Run Script when no scripts configured', () => {
    const dispatcher = {} as Dispatcher

    render(
      <CustomScriptDropdown
        dispatcher={dispatcher}
        repository={repository}
        isOpen={false}
        onDropDownStateChanged={() => {}}
        enableFocusTrap={false}
      />
    )

    const titleElement = screen.getByText('Run Script')
    assert.ok(titleElement)
  })

  it('renders configured hot script name on the toolbar button', () => {
    const script: ICustomProjectScript = {
      id: 'hot-build-script',
      name: 'Build Prod',
      command: 'npm run build:prod',
      source: 'custom',
    }
    saveCustomScript(repository, script)
    setHotScriptId(repository, script.id)

    const dispatcher = {} as Dispatcher

    render(
      <CustomScriptDropdown
        dispatcher={dispatcher}
        repository={repository}
        isOpen={false}
        onDropDownStateChanged={() => {}}
        enableFocusTrap={false}
      />
    )

    const titleElement = screen.getByText('Build Prod')
    assert.ok(titleElement)
    const descElement = screen.getByText('Hot Script')
    assert.ok(descElement)
  })

  it('runs hot script when the hot button is clicked', async () => {
    const script: ICustomProjectScript = {
      id: 'hot-run-script',
      name: 'Test Fast',
      command: 'npm test',
      source: 'custom',
    }
    saveCustomScript(repository, script)
    setHotScriptId(repository, script.id)

    let executedScript: ICustomProjectScript | null = null
    const dispatcher = {
      runCustomScript: async (_repo: Repository, s: ICustomProjectScript) => {
        executedScript = s
      },
    } as unknown as Dispatcher

    render(
      <CustomScriptDropdown
        dispatcher={dispatcher}
        repository={repository}
        isOpen={false}
        onDropDownStateChanged={() => {}}
        enableFocusTrap={false}
      />
    )

    const button = screen.getByText('Test Fast')
    assert.ok(button)

    fireEvent.click(button)

    const result = executedScript as ICustomProjectScript | null
    assert.ok(result !== null)
    assert.equal(result.name, 'Test Fast')
    assert.equal(result.command, 'npm test')
  })

  it('renders dropdown list with custom scripts and quick run form when open', () => {
    const script: ICustomProjectScript = {
      id: 'script-in-list',
      name: 'Lint Code',
      command: 'npm run lint',
      source: 'custom',
    }
    saveCustomScript(repository, script)

    const dispatcher = {} as Dispatcher

    render(
      <CustomScriptDropdown
        dispatcher={dispatcher}
        repository={repository}
        isOpen={true}
        onDropDownStateChanged={() => {}}
        enableFocusTrap={false}
      />
    )

    const header = screen.getByText('Project Scripts')
    assert.ok(header)

    const scriptItems = screen.getAllByText('Lint Code')
    assert.ok(scriptItems.length > 0)

    const commandTexts = screen.getAllByText('npm run lint')
    assert.ok(commandTexts.length > 0)
  })
})
