import { describe, expect, it } from 'vitest'
import { getSearchPrediction, getSearchSnapshot, parseSearchInput } from './model'
import type { SearchEvent } from '../../execution/binarySearch'
import { decodeSearchResult } from '../../execution/binarySearch'

describe('Entrada y protocolo de Python', () => {
  it('acepta negativos, repetidos, espacios y listas vacías', () => {
    expect(parseSearchInput('-3, -3; 0 12', '0')).toEqual({ numbers: [-3, -3, 0, 12], target: 0 })
    expect(parseSearchInput(' ', '-1')).toEqual({ numbers: [], target: -1 })
  })

  it.each(['2, 1', '1, texto', '1, 2.5', '1, Infinity', '9007199254740992', '1,,2', '1,'])('rechaza listas inválidas: %s', (list) => {
    expect(() => parseSearchInput(list, '1')).toThrow()
  })

  it.each(['', '2.5', 'NaN', '9007199254740992'])('rechaza objetivos inválidos: %s', (target) => {
    expect(() => parseSearchInput('1, 2', target)).toThrow()
  })

  it('adapta la tupla JSON y conserva mid=null en not_found', () => {
    expect(decodeSearchResult('[-1,[{"left":0,"mid":null,"right":-1,"action":"not_found"}]]'))
      .toEqual({ index: -1, events: [{ left: 0, mid: null, right: -1, action: 'not_found' }] })
  })

  it.each(['null', '[0,[]]', '[0,[{"left":0,"mid":null,"right":0,"action":"found"}]]', '[0,[{"left":0,"mid":0,"right":0,"action":"unknown"}]]'])('rechaza un protocolo inválido: %s', (json) => {
    expect(() => decodeSearchResult(json)).toThrow()
  })
})

describe('Proyección de eventos a estado visual', () => {
  const numbers = [2, 5, 9]
  // Recorded trace: target 1, no matching element.
  const events: SearchEvent[] = [
    { left: 0, mid: 1, right: 2, action: 'move_left' },
    { left: 0, mid: 0, right: 0, action: 'move_left' },
    { left: 0, mid: null, right: -1, action: 'not_found' },
  ]

  it('distingue la mitad por descartar de los descartes ya realizados', () => {
    const first = getSearchSnapshot(numbers, events, 1)
    expect(first.items.map((item) => item.pending)).toEqual([false, true, true])
    expect(first.items.map((item) => item.state)).toEqual(['active', 'mid', 'active'])
    const second = getSearchSnapshot(numbers, events, 2)
    expect(second.items.map((item) => item.state)).toEqual(['mid', 'discarded', 'discarded'])
    expect(second.items[0].markers).toEqual(['left', 'mid', 'right'])
  })

  it('reconstruye un salto hacia atrás y el inicio sin conservar descartes futuros', () => {
    const first = getSearchSnapshot(numbers, events, 1)
    expect(getSearchSnapshot(numbers, events, 3).items.every((item) => item.state === 'discarded')).toBe(true)
    expect(getSearchSnapshot(numbers, events, 1)).toEqual(first)
    const start = getSearchSnapshot(numbers, events, 0)
    expect(start.comparisons).toBe(0)
    expect(start.items.every((item) => item.state === 'active' && !item.pending && item.markers.length === 0)).toBe(true)
    expect(getSearchSnapshot(numbers, events, 3).comparisons).toBe(2)
  })

  it('representa una lista vacía y una coincidencia con punteros superpuestos', () => {
    const empty = getSearchSnapshot([], [{ left: 0, mid: null, right: -1, action: 'not_found' }], 1)
    expect(empty.items).toEqual([])
    expect(empty.comparisons).toBe(0)
    const found = getSearchSnapshot([-3], [{ left: 0, mid: 0, right: 0, action: 'found' }], 1)
    expect(found.items[0].state).toBe('found')
    expect(found.items[0].markers).toEqual(['left', 'mid', 'right'])
  })
})

describe('Preguntas de predicción de Binary Search', () => {
  const list = [2, 5, 9, 14, 20]

  it('toma la respuesta del paso grabado por Python', () => {
    const question = getSearchPrediction(list, 14, { left: 0, mid: 2, right: 4, action: 'move_right' })
    expect(question.answer).toBe('move_right')
    expect(question.prompt).toContain('left=0, right=4')
    expect(question.prompt).toContain('índice 2 (valor 9)')
    expect(question.options.map((option) => option.id)).toEqual(['move_right', 'move_left', 'found', 'not_found'])
  })

  it('pregunta por el rango vacío cuando no hay mid', () => {
    const question = getSearchPrediction(list, 3, { left: 1, mid: null, right: 0, action: 'not_found' })
    expect(question.answer).toBe('not_found')
    expect(question.prompt).toContain('left=1, right=0')
  })
})

describe('Vista previa de las opciones de Binary Search', () => {
  const list = [2, 5, 9, 14, 20]
  const previews = (event: SearchEvent) =>
    Object.fromEntries(getSearchPrediction(list, 14, event).options.map((option) => [option.id, option.preview]))

  it('marca la mitad que descartaría cada opción, incluido mid', () => {
    expect(previews({ left: 0, mid: 2, right: 4, action: 'move_right' })).toEqual({
      move_right: { kind: 'discard', from: 0, to: 2 },
      move_left: { kind: 'discard', from: 2, to: 4 },
      found: { kind: 'found', from: 2, to: 2 },
      not_found: { kind: 'discard', from: 0, to: 4 },
    })
  })

  it('no depende de cuál sea la respuesta correcta', () => {
    const base = { left: 0, mid: 2, right: 4 }
    expect(previews({ ...base, action: 'move_left' })).toEqual(previews({ ...base, action: 'found' }))
  })

  it('no ofrece vista previa de mid cuando el rango está vacío', () => {
    const empty = previews({ left: 3, mid: null, right: 2, action: 'not_found' })
    expect(empty.move_right).toBeUndefined()
    expect(empty.found).toBeUndefined()
  })
})
