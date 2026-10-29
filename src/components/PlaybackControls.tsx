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

export function PlaybackControls(props: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-6">
      <button className="control" onClick={props.onPrevious} disabled={props.position === 0}>Retroceder</button>
      <button className="control control-primary" onClick={props.onToggle} disabled={props.total === 0}>
        {props.playing ? 'Pausar' : 'Reproducir'}
      </button>
      <button className="control" onClick={props.onNext} disabled={props.position === props.total}>Avanzar</button>
      <button className="control" onClick={props.onReset} disabled={props.position === 0 && !props.playing}>Reiniciar</button>
      <label className="flex items-center gap-3 text-sm text-slate-300 sm:ml-auto">
        Velocidad
        <select className="field w-auto" value={props.speed} onChange={(event) => props.onSpeedChange(Number(event.target.value))}>
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={2}>2×</option>
          <option value={4}>4×</option>
        </select>
      </label>
    </div>
  )
}
