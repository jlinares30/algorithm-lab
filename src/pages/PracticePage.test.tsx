import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkExercise, createExercise, decodeCheckResult, decodeExercise } from '../execution/practice'
import type { CheckResult, Exercise } from '../execution/practice'
import { PracticePage } from './PracticePage'

vi.mock('../execution/practice', async (original) => ({
  ...(await original<typeof import('../execution/practice')>()),
  createExercise: vi.fn(),
  checkExercise: vi.fn(),
}))

// Stand-in lines, not an algorithm: Python is replaced by recordings.
const exercise: Exercise = {
  lines: [
    { number: 1, indent: 0, text: 'def ejemplo(numbers, target):', blank: false },
    { number: 2, indent: 4, text: 'LÍNEA OCULTA DOS', blank: true },
    { number: 3, indent: 4, text: 'línea visible', blank: false },
    { number: 4, indent: 8, text: 'LÍNEA OCULTA CUATRO', blank: true },
    { number: 5, indent: 8, text: 'registro(', blank: false },
    { number: 6, indent: 12, text: 'DETALLE DEL REGISTRO', blank: false },
    { number: 7, indent: 8, text: ')', blank: false },
    { number: 8, indent: 4, text: 'registro suelto', blank: false },
  ],
  records: [{ start: 5, end: 7, action: 'avanza' }, { start: 8, end: 8, action: null }],
}

const wrong: CheckResult = {
  status: 'wrong',
  failed: 4,
  total: 51,
  case: {
    numbers: [1, 3, 5, 7, 9],
    target: 7,
    expected: { index: 3, steps: [{ left: 0, mid: 2, right: 4, action: 'move_right' }, { left: 3, mid: 3, right: 4, action: 'found' }] },
    actual: { status: 'finished', index: -1, steps: [{ left: 0, mid: 2, right: 4, action: 'move_left' }], message: null },
  },
}

function answerWith(result: CheckResult) {
  vi.mocked(checkExercise).mockReturnValue({ result: Promise.resolve(result), dispose: vi.fn() })
}

beforeEach(() => {
  vi.mocked(createExercise).mockReturnValue({ result: Promise.resolve(exercise), dispose: vi.fn() })
  answerWith({ status: 'passed', total: 51 })
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.clearAllMocks()
})

async function start() {
  render(<PracticePage />)
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo ejercicio' }))
  await screen.findByRole('list', { name: 'Código del algoritmo' })
}

function write(line: number, text: string) {
  fireEvent.change(screen.getByLabelText(`Línea ${line}`), { target: { value: text } })
}

describe('Completa el código', () => {
  it('pide un ejercicio con el algoritmo y el número de líneas elegidos', async () => {
    render(<PracticePage />)
    expect(createExercise).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Algoritmo'), { target: { value: 'linear_search' } })
    fireEvent.change(screen.getByLabelText('Líneas ocultas'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo ejercicio' }))
    await screen.findByRole('list', { name: 'Código del algoritmo' })

    expect(vi.mocked(createExercise).mock.calls[0].slice(0, 2)).toEqual(['linear_search', 3])
  })

  it('muestra el código con huecos sin revelar las líneas ocultas', async () => {
    await start()

    expect(screen.getByText('línea visible')).toBeDefined()
    expect(screen.getByLabelText('Línea 2')).toBeDefined()
    expect(screen.getByLabelText('Línea 4')).toBeDefined()
    expect(screen.queryByText(/LÍNEA OCULTA/)).toBeNull()
  })

  it('no comprueba hasta que todas las líneas están escritas', async () => {
    await start()
    write(2, 'algo')

    expect((screen.getByRole('button', { name: 'Comprobar' }) as HTMLButtonElement).disabled).toBe(true)
    write(4, 'otra cosa')
    expect((screen.getByRole('button', { name: 'Comprobar' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('envía a Python las líneas escritas y confirma cuando se comporta igual', async () => {
    await start()
    write(2, 'respuesta dos')
    write(4, 'respuesta cuatro')
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }))

    expect(await screen.findByText(/Correcto: se comporta igual/)).toBeDefined()
    const [algorithm, answers, sorted] = vi.mocked(checkExercise).mock.calls[0]
    expect([algorithm, answers, sorted]).toEqual(['binary_search', { 2: 'respuesta dos', 4: 'respuesta cuatro' }, true])
  })

  it('muestra un caso donde falla, abierto en el primer paso incorrecto', async () => {
    answerWith(wrong)
    await start()
    write(2, 'x')
    write(4, 'y')
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }))

    await screen.findByText(/falla en 4 de 51 pruebas/)
    const feedback = screen.getByRole('status')
    expect(feedback.textContent).toContain('Lista [1, 3, 5, 7, 9] · objetivo 7')
    expect(feedback.textContent).toContain('El primer paso incorrecto es el 1')
    expect(feedback.textContent).toContain('action move_right')
    expect(screen.queryByText(/LÍNEA OCULTA/)).toBeNull()
  })

  it('avisa si lo escrito no es Python válido', async () => {
    answerWith({ status: 'syntax', message: "Línea 2: '(' was never closed" })
    await start()
    write(2, 'if (')
    write(4, 'y')
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }))

    expect((await screen.findByRole('alert')).textContent).toContain("Línea 2: '(' was never closed")
  })

  it('revela la solución solo cuando se pide', async () => {
    await start()
    fireEvent.click(screen.getByRole('button', { name: 'Ver solución' }))

    expect(screen.getByText('LÍNEA OCULTA DOS')).toBeDefined()
    expect(screen.getByText('LÍNEA OCULTA CUATRO')).toBeDefined()
  })
})

describe('Registro de pasos', () => {
  it('lo pliega en una línea con el nombre de la acción y lo muestra entero si se pide', async () => {
    await start()

    expect(screen.getByText('# registra el paso «avanza»')).toBeDefined()
    expect(screen.getByText('# registra un paso')).toBeDefined()
    expect(screen.queryByText('DETALLE DEL REGISTRO')).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(6)

    fireEvent.click(screen.getByLabelText('Mostrar registro de pasos'))
    expect(screen.getByText('DETALLE DEL REGISTRO')).toBeDefined()
    expect(screen.queryByText(/# registra/)).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(8)
  })
})

describe('Tema del código', () => {
  it('colorea el código con el tema elegido y lo recuerda', async () => {
    await start()
    const code = screen.getByRole('list', { name: 'Código del algoritmo' })
    expect(code.getAttribute('data-code-theme')).toBe('noche')
    expect(code.querySelector('.tok-keyword')?.textContent).toBe('def')

    fireEvent.change(screen.getByLabelText('Tema del código'), { target: { value: 'claro' } })
    expect(code.getAttribute('data-code-theme')).toBe('claro')

    cleanup()
    await start()
    expect(screen.getByRole('list', { name: 'Código del algoritmo' }).getAttribute('data-code-theme')).toBe('claro')
  })

  it('ignora un tema guardado que ya no existe', async () => {
    localStorage.setItem('algorithm-lab:code-theme', 'desconocido')
    await start()

    expect(screen.getByRole('list', { name: 'Código del algoritmo' }).getAttribute('data-code-theme')).toBe('noche')
  })
})

describe('Decodificar ejercicios', () => {
  it('rechaza un ejercicio sin líneas ocultas', () => {
    const lines = exercise.lines.map((line) => ({ ...line, blank: false }))

    expect(decodeExercise(JSON.stringify(exercise))).toEqual(exercise)
    expect(() => decodeExercise(JSON.stringify({ lines }))).toThrow(/inválido/)
    expect(decodeExercise(JSON.stringify({ lines: exercise.lines })).records).toEqual([])
  })

  it('decodifica cada tipo de comprobación y rechaza las incompletas', () => {
    expect(decodeCheckResult(JSON.stringify(wrong))).toEqual(wrong)
    expect(decodeCheckResult(JSON.stringify({ status: 'passed', total: 51 }))).toEqual({ status: 'passed', total: 51 })
    expect(() => decodeCheckResult(JSON.stringify({ status: 'wrong', failed: 1, total: 2 }))).toThrow(/inválida/)
  })
})
