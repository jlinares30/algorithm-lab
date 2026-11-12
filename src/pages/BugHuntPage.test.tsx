import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runChallenge } from '../execution/challenge'
import type { ChallengeRun } from '../execution/challenge'
import { BugHuntPage } from './BugHuntPage'

vi.mock('../execution/challenge', async (original) => ({
  ...(await original<typeof import('../execution/challenge')>()),
  runChallenge: vi.fn(),
}))

// Recordings of what Python would return; nothing is searched or changed here.
const mutation = { line: 6, original: 'LÍNEA ORIGINAL', mutated: 'LÍNEA CAMBIADA', source: 'copia con fallo' }
const expectedSteps = [
  { left: 0, mid: 2, right: 4, action: 'move_right' },
  { left: 3, mid: 3, right: 4, action: 'found' },
]
const faulty: ChallengeRun = {
  mutation,
  target: 7,
  expected: { index: 3, steps: expectedSteps },
  actual: {
    status: 'finished',
    index: -1,
    steps: [expectedSteps[0], { left: 2, mid: 3, right: 4, action: 'move_right' }],
    message: null,
  },
}

function record(run: ChallengeRun) {
  vi.mocked(runChallenge).mockReturnValue({ result: Promise.resolve(run), dispose: vi.fn() })
}

beforeEach(() => record(faulty))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

async function start(steps = 2) {
  render(<BugHuntPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo reto' }))
  await screen.findByText(`Paso 1 de ${steps} ·`, { exact: false })
}

describe('Encuentra el error', () => {
  it('no ejecuta Python hasta que se pide un reto', () => {
    render(<BugHuntPage />)

    expect(runChallenge).not.toHaveBeenCalled()
    expect(screen.getByRole('option', { name: 'Binary Search' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'Linear Search' })).toBeDefined()
  })

  it('pide un fallo nuevo con datos generados y no lo revela', async () => {
    await start()

    const input = vi.mocked(runChallenge).mock.calls[0][0]
    expect(input.algorithm).toBe('binary_search')
    expect(input.sorted).toBe(true)
    expect(input.mutation).toBeUndefined()
    expect(input.numbers.length).toBeGreaterThan(0)
    expect(screen.getByText(/elementos · objetivo/).textContent).toMatch(/objetivo 7$/)
    expect(screen.queryByText(/LÍNEA CAMBIADA/)).toBeNull()
  })

  it('pide datos distintos en cada reto', async () => {
    await start()
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo reto' }))
    await screen.findByText('Paso 1 de 2 ·', { exact: false })

    const [first, second] = vi.mocked(runChallenge).mock.calls.map(([input]) => input)
    expect([second.seed, second.numbers]).not.toEqual([first.seed, first.numbers])
  })

  it('usa el algoritmo elegido', async () => {
    render(<BugHuntPage />)
    fireEvent.change(screen.getByLabelText('Algoritmo'), { target: { value: 'linear_search' } })
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo reto' }))
    await screen.findByText('Paso 1 de 2 ·', { exact: false })

    expect(vi.mocked(runChallenge).mock.calls[0][0]).toMatchObject({ algorithm: 'linear_search', sorted: false })
  })

  it('acepta el primer paso incorrecto y muestra la línea cambiada', async () => {
    await start()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Aquí falla' }))

    const feedback = screen.getByRole('status')
    expect(feedback.textContent).toContain('Correcto.')
    expect(feedback.textContent).toContain('left 3 · mid 3 · right 4 · action found')
    expect(feedback.textContent).toContain('línea 6')
    expect(feedback.textContent).toContain('LÍNEA ORIGINAL')
    expect(feedback.textContent).toContain('LÍNEA CAMBIADA')
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

  it('si con esos datos no falla, no revela el cambio y permite repetirlo con otros datos', async () => {
    record({ ...faulty, actual: { status: 'finished', index: 3, steps: expectedSteps, message: null } })
    await start()
    fireEvent.click(screen.getByRole('button', { name: 'Con estos datos no falla' }))

    const feedback = screen.getByRole('status')
    expect(feedback.textContent).toContain('Correcto.')
    expect(feedback.textContent).not.toContain('LÍNEA CAMBIADA')

    fireEvent.click(screen.getByRole('button', { name: 'Mismo fallo, otros datos' }))
    await screen.findByText('Paso 1 de 2 ·', { exact: false })
    expect(vi.mocked(runChallenge).mock.calls[1][0].mutation).toEqual(mutation)
  })
})
