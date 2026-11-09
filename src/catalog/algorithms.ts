// Catalog metadata only: no algorithm logic lives here. The Python
// implementations are written by hand in `python/algorithms`.

export type AlgorithmCategory = 'searching' | 'sorting'

export type AlgorithmStatus = 'available' | 'planned'

export interface AlgorithmInfo {
  id: string
  name: string
  category: AlgorithmCategory
  summary: string
  complexity: {
    best: string
    average: string
    worst: string
    space: string
  }
  /** Sorted-input or other preconditions worth showing up front. */
  requirement?: string
  /** Where the hand-written Python implementation lives (or will live). */
  pythonFile: string
  status: AlgorithmStatus
}

export const categories: { id: AlgorithmCategory; label: string; description: string }[] = [
  {
    id: 'searching',
    label: 'Búsqueda',
    description: 'Localizar un valor dentro de una colección.',
  },
  {
    id: 'sorting',
    label: 'Ordenamiento',
    description: 'Reorganizar una colección según un criterio de orden.',
  },
]

export const algorithms: AlgorithmInfo[] = [
  {
    id: 'binary-search',
    name: 'Binary Search',
    category: 'searching',
    summary: 'Divide el rango a la mitad en cada paso comparando el elemento central con el objetivo.',
    complexity: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', space: 'O(1)' },
    requirement: 'Lista ordenada',
    pythonFile: 'python/algorithms/searching/binary_search.py',
    status: 'available',
  },
  {
    id: 'linear-search',
    name: 'Linear Search',
    category: 'searching',
    summary: 'Recorre la colección elemento por elemento hasta encontrar el objetivo.',
    complexity: { best: 'O(1)', average: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    pythonFile: 'python/algorithms/searching/linear_search.py',
    status: 'available',
  },
  {
    id: 'bubble-sort',
    name: 'Bubble Sort',
    category: 'sorting',
    summary: 'Intercambia pares adyacentes desordenados hasta que no queda ninguno.',
    complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    pythonFile: 'python/algorithms/sorting/bubble_sort.py',
    status: 'planned',
  },
  {
    id: 'selection-sort',
    name: 'Selection Sort',
    category: 'sorting',
    summary: 'Selecciona el mínimo de la parte sin ordenar y lo coloca al frente.',
    complexity: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    pythonFile: 'python/algorithms/sorting/selection_sort.py',
    status: 'planned',
  },
  {
    id: 'insertion-sort',
    name: 'Insertion Sort',
    category: 'sorting',
    summary: 'Inserta cada elemento en su posición dentro de la parte ya ordenada.',
    complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    pythonFile: 'python/algorithms/sorting/insertion_sort.py',
    status: 'planned',
  },
  {
    id: 'merge-sort',
    name: 'Merge Sort',
    category: 'sorting',
    summary: 'Divide la colección en mitades, las ordena y las combina.',
    complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' },
    pythonFile: 'python/algorithms/sorting/merge_sort.py',
    status: 'planned',
  },
  {
    id: 'quick-sort',
    name: 'Quick Sort',
    category: 'sorting',
    summary: 'Elige un pivote y particiona la colección a su alrededor de forma recursiva.',
    complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)' },
    pythonFile: 'python/algorithms/sorting/quick_sort.py',
    status: 'planned',
  },
]

export function getAlgorithm(id: string): AlgorithmInfo | undefined {
  return algorithms.find((algorithm) => algorithm.id === id)
}

export function algorithmsIn(category: AlgorithmCategory): AlgorithmInfo[] {
  return algorithms.filter((algorithm) => algorithm.category === category)
}
