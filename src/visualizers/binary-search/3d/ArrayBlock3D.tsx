import { useRef, useState } from 'react'
import type { Mesh, MeshStandardMaterial } from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { SearchEvent } from '../../../execution/binarySearch'
import type { IndexRange } from './animation3d'
import { getElement3DTarget } from './animation3d'

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
  const materialRef = useRef<MeshStandardMaterial>(null)
  const [hovered, setHovered] = useState(false)

  // Determine pointer associations: active event takes precedence; falls back to current search bounds
  const currentLeft = event ? event.left : before.left
  const currentRight = event ? event.right : before.right
  const currentMid = event?.mid ?? null

  const isMid = currentMid === index
  const isLeft = currentLeft === index
  const isRight = currentRight === index

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
  })

  return (
    <group position={[positionX, 0, 0]}>
      <mesh
        ref={meshRef}
        position={[0, height / 2, 0]}
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
          color="#0284c7"
          emissive="#0369a1"
          emissiveIntensity={0.2}
          roughness={0.25}
          metalness={0.1}
        />

          {/* Floating Pointer Badges and Value Labels mounted directly inside mesh for seamless spatial tracking */}
          {(isMid || isLeft || isRight || isSelected || showLabel || hovered) && (
            <Html
              position={[0, height / 2 + 0.75, 0]}
              center
              distanceFactor={18}
              className="pointer-events-none select-none"
            >
              <div className="flex flex-col items-center gap-1">
                {/* Badges for pointers */}
                <div className="flex gap-1">
                  {isLeft && (
                      <span className="rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-md ring-1 ring-sky-300">
                        L
                      </span>
                )}
                      {isMid && (
                          <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-950 shadow-md ring-1 ring-amber-300">
                            M
                          </span>
                )}
                          {isRight && (
                              <span className="rounded bg-purple-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-md ring-1 ring-purple-300">
                                R
                              </span>
                )}
                            </div>

              {/* Element value badge */}
                          <div
                            className={`flex flex-col items-center rounded px-2 py-0.5 text-xs font-semibold backdrop-blur shadow-lg ${isSelected
                                ? 'border border-sky-400 bg-sky-950/95 text-sky-100'
                                : isMid
                                  ? 'border border-amber-400/90 bg-amber-950/95 text-amber-100'
                                  : isLeft
                                    ? 'border border-sky-400/90 bg-slate-900/95 text-sky-200'
                                    : isRight
                                      ? 'border border-purple-400/90 bg-slate-900/95 text-purple-200'
                                      : 'border border-slate-700/80 bg-slate-900/90 text-slate-100'
                              }`}
                          >
                            <span className="font-bold">{value}</span>
                            <span className="text-[9px] font-mono text-slate-400">[{index}]</span>
                          </div>
                        </div>
          </Html>
        )}
              </mesh>
            </group>
          )
          }
