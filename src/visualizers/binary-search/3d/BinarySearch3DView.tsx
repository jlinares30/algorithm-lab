import { useEffect, useMemo, useState } from 'react'
import type { SearchEvent } from '../../../execution/binarySearch'
import type { AnimationClock } from '../../../playback/animationClock'
import { getSearchScene } from '../model'
import { isWebGLAvailable } from './webgl'
import { BinarySearch3DScene } from './BinarySearch3DScene'
import { PlaybackControls } from '../../../components/PlaybackControls'
import { EventTimeline } from '../../../components/EventTimeline'

interface PlaybackEngine {
  position: number
  currentTime: number
  playing: boolean
  speed: number
  clock?: AnimationClock
  revision?: number
  previous: () => void
  next: () => void
  toggle: () => void
  reset: () => void
  seek: (step: number) => void
  seekContinuous: (time: number) => void
  setSpeed: (speed: number) => void
}

interface Props {
  numbers: number[]
  target: number
  events: SearchEvent[]
  playback: PlaybackEngine
  onExit: () => void
}

export function BinarySearch3DView({
  numbers,
  target,
  events,
  playback,
  onExit,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [resetCamTrigger, setResetCamTrigger] = useState(0)
  const hasWebGL = useMemo(() => isWebGLAvailable(), [])

  const scene = useMemo(
    () => getSearchScene(numbers, events, playback.position),
    [numbers, events, playback.position]
  )
  const { event, comparisons, items } = scene

  // Keyboard shortcuts in 3D mode
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onExit()
      } else if (e.key === ' ' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        playback.toggle()
      } else if (e.key === 'ArrowRight' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        playback.next()
      } else if (e.key === 'ArrowLeft' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        playback.previous()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onExit, playback])

  const progress = Math.round((playback.position / Math.max(1, events.length)) * 100)
  const comparison =
    event?.mid !== null && event?.mid !== undefined
      ? `${numbers[event.mid]} ${event.action === 'found' ? '=' : event.action === 'move_right' ? '<' : '>'
      } ${target}`
      : null

  const selectedItem =
    selectedIndex !== null ? items.find((item) => item.index === selectedIndex) ?? null : null

  return (
    <div
      role="region"
      aria-label="Visualizador 3D de Binary Search"
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-slate-950 font-sans text-slate-100 select-none"
    >
      {/* 3D Scene Background / Canvas */}
      <div className="absolute inset-0 z-0">
        {hasWebGL ? (
          <BinarySearch3DScene
            numbers={numbers}
            target={target}
            items={items}
            event={event}
            before={scene.before}
            after={scene.after}
            selectedIndex={selectedIndex}
            resetCamTrigger={resetCamTrigger}
            clock={playback.clock}
            revision={playback.revision}
            onSelect={(idx) => setSelectedIndex(selectedIndex === idx ? null : idx)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center bg-slate-950">
            <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
              <h3 className="text-lg font-semibold text-slate-200">Entorno sin aceleración WebGL</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                El modo 3D utiliza WebGL mediante React Three Fiber. En tu navegador o entorno actual no hay contexto WebGL disponible.
              </p>
              <button
                type="button"
                className="control control-primary mt-4 w-full text-xs"
                onClick={onExit}
              >
                Volver al modo 2D
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Top HUD */}
      <header className="pointer-events-none relative z-10 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left Brand and Step Badge */}
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-950/85 p-2 px-3 shadow-lg backdrop-blur">
            <span className="font-semibold text-emerald-400 text-sm">Algorithm Lab 3D</span>
            <span className="h-4 w-px bg-slate-800" />
            <span className="font-mono text-xs text-slate-300">
              Paso <strong>{playback.position}</strong> de {events.length}
            </span>
            <span className="h-4 w-px bg-slate-800" />
            <span className="font-mono text-xs text-slate-400">
              Comparaciones: <strong>{comparisons}</strong>
            </span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-400">
              {progress}%
            </span>
          </div>

          {/* Center Target & Comparison Badge */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-950/85 p-2 px-3 shadow-lg backdrop-blur">
            <span className="font-mono text-xs text-slate-300">
              Objetivo: <strong className="text-emerald-300">{target}</strong>
            </span>
            <span className="h-4 w-px bg-slate-800" />
            <span
              className="font-mono text-xs text-amber-300"
              aria-label={comparison ? `Comparación: ${comparison}` : 'Sin comparación'}
            >
              {comparison ?? (event?.action === 'not_found' ? 'Rango vacío' : 'Inicio')}
            </span>
            {event && (
              <>
                <span className="h-4 w-px bg-slate-800" />
                <span className="font-mono text-[11px] text-slate-400">
                  left={event.left} · mid={event.mid ?? '—'} · right={event.right}
                </span>
              </>
            )}
          </div>

          {/* Right Action Controls: Reset Camera and Exit */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              className="control text-xs flex items-center gap-1.5 shadow-lg backdrop-blur bg-slate-900/90 hover:bg-slate-800"
              onClick={() => setResetCamTrigger((prev) => prev + 1)}
              title="Restablecer la cámara a la vista predeterminada"
            >
              <span>⊙ Restablecer cámara</span>
            </button>
            <button
              type="button"
              className="control control-primary text-xs flex items-center gap-1.5 shadow-lg"
              onClick={onExit}
              aria-label="Salir del modo 3D"
            >
              <span>✕ Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Center Floating Element Inspector (when clicked) */}
      {selectedItem && (
        <aside
          role="region"
          aria-label="Inspector de elemento 3D"
          className="pointer-events-auto absolute top-20 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-sky-500/50 bg-slate-950/90 px-4 py-2.5 text-xs shadow-2xl backdrop-blur animate-fadeIn"
        >
          <span className="font-semibold text-sky-200">Elemento 3D:</span>
          <span className="font-mono text-slate-200">
            Índice: <strong>{selectedItem.index}</strong>
          </span>
          <span className="font-mono text-slate-200">
            Valor: <strong className="text-emerald-300">{selectedItem.value}</strong>
          </span>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
            {selectedItem.state === 'found'
              ? '✓ Encontrado'
              : selectedItem.state === 'mid'
                ? '⊙ Mid actual'
                : selectedItem.state === 'discarded'
                  ? '✕ Descartado'
                  : 'En rango'}
          </span>
          <span className="font-mono text-slate-400 text-[11px]">
            {selectedItem.value === target
              ? 'Coincide'
              : selectedItem.value < target
                ? `${selectedItem.value} < ${target}`
                : `${selectedItem.value} > ${target}`}
          </span>
          <button
            type="button"
            className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400 hover:text-slate-200"
            onClick={() => setSelectedIndex(null)}
          >
            Cerrar
          </button>
        </aside>
      )}

      {/* Floating Bottom HUD: Timeline & Playback */}
      <footer className="pointer-events-none relative z-10 p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto max-w-3xl rounded-xl border border-slate-800/80 bg-slate-950/85 p-3 shadow-xl backdrop-blur space-y-2">
          {/* Continuous Timeline */}
          <EventTimeline
            labels={['Inicio', ...events.map((e) => e.action)]}
            position={playback.position}
            currentTime={playback.currentTime}
            clock={playback.clock}
            onSeek={playback.seek}
            onSeekContinuous={playback.seekContinuous}
          />

          {/* Compact Playback Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2">
            <PlaybackControls
              position={playback.position}
              total={events.length}
              playing={playback.playing}
              speed={playback.speed}
              onPrevious={playback.previous}
              onNext={playback.next}
              onToggle={playback.toggle}
              onReset={playback.reset}
              onSpeedChange={playback.setSpeed}
            />

            <span className="text-[11px] text-slate-400">
              Rotar: botón izq · Desplazar: botón der · Zoom: rueda · Espacio: reproducir/pausar
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
