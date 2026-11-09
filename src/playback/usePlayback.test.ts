import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePlayback } from './usePlayback'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Reproducción y navegación temporal', () => {
  it('limita los saltos al intervalo válido y puede continuar desde un salto', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => usePlayback(4))
    act(() => result.current.seek(100))
    expect(result.current.position).toBe(4)
    act(() => result.current.seek(-10))
    expect(result.current.position).toBe(0)
    act(() => result.current.seek(2))
    act(() => result.current.toggle())
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.position).toBe(3)
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.position).toBe(4)
    // The final event now gets its own complete comparison/zoom sequence.
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.playing).toBe(false)
  })

  it('cambia la velocidad durante la reproducción y cancela el timer al desmontar', () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => usePlayback(4))
    act(() => result.current.toggle())
    act(() => vi.advanceTimersByTime(400))
    act(() => result.current.setSpeed(4))
    // Preserve the 40% already consumed: 60% at 4× takes 150ms.
    act(() => vi.advanceTimersByTime(149))
    expect(result.current.position).toBe(0)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.position).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('no inicia una reproducción sin eventos', () => {
    const { result } = renderHook(() => usePlayback(0))
    act(() => result.current.toggle())
    expect(result.current.playing).toBe(false)
    expect(result.current.position).toBe(0)
  })

  it('pausa y reanuda la fase exacta del último evento sin reiniciar el historial', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => usePlayback(1))
    const render = vi.fn()
    const unsubscribe = result.current.clock.subscribe(render)
    act(() => result.current.next())
    act(() => vi.advanceTimersByTime(400))
    act(() => result.current.toggle())
    expect(render.mock.lastCall![0]).toBeCloseTo(0.4)
    act(() => vi.advanceTimersByTime(2000))
    expect(render.mock.lastCall![0]).toBeCloseTo(0.4)
    expect(result.current.position).toBe(1)
    act(() => result.current.toggle())
    act(() => vi.advanceTimersByTime(600))
    expect(render.mock.lastCall![0]).toBe(1)
    expect(result.current.playing).toBe(false)
    expect(result.current.position).toBe(1)
    unsubscribe()
  })

  it('avanzar anima solo un evento y un salto publica una escena final independiente', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => usePlayback(3))
    act(() => result.current.next())
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.position).toBe(1)
    expect(result.current.playing).toBe(false)
    act(() => result.current.next())
    act(() => vi.advanceTimersByTime(300))
    act(() => result.current.seek(1))
    const render = vi.fn()
    const unsubscribe = result.current.clock.subscribe(render)
    expect(render.mock.lastCall![0]).toBe(1)
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current.position).toBe(1)
    expect(result.current.playing).toBe(false)
    unsubscribe()
  })
})
