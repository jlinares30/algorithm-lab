import { describe, expect, it } from 'vitest'
import { parseVariant } from '../catalog/variants'
import { decodeVariantRun } from '../execution/variant'
import type { RawStep, VariantRun } from '../execution/variant'
import { describeStep, findFault, getVariantSnapshot } from './model'

// Steps as Python would record them; no search is computed here.
const correct: RawStep[] = [
  { left: 0, mid: 2, right: 4, action: 'move_right' },
  { left: 3, mid: 3, right: 4, action: 'found' },
]

function run(actual: Partial<VariantRun['actual']>): VariantRun {
  return {
    expected: { index: 3, steps: correct },
    actual: { status: 'finished', index: 3, steps: correct, message: null, ...actual },
  }
}

describe('Localizar el fallo', () => {
  it('no encuentra fallo cuando la variante hace lo mismo', () => {
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

describe('Proyección de una variante', () => {
  it('describe el paso tal como se registró', () => {
    expect(describeStep('binary_search', { left: 0, mid: null, action: 'x' })).toBe('left 0 · mid — · right (falta) · action x')
  })

  it('no dibuja punteros fuera de la lista ni falla con ellos', () => {
    const snapshot = getVariantSnapshot('binary_search', [1, 2, 3], [{ left: 1, mid: 7, right: 9, action: 'move_right' }], 1)

    expect(snapshot.items.map((item) => item.state)).toEqual(['discarded', 'active', 'active'])
    expect(snapshot.range).toEqual({ left: 1, right: 2 })
  })

  it('marca lo ya revisado en una búsqueda lineal', () => {
    const steps = [{ index: 0, action: 'check' }, { index: 2, action: 'check' }]
    const snapshot = getVariantSnapshot('linear_search', [5, 6, 7], steps, 2)

    expect(snapshot.items.map((item) => item.state)).toEqual(['discarded', 'active', 'mid'])
  })
})

describe('Archivos de variantes', () => {
  it('lee el algoritmo del nombre y el fallo de la primera línea', () => {
    const variant = parseVariant('../variants/binary_search__ejemplo.py', '# Error: una frase\ndef binary_search(numbers, target): ...\n')

    expect(variant).toMatchObject({ id: 'binary_search__ejemplo', algorithm: 'binary_search', description: 'una frase' })
  })

  it('omite archivos que no siguen el formato', () => {
    expect(parseVariant('../variants/binary_search.py', '# Error: x')).toBeNull()
    expect(parseVariant('../variants/otro__x.py', '# Error: x')).toBeNull()
    expect(parseVariant('../variants/binary_search__x.py', 'def binary_search(): ...')).toBeNull()
  })
})

describe('Decodificar la ejecución de una variante', () => {
  it('acepta pasos que rompen el contrato y descarta lo que no es un paso', () => {
    const json = JSON.stringify({
      expected: { index: 3, steps: correct },
      actual: { status: 'endless', index: null, steps: [{ mid: 99 }, 'x', null], message: null },
    })

    expect(decodeVariantRun(json).actual).toEqual({ status: 'endless', index: null, steps: [{ mid: 99 }], message: null })
  })

  it('rechaza una respuesta sin la ejecución correcta', () => {
    expect(() => decodeVariantRun(JSON.stringify({ actual: { status: 'finished', steps: [] } }))).toThrow(/inválida/)
  })
})
