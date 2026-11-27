import * as React from 'react'
import * as Path from 'path'
import { readFile, writeFile } from 'fs/promises'
import CodeMirror from 'codemirror'

import { Repository } from '../../models/repository'
import { Loading } from '../lib/loading'
import { loadCodeMirrorMode } from './code-editor-modes'

interface ICodeEditorProps {
  readonly repository: Repository
  readonly filePath: string
  readonly onDirtyChange: (isDirty: boolean) => void
  readonly onSaved: () => void
}

interface ICodeEditorState {
  readonly isLoading: boolean
  readonly isSaving: boolean
  readonly error: string | null
  readonly cursorLine: number
  readonly cursorColumn: number
}

/**
 * Inline CodeMirror-based code editor for editing a working directory file
 * directly inside the Changes view.
 */
export class CodeEditor extends React.Component<
  ICodeEditorProps,
  ICodeEditorState
> {
  private hostRef = React.createRef<HTMLDivElement>()
  private editor: CodeMirror.Editor | null = null
  private resizeObserver: ResizeObserver | null = null
  private savedContent = ''
  private lastReportedDirty = false
  private loadGeneration = 0
  private isUnmounted = false

  public constructor(props: ICodeEditorProps) {
    super(props)
    this.state = {
      isLoading: true,
      isSaving: false,
      error: null,
      cursorLine: 1,
      cursorColumn: 1,
    }
  }

  public componentDidMount() {
    this.loadFile()
  }

  public componentDidUpdate(prevProps: ICodeEditorProps) {
    if (
      prevProps.repository.path !== this.props.repository.path ||
      prevProps.filePath !== this.props.filePath
    ) {
      this.destroyEditor()
      this.loadFile()
    }
  }

  public componentWillUnmount() {
    this.isUnmounted = true
    this.destroyEditor()
  }

  public async save(): Promise<void> {
    if (!this.editor || this.state.isSaving || this.state.isLoading) {
      return
    }

    const fullPath = Path.join(this.props.repository.path, this.props.filePath)
    const content = this.editor.getValue()

    this.setState({ isSaving: true, error: null })

    try {
      await writeFile(fullPath, content, 'utf8')
      if (this.isUnmounted) {
        return
      }

      this.savedContent = content
      this.reportDirty(false)
      this.setState({ isSaving: false })
      this.props.onSaved()
    } catch (err) {
      if (this.isUnmounted) {
        return
      }

      const message =
        err instanceof Error ? err.message : 'Unable to save file.'
      this.setState({ isSaving: false, error: message })
    }
  }

  private destroyEditor() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    if (this.editor) {
      const wrapper = this.editor.getWrapperElement()
      wrapper.remove()
      this.editor = null
    }

    this.reportDirty(false)
  }

  private reportDirty(isDirty: boolean) {
    if (this.lastReportedDirty !== isDirty) {
      this.lastReportedDirty = isDirty
      this.props.onDirtyChange(isDirty)
    }
  }

  private async loadFile() {
    const generation = ++this.loadGeneration
    const fullPath = Path.join(this.props.repository.path, this.props.filePath)

    this.setState({ isLoading: true, error: null })

    try {
      const content = await readFile(fullPath, 'utf8')
      if (this.isUnmounted || generation !== this.loadGeneration) {
        return
      }

      this.savedContent = content
      this.setState({ isLoading: false, error: null }, () => {
        if (this.isUnmounted || generation !== this.loadGeneration) {
          return
        }
        this.mountEditor(content, generation)
      })
    } catch (err) {
      if (this.isUnmounted || generation !== this.loadGeneration) {
        return
      }

      const message =
        err instanceof Error ? err.message : 'Unable to read file.'
      this.setState({ isLoading: false, error: message })
    }
  }

  private mountEditor(content: string, generation: number) {
    const host = this.hostRef.current
    if (!host) {
      return
    }

    const saveKey = __DARWIN__ ? 'Cmd-S' : 'Ctrl-S'
    const editor = CodeMirror(host, {
      value: content,
      lineNumbers: true,
      theme: 'default',
      tabSize: 2,
      indentUnit: 2,
      smartIndent: true,
      extraKeys: {
        [saveKey]: () => {
          void this.save()
        },
      },
    })

    editor.on('change', () => {
      const isDirty = editor.getValue() !== this.savedContent
      this.reportDirty(isDirty)
    })

    editor.on('cursorActivity', () => {
      const cursor = editor.getCursor()
      this.setState({
        cursorLine: cursor.line + 1,
        cursorColumn: cursor.ch + 1,
      })
    })

    this.editor = editor

    this.resizeObserver = new ResizeObserver(() => {
      editor.refresh()
    })
    this.resizeObserver.observe(host)

    loadCodeMirrorMode(this.props.filePath)
      .then(mime => {
        if (
          mime &&
          !this.isUnmounted &&
          generation === this.loadGeneration &&
          this.editor === editor
        ) {
          editor.setOption('mode', mime)
        }
      })
      .catch(err => {
        log.warn('Failed to load CodeMirror mode', err)
      })
  }

  public render() {
    const saveShortcut = __DARWIN__ ? 'Cmd+S' : 'Ctrl+S'

    if (this.state.isLoading) {
      return (
        <div className="code-editor-container code-editor-loading">
          <Loading />
          <span>Loading file…</span>
        </div>
      )
    }

    if (this.state.error !== null && !this.editor) {
      return (
        <div className="code-editor-container code-editor-error">
          <p>{this.state.error}</p>
        </div>
      )
    }

    return (
      <div className="code-editor-container">
        {this.state.error !== null && (
          <div className="code-editor-error-banner">{this.state.error}</div>
        )}
        <div className="code-editor-host" ref={this.hostRef} />
        <div className="code-editor-status-bar">
          <span>
            Ln {this.state.cursorLine}, Col {this.state.cursorColumn}
          </span>
          <span>
            {this.state.isSaving ? 'Saving…' : `${saveShortcut} to save`}
          </span>
        </div>
      </div>
    )
  }
}
