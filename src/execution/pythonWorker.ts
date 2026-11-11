// Shared protocol and client for running a hand-written Python algorithm in a
// dedicated Web Worker. Each run gets its own worker, terminated afterwards.

export type PythonAlgorithm = 'binary_search' | 'linear_search'

export const pythonAlgorithms: PythonAlgorithm[] = ['binary_search', 'linear_search']

/** Runs one algorithm once and returns everything it recorded. */
export interface RunRequest {
  kind?: 'run'
  algorithm: PythonAlgorithm
  numbers: number[]
  target: number
}

/** Runs several algorithms over growing inputs and returns their comparison counts. */
export interface MeasureRequest {
  kind: 'measure'
  algorithms: PythonAlgorithm[]
  sizes: number[]
  trials: number
}

/** Runs a faulty variant and the correct algorithm on the same input. */
export interface VariantRequest {
  kind: 'variant'
  algorithm: PythonAlgorithm
  /** Complete source of the variant file. */
  source: string
  numbers: number[]
  target: number
}

export type WorkerRequest = RunRequest | MeasureRequest | VariantRequest

/** `json` is the algorithm's return value, serialized by Python. */
export type WorkerResponse =
  | { ok: true; json: string }
  | { ok: false; error: string }

export interface PythonExecution<T> {
  result: Promise<T>
  dispose: () => void
}

export function runPythonAlgorithm<T>(
  request: WorkerRequest,
  decode: (json: string) => T
): PythonExecution<T> {
  const worker = new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' })
  let rejectPending: (error: Error) => void
  let settled = false
  const result = new Promise<T>((resolve, reject) => {
    rejectPending = reject
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      settled = true
      worker.terminate()
      const response = event.data
      if ('error' in response) {
        reject(new Error(response.error))
        return
      }
      try {
        resolve(decode(response.json))
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    }
    worker.onerror = () => {
      settled = true
      worker.terminate()
      reject(new Error('No se pudo iniciar Python. Comprueba tu conexión e inténtalo de nuevo.'))
    }
    worker.postMessage(request satisfies WorkerRequest)
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
