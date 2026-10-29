import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import gsap from 'gsap'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnimationClock } from '../playback/animationClock'
import type { SearchEvent } from '../execution/binarySearch'
import { BinarySearchVisualizer } from '../visualizers/binary-search/BinarySearchVisualizer'
import { getSearchScene } from '../visualizers/binary-search/model'
import { getArrayCamera } from './arrayCamera'

const numbers = [2, 5, 9, 14, 20, 27, 35, 44, 56, 69, 83]
const events: SearchEvent[] = [
  { left: 0, mid: 5, right: 10, action: 'move_right' },
  { left: 6, mid: 8, right: 10, action: 'move_right' },
  { left: 9, mid: 9, right: 10, action: 'found' },
]

function clockHarness(initial = 0) {
  let value = initial
  const listeners = new Set<(progress: number) => void>()
  const clock: AnimationClock = { subscribe: (render) => {
    listeners.add(render)
    render(value)
    return () => { listeners.delete(render) }
  } }
  return { clock, listeners, emit: (progress: number) => {
    value = progress
    act(() => listeners.forEach((render) => render(progress)))
  } }
}

function setMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('no-preference') ? !reduced : reduced,
    media: query, addListener: vi.fn(), removeListener: vi.fn(),
  }))
}

beforeEach(() => setMotion(false))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  gsap.ticker.sleep()
})

describe('Sincronización GSAP con el reloj de reproducción', () => {
  it('secuencia comparación, descarte y zoom sin anticipar la siguiente operación', () => {
    const harness = clockHarness()
    const { container } = render(<BinarySearchVisualizer numbers={numbers} target={69} events={events} position={1} view="bars" clock={harness.clock} revision={0} />)
    const scene = container.querySelector<HTMLElement>('.search-scene')!
    const half = container.querySelector<HTMLElement>('.decision-half')!
    const camera = container.querySelector<HTMLElement>('.array-canvas')!
    expect(harness.listeners.size).toBe(1)
    harness.emit(0.3)
    expect(scene.dataset.phase).toBe('comparison')
    expect(Number(half.style.opacity)).toBe(1)
    expect(camera.style.width).toBe('100%')
    const leftPointer = container.querySelector<HTMLElement>('.array-pointer[data-pointer=left]')!
    expect(parseFloat(leftPointer.style.left)).toBeCloseTo(4.55, 1)

    harness.emit(0.44)
    expect(scene.dataset.phase).toBe('discard')
    // A 0.44 (fase de descarte), el puntero left debe seguir en el índice 0 y no haber saltado al 6
    expect(parseFloat(leftPointer.style.left)).toBeCloseTo(4.55, 1)

    harness.emit(0.55)
    expect(scene.dataset.phase).toBe('discard')
    expect(Number(half.style.opacity)).toBeGreaterThan(0.2)
    expect(Number(half.style.opacity)).toBeLessThan(1)
    expect(camera.style.width).toBe('100%')
    harness.emit(0.85)
    expect(scene.dataset.phase).toBe('focus')
    expect(Number(half.style.opacity)).toBeCloseTo(0.2)
    expect(parseFloat(camera.style.width)).toBeGreaterThan(100)
    // A 0.85 (mitad de la fase de enfoque 0.7 -> 1.0), el puntero left ya se está desplazando hacia el nuevo límite (índice 6)
    expect(parseFloat(leftPointer.style.left)).toBeGreaterThan(25)
    harness.emit(1)
    expect(scene.dataset.phase).toBe('complete')
    expect(camera.style.width).toBe('220%')
    expect(parseFloat(leftPointer.style.left)).toBeCloseTo(59.09, 1)
  })

  it('reconstruye saltos, retrocesos y cambios de vista, liberando las suscripciones anteriores', () => {
    const harness = clockHarness(1)
    const props = { numbers, target: 69, events, position: 1, view: 'bars' as const, clock: harness.clock, revision: 0 }
    const { container, rerender, unmount } = render(<StrictMode><BinarySearchVisualizer {...props} /></StrictMode>)
    const original = container.querySelector<HTMLElement>('.array-canvas')!.style.cssText
    rerender(<StrictMode><BinarySearchVisualizer {...props} position={3} revision={1} /></StrictMode>)
    expect(container.querySelector('.decision-half')).toBeNull()
    expect(screen.getByLabelText('Índice 9: 69, en rango, left, mid, encontrado')).toBeDefined()
    expect(harness.listeners.size).toBe(1)
    rerender(<StrictMode><BinarySearchVisualizer {...props} revision={2} /></StrictMode>)
    expect(container.querySelector<HTMLElement>('.array-canvas')!.style.cssText).toBe(original)
    rerender(<StrictMode><BinarySearchVisualizer {...props} view="cells" revision={3} /></StrictMode>)
    expect(Number(container.querySelector<HTMLElement>('.decision-half')!.style.opacity)).toBeCloseTo(0.2)
    expect(harness.listeners.size).toBe(1)
    const animatedNode = container.querySelector<HTMLElement>('.array-canvas')!
    unmount()
    expect(harness.listeners.size).toBe(0)
    expect(animatedNode.style.transform).toBe('')
  })

  it('conserva la fase al cambiar el zoom y evita un tween por cada elemento', () => {
    const harness = clockHarness(0.55)
    const { container } = render(<BinarySearchVisualizer numbers={numbers} target={69} events={events} position={1} view="bars" clock={harness.clock} revision={0} />)
    const opacity = container.querySelector<HTMLElement>('.decision-half')!.style.opacity
    fireEvent.click(screen.getByRole('checkbox', { name: 'Zoom automático al rango activo' }))
    expect(container.querySelector<HTMLElement>('.decision-half')!.style.opacity).toBe(opacity)
    harness.emit(1)
    expect(container.querySelector<HTMLElement>('.array-canvas')!.style.width).toBe('100%')
    const animatedItems = container.querySelectorAll('.array-glyph[style*="transform"]')
    expect(animatedItems.length).toBe(1)
  })

  it('muestra el estado final con movimiento reducido y conserva null y límites fuera del array', () => {
    setMotion(true)
    const harness = clockHarness(0)
    const { container, rerender } = render(<BinarySearchVisualizer numbers={numbers} target={69} events={events} position={1} view="bars" clock={harness.clock} revision={0} />)
    expect(container.querySelector<HTMLElement>('.search-scene')!.dataset.phase).toBe('complete')
    expect(Number(container.querySelector<HTMLElement>('.decision-half')!.style.opacity)).toBe(0.2)
    expect(harness.listeners.size).toBe(0)
    rerender(<BinarySearchVisualizer numbers={[]} target={1} events={[{ left: 0, mid: null, right: -1, action: 'not_found' }]} position={1} view="bars" clock={harness.clock} revision={1} />)
    expect(container.querySelectorAll('.array-item')).toHaveLength(0)
    expect(Array.from(container.querySelectorAll<HTMLElement>('.array-pointer')).every((pointer) => pointer.style.opacity === '0')).toBe(true)
    expect(screen.getByRole('status').textContent).toContain('mid=—')
  })

  it('mantiene acotado el número de tweens con 256 elementos', () => {
    const large = Array.from({ length: 256 }, (_, index) => index)
    const trace: SearchEvent[] = [
      { left: 0, mid: 127, right: 255, action: 'move_right' },
      { left: 128, mid: 191, right: 255, action: 'found' },
    ]
    const harness = clockHarness(0.55)
    const { container } = render(<BinarySearchVisualizer numbers={large} target={191} events={trace} position={1} view="bars" clock={harness.clock} revision={0} />)
    expect(container.querySelectorAll('.array-item')).toHaveLength(256)
    const timelines = gsap.globalTimeline.getChildren(false, false, true).filter((timeline) => timeline.data === 'algorithm-lab-step')
    expect(timelines).toHaveLength(1)
    const tweens = (timelines[0] as gsap.core.Timeline).getChildren(false, true, false) as gsap.core.Tween[]
    expect(tweens.length).toBeLessThanOrEqual(14)
    expect(tweens.every((tween) => tween.targets().length <= 3)).toBe(true)
  })
})

describe('Geometría derivada del historial', () => {
  it('obtiene el rango resultante del siguiente evento de Python', () => {
    const scene = getSearchScene(numbers, events, 1)
    expect(scene.after).toEqual({ left: events[1].left, right: events[1].right })
    expect(scene.focusAfter).toBe(events[1].mid)
  })

  it('acota cámaras para 0, 1 y 256 elementos, rangos vacíos y zoom desactivado', () => {
    expect(getArrayCamera({ left: 0, right: -1 }, 0, 0, 3, true).width).toBe(100)
    expect(getArrayCamera({ left: 0, right: 0 }, 0, 1, 3, true).width).toBe(100)
    const camera = getArrayCamera({ left: 240, right: 255 }, 247, 256, 4, true)
    expect(camera.visible).toBe(4)
    expect(camera.first).toBeGreaterThanOrEqual(240)
    expect(camera.first + camera.visible).toBeLessThanOrEqual(256)
    expect(getArrayCamera({ left: 256, right: 255 }, 255, 256, 4, true).first).toBe(253)
    expect(getArrayCamera({ left: 240, right: 255 }, 247, 256, 4, false)).toEqual({ width: 100, xPercent: 0, first: 0, visible: 256 })
  })
})
