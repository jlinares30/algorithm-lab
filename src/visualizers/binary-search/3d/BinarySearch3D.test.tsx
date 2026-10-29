import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BinarySearch3DView } from './BinarySearch3DView'
import { isWebGLAvailable } from './webgl'
import { getElement3DTarget, smoothstep } from './animation3d'
import type { SearchEvent } from '../../../execution/binarySearch'

const numbers = [2, 5, 9, 14, 20, 27, 35, 44, 56, 69, 83]
const events: SearchEvent[] = [
  { left: 0, mid: 5, right: 10, action: 'move_right' },
  { left: 6, mid: 8, right: 10, action: 'move_right' },
  { left: 9, mid: 9, right: 10, action: 'found' },
]

function mockPlayback(position = 1, currentTime = 1.0) {
  return {
    position,
    currentTime,
    playing: false,
    speed: 1,
    clock: { subscribe: vi.fn(() => vi.fn()) },
    revision: 0,
    previous: vi.fn(),
    next: vi.fn(),
    toggle: vi.fn(),
    reset: vi.fn(),
    seek: vi.fn(),
    seekContinuous: vi.fn(),
    setSpeed: vi.fn(),
  }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Modo Inmersivo 3D de Binary Search', () => {
  it('detecta correctamente la disponibilidad de WebGL en el entorno', () => {
    // In jsdom without WebGL, isWebGLAvailable returns false
    expect(typeof isWebGLAvailable()).toBe('boolean')
  })

  it('renderiza la interfaz superpuesta (HUD) con métricas, objetivo y comparación', () => {
    const playback = mockPlayback(1, 1.0)
    const onExit = vi.fn()
    render(
      <BinarySearch3DView
        numbers={numbers}
        target={69}
        events={events}
        playback={playback}
        onExit={onExit}
      />
    )

    // HUD Header elements
    expect(screen.getByText('Algorithm Lab 3D')).toBeDefined()
    expect(screen.getByText(/Paso/)).toBeDefined()
    expect(screen.getByText(/Objetivo:/)).toBeDefined()
    expect(screen.getByText(/27 < 69/)).toBeDefined()
    expect(screen.getByText(/left=0 · mid=5 · right=10/)).toBeDefined()

    // Controls
    expect(screen.getByRole('button', { name: /Restablecer cámara/i })).toBeDefined()
    const exitBtn = screen.getByRole('button', { name: /Salir/i })
    expect(exitBtn).toBeDefined()

    // Exit on click
    fireEvent.click(exitBtn)
    expect(onExit).toHaveBeenCalledOnce()
  })

  it('permite navegación con teclado: Escape para salir, Espacio y flechas para reproducción', () => {
    const playback = mockPlayback(1, 1.0)
    const onExit = vi.fn()
    render(
      <BinarySearch3DView
        numbers={numbers}
        target={69}
        events={events}
        playback={playback}
        onExit={onExit}
      />
    )

    // Escape exits
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onExit).toHaveBeenCalledOnce()

    // Space toggles play
    fireEvent.keyDown(window, { key: ' ' })
    expect(playback.toggle).toHaveBeenCalledOnce()

    // Arrow keys step previous / next
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(playback.next).toHaveBeenCalledOnce()

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(playback.previous).toHaveBeenCalledOnce()
  })

  it('sincroniza el botón de restablecer cámara', () => {
    const playback = mockPlayback(1, 1.0)
    render(
      <BinarySearch3DView
        numbers={numbers}
        target={69}
        events={events}
        playback={playback}
        onExit={vi.fn()}
      />
    )

    const resetBtn = screen.getByRole('button', { name: /Restablecer cámara/i })
    expect(resetBtn).toBeDefined()
    fireEvent.click(resetBtn)
  })

  it('calcula la secuencia de animación fluida 3D por fases (mid, descarte y found)', () => {
    const event = events[0] // mid = 5, move_right, left = 0, right = 10
    const before = { left: 0, right: 10 }
    const after = { left: 6, right: 10 }
    const height = 2.0

    // Fase 1 al 35%: el elemento central mid se eleva y destaca en ámbar
    const midPhase1 = getElement3DTarget(5, height, event, before, after, 0.35, false, false)
    expect(midPhase1.posY).toBeCloseTo(1.0 + 1.2, 1) // defaultY (1.0) + 1.2
    expect(midPhase1.posZ).toBe(0)
    expect(midPhase1.scale).toBeCloseTo(1.15, 1)
    expect(midPhase1.opacity).toBe(1.0)

    // Los elementos a descartar todavía permanecen activos en la fase 1
    const pendingPhase1 = getElement3DTarget(2, height, event, before, after, 0.35, false, false)
    expect(pendingPhase1.posZ).toBe(0)
    expect(pendingPhase1.opacity).toBe(1.0)

    // Fase 2 al 80%: la mitad descartada se desplaza a Z = -4 y se atenúa
    const pendingPhase2 = getElement3DTarget(2, height, event, before, after, 0.8, false, false)
    expect(pendingPhase2.posZ).toBeCloseTo(-4.0, 1)
    expect(pendingPhase2.opacity).toBeCloseTo(0.25, 1)

    // Evento found: el elemento encontrado corona en verde
    const foundEvent = events[2] // mid = 9, found
    const foundTarget = getElement3DTarget(9, height, foundEvent, { left: 9, right: 10 }, { left: 9, right: 9 }, 0.8, false, false)
    expect(foundTarget.posZ).toBe(0)
    expect(foundTarget.color.getHexString()).toBe('34d399')
  })

  it('interpola con smoothstep sin valores fuera de rango', () => {
    expect(smoothstep(0, 1, -1)).toBe(0)
    expect(smoothstep(0, 1, 0)).toBe(0)
    expect(smoothstep(0, 1, 0.5)).toBe(0.5)
    expect(smoothstep(0, 1, 1)).toBe(1)
    expect(smoothstep(0, 1, 2)).toBe(1)
  })
})
