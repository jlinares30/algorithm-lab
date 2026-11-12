import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { condenseEndless, describeOutcome, describeStep, explainFault, findFault, getFaultySnapshot, needsSorted } from '../bughunt/model'
import { algorithms } from '../catalog/algorithms'
import { useCodeTheme } from '../code/theme'
import { ArrayVisualization } from '../components/ArrayVisualization'
import { CodeText, CodeThemeSelect } from '../components/CodeText'
import { checkExercise, createExercise } from '../execution/practice'
import type { CheckResult, Exercise } from '../execution/practice'
import { pythonAlgorithms } from '../execution/pythonWorker'
import type { PythonAlgorithm, PythonExecution } from '../execution/pythonWorker'
import { PageShell } from './AlgorithmPage'

// Available algorithms whose Python file the worker can run.
const playable = algorithms.flatMap((algorithm) => {
  const python = algorithm.id.replaceAll('-', '_') as PythonAlgorithm
  return algorithm.status === 'available' && pythonAlgorithms.includes(python) ? [{ python, name: algorithm.name }] : []
})

const blankCounts = [1, 2, 3, 5]

const randomSeed = () => Math.floor(Math.random() * 2 ** 31)

type FailingCase = Extract<CheckResult, { status: 'wrong' }>['case']

/** Steps recorded by the completed code on one input where it differs from the original. */
function FailingRun({ algorithm, failing: recorded }: { algorithm: PythonAlgorithm; failing: FailingCase }) {
  const failing = condenseEndless(algorithm, recorded)
  const fault = findFault(algorithm, failing)
  const stepCount = failing.actual.steps.length
  // Opens on the place where the two runs part ways.
  const [position, setPosition] = useState(fault.kind === 'step' ? fault.position : stepCount + 1)
  const atEnd = position > stepCount
  const snapshot = getFaultySnapshot(algorithm, failing.numbers, failing.actual.steps, position)

  return (
    <div className="space-y-4">
      <p className="font-mono text-xs text-slate-400">
        Lista [{failing.numbers.join(', ')}] · objetivo <strong className="text-emerald-300">{failing.target}</strong>
      </p>
      <p>{explainFault(algorithm, failing, fault)}</p>
      <ArrayVisualization
        items={snapshot.items}
        view="cells"
        target={failing.target}
        pointers={snapshot.pointers}
        range={snapshot.range}
        dense={false}
      />
      <p aria-live="polite" className="font-mono text-sm text-slate-200">
        <span className="text-slate-400">{atEnd ? 'Final' : `Paso ${position} de ${stepCount}`} · </span>
        {atEnd ? describeOutcome(failing.actual) : describeStep(algorithm, failing.actual.steps[position - 1])}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="control" disabled={position <= 1} onClick={() => setPosition(position - 1)}>Anterior</button>
        <button type="button" className="control" disabled={atEnd} onClick={() => setPosition(position + 1)}>Siguiente</button>
      </div>
    </div>
  )
}

export function PracticePage() {
  const [algorithm, setAlgorithm] = useState<PythonAlgorithm>(playable[0]?.python ?? 'binary_search')
  const [count, setCount] = useState(2)
  const [exercise, setExercise] = useState<(Exercise & { algorithm: PythonAlgorithm }) | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [result, setResult] = useState<CheckResult | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [showRecords, setShowRecords] = useState(false)
  const [loading, setLoading] = useState<'exercise' | 'check' | null>(null)
  const [error, setError] = useState('')
  const [codeTheme, setCodeTheme] = useCodeTheme()
  const execution = useRef<PythonExecution<unknown> | null>(null)

  useEffect(() => () => {
    execution.current?.dispose()
    execution.current = null
  }, [])

  async function runPython<T>(kind: 'exercise' | 'check', current: PythonExecution<T>, onResult: (value: T) => void) {
    setError('')
    setLoading(kind)
    execution.current = current
    try {
      const value = await current.result
      if (execution.current === current) onResult(value)
    } catch (error) {
      if (execution.current === current) setError(error instanceof Error ? error.message : String(error))
    } finally {
      if (execution.current === current) {
        execution.current = null
        setLoading(null)
      }
    }
  }

  function clear() {
    setExercise(null)
    setAnswers({})
    setResult(null)
    setRevealed(false)
  }

  function newExercise() {
    clear()
    return runPython('exercise', createExercise(algorithm, count, randomSeed()), (value) => setExercise({ ...value, algorithm }))
  }

  const blanks = exercise?.lines.filter((line) => line.blank) ?? []
  // Step records are folded into one line each unless the learner asks to see them.
  const folds = showRecords ? [] : exercise?.records ?? []
  const visibleLines = exercise?.lines.filter((line) => !folds.some((fold) => line.number > fold.start && line.number <= fold.end)) ?? []
  const complete = blanks.every((line) => (answers[line.number] ?? '').trim() !== '')

  function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!exercise || !complete) return
    setResult(null)
    const written = Object.fromEntries(blanks.map((line) => [line.number, answers[line.number]]))
    return runPython(
      'check',
      checkExercise(exercise.algorithm, written, needsSorted.includes(exercise.algorithm), randomSeed()),
      setResult
    )
  }

  function cancel() {
    execution.current?.dispose()
    execution.current = null
    setLoading(null)
  }

  return (
    <PageShell>
      <section aria-labelledby="practice-title" className="mt-12 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-8">
        <h2 id="practice-title" className="text-2xl font-semibold">Completa el código</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Se ocultan líneas al azar del algoritmo. Escríbelas de memoria: vale cualquier forma de escribirlas que haga funcionar el algoritmo.
        </p>

        <div className="my-6 flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs text-slate-300">
            <span className="block font-medium">Algoritmo</span>
            <select
              className="field w-auto"
              value={algorithm}
              disabled={loading !== null}
              onChange={(event) => {
                setAlgorithm(event.target.value as PythonAlgorithm)
                clear()
              }}
            >
              {playable.map((item) => <option key={item.python} value={item.python}>{item.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-300">
            <span className="block font-medium">Líneas ocultas</span>
            <select className="field w-auto" value={count} disabled={loading !== null} onChange={(event) => setCount(Number(event.target.value))}>
              {blankCounts.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <button type="button" className="control control-primary min-h-9" disabled={loading !== null} onClick={newExercise}>
            {loading === 'exercise' ? 'Preparando…' : 'Nuevo ejercicio'}
          </button>
          {loading && <button className="control min-h-9" type="button" onClick={cancel}>Cancelar</button>}
          <div className="sm:ml-auto">
            <CodeThemeSelect value={codeTheme} onChange={setCodeTheme} />
          </div>
        </div>

        {loading && <p role="status" className="mb-6 text-sm text-slate-300">Cargando Pyodide. Puede tardar unos segundos.</p>}
        {error && <p role="alert" className="mb-6 rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-rose-200">{error}</p>}

        {exercise && (
          <form onSubmit={check} className="space-y-5">
            <ol aria-label="Código del algoritmo" data-code-theme={codeTheme} className="overflow-x-auto rounded-xl border border-slate-800 py-3 font-mono">
              {visibleLines.map((line) => {
                const fold = folds.find((item) => item.start === line.number)
                return (
                <li key={line.number} className={`flex min-w-max items-start gap-4 px-4 ${line.blank ? 'code-blank py-1' : ''}`} data-blank={line.blank}>
                  <span aria-hidden="true" className="code-muted w-6 shrink-0 select-none text-right">{line.number}</span>
                  <div style={{ paddingLeft: `${line.indent}ch` }} className="flex-1">
                    {fold ? (
                      <span className="tok-comment whitespace-pre">
                        {fold.action ? `# registra el paso «${fold.action}»` : '# registra un paso'}
                      </span>
                    ) : line.blank ? (
                      <>
                        <input
                          className="code-input"
                          type="text"
                          aria-label={`Línea ${line.number}`}
                          autoComplete="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          value={answers[line.number] ?? ''}
                          disabled={loading !== null}
                          onChange={(event) => {
                            setAnswers({ ...answers, [line.number]: event.target.value })
                            setResult(null)
                          }}
                        />
                        {revealed && <span className="block whitespace-pre"><CodeText text={line.text} /></span>}
                      </>
                    ) : (
                      <span className="whitespace-pre">{line.text ? <CodeText text={line.text} /> : ' '}</span>
                    )}
                  </div>
                </li>
                )
              })}
            </ol>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="control control-primary" disabled={loading !== null || !complete}>
                {loading === 'check' ? 'Comprobando…' : 'Comprobar'}
              </button>
              <button type="button" className="control" disabled={revealed} onClick={() => setRevealed(true)}>Ver solución</button>
              {exercise.records.length > 0 && (
                <label className="view-option">
                  <input type="checkbox" checked={showRecords} onChange={(event) => setShowRecords(event.target.checked)} />
                  Mostrar registro de pasos
                </label>
              )}
            </div>

            {result?.status === 'syntax' && (
              <p role="alert" className="rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200">
                El código no es Python válido. {result.message}
              </p>
            )}
            {result?.status === 'passed' && (
              <p role="status" className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-200">
                Correcto: se comporta igual que la versión original en las {result.total} pruebas.
              </p>
            )}
            {result?.status === 'wrong' && (
              <div role="status" className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-200">
                <p className="font-semibold text-amber-300">
                  Todavía no: falla en {result.failed} de {result.total} pruebas. Este es un caso.
                </p>
                <FailingRun algorithm={exercise.algorithm} failing={result.case} />
              </div>
            )}
          </form>
        )}
      </section>
    </PageShell>
  )
}
