import { useEffect, useRef, useState } from 'react'
import { algorithms } from '../catalog/algorithms'
import { ComplexityChart } from '../components/ComplexityChart'
import type { ChartSeries } from '../components/ComplexityChart'
import { measureAlgorithms, measureSizes, measureTrials } from '../execution/measure'
import type { Measurement } from '../execution/measure'
import { pythonAlgorithms } from '../execution/pythonWorker'
import type { PythonAlgorithm, PythonExecution } from '../execution/pythonWorker'
import { PageShell } from './AlgorithmPage'

type Scenario = 'absent' | 'present'

// Categorical palette validated for the dark surface (colour-vision safe).
// Colours follow the algorithm's position in the catalog, never its rank in the chart.
const palette = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9']

// Available algorithms whose Python file the worker can run.
const measurable = algorithms
  .map((algorithm, index) => ({
    algorithm,
    color: palette[index % palette.length],
    python: algorithm.id.replaceAll('-', '_') as PythonAlgorithm,
  }))
  .filter(({ algorithm, python }) => algorithm.status === 'available' && pythonAlgorithms.includes(python))

export function ComparePage() {
  const [measurement, setMeasurement] = useState<Measurement | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scenario, setScenario] = useState<Scenario>('absent')
  const [scale, setScale] = useState<'linear' | 'log'>('linear')
  const execution = useRef<PythonExecution<Measurement> | null>(null)

  useEffect(() => () => {
    execution.current?.dispose()
    execution.current = null
  }, [])

  async function measure() {
    setError('')
    setLoading(true)
    const current = measureAlgorithms(measurable.map((item) => item.python))
    execution.current = current
    try {
      const result = await current.result
      if (execution.current === current) setMeasurement(result)
    } catch (error) {
      if (execution.current === current) setError(error instanceof Error ? error.message : String(error))
    } finally {
      if (execution.current === current) {
        execution.current = null
        setLoading(false)
      }
    }
  }

  function cancel() {
    execution.current?.dispose()
    execution.current = null
    setLoading(false)
  }

  const series: ChartSeries[] = measurement
    ? measurable.flatMap(({ algorithm, color, python }) => {
      const points = measurement[python]
      return points
        ? [{
          id: algorithm.id,
          name: algorithm.name,
          note: scenario === 'absent' ? algorithm.complexity.worst : algorithm.complexity.average,
          color,
          points: points.map((point) => ({ n: point.n, value: point[scenario] })),
        }]
        : []
    })
    : []

  return (
    <PageShell>
      <section aria-labelledby="compare-title" className="mt-12 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-8">
        <h2 id="compare-title" className="text-2xl font-semibold">Comparar complejidad</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Ejecuta cada algoritmo con listas de {measureSizes[0]} a {measureSizes[measureSizes.length - 1]} elementos y cuenta las comparaciones que registra tu código Python.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" className="control control-primary" disabled={loading} onClick={measure}>
            {loading ? 'Midiendo…' : measurement ? 'Medir de nuevo' : 'Medir'}
          </button>
          {loading && <button type="button" className="control" onClick={cancel}>Cancelar</button>}
        </div>

        {loading && <p role="status" className="mt-4 text-sm text-slate-300">Cargando Pyodide y ejecutando tus archivos Python. Puede tardar unos segundos.</p>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-rose-200">{error}</p>}

        {measurement && (
          <div className="mt-8 space-y-5">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <fieldset className="flex flex-wrap items-center gap-2">
                <legend className="sr-only">Caso medido</legend>
                <label className="view-option"><input type="radio" name="scenario" checked={scenario === 'absent'} onChange={() => setScenario('absent')} /> Objetivo ausente</label>
                <label className="view-option"><input type="radio" name="scenario" checked={scenario === 'present'} onChange={() => setScenario('present')} /> Objetivo presente</label>
              </fieldset>
              <fieldset className="flex flex-wrap items-center gap-2">
                <legend className="sr-only">Escala vertical</legend>
                <label className="view-option"><input type="radio" name="scale" checked={scale === 'linear'} onChange={() => setScale('linear')} /> Lineal</label>
                <label className="view-option"><input type="radio" name="scale" checked={scale === 'log'} onChange={() => setScale('log')} /> Logarítmica</label>
              </fieldset>
            </div>

            <ComplexityChart series={series} scale={scale} yLabel="Comparaciones" />

            <p className="text-xs leading-relaxed text-slate-400">
              {scenario === 'absent'
                ? 'Objetivo ausente: se busca un valor mayor que todos los de la lista, así que el algoritmo agota sus candidatos.'
                : `Objetivo presente: media de ${measureTrials} búsquedas de valores elegidos al azar dentro de la lista.`}
            </p>
          </div>
        )}
      </section>
    </PageShell>
  )
}
