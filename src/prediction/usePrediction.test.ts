import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePrediction } from './usePrediction'
import type { PredictionQuestion } from './usePrediction'

const question: PredictionQuestion = {
  prompt: '¿Qué hace el algoritmo?',
  options: [
    { id: 'check', label: 'Avanzar' },
    { id: 'found', label: 'Encontrado' },
  ],
  answer: 'found',
}

function setup() {
  const playback = { next: vi.fn(), reset: vi.fn() }
  const hook = renderHook(() => usePrediction(playback))
  return { playback, hook }
}

afterEach(cleanup)

describe('usePrediction', () => {
  it('empieza desactivado y reinicia la reproducción al activarse', () => {
    const { playback, hook } = setup()
    expect(hook.result.current.enabled).toBe(false)

    act(() => hook.result.current.setEnabled(true))

    expect(hook.result.current.enabled).toBe(true)
    expect(playback.reset).toHaveBeenCalledOnce()
    expect(hook.result.current.score).toEqual({ correct: 0, answered: 0 })
  })

  it('revela el paso y cuenta el acierto al responder bien', () => {
    const { playback, hook } = setup()
    act(() => hook.result.current.setEnabled(true))

    act(() => hook.result.current.answer(question, 'found'))

    expect(playback.next).toHaveBeenCalledOnce()
    expect(hook.result.current.feedback).toEqual({ correct: true, chosen: 'Encontrado', expected: 'Encontrado' })
    expect(hook.result.current.score).toEqual({ correct: 1, answered: 1 })
  })

  it('muestra lo que hizo el código cuando la predicción falla', () => {
    const { hook } = setup()
    act(() => hook.result.current.setEnabled(true))

    act(() => hook.result.current.answer(question, 'check'))

    expect(hook.result.current.feedback).toEqual({ correct: false, chosen: 'Avanzar', expected: 'Encontrado' })
    expect(hook.result.current.score).toEqual({ correct: 0, answered: 1 })
  })

  it('ignora respuestas repetidas hasta continuar', () => {
    const { playback, hook } = setup()
    act(() => hook.result.current.setEnabled(true))
    act(() => hook.result.current.answer(question, 'check'))

    act(() => hook.result.current.answer(question, 'found'))
    expect(playback.next).toHaveBeenCalledOnce()
    expect(hook.result.current.score.answered).toBe(1)

    act(() => hook.result.current.continue())
    expect(hook.result.current.feedback).toBeNull()

    act(() => hook.result.current.answer(question, 'found'))
    expect(playback.next).toHaveBeenCalledTimes(2)
    expect(hook.result.current.score).toEqual({ correct: 1, answered: 2 })
  })

  it('reinicia la puntuación y la reproducción', () => {
    const { playback, hook } = setup()
    act(() => hook.result.current.setEnabled(true))
    act(() => hook.result.current.answer(question, 'found'))

    act(() => hook.result.current.restart())

    expect(hook.result.current.feedback).toBeNull()
    expect(hook.result.current.score).toEqual({ correct: 0, answered: 0 })
    expect(playback.reset).toHaveBeenCalledTimes(2)
  })
})
