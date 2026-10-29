import source from '../../python/algorithms/searching/binary_search.py?raw'
import { decodeSearchResult } from './binarySearch'
import type { SearchRequest, SearchResponse } from './binarySearch'

interface PythonRuntime {
  globals: { set: (name: string, value: string) => void }
  runPythonAsync: (code: string) => Promise<string>
}

const indexURL = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'

// Module workers keep both WebAssembly initialization and Python off the UI thread.
self.onmessage = async ({ data }: MessageEvent<SearchRequest>) => {
  try {
    const moduleURL = `${indexURL}pyodide.mjs`
    const { loadPyodide } = await import(/* @vite-ignore */ moduleURL) as {
      loadPyodide: (options: { indexURL: string }) => Promise<PythonRuntime>
    }
    const python = await loadPyodide({ indexURL })
    python.globals.set('_algorithm_source', source)
    python.globals.set('_request_json', JSON.stringify(data))
    const json = await python.runPythonAsync(`
import contextlib
import io
import json

# Execute the complete, original file in its own namespace. Its example prints
# are captured so stdout is never used as the application protocol.
_namespace = {"__name__": "algorithm_lab_binary_search"}
with contextlib.redirect_stdout(io.StringIO()):
    exec(compile(_algorithm_source, "binary_search.py", "exec"), _namespace)
_request = json.loads(_request_json)
json.dumps(_namespace["binary_search"](_request["numbers"], _request["target"]))
`)
    self.postMessage({ ok: true, result: decodeSearchResult(json) } satisfies SearchResponse)
  } catch (error) {
    self.postMessage({
      ok: false,
      error: `No se pudo ejecutar Python. Comprueba la conexión y vuelve a intentar. ${error instanceof Error ? error.message : String(error)}`,
    } satisfies SearchResponse)
  }
}
