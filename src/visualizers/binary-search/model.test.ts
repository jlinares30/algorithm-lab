import { describe, expect, it } from 'vitest'
import { getSearchSnapshot, parseSearchInput } from './model'
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
