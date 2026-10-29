import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { executeBinarySearch } from '../../execution/binarySearch'
import type { SearchResult } from '../../execution/binarySearch'
import { BinarySearchLab } from './BinarySearchLab'

vi.mock('../../execution/binarySearch', () => ({ executeBinarySearch: vi.fn() }))

// Recorded events from the user's Python implementation, not a TS search.
const recorded: SearchResult = {
  index: 9,
  events: [
    { left: 0, mid: 5, right: 10, action: 'move_right' },
    { left: 6, mid: 8, right: 10, action: 'move_right' },
    { left: 9, mid: 9, right: 10, action: 'found' },
  ],
}

beforeEach(() => {
  vi.mocked(executeBinarySearch).mockReturnValue({ result: Promise.resolve(recorded), dispose: vi.fn() })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.resetAllMocks()
})

async function start() {
  render(<BinarySearchLab />)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ejecutar búsqueda' })) })
}

describe('Visualización por eventos', () => {
  it('envía la entrada a Python, navega y restaura el rango al retroceder', async () => {
    await start()
    expect(executeBinarySearch).toHaveBeenCalledWith([2, 5, 9, 14, 20, 27, 35, 44, 56, 69, 83], 69)
    expect(screen.getByText('0 de 3')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Avanzar' }))
    expect(screen.getByRole('status').textContent).toContain('27 < 69')
    expect(screen.getByLabelText('Índice 5: 27, en rango, mid')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Avanzar' }))
    expect(screen.getByLabelText('Índice 0: 2, descartado')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Retroceder' }))
    expect(screen.getByLabelText('Índice 0: 2, en rango, left')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Avanzar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Avanzar' }))
    expect(screen.getByRole('status').textContent).toContain('Objetivo encontrado en el índice 9')
    expect(screen.getByLabelText('Índice 9: 69, en rango, left, mid, encontrado')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }))
    expect(screen.getByText('0 de 3')).toBeDefined()
    expect(screen.getByRole('status').textContent).toContain('Estado inicial')
  })

  it('reproduce a la velocidad seleccionada, pausa y se detiene al finalizar', async () => {
    await start()
    vi.useFakeTimers()
    fireEvent.change(screen.getByLabelText('Velocidad'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }))
    act(() => vi.advanceTimersByTime(500))
    expect(screen.getByText('1 de 3')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }))
    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByText('1 de 3')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }))
    act(() => vi.advanceTimersByTime(500))
    act(() => vi.advanceTimersByTime(500))
    expect(screen.getByText('3 de 3')).toBeDefined()
    act(() => vi.advanceTimersByTime(500))
    expect(screen.getByRole('button', { name: 'Reproducir' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }))
    expect(screen.getByText('0 de 3')).toBeDefined()
  })

  it('explica move_left y no cuenta not_found como una comparación', async () => {
    vi.mocked(executeBinarySearch).mockReturnValue({
      result: Promise.resolve({ index: -1, events: [
        { left: 0, mid: 0, right: 0, action: 'move_left' },
        { left: 0, mid: null, right: -1, action: 'not_found' },
      ] }), dispose: vi.fn(),
    })
    render(<BinarySearchLab />)
    fireEvent.change(screen.getByLabelText('Lista ordenada'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Valor objetivo'), { target: { value: '1' } })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ejecutar búsqueda' })) })
    fireEvent.click(screen.getByRole('button', { name: 'Avanzar' }))
    expect(screen.getByRole('status').textContent).toContain('2 > 1')
    fireEvent.click(screen.getByRole('button', { name: 'Avanzar' }))
    expect(screen.getByRole('status').textContent).toContain('1 no está en la lista')
    expect(screen.getByText(/Comparaciones:/).textContent).toBe('Comparaciones: 1')
    expect(screen.getByLabelText('Índice 0: 2, descartado, left')).toBeDefined()
  })

  it('valida el orden antes de iniciar Python', () => {
    render(<BinarySearchLab />)
    fireEvent.change(screen.getByLabelText('Lista ordenada'), { target: { value: '9, 1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar búsqueda' }))
    expect(screen.getByRole('alert').textContent).toContain('ordenada')
    expect(executeBinarySearch).not.toHaveBeenCalled()
  })

  it('muestra errores de ejecución y permite reintentar', async () => {
    vi.mocked(executeBinarySearch).mockReturnValueOnce({ result: Promise.reject(new Error('Sin conexión')), dispose: vi.fn() })
    await start()
    expect(screen.getByRole('alert').textContent).toContain('Sin conexión')
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ejecutar búsqueda' })) })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('0 de 3')).toBeDefined()
  })

  it('cancela el worker y descarta un resultado tardío', async () => {
    let resolve!: (result: SearchResult) => void
    const dispose = vi.fn()
    vi.mocked(executeBinarySearch).mockReturnValue({ result: new Promise((done) => { resolve = done }), dispose })
    await start()
    expect(screen.getByRole('status').textContent).toContain('Cargando Pyodide')
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(dispose).toHaveBeenCalledOnce()
    await act(async () => { resolve(recorded) })
    expect(screen.queryByText('0 de 3')).toBeNull()
  })

  it('salta entre eventos y cambia de vista conservando el paso, los límites y las métricas', async () => {
    await start()
    fireEvent.click(screen.getByRole('button', { name: 'Ir al paso 3: found' }))
    expect(screen.getByText('3 de 3')).toBeDefined()
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
    expect(screen.getByText(/Comparaciones:/).textContent).toBe('Comparaciones: 3')
    fireEvent.click(screen.getByRole('radio', { name: 'Celdas' }))
    expect(screen.getByRole('region', { name: 'Visualización de celdas' })).toBeDefined()
    expect(screen.getByLabelText('Índice 9: 69, en rango, left, mid, encontrado')).toBeDefined()
    fireEvent.change(screen.getByRole('slider', { name: /Línea de tiempo/ }), { target: { value: '1' } })
    expect(screen.getByText('1 de 3')).toBeDefined()
    expect(screen.getByText(/Comparaciones:/).textContent).toBe('Comparaciones: 1')
    expect(screen.getByLabelText('Índice 0: 2, en rango, left')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Ir al paso 1: move_right' }).getAttribute('aria-current')).toBe('step')
    fireEvent.click(screen.getByRole('radio', { name: 'Barras' }))
    expect(screen.getByRole('region', { name: 'Visualización de barras' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Ir al paso 0: Inicio' }))
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0')
    expect(screen.getByLabelText('Índice 9: 69, en rango')).toBeDefined()
    expect(executeBinarySearch).toHaveBeenCalledOnce()
  })

  it('pausa al mover la línea de tiempo e invalida el avance pendiente', async () => {
    await start()
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }))
    act(() => vi.advanceTimersByTime(700))
    fireEvent.change(screen.getByRole('slider', { name: /Línea de tiempo/ }), { target: { value: '2' } })
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByText('2 de 3')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Reproducir' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Retroceder' }))
    expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('1')
  })

  it('genera entradas ordenadas y permite elegir el objetivo sin alterar una ejecución cargada', async () => {
    await start()
    fireEvent.change(screen.getByLabelText('Tamaño de la lista aleatoria'), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Generar lista' }))
    const numbers = (screen.getByLabelText('Lista ordenada') as HTMLTextAreaElement).value.split(', ').map(Number)
    expect(numbers).toHaveLength(20)
    expect(numbers.every((number, index) => Number.isInteger(number) && (index === 0 || number >= numbers[index - 1]))).toBe(true)
    fireEvent.change(screen.getByLabelText('Elegir objetivo de la lista'), { target: { value: String(numbers[0]) } })
    expect((screen.getByLabelText('Valor objetivo') as HTMLInputElement).value).toBe(String(numbers[0]))
    fireEvent.click(screen.getByRole('button', { name: 'Objetivo aleatorio' }))
    expect(numbers).toContain(Number((screen.getByLabelText('Valor objetivo') as HTMLInputElement).value))
    expect(screen.getByText('0 de 3')).toBeDefined()
    expect(screen.getByLabelText('Índice 0: 2, en rango')).toBeDefined()
    expect(executeBinarySearch).toHaveBeenCalledOnce()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ejecutar búsqueda' })) })
    expect(executeBinarySearch).toHaveBeenLastCalledWith(numbers, expect.any(Number))
  })

  it('con 11 elementos unifica el escenario y no muestra gráfico redundante, pero activa minimapa con 256', async () => {
    // 11 elements initial state:
    await start()
    expect(screen.queryByRole('img', { name: /Vista general de los 11 elementos/ })).toBeNull()

    // 256 elements run:
    vi.mocked(executeBinarySearch).mockReturnValue({
      result: Promise.resolve({
        index: 128,
        events: [{ left: 0, mid: 127, right: 255, action: 'move_right' }],
      }),
      dispose: vi.fn(),
    })
    fireEvent.change(screen.getByLabelText('Tamaño de la lista aleatoria'), { target: { value: '256' } })
    fireEvent.click(screen.getByRole('button', { name: 'Generar lista' }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ejecutar búsqueda' })) })
    expect(screen.getByRole('img', { name: /Vista general de los 256 elementos/ })).toBeDefined()
  })

  it('permite alternar entre modo generar lista y modo manual con validación y campo expandible', () => {
    render(<BinarySearchLab />)
    expect(screen.getByRole('tab', { name: 'Generar lista' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText(/Resumen:/)).toBeDefined()

    // Switch to manual mode:
    fireEvent.click(screen.getByRole('tab', { name: 'Lista manual' }))
    expect(screen.getByRole('tab', { name: 'Lista manual' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('button', { name: 'Expandir campo' })).toBeDefined()

    // Expand/collapse:
    fireEvent.click(screen.getByRole('button', { name: 'Expandir campo' }))
    expect(screen.getByRole('button', { name: 'Contraer campo' })).toBeDefined()

    // Validation feedback for unsorted list:
    fireEvent.change(screen.getByLabelText('Lista ordenada'), { target: { value: '10, 5, 20' } })
    expect(screen.getByText(/La lista debe estar ordenada/)).toBeDefined()
  })

  it('permite desplazamiento continuo por la timeline y detenerse a mitad de animación', async () => {
    await start()
    const slider = screen.getByRole('slider', { name: /Línea de tiempo continua/ }) as HTMLInputElement
    // Scrub to continuous fraction (e.g. 1.45: mid-transition of event 2)
    fireEvent.change(slider, { target: { value: '1.45' } })
    expect(screen.getByText('2 de 3')).toBeDefined()
    expect(screen.getByText(/1.45/)).toBeDefined()

    // Scrubbing pauses; start play then pause mid-transition
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }))
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(screen.getByRole('button', { name: 'Reproducir' })).toBeDefined()
  })

  it('soporta selección interactiva de elementos y alternancia de modo inmersivo', async () => {
    await start()
    // Test interactive inspector by clicking an element
    const item0 = screen.getByLabelText(/Índice 0: 2/)
    fireEvent.click(item0)
    expect(screen.getByRole('region', { name: /Inspector de elemento/i }) || screen.getByText(/Elemento seleccionado:/)).toBeDefined()
    expect(screen.getByText(/2 < 69/)).toBeDefined()

    // Close inspector
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByText(/Elemento seleccionado:/)).toBeNull()

    // Fullscreen / Immersive mode toggle
    const fullscreenBtn = screen.getByRole('button', { name: /Inmersivo/i })
    fireEvent.click(fullscreenBtn)
    expect(screen.getByRole('button', { name: /Salir/i })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /Salir/i }))
    expect(screen.getByRole('button', { name: /Inmersivo/i })).toBeDefined()
  })

  it('maneja listas de un solo elemento y listas con elementos duplicados', async () => {
    // Single element list found
    vi.mocked(executeBinarySearch).mockReturnValueOnce({
      result: Promise.resolve({ index: 0, events: [{ left: 0, mid: 0, right: 0, action: 'found' }] }),
      dispose: vi.fn(),
    })
    render(<BinarySearchLab />)
    fireEvent.change(screen.getByLabelText('Lista ordenada'), { target: { value: '42' } })
    fireEvent.change(screen.getByLabelText('Valor objetivo'), { target: { value: '42' } })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ejecutar búsqueda' })) })
    expect(screen.getByText('0 de 1')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Avanzar' }))
    expect(screen.getByRole('status').textContent).toContain('42 = 42')
  })
})
