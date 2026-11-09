import { describe, expect, it } from 'vitest'
import type { LinearSearchEvent } from '../../execution/linearSearch'
import { explainLinearEvent, getLinearSnapshot, parseLinearSearchInput } from './model'

const numbers = [42, 7, 19, 3]
const found: LinearSearchEvent[] = [
  { index: 0, action: 'compare' },
  { index: 1, action: 'compare' },
  { index: 2, action: 'found' },
]
const missing: LinearSearchEvent[] = [
  { index: 0, action: 'compare' },
  { index: 1, action: 'compare' },
  { index: 2, action: 'compare' },
  { index: 3, action: 'compare' },
  { index: null, action: 'not_found' },
]

const states = (events: LinearSearchEvent[], position: number) =>
  getLinearSnapshot(numbers, events, position).items.map((item) => item.state)

describe('Modelo de Linear Search', () => {
  it('acepta listas desordenadas', () => {
    expect(parseLinearSearchInput('42, 7, 19, 3', '19')).toEqual({ numbers: [42, 7, 19, 3], target: 19 })
    expect(() => parseLinearSearchInput('1, x', '1')).toThrow(/enteros/)
  })

  it('parte de una lista sin revisar', () => {
    const snapshot = getLinearSnapshot(numbers, found, 0)
    expect(snapshot.event).toBeNull()
    expect(snapshot.current).toBeNull()
    expect(snapshot.comparisons).toBe(0)
    expect(states(found, 0)).toEqual(['active', 'active', 'active', 'active'])
  })

  it('marca el elemento comparado y atenúa los ya revisados', () => {
    expect(states(found, 2)).toEqual(['discarded', 'mid', 'active', 'active'])
    expect(getLinearSnapshot(numbers, found, 2).comparisons).toBe(2)
  })

  it('resalta el elemento encontrado', () => {
    expect(states(found, 3)).toEqual(['discarded', 'discarded', 'found', 'active'])
  })

  it('atenúa toda la lista cuando no hay coincidencias', () => {
    const snapshot = getLinearSnapshot(numbers, missing, 5)
    expect(snapshot.current).toBeNull()
    expect(snapshot.comparisons).toBe(4)
    expect(states(missing, 5)).toEqual(['discarded', 'discarded', 'discarded', 'discarded'])
  })

  it('proyecta igual al retroceder que al avanzar', () => {
    expect(getLinearSnapshot(numbers, found, 1)).toEqual(getLinearSnapshot(numbers, found, 1))
    expect(states(found, 1)).toEqual(['mid', 'active', 'active', 'active'])
  })

  it('explica cada paso', () => {
    expect(explainLinearEvent(found[0], numbers, 19)).toBe('42 ≠ 19. Se avanza al índice 1.')
    expect(explainLinearEvent(found[2], numbers, 19)).toBe('19 = 19. Objetivo encontrado en el índice 2.')
    expect(explainLinearEvent(missing[3], numbers, 5)).toBe('3 ≠ 5. Se avanza al final de la lista.')
    expect(explainLinearEvent(missing[4], numbers, 5)).toBe('Se revisaron los 4 elementos sin coincidencias. 5 no está en la lista.')
  })
})
