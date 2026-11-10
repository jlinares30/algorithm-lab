import { describe, expect, it } from 'vitest'
import { decodeLinearSearchResult } from './linearSearch'

const json = (value: unknown) => JSON.stringify(value)

describe('Contrato de linear_search (Python → interfaz)', () => {
  it('acepta una secuencia que termina en found', () => {
    const result = decodeLinearSearchResult(json([2, [
      { index: 0, action: 'check' },
      { index: 1, action: 'check' },
      { index: 2, action: 'found' },
    ]]), 5)
    expect(result.index).toBe(2)
    expect(result.events.map((event) => event.action)).toEqual(['check', 'check', 'found'])
  })

  it('acepta not_found con índice None e ignora claves extra como current', () => {
    const result = decodeLinearSearchResult(json([-1, [
      { index: 0, current: 4, action: 'check' },
      { index: null, action: 'not_found' },
    ]]), 1)
    expect(result).toEqual({ index: -1, events: [{ index: 0, action: 'check' }, { index: null, action: 'not_found' }] })
  })

  it('acepta una lista vacía con un único not_found', () => {
    expect(decodeLinearSearchResult(json([-1, [{ index: null, action: 'not_found' }]]), 0).events).toHaveLength(1)
  })

  it('explica el formato esperado cuando Python solo devuelve el índice', () => {
    expect(() => decodeLinearSearchResult(json(3), 5)).toThrow(/debe devolver \(índice, steps\)/)
  })

  it.each([
    ['acción desconocida', [0, [{ index: 0, action: 'move_right' }]]],
    ['índice fuera de rango', [-1, [{ index: 9, action: 'check' }, { index: null, action: 'not_found' }]]],
    ['found antes del final', [0, [{ index: 0, action: 'found' }, { index: 1, action: 'check' }]]],
    ['not_found con índice', [-1, [{ index: 0, action: 'not_found' }]]],
    ['sin paso final', [-1, [{ index: 0, action: 'check' }]]],
    ['índice devuelto distinto del último paso', [1, [{ index: 0, action: 'found' }]]],
    ['not_found con índice devuelto distinto de -1', [0, [{ index: null, action: 'not_found' }]]],
  ])('rechaza %s', (_, value) => {
    expect(() => decodeLinearSearchResult(json(value), 3)).toThrow()
  })
})
