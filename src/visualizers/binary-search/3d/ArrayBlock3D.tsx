import { useEffect, useMemo, useRef, useState } from 'react'
import type { Mesh, MeshStandardMaterial, Sprite } from 'three'
import { useFrame } from '@react-three/fiber'
import type { SearchEvent } from '../../../execution/binarySearch'
import type { IndexRange } from './animation3d'
import { getElement3DTarget } from './animation3d'
import { createFaceLabelTexture, createFloatingBadgeTexture } from './badgeTexture'

interface Props {
  index: number
  value: number
  height: number
  positionX: number
  event: SearchEvent | null
  before: IndexRange
  after: IndexRange
  progress: number
  isSelected: boolean
  showLabel: boolean
  onClick: (index: number) => void
}

export function ArrayBlock3D({
  index,
  value,
  height,
  positionX,
  event,
  before,
  after,
  progress,
  isSelected,
  showLabel,
  onClick,
}: Props) {
  const meshRef = useRef<Mesh>(null)
  const spriteRef = useRef<Sprite>(null)
  const materialRef = useRef<MeshStandardMaterial>(null)
  const isInitialized = useRef(false)
  const [hovered, setHovered] = useState(false)

  // Determine pointer associations: active event takes precedence; falls back to current search bounds
  const currentLeft = event ? event.left : before.left
  const currentRight = event ? event.right : before.right
  const currentMid = event?.mid ?? null

  const isMid = currentMid === index
  const isLeft = currentLeft === index
  const isRight = currentRight === index

  const pointers = useMemo(() => {
    const list: ('L' | 'M' | 'R')[] = []
    if (isLeft) list.push('L')
    if (isMid) list.push('M')
    if (isRight) list.push('R')
    return list
  }, [isLeft, isMid, isRight])

  const floatingBadgeTexture = useMemo(() => {
    return createFloatingBadgeTexture({
      value,
      index,
      pointers,
      isMid,
      isLeft,
      isRight,
      isSelected,
      isHovered: hovered,
    })
  }, [value, index, pointers, isMid, isLeft, isRight, isSelected, hovered])

  const faceLabelTexture = useMemo(() => {
    return createFaceLabelTexture({
      value,
      index,
      isMid,
      isSelected,
    })
  }, [value, index, isMid, isSelected])

  useEffect(() => {
    return () => {
      floatingBadgeTexture.dispose()
      faceLabelTexture.dispose()
    }
  }, [floatingBadgeTexture, faceLabelTexture])

  // Initialize position and materials on first mount without flash
  useEffect(() => {
    const mesh = meshRef.current
    const mat = materialRef.current
    if (!mesh || !mat || isInitialized.current) return

    const target = getElement3DTarget(
      index,
      height,
      event,
      before,
      after,
      progress,
      isSelected,
      false
    )

    mesh.position.set(0, target.posY, target.posZ)
    mesh.scale.set(target.scale, target.scale, target.scale)
    mat.color.copy(target.color)
    mat.emissive.copy(target.emissive)
    mat.emissiveIntensity = target.emissiveIntensity
    mat.opacity = target.opacity
    mat.transparent = target.transparent
    isInitialized.current = true
  }, [index, height, event, before, after, progress, isSelected])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    const mat = materialRef.current
    if (!mesh || !mat) return

    const target = getElement3DTarget(
      index,
      height,
      event,
      before,
      after,
      progress,
      isSelected,
      hovered
    )

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    if (prefersReducedMotion) {
      mesh.position.set(0, target.posY, target.posZ)
      mesh.scale.set(target.scale, target.scale, target.scale)
      mat.color.copy(target.color)
      mat.emissive.copy(target.emissive)
      mat.emissiveIntensity = target.emissiveIntensity
      mat.opacity = target.opacity
      mat.transparent = target.transparent
    } else {
      const damp = Math.min(1, delta * 12)

      mesh.position.y += (target.posY - mesh.position.y) * damp
      mesh.position.z += (target.posZ - mesh.position.z) * damp

      const curScale = mesh.scale.x
      const nextScale = curScale + (target.scale - curScale) * damp
      mesh.scale.set(nextScale, nextScale, nextScale)

      mat.color.lerp(target.color, damp)
      mat.emissive.lerp(target.emissive, damp)
      mat.emissiveIntensity += (target.emissiveIntensity - mat.emissiveIntensity) * damp
      mat.opacity += (target.opacity - mat.opacity) * damp
      mat.transparent = target.transparent || mat.opacity < 0.98
    }

    const sprite = spriteRef.current
    if (sprite) {
      sprite.position.y = mesh.position.y + height / 2 + (pointers.length > 0 ? 0.95 : 0.75)
      sprite.position.z = mesh.position.z
    }
  })

  return (
    <group position={[positionX, 0, 0]}>
      {/* 3D Array Bar Mesh */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation()
          onClick(index)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.85, height, 0.85]} />
        <meshStandardMaterial
          ref={materialRef}
          roughness={0.25}
          metalness={0.1}
        />

        {/* Front-face value and index engraved directly onto the 3D bar */}
        <mesh position={[0, 0, 0.435]}>
          <planeGeometry args={[0.72, Math.min(0.72, height * 0.75)]} />
          <meshBasicMaterial
            map={faceLabelTexture}
            transparent
            opacity={0.95}
            depthWrite={false}
          />
        </mesh>
      </mesh>

      {/* Floating 3D WebGL Billboard Badge with pointers (L, M, R), value and index */}
      {(isMid || isLeft || isRight || isSelected || showLabel || hovered) && (
        <sprite
          ref={spriteRef}
          position={[0, height + (pointers.length > 0 ? 0.95 : 0.75), 0]}
          scale={[1.25, pointers.length > 0 ? 1.05 : 0.78, 1]}
          renderOrder={999}
          onClick={(e) => {
            e.stopPropagation()
            onClick(index)
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
          }}
          onPointerOut={() => setHovered(false)}
        >
          <spriteMaterial
            map={floatingBadgeTexture}
            depthTest={false}
            depthWrite={false}
            transparent
          />
        </sprite>
      )}
    </group>
  )
}
