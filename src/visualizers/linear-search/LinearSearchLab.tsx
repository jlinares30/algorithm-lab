import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { PlaybackControls } from '../../components/PlaybackControls'
import { EventTimeline } from '../../components/EventTimeline'
import { PredictionPanel } from '../../components/PredictionPanel'
import type { ArrayView } from '../../components/ArrayVisualization'
import { executeLinearSearch } from '../../execution/linearSearch'
import type { LinearSearchExecution, LinearSearchResult } from '../../execution/linearSearch'
import { maxListLength } from '../../input/parseNumbers'
import { usePlayback } from '../../playback/usePlayback'
import { usePrediction } from '../../prediction/usePrediction'
import { LinearSearchVisualizer } from './LinearSearchVisualizer'
import { getLinearPrediction, parseLinearSearchInput } from './model'

interface Run extends LinearSearchResult {
  numbers: number[]
  target: number
}

const sizes = [5, 11, 20, 40, 80, 256]

export function LinearSearchLab() {
  const [list, setList] = useState('42, 7, 19, 3, 88, 25, 61, 14, 50, 9, 33')
  const [target, setTarget] = useState('14')
  const [size, setSize] = useState(11)
  const [run, setRun] = useState<Run | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<ArrayView>('bars')
  const execution = useRef<LinearSearchExecution | null>(null)
  const playback = usePlayback(run?.events.length ?? 0)
  const prediction = usePrediction(playback)
  // The step about to be revealed, if any.
  const nextEvent = run?.events[playback.position]
  const question = run && nextEvent ? getLinearPrediction(run.numbers, run.target, nextEvent) : null

  useEffect(() => () => {
    execution.current?.dispose()
    execution.current = null
  }, [])

  let draftNumbers: number[] = []
  let validationMessage = ''
  try {
    draftNumbers = parseLinearSearchInput(list, target.trim() || '0').numbers
  } catch (err) {
    validationMessage = (err as Error).message
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    let input: ReturnType<typeof parseLinearSearchInput>
    try {
      input = parseLinearSearchInput(list, target)
    } catch (error) {
      setError((error as Error).message)
      return
    }
    prediction.restart()
    setRun(null)
    setLoading(true)
    let current: LinearSearchExecution | null = null
    try {
      current = executeLinearSearch(input.numbers, input.target)
      execution.current = current
      const result = await current.result
      if (execution.current === current) setRun({ ...input, ...result })
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

  function generate() {
    // Input data only: random values in no particular order.
    const generated = Array.from({ length: size }, () => Math.floor(Math.random() * 200) - 50)
    setList(generated.join(', '))
    setTarget(String(generated[Math.floor(Math.random() * generated.length)]))
    setError('')
  }

  function randomTarget() {
    if (draftNumbers.length === 0) return
    setTarget(String(draftNumbers[Math.floor(Math.random() * draftNumbers.length)]))
  }

  const present = draftNumbers.includes(Number(target))

  return (
    <section aria-labelledby="linear-search-title" className="mt-12 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="linear-search-title" className="text-2xl font-semibold">Linear Search</h2>
        <span className="rounded-full bg-emerald-400/10 px-3 py-1 font-mono text-xs text-emerald-300">Python · Pyodide · Web Worker</span>
      </div>
      <p className="mt-3 text-slate-400">Recorre la lista elemento por elemento hasta encontrar el objetivo. No necesita que esté ordenada.</p>

      <form onSubmit={submit} className="my-8 space-y-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5" aria-busy={loading}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs text-slate-300">
            <span className="block font-medium">Tamaño de la lista aleatoria</span>
            <select className="field w-auto" value={size} disabled={loading} onChange={(event) => setSize(Number(event.target.value))}>
              {sizes.map((count) => <option key={count} value={count}>{count} elementos</option>)}
            </select>
          </label>
          <button type="button" className="control" disabled={loading} onClick={generate}>Generar lista</button>
        </div>

        <label className="block space-y-1 text-xs text-slate-300">
          <span className="block font-medium">Lista de números</span>
          <textarea
            className="field min-h-16 font-mono"
            value={list}
            disabled={loading}
            aria-describedby="linear-list-help"
            onChange={(event) => {
              setList(event.target.value)
              setError('')
            }}
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <p id="linear-list-help" className="text-slate-400">
            Enteros en cualquier orden, separados por comas o espacios (máximo {maxListLength}).
          </p>
          {validationMessage ? (
            <span className="font-medium text-rose-400">⚠ {validationMessage}</span>
          ) : (
            <span className="font-medium text-emerald-400">✓ {draftNumbers.length} elementos válidos</span>
          )}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-slate-800 pt-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-xs text-slate-300">
              <span className="block font-medium">Valor objetivo</span>
              <input
                className="field min-h-9 w-28 sm:w-36"
                type="text"
                inputMode="numeric"
                value={target}
                disabled={loading}
                onChange={(event) => setTarget(event.target.value)}
              />
            </label>
            <button type="button" className="control min-h-9" disabled={loading || draftNumbers.length === 0} onClick={randomTarget}>
              Objetivo aleatorio
            </button>
            {draftNumbers.length > 0 && (
              <span className="mb-2 font-mono text-[11px]">
                {present
                  ? <span className="font-medium text-emerald-400">✓ Presente en la lista</span>
                  : <span className="text-amber-400/90">No presente en la lista</span>}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="control control-primary min-h-9" type="submit" disabled={loading}>
              {loading ? 'Ejecutando Python…' : 'Ejecutar búsqueda'}
            </button>
            {loading && <button className="control min-h-9" type="button" onClick={cancel}>Cancelar</button>}
          </div>
        </div>

        {run && (
          <p className="text-[11px] text-slate-400">
            Los cambios del formulario se aplican al ejecutar otra búsqueda. La reproducción conserva los datos de su ejecución.
          </p>
        )}
      </form>

      {loading && <p role="status" className="mb-6 text-sm text-slate-300">Cargando Pyodide y ejecutando tu archivo Python en segundo plano. La descarga inicial puede tardar unos segundos.</p>}
      {error && <p role="alert" className="mb-6 rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-rose-200">{error}</p>}
      {run ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <fieldset className="flex flex-wrap items-center gap-2">
              <legend className="mb-2 text-xs uppercase tracking-wider text-slate-400">Representación</legend>
              <label className="view-option"><input type="radio" name="linear-array-view" value="bars" checked={view === 'bars'} onChange={() => setView('bars')} /> Barras</label>
              <label className="view-option"><input type="radio" name="linear-array-view" value="cells" checked={view === 'cells'} onChange={() => setView('cells')} /> Celdas</label>
            </fieldset>
            <label className="view-option">
              <input type="checkbox" checked={prediction.enabled} onChange={(event) => prediction.setEnabled(event.target.checked)} /> Modo predicción
            </label>
          </div>
          <LinearSearchVisualizer
            numbers={run.numbers}
            target={run.target}
            events={run.events}
            position={playback.position}
            view={view}
            speed={playback.speed}
          />
          {prediction.enabled ? (
            <PredictionPanel
              question={question}
              feedback={prediction.feedback}
              score={prediction.score}
              position={playback.position}
              total={run.events.length}
              onAnswer={(optionId) => question && prediction.answer(question, optionId)}
              onContinue={prediction.continue}
              onRestart={prediction.restart}
            />
          ) : (<>
            <EventTimeline
              labels={['Inicio', ...run.events.map((event) => event.index === null ? event.action : `${event.action} [${event.index}]`)]}
              position={playback.position}
              currentTime={playback.currentTime}
              clock={playback.clock}
              onSeek={playback.seek}
              onSeekContinuous={playback.seekContinuous}
            />
            <PlaybackControls position={playback.position} total={run.events.length} playing={playback.playing} speed={playback.speed} onPrevious={playback.previous} onNext={playback.next} onToggle={playback.toggle} onReset={playback.reset} onSpeedChange={playback.setSpeed} />
          </>)}
        </div>
      ) : !loading && <p className="text-sm text-slate-400">Ejecuta una búsqueda para cargar sus pasos. Después podrás recorrerlos a tu ritmo.</p>}
    </section>
  )
}
