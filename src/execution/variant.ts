import { runPythonAlgorithm } from './pythonWorker'
import type { PythonAlgorithm, PythonExecution } from './pythonWorker'

/** A step exactly as Python recorded it. A faulty variant may record anything. */
export type RawStep = Record<string, unknown>

export type VariantStatus =
  /** Returned normally (the result may still be wrong). */
  | 'finished'
  /** Raised an exception or returned something that is not `(índice, steps)`. */
  | 'crashed'
  /** Was stopped because it would not end. */
  | 'endless'

export interface VariantRun {
  /** What the correct algorithm did with the same input. */
  expected: { index: number; steps: RawStep[] }
  actual: { status: VariantStatus; index: number | null; steps: RawStep[]; message: string | null }
}

function steps(value: unknown): RawStep[] | null {
  if (!Array.isArray(value)) return null
  return value.filter((step): step is RawStep => !!step && typeof step === 'object' && !Array.isArray(step))
}

// Deliberately lenient: unlike a lab run, the variant's steps are not validated
// against the algorithm's contract, because breaking it is what is being shown.
export function decodeVariantRun(json: string): VariantRun {
  const value = JSON.parse(json) as { expected?: Record<string, unknown>; actual?: Record<string, unknown> } | null
  const expectedSteps = steps(value?.expected?.steps)
  const actualSteps = steps(value?.actual?.steps)
  const status = value?.actual?.status
  if (
    !expectedSteps || !actualSteps
    || !Number.isInteger(value?.expected?.index)
    || (status !== 'finished' && status !== 'crashed' && status !== 'endless')
  ) {
    throw new Error('Python devolvió una ejecución de variante inválida.')
  }
  const { index, message } = value!.actual!
  return {
    expected: { index: value!.expected!.index as number, steps: expectedSteps },
    actual: {
      status,
      index: Number.isInteger(index) ? index as number : null,
      steps: actualSteps,
      message: typeof message === 'string' ? message : null,
    },
  }
}

export function runVariant(
  algorithm: PythonAlgorithm,
  source: string,
  numbers: number[],
  target: number
): PythonExecution<VariantRun> {
  return runPythonAlgorithm({ kind: 'variant', algorithm, source, numbers, target }, decodeVariantRun)
}
