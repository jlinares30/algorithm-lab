import { describe, expect, it } from 'vitest'
import { decodeChallengeRun } from '../execution/challenge'
import type { ChallengeRun, RawStep } from '../execution/challenge'
import { describeStep, findFault, getFaultySnapshot, makeChallengeData } from './model'

// Steps as Python would record them; no search is computed here.
const correct: RawStep[] = [
  { left: 0, mid: 2, right: 4, action: 'move_right' },
  { left: 3, mid: 3, right: 4, action: 'found' },
]

function run(actual: Partial<ChallengeRun['actual']>): Pick<ChallengeRun, 'expected' | 'actual'> {
  return {
    expected: { index: 3, steps: correct },
    actual: { status: 'finished', index: 3, steps: correct, message: null, ...actual },
  }
}

describe('Localizar el fallo', () => {
  it('no encuentra fallo cuando la copia hace lo mismo', () => {
    expect(findFault('binary_search', run({}))).toEqual({ kind: 'none' })
  })

  it('ignora claves que no son parte del contrato', () => {
    const steps = correct.map((step) => ({ ...step, extra: 'x' }))
    expect(findFault('binary_search', run({ steps }))).toEqual({ kind: 'none' })
  })

  it('señala el primer paso que difiere', () => {
    const steps = [correct[0], { left: 2, mid: 3, right: 4, action: 'found' }]
    expect(findFault('binary_search', run({ steps }))).toEqual({ kind: 'step', position: 2 })
  })

  it('señala el primer paso de más', () => {
    const steps = [...correct, { left: 4, mid: 4, right: 4, action: 'move_left' }]
    expect(findFault('binary_search', run({ steps }))).toEqual({ kind: 'step', position: 3 })
  })

  it('señala el final si se detiene antes, falla o devuelve otro resultado', () => {
    expect(findFault('binary_search', run({ steps: [correct[0]] }))).toEqual({ kind: 'end' })
    expect(findFault('binary_search', run({ status: 'crashed', index: null, message: 'IndexError' }))).toEqual({ kind: 'end' })
    expect(findFault('binary_search', run({ index: -1 }))).toEqual({ kind: 'end' })
  })
})

describe('Proyección de una ejecución con fallo', () => {
  it('describe el paso tal como se registró', () => {
    expect(describeStep('binary_search', { left: 0, mid: null, action: 'x' })).toBe('left 0 · mid — · right (falta) · action x')
  })

  it('no dibuja punteros fuera de la lista ni falla con ellos', () => {
    const snapshot = getFaultySnapshot('binary_search', [1, 2, 3], [{ left: 1, mid: 7, right: 9, action: 'move_right' }], 1)

    expect(snapshot.items.map((item) => item.state)).toEqual(['discarded', 'active', 'active'])
    expect(snapshot.range).toEqual({ left: 1, right: 2 })
  })

  it('marca lo ya revisado en una búsqueda lineal', () => {
    const steps = [{ index: 0, action: 'check' }, { index: 2, action: 'check' }]
    const snapshot = getFaultySnapshot('linear_search', [5, 6, 7], steps, 2)

    expect(snapshot.items.map((item) => item.state)).toEqual(['discarded', 'active', 'mid'])
  })
})

describe('Datos de un reto', () => {
  it('genera una lista ordenada y sin repetidos para Binary Search', () => {
    for (let round = 0; round < 20; round++) {
      const { numbers, targets, sorted } = makeChallengeData('binary_search')

      expect(sorted).toBe(true)
      expect(numbers).toEqual([...new Set(numbers)].sort((a, b) => a - b))
      expect(numbers.length).toBeGreaterThanOrEqual(6)
      expect(targets.some((target) => !numbers.includes(target))).toBe(true)
      expect(numbers.every((value) => targets.includes(value))).toBe(true)
    }
  })

  it('no exige orden para Linear Search', () => {
    expect(makeChallengeData('linear_search').sorted).toBe(false)
  })
})

describe('Decodificar un reto', () => {
  const mutation = { line: 6, original: 'a', mutated: 'b', source: 'c' }

  it('acepta pasos que rompen el contrato y descarta lo que no es un paso', () => {
    const json = JSON.stringify({
      mutation,
      target: 7,
      expected: { index: 3, steps: correct },
      actual: { status: 'endless', index: null, steps: [{ mid: 99 }, 'x', null], message: null },
    })

    const decoded = decodeChallengeRun(json)
    expect(decoded.actual).toEqual({ status: 'endless', index: null, steps: [{ mid: 99 }], message: null })
    expect(decoded.mutation).toEqual(mutation)
    expect(decoded.target).toBe(7)
  })

  it('rechaza una respuesta sin el cambio realizado o sin la ejecución correcta', () => {
    const actual = { status: 'finished', index: 3, steps: [], message: null }
    expect(() => decodeChallengeRun(JSON.stringify({ target: 7, expected: { index: 3, steps: [] }, actual }))).toThrow(/inválido/)
    expect(() => decodeChallengeRun(JSON.stringify({ mutation, target: 7, actual }))).toThrow(/inválido/)
  })
})
