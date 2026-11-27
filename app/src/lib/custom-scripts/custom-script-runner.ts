import { spawn, ChildProcess } from 'child_process'
import { Repository } from '../../models/repository'
import { ICustomProjectScript, IScriptRunState } from './custom-script'
import { Emitter, Disposable } from 'event-kit'

const MAX_OUTPUT_LINES = 5000

export class CustomScriptRunner {
  private static instance: CustomScriptRunner | null = null

  public static getInstance(): CustomScriptRunner {
    if (!CustomScriptRunner.instance) {
      CustomScriptRunner.instance = new CustomScriptRunner()
    }
    return CustomScriptRunner.instance
  }

  private processes = new Map<string, ChildProcess>()
  private executionStates = new Map<string, IScriptRunState>()
  private emitter = new Emitter()

  private getRepoKey(repository: Repository | string): string {
    return typeof repository === 'string' ? repository : repository.path
  }

  public getExecution(repository: Repository | string): IScriptRunState | null {
    const key = this.getRepoKey(repository)
    return this.executionStates.get(key) || null
  }

  public isRunning(repository: Repository | string): boolean {
    const key = this.getRepoKey(repository)
    return this.processes.has(key)
  }

  public onExecutionChanged(
    callback: (repoKey: string, state: IScriptRunState | null) => void
  ): Disposable {
    return this.emitter.on('execution-changed', ({ repoKey, state }) => {
      callback(repoKey, state)
    })
  }

  public clearOutput(repository: Repository | string): void {
    const key = this.getRepoKey(repository)
    const current = this.executionStates.get(key)
    if (current && current.status !== 'running') {
      this.executionStates.delete(key)
      this.emitter.emit('execution-changed', { repoKey: key, state: null })
    }
  }

  public async run(
    repository: Repository,
    script: ICustomProjectScript
  ): Promise<void> {
    const key = this.getRepoKey(repository)

    // If already running for this repo, do nothing
    if (this.processes.has(key)) {
      log.warn(`A script is already running for repository: ${key}`)
      return
    }

    const startTime = Date.now()
    const workingDirectory = script.workingDirectory || repository.path

    if (script.runInTerminal) {
      this.runInExternalTerminal(repository, script, workingDirectory)
      return
    }

    const isWindows = process.platform === 'win32'
    const shellExec = isWindows
      ? process.env.ComSpec || 'cmd.exe'
      : process.env.SHELL || '/bin/sh'
    const shellArgs = isWindows
      ? ['/d', '/s', '/c', script.command]
      : ['-c', script.command]

    const initialOutput: string[] = [
      `[antigravity] Running: ${script.command}`,
      `[antigravity] Working Directory: ${workingDirectory}`,
      `------------------------------------------------------------`,
    ]

    const state: IScriptRunState = {
      script,
      status: 'running',
      exitCode: null,
      startTime,
      endTime: null,
      output: initialOutput,
    }

    this.executionStates.set(key, state)
    this.emitter.emit('execution-changed', { repoKey: key, state })

    let child: ChildProcess
    try {
      child = spawn(shellExec, shellArgs, {
        cwd: workingDirectory,
        env: {
          ...process.env,
          FORCE_COLOR: '1',
        },
        windowsHide: true,
      })
    } catch (err) {
      const errorMsg = `[antigravity] Failed to spawn process: ${
        err instanceof Error ? err.message : String(err)
      }`
      const failedState: IScriptRunState = {
        script,
        status: 'failed',
        exitCode: -1,
        startTime,
        endTime: Date.now(),
        output: [...initialOutput, errorMsg],
      }
      this.executionStates.set(key, failedState)
      this.emitter.emit('execution-changed', {
        repoKey: key,
        state: failedState,
      })
      return
    }

    this.processes.set(key, child)

    const appendOutput = (text: string) => {
      const current = this.executionStates.get(key)
      if (!current) {
        return
      }

      const rawLines = text.split(/\r?\n/)
      let updatedOutput = [...current.output, ...rawLines]
      if (updatedOutput.length > MAX_OUTPUT_LINES) {
        updatedOutput = updatedOutput.slice(
          updatedOutput.length - MAX_OUTPUT_LINES
        )
      }

      const updatedState: IScriptRunState = {
        ...current,
        output: updatedOutput,
      }
      this.executionStates.set(key, updatedState)
      this.emitter.emit('execution-changed', {
        repoKey: key,
        state: updatedState,
      })
    }

    child.stdout?.on('data', data => {
      appendOutput(data.toString())
    })

    child.stderr?.on('data', data => {
      appendOutput(data.toString())
    })

    child.on('error', err => {
      appendOutput(`[antigravity] Process error: ${err.message}`)
    })

    child.on('close', code => {
      this.processes.delete(key)
      const current = this.executionStates.get(key)
      const endTime = Date.now()
      const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2)

      const finalOutput = [
        ...(current?.output || []),
        `------------------------------------------------------------`,
        `[antigravity] Process finished with exit code ${
          code ?? 0
        } in ${elapsedSeconds}s`,
      ]

      const finalState: IScriptRunState = {
        script,
        status: code === 0 ? 'success' : 'failed',
        exitCode: code ?? 0,
        startTime,
        endTime,
        output: finalOutput,
      }

      this.executionStates.set(key, finalState)
      this.emitter.emit('execution-changed', {
        repoKey: key,
        state: finalState,
      })
    })
  }

  public stop(repository: Repository | string): void {
    const key = this.getRepoKey(repository)
    const child = this.processes.get(key)
    if (!child) {
      return
    }

    try {
      if (process.platform === 'win32' && child.pid) {
        spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'])
      } else if (child.pid) {
        child.kill('SIGTERM')
      }
    } catch (e) {
      log.warn(`Failed to kill process for repository ${key}`, e)
    }

    this.processes.delete(key)
    const current = this.executionStates.get(key)
    if (current && current.status === 'running') {
      const stoppedState: IScriptRunState = {
        ...current,
        status: 'failed',
        exitCode: -1,
        endTime: Date.now(),
        output: [...current.output, `[antigravity] Process stopped by user`],
      }
      this.executionStates.set(key, stoppedState)
      this.emitter.emit('execution-changed', {
        repoKey: key,
        state: stoppedState,
      })
    }
  }

  private runInExternalTerminal(
    repository: Repository,
    script: ICustomProjectScript,
    workingDirectory: string
  ): void {
    const key = this.getRepoKey(repository)
    const isWindows = process.platform === 'win32'

    try {
      if (isWindows) {
        spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', script.command], {
          cwd: workingDirectory,
          shell: true,
          detached: true,
        })
      } else {
        const isMac = process.platform === 'darwin'
        if (isMac) {
          spawn(
            'osascript',
            [
              '-e',
              `tell application "Terminal" to do script "cd '${workingDirectory}' && ${script.command}"`,
            ],
            { detached: true }
          )
        } else {
          spawn(
            'x-terminal-emulator',
            [
              '-e',
              `bash -c "cd '${workingDirectory}' && ${script.command}; exec bash"`,
            ],
            { detached: true }
          )
        }
      }

      const terminalState: IScriptRunState = {
        script,
        status: 'success',
        exitCode: 0,
        startTime: Date.now(),
        endTime: Date.now(),
        output: [
          `[antigravity] Launched script in external terminal: ${script.command}`,
          `[antigravity] Working Directory: ${workingDirectory}`,
        ],
      }
      this.executionStates.set(key, terminalState)
      this.emitter.emit('execution-changed', {
        repoKey: key,
        state: terminalState,
      })
    } catch (err) {
      const errorState: IScriptRunState = {
        script,
        status: 'failed',
        exitCode: -1,
        startTime: Date.now(),
        endTime: Date.now(),
        output: [
          `[antigravity] Failed to launch external terminal: ${
            err instanceof Error ? err.message : String(err)
          }`,
        ],
      }
      this.executionStates.set(key, errorState)
      this.emitter.emit('execution-changed', {
        repoKey: key,
        state: errorState,
      })
    }
  }
}
