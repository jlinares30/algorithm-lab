import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { executeLinearSearch } from '../../execution/linearSearch'
import { LinearSearchLab } from './LinearSearchLab'

vi.mock('../../execution/linearSearch', () => ({ executeLinearSearch: vi.fn() }))

const recorded = {
  index: 2,
  events: [
    { index: 0, action: 'check' as const },
    { index: 1, action: 'check' as const },
    { index: 2, action: 'found' as const },
  ],
}

beforeEach(() => {
  vi.mocked(executeLinearSearch).mockReturnValue({ result: Promise.resolve(recorded), dispose: vi.fn() })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function setInput(list: string, target: string) {
  fireEvent.change(screen.getByLabelText('Lista de números'), { target: { value: list } })
  fireEvent.change(screen.getByLabelText('Valor objetivo'), { target: { value: target } })
}

describe('Laboratorio de Linear Search', () => {
  it('ejecuta tu archivo Python con una lista desordenada y recorre sus pasos', async () => {
    render(<LinearSearchLab />)
    setInput('42, 7, 19, 3', '19')
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar búsqueda' }))

    expect(executeLinearSearch).toHaveBeenCalledWith([42, 7, 19, 3], 19)
    expect(await screen.findByText(/Todo está preparado/)).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Ir al paso 1: check [0]' }))
    expect(screen.getByText('42 ≠ 19. Se avanza al índice 1.')).toBeDefined()
    expect(screen.getByLabelText('Comparación: 42 ≠ 19')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Ir al paso 3: found [2]' }))
    expect(screen.getByText('19 = 19. Objetivo encontrado en el índice 2.')).toBeDefined()
    expect(screen.getByLabelText('Índice 2: 19, encontrado')).toBeDefined()
    expect(screen.getByLabelText('Índice 0: 42, revisado')).toBeDefined()
  })

  it('valida la entrada antes de ejecutar Python', () => {
    render(<LinearSearchLab />)
    setInput('1, dos, 3', '1')
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar búsqueda' }))

    expect(executeLinearSearch).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toMatch(/enteros/)
  })

  it('muestra el error cuando Python no respeta el formato de pasos', async () => {
    vi.mocked(executeLinearSearch).mockReturnValueOnce({
      result: Promise.reject(new Error('linear_search debe devolver (índice, steps)')),
      dispose: vi.fn(),
    })
    render(<LinearSearchLab />)
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar búsqueda' }))

    expect((await screen.findByRole('alert')).textContent).toMatch(/\(índice, steps\)/)
  })
})

describe('Modo predicción en Linear Search', () => {
  async function startPrediction() {
    render(<LinearSearchLab />)
    setInput('42, 7, 19, 3', '19')
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar búsqueda' }))
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Modo predicción' }))
    return within(screen.getByRole('region', { name: 'Modo predicción' }))
  }

  it('oculta la línea de tiempo para no revelar los pasos', async () => {
    await startPrediction()

    expect(screen.queryByRole('region', { name: 'Navegación entre eventos' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Avanzar' })).toBeNull()
    expect(screen.queryByText(/found \[2\]/)).toBeNull()
  })

  it('pregunta por cada paso, lo revela al responder y lleva la cuenta', async () => {
    const panel = await startPrediction()

    // Paso 1: el código grabó "check" en el índice 0.
    expect(panel.getByText(/El puntero i llega al índice 0 \(valor 42\)/)).toBeDefined()
    fireEvent.click(panel.getByRole('button', { name: 'Encontrado: es el objetivo' }))
    expect(panel.getByRole('status').textContent).toContain('Tu código hizo: No coincide: avanzar al siguiente')
    expect(screen.getByLabelText('Índice 0: 42, comparando')).toBeDefined()
    expect(panel.getByText(/Aciertos:/).textContent).toContain('0 de 1')

    // Paso 2: acierto.
    fireEvent.click(panel.getByRole('button', { name: 'Siguiente pregunta' }))
    expect(panel.getByText(/índice 1 \(valor 7\)/)).toBeDefined()
    fireEvent.click(panel.getByRole('button', { name: 'No coincide: avanzar al siguiente' }))
    expect(panel.getByRole('status').textContent).toContain('✓ Correcto')

    // Paso 3 (último): acierto y resumen final.
    fireEvent.click(panel.getByRole('button', { name: 'Siguiente pregunta' }))
    fireEvent.click(panel.getByRole('button', { name: 'Encontrado: es el objetivo' }))
    expect(screen.getByLabelText('Índice 2: 19, encontrado')).toBeDefined()
    fireEvent.click(panel.getByRole('button', { name: 'Ver resultado' }))
    expect(panel.getByRole('status').textContent).toContain('Acertaste 2 de 3 predicciones')

    // Reintentar vuelve al inicio.
    fireEvent.click(panel.getByRole('button', { name: 'Volver a intentarlo' }))
    expect(panel.getByText(/índice 0 \(valor 42\)/)).toBeDefined()
    expect(panel.getByText(/Aciertos:/).textContent).toContain('0 de 0')
  })

  it('devuelve los controles normales al desactivarlo', async () => {
    await startPrediction()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Modo predicción' }))

    expect(screen.queryByRole('region', { name: 'Modo predicción' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Avanzar' })).toBeDefined()
  })
})
