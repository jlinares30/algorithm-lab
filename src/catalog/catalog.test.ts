import { describe, expect, it } from 'vitest'
import { algorithms, categories, getAlgorithm } from './algorithms'
import { labs } from './labs'
import { algorithmHref, parseRoute } from '../navigation/useHashRoute'

describe('Catálogo de algoritmos', () => {
  it('usa identificadores únicos aptos para la URL', () => {
    const ids = algorithms.map((algorithm) => algorithm.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('asigna cada algoritmo a una categoría conocida y a un archivo Python', () => {
    const known = new Set(categories.map((category) => category.id))
    for (const algorithm of algorithms) {
      expect(known.has(algorithm.category)).toBe(true)
      expect(algorithm.pythonFile).toMatch(/^python\/algorithms\/.+\.py$/)
    }
  })

  it('tiene un laboratorio para cada algoritmo disponible y solo para esos', () => {
    const available = algorithms.filter((algorithm) => algorithm.status === 'available').map((a) => a.id)
    expect(Object.keys(labs).sort()).toEqual(available.sort())
  })

  it('busca algoritmos por identificador', () => {
    expect(getAlgorithm('binary-search')?.name).toBe('Binary Search')
    expect(getAlgorithm('desconocido')).toBeUndefined()
  })
})

describe('Rutas por hash', () => {
  it('interpreta la portada y las páginas de algoritmo', () => {
    expect(parseRoute('')).toEqual({ page: 'home' })
    expect(parseRoute('#/')).toEqual({ page: 'home' })
    expect(parseRoute('#/algoritmo/')).toEqual({ page: 'home' })
    expect(parseRoute('#/comparar')).toEqual({ page: 'compare' })
    expect(parseRoute('#/errores')).toEqual({ page: 'bughunt' })
    expect(parseRoute('#/algoritmo/binary-search')).toEqual({ page: 'algorithm', id: 'binary-search' })
    expect(parseRoute('#/algoritmo/binary-search/extra')).toEqual({ page: 'algorithm', id: 'binary-search' })
  })

  it('genera enlaces que vuelven a interpretarse igual', () => {
    for (const algorithm of algorithms) {
      expect(parseRoute(algorithmHref(algorithm.id))).toEqual({ page: 'algorithm', id: algorithm.id })
    }
  })
})
