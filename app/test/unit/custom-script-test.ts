import assert from 'node:assert'
import { describe, it, beforeEach } from 'node:test'
import * as Path from 'path'
import * as Os from 'os'
import * as Fs from 'fs/promises'
import { Repository } from '../../src/models/repository'
import {
  ICustomProjectScript,
  getCustomScripts,
  saveCustomScript,
  deleteCustomScript,
  getHotScriptId,
  setHotScriptId,
  discoverProjectScripts,
  CustomScriptRunner,
} from '../../src/lib/custom-scripts'

describe('Custom Scripts model, storage and runner', () => {
  const repository = new Repository(process.cwd(), 9999, null, false)

  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and retrieves custom scripts from localStorage', () => {
    assert.deepEqual(getCustomScripts(repository), [])

    const script: ICustomProjectScript = {
      id: 'custom-1',
      name: 'Build Dev',
      command: 'npm run build:dev',
      source: 'custom',
    }

    saveCustomScript(repository, script)
    const scripts = getCustomScripts(repository)
    assert.equal(scripts.length, 1)
    assert.equal(scripts[0].name, 'Build Dev')
    assert.equal(scripts[0].command, 'npm run build:dev')

    // Update existing script
    const updatedScript: ICustomProjectScript = {
      ...script,
      command: 'npm run build:prod',
    }
    saveCustomScript(repository, updatedScript)
    const updatedList = getCustomScripts(repository)
    assert.equal(updatedList.length, 1)
    assert.equal(updatedList[0].command, 'npm run build:prod')

    // Delete script
    deleteCustomScript(repository, 'custom-1')
    assert.deepEqual(getCustomScripts(repository), [])
  })

  it('manages hot script ID in localStorage', () => {
    assert.equal(getHotScriptId(repository), null)

    setHotScriptId(repository, 'custom-hot-1')
    assert.equal(getHotScriptId(repository), 'custom-hot-1')

    setHotScriptId(repository, null)
    assert.equal(getHotScriptId(repository), null)
  })

  it('auto-discovers npm scripts from package.json with strict npm usage', async () => {
    const tempDir = await Fs.mkdtemp(
      Path.join(Os.tmpdir(), 'desktop-test-scripts-')
    )
    try {
      const packageJson = {
        name: 'test-app',
        scripts: {
          test: 'mocha',
          dev: 'nodemon index.js',
          build: 'tsc',
        },
      }
      await Fs.writeFile(
        Path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson)
      )

      const discovered = await discoverProjectScripts(tempDir)
      assert.equal(discovered.length, 3)

      const testScript = discovered.find(s => s.name === 'test')
      assert.ok(testScript)
      assert.equal(testScript.command, 'npm run test')
      assert.equal(testScript.source, 'package.json')

      const devScript = discovered.find(s => s.name === 'dev')
      assert.ok(devScript)
      assert.equal(devScript.command, 'npm run dev')
    } finally {
      await Fs.rm(tempDir, { recursive: true, force: true })
    }
  })

  it('auto-discovers script files in scripts/ directory', async () => {
    const tempDir = await Fs.mkdtemp(
      Path.join(Os.tmpdir(), 'desktop-test-scripts-files-')
    )
    const scriptsDir = Path.join(tempDir, 'scripts')
    await Fs.mkdir(scriptsDir, { recursive: true })

    try {
      await Fs.writeFile(
        Path.join(scriptsDir, 'deploy.sh'),
        '#!/bin/bash\necho deploy'
      )
      await Fs.writeFile(Path.join(scriptsDir, 'setup.py'), 'print("setup")')

      const discovered = await discoverProjectScripts(tempDir)
      assert.ok(discovered.length >= 2)

      const shScript = discovered.find(s => s.name === 'deploy.sh')
      assert.ok(shScript)
      assert.equal(shScript.source, 'file')

      const pyScript = discovered.find(s => s.name === 'setup.py')
      assert.ok(pyScript)
      assert.equal(pyScript.source, 'file')
    } finally {
      await Fs.rm(tempDir, { recursive: true, force: true })
    }
  })

  it('executes a script and captures output via CustomScriptRunner', async () => {
    const runner = CustomScriptRunner.getInstance()
    const script: ICustomProjectScript = {
      id: 'test-run-1',
      name: 'Echo Test',
      command: 'node -e "console.log(\'CUSTOM_SCRIPT_OUTPUT_OK\')"',
      source: 'custom',
    }

    let finishedState: any = null
    const disposable = runner.onExecutionChanged((_repoKey, state) => {
      if (state && (state.status === 'success' || state.status === 'failed')) {
        finishedState = state
      }
    })

    await runner.run(repository, script)

    // Wait briefly for process completion
    for (let i = 0; i < 40; i++) {
      if (finishedState) {
        break
      }
      await new Promise(r => setTimeout(r, 100))
    }

    disposable.dispose()

    assert.ok(finishedState, 'Script should have finished execution')
    if (finishedState.status !== 'success') {
      console.log('Test execution output:', finishedState.output)
    }
    assert.equal(finishedState.status, 'success')
    assert.equal(finishedState.exitCode, 0)
    assert.ok(
      finishedState.output.some((line: string) =>
        line.includes('CUSTOM_SCRIPT_OUTPUT_OK')
      ),
      'Output should contain CUSTOM_SCRIPT_OUTPUT_OK'
    )
  })
})
