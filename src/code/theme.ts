import { useState } from 'react'

// The colours of each theme live in index.css under [data-code-theme].
export const codeThemes = [
  { id: 'noche', name: 'Noche' },
  { id: 'calido', name: 'Cálido' },
  { id: 'claro', name: 'Claro' },
  { id: 'contraste', name: 'Alto contraste' },
] as const

export type CodeTheme = (typeof codeThemes)[number]['id']

export const defaultCodeTheme: CodeTheme = 'noche'
const storageKey = 'algorithm-lab:code-theme'

const isCodeTheme = (value: unknown): value is CodeTheme => codeThemes.some((theme) => theme.id === value)

// The choice stays in this browser only; storage may be unavailable (private mode).
export function readCodeTheme(): CodeTheme {
  try {
    const stored = localStorage.getItem(storageKey)
    return isCodeTheme(stored) ? stored : defaultCodeTheme
  } catch {
    return defaultCodeTheme
  }
}

export function useCodeTheme(): [CodeTheme, (theme: CodeTheme) => void] {
  const [theme, setTheme] = useState(readCodeTheme)

  function choose(next: CodeTheme) {
    setTheme(next)
    try {
      localStorage.setItem(storageKey, next)
    } catch {
      // The theme still applies until the page is closed.
    }
  }

  return [theme, choose]
}
