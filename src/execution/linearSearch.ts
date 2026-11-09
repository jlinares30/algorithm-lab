import { runPythonAlgorithm } from './pythonWorker'
import type { PythonExecution } from './pythonWorker'

// Contract expected from python/algorithms/searching/linear_search.py:
//
//   linear_search(numbers, target) -> (index, steps)
//
// where each step is a dict:
//   {"index": i, "action": "compare"}     numbers[i] was checked and differs
//   {"index": i, "action": "found"}       numbers[i] == target (last step)
//   {"index": None, "action": "not_found"} the list ended without a match (last step)
//
// A "value" key is accepted and ignored: the UI reads values from the input list.

export type LinearSearchAction = 'compare' | 'found' | 'not_found'

export interface LinearSearchEvent {
  index: number | null
  action: LinearSearchAction
}

export interface LinearSearchResult {
  index: number
  events: LinearSearchEvent[]
}

const contractHint =
  'linear_search debe devolver (índice, steps), donde cada paso es {"index": i, "action": "compare" | "found"} '
  + 'y, si no lo encuentra, el último es {"index": None, "action": "not_found"}.'

// JSON is the boundary between Python and the application; no PyProxy escapes.
export function decodeLinearSearchResult(json: string, length: number): LinearSearchResult {
  const value: unknown = JSON.parse(json)
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error(`Python devolvió un resultado inválido. ${contractHint}`)
  }
  const [index, events] = value as [unknown, unknown]
  if (!Number.isInteger(index) || !Array.isArray(events) || events.length === 0) {
    throw new Error(`Python devolvió un resultado sin pasos válidos. ${contractHint}`)
  }
  const decoded: LinearSearchEvent[] = events.map((event: unknown, position) => {
    const step = event as { index?: unknown; action?: unknown } | null
    const action = step?.action
    const isLast = position === events.length - 1
    const validIndex = Number.isInteger(step?.index) && (step!.index as number) >= 0 && (step!.index as number) < length
    const valid = action === 'not_found'
      ? step!.index === null && isLast
      : (action === 'compare' || (action === 'found' && isLast)) && validIndex
    if (!valid) {
      throw new Error(`Python devolvió un paso no reconocido (paso ${position + 1}). ${contractHint}`)
    }
    return { index: step!.index as number | null, action: action as LinearSearchAction }
  })
  const last = decoded[decoded.length - 1]
  const expected = last.action === 'found' ? last.index : -1
  if (last.action === 'compare' || index !== expected) {
    throw new Error(`El índice devuelto (${index}) no coincide con el último paso. ${contractHint}`)
  }
  return { index: index as number, events: decoded }
}

export type LinearSearchExecution = PythonExecution<LinearSearchResult>

export function executeLinearSearch(numbers: number[], target: number): LinearSearchExecution {
  return runPythonAlgorithm(
    { algorithm: 'linear_search', numbers, target },
    (json) => decodeLinearSearchResult(json, numbers.length)
  )
}
