import { act, cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

function navigate(hash: string) {
  act(() => {
    window.location.hash = hash
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

describe('Página inicial', () => {
  it('presenta el nombre del laboratorio', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Algorithm Lab')
  })

  it('muestra el catálogo agrupado por categoría', () => {
    render(<App />)

    const searching = screen.getByRole('region', { name: 'Búsqueda' })
    const sorting = screen.getByRole('region', { name: 'Ordenamiento' })
    expect(within(searching).getByRole('link', { name: 'Abrir Binary Search' })).toBeDefined()
    expect(within(searching).getByRole('link', { name: 'Abrir Linear Search' })).toBeDefined()
    expect(within(sorting).getByRole('article', { name: /Merge Sort \(próximamente\)/ })).toBeDefined()
    expect(screen.getByText(/2 disponibles · \d+ en preparación/)).toBeDefined()
  })

  it('no carga ningún laboratorio en la portada', () => {
    render(<App />)

    expect(screen.queryByRole('region', { name: 'Binary Search' })).toBeNull()
  })
})

describe('Navegación entre algoritmos', () => {
  it('abre el laboratorio de Binary Search desde su tarjeta', async () => {
    render(<App />)

    const link = screen.getByRole('link', { name: 'Abrir Binary Search' })
    navigate(link.getAttribute('href') ?? '')

    // The lab is lazy-loaded (it pulls in Three.js), so allow time for the import.
    await screen.findByRole('region', { name: 'Binary Search' }, { timeout: 10000 })
    expect(screen.getByLabelText('Lista ordenada')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Ejecutar búsqueda' })).toBeDefined()
    const complexity = screen.getByLabelText('Complejidad')
    expect(within(complexity).getAllByText('O(log n)')).toHaveLength(2)
    expect(document.title).toBe('Binary Search · Algorithm Lab')

    navigate(screen.getByRole('link', { name: /Todos los algoritmos/ }).getAttribute('href') ?? '')
    expect(screen.getByRole('region', { name: 'Búsqueda' })).toBeDefined()
    expect(document.title).toBe('Algorithm Lab')
  }, 15000)

  it('abre el laboratorio de Linear Search por su ruta', async () => {
    window.location.hash = '#/algoritmo/linear-search'
    render(<App />)

    await screen.findByRole('region', { name: 'Linear Search' }, { timeout: 10000 })
    expect(screen.getByLabelText('Lista de números')).toBeDefined()
  }, 15000)

  it('abre la comparación de complejidad desde la portada', () => {
    render(<App />)

    navigate(screen.getByRole('link', { name: /Comparar complejidad/ }).getAttribute('href') ?? '')

    expect(screen.getByRole('region', { name: 'Comparar complejidad' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Medir' })).toBeDefined()
    expect(document.title).toBe('Comparar complejidad · Algorithm Lab')
  })

  it('indica cuándo un algoritmo aún está en preparación', () => {
    window.location.hash = '#/algoritmo/merge-sort'
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Merge Sort' })).toBeDefined()
    expect(screen.getByText(/está en preparación/)).toBeDefined()
    expect(screen.getByText('python/algorithms/sorting/merge_sort.py')).toBeDefined()
  })

  it('muestra un aviso para identificadores desconocidos', () => {
    window.location.hash = '#/algoritmo/no-existe'
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Algoritmo no encontrado' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Ver el catálogo' }).getAttribute('href')).toBe('#/')
  })
})
