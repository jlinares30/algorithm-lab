import type { ArrayItem } from '../../components/ArrayVisualization'
import type { LinearSearchEvent } from '../../execution/linearSearch'
import { parseNumberList, parseTarget } from '../../input/parseNumbers'
import type { PredictionQuestion } from '../../prediction/usePrediction'

export function parseLinearSearchInput(list: string, targetText: string) {
  // Linear search works on any order, so the list is not required to be sorted.
  const numbers = parseNumberList(list, { requireSorted: false })
  return { numbers, target: parseTarget(targetText) }
}

export function explainLinearEvent(event: LinearSearchEvent, numbers: number[], target: number) {
  if (event.action === 'not_found') {
    return `Se revisaron los ${numbers.length} elementos sin coincidencias. ${target} no está en la lista.`
  }
  const value = numbers[event.index!]
  if (event.action === 'found') {
    return `${value} = ${target}. Objetivo encontrado en el índice ${event.index}.`
  }
  const next = event.index! + 1
  return `${value} ≠ ${target}. Se avanza al ${next < numbers.length ? `índice ${next}` : 'final de la lista'}.`
}

// Snapshots are projections of recorded Python events, never accumulated UI state.
// This makes reverse playback and arbitrary timeline jumps equivalent to advancing.
export function getLinearSnapshot(numbers: number[], events: LinearSearchEvent[], position: number) {
  const event = events[position - 1] ?? null
  const seen = events.slice(0, position)
  const checked = new Set(
    seen.filter((step) => step !== event && step.index !== null).map((step) => step.index)
  )
  const current = event?.index ?? null
  const items: ArrayItem[] = numbers.map((value, index) => {
    const isCurrent = current === index
    const found = isCurrent && event?.action === 'found'
    const wasChecked = checked.has(index) || (event?.action === 'not_found')
    const state = found ? 'found' as const : isCurrent ? 'mid' as const : wasChecked ? 'discarded' as const : 'active' as const
    return {
      value,
      index,
      pending: false,
      markers: isCurrent ? ['i'] : [],
      state,
      label: `Índice ${index}: ${value}${found ? ', encontrado' : isCurrent ? ', comparando' : wasChecked ? ', revisado' : ', sin revisar'}`,
    }
  })
  return {
    event,
    current,
    comparisons: seen.filter((step) => step.index !== null).length,
    items,
  }
}

const linearPredictionOptions: { id: LinearSearchEvent['action']; label: string }[] = [
  { id: 'check', label: 'No coincide: avanzar al siguiente' },
  { id: 'found', label: 'Encontrado: es el objetivo' },
  { id: 'not_found', label: 'Fin de la lista: el objetivo no está' },
]

/** Question about a step that has not been revealed yet; the answer is the recorded action. */
export function getLinearPrediction(numbers: number[], target: number, event: LinearSearchEvent): PredictionQuestion {
  return {
    prompt: event.index === null
      ? `Ya no quedan elementos por revisar. El objetivo es ${target}. ¿Qué hace el algoritmo?`
      : `El puntero i llega al índice ${event.index} (valor ${numbers[event.index]}). El objetivo es ${target}. ¿Qué hace el algoritmo?`,
    options: linearPredictionOptions,
    answer: event.action,
  }
}
