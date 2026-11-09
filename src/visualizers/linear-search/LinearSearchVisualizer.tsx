import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrayVisualization } from '../../components/ArrayVisualization'
import type { ArrayView } from '../../components/ArrayVisualization'
import { ArrayOverview } from '../../components/ArrayOverview'
import type { LinearSearchEvent } from '../../execution/linearSearch'
import { explainLinearEvent, getLinearSnapshot } from './model'

interface Props {
  numbers: number[]
  target: number
  events: LinearSearchEvent[]
  position: number
  view: ArrayView
  speed: number
}

export function LinearSearchVisualizer({ numbers, target, events, position, view, speed }: Props) {
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  const snapshot = useMemo(() => getLinearSnapshot(numbers, events, position), [numbers, events, position])
  const { event, current, comparisons, items } = snapshot

  const progress = Math.round((position / Math.max(1, events.length)) * 100)
  const comparison = current !== null
    ? `${numbers[current]} ${event?.action === 'found' ? '=' : '≠'} ${target}`
    : null
  const selectedItem = selectedItemIndex !== null ? items[selectedItemIndex] ?? null : null
  // CSS transitions follow the playback speed (one step lasts 1s at 1×).
  const style = { '--step-duration': `${Math.round(450 / speed)}ms` } as CSSProperties

  return (
    <div className="linear-scene space-y-5" style={style} data-position={position}>
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
          El puntero <code className="font-mono">i</code> recorre la lista de izquierda a derecha. Cada elemento revisado queda atenuado.
        </p>
        <p className="comparison-badge" aria-label={comparison ? `Comparación: ${comparison}` : 'Sin comparación'}>
          {comparison ?? (event?.action === 'not_found' ? 'Fin de la lista' : 'i ↔ objetivo')}
        </p>
      </div>

      <div className="main-visual-stage space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span className="font-semibold text-slate-200">Escenario Principal</span>
          <span className="font-mono text-slate-400">({numbers.length} elementos)</span>
          <span className="text-[11px] text-slate-500">· Clic en una barra para inspeccionar</span>
        </div>

        {numbers.length > 16 && (
          <div className="stage-minimap border-b border-slate-800/80 pb-3">
            <ArrayOverview items={items} target={target} />
          </div>
        )}

        {selectedItem && (
          <aside role="region" aria-label="Inspector de elemento" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-500/40 bg-sky-950/40 p-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-sky-200">Elemento seleccionado:</span>
              <span className="font-mono text-slate-200">Índice: <strong>{selectedItem.index}</strong></span>
              <span className="font-mono text-slate-200">Valor: <strong className="text-emerald-300">{selectedItem.value}</strong></span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                Estado: {selectedItem.state === 'found' ? 'Objetivo encontrado' : selectedItem.state === 'mid' ? 'Comparando ahora' : selectedItem.state === 'discarded' ? 'Revisado' : 'Sin revisar'}
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {selectedItem.value === target ? '✓ Coincide con objetivo' : `${selectedItem.value} ≠ ${target}`}
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
          pointers={[{ label: 'i', index: current }]}
          range={null}
          dense={numbers.length > 40}
          selectedItemIndex={selectedItemIndex}
          onSelectItem={(index) => setSelectedItemIndex(selectedItemIndex === index ? null : index)}
        />
      </div>

      {numbers.length === 0 && <p className="text-slate-400">Lista vacía: no hay elementos que comparar.</p>}
      <p className="text-xs leading-relaxed text-slate-400">
        Azul: sin revisar · Ámbar: comparando · Verde: encontrado · Atenuado: ya revisado. Las alturas representan el valor respecto a cero.
      </p>

      <div role="status" aria-atomic="true" className="min-h-28 rounded-xl border border-slate-700 bg-slate-950/60 p-5">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-emerald-400">{event?.action ?? 'Estado inicial'}</p>
        <p className="leading-relaxed text-slate-200">
          {event ? explainLinearEvent(event, numbers, target) : 'Todo está preparado. Avanza o reproduce para explorar los eventos de Python.'}
        </p>
        {event && (
          <p className="mt-3 font-mono text-xs text-slate-300">
            i=<strong className="text-amber-300">{current ?? '—'}</strong> · revisados: <strong className="text-sky-300">{comparisons}</strong> de {numbers.length}
          </p>
        )}
      </div>
    </div>
  )
}
