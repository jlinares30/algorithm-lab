import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrayVisualization } from '../../components/ArrayVisualization'
import type { ArrayView } from '../../components/ArrayVisualization'
import { ArrayOverview } from '../../components/ArrayOverview'
import type { LinearSearchEvent } from '../../execution/linearSearch'
import type { PredictionFocus, PredictionPreview } from '../../prediction/usePrediction'
import { explainLinearEvent, getLinearSnapshot } from './model'

interface Props {
  numbers: number[]
  target: number
  events: LinearSearchEvent[]
  position: number
  view: ArrayView
  speed: number
  preview?: PredictionPreview | null
  focus?: PredictionFocus | null
}

export function LinearSearchVisualizer({ numbers, target, events, position, view, speed, preview, focus }: Props) {
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  const snapshot = useMemo(() => getLinearSnapshot(numbers, events, position), [numbers, events, position])
  const { event, current, comparisons } = snapshot
  // While a question points at the next element, the one just compared is
  // already settled: the recorded step says it did not match.
  const items = focus && event?.action === 'check'
    ? snapshot.items.map((item) => item.index === current
      ? { ...item, state: 'discarded' as const, label: `Índice ${item.index}: ${item.value}, revisado` }
      : item)
    : snapshot.items

  const progress = Math.round((position / Math.max(1, events.length)) * 100)
  const comparison = current !== null
    ? `${numbers[current]} ${event?.action === 'found' ? '=' : '≠'} ${target}`
    : null
  const selectedItem = selectedItemIndex !== null ? items[selectedItemIndex] ?? null : null
  // CSS transitions follow the playback speed (one step lasts 1s at 1×).
  const style = { '--step-duration': `${Math.round(450 / speed)}ms` } as CSSProperties

  return (
    <div className="linear-scene space-y-4" style={style} data-position={position}>
      {/* One quiet status line: step, comparisons and the current comparison */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs text-slate-400">
          Paso <strong className="text-slate-100">{position} de {events.length}</strong>
          <span className="mx-2 text-slate-600" aria-hidden="true">·</span>
          <span>Comparaciones: <strong className="text-slate-100">{comparisons}</strong></span>
        </p>
        <p className="comparison-badge" aria-label={comparison ? `Comparación: ${comparison}` : 'Sin comparación'}>
          {comparison ?? (event?.action === 'not_found' ? 'Fin de la lista' : 'i ↔ objetivo')}
        </p>
      </div>

      <div role="progressbar" aria-label="Progreso de reproducción" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="playback-progress">
        <div style={{ width: `${progress}%` }} />
      </div>

      {numbers.length > 16 && <ArrayOverview items={items} target={target} />}

      {/* Element inspector, shown only after clicking a bar */}
      {selectedItem && (
        <aside role="region" aria-label="Inspector de elemento" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-500/40 bg-sky-950/40 px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="sr-only">Elemento seleccionado:</span>
            <span className="font-mono text-slate-200">Índice: <strong>{selectedItem.index}</strong></span>
            <span className="font-mono text-slate-200">Valor: <strong className="text-emerald-300">{selectedItem.value}</strong></span>
            <span className="text-slate-300">
              {selectedItem.state === 'found' ? 'Objetivo encontrado' : selectedItem.state === 'mid' ? 'Comparando ahora' : selectedItem.state === 'discarded' ? 'Revisado' : 'Sin revisar'}
            </span>
            <span className="font-mono text-slate-400">
              {selectedItem.value === target ? '✓ Coincide con objetivo' : `${selectedItem.value} ≠ ${target}`}
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
        pointers={[{ label: 'i', index: current }]}
        range={null}
        dense={numbers.length > 40}
        selectedItemIndex={selectedItemIndex}
        preview={preview}
        focus={focus}
        onSelectItem={(index) => setSelectedItemIndex(selectedItemIndex === index ? null : index)}
      />

      {numbers.length === 0 && <p className="text-sm text-slate-400">Lista vacía: no hay elementos que comparar.</p>}

      {/* What just happened, in one sentence; the rest is one click away */}
      <div role="status" aria-atomic="true" className="space-y-2">
        <p className="text-base leading-relaxed text-slate-100">
          {event ? explainLinearEvent(event, numbers, target) : 'Todavía no se ha ejecutado ningún paso.'}
        </p>
        <details className="step-details">
          <summary>Detalles</summary>
          <div className="mt-3 space-y-3">
            <p className="font-mono text-xs text-slate-300">
              <span className="uppercase tracking-widest text-emerald-400">{event?.action ?? 'Estado inicial'}</span>
              {event && (
                <>
                  <span className="mx-2 text-slate-600" aria-hidden="true">·</span>
                  i=<strong className="text-amber-300">{current ?? '—'}</strong> · revisados: <strong className="text-sky-300">{comparisons}</strong> de {numbers.length}
                </>
              )}
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              Azul: sin revisar · Ámbar: comparando · Verde: encontrado · Atenuado: ya revisado. Las alturas representan el valor respecto a cero. Clic en una barra para inspeccionarla.
            </p>
          </div>
        </details>
      </div>
    </div>
  )
}
