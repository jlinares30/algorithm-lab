import { CanvasTexture, SRGBColorSpace } from 'three'

interface BadgeTextureOptions {
  value: number
  index: number
  pointers: ('L' | 'M' | 'R')[]
  isMid: boolean
  isLeft: boolean
  isRight: boolean
  isSelected: boolean
  isHovered: boolean
}

interface FaceLabelOptions {
  value: number
  index: number
  isMid: boolean
  isSelected: boolean
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(x, y, width, height, radius)
    ctx.closePath()
    return
  }
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

/**
 * Creates a high-DPI Three.js CanvasTexture for the 3D floating badge above an array bar.
 * Rendered directly by Three.js inside WebGL for guaranteed visibility from any vantage point.
 */
export function createFloatingBadgeTexture(options: BadgeTextureOptions): CanvasTexture {
  if (typeof document === 'undefined') {
    return new CanvasTexture({} as HTMLCanvasElement)
  }

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return new CanvasTexture(canvas)
  }

  const { value, index, pointers, isMid, isLeft, isRight, isSelected, isHovered } = options
  ctx.clearRect(0, 0, 256, 256)

  const hasPointers = pointers.length > 0

  // 1. Draw Pointer Row if any pointer (L, M, R) is active on this element
  if (hasPointers) {
    const pillW = 44
    const pillH = 34
    const gap = 8
    const totalW = pointers.length * pillW + (pointers.length - 1) * gap
    const startX = (256 - totalW) / 2
    const pillY = 16

    pointers.forEach((pointer, i) => {
      const px = startX + i * (pillW + gap)

      let fill = '#0ea5e9' // sky-500 for L
      let stroke = '#7dd3fc' // sky-300
      let textColor = '#ffffff'

      if (pointer === 'M') {
        fill = '#fbbf24' // amber-400
        stroke = '#fef08a' // amber-200
        textColor = '#020617' // slate-950
      } else if (pointer === 'R') {
        fill = '#a855f7' // purple-500
        stroke = '#e9d5ff' // purple-200
        textColor = '#ffffff'
      }

      // Drop shadow for pointer badge
      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
      ctx.shadowBlur = 6
      ctx.shadowOffsetY = 2

      ctx.fillStyle = fill
      drawRoundedRect(ctx, px, pillY, pillW, pillH, 8)
      ctx.fill()
      ctx.restore()

      // Border
      ctx.lineWidth = 2.5
      ctx.strokeStyle = stroke
      drawRoundedRect(ctx, px, pillY, pillW, pillH, 8)
      ctx.stroke()

      // Text
      ctx.fillStyle = textColor
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(pointer, px + pillW / 2, pillY + pillH / 2)
    })
  }

  // 2. Main Value & Index Badge Box
  const boxW = 192
  const boxH = hasPointers ? 154 : 170
  const boxX = (256 - boxW) / 2
  const boxY = hasPointers ? 74 : 44

  let boxBg = 'rgba(15, 23, 42, 0.94)' // slate-900/95
  let boxBorder = 'rgba(51, 65, 85, 0.9)' // slate-700
  let borderWidth = 3
  let valueColor = '#f8fafc' // slate-50

  if (isSelected) {
    boxBg = 'rgba(8, 47, 73, 0.96)' // sky-950
    boxBorder = '#38bdf8' // sky-400
    borderWidth = 5
    valueColor = '#e0f2fe'
  } else if (isMid) {
    boxBg = 'rgba(69, 26, 3, 0.96)' // amber-950
    boxBorder = '#fbbf24' // amber-400
    borderWidth = 4.5
    valueColor = '#fef3c7'
  } else if (isLeft) {
    boxBg = 'rgba(15, 23, 42, 0.96)'
    boxBorder = '#38bdf8' // sky-400
    borderWidth = 4.5
    valueColor = '#bae6fd'
  } else if (isRight) {
    boxBg = 'rgba(15, 23, 42, 0.96)'
    boxBorder = '#c084fc' // purple-400
    borderWidth = 4.5
    valueColor = '#f3e8ff'
  } else if (isHovered) {
    boxBorder = '#64748b'
    borderWidth = 3.5
  }

  // Box Drop Shadow
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetY = 4

  ctx.fillStyle = boxBg
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 16)
  ctx.fill()
  ctx.restore()

  // Box Border
  ctx.lineWidth = borderWidth
  ctx.strokeStyle = boxBorder
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 16)
  ctx.stroke()

  // Main Value
  ctx.fillStyle = valueColor
  ctx.font = 'bold 54px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(value), 128, boxY + boxH * 0.4)

  // Subtext: [Index]
  ctx.fillStyle = isLeft || isSelected ? '#7dd3fc' : isMid ? '#fde68a' : isRight ? '#d8b4fe' : '#94a3b8'
  ctx.font = 'bold 26px "SF Mono", Consolas, Menlo, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`[${index}]`, 128, boxY + boxH * 0.76)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/**
 * Creates a high-DPI Three.js CanvasTexture for the front face of each 3D box bar.
 * Displays the value and index right on the 3D bar geometry itself.
 */
export function createFaceLabelTexture(options: FaceLabelOptions): CanvasTexture {
  if (typeof document === 'undefined') {
    return new CanvasTexture({} as HTMLCanvasElement)
  }

  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return new CanvasTexture(canvas)
  }

  const { value, index, isMid, isSelected } = options
  ctx.clearRect(0, 0, 128, 128)

  // Background subtle dark pill on the face for high contrast against bar color
  ctx.fillStyle = 'rgba(2, 6, 23, 0.55)'
  drawRoundedRect(ctx, 8, 8, 112, 112, 18)
  ctx.fill()

  // Border
  ctx.lineWidth = 2
  ctx.strokeStyle = isSelected ? '#38bdf8' : isMid ? '#fbbf24' : 'rgba(255, 255, 255, 0.2)'
  drawRoundedRect(ctx, 8, 8, 112, 112, 18)
  ctx.stroke()

  // Value
  ctx.fillStyle = isSelected ? '#38bdf8' : isMid ? '#fbbf24' : '#ffffff'
  ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(value), 64, 50)

  // Index [i]
  ctx.fillStyle = 'rgba(203, 213, 225, 0.85)'
  ctx.font = 'bold 20px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`[${index}]`, 64, 88)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

interface PointerBeaconOptions {
  pointer: 'L' | 'M' | 'R'
  index: number
  value?: number
}

/**
 * Creates a high-DPI Three.js CanvasTexture for pointer beacons (L, M, R)
 * used in large array mode. Rendered as a native 3D WebGL Sprite with high visibility.
 */
export function createPointerBeaconTexture(options: PointerBeaconOptions): CanvasTexture {
  if (typeof document === 'undefined') {
    return new CanvasTexture({} as HTMLCanvasElement)
  }

  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 180
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return new CanvasTexture(canvas)
  }

  const { pointer, index, value } = options
  ctx.clearRect(0, 0, 320, 180)

  let accent = '#38bdf8' // sky-400 for L
  let tagBg = '#0284c7' // sky-600
  let tagText = '#ffffff'
  let subColor = '#7dd3fc' // sky-300

  if (pointer === 'M') {
    accent = '#fbbf24' // amber-400
    tagBg = '#f59e0b' // amber-500
    tagText = '#020617' // slate-950 for contrast on amber
    subColor = '#fde68a' // amber-200
  } else if (pointer === 'R') {
    accent = '#c084fc' // purple-400
    tagBg = '#9333ea' // purple-600
    tagText = '#ffffff'
    subColor = '#e9d5ff' // purple-200
  }

  // 1. Soft Card Shadow
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 4

  // Main Card Body: Dark Glassmorphic Slate
  const cardX = 20
  const cardY = 16
  const cardW = 280
  const cardH = 132
  const cardR = 22

  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardR)
  ctx.fill()

  // Downward pointer arrow connecting card to beacon needle
  ctx.beginPath()
  ctx.moveTo(144, cardY + cardH)
  ctx.lineTo(160, cardY + cardH + 18)
  ctx.lineTo(176, cardY + cardH)
  ctx.closePath()
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'
  ctx.fill()
  ctx.restore()

  // 2. Card Border + Arrow Border
  ctx.lineWidth = 4
  ctx.strokeStyle = accent
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardR)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(144, cardY + cardH)
  ctx.lineTo(160, cardY + cardH + 18)
  ctx.lineTo(176, cardY + cardH)
  ctx.strokeStyle = accent
  ctx.lineWidth = 4
  ctx.stroke()

  // 3. Left Indicator Tag Pill (L / M / R)
  const tagX = 36
  const tagY = 32
  const tagW = 68
  const tagH = 100
  const tagR = 16

  ctx.fillStyle = tagBg
  drawRoundedRect(ctx, tagX, tagY, tagW, tagH, tagR)
  ctx.fill()

  ctx.lineWidth = 2
  ctx.strokeStyle = accent
  drawRoundedRect(ctx, tagX, tagY, tagW, tagH, tagR)
  ctx.stroke()

  ctx.fillStyle = tagText
  ctx.font = '900 54px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(pointer, tagX + tagW / 2, tagY + tagH / 2 + 1)

  // 4. Subtle Vertical Divider
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)'
  ctx.beginPath()
  ctx.moveTo(122, 36)
  ctx.lineTo(122, 128)
  ctx.stroke()

  // 5. Right Content Area: Index and Value
  const textCenterX = 208

  // Top: Monospace Index [i]
  ctx.fillStyle = subColor
  ctx.font = 'bold 24px "SF Mono", Menlo, Consolas, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`[${index}]`, textCenterX, 54)

  // Bottom: Main Value
  if (value !== undefined) {
    ctx.fillStyle = '#f8fafc'
    ctx.font = '900 46px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(`${value}`, textCenterX, 98)
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}


