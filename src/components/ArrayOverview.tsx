import type { ArrayItem } from './ArrayVisualization'

interface Props { items: ArrayItem[]; target: number }

export function ArrayOverview({ items, target }: Props) {
  const lower = Math.min(0, target, ...items.map((item) => item.value))
  const upper = Math.max(0, target, ...items.map((item) => item.value))
  const y = (value: number) => upper === lower ? 20 : 4 + (upper - value) / (upper - lower) * 32
  const zero = y(0)
  const slot = 1000 / Math.max(1, items.length)
  function path(part: ArrayItem[]) {
    return part.map((item) => {
      const x = item.index * slot + slot * 0.1
      const top = Math.min(zero, y(item.value))
      const width = Math.max(0.5, slot * 0.8)
      const height = Math.max(1, Math.abs(zero - y(item.value)))
      return `M${x},${top}h${width}v${height}h${-width}Z`
    }).join(' ')
  }
  return (
    <figure className="array-minimap">
      <figcaption className="mb-1.5 flex flex-wrap justify-between gap-2 text-[11px] text-slate-400">
        <span>Minimapa de contexto · {items.length} elementos</span>
        <span>Marco azul: ventana visible</span>
      </figcaption>
      <svg role="img" aria-label={`Vista general de los ${items.length} elementos del arreglo`} viewBox="0 0 1000 40" preserveAspectRatio="none" className="overview-svg">
        <path d={path(items)} fill="#64748b" opacity="0.3" />
        <path d={path(items.filter((item) => item.state !== 'discarded' && !item.pending && item.state !== 'mid' && item.state !== 'found'))} fill="#0284c7" />
        <g className="overview-discard">
          <path d={path(items.filter((item) => item.pending && item.state !== 'mid'))} fill="#0284c7" />
          <path d={path(items.filter((item) => item.pending && item.state === 'mid'))} fill="#fbbf24" />
        </g>
        <path d={path(items.filter((item) => !item.pending && (item.state === 'mid' || item.state === 'found')))} fill={items.some((item) => item.state === 'found') ? '#34d399' : '#fbbf24'} />
        <line x1="0" x2="1000" y1={y(target)} y2={y(target)} stroke="#34d399" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <rect className="overview-window" x={0} y={1} width={1000} height={38} rx={2} fill="#38bdf810" stroke="#7dd3fc" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
    </figure>
  )
}
