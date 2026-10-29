import { useEffect, useId, useState } from 'react'
import type { AnimationClock } from '../playback/animationClock'

interface Props {
  labels: string[]
  position: number
  currentTime?: number
  clock?: AnimationClock
  onSeek: (position: number) => void
  onSeekContinuous?: (time: number) => void
}

export function EventTimeline({
  labels,
  position,
  currentTime,
  clock,
  onSeek,
  onSeekContinuous,
}: Props) {
  const id = useId()
  const total = Math.max(0, labels.length - 1)
  const [intraProgress, setIntraProgress] = useState(1)

  useEffect(() => {
    if (!clock) return
    return clock.subscribe((p) => {
      setIntraProgress(p)
    })
  }, [clock])

  // When scrubbing, currentTime takes precedence. When playing/stepping, clock drives intra-step time.
  const displayTime =
    currentTime !== undefined
      ? currentTime
      : position === 0
      ? 0
      : position - 1 + intraProgress

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(event.target.value)
    if (onSeekContinuous) {
      onSeekContinuous(val)
    } else {
      onSeek(Math.round(val))
    }
  }

  return (
    <section
      aria-label="Navegación entre eventos"
      className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
        <label htmlFor={id} className="font-medium">
          Línea de tiempo continua
        </label>
        <span className="font-mono text-xs text-slate-400">
          Progreso: <strong className="text-emerald-300">{displayTime.toFixed(2)}</strong> / {total}
        </span>
      </div>

      <input
        id={id}
        className="timeline-slider"
        type="range"
        min={0}
        max={total}
        step="any"
        value={displayTime}
        disabled={total === 0}
        aria-label="Línea de tiempo continua"
        aria-valuetext={`Paso ${position} de ${total}: ${labels[position] ?? 'Inicio'}`}
        onChange={handleChange}
      />

      <ol className="flex flex-wrap gap-2" aria-label="Pasos de la ejecución">
        {labels.map((label, index) => (
          <li key={index}>
            <button
              type="button"
              className={`timeline-step ${position === index ? 'is-current' : ''}`}
              aria-label={`Ir al paso ${index}: ${label}`}
              aria-current={position === index ? 'step' : undefined}
              onClick={() => onSeek(index)}
            >
              <span className="font-mono">{index.toString().padStart(2, '0')}</span> · {label}
            </button>
          </li>
        ))}
      </ol>
      <p className="text-xs text-slate-400">
        Arrastra la barra para navegar de forma continua por cualquier instante de la animación. Los botones permiten saltos directos.
      </p>
    </section>
  )
}
