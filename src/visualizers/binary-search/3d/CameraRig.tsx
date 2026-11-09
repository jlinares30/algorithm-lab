import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { ComponentRef, RefObject } from 'react'
import { Vector3 } from 'three'
import type { IndexRange } from './animation3d'
import { smoothstep } from './animation3d'

interface Props {
  count: number
  before: IndexRange
  after: IndexRange
  progressRef: RefObject<number>
  spacing: number
  resetTrigger: number
}

export function CameraRig({
  count,
  before,
  after,
  progressRef,
  spacing,
  resetTrigger,
}: Props) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const { camera } = useThree()
  const isInteracting = useRef(false)
  const userHasMovedCamera = useRef(false)
  const isInitialized = useRef(false)
  const targetLookAt = useRef(new Vector3(0, 2.0, 0))
  const targetCamPos = useRef(new Vector3(0, 14, 24))

  const fullArraySpan = count * spacing

  // Recomputes the desired framing for the current animation progress. In
  // Phase 3 (0.75 -> 1.0) focus moves smoothly from `before` to `after`.
  function updateTargets(progress: number) {
    const tRange = smoothstep(0.75, 1.0, progress)
    const curLeft = before.left + (after.left - before.left) * tRange
    const curRight = before.right + (after.right - before.right) * tRange

    const activeCenterX = ((curLeft + curRight) / 2 - (count - 1) / 2) * spacing
    const activeSpan = Math.max(1, curRight - curLeft + 1)

    // Clean array overview while focusing gently on the active range
    const maxFrameDistance = Math.max(65, fullArraySpan * 0.95 + 16)
    const targetDistance = Math.max(
      18,
      Math.min(maxFrameDistance, activeSpan * spacing * 1.15 + 15)
    )

    targetLookAt.current.set(activeCenterX, 2.0, 0)
    targetCamPos.current.set(
      activeCenterX,
      Math.max(6, targetDistance * 0.45 + 2),
      Math.max(14, targetDistance * 0.85)
    )
  }

  // Reset user movement override when dataset size changes
  useEffect(() => {
    userHasMovedCamera.current = false
  }, [count])

  // Reset to default vantage point when resetTrigger changes (explicit user
  // click). The snap happens on the next frame, where the framing for the
  // current progress is known.
  const pendingReset = useRef(false)
  useEffect(() => {
    if (resetTrigger === 0) return
    userHasMovedCamera.current = false
    pendingReset.current = true
  }, [resetTrigger])

  // Smooth lerp when user is not manually orbiting and has not customized the camera view
  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls || isInteracting.current || userHasMovedCamera.current) return
    updateTargets(progressRef.current)

    if (pendingReset.current) {
      pendingReset.current = false
      isInitialized.current = false
    }

    if (!isInitialized.current) {
      controls.target.copy(targetLookAt.current)
      camera.position.copy(targetCamPos.current)
      controls.update()
      isInitialized.current = true
      return
    }

    const factor = Math.min(1, delta * 4)
    controls.target.lerp(targetLookAt.current, factor)
    camera.position.lerp(targetCamPos.current, factor)
    controls.update()
  })

  const maxOrbitDist = Math.max(160, fullArraySpan * 2.5 + 80)

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={5}
      maxDistance={maxOrbitDist}
      maxPolarAngle={Math.PI / 2 + 0.05} // don't go below ground plane
      onStart={() => {
        isInteracting.current = true
        userHasMovedCamera.current = true
      }}
      onEnd={() => {
        isInteracting.current = false
      }}
    />
  )
}
