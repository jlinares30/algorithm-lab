import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { measureAlgorithms } from '../execution/measure'
import type { Measurement } from '../execution/measure'
import { ComparePage } from './ComparePage'

vi.mock('../execution/measure', async (original) => ({
  ...(await original<typeof import('../execution/measure')>()),
  measureAlgorithms: vi.fn(),
}))

// Counts as the Python run would report them; not computed by a TS search.
const sizes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
const recorded: Measurement = {
  binary_search: sizes.map((n, index) => ({ n, absent: 7 + Math.floor(index / 3), present: 5.5 + index / 4 })),
  linear_search: sizes.map((n) => ({ n, absent: n, present: n / 2 })),
}

beforeEach(() => {
  vi.mocked(measureAlgorithms).mockReturnValue({ result: Promise.resolve(recorded), dispose: vi.fn() })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

async function measure() {
  render(<ComparePage />)
  fireEvent.click(screen.getByRole('button', { name: 'Medir' }))
  return screen.findByRole('img', { name: /Comparaciones según el tamaño de la lista/ })
}

describe('Comparar complejidad', () => {
  it('no ejecuta Python hasta que se pide medir', () => {
    render(<ComparePage />)

    expect(measureAlgorithms).not.toHaveBeenCalled()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('mide los algoritmos disponibles y los dibuja con leyenda', async () => {
    const chart = await measure()

    expect(measureAlgorithms).toHaveBeenCalledWith(['binary_search', 'linear_search'])
    expect(chart.getAttribute('aria-label')).toContain('Binary Search y Linear Search')
    const legend = within(screen.getByRole('list', { name: 'Leyenda' }))
    expect(legend.getByText('Binary Search')).toBeDefined()
    expect(legend.getByText('Linear Search')).toBeDefined()
    expect(chart.querySelectorAll('polyline')).toHaveLength(2)
  })

  it('ofrece los mismos datos en una tabla y los cambia según el caso medido', async () => {
    await measure()
    const row = () => within(screen.getByRole('row', { name: /^1000/ })).getAllByRole('cell').map((cell) => cell.textContent)

    expect(row()).toEqual(['10', '1000'])

    fireEvent.click(screen.getByRole('radio', { name: 'Objetivo presente' }))
    expect(row()).toEqual(['7.8', '500'])
  })

  it('muestra los valores del tamaño más cercano al cursor', async () => {
    const chart = await measure()
    chart.getBoundingClientRect = () => ({ left: 0, top: 0, width: 720, height: 340, right: 720, bottom: 340, x: 0, y: 0, toJSON: () => ({}) })

    // x=326 cae sobre n=500 en la geometría del gráfico.
    fireEvent.pointerMove(chart, { clientX: 326 })
    const tooltip = screen.getByRole('status')
    expect(tooltip.textContent).toContain('n = 500')
    expect(tooltip.textContent).toContain('500Linear Search')

    fireEvent.pointerLeave(chart)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('muestra el error si Python falla y permite reintentar', async () => {
    vi.mocked(measureAlgorithms).mockReturnValueOnce({ result: Promise.reject(new Error('Sin conexión')), dispose: vi.fn() })
    render(<ComparePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Medir' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Sin conexión')
    fireEvent.click(screen.getByRole('button', { name: 'Medir' }))
    expect(await screen.findByRole('img', { name: /Comparaciones/ })).toBeDefined()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
