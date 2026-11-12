import type { ArrayItem } from '../components/ArrayVisualization'
import type { PythonAlgorithm } from '../execution/pythonWorker'
import type { ChallengeRun, RawStep } from '../execution/challenge'

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
  /** With this input the faulty copy behaves exactly like the correct algorithm. */
  | { kind: 'none' }

function sameStep(algorithm: PythonAlgorithm, a: RawStep, b: RawStep | undefined) {
  return !!b && stepKeys[algorithm].every((key) => (a[key] ?? null) === (b[key] ?? null))
}

// The answer comes from comparing two recorded Python runs, never from
// re-running the search in TypeScript.
export function findFault(algorithm: PythonAlgorithm, { expected, actual }: Pick<ChallengeRun, 'expected' | 'actual'>): Fault {
  const differs = actual.steps.findIndex((step, index) => !sameStep(algorithm, step, expected.steps[index]))
  if (differs !== -1) return { kind: 'step', position: differs + 1 }
  const endsWrong = actual.status !== 'finished'
    || actual.steps.length < expected.steps.length
    || actual.index !== expected.index
  return endsWrong ? { kind: 'end' } : { kind: 'none' }
}

// A run that never ends is cut by Python after hundreds of steps, almost all of
// them the same few repeated. Keeps the steps up to two rounds of that
// repetition (and never fewer than needed to show the fault).
export function condenseEndless<T extends Pick<ChallengeRun, 'expected' | 'actual'>>(algorithm: PythonAlgorithm, run: T): T {
  const steps = run.actual.steps
  if (run.actual.status !== 'endless') return run
  for (let period = 1; period <= 8; period++) {
    let start = steps.length - period
    while (start > 0 && sameStep(algorithm, steps[start - 1], steps[start - 1 + period])) start--
    if (start < 0 || steps.length - start < period * 3) continue
    const fault = findFault(algorithm, run)
    const keep = Math.max(start + period * 2, fault.kind === 'step' ? fault.position : 0)
    return keep < steps.length ? { ...run, actual: { ...run.actual, steps: steps.slice(0, keep) } } : run
  }
  return run
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

export function describeOutcome({ status, index, message }: ChallengeRun['actual']) {
  if (status === 'endless') return 'No termina: seguiría repitiendo pasos sin fin, así que la ejecución se cortó.'
  if (status === 'crashed') return `Se detiene con un error: ${message ?? 'desconocido'}`
  return `Devuelve ${index ?? 'un valor que no es un índice'}.`
}

const integer = (value: unknown): number | null => Number.isInteger(value) ? value as number : null

// Projects whatever the faulty copy recorded onto the list. Values out of range are
// simply not drawn; the step text still shows them as recorded.
export function getFaultySnapshot(algorithm: PythonAlgorithm, numbers: number[], steps: RawStep[], position: number) {
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

/** Algorithms that only work on a sorted list. */
export const needsSorted: PythonAlgorithm[] = ['binary_search']

// Input data only: a random list and the targets Python may choose from
// (every value in the list, plus values around and between them that are absent).
export function makeChallengeData(algorithm: PythonAlgorithm, random: () => number = Math.random) {
  const sorted = needsSorted.includes(algorithm)
  const size = 6 + Math.floor(random() * 6)
  const pool = new Set<number>()
  while (pool.size < size) pool.add(Math.floor(random() * 90) + 5)
  const numbers = [...pool]
  if (sorted) numbers.sort((a, b) => a - b)
  const absent = [0, 99, ...numbers.map((value) => value + 1)].filter((value) => !pool.has(value))
  return { numbers, targets: [...numbers, ...absent], sorted, seed: Math.floor(random() * 2 ** 31) }
}

/** What went wrong, in terms of the two recorded runs. */
export function explainFault(algorithm: PythonAlgorithm, run: Pick<ChallengeRun, 'expected' | 'actual'>, fault: Fault) {
  if (fault.kind === 'none') {
    return 'Con estos datos esta versión hace lo mismo que la correcta. El fallo sigue escondido.'
  }
  if (fault.kind === 'step') {
    const correct = run.expected.steps[fault.position - 1]
    return `El primer paso incorrecto es el ${fault.position}: registró «${describeStep(algorithm, run.actual.steps[fault.position - 1])}». `
      + (correct ? `La versión correcta registra «${describeStep(algorithm, correct)}».` : 'La versión correcta ya había terminado.')
  }
  const next = run.expected.steps[run.actual.steps.length]
  return 'Los pasos registrados son correctos, pero el final no. '
    + (next
      ? `La versión correcta continúa con «${describeStep(algorithm, next)}».`
      : `La versión correcta devuelve ${run.expected.index}.`)
}
