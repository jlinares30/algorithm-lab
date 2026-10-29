import { useState } from 'react'

interface Props {
  numbers: number[]
  disabled: boolean
  onGenerate: (numbers: number[], target: number) => void
  onTargetChange: (target: number) => void
}

export function ArrayInputTools({ numbers, disabled, onGenerate, onTargetChange }: Props) {
  const [size, setSize] = useState(11)
  const choices = [...new Set(numbers)]

  function generate() {
    // Input data only: native sort is unrelated to the recorded search execution.
    const generated = Array.from({ length: size }, () => Math.floor(Math.random() * 200) - 50).sort((a, b) => a - b)
    onGenerate(generated, generated[Math.floor(Math.random() * generated.length)])
  }

  return (
    <fieldset disabled={disabled} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 p-4">
      <legend className="px-2 text-xs uppercase tracking-wider text-slate-400">Experimentar con datos</legend>
      <label className="space-y-2 text-xs text-slate-300">
        <span className="block">Tamaño de la lista aleatoria</span>
        <select className="field w-auto" value={size} onChange={(event) => setSize(Number(event.target.value))}>
          {[5, 11, 20, 40, 80, 256].map((count) => <option key={count} value={count}>{count} elementos</option>)}
        </select>
      </label>
      <button type="button" className="control" onClick={generate}>Generar lista</button>
      <label className="min-w-0 space-y-2 text-xs text-slate-300">
        <span className="block">Elegir objetivo de la lista</span>
        <select className="field" value="" disabled={disabled || choices.length === 0} onChange={(event) => onTargetChange(Number(event.target.value))}>
          <option value="" disabled>Seleccionar valor…</option>
          {choices.map((number) => <option key={number} value={number}>{number}</option>)}
        </select>
      </label>
      <button type="button" className="control" disabled={disabled || numbers.length === 0} onClick={() => onTargetChange(numbers[Math.floor(Math.random() * numbers.length)])}>Objetivo aleatorio</button>
    </fieldset>
  )
}
