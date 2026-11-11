import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Variant } from '../catalog/variants'
import { runVariant } from '../execution/variant'
import type { VariantRun } from '../execution/variant'
import { BugHuntPage } from './BugHuntPage'

vi.mock('../execution/variant', async (original) => ({
  ...(await original<typeof import('../execution/variant')>()),
  runVariant: vi.fn(),
}))

// The source is never executed here: the Python run is replaced by a recording.
const challenge: Variant = {
  id: 'binary_search__ejemplo',
  algorithm: 'binary_search',
  description: 'Frase que explica el fallo.',
  source: '# Error: Frase que explica el fallo.\n',
}

const expectedSteps = [
  { left: 0, mid: 2, right: 4, action: 'move_right' },
  { left: 3, mid: 3, right: 4, action: 'found' },
]
const faulty: VariantRun = {
  expected: { index: 3, steps: expectedSteps },
  actual: {
    status: 'finished',
    index: -1,
    steps: [expectedSteps[0], { left: 2, mid: 3, right: 4, action: 'move_right' }],
    message: null,
  },
}

function record(run: VariantRun) {
  vi.mocked(runVariant).mockReturnValue({ result: Promise.resolve(run), dispose: vi.fn() })
}

beforeEach(() => record(faulty))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

async function start(steps = 2) {
  render(<BugHuntPage challenges={[challenge]} />)
  fireEvent.change(screen.getByLabelText('Lista'), { target: { value: '1, 3, 5, 7, 9' } })
  fireEvent.change(screen.getByLabelText('Objetivo'), { target: { value: '7' } })
  fireEvent.click(screen.getByRole('button', { name: 'Ejecutar reto' }))
  await screen.findByText(`Paso 1 de ${steps} ·`, { exact: false })
}

describe('Encuentra el error', () => {
  it('explica cómo añadir retos cuando no hay variantes', () => {
    render(<BugHuntPage challenges={[]} />)

    expect(screen.getByText(/Todavía no hay retos/)).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Ejecutar reto' })).toBeNull()
  })

  it('ejecuta la variante elegida sin revelar su nombre ni su fallo', async () => {
    await start()

    expect(runVariant).toHaveBeenCalledWith('binary_search', challenge.source, [1, 3, 5, 7, 9], 7)
    expect(screen.getByRole('option', { name: 'Reto 1 · Binary Search' })).toBeDefined()
    expect(screen.queryByText(/ejemplo/)).toBeNull()
    expect(screen.queryByText(/Frase que explica el fallo/)).toBeNull()
  })

  it('valida la entrada antes de ejecutar Python', () => {
    render(<BugHuntPage challenges={[challenge]} />)
    fireEvent.change(screen.getByLabelText('Lista'), { target: { value: '3, 1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar reto' }))

    expect(screen.getByRole('alert').textContent).toContain('ordenada')
    expect(runVariant).not.toHaveBeenCalled()
  })

  it('acepta el primer paso incorrecto y revela el fallo', async () => {
    await start()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Aquí falla' }))

    const feedback = screen.getByRole('status')
    expect(feedback.textContent).toContain('Correcto.')
    expect(feedback.textContent).toContain('left 3 · mid 3 · right 4 · action found')
    expect(feedback.textContent).toContain('Frase que explica el fallo.')
    expect(screen.queryByRole('button', { name: 'Aquí falla' })).toBeNull()
  })

  it('corrige una respuesta equivocada y lleva al paso incorrecto', async () => {
    await start()
    fireEvent.click(screen.getByRole('button', { name: 'Aquí falla' }))

    expect(screen.getByRole('status').textContent).toContain('No es ahí.')
    expect(screen.getByText(/Paso 2 de 2/)).toBeDefined()
  })

  it('muestra cómo terminó la ejecución tras el último paso', async () => {
    record({ ...faulty, actual: { status: 'crashed', index: null, steps: [expectedSteps[0]], message: 'IndexError: list index out of range' } })
    await start(1)
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(screen.getByText(/IndexError: list index out of range/)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Aquí falla' }))
    expect(screen.getByRole('status').textContent).toContain('Correcto.')
  })

  it('no revela el fallo si con esos datos la variante se comporta bien', async () => {
    record({ expected: faulty.expected, actual: { status: 'finished', index: 3, steps: expectedSteps, message: null } })
    await start()
    fireEvent.click(screen.getByRole('button', { name: 'Con estos datos no falla' }))

    const feedback = screen.getByRole('status')
    expect(feedback.textContent).toContain('Correcto.')
    expect(feedback.textContent).not.toContain('Frase que explica el fallo.')
  })
})
