import type { IndexRange } from '../visualizers/binary-search/model'

export function getArrayCamera(range: IndexRange, focus: number, count: number, columns: number, zoom: boolean) {
  if (count === 0) return { width: 100, xPercent: 0, first: 0, visible: 0 }
  const active = Math.max(0, range.right - range.left + 1)
  const visible = zoom ? Math.min(count, Math.max(3, Math.min(columns, active || 3))) : count
  const center = active > columns ? focus : (range.left + range.right) / 2
  const first = Math.max(0, Math.min(count - visible, Math.floor(center - (visible - 1) / 2)))
  return { width: (count / visible) * 100, xPercent: first === 0 ? 0 : (-first / count) * 100, first, visible }
}
