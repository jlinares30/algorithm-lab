import { runPythonAlgorithm } from './pythonWorker'
import type { PythonAlgorithm, PythonExecution } from './pythonWorker'

/** Comparisons an algorithm recorded for a list of `n` elements. */
export interface MeasurePoint {
  n: number
  /** Target larger than every element. */
  absent: number
  /** Mean over random targets that are in the list. */
  present: number
}

export type Measurement = Partial<Record<PythonAlgorithm, MeasurePoint[]>>

/** Evenly spaced, so growth proportional to n draws a straight line. */
export const measureSizes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
export const measureTrials = 25

// JSON is the boundary between Python and the application; no PyProxy escapes.
export function decodeMeasurement(json: string, algorithms: PythonAlgorithm[], sizes: number[]): Measurement {
  const value: unknown = JSON.parse(json)
  if (!value || typeof value !== 'object') throw new Error('Python devolvió una medición inválida.')
  const report = value as Record<string, unknown>
  const measurement: Measurement = {}
  for (const algorithm of algorithms) {
    const points = report[algorithm]
    if (!Array.isArray(points) || points.length !== sizes.length) {
      throw new Error(`Python no devolvió la medición completa de ${algorithm}.`)
    }
    measurement[algorithm] = points.map((point: unknown, index) => {
      const { n, absent, present } = (point ?? {}) as Partial<MeasurePoint>
      const valid = n === sizes[index]
        && Number.isFinite(absent) && (absent as number) >= 0
        && Number.isFinite(present) && (present as number) >= 0
      if (!valid) throw new Error(`Python devolvió un punto inválido para ${algorithm} (n=${sizes[index]}).`)
      return { n: n as number, absent: absent as number, present: present as number }
    })
  }
  return measurement
}

export function measureAlgorithms(
  algorithms: PythonAlgorithm[],
  sizes: number[] = measureSizes,
  trials: number = measureTrials
): PythonExecution<Measurement> {
  return runPythonAlgorithm(
    { kind: 'measure', algorithms, sizes, trials },
    (json) => decodeMeasurement(json, algorithms, sizes)
  )
}
