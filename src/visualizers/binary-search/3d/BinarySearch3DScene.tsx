import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import type { SearchEvent } from '../../../execution/binarySearch'
import type { ArrayItem } from '../../../components/ArrayVisualization'
import type { AnimationClock } from '../../../playback/animationClock'
import type { IndexRange } from './animation3d'
import { smoothstep } from './animation3d'
import { ArrayBlock3D } from './ArrayBlock3D'
import { ArrayInstanced3D } from './ArrayInstanced3D'
import { CameraRig } from './CameraRig'

interface Props {
  numbers: number[]
  target: number
  items: ArrayItem[]
  event: SearchEvent | null
  before: IndexRange
  after: IndexRange
  selectedIndex: number | null
  resetCamTrigger: number
  clock?: AnimationClock
  revision?: number
  onSelect: (index: number) => void
}

function FloorRangeHighlight({
  count,
  spacing,
  before,
  after,
  progress,
}: {
  count: number
  spacing: number
  before: IndexRange
  after: IndexRange
  progress: number
}) {
  const meshRef = useRef<Mesh>(null)
  const isInitialized = useRef(false)

  const t = smoothstep(0.75, 1.0, progress)
  const curLeft = before.left + (after.left - before.left) * t
  const curRight = before.right + (after.right - before.right) * t

  const targetX = ((curLeft + curRight) / 2 - (count - 1) / 2) * spacing
  const targetWidth = Math.max(0.1, (curRight - curLeft + 1) * spacing)

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    if (!isInitialized.current) {
      mesh.position.set(targetX, 0.02, 0)
      mesh.scale.set(targetWidth, 1, 1)
      isInitialized.current = true
      return
    }

    const damp = Math.min(1, delta * 12)
    mesh.position.x += (targetX - mesh.position.x) * damp
    mesh.scale.x += (targetWidth - mesh.scale.x) * damp
  })

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[1, 3.5]} />
      <meshBasicMaterial
        color="#38bdf8"
        transparent
        opacity={0.16}
        depthWrite={false}
      />
    </mesh>
  )
}

function SceneContent({
  numbers,
  target,
  items,
  event,
  before,
  after,
  selectedIndex,
  resetCamTrigger,
  clock,
  revision = 0,
  onSelect,
}: Props) {
  const count = numbers.length
  const spacing = count > 64 ? 1.05 : 1.25

  const minVal = Math.min(0, target, ...numbers)
  const maxVal = Math.max(0, target, ...numbers)
  const span = maxVal - minVal || 1

  const isInstanced = count > 64

  // Track event changes so step advances start smoothly at progress 0 without flashing the previous step
  const [prevEvent, setPrevEvent] = useState<SearchEvent | null>(event)
  const [currentProgress, setCurrentProgress] = useState(event ? 0 : 1)

  if (prevEvent !== event) {
    setPrevEvent(event)
    setCurrentProgress(event ? 0 : 1)
  }

  useEffect(() => {
    if (!clock) return
    return clock.subscribe((p) => {
      setCurrentProgress(p)
    })
  }, [clock, revision])

  // Scale fog dynamically to never obscure large arrays or distant pointer beacons
  const fullWidth = count * spacing
  const fogFar = Math.max(160, fullWidth * 2.8 + 120)
  const fogNear = Math.max(45, fogFar * 0.35)

  return (
    <>
      <color attach="background" args={['#020617']} />
      <fog attach="fog" args={['#020617', fogNear, fogFar]} />

      <ambientLight intensity={0.7} />
      <directionalLight
        position={[15, 25, 20]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-15, 12, -8]} intensity={0.5} color="#38bdf8" />
      <pointLight position={[0, 8, 5]} intensity={0.3} color="#34d399" />

      {/* Ground plane & grid */}
      <gridHelper
        args={[Math.max(240, fullWidth * 2.2), 120, '#334155', '#0f172a']}
        position={[0, 0, 0]}
      />

      {/* Active Range Highlight on the floor */}
      {before && count > 0 && (
        <FloorRangeHighlight
          count={count}
          spacing={spacing}
          before={before}
          after={after}
          progress={currentProgress}
        />
      )}

      {/* Array Elements */}
      {isInstanced ? (
        <ArrayInstanced3D
          items={items}
          event={event}
          before={before}
          after={after}
          progress={currentProgress}
          selectedIndex={selectedIndex}
          minVal={minVal}
          maxVal={maxVal}
          spacing={spacing}
          onSelect={onSelect}
        />
      ) : (
        <group>
          {items.map((item) => {
            const h = Math.max(0.9, ((item.value - minVal) / span) * 4.2 + 0.9)
            const posX = (item.index - (count - 1) / 2) * spacing
            return (
              <ArrayBlock3D
                key={item.index}
                index={item.index}
                value={item.value}
                height={h}
                positionX={posX}
                event={event}
                before={before}
                after={after}
                progress={currentProgress}
                isSelected={selectedIndex === item.index}
                showLabel={count <= 32}
                onClick={onSelect}
              />
            )
          })}
        </group>
      )}

      {/* OrbitControls and reactive camera focus */}
      <CameraRig
        count={count}
        before={before}
        after={after}
        progress={currentProgress}
        spacing={spacing}
        resetTrigger={resetCamTrigger}
      />
    </>
  )
}

export function BinarySearch3DScene(props: Props) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 14, 24], fov: 45 }}
      className="h-full w-full"
      style={{ background: '#020617' }}
    >
      <SceneContent {...props} />
    </Canvas>
  )
}
