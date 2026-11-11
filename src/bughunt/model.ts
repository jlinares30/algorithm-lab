import type { ArrayItem } from '../components/ArrayVisualization'
import type { PythonAlgorithm } from '../execution/pythonWorker'
import type { RawStep, VariantRun } from '../execution/variant'

// The keys each algorithm's contract defines. Extra keys are ignored, as in the labs.
const stepKeys: Record<PythonAlgorithm, string[]> = {
  binary_search: ['left', 'mid', 'right', 'action'],
  linear_search: ['index', 'action'],
}

/** Where a faulty run first stops matching the correct one. */
export type Fault =
  /** The step at this 1-based position differs from the correct run. */
  | { kind: 'step'; position: number }
  /** Every recorded step matches, but the run ends wrong: early, crashed, endless or with another result. */
  | { kind: 'end' }
  /** With this input the variant behaves exactly like the correct algorithm. */
  | { kind: 'none' }

function sameStep(algorithm: PythonAlgorithm, a: RawStep, b: RawStep | undefined) {
  return !!b && stepKeys[algorithm].every((key) => (a[key] ?? null) === (b[key] ?? null))
}

// The answer comes from comparing two recorded Python runs, never from
// re-running the search in TypeScript.
export function findFault(algorithm: PythonAlgorithm, { expected, actual }: VariantRun): Fault {
  const differs = actual.steps.findIndex((step, index) => !sameStep(algorithm, step, expected.steps[index]))
  if (differs !== -1) return { kind: 'step', position: differs + 1 }
  const endsWrong = actual.status !== 'finished'
    || actual.steps.length < expected.steps.length
    || actual.index !== expected.index
  return endsWrong ? { kind: 'end' } : { kind: 'none' }
}

export function sameFault(a: Fault, b: Fault) {
  return a.kind === b.kind && (a.kind !== 'step' || a.position === (b as { position: number }).position)
}

/** The recorded values of a step, as written by Python. */
export function describeStep(algorithm: PythonAlgorithm, step: RawStep) {
  return stepKeys[algorithm]
    .map((key) => {
      const value = step[key]
      return `${key} ${value === undefined ? '(falta)' : value === null ? '—' : String(value)}`
    })
    .join(' · ')
}

export function describeOutcome({ status, index, message }: VariantRun['actual']) {
  if (status === 'endless') return 'No termina: la ejecución se cortó.'
  if (status === 'crashed') return `Se detiene con un error: ${message ?? 'desconocido'}`
  return `Devuelve ${index ?? 'un valor que no es un índice'}.`
}

const integer = (value: unknown): number | null => Number.isInteger(value) ? value as number : null

// Projects whatever the variant recorded onto the list. Values out of range are
// simply not drawn; the step text still shows them as recorded.
export function getVariantSnapshot(algorithm: PythonAlgorithm, numbers: number[], steps: RawStep[], position: number) {
  const step = steps[Math.min(position, steps.length) - 1] as RawStep | undefined
  const found = step?.action === 'found'
  if (algorithm === 'binary_search') {
    const [left, mid, right] = [integer(step?.left), integer(step?.mid), integer(step?.right)]
    const bounded = left !== null && right !== null
    const items: ArrayItem[] = numbers.map((value, index) => {
      const state = index === mid ? (found ? 'found' : 'mid') : bounded && (index < left || index > right) ? 'discarded' : 'active'
      return { value, index, state, pending: false, markers: [], label: `Índice ${index}: ${value}` }
    })
    return {
      items,
      pointers: step ? [{ label: 'left', index: left }, { label: 'mid', index: mid }, { label: 'right', index: right }] : [],
      range: bounded ? { left: Math.max(0, left), right: Math.min(numbers.length - 1, right) } : null,
    }
  }
  const current = integer(step?.index)
  const seen = new Set(steps.slice(0, Math.max(0, position - 1)).map((previous) => integer(previous.index)))
  const items: ArrayItem[] = numbers.map((value, index) => {
    const state = index === current ? (found ? 'found' : 'mid') : seen.has(index) || step?.action === 'not_found' ? 'discarded' : 'active'
    return { value, index, state, pending: false, markers: [], label: `Índice ${index}: ${value}` }
  })
  return { items, pointers: step ? [{ label: 'i', index: current }] : [], range: null }
}
