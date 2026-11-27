import * as Path from 'path'

interface IModeEntry {
  readonly load: () => Promise<unknown>
  readonly mime: string
}

const extensionMap: Record<string, IModeEntry> = {
  '.ts': {
    load: () => import('codemirror/mode/javascript/javascript'),
    mime: 'text/typescript',
  },
  '.mts': {
    load: () => import('codemirror/mode/javascript/javascript'),
    mime: 'text/typescript',
  },
  '.cts': {
    load: () => import('codemirror/mode/javascript/javascript'),
    mime: 'text/typescript',
  },
  '.js': {
    load: () => import('codemirror/mode/javascript/javascript'),
    mime: 'text/javascript',
  },
  '.mjs': {
    load: () => import('codemirror/mode/javascript/javascript'),
    mime: 'text/javascript',
  },
  '.cjs': {
    load: () => import('codemirror/mode/javascript/javascript'),
    mime: 'text/javascript',
  },
  '.json': {
    load: () => import('codemirror/mode/javascript/javascript'),
    mime: 'application/json',
  },
  '.tsx': {
    load: () => import('codemirror/mode/jsx/jsx'),
    mime: 'text/typescript-jsx',
  },
  '.jsx': {
    load: () => import('codemirror/mode/jsx/jsx'),
    mime: 'text/jsx',
  },
  '.html': {
    load: () => import('codemirror/mode/htmlmixed/htmlmixed'),
    mime: 'text/html',
  },
  '.htm': {
    load: () => import('codemirror/mode/htmlmixed/htmlmixed'),
    mime: 'text/html',
  },
  '.css': {
    load: () => import('codemirror/mode/css/css'),
    mime: 'text/css',
  },
  '.scss': {
    load: () => import('codemirror/mode/css/css'),
    mime: 'text/x-scss',
  },
  '.less': {
    load: () => import('codemirror/mode/css/css'),
    mime: 'text/x-less',
  },
  '.md': {
    load: () => import('codemirror/mode/markdown/markdown'),
    mime: 'text/x-markdown',
  },
  '.markdown': {
    load: () => import('codemirror/mode/markdown/markdown'),
    mime: 'text/x-markdown',
  },
  '.yaml': {
    load: () => import('codemirror/mode/yaml/yaml'),
    mime: 'text/yaml',
  },
  '.yml': {
    load: () => import('codemirror/mode/yaml/yaml'),
    mime: 'text/yaml',
  },
  '.xml': {
    load: () => import('codemirror/mode/xml/xml'),
    mime: 'application/xml',
  },
  '.svg': {
    load: () => import('codemirror/mode/xml/xml'),
    mime: 'application/xml',
  },
  '.py': {
    load: () => import('codemirror/mode/python/python'),
    mime: 'text/x-python',
  },
  '.go': {
    load: () => import('codemirror/mode/go/go'),
    mime: 'text/x-go',
  },
  '.rs': {
    load: () => import('codemirror/mode/rust/rust'),
    mime: 'text/x-rustsrc',
  },
  '.java': {
    load: () => import('codemirror/mode/clike/clike'),
    mime: 'text/x-java',
  },
  '.c': {
    load: () => import('codemirror/mode/clike/clike'),
    mime: 'text/x-csrc',
  },
  '.h': {
    load: () => import('codemirror/mode/clike/clike'),
    mime: 'text/x-csrc',
  },
  '.cpp': {
    load: () => import('codemirror/mode/clike/clike'),
    mime: 'text/x-c++src',
  },
  '.hpp': {
    load: () => import('codemirror/mode/clike/clike'),
    mime: 'text/x-c++src',
  },
  '.cs': {
    load: () => import('codemirror/mode/clike/clike'),
    mime: 'text/x-csharp',
  },
  '.sh': {
    load: () => import('codemirror/mode/shell/shell'),
    mime: 'text/x-sh',
  },
  '.bash': {
    load: () => import('codemirror/mode/shell/shell'),
    mime: 'text/x-sh',
  },
  '.ps1': {
    load: () => import('codemirror/mode/powershell/powershell'),
    mime: 'application/x-powershell',
  },
  '.sql': {
    load: () => import('codemirror/mode/sql/sql'),
    mime: 'text/x-sql',
  },
  '.php': {
    load: () => import('codemirror/mode/php/php'),
    mime: 'application/x-httpd-php',
  },
  '.rb': {
    load: () => import('codemirror/mode/ruby/ruby'),
    mime: 'text/x-ruby',
  },
  '.toml': {
    load: () => import('codemirror/mode/toml/toml'),
    mime: 'text/x-toml',
  },
  '.vue': {
    load: () => import('codemirror/mode/vue/vue'),
    mime: 'text/x-vue',
  },
  '.dart': {
    load: () => import('codemirror/mode/dart/dart'),
    mime: 'application/dart',
  },
}

const basenameMap: Record<string, IModeEntry> = {
  dockerfile: {
    load: () => import('codemirror/mode/dockerfile/dockerfile'),
    mime: 'text/x-dockerfile',
  },
}

/**
 * Load the CodeMirror mode for a given file path and return its MIME type,
 * or `null` if no specialized mode is mapped.
 */
export async function loadCodeMirrorMode(
  filePath: string
): Promise<string | null> {
  const base = Path.basename(filePath).toLowerCase()
  const ext = Path.extname(filePath).toLowerCase()
  const entry = basenameMap[base] ?? extensionMap[ext]

  if (!entry) {
    return null
  }

  await entry.load()
  return entry.mime
}
