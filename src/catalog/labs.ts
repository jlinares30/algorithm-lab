import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'

// One interactive lab per available algorithm. Labs are lazy-loaded so the
// catalog stays light and heavy dependencies (Three.js, GSAP) load on demand.
export const labs: Record<string, LazyExoticComponent<ComponentType>> = {
  'binary-search': lazy(() =>
    import('../visualizers/binary-search/BinarySearchLab').then((module) => ({
      default: module.BinarySearchLab,
    }))
  ),
  'linear-search': lazy(() =>
    import('../visualizers/linear-search/LinearSearchLab').then((module) => ({
      default: module.LinearSearchLab,
    }))
  ),
}
