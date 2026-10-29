export function isWebGLAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}
