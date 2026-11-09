import { runPythonAlgorithm } from './pythonWorker'
import type { PythonExecution } from './pythonWorker'

export type SearchAction = 'move_left' | 'move_right' | 'found' | 'not_found'

export interface SearchEvent {
  left: number
  mid: number | null
  right: number
  action: SearchAction
}

export interface SearchResult {
  index: number
  events: SearchEvent[]
}

// JSON is the boundary between Python and the application; no PyProxy escapes.
export function decodeSearchResult(json: string): SearchResult {
  const value: unknown = JSON.parse(json)
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error('Python devolvió un resultado inválido.')
  }
  const [index, events] = value
  if (!Number.isInteger(index) || !Array.isArray(events) || events.length === 0) {
    throw new Error('Python devolvió un resultado sin eventos válidos.')
  }
  for (const event of events) {
    if (!event || !Number.isInteger(event.left) || !Number.isInteger(event.right)
      || !['move_left', 'move_right', 'found', 'not_found'].includes(event.action)
      || (event.action === 'not_found' ? event.mid !== null : !Number.isInteger(event.mid))) {
      throw new Error('Python devolvió un evento no reconocido.')
    }
  }
  return { index, events }
}

export type SearchExecution = PythonExecution<SearchResult>

export function executeBinarySearch(numbers: number[], target: number): SearchExecution {
  return runPythonAlgorithm({ algorithm: 'binary_search', numbers, target }, decodeSearchResult)
}
