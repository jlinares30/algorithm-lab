import { useState } from 'react'
import type { PointerEvent } from 'react'

export interface ChartSeries {
  id: string
  name: string
  /** Short note shown next to the name in the legend (e.g. the stated complexity). */
  note?: string
  color: string
  points: { n: number; value: number }[]
}

interface Props {
  series: ChartSeries[]
  scale: 'linear' | 'log'
  yLabel: string
}

// Plot geometry in viewBox units; the SVG scales to its container.
const width = 720
const height = 340
const margin = { top: 16, right: 120, bottom: 40, left: 52 }
const plotWidth = width - margin.left - margin.right
const plotHeight = height - margin.top - margin.bottom
const surface = '#0f172a'

const format = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1))

function linearTicks(max: number) {
  const rough = max / 4
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rough) ?? rough
  const ticks: number[] = []
  for (let tick = 0; tick <= max + step * 0.001; tick += step) ticks.push(tick)
  return ticks
}

function logTicks(max: number) {
  const ticks: number[] = []
  for (let tick = 1; tick <= max; tick *= 10) ticks.push(tick)
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] * 10)
  return ticks
}

export function ComplexityChart({ series, scale, yLabel }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const sizes = series[0]?.points.map((point) => point.n) ?? []
  const maxN = Math.max(1, ...sizes)
  const maxValue = Math.max(1, ...series.flatMap((item) => item.points.map((point) => point.value)))
  const ticks = scale === 'log' ? logTicks(maxValue) : linearTicks(maxValue)
  const top = ticks[ticks.length - 1]

  const x = (n: number) => margin.left + (n / maxN) * plotWidth
  const y = (value: number) => {
    const ratio = scale === 'log'
      ? Math.log10(Math.max(1, value)) / Math.log10(Math.max(10, top))
      : value / top
    return margin.top + plotHeight - ratio * plotHeight
  }

  function handlePointer(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    if (box.width === 0 || sizes.length === 0) return
    const pointerN = (((event.clientX - box.left) / box.width) * width - margin.left) / plotWidth * maxN
    let nearest = 0
    sizes.forEach((n, index) => {
      if (Math.abs(n - pointerN) < Math.abs(sizes[nearest] - pointerN)) nearest = index
    })
    setHovered(nearest)
  }

  // Direct labels at the line ends, nudged apart when two series finish close together.
  const ends = series
    .map((item) => ({ item, y: y(item.points[item.points.length - 1]?.value ?? 0) }))
    .sort((a, b) => a.y - b.y)
  for (let index = 1; index < ends.length; index += 1) {
    if (ends[index].y - ends[index - 1].y < 14) ends[index].y = ends[index - 1].y + 14
  }

  const hoveredN = hovered === null ? null : sizes[hovered]

  return (
    <figure className="space-y-3">
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-200" aria-label="Leyenda">
        {series.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-5 rounded" style={{ background: item.color }} aria-hidden="true" />
            {item.name}
            {item.note && <span className="font-mono text-xs text-slate-400">{item.note}</span>}
          </li>
        ))}
      </ul>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${yLabel} según el tamaño de la lista, para ${series.map((item) => item.name).join(' y ')}`}
          className="block w-full"
          onPointerMove={handlePointer}
          onPointerLeave={() => setHovered(null)}
        >
          {/* Recessive grid and axes */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={margin.left} x2={margin.left + plotWidth} y1={y(tick)} y2={y(tick)} stroke="#1e293b" strokeWidth={1} />
              <text x={margin.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize={11} fill="#94a3b8" fontFamily="ui-monospace, monospace">
                {tick}
              </text>
            </g>
          ))}
          {sizes.filter((_, index) => index % 2 === 1).map((n) => (
            <text key={n} x={x(n)} y={margin.top + plotHeight + 18} textAnchor="middle" fontSize={11} fill="#94a3b8" fontFamily="ui-monospace, monospace">
              {n}
            </text>
          ))}
          <text x={margin.left + plotWidth / 2} y={height - 4} textAnchor="middle" fontSize={11} fill="#94a3b8">
            Elementos en la lista (n)
          </text>

          {/* Crosshair snapped to the nearest measured size */}
          {hoveredN !== null && (
            <line x1={x(hoveredN)} x2={x(hoveredN)} y1={margin.top} y2={margin.top + plotHeight} stroke="#475569" strokeWidth={1} />
          )}

          {series.map((item) => (
            <g key={item.id}>
              <polyline
                points={item.points.map((point) => `${x(point.n)},${y(point.value)}`).join(' ')}
                fill="none"
                stroke={item.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {item.points.map((point, index) => (
                <circle
                  key={point.n}
                  cx={x(point.n)}
                  cy={y(point.value)}
                  r={hovered === index ? 5 : 4}
                  fill={item.color}
                  stroke={surface}
                  strokeWidth={2}
                />
              ))}
            </g>
          ))}

          {/* Direct labels: text in ink, identity carried by the line it sits next to */}
          {ends.map(({ item, y: labelY }) => (
            <text key={item.id} x={margin.left + plotWidth + 10} y={labelY} dy="0.32em" fontSize={12} fill="#e2e8f0">
              {item.name}
            </text>
          ))}
        </svg>

        {hovered !== null && hoveredN !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-2 z-10 rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs shadow-lg"
            style={x(hoveredN) > width / 2
              ? { right: `${100 - (x(hoveredN) / width) * 100 + 1.5}%` }
              : { left: `${(x(hoveredN) / width) * 100 + 1.5}%` }}
          >
            <p className="mb-1 font-mono text-slate-400">n = {hoveredN}</p>
            {series.map((item) => (
              <p key={item.id} className="flex items-center gap-2 text-slate-300">
                <span className="inline-block h-0.5 w-3 rounded" style={{ background: item.color }} aria-hidden="true" />
                <strong className="font-mono text-slate-100">{format(item.points[hovered]?.value ?? 0)}</strong>
                {item.name}
              </p>
            ))}
          </div>
        )}
      </div>

      <details className="step-details">
        <summary>Ver tabla</summary>
        <table className="mt-3 w-full max-w-xl text-left font-mono text-xs text-slate-300">
          <caption className="sr-only">{yLabel} por tamaño de lista</caption>
          <thead>
            <tr className="text-slate-400">
              <th scope="col" className="py-1 pr-4 font-normal">n</th>
              {series.map((item) => <th key={item.id} scope="col" className="py-1 pr-4 font-normal">{item.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {sizes.map((n, index) => (
              <tr key={n} className="border-t border-slate-800">
                <th scope="row" className="py-1 pr-4 font-normal text-slate-400">{n}</th>
                {series.map((item) => <td key={item.id} className="py-1 pr-4">{format(item.points[index]?.value ?? 0)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
