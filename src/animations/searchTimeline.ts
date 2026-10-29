import gsap from 'gsap'
import type { IndexRange } from '../visualizers/binary-search/model'
import type { getArrayCamera } from './arrayCamera'
import type { SearchEvent } from '../execution/binarySearch'

export interface SceneGeometry {
  count: number
  before: IndexRange
  after: IndexRange
  cameraBefore: ReturnType<typeof getArrayCamera>
  cameraAfter: ReturnType<typeof getArrayCamera>
  hasEvent: boolean
  midIndex?: number | null
  prevMidIndex?: number | null
  action?: SearchEvent['action']
}

export function buildSearchTimeline(root: HTMLElement, scene: SceneGeometry) {
  const select = gsap.utils.selector(root)
  const timeline = gsap.timeline({ data: 'algorithm-lab-step', paused: true, defaults: { ease: 'power2.inOut' } })

  const n = Math.max(1, scene.count)

  // Reapply the pointers' baseline positions and labels explicitly from scene.before
  const leftPointer = select('.array-pointer[data-pointer=left]')
  const rightPointer = select('.array-pointer[data-pointer=right]')

  const leftStartPct = ((scene.before.left + 0.5) / n) * 100
  const rightStartPct = ((scene.before.right + 0.5) / n) * 100

  gsap.set(select('.array-pointer'), { opacity: (_index, element: HTMLElement) => element.dataset.visible === 'true' ? 1 : 0, y: 0 })

  if (leftPointer.length) {
    gsap.set(leftPointer, { left: `${leftStartPct}%` })
    const leftVal = select('.array-pointer[data-pointer=left] b')
    if (leftVal.length) gsap.set(leftVal, { textContent: `${scene.before.left}` })
  }
  if (rightPointer.length) {
    gsap.set(rightPointer, { left: `${rightStartPct}%` })
    const rightVal = select('.array-pointer[data-pointer=right] b')
    if (rightVal.length) gsap.set(rightVal, { textContent: `${scene.before.right}` })
  }
  const rangeStyle = (range: IndexRange) => ({
    left: `${(range.left / n) * 100}%`,
    width: `${(Math.max(0, range.right - range.left + 1) / n) * 100}%`,
    opacity: range.right >= range.left ? 1 : 0,
  })
  const cameraStyle = (camera: SceneGeometry['cameraBefore']) => ({ width: `${camera.width}%`, xPercent: camera.xPercent })

  // Master timeline duration: 1 normalized second, driven by AnimationClock
  timeline.to({}, { duration: 1 }, 0)

  // 4. Actualización del rango y 5. Enfoque suave del nuevo rango (0.7 -> 1.0)
  timeline.fromTo(select('.array-canvas'), cameraStyle(scene.cameraBefore), { ...cameraStyle(scene.cameraAfter), duration: 0.3 }, 0.7)
  timeline.fromTo(select('.array-range'), rangeStyle(scene.before), { ...rangeStyle(scene.after), duration: 0.3 }, 0.7)

  const overviewWindow = select('.overview-window')
  if (overviewWindow.length) {
    timeline.fromTo(
      overviewWindow,
      { attr: { x: (scene.cameraBefore.first / n) * 1000, width: (scene.cameraBefore.visible / n) * 1000 } },
      { attr: { x: (scene.cameraAfter.first / n) * 1000, width: (scene.cameraAfter.visible / n) * 1000 }, duration: 0.3 },
      0.7
    )
  }

  if (!scene.hasEvent) return timeline

  // 1. El indicador mid se desplaza hasta el elemento central (0 -> 0.25)
  const visibleMidPointer = select('.array-pointer[data-pointer=mid][data-visible=true]')
  const otherPointers = select('.array-pointer:not([data-pointer=mid])[data-visible=true]')
  if (otherPointers.length) {
    timeline.fromTo(otherPointers, { y: -6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.15 }, 0)
  }

    if (visibleMidPointer.length && scene.midIndex !== null && scene.midIndex !== undefined) {
      const startIdx = scene.prevMidIndex ?? scene.before.left
      const targetLeft = ((scene.midIndex + 0.5) / n) * 100
      if (startIdx !== scene.midIndex) {
        const startLeft = ((startIdx + 0.5) / n) * 100
        timeline.fromTo(visibleMidPointer, { left: `${startLeft}%`, opacity: 0.5, y: -4 }, { left: `${targetLeft}%`, opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, 0)
      } else {
        timeline.fromTo(visibleMidPointer, { y: -8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: 'power2.out' }, 0)
      }
    }

    // 2. El elemento central se destaca y aparece la comparación con el objetivo (0.2 -> 0.4)
    const mid = select('.array-item[data-state="mid"] .array-glyph, .array-item[data-state="found"] .array-glyph')
    if (mid.length) {
      timeline.fromTo(mid, { y: 0, scaleX: 1 }, { y: -6, scaleX: 1.08, duration: 0.2, ease: 'back.out(2)' }, 0.2)
    }
    timeline.fromTo(select('.comparison-badge'), { opacity: 0.25, y: 5 }, { opacity: 1, y: 0, duration: 0.18 }, 0.2)

    // 3. La mitad descartada se atenúa mediante una transición progresiva (0.4 -> 0.7)
    // Incluye el puntero mid si este paso descarta elementos
    const isMove = scene.action === 'move_right' || scene.action === 'move_left'
    const discardSelector = isMove
      ? '.decision-half, .overview-discard, .array-pointer[data-pointer=mid][data-visible=true]'
      : '.decision-half, .overview-discard'
    const discardedItems = select(discardSelector)
    if (discardedItems.length) {
      timeline.fromTo(discardedItems, { opacity: 1, y: 0 }, { opacity: 0.2, y: 12, duration: 0.3 }, 0.4)
    }

    // 4. Actualización del puntero correspondiente al nuevo límite (0.7 -> 1.0)
    if (isMove) {
      const isMoveRight = scene.action === 'move_right'
        const boundaryPointer = isMoveRight ? leftPointer : rightPointer
        const startIdx = isMoveRight ? scene.before.left : scene.before.right
        const targetIdx = isMoveRight ? scene.after.left : scene.after.right
        const startPct = ((startIdx + 0.5) / n) * 100
        const targetPct = ((targetIdx + 0.5) / n) * 100

        if (boundaryPointer.length && startIdx !== targetIdx) {
          const boundaryVal = select(`.array-pointer[data-pointer=${isMoveRight ? 'left' : 'right'}] b`)[0]
          timeline.fromTo(
            boundaryPointer,
            { left: `${startPct}%` },
            {
              left: `${targetPct}%`,
              duration: 0.3,
              ease: 'power2.inOut',
              onUpdate: function () {
                if (boundaryVal) {
                  const current = this.progress() >= 0.5 ? targetIdx : startIdx
                  if (boundaryVal.textContent !== `${current}`) {
                    boundaryVal.textContent = `${current}`
                  }
                }
              },
            },
            0.7
          )
        }
      }

      timeline.set(root, { attr: { 'data-phase': 'comparison' } }, 0)
      timeline.set(root, { attr: { 'data-phase': 'discard' } }, 0.4)
      timeline.set(root, { attr: { 'data-phase': 'focus' } }, 0.7)
      timeline.set(root, { attr: { 'data-phase': 'complete' } }, 1)

      return timeline
    }
