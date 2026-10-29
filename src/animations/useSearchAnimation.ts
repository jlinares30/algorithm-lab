import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import type { RefObject } from 'react'
import type { AnimationClock } from '../playback/animationClock'
import { buildSearchTimeline } from './searchTimeline'

gsap.registerPlugin(useGSAP)

export function useSearchAnimation(scope: RefObject<HTMLDivElement | null>, clock: AnimationClock, geometry: Parameters<typeof buildSearchTimeline>[1], revision: number, view: string) {
  useGSAP(() => {
    if (!scope.current) return
    const root = scope.current
    function connect(reduced: boolean) {
      const timeline = buildSearchTimeline(root, geometry)
      if (reduced) {
        timeline.progress(1, true)
        return
      }
      return clock.subscribe((progress) => { timeline.progress(progress, true) })
    }
    if (!window.matchMedia) return connect(true)
    const media = gsap.matchMedia()
    media.add({ reduced: '(prefers-reduced-motion: reduce)', full: '(prefers-reduced-motion: no-preference)' }, (context) => connect(Boolean(context.conditions?.reduced)))
    return () => media.revert()
  }, { scope, dependencies: [clock, geometry, revision, view], revertOnUpdate: true })
}
