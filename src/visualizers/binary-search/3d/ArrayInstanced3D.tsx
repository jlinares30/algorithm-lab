import { useEffect, useMemo, useRef } from 'react'
import { Color, Matrix4, Quaternion, Vector3 } from 'three'
import type { Group, InstancedMesh } from 'three'
import { useFrame } from '@react-three/fiber'
import type { SearchEvent } from '../../../execution/binarySearch'
import type { ArrayItem } from '../../../components/ArrayVisualization'
import type { IndexRange } from './animation3d'
import { getElement3DTarget } from './animation3d'
import { createPointerBeaconTexture } from './badgeTexture'

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
  const leftGroupRef = useRef<Group>(null)
  const midGroupRef = useRef<Group>(null)
  const rightGroupRef = useRef<Group>(null)

  const count = items.length
  const span = maxVal - minVal || 1

  const currentLeft = event ? event.left : before.left
  const currentRight = event ? event.right : before.right
  const currentMid = event?.mid ?? null

  // Heights array computed from item values
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
    // Prevent wiping buffer on step transitions to eliminate visual flashing
    if (buffersRef.current && buffersRef.current.positions.length === count * 3) {
      return
    }
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

  // Native 3D WebGL pointer beacon textures for high visibility at large scales
  const leftTexture = useMemo(() => {
    if (currentLeft < 0 || currentLeft >= count) return null
    return createPointerBeaconTexture({
      pointer: 'L',
      index: currentLeft,
      value: items[currentLeft]?.value,
    })
  }, [currentLeft, count, items])

  const midTexture = useMemo(() => {
    if (currentMid === null || currentMid < 0 || currentMid >= count) return null
    return createPointerBeaconTexture({
      pointer: 'M',
      index: currentMid,
      value: items[currentMid]?.value,
    })
  }, [currentMid, count, items])

  const rightTexture = useMemo(() => {
    if (currentRight < 0 || currentRight >= count) return null
    return createPointerBeaconTexture({
      pointer: 'R',
      index: currentRight,
      value: items[currentRight]?.value,
    })
  }, [currentRight, count, items])

  useEffect(() => {
    return () => {
      leftTexture?.dispose()
      midTexture?.dispose()
      rightTexture?.dispose()
    }
  }, [leftTexture, midTexture, rightTexture])

  // Target X coordinates for the pointer beacons
  const leftTargetX = currentLeft >= 0 && currentLeft < count ? (currentLeft - (count - 1) / 2) * spacing : 0
  const midTargetX = currentMid !== null && currentMid >= 0 && currentMid < count ? (currentMid - (count - 1) / 2) * spacing : 0
  const rightTargetX = currentRight >= 0 && currentRight < count ? (currentRight - (count - 1) / 2) * spacing : 0

  useFrame((_, delta) => {
    const mesh = meshRef.current
    const buffers = buffersRef.current
    if (!mesh || !buffers) return

    const currentPositions = buffers.positions
    const currentScales = buffers.scales
    const currentColors = buffers.colors

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    const damp = prefersReducedMotion ? 1 : Math.min(1, delta * 12)

    // Smoothly glide beacon groups across the array
    if (leftGroupRef.current) {
      leftGroupRef.current.position.x += (leftTargetX - leftGroupRef.current.position.x) * damp
    }
    if (midGroupRef.current) {
      midGroupRef.current.position.x += (midTargetX - midGroupRef.current.position.x) * damp
    }
    if (rightGroupRef.current) {
      rightGroupRef.current.position.x += (rightTargetX - rightGroupRef.current.position.x) * damp
    }

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

      let targetR = target.color.r
      let targetG = target.color.g
      let targetB = target.color.b

      // Give distinct glowing highlight to Left (sky-blue) and Right (purple) in large arrays
      if (i === currentLeft && i !== currentMid) {
        targetR = 0.22
        targetG = 0.74
        targetB = 0.97
      } else if (i === currentRight && i !== currentMid) {
        targetR = 0.75
        targetG = 0.52
        targetB = 0.99
      }

      currentColors[i * 3] = cr + (targetR - cr) * damp
      currentColors[i * 3 + 1] = cg + (targetG - cg) * damp
      currentColors[i * 3 + 2] = cb + (targetB - cb) * damp

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

  // Dimensions for tapered beacons
  const spriteH = 1.9
  const leftH = heights[currentLeft] ?? 1.5
  const leftBadgeCenterY = leftH + 1.1 + spriteH / 2
  const leftNeedleLen = 1.1
  const leftNeedleCenterY = leftH + leftNeedleLen / 2

  const midH = heights[currentMid ?? 0] ?? 1.5
  const midBadgeCenterY = midH + 1.1 + spriteH / 2
  const midNeedleLen = 1.1
  const midNeedleCenterY = midH + midNeedleLen / 2

  const rightH = heights[currentRight] ?? 1.5
  const rightBadgeCenterY = rightH + 1.1 + spriteH / 2
  const rightNeedleLen = 1.1
  const rightNeedleCenterY = rightH + rightNeedleLen / 2

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

      {/* 1. Left Pointer 3D Beacon, Needle and Floor Ring */}
      {leftTexture && currentLeft >= 0 && currentLeft < count && (
        <group ref={leftGroupRef} position={[leftTargetX, 0, 0]}>
          {/* Glowing floor ring */}
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.22, 0.88, 32]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} depthWrite={false} />
          </mesh>

          {/* Tapered beacon pin from bar to badge */}
          <mesh position={[0, leftNeedleCenterY, 0]}>
            <cylinderGeometry args={[0.025, 0.065, leftNeedleLen, 16]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} depthWrite={false} />
          </mesh>

          {/* Native 3D Billboard Sprite Badge */}
          <sprite
            position={[0, leftBadgeCenterY, 0]}
            scale={[3.3, 1.86, 1]}
            renderOrder={999}
          >
            <spriteMaterial
              map={leftTexture}
              depthTest={false}
              depthWrite={false}
              transparent
            />
          </sprite>
        </group>
      )}

      {/* 2. Mid Pointer 3D Beacon, Needle and Floor Ring */}
      {midTexture && currentMid !== null && currentMid >= 0 && currentMid < count && (
        <group ref={midGroupRef} position={[midTargetX, 0, 0]}>
          {/* Glowing floor ring */}
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.22, 0.88, 32]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.65} depthWrite={false} />
          </mesh>

          {/* Tapered beacon pin from bar to badge */}
          <mesh position={[0, midNeedleCenterY, 0]}>
            <cylinderGeometry args={[0.025, 0.065, midNeedleLen, 16]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} depthWrite={false} />
          </mesh>

          {/* Native 3D Billboard Sprite Badge */}
          <sprite
            position={[0, midBadgeCenterY, 0]}
            scale={[3.3, 1.86, 1]}
            renderOrder={999}
          >
            <spriteMaterial
              map={midTexture}
              depthTest={false}
              depthWrite={false}
              transparent
            />
          </sprite>
        </group>
      )}

      {/* 3. Right Pointer 3D Beacon, Needle and Floor Ring */}
      {rightTexture && currentRight >= 0 && currentRight < count && (
        <group ref={rightGroupRef} position={[rightTargetX, 0, 0]}>
          {/* Glowing floor ring */}
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.22, 0.88, 32]} />
            <meshBasicMaterial color="#c084fc" transparent opacity={0.65} depthWrite={false} />
          </mesh>

          {/* Tapered beacon pin from bar to badge */}
          <mesh position={[0, rightNeedleCenterY, 0]}>
            <cylinderGeometry args={[0.025, 0.065, rightNeedleLen, 16]} />
            <meshBasicMaterial color="#c084fc" transparent opacity={0.8} depthWrite={false} />
          </mesh>

          {/* Native 3D Billboard Sprite Badge */}
          <sprite
            position={[0, rightBadgeCenterY, 0]}
            scale={[3.3, 1.86, 1]}
            renderOrder={999}
          >
            <spriteMaterial
              map={rightTexture}
              depthTest={false}
              depthWrite={false}
              transparent
            />
          </sprite>
        </group>
      )}
    </group>
  )
}
