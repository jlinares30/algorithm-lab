interface Props {
  position: number
  total: number
  playing: boolean
  speed: number
  onPrevious: () => void
  onNext: () => void
  onToggle: () => void
  onReset: () => void
  onSpeedChange: (speed: number) => void
}

// Icon-only transport: names live in aria-label/title so the row stays quiet.
export function PlaybackControls(props: Props) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button className="control control-icon" aria-label="Reiniciar" title="Reiniciar" onClick={props.onReset} disabled={props.position === 0 && !props.playing}>⏮</button>
      <button className="control control-icon" aria-label="Retroceder" title="Retroceder" onClick={props.onPrevious} disabled={props.position === 0}>◀</button>
      <button
        className="control control-primary control-icon"
        aria-label={props.playing ? 'Pausar' : 'Reproducir'}
        title={props.playing ? 'Pausar' : 'Reproducir'}
        onClick={props.onToggle}
        disabled={props.total === 0}
      >
        {props.playing ? '⏸' : '▶'}
      </button>
      <button className="control control-icon" aria-label="Avanzar" title="Avanzar" onClick={props.onNext} disabled={props.position === props.total}>▶▏</button>
      <select
        className="field ml-2 w-auto"
        aria-label="Velocidad"
        title="Velocidad"
        value={props.speed}
        onChange={(event) => props.onSpeedChange(Number(event.target.value))}
      >
        <option value={0.5}>0.5×</option>
        <option value={1}>1×</option>
        <option value={2}>2×</option>
        <option value={4}>4×</option>
      </select>
    </div>
  )
}
