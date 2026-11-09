import binarySearchSource from '../../python/algorithms/searching/binary_search.py?raw'
import linearSearchSource from '../../python/algorithms/searching/linear_search.py?raw'
import type { PythonAlgorithm, WorkerRequest, WorkerResponse } from './pythonWorker'

interface PythonRuntime {
  globals: { set: (name: string, value: string) => void }
  runPythonAsync: (code: string) => Promise<string>
}

const indexURL = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'

// The original files, unchanged. The function called has the same name as the file.
const sources: Record<PythonAlgorithm, string> = {
  binary_search: binarySearchSource,
  linear_search: linearSearchSource,
}

// Module workers keep both WebAssembly initialization and Python off the UI thread.
self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    const source = sources[data.algorithm]
    if (!source) throw new Error(`Algoritmo desconocido: ${data.algorithm}`)
    const moduleURL = `${indexURL}pyodide.mjs`
    const { loadPyodide } = await import(/* @vite-ignore */ moduleURL) as {
      loadPyodide: (options: { indexURL: string }) => Promise<PythonRuntime>
    }
    const python = await loadPyodide({ indexURL })
    python.globals.set('_algorithm_name', data.algorithm)
    python.globals.set('_algorithm_source', source)
    python.globals.set('_request_json', JSON.stringify({ numbers: data.numbers, target: data.target }))
    const json = await python.runPythonAsync(`
import contextlib
import io
import json

# Execute the complete, original file in its own namespace. Its example prints
# are captured so stdout is never used as the application protocol.
_namespace = {"__name__": f"algorithm_lab_{_algorithm_name}"}
with contextlib.redirect_stdout(io.StringIO()):
    exec(compile(_algorithm_source, f"{_algorithm_name}.py", "exec"), _namespace)
_request = json.loads(_request_json)
json.dumps(_namespace[_algorithm_name](_request["numbers"], _request["target"]))
`)
    self.postMessage({ ok: true, json } satisfies WorkerResponse)
  } catch (error) {
    self.postMessage({
      ok: false,
      error: `No se pudo ejecutar Python. Comprueba la conexión y vuelve a intentar. ${error instanceof Error ? error.message : String(error)}`,
    } satisfies WorkerResponse)
  }
}
