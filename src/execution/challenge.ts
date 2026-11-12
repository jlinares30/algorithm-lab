import { runPythonAlgorithm } from './pythonWorker'
import type { Mutation, PythonAlgorithm, PythonExecution } from './pythonWorker'

/** A step exactly as Python recorded it. A faulty copy may record anything. */
export type RawStep = Record<string, unknown>

export type FaultyStatus =
  /** Returned normally (the result may still be wrong). */
  | 'finished'
  /** Raised an exception or returned something that is not `(índice, steps)`. */
  | 'crashed'
  /** Was stopped because it would not end. */
  | 'endless'

export interface ChallengeRun {
  /** The change that was made; shown only after the visitor answers. */
  mutation: Mutation
  target: number
  /** What the correct algorithm did with the same input. */
  expected: { index: number; steps: RawStep[] }
  actual: { status: FaultyStatus; index: number | null; steps: RawStep[]; message: string | null }
}

function steps(value: unknown): RawStep[] | null {
  if (!Array.isArray(value)) return null
  return value.filter((step): step is RawStep => !!step && typeof step === 'object' && !Array.isArray(step))
}

// Deliberately lenient: unlike a lab run, the faulty copy's steps are not
// validated against the algorithm's contract, because breaking it is the point.
export function decodeChallengeRun(json: string): ChallengeRun {
  const value = JSON.parse(json) as Record<string, Record<string, unknown> | undefined> | null
  const { mutation, expected, actual } = value ?? {}
  const expectedSteps = steps(expected?.steps)
  const actualSteps = steps(actual?.steps)
  const status = actual?.status
  if (
    !expectedSteps || !actualSteps
    || !Number.isInteger(expected?.index)
    || !Number.isInteger(value?.target)
    || (status !== 'finished' && status !== 'crashed' && status !== 'endless')
    || !Number.isInteger(mutation?.line)
    || typeof mutation?.original !== 'string' || typeof mutation?.mutated !== 'string' || typeof mutation?.source !== 'string'
  ) {
    throw new Error('Python devolvió un reto inválido.')
  }
  return {
    mutation: mutation as unknown as Mutation,
    target: value!.target as unknown as number,
    expected: { index: expected!.index as number, steps: expectedSteps },
    actual: {
      status,
      index: Number.isInteger(actual!.index) ? actual!.index as number : null,
      steps: actualSteps,
      message: typeof actual!.message === 'string' ? actual!.message : null,
    },
  }
}

export interface ChallengeInput {
  algorithm: PythonAlgorithm
  numbers: number[]
  targets: number[]
  sorted: boolean
  seed: number
  mutation?: Mutation
}

export function runChallenge(input: ChallengeInput): PythonExecution<ChallengeRun> {
  return runPythonAlgorithm({ kind: 'challenge', ...input }, decodeChallengeRun)
}
