import type { SearchEvent } from '../../execution/binarySearch'

export function parseSearchInput(list: string, targetText: string) {
  const parts = list.trim() === '' ? [] : list.trim().split(/\s*[,;]\s*|\s+/)
  const integer = /^[+-]?\d+$/
  if (parts.some((part) => !integer.test(part) || !Number.isSafeInteger(Number(part)))) {
    throw new Error('La lista debe contener enteros seguros separados por comas o espacios.')
  }
  const numbers = parts.map(Number)
  if (numbers.length > 256) throw new Error('Introduce como máximo 256 números.')
  if (numbers.some((number, index) => index > 0 && number < numbers[index - 1])) {
    throw new Error('La lista debe estar ordenada de menor a mayor. Se permiten repetidos.')
  }
  if (!integer.test(targetText.trim()) || !Number.isSafeInteger(Number(targetText))) {
    throw new Error('El objetivo debe ser un entero seguro.')
  }
  return { numbers, target: Number(targetText) }
}

export function explainEvent(event: SearchEvent, numbers: number[], target: number) {
  if (event.action === 'not_found') {
    return `El rango está vacío (left=${event.left} > right=${event.right}). ${target} no está en la lista.`
  }
  const value = numbers[event.mid!]
  switch (event.action) {
    case 'found':
      return `${value} = ${target}. Objetivo encontrado en el índice ${event.mid}.`
    case 'move_right':
      return `${value} < ${target}. Se descarta la mitad izquierda, incluido mid. El siguiente left será ${event.mid! + 1}.`
    case 'move_left':
      return `${value} > ${target}. Se descarta la mitad derecha, incluido mid. El siguiente right será ${event.mid! - 1}.`
  }
}

// Snapshots are projections of recorded Python events, never accumulated UI state.
// This makes reverse playback and arbitrary timeline jumps equivalent to advancing.
export function getSearchSnapshot(numbers: number[], events: SearchEvent[], position: number) {
  const event = events[position - 1] ?? null
  return {
    event,
    comparisons: events.slice(0, position).filter((step) => step.mid !== null).length,
    items: numbers.map((value, index) => {
      const discarded = event !== null && (index < event.left || index > event.right)
      const mid = event?.mid === index
      const found = mid && event?.action === 'found'
      const markers = [event?.left === index ? 'left' : '', mid ? 'mid' : '', event?.right === index ? 'right' : ''].filter(Boolean)
      const pending = !discarded && event !== null && event.mid !== null
        && ((event.action === 'move_left' && index >= event.mid)
          || (event.action === 'move_right' && index <= event.mid))
      return {
        value, index, markers, pending,
        state: discarded ? 'discarded' as const : found ? 'found' as const : mid ? 'mid' as const : 'active' as const,
        label: `Índice ${index}: ${value}${discarded ? ', descartado' : ', en rango'}${markers.length ? `, ${markers.join(', ')}` : ''}${found ? ', encontrado' : ''}`,
      }
    }),
  }
}

export interface IndexRange { left: number; right: number }

export function getSearchScene(numbers: number[], events: SearchEvent[], position: number) {
  const snapshot = getSearchSnapshot(numbers, events, position)
  const { event } = snapshot
  const before = event ? { left: event.left, right: event.right } : { left: 0, right: numbers.length - 1 }
  // Read the resulting range from the NEXT Python event when available, or derive from action
  const next = events[position]
  let after = before
  if (event) {
    if (next) {
      after = { left: next.left, right: next.right }
    } else if (event.action === 'move_right' && event.mid !== null) {
      after = { left: event.mid + 1, right: event.right }
    } else if (event.action === 'move_left' && event.mid !== null) {
      after = { left: event.left, right: event.mid - 1 }
    } else if (event.action === 'found' && event.mid !== null) {
      after = { left: event.mid, right: event.mid }
    }
  }
  const previous = events[position - 2] ?? null
  return {
    ...snapshot, before, after,
    focusBefore: event?.mid ?? 0,
    focusAfter: event?.action === 'found' ? event.mid! : next?.mid ?? event?.mid ?? 0,
    zoomRange: event?.action === 'found' ? { left: event.mid!, right: event.mid! } : after,
    prevMid: previous?.mid ?? null,
  }
}
