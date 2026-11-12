import { decodeChallengeRun } from './challenge'
import type { ChallengeRun } from './challenge'
import { runPythonAlgorithm } from './pythonWorker'
import type { PythonAlgorithm, PythonExecution } from './pythonWorker'

/** One line of the algorithm's function. Blank lines are the ones to write. */
export interface ExerciseLine {
  number: number
  /** Leading spaces; kept by the app so only the content is typed. */
  indent: number
  /** Original content. For a blank it is the reference solution. */
  text: string
  blank: boolean
}

export interface Exercise {
  lines: ExerciseLine[]
}

export type CheckResult =
  /** Behaves like the original on every test input. */
  | { status: 'passed'; total: number }
  /** The completed code is not valid Python. */
  | { status: 'syntax'; message: string }
  /** Differs from the original; `case` is one input where it does. */
  | {
    status: 'wrong'
    failed: number
    total: number
    case: Pick<ChallengeRun, 'target' | 'expected' | 'actual'> & { numbers: number[] }
  }

export function decodeExercise(json: string): Exercise {
  const value = JSON.parse(json) as { lines?: unknown } | null
  const lines = Array.isArray(value?.lines) ? value.lines as Partial<ExerciseLine>[] : []
  const valid = lines.length > 0 && lines.every((line) =>
    Number.isInteger(line?.number) && Number.isInteger(line?.indent)
    && typeof line?.text === 'string' && typeof line?.blank === 'boolean')
  if (!valid || !lines.some((line) => line.blank)) throw new Error('Python devolvió un ejercicio inválido.')
  return { lines: lines as ExerciseLine[] }
}

export function decodeCheckResult(json: string): CheckResult {
  const value = JSON.parse(json) as Record<string, unknown> | null
  if (value?.status === 'passed' && Number.isInteger(value.total)) return { status: 'passed', total: value.total as number }
  if (value?.status === 'syntax' && typeof value.message === 'string') return { status: 'syntax', message: value.message }
  const failing = value?.case as { numbers?: unknown } | undefined
  if (
    value?.status === 'wrong' && Number.isInteger(value.failed) && Number.isInteger(value.total)
    && Array.isArray(failing?.numbers) && failing.numbers.every(Number.isInteger)
  ) {
    // The failing case has the shape of a challenge run, minus the change made.
    const placeholder = { line: 0, original: '', mutated: '', source: '' }
    const { target, expected, actual } = decodeChallengeRun(JSON.stringify({ ...failing, mutation: placeholder }))
    return {
      status: 'wrong',
      failed: value.failed as number,
      total: value.total as number,
      case: { numbers: failing.numbers as number[], target, expected, actual },
    }
  }
  throw new Error('Python devolvió una comprobación inválida.')
}

export function createExercise(algorithm: PythonAlgorithm, count: number, seed: number): PythonExecution<Exercise> {
  return runPythonAlgorithm({ kind: 'exercise', algorithm, count, seed }, decodeExercise)
}

export function checkExercise(
  algorithm: PythonAlgorithm,
  answers: Record<number, string>,
  sorted: boolean,
  seed: number
): PythonExecution<CheckResult> {
  return runPythonAlgorithm({ kind: 'check', algorithm, answers, sorted, seed }, decodeCheckResult)
}
