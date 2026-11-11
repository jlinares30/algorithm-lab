import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { describeOutcome, describeStep, findFault, getVariantSnapshot, sameFault } from '../bughunt/model'
import type { Fault } from '../bughunt/model'
import { algorithms } from '../catalog/algorithms'
import { variants } from '../catalog/variants'
import type { Variant } from '../catalog/variants'
import { ArrayVisualization } from '../components/ArrayVisualization'
import type { PythonAlgorithm, PythonExecution } from '../execution/pythonWorker'
import { runVariant } from '../execution/variant'
import type { VariantRun } from '../execution/variant'
import { parseNumberList, parseTarget } from '../input/parseNumbers'
import { PageShell } from './AlgorithmPage'

interface Run extends VariantRun {
  variant: Variant
  numbers: number[]
  target: number
}

const defaults: Record<PythonAlgorithm, { list: string; target: string }> = {
  binary_search: { list: '1, 3, 5, 7, 9, 11, 13, 15, 17', target: '13' },
  linear_search: { list: '42, 7, 19, 3, 88, 25, 61', target: '25' },
}

function algorithmName(algorithm: PythonAlgorithm) {
  return algorithms.find((item) => item.id === algorithm.replaceAll('_', '-'))?.name ?? algorithm
}

function explainFault(run: Run, fault: Fault) {
  const { algorithm } = run.variant
  if (fault.kind === 'none') {
    return 'Con estos datos esta versión hace lo mismo que la correcta. El fallo sigue escondido: prueba otra lista u otro objetivo.'
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

export function BugHuntPage({ challenges = variants }: { challenges?: Variant[] }) {
  const [challengeId, setChallengeId] = useState(challenges[0]?.id ?? '')
  const challenge = challenges.find((item) => item.id === challengeId)
  const [list, setList] = useState(challenge ? defaults[challenge.algorithm].list : '')
  const [target, setTarget] = useState(challenge ? defaults[challenge.algorithm].target : '')
  const [run, setRun] = useState<Run | null>(null)
  const [position, setPosition] = useState(1)
  const [answer, setAnswer] = useState<Fault | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const execution = useRef<PythonExecution<VariantRun> | null>(null)

  useEffect(() => () => {
    execution.current?.dispose()
    execution.current = null
  }, [])

  function choose(id: string) {
    const next = challenges.find((item) => item.id === id)
    if (next && next.algorithm !== challenge?.algorithm) {
      setList(defaults[next.algorithm].list)
      setTarget(defaults[next.algorithm].target)
    }
    setChallengeId(id)
    setRun(null)
    setAnswer(null)
    setError('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!challenge) return
    setError('')
    let numbers: number[]
    let targetValue: number
    try {
      numbers = parseNumberList(list, { requireSorted: challenge.algorithm === 'binary_search' })
      targetValue = parseTarget(target)
    } catch (error) {
      setError((error as Error).message)
      return
    }
    setRun(null)
    setAnswer(null)
    setLoading(true)
    const current = runVariant(challenge.algorithm, challenge.source, numbers, targetValue)
    execution.current = current
    try {
      const result = await current.result
      if (execution.current === current) {
        setRun({ ...result, variant: challenge, numbers, target: targetValue })
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
  const fault = run ? findFault(run.variant.algorithm, run) : null
  const snapshot = run ? getVariantSnapshot(run.variant.algorithm, run.numbers, run.actual.steps, position) : null

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
          Cada reto ejecuta una versión del algoritmo con un fallo puesto a propósito. Recorre sus pasos y marca el primero que esté mal.
        </p>

        {challenges.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-slate-700 p-5 text-sm text-slate-300">
            Todavía no hay retos. Cada archivo de{' '}
            <code className="font-mono text-slate-100">python/algorithms/searching/variants</code> se convierte en uno.
          </p>
        ) : (
          <form onSubmit={submit} className="my-6 space-y-4" aria-busy={loading}>
            <label className="block space-y-1 text-xs text-slate-300">
              <span className="block font-medium">Reto</span>
              <select className="field w-auto" value={challengeId} disabled={loading} onChange={(event) => choose(event.target.value)}>
                {challenges.map((item, index) => (
                  <option key={item.id} value={item.id}>Reto {index + 1} · {algorithmName(item.algorithm)}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-xs text-slate-300">
              <span className="block font-medium">Lista</span>
              <textarea className="field min-h-16 font-mono" value={list} disabled={loading} onChange={(event) => setList(event.target.value)} />
            </label>
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1 text-xs text-slate-300">
                <span className="block font-medium">Objetivo</span>
                <input className="field min-h-9 w-28" type="text" inputMode="numeric" value={target} disabled={loading} onChange={(event) => setTarget(event.target.value)} />
              </label>
              <button className="control control-primary min-h-9" type="submit" disabled={loading}>
                {loading ? 'Ejecutando Python…' : 'Ejecutar reto'}
              </button>
              {loading && <button className="control min-h-9" type="button" onClick={cancel}>Cancelar</button>}
            </div>
          </form>
        )}

        {loading && <p role="status" className="mb-6 text-sm text-slate-300">Cargando Pyodide y ejecutando la variante. Puede tardar unos segundos.</p>}
        {error && <p role="alert" className="mb-6 rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-rose-200">{error}</p>}

        {run && snapshot && fault && (
          <div className="space-y-5">
            <ArrayVisualization
              items={snapshot.items}
              view={run.numbers.length > 24 ? 'bars' : 'cells'}
              target={run.target}
              pointers={snapshot.pointers}
              range={snapshot.range}
              dense={run.numbers.length > 40}
            />

            <p aria-live="polite" className="font-mono text-sm text-slate-200">
              <span className="text-slate-400">{atEnd ? 'Final' : `Paso ${position} de ${stepCount}`} · </span>
              {atEnd ? describeOutcome(run.actual) : describeStep(run.variant.algorithm, run.actual.steps[position - 1])}
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
              <div role="status" className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-200">
                <p className={`font-semibold ${sameFault(answer, fault) ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {sameFault(answer, fault) ? 'Correcto.' : 'No es ahí.'}
                </p>
                <p>{explainFault(run, fault)}</p>
                {fault.kind !== 'none' && <p><span className="text-slate-400">El fallo: </span>{run.variant.description}</p>}
              </div>
            )}
          </div>
        )}
      </section>
    </PageShell>
  )
}
