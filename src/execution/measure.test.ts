import { describe, expect, it } from 'vitest'
import { decodeMeasurement } from './measure'

const json = (value: unknown) => JSON.stringify(value)
const sizes = [100, 200]

describe('Medición de comparaciones (Python → interfaz)', () => {
  it('acepta un punto por tamaño para cada algoritmo pedido', () => {
    const report = {
      binary_search: [{ n: 100, absent: 7, present: 5.8 }, { n: 200, absent: 8, present: 6.7 }],
      linear_search: [{ n: 100, absent: 100, present: 49.2 }, { n: 200, absent: 200, present: 103 }],
    }
    expect(decodeMeasurement(json(report), ['binary_search', 'linear_search'], sizes)).toEqual(report)
  })

  it('ignora algoritmos que no se pidieron', () => {
    const report = {
      binary_search: [{ n: 100, absent: 7, present: 5.8 }, { n: 200, absent: 8, present: 6.7 }],
      otro: 'ruido',
    }
    expect(Object.keys(decodeMeasurement(json(report), ['binary_search'], sizes))).toEqual(['binary_search'])
  })

  it.each([
    ['respuesta que no es un objeto', 3],
    ['algoritmo ausente', { linear_search: [] }],
    ['menos puntos que tamaños', { binary_search: [{ n: 100, absent: 7, present: 5 }] }],
    ['tamaño distinto del pedido', { binary_search: [{ n: 100, absent: 7, present: 5 }, { n: 999, absent: 8, present: 6 }] }],
    ['conteo negativo', { binary_search: [{ n: 100, absent: -1, present: 5 }, { n: 200, absent: 8, present: 6 }] }],
    ['conteo no numérico', { binary_search: [{ n: 100, absent: 7, present: 'x' }, { n: 200, absent: 8, present: 6 }] }],
  ])('rechaza %s', (_, value) => {
    expect(() => decodeMeasurement(json(value), ['binary_search'], sizes)).toThrow()
  })
})
