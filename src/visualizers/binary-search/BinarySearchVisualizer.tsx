import { useEffect, useMemo, useRef, useState } from 'react'
import type { SearchEvent } from '../../execution/binarySearch'
import { ArrayVisualization } from '../../components/ArrayVisualization'
import type { ArrayView } from '../../components/ArrayVisualization'
import { ArrayOverview } from '../../components/ArrayOverview'
import type { AnimationClock } from '../../playback/animationClock'
import type { PredictionPreview } from '../../prediction/usePrediction'
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
  preview?: PredictionPreview | null
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
  preview,
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
      className="search-scene space-y-4"
      data-phase="complete"
      data-position={position}
    >
      {/* One quiet status line: step, comparisons, current comparison and view options */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs text-slate-400">
          Paso <strong className="text-slate-100">{position} de {events.length}</strong>
          <span className="mx-2 text-slate-600" aria-hidden="true">·</span>
          <span>Comparaciones: <strong className="text-slate-100">{comparisons}</strong></span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="comparison-badge" aria-label={comparison ? `Comparación: ${comparison}` : 'Sin comparación'}>
            {comparison ?? (event?.action === 'not_found' ? 'Rango vacío' : 'mid ↔ objetivo')}
          </p>
          <label className="view-option" title="Zoom automático al rango activo">
            <input type="checkbox" aria-label="Zoom automático al rango activo" checked={zoom} onChange={(event) => setZoom(event.target.checked)} />
            Zoom
          </label>
          {onToggleImmersive && (
            <button
              type="button"
              className="control"
              onClick={onToggleImmersive}
              aria-label="Entrar en modo inmersivo 3D"
              title="Modo inmersivo 3D"
            >
              3D
            </button>
          )}
        </div>
      </div>

      <div role="progressbar" aria-label="Progreso de reproducción" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="playback-progress">
        <div style={{ width: `${progress}%` }} />
      </div>

      {/* Compact minimap for large arrays */}
      {showMinimap && <ArrayOverview items={items} target={target} />}

      {/* Element inspector, shown only after clicking a bar */}
      {selectedItem && (
        <aside role="region" aria-label="Inspector de elemento" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-500/40 bg-sky-950/40 px-3 py-2 text-xs animate-fadeIn">
          <div className="flex flex-wrap items-center gap-3">
            <span className="sr-only">Elemento seleccionado:</span>
            <span className="font-mono text-slate-200">Índice: <strong>{selectedItem.index}</strong></span>
            <span className="font-mono text-slate-200">Valor: <strong className="text-emerald-300">{selectedItem.value}</strong></span>
            <span className="text-slate-300">
              {selectedItem.state === 'found' ? 'Objetivo encontrado' : selectedItem.state === 'mid' ? 'Elemento central evaluado' : selectedItem.state === 'discarded' ? 'Descartado' : 'Activo en rango'}
            </span>
            <span className="font-mono text-slate-400">
              {selectedItem.value === target ? '✓ Coincide con objetivo' : selectedItem.value < target ? `${selectedItem.value} < ${target}` : `${selectedItem.value} > ${target}`}
            </span>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-200"
            aria-label="Cerrar"
            title="Cerrar"
            onClick={() => setSelectedItemIndex(null)}
          >
            ✕
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
        preview={preview}
        onSelectItem={(index) => setSelectedItemIndex(selectedItemIndex === index ? null : index)}
      />

      {numbers.length === 0 && <p className="text-sm text-slate-400">Lista vacía: no hay elementos que comparar.</p>}

      {/* What just happened, in one sentence; the rest is one click away */}
      <div role="status" aria-atomic="true" className="space-y-2">
        <p className="text-base leading-relaxed text-slate-100">
          {event ? explainEvent(event, numbers, target) : 'Todavía no se ha ejecutado ningún paso.'}
        </p>
        <details className="step-details">
          <summary>Detalles</summary>
          <div className="mt-3 space-y-3">
            <p className="font-mono text-xs text-slate-300">
              <span className="uppercase tracking-widest text-emerald-400">{event?.action ?? 'Estado inicial'}</span>
              {event && (
                <>
                  <span className="mx-2 text-slate-600" aria-hidden="true">·</span>
                  left=<strong className="text-sky-300">{event.left}</strong> · mid=<strong className="text-amber-300">{event.mid ?? '—'}</strong> · right=<strong className="text-purple-300">{event.right}</strong>
                  <span className="mx-2 text-slate-600" aria-hidden="true">·</span>
                  Rango resultante: <strong className="text-emerald-300">{scene.after.right < scene.after.left ? 'vacío (no encontrado)' : `[${scene.after.left}, ${scene.after.right}]`}</strong>
                </>
              )}
            </p>
            <ol className="sequence-phases" aria-label="Secuencia visual">
              <li data-stage="comparison">1 · Desplazamiento & comparación</li>
              <li data-stage="discard">2 · {items.some((item) => item.pending) ? 'Atenuación de descarte' : event?.action === 'found' ? 'Coincidencia hallada' : 'Comprobación'}</li>
              <li data-stage="focus">3 · Enfoque del nuevo rango</li>
            </ol>
            <p className="text-xs leading-relaxed text-slate-400">
              Azul: en rango · Ámbar: mid · Verde: encontrado · Rayado: mitad descartada · Atenuado: fuera de rango. Las alturas representan el valor respecto a cero. Clic en una barra para inspeccionarla.
            </p>
          </div>
        </details>
      </div>
    </div>
  )
}
