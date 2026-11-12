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

/** One change made to an algorithm's source to create a challenge. */
export interface Mutation {
  line: number
  original: string
  mutated: string
  /** Complete source of the changed copy. */
  source: string
}

/** Changes one thing in an algorithm and runs it next to the original. */
export interface ChallengeRequest {
  kind: 'challenge'
  algorithm: PythonAlgorithm
  numbers: number[]
  /** Candidate targets; Python picks one. */
  targets: number[]
  /** Whether the algorithm needs a sorted list. */
  sorted: boolean
  seed: number
  /** Reuses a previous change instead of picking a new one. */
  mutation?: Mutation
}

/** Hides some lines of an algorithm for the learner to write. */
export interface ExerciseRequest {
  kind: 'exercise'
  algorithm: PythonAlgorithm
  seed: number
  /** How many lines to hide. */
  count: number
}

/** Runs the algorithm completed with the learner's lines against the original. */
export interface CheckRequest {
  kind: 'check'
  algorithm: PythonAlgorithm
  /** Text written for each hidden line, by line number. */
  answers: Record<number, string>
  sorted: boolean
  seed: number
}

export type WorkerRequest = RunRequest | MeasureRequest | ChallengeRequest | ExerciseRequest | CheckRequest

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
