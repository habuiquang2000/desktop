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

  it('triggers showQuickSearchCommand when Quick Search header button is clicked', () => {
    let quickSearchOpened = false
    const dispatcher = {
      closeFoldout: () => {},
      showQuickSearchCommand: (_repo: Repository) => {
        quickSearchOpened = true
      },
    } as unknown as Dispatcher

    render(
      <CustomScriptDropdown
        dispatcher={dispatcher}
        repository={repository}
        isOpen={true}
        onDropDownStateChanged={() => {}}
        enableFocusTrap={false}
      />
    )

    const searchButton = screen.getByText('Quick Search')
    assert.ok(searchButton)
    fireEvent.click(searchButton)

    assert.equal(quickSearchOpened, true)
  })

  it('filters scripts inside the dropdown search bar', () => {
    const s1: ICustomProjectScript = {
      id: 'script-alpha',
      name: 'Alpha Build',
      command: 'npm run alpha',
      source: 'custom',
    }
    const s2: ICustomProjectScript = {
      id: 'script-beta',
      name: 'Beta Test',
      command: 'npm run beta',
      source: 'custom',
    }
    saveCustomScript(repository, s1)
    saveCustomScript(repository, s2)

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

    const list = document.querySelector('.custom-script-dropdown-list')!
    assert.ok(list.textContent?.includes('Alpha Build'))
    assert.ok(list.textContent?.includes('Beta Test'))

    const searchInput = screen.getByPlaceholderText(
      'Search scripts or type command to run (↵)...'
    )
    fireEvent.change(searchInput, { target: { value: 'beta' } })

    assert.equal(list.textContent?.includes('Alpha Build'), false)
    assert.ok(list.textContent?.includes('Beta Test'))
  })

  it('renders responsive header action buttons with header-btn-text spans', () => {
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

    const btnTexts = document.querySelectorAll(
      '.custom-script-header-btn .header-btn-text'
    )
    assert.equal(btnTexts.length, 3)
    const labels = Array.from(btnTexts).map(el => el.textContent)
    assert.deepEqual(labels, ['Quick Search', 'Add', 'Logs'])
  })
})
