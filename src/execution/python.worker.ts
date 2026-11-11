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

// Executes each complete, original file in its own namespace. Example prints
// are captured so stdout is never used as the application protocol.
const loadAlgorithms = `
import contextlib
import io
import json

_functions = {}
for _name, _source in json.loads(_sources_json).items():
    _namespace = {"__name__": f"algorithm_lab_{_name}"}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(compile(_source, f"{_name}.py", "exec"), _namespace)
    _functions[_name] = _namespace[_name]
_request = json.loads(_request_json)
`

const runOnce = `${loadAlgorithms}
json.dumps(_functions[_request["algorithm"]](_request["numbers"], _request["target"]))
`

// Measurement harness: it only builds inputs and counts the steps each
// algorithm records. A step counts as a comparison unless it is "not_found".
const measure = `${loadAlgorithms}
import random

def _comparisons(result):
    return sum(1 for step in result[1] if step.get("action") != "not_found")

_report = {}
for _name, _function in _functions.items():
    _points = []
    for _n in _request["sizes"]:
        _numbers = list(range(_n))
        _random = random.Random(_n)
        _present = [_comparisons(_function(_numbers, _random.randrange(_n))) for _ in range(_request["trials"])] if _n else [0]
        _points.append({
            "n": _n,
            # Target larger than every element: the search runs out of candidates.
            "absent": _comparisons(_function(_numbers, _n)),
            # Mean over random targets that are in the list.
            "present": sum(_present) / len(_present),
        })
    _report[_name] = _points
json.dumps(_report)
`

// Runs a deliberately faulty variant next to the correct algorithm. The variant
// is traced so an endless loop is cut short, and whatever steps it recorded
// before crashing or being stopped are recovered from its own frames.
const runVariant = `${loadAlgorithms}
import sys

_LINE_BUDGET = 50000
_MAX_STEPS = 300

class _Stopped(BaseException):
    pass

def _recorded_steps(error):
    found = []
    trace = error.__traceback__
    while trace is not None:
        candidate = trace.tb_frame.f_locals.get("steps")
        if isinstance(candidate, list):
            found = candidate
        trace = trace.tb_next
    return found

def _clean(steps):
    return [step for step in steps if isinstance(step, dict)][:_MAX_STEPS]

def _run_variant(name, source, numbers, target):
    outcome = {"status": "finished", "index": None, "steps": [], "message": None}
    remaining = [_LINE_BUDGET]

    def tracer(frame, event, arg):
        if event == "line":
            remaining[0] -= 1
            if remaining[0] < 0:
                raise _Stopped()
        return tracer

    try:
        namespace = {"__name__": f"algorithm_lab_variant_{name}"}
        sys.settrace(tracer)
        with contextlib.redirect_stdout(io.StringIO()):
            exec(compile(source, f"{name}_variant.py", "exec"), namespace)
            result = namespace[name](list(numbers), target)
        sys.settrace(None)
        if not isinstance(result, (tuple, list)) or len(result) != 2 or not isinstance(result[1], list):
            outcome["status"] = "crashed"
            outcome["message"] = "No devolvió (índice, steps)."
        else:
            outcome["index"] = result[0] if isinstance(result[0], int) else None
            outcome["steps"] = _clean(result[1])
    except _Stopped as error:
        sys.settrace(None)
        outcome["status"] = "endless"
        outcome["steps"] = _clean(_recorded_steps(error))
    except Exception as error:
        sys.settrace(None)
        outcome["status"] = "crashed"
        outcome["message"] = f"{type(error).__name__}: {error}"
        outcome["steps"] = _clean(_recorded_steps(error))
    return outcome

_name = _request["algorithm"]
_expected = _functions[_name](list(_request["numbers"]), _request["target"])
json.dumps({
    "expected": {"index": _expected[0], "steps": _expected[1]},
    "actual": _run_variant(_name, _request["source"], _request["numbers"], _request["target"]),
}, default=str)
`

// Module workers keep both WebAssembly initialization and Python off the UI thread.
self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    const names = data.kind === 'measure' ? data.algorithms : [data.algorithm]
    const selected: Partial<Record<PythonAlgorithm, string>> = {}
    for (const name of names) {
      if (!sources[name]) throw new Error(`Algoritmo desconocido: ${name}`)
      selected[name] = sources[name]
    }
    const moduleURL = `${indexURL}pyodide.mjs`
    const { loadPyodide } = await import(/* @vite-ignore */ moduleURL) as {
      loadPyodide: (options: { indexURL: string }) => Promise<PythonRuntime>
    }
    const python = await loadPyodide({ indexURL })
    python.globals.set('_sources_json', JSON.stringify(selected))
    python.globals.set('_request_json', JSON.stringify(data))
    const program = data.kind === 'measure' ? measure : data.kind === 'variant' ? runVariant : runOnce
    const json = await python.runPythonAsync(program)
    self.postMessage({ ok: true, json } satisfies WorkerResponse)
  } catch (error) {
    self.postMessage({
      ok: false,
      error: `No se pudo ejecutar Python. Comprueba la conexión y vuelve a intentar. ${error instanceof Error ? error.message : String(error)}`,
    } satisfies WorkerResponse)
  }
}
