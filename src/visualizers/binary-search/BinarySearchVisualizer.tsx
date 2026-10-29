import { useEffect, useMemo, useRef, useState } from 'react'
import type { SearchEvent } from '../../execution/binarySearch'
import { ArrayVisualization } from '../../components/ArrayVisualization'
import type { ArrayView } from '../../components/ArrayVisualization'
import { ArrayOverview } from '../../components/ArrayOverview'
import type { AnimationClock } from '../../playback/animationClock'
import { getArrayCamera } from '../../animations/arrayCamera'
import { useSearchAnimation } from '../../animations/useSearchAnimation'
import { explainEvent, getSearchScene } from './model'

interface Props {
  numbers: number[]
  target: number
  events: SearchEvent[]
  position: number
  view: ArrayView
  clock: AnimationClock
  revision: number
  onToggleImmersive?: () => void
}

export function BinarySearchVisualizer({
  numbers,
  target,
  events,
  position,
  view,
  clock,
  revision,
  onToggleImmersive,
}: Props) {
  const root = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(12)
  const [zoom, setZoom] = useState(true)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)

  const scene = useMemo(() => getSearchScene(numbers, events, position), [numbers, events, position])
  const { event, comparisons, items } = scene

  const geometry = useMemo(() => ({
    count: numbers.length,
    before: scene.before,
    after: scene.after,
    hasEvent: event !== null,
    cameraBefore: getArrayCamera(scene.before, scene.focusBefore, numbers.length, columns, zoom),
    cameraAfter: getArrayCamera(scene.zoomRange, scene.focusAfter, numbers.length, columns, zoom),
    midIndex: event?.mid ?? null,
    prevMidIndex: scene.prevMid ?? (event ? scene.before.left : null),
    action: event?.action,
  }), [numbers.length, scene, event, columns, zoom])

  useSearchAnimation(root, clock, geometry, revision, view)

  useEffect(() => {
    const element = root.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      setColumns(Math.max(3, Math.min(16, Math.floor(entry.contentRect.width / 64))))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const progress = Math.round((position / Math.max(1, events.length)) * 100)
  const comparison = event?.mid !== null && event?.mid !== undefined
    ? `${numbers[event.mid]} ${event.action === 'found' ? '=' : event.action === 'move_right' ? '<' : '>'} ${target}`
    : null

  // Minimap is only shown for large arrays (> 16 elements)
  const showMinimap = numbers.length > 16

  const selectedItem = selectedItemIndex !== null
    ? items.find((item) => item.index === selectedItemIndex) ?? null
    : null

  return (
    <div
      ref={root}
      className="search-scene space-y-5"
      data-phase="complete"
      data-position={position}
    >
      {/* Top metrics bar */}
      <div className="grid grid-cols-2 gap-3 font-mono text-sm text-slate-300 sm:grid-cols-4">
        <p className="metric">Paso <strong>{position} de {events.length}</strong></p>
        <p className="metric">Comparaciones: <strong>{comparisons}</strong></p>
        <p className="metric">Objetivo: <strong className="text-emerald-300">{target}</strong></p>
        <p className="metric">Progreso: <strong>{progress}%</strong></p>
      </div>

      <div role="progressbar" aria-label="Progreso de reproducción" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="playback-progress">
        <div style={{ width: `${progress}%` }} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-lg text-xs leading-relaxed text-slate-400">
          Los punteros describen cada decisión del algoritmo. La animación coordina el desplazamiento de mid, la comparación con el objetivo, el descarte y el enfoque del nuevo rango.
        </p>
        <div className="flex items-center gap-2">
          <p className="comparison-badge" aria-label={comparison ? `Comparación: ${comparison}` : 'Sin comparación'}>
            {comparison ?? (event?.action === 'not_found' ? 'Rango vacío' : 'mid ↔ objetivo')}
          </p>
          {onToggleImmersive && (
            <button
              type="button"
              className="control text-xs flex items-center gap-1.5"
              onClick={onToggleImmersive}
              aria-label="Entrar en modo inmersivo 3D"
            >
              ⛶ Modo Inmersivo 3D
            </button>
          )}
        </div>
      </div>

      {/* Main unified visual stage */}
      <div className="main-visual-stage rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">Escenario Principal</span>
            <span className="text-slate-400 font-mono">({numbers.length} elementos)</span>
            <span className="text-[11px] text-slate-500">· Clic en una barra para inspeccionar</span>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2">
            <input type="checkbox" className="accent-emerald-400" checked={zoom} onChange={(event) => setZoom(event.target.checked)} />
            Zoom automático al rango activo
          </label>
        </div>

        {/* Compact minimap for large arrays */}
        {showMinimap && (
          <div className="stage-minimap border-b border-slate-800/80 pb-3">
            <ArrayOverview items={items} target={target} />
          </div>
        )}

        {/* 5-phase sequence indicators */}
        <ol className="sequence-phases" aria-label="Secuencia visual">
          <li data-stage="comparison">1 · Desplazamiento & comparación</li>
          <li data-stage="discard">2 · {items.some((item) => item.pending) ? 'Atenuación de descarte' : event?.action === 'found' ? 'Coincidencia hallada' : 'Comprobación'}</li>
          <li data-stage="focus">3 · Enfoque del nuevo rango</li>
        </ol>

        {/* Interactive Element Inspector */}
        {selectedItem && (
          <aside role="region" aria-label="Inspector de elemento" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-500/40 bg-sky-950/40 p-3 text-xs animate-fadeIn">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-sky-200">Elemento seleccionado:</span>
              <span className="font-mono text-slate-200">Índice: <strong>{selectedItem.index}</strong></span>
              <span className="font-mono text-slate-200">Valor: <strong className="text-emerald-300">{selectedItem.value}</strong></span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                Estado: {selectedItem.state === 'found' ? 'Objetivo encontrado' : selectedItem.state === 'mid' ? 'Elemento central evaluado' : selectedItem.state === 'discarded' ? 'Descartado' : 'Activo en rango'}
              </span>
              <span className="font-mono text-slate-400 text-[11px]">
                {selectedItem.value === target ? '✓ Coincide con objetivo' : selectedItem.value < target ? `${selectedItem.value} < ${target} (menor)` : `${selectedItem.value} > ${target} (mayor)`}
              </span>
            </div>
            <button
              type="button"
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
              onClick={() => setSelectedItemIndex(null)}
            >
              Cerrar
            </button>
          </aside>
        )}

        <ArrayVisualization
          items={items}
          view={view}
          target={target}
          pointers={[
            { label: 'left', index: event ? event.left : (numbers.length > 0 ? scene.before.left : null) },
            { label: 'mid', index: event?.mid ?? null },
            { label: 'right', index: event ? event.right : (numbers.length > 0 ? scene.before.right : null) },
          ]}
          range={scene.before}
          dense={!zoom && numbers.length > columns}
          selectedItemIndex={selectedItemIndex}
          onSelectItem={(index) => setSelectedItemIndex(selectedItemIndex === index ? null : index)}
        />
      </div>

      {numbers.length === 0 && <p className="text-slate-400">Lista vacía: no hay elementos que comparar.</p>}
      <p className="text-xs leading-relaxed text-slate-400">
        Azul: en rango · Ámbar: mid · Verde: encontrado · Rayado: mitad descartada · Atenuado: fuera de rango. Las alturas representan el valor respecto a cero.
      </p>

      {/* Semantic algorithmic explanation card */}
      <div role="status" aria-atomic="true" className="min-h-28 rounded-xl border border-slate-700 bg-slate-950/60 p-5">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-emerald-400">{event?.action ?? 'Estado inicial'}</p>
        <p className="leading-relaxed text-slate-200">{event ? explainEvent(event, numbers, target) : 'Todo está preparado. Avanza o reproduce para explorar los eventos de Python.'}</p>
        {event && (
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono">
            <span className="text-slate-300">
              Evaluación: left=<strong className="text-sky-300">{event.left}</strong> · mid=<strong className="text-amber-300">{event.mid ?? '—'}</strong> · right=<strong className="text-purple-300">{event.right}</strong>
            </span>
            <span className="text-slate-400">
              Rango resultante tras descarte: <strong className="text-emerald-300">{scene.after.right < scene.after.left ? 'vacío (no encontrado)' : `[${scene.after.left}, ${scene.after.right}]`}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
