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

export interface SearchRequest {
  numbers: number[]
  target: number
}

export type SearchResponse =
  | { ok: true; result: SearchResult }
  | { ok: false; error: string }

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

export interface SearchExecution {
  result: Promise<SearchResult>
  dispose: () => void
}

export function executeBinarySearch(numbers: number[], target: number): SearchExecution {
  const worker = new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' })
  let rejectPending: (error: Error) => void
  let settled = false
  const result = new Promise<SearchResult>((resolve, reject) => {
    rejectPending = reject
    worker.onmessage = (event: MessageEvent<SearchResponse>) => {
      settled = true
      worker.terminate()
      const response = event.data
      if ('error' in response) {
        reject(new Error(response.error))
      } else {
        resolve(response.result)
      }
    }
    worker.onerror = () => {
      settled = true
      worker.terminate()
      reject(new Error('No se pudo iniciar Python. Comprueba tu conexión e inténtalo de nuevo.'))
    }
    worker.postMessage({ numbers, target } satisfies SearchRequest)
  })
  return {
    result,
    dispose: () => {
      worker.terminate()
      if (!settled) {
        settled = true
        rejectPending(new Error('Ejecución cancelada.'))
      }
    },
  }
}
