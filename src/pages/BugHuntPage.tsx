import { useEffect, useRef, useState } from 'react'
import { condenseEndless, describeOutcome, describeStep, explainFault, findFault, getFaultySnapshot, makeChallengeData, sameFault } from '../bughunt/model'
import type { Fault } from '../bughunt/model'
import { algorithms } from '../catalog/algorithms'
import { useCodeTheme } from '../code/theme'
import { ArrayVisualization } from '../components/ArrayVisualization'
import { CodeText, CodeThemeSelect } from '../components/CodeText'
import { runChallenge } from '../execution/challenge'
import type { ChallengeRun } from '../execution/challenge'
import { pythonAlgorithms } from '../execution/pythonWorker'
import type { Mutation, PythonAlgorithm, PythonExecution } from '../execution/pythonWorker'
import { PageShell } from './AlgorithmPage'

interface Run extends ChallengeRun {
  algorithm: PythonAlgorithm
  numbers: number[]
}

// Available algorithms whose Python file the worker can run.
const playable = algorithms.flatMap((algorithm) => {
  const python = algorithm.id.replaceAll('-', '_') as PythonAlgorithm
  return algorithm.status === 'available' && pythonAlgorithms.includes(python) ? [{ python, name: algorithm.name }] : []
})

export function BugHuntPage() {
  const [algorithm, setAlgorithm] = useState<PythonAlgorithm>(playable[0]?.python ?? 'binary_search')
  const [run, setRun] = useState<Run | null>(null)
  const [position, setPosition] = useState(1)
  const [answer, setAnswer] = useState<Fault | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [codeTheme, setCodeTheme] = useCodeTheme()
  const execution = useRef<PythonExecution<ChallengeRun> | null>(null)

  useEffect(() => () => {
    execution.current?.dispose()
    execution.current = null
  }, [])

  // Every challenge gets new random data. Without `mutation`, Python also
  // picks a new change to make in the algorithm.
  async function start(mutation?: Mutation) {
    setError('')
    setRun(null)
    setAnswer(null)
    setLoading(true)
    const data = makeChallengeData(algorithm)
    const current = runChallenge({ algorithm, ...data, mutation })
    execution.current = current
    try {
      const result = await current.result
      if (execution.current === current) {
        setRun({ ...condenseEndless(algorithm, result), algorithm, numbers: data.numbers })
        setPosition(1)
      }
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

  // Positions 1..n are the recorded steps; the one after them is how the run ended.
  const stepCount = run?.actual.steps.length ?? 0
  const atEnd = position > stepCount
  const fault = run ? findFault(run.algorithm, run) : null
  const snapshot = run ? getFaultySnapshot(run.algorithm, run.numbers, run.actual.steps, position) : null

  function respond(given: Fault) {
    if (!fault) return
    setAnswer(given)
    // Show the place where the two runs part ways.
    if (fault.kind === 'step') setPosition(fault.position)
    if (fault.kind === 'end') setPosition(stepCount + 1)
  }

  return (
    <PageShell>
      <section aria-labelledby="bughunt-title" className="mt-12 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-8">
        <h2 id="bughunt-title" className="text-2xl font-semibold">Encuentra el error</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Cada reto cambia una cosa al azar en el algoritmo y lo ejecuta con datos nuevos. Recorre sus pasos y marca el primero que esté mal.
        </p>

        <div className="my-6 flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs text-slate-300">
            <span className="block font-medium">Algoritmo</span>
            <select
              className="field w-auto"
              value={algorithm}
              disabled={loading}
              onChange={(event) => {
                setAlgorithm(event.target.value as PythonAlgorithm)
                setRun(null)
                setAnswer(null)
              }}
            >
              {playable.map((item) => <option key={item.python} value={item.python}>{item.name}</option>)}
            </select>
          </label>
          <button type="button" className="control control-primary min-h-9" disabled={loading} onClick={() => start()}>
            {loading ? 'Preparando reto…' : 'Nuevo reto'}
          </button>
          {loading && <button className="control min-h-9" type="button" onClick={cancel}>Cancelar</button>}
        </div>

        {loading && <p role="status" className="mb-6 text-sm text-slate-300">Cargando Pyodide y preparando el reto. Puede tardar unos segundos.</p>}
        {error && <p role="alert" className="mb-6 rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-rose-200">{error}</p>}

        {run && snapshot && fault && (
          <div className="space-y-5">
            <p className="font-mono text-xs text-slate-400">
              {run.numbers.length} elementos · objetivo <strong className="text-emerald-300">{run.target}</strong>
            </p>

            <ArrayVisualization
              items={snapshot.items}
              view="cells"
              target={run.target}
              pointers={snapshot.pointers}
              range={snapshot.range}
              dense={false}
            />

            <p aria-live="polite" className="font-mono text-sm text-slate-200">
              <span className="text-slate-400">{atEnd ? 'Final' : `Paso ${position} de ${stepCount}`} · </span>
              {atEnd ? describeOutcome(run.actual) : describeStep(run.algorithm, run.actual.steps[position - 1])}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="control" disabled={position <= 1} onClick={() => setPosition(position - 1)}>Anterior</button>
              <button type="button" className="control" disabled={atEnd} onClick={() => setPosition(position + 1)}>Siguiente</button>
              {!answer && (
                <>
                  <button type="button" className="control control-primary" onClick={() => respond(atEnd ? { kind: 'end' } : { kind: 'step', position })}>
                    Aquí falla
                  </button>
                  <button type="button" className="control" onClick={() => respond({ kind: 'none' })}>
                    Con estos datos no falla
                  </button>
                </>
              )}
            </div>

            {answer && (
              <div role="status" className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-200">
                <p className={`font-semibold ${sameFault(answer, fault) ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {sameFault(answer, fault) ? 'Correcto.' : 'No es ahí.'}
                </p>
                <p>{explainFault(run.algorithm, run, fault)}</p>
                {fault.kind === 'none' ? (
                  <button type="button" className="control" onClick={() => start(run.mutation)}>Mismo fallo, otros datos</button>
                ) : (
                  <div>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <p className="text-slate-400">El cambio, en la línea {run.mutation.line}:</p>
                      <CodeThemeSelect value={codeTheme} onChange={setCodeTheme} />
                    </div>
                    <pre data-code-theme={codeTheme} className="mt-2 overflow-x-auto rounded-lg border border-slate-800 p-3 font-mono">
                      <span className="block"><span className="code-muted">correcto  </span><CodeText text={run.mutation.original} /></span>
                      <span className="block"><span className="code-removed">con fallo </span><CodeText text={run.mutation.mutated} /></span>
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </PageShell>
  )
}
