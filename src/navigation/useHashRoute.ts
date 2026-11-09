import { useSyncExternalStore } from 'react'

export type Route =
  | { page: 'home' }
  | { page: 'algorithm'; id: string }

const algorithmPrefix = '#/algoritmo/'

// Hash routing keeps the app a static site (no server rewrites needed).
export function parseRoute(hash: string): Route {
  if (hash.startsWith(algorithmPrefix)) {
    const id = decodeURIComponent(hash.slice(algorithmPrefix.length).split(/[/?#]/)[0])
    if (id) return { page: 'algorithm', id }
  }
  return { page: 'home' }
}

export function algorithmHref(id: string): string {
  return `${algorithmPrefix}${encodeURIComponent(id)}`
}

export const homeHref = '#/'

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function getHash() {
  return window.location.hash
}

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => '')
  return parseRoute(hash)
}
