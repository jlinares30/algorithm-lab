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

/** Above this many steps the per-step buttons are dropped; the slider still reaches every step. */
const maxStepButtons = 16

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
    <section aria-label="Navegación entre eventos" className="space-y-2">
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="sr-only">Línea de tiempo continua</label>
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
        <span className="shrink-0 font-mono text-xs text-slate-400" title="Progreso de la animación">
          <strong className="font-normal text-emerald-300">{displayTime.toFixed(2)}</strong> / {total}
        </span>
      </div>

      {labels.length <= maxStepButtons + 1 && (
        <ol className="flex flex-wrap justify-center gap-1.5" aria-label="Pasos de la ejecución">
          {labels.map((label, index) => (
            <li key={index}>
              <button
                type="button"
                className={`timeline-step ${position === index ? 'is-current' : ''}`}
                aria-label={`Ir al paso ${index}: ${label}`}
                aria-current={position === index ? 'step' : undefined}
                title={`${index} · ${label}`}
                onClick={() => onSeek(index)}
              >
                {index}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
