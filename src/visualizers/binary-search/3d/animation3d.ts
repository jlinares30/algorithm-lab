import { Color } from 'three'
import type { SearchEvent } from '../../../execution/binarySearch'

export interface IndexRange {
  left: number
  right: number
}

export interface Element3DTarget {
  posY: number
  posZ: number
  scale: number
  color: Color
  emissive: Color
  emissiveIntensity: number
  opacity: number
  transparent: boolean
}

const COLOR_ACTIVE = new Color('#0284c7')
const COLOR_EMISSIVE_ACTIVE = new Color('#0369a1')

const COLOR_MID = new Color('#fbbf24')
const COLOR_EMISSIVE_MID = new Color('#d97706')

const COLOR_FOUND = new Color('#34d399')
const COLOR_EMISSIVE_FOUND = new Color('#059669')

const COLOR_DISCARDED = new Color('#334155')
const COLOR_EMISSIVE_DISCARDED = new Color('#0f172a')

const COLOR_SELECTED = new Color('#38bdf8')

/**
 * Calculates smoothstep interpolation factor: 3t^2 - 2t^3
 */
export function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min || 1)))
  return x * x * (3 - 2 * x)
}

/**
 * Calculates the exact 3D spatial and visual target for an array element
 * based on the binary search event, phase boundaries, and normalized progress (0 -> 1).
 */
export function getElement3DTarget(
  index: number,
  baseHeight: number,
  event: SearchEvent | null,
  _before: IndexRange,
  _after: IndexRange,
  progress: number,
  isSelected: boolean,
  isHovered: boolean
): Element3DTarget {
  const defaultY = baseHeight / 2
  const defaultZ = 0
  const p = Math.max(0, Math.min(1, progress))

  // Step 0: Before any search event has executed
  if (!event) {
    const col = isSelected ? COLOR_SELECTED.clone() : COLOR_ACTIVE.clone()
    return {
      posY: defaultY,
      posZ: defaultZ,
      scale: isSelected ? 1.05 : 1.0,
      color: col,
      emissive: isSelected ? COLOR_SELECTED.clone() : COLOR_EMISSIVE_ACTIVE.clone(),
      emissiveIntensity: isSelected ? 0.8 : isHovered ? 0.5 : 0.2,
      opacity: 1.0,
      transparent: false,
    }
  }

  const isPreDiscarded = index < event.left || index > event.right
  const isMid = event.mid === index
  const isPendingDiscard =
    !isMid &&
    !isPreDiscarded &&
    ((event.action === 'move_right' && index < (event.mid ?? -1)) ||
      (event.action === 'move_left' && index > (event.mid ?? 999999)))

  // 1. Elements already discarded in earlier iterations
  if (isPreDiscarded) {
    return {
      posY: defaultY - 1.0,
      posZ: -4.0,
      scale: 0.85,
      color: COLOR_DISCARDED.clone(),
      emissive: COLOR_EMISSIVE_DISCARDED.clone(),
      emissiveIntensity: 0.05,
      opacity: 0.25,
      transparent: true,
    }
  }

  // 2. The central `mid` element
  if (isMid) {
    // Phase 1 (0.0 -> 0.35): Rises smoothly, highlights in warm glowing amber
    const tRise = smoothstep(0, 0.35, p)
    const midY = defaultY + 1.2 * tRise
    const midScale = 1.0 + 0.15 * tRise
    const midColor = COLOR_ACTIVE.clone().lerp(COLOR_MID, tRise)
    const midEmissive = COLOR_EMISSIVE_ACTIVE.clone().lerp(COLOR_EMISSIVE_MID, tRise)
    const midIntensity = 0.2 + 0.75 * tRise

    if (event.action === 'found') {
      // Phase 2 (0.35 -> 0.75): Celebratory transition to emerald green
      const tFound = smoothstep(0.35, 0.75, p)
      midColor.lerp(COLOR_FOUND, tFound)
      midEmissive.lerp(COLOR_EMISSIVE_FOUND, tFound)
      // Slight bounce on celebration
      const bounce = Math.sin(tFound * Math.PI) * 0.3
      return {
        posY: midY + bounce,
        posZ: defaultZ,
        scale: midScale,
        color: isSelected ? COLOR_SELECTED.clone() : midColor,
        emissive: isSelected ? COLOR_SELECTED.clone() : midEmissive,
        emissiveIntensity: 0.95,
        opacity: 1.0,
        transparent: false,
      }
    }

    if (event.action === 'move_right' || event.action === 'move_left') {
      // Phase 2 & 3 (0.35 -> 0.80): `mid` is part of the discarded half, glides back to Z = -4
      const tDiscard = smoothstep(0.35, 0.8, p)
      const finalZ = defaultZ - 4.0 * tDiscard
      const finalY = midY - 2.2 * tDiscard // drops to defaultY - 1.0
      const finalScale = midScale - 0.3 * tDiscard // contracts to 0.85
      midColor.lerp(COLOR_DISCARDED, tDiscard)
      midEmissive.lerp(COLOR_EMISSIVE_DISCARDED, tDiscard)
      const finalIntensity = midIntensity - (midIntensity - 0.05) * tDiscard
      const finalOpacity = 1.0 - 0.75 * tDiscard

      return {
        posY: finalY,
        posZ: finalZ,
        scale: finalScale,
        color: isSelected ? COLOR_SELECTED.clone() : midColor,
        emissive: isSelected ? COLOR_SELECTED.clone() : midEmissive,
        emissiveIntensity: finalIntensity,
        opacity: finalOpacity,
        transparent: tDiscard > 0.01,
      }
    }

    return {
      posY: midY,
      posZ: defaultZ,
      scale: midScale,
      color: isSelected ? COLOR_SELECTED.clone() : midColor,
      emissive: isSelected ? COLOR_SELECTED.clone() : midEmissive,
      emissiveIntensity: midIntensity,
      opacity: 1.0,
      transparent: false,
    }
  }

  // 3. Elements discarded during this step
  if (isPendingDiscard) {
    // Phase 1 (0 -> 0.35): Stay active
    // Phase 2 (0.35 -> 0.80): Smoothly slide backward into Z = -4, drop slightly, turn translucent slate
    const tDiscard = smoothstep(0.35, 0.8, p)
    const finalZ = defaultZ - 4.0 * tDiscard
    const finalY = defaultY - 1.0 * tDiscard
    const finalScale = 1.0 - 0.15 * tDiscard
    const col = COLOR_ACTIVE.clone().lerp(COLOR_DISCARDED, tDiscard)
    const em = COLOR_EMISSIVE_ACTIVE.clone().lerp(COLOR_EMISSIVE_DISCARDED, tDiscard)
    const intensity = 0.2 - 0.15 * tDiscard
    const op = 1.0 - 0.75 * tDiscard

    return {
      posY: finalY,
      posZ: finalZ,
      scale: finalScale,
      color: isSelected ? COLOR_SELECTED.clone() : col,
      emissive: isSelected ? COLOR_SELECTED.clone() : em,
      emissiveIntensity: isSelected ? 0.8 : isHovered ? intensity + 0.3 : intensity,
      opacity: op,
      transparent: tDiscard > 0.01,
    }
  }

  // 4. Elements that remain active in `after` range
  return {
    posY: defaultY,
    posZ: defaultZ,
    scale: isSelected ? 1.06 : 1.0,
    color: isSelected ? COLOR_SELECTED.clone() : COLOR_ACTIVE.clone(),
    emissive: isSelected ? COLOR_SELECTED.clone() : COLOR_EMISSIVE_ACTIVE.clone(),
    emissiveIntensity: isSelected ? 0.8 : isHovered ? 0.5 : 0.2,
    opacity: 1.0,
    transparent: false,
  }
}
