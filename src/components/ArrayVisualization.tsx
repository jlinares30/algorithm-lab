export type ArrayView = 'bars' | 'cells'

export interface ArrayItem {
  value: number
  index: number
  state: 'active' | 'discarded' | 'mid' | 'found'
  pending: boolean
  markers: string[]
  label: string
}

interface Pointer {
  label: string
  index: number | null
}

interface Props {
  items: ArrayItem[]
  view: ArrayView
  target: number
  pointers: Pointer[]
  range: { left: number; right: number } | null
  dense: boolean
  selectedItemIndex?: number | null
  onSelectItem?: (index: number) => void
}

export function ArrayVisualization({ items, view, target, pointers, range, dense, selectedItemIndex, onSelectItem }: Props) {
  const values = items.map((item) => item.value)
  const lower = Math.min(0, target, ...values)
  const upper = Math.max(0, target, ...values)
  const span = upper - lower || 1
  const y = (value: number) => upper === lower ? 50 : 8 + ((upper - value) / span) * 84
  const zero = y(0)
  const active = range ? Math.max(0, range.right - range.left + 1) : items.length
  const groups: { kind: string; items: ArrayItem[] }[] = []
  for (const item of items) {
    const kind = item.pending ? 'decision-half' : item.state === 'discarded' ? 'discarded-half' : 'retained-half'
    const last = groups.at(-1)
    if (last?.kind === kind) last.items.push(item)
    else groups.push({ kind, items: [item] })
  }

  return (
    <div role="region" aria-label={`Visualización de ${view === 'bars' ? 'barras' : 'celdas'}`} tabIndex={0} className="array-viewport array-detail" data-dense={dense}>
      <div className="array-canvas" data-view={view} style={{ width: '100%' }}>
        <div className="array-pointer-tracks" aria-hidden="true">
          {pointers.map((pointer, row) => (
            <div key={pointer.label} className="array-pointer" data-pointer={pointer.label} data-visible={pointer.index !== null && pointer.index >= 0 && pointer.index < items.length} style={{ left: `${((Math.max(0, Math.min(items.length - 1, pointer.index ?? 0)) + 0.5) / Math.max(1, items.length)) * 100}%`, top: `${row * 28}px`, opacity: pointer.index !== null && pointer.index >= 0 && pointer.index < items.length ? 1 : 0 }}>
              <span>{pointer.label} <b>{pointer.index ?? '—'}</b></span>
              <span className="block text-center leading-3">↓</span>
            </div>
          ))}
        </div>
        <div className="array-stage">
          <div className="array-range" aria-hidden="true" style={{ left: `${((range?.left ?? 0) / Math.max(1, items.length)) * 100}%`, width: `${(active / Math.max(1, items.length)) * 100}%`, opacity: active > 0 ? 1 : 0 }} />
          {view === 'bars' && items.length > 0 && (
            <div className="array-reference-lines" aria-hidden="true">
              <div className="array-zero-line" style={{ top: `${zero}%` }} />
              <div className="array-target-line" style={{ top: `${y(target)}%` }}><span>objetivo {target}</span></div>
            </div>
          )}
          <ol aria-label="Elementos de la lista" className="array-items">
            {groups.map((group) => (
              <li role="presentation" key={`${group.kind}-${group.items[0].index}`} className={`array-segment ${group.kind}`} style={{ width: `${group.items.length / Math.max(1, items.length) * 100}%` }}>
                <ol role="presentation" className="array-segment-items">
                  {group.items.map((item) => {
                    const height = Math.max(2, Math.abs(y(item.value) - zero))
                    const isSelected = selectedItemIndex === item.index
                    return (
                      <li
                        key={item.index}
                        aria-label={item.label}
                        className={`array-item cursor-pointer ${isSelected ? 'is-selected' : ''}`}
                        data-state={item.state}
                        data-pending={item.pending}
                        data-selected={isSelected}
                        title={item.pending ? 'Esta secuencia descarta este elemento tras mostrar la comparación.' : `${item.label} (Clic para inspeccionar)`}
                        onClick={() => onSelectItem?.(item.index)}
                      >
                        <div className="array-plot" aria-hidden="true">
                          <div
                            className={`array-glyph ${isSelected ? 'ring-2 ring-sky-400 shadow-lg shadow-sky-500/50' : ''}`}
                            style={{ top: view === 'bars' ? `${Math.min(y(item.value), zero)}%` : '20%', height: view === 'bars' ? `${height}%` : '64px' }}
                          >
                            {view === 'cells' && <span>{item.value}</span>}
                          </div>
                        </div>
                        <div className="array-item-caption" aria-hidden="true">
                          <span className={`array-value ${isSelected ? 'font-bold text-sky-300' : ''}`}>{item.value}</span>
                          <span className="array-index">{item.index}</span>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
