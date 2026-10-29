import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Vector3 } from 'three'
import type { IndexRange } from './animation3d'
import { smoothstep } from './animation3d'

interface Props {
  count: number
  before: IndexRange
  after: IndexRange
  progress: number
  spacing: number
  resetTrigger: number
}

export function CameraRig({
  count,
  before,
  after,
  progress,
  spacing,
  resetTrigger,
}: Props) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { camera } = useThree()
  const isInteracting = useRef(false)
  const userHasMovedCamera = useRef(false)
  const isInitialized = useRef(false)
  const targetLookAt = useRef(new Vector3(0, 2.0, 0))
  const targetCamPos = useRef(new Vector3(0, 14, 24))

  // In Phase 3 (0.75 -> 1.0), transition camera focus smoothly from `before` to `after`
  const tRange = smoothstep(0.75, 1.0, progress)
  const curLeft = before.left + (after.left - before.left) * tRange
  const curRight = before.right + (after.right - before.right) * tRange

  const activeCenterIndex = (curLeft + curRight) / 2
  const activeCenterX = (activeCenterIndex - (count - 1) / 2) * spacing
  const activeSpan = Math.max(1, curRight - curLeft + 1)

  // Camera framing: targetDistance ensures clean array overview while focusing gently on active range
  const targetDistance = Math.max(18, Math.min(65, activeSpan * spacing * 1.35 + 13))

  // Update desired camera focus whenever the target range changes
  useEffect(() => {
    targetLookAt.current.set(activeCenterX, 2.0, 0)
    targetCamPos.current.set(
      activeCenterX,
      Math.max(6, targetDistance * 0.45 + 2),
      Math.max(14, targetDistance * 0.85)
    )
  }, [activeCenterX, targetDistance])

  // Reset user movement override when dataset size changes
  useEffect(() => {
    userHasMovedCamera.current = false
  }, [count])

  // Reset to default vantage point when resetTrigger changes (explicit user click)
  useEffect(() => {
    if (resetTrigger === 0) return
    userHasMovedCamera.current = false
    const controls = controlsRef.current
    if (controls) {
      controls.target.copy(targetLookAt.current)
      camera.position.copy(targetCamPos.current)
      controls.update()
    }
  }, [resetTrigger, camera])

  // Smooth lerp when user is not manually orbiting and has not customized the camera view
  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls || isInteracting.current || userHasMovedCamera.current) return

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

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={5}
      maxDistance={120}
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
