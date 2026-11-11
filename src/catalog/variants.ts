import { pythonAlgorithms } from '../execution/pythonWorker'
import type { PythonAlgorithm } from '../execution/pythonWorker'

/** A hand-written copy of an algorithm with one deliberate fault. */
export interface Variant {
  /** File name without extension; it names the fault, so it is never shown before answering. */
  id: string
  algorithm: PythonAlgorithm
  /** The `# Error:` line of the file, revealed after the visitor answers. */
  description: string
  source: string
}

const fileName = /([a-z0-9_]+)__([a-z0-9_]+)\.py$/
const errorLine = /^#\s*Error:\s*(.+)$/i

/** Reads `<algoritmo>__<nombre_del_error>.py`; files that do not follow the format are skipped. */
export function parseVariant(path: string, source: string): Variant | null {
  const match = fileName.exec(path)
  if (!match) return null
  const algorithm = match[1] as PythonAlgorithm
  if (!pythonAlgorithms.includes(algorithm)) return null
  const firstLine = source.split(/\r?\n/).find((line) => line.trim() !== '') ?? ''
  const description = errorLine.exec(firstLine.trim())?.[1].trim()
  if (!description) return null
  return { id: `${match[1]}__${match[2]}`, algorithm, description, source }
}

// Every variant file is discovered at build time: adding one needs no code change.
const files = import.meta.glob<string>('../../python/algorithms/searching/variants/*.py', {
  query: '?raw',
  import: 'default',
  eager: true,
})

export const variants: Variant[] = Object.entries(files)
  .sort(([a], [b]) => a.localeCompare(b))
  .flatMap(([path, source]) => parseVariant(path, source) ?? [])
