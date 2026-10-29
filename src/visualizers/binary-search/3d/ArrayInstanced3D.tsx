import { useEffect, useMemo, useRef } from 'react'
import { Color, Matrix4, Quaternion, Vector3 } from 'three'
import type { InstancedMesh } from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { SearchEvent } from '../../../execution/binarySearch'
import type { ArrayItem } from '../../../components/ArrayVisualization'
import type { IndexRange } from './animation3d'
import { getElement3DTarget } from './animation3d'

interface Props {
  items: ArrayItem[]
  event: SearchEvent | null
  before: IndexRange
  after: IndexRange
  progress: number
  selectedIndex: number | null
  minVal: number
  maxVal: number
  spacing: number
  onSelect: (index: number) => void
}

// Pre-allocated scratch math objects to avoid GC churn in useFrame
const matrix = new Matrix4()
const posVec = new Vector3()
const scaleVec = new Vector3()
const rotQuat = new Quaternion()
const tempColor = new Color()

export function ArrayInstanced3D({
  items,
  event,
  before,
  after,
  progress,
  selectedIndex,
  minVal,
  maxVal,
  spacing,
  onSelect,
}: Props) {
  const meshRef = useRef<InstancedMesh>(null)
  const count = items.length
  const span = maxVal - minVal || 1

  const currentLeft = event ? event.left : before.left
  const currentRight = event ? event.right : before.right

  // Heights array
  const heights = useMemo(() => {
    return items.map((item) => Math.max(0.9, ((item.value - minVal) / span) * 4.2 + 0.9))
  }, [items, minVal, span])

  // Persistent TypedArrays for fast 60/120fps interpolation without allocation
  const buffersRef = useRef<{
    positions: Float32Array
    scales: Float32Array
    colors: Float32Array
  } | null>(null)

  useEffect(() => {
    const pArr = new Float32Array(count * 3)
    const sArr = new Float32Array(count * 3)
    const cArr = new Float32Array(count * 3)
    const baseColor = new Color('#0284c7')
    for (let i = 0; i < count; i++) {
      pArr[i * 3] = (i - (count - 1) / 2) * spacing
      pArr[i * 3 + 1] = heights[i] / 2
      pArr[i * 3 + 2] = 0

      sArr[i * 3] = 0.85
      sArr[i * 3 + 1] = heights[i]
      sArr[i * 3 + 2] = 0.85

      cArr[i * 3] = baseColor.r
      cArr[i * 3 + 1] = baseColor.g
      cArr[i * 3 + 2] = baseColor.b
    }
    buffersRef.current = { positions: pArr, scales: sArr, colors: cArr }
  }, [count, heights, spacing])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    const buffers = buffersRef.current
    if (!mesh || !buffers) return

    const currentPositions = buffers.positions
    const currentScales = buffers.scales
    const currentColors = buffers.colors
    if (!mesh) return

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    const damp = prefersReducedMotion ? 1 : Math.min(1, delta * 12)

    for (let i = 0; i < count; i++) {
      const h = heights[i]
      const target = getElement3DTarget(
        i,
        h,
        event,
        before,
        after,
        progress,
        selectedIndex === i,
        false
      )

      // Interpolate Y and Z coordinates
      const curY = currentPositions[i * 3 + 1]
      const curZ = currentPositions[i * 3 + 2]
      const nextY = curY + (target.posY - curY) * damp
      const nextZ = curZ + (target.posZ - curZ) * damp
      currentPositions[i * 3 + 1] = nextY
      currentPositions[i * 3 + 2] = nextZ

      // Interpolate Scale
      const curScale = currentScales[i * 3]
      const nextScale = curScale + (target.scale * 0.85 - curScale) * damp
      currentScales[i * 3] = nextScale
      currentScales[i * 3 + 1] = nextScale * (h / 0.85)
      currentScales[i * 3 + 2] = nextScale

      posVec.set(currentPositions[i * 3], nextY, nextZ)
      scaleVec.set(nextScale, currentScales[i * 3 + 1], nextScale)
      matrix.compose(posVec, rotQuat, scaleVec)
      mesh.setMatrixAt(i, matrix)

      // Interpolate Color
      const cr = currentColors[i * 3]
      const cg = currentColors[i * 3 + 1]
      const cb = currentColors[i * 3 + 2]
      currentColors[i * 3] = cr + (target.color.r - cr) * damp
      currentColors[i * 3 + 1] = cg + (target.color.g - cg) * damp
      currentColors[i * 3 + 2] = cb + (target.color.b - cb) * damp

      tempColor.setRGB(
        currentColors[i * 3],
        currentColors[i * 3 + 1],
        currentColors[i * 3 + 2]
      )
      mesh.setColorAt(i, tempColor)
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, count]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation()
          if (e.instanceId !== undefined && e.instanceId >= 0 && e.instanceId < count) {
            onSelect(e.instanceId)
          }
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          roughness={0.25}
          metalness={0.1}
        />
      </instancedMesh>

      {/* Floating badges for active pointers in large array mode */}
      {currentLeft >= 0 && currentLeft < count && (
        <group
          position={[
            (currentLeft - (count - 1) / 2) * spacing,
            (heights[currentLeft] ?? 2) + 1.2,
            0,
          ]}
        >
          <Html center distanceFactor={22} className="pointer-events-none select-none">
            <span className="rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-md">
              L [{currentLeft}]
            </span>
          </Html>
        </group>
      )}

      {event?.mid !== null && event?.mid !== undefined && (
        <group
          position={[
            (event.mid - (count - 1) / 2) * spacing,
            (heights[event.mid] ?? 2) + 1.2,
            0,
          ]}
        >
          <Html center distanceFactor={22} className="pointer-events-none select-none">
              <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-950 shadow-md">
                M [{event.mid}]
              </span>
          </Html>
        </group>
      )}

      {currentRight >= 0 && currentRight < count && (
        <group
          position={[
            (currentRight - (count - 1) / 2) * spacing,
            (heights[currentRight] ?? 2) + 1.2,
            0,
          ]}
        >
          <Html center distanceFactor={22} className="pointer-events-none select-none">
            <span className="rounded bg-purple-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-md">
              R [{currentRight}]
            </span>
          </Html>
        </group>
      )}
    </group>
  )
}
