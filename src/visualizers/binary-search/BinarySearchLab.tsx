import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { PlaybackControls } from '../../components/PlaybackControls'
import { EventTimeline } from '../../components/EventTimeline'
import type { ArrayView } from '../../components/ArrayVisualization'
import { executeBinarySearch } from '../../execution/binarySearch'
import type { SearchExecution, SearchResult } from '../../execution/binarySearch'
import { BinarySearchVisualizer } from './BinarySearchVisualizer'
import { parseSearchInput } from './model'
import { usePlayback } from './usePlayback'
import { BinarySearch3DView } from './3d/BinarySearch3DView'

interface Run extends SearchResult {
  numbers: number[]
  target: number
}

type InputMode = 'generate' | 'manual'

export function BinarySearchLab() {
  const [list, setList] = useState('2, 5, 9, 14, 20, 27, 35, 44, 56, 69, 83')
  const [target, setTarget] = useState('69')
  const [inputMode, setInputMode] = useState<InputMode>('generate')
  const [expandedManual, setExpandedManual] = useState(false)
  const [generatedSize, setGeneratedSize] = useState(11)
  const [run, setRun] = useState<Run | null>(null)
  const [isImmersive3D, setIsImmersive3D] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<ArrayView>('bars')
  const execution = useRef<SearchExecution | null>(null)
  const playback = usePlayback(run?.events.length ?? 0)

  useEffect(() => () => {
    execution.current?.dispose()
    execution.current = null
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    let input: ReturnType<typeof parseSearchInput>
    try {
      input = parseSearchInput(list, target)
    } catch (error) {
      setError((error as Error).message)
      return
    }
    playback.reset()
    setRun(null)
    setLoading(true)
    let current: SearchExecution | null = null
    try {
      current = executeBinarySearch(input.numbers, input.target)
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

  let draftNumbers: number[] = []
  let validationMessage = ''
  let isSorted = true

  try {
    draftNumbers = parseSearchInput(list, target.trim() || '0').numbers
  } catch (err) {
    validationMessage = (err as Error).message
    if (validationMessage.includes('ordenada')) isSorted = false
  }

  const choices = [...new Set(draftNumbers)]

  function handleGenerate() {
    const generated = Array.from({ length: generatedSize }, () => Math.floor(Math.random() * 200) - 50).sort((a, b) => a - b)
    const nextTarget = generated[Math.floor(Math.random() * generated.length)]
    setList(generated.join(', '))
    setTarget(String(nextTarget))
    setError('')
  }

  function handleRandomTarget() {
    if (draftNumbers.length === 0) return
    const randomVal = draftNumbers[Math.floor(Math.random() * draftNumbers.length)]
    setTarget(String(randomVal))
  }

  return (
    <section aria-labelledby="binary-search-title" className="mt-12 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="binary-search-title" className="text-2xl font-semibold">Binary Search</h2>
        <span className="rounded-full bg-emerald-400/10 px-3 py-1 font-mono text-xs text-emerald-300">Python · Pyodide · Web Worker</span>
      </div>
      <p className="mt-3 text-slate-400">Explora la búsqueda binaria, una decisión a la vez.</p>

      {/* Redesigned Compact Input Panel */}
      <form onSubmit={submit} className="my-8 rounded-xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5 space-y-4" aria-busy={loading}>
        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div role="tablist" aria-label="Modo de entrada de datos" className="flex items-center gap-2">
            <button
              type="button"
              role="tab"
              aria-selected={inputMode === 'generate'}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${inputMode === 'generate' ? 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/40' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
              onClick={() => setInputMode('generate')}
            >
              Generar lista
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inputMode === 'manual'}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${inputMode === 'manual' ? 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/40' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
              onClick={() => setInputMode('manual')}
            >
              Lista manual
            </button>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {draftNumbers.length} {draftNumbers.length === 1 ? 'elemento' : 'elementos'} {draftNumbers.length > 0 && `[${draftNumbers[0]} … ${draftNumbers[draftNumbers.length - 1]}]`}
          </span>
        </div>

        {/* Mode 1: Generar lista */}
        {inputMode === 'generate' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1 text-xs text-slate-300">
                <span className="block font-medium">Tamaño de la lista aleatoria</span>
                <select
                  className="field w-auto min-h-9"
                  value={generatedSize}
                  onChange={(event) => setGeneratedSize(Number(event.target.value))}
                  disabled={loading}
                >
                  {[5, 11, 20, 40, 80, 256].map((count) => (
                    <option key={count} value={count}>{count} elementos</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="control min-h-9 text-xs"
                onClick={handleGenerate}
                disabled={loading}
              >
                Generar lista
              </button>
              <label className="space-y-1 text-xs text-slate-300">
                <span className="block font-medium">Elegir objetivo de la lista</span>
                <select
                  className="field w-auto min-h-9"
                  value=""
                  disabled={loading || choices.length === 0}
                  onChange={(event) => setTarget(event.target.value)}
                >
                  <option value="" disabled>Seleccionar valor…</option>
                  {choices.map((number) => (
                    <option key={number} value={number}>{number}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="control min-h-9 text-xs"
                disabled={loading || draftNumbers.length === 0}
                onClick={handleRandomTarget}
              >
                Objetivo aleatorio
              </button>
            </div>

            {/* Compact summary of generated data */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900/90 px-3 py-2 text-xs text-slate-300 border border-slate-800/80">
              <div className="flex flex-wrap items-center gap-2 overflow-hidden">
                <span className="font-semibold text-slate-200">Resumen:</span>
                <span className="text-slate-400">
                  {draftNumbers.length === 0
                    ? 'Lista vacía'
                    : `${draftNumbers.length} elementos ordenados · Mín: ${draftNumbers[0]}, Máx: ${draftNumbers[draftNumbers.length - 1]}`}
                </span>
                {draftNumbers.length > 0 && (
                  <span className="text-slate-500 font-mono text-[11px] truncate max-w-xs sm:max-w-md">
                    ({draftNumbers.slice(0, 8).join(', ')}{draftNumbers.length > 8 ? '…' : ''})
                  </span>
                )}
              </div>
              <button
                type="button"
                className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2 shrink-0"
                onClick={() => setInputMode('manual')}
              >
                Editar como texto →
              </button>
            </div>
          </div>
        )}

        {/* Mode 2: Lista manual */}
        <div className={inputMode === 'manual' ? 'space-y-2' : 'hidden'}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">Lista ordenada</span>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-200 text-xs"
              onClick={() => setExpandedManual((prev) => !prev)}
            >
              {expandedManual ? 'Contraer campo' : 'Expandir campo'}
            </button>
          </div>
          <label className="block space-y-1">
            <span className="sr-only">Lista ordenada</span>
            <textarea
              className={`field font-mono transition-all ${expandedManual ? 'min-h-32' : 'min-h-16'}`}
              value={list}
              onChange={(event) => {
                setList(event.target.value)
                setError('')
              }}
              disabled={loading}
              aria-describedby="list-help"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <p id="list-help" className="text-slate-400 text-[11px]">
              Enteros en orden ascendente, separados por comas o espacios (máximo 256).
            </p>
            {validationMessage ? (
              <span className={`text-[11px] font-medium ${isSorted ? 'text-amber-400' : 'text-rose-400'}`}>
                ⚠ {validationMessage}
              </span>
            ) : (
              <span className="text-[11px] text-emerald-400 font-medium">
                ✓ {draftNumbers.length} elementos válidos y ordenados
              </span>
            )}
          </div>
        </div>

        {/* Action Row */}
        <div className="flex flex-wrap items-end justify-between gap-4 pt-3 border-t border-slate-800">
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-xs text-slate-300">
              <span className="block font-medium">Valor objetivo</span>
              <input
                className="field w-28 sm:w-36 min-h-9"
                type="text"
                inputMode="numeric"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                disabled={loading}
              />
            </label>
            {draftNumbers.length > 0 && (
              <span className="mb-2 text-xs font-mono text-slate-400 text-[11px]">
                {choices.includes(Number(target)) ? (
                  <span className="text-emerald-400 font-medium">✓ Presente en la lista</span>
                ) : (
                  <span className="text-amber-400/90">No presente en la lista</span>
                )}
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
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="mb-2 text-xs uppercase tracking-wider text-slate-400">Representación</legend>
            <label className="view-option"><input type="radio" name="array-view" value="bars" checked={view === 'bars'} onChange={() => setView('bars')} /> Barras</label>
            <label className="view-option"><input type="radio" name="array-view" value="cells" checked={view === 'cells'} onChange={() => setView('cells')} /> Celdas</label>
          </fieldset>
          <BinarySearchVisualizer
            numbers={run.numbers}
            target={run.target}
            events={run.events}
            position={playback.position}
            view={view}
            clock={playback.clock}
            revision={playback.revision}
            onToggleImmersive={() => setIsImmersive3D(true)}
          />
          <EventTimeline
            labels={['Inicio', ...run.events.map((event) => event.action)]}
            position={playback.position}
            currentTime={playback.currentTime}
            clock={playback.clock}
            onSeek={playback.seek}
            onSeekContinuous={playback.seekContinuous}
          />
          <PlaybackControls position={playback.position} total={run.events.length} playing={playback.playing} speed={playback.speed} onPrevious={playback.previous} onNext={playback.next} onToggle={playback.toggle} onReset={playback.reset} onSpeedChange={playback.setSpeed} />

          {/* Fullscreen 3D Immersive Experience Overlay */}
          {isImmersive3D && (
            <BinarySearch3DView
              numbers={run.numbers}
              target={run.target}
              events={run.events}
              playback={playback}
              onExit={() => setIsImmersive3D(false)}
            />
          )}
        </div>
      ) : !loading && <p className="text-sm text-slate-400">Ejecuta una búsqueda para cargar sus pasos. Después podrás recorrerlos a tu ritmo.</p>}
    </section>
  )
}
