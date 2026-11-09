const integer = /^[+-]?\d+$/

export const maxListLength = 256

/** Parses a list of safe integers separated by commas, semicolons or spaces. */
export function parseNumberList(list: string, { requireSorted }: { requireSorted: boolean }): number[] {
  const parts = list.trim() === '' ? [] : list.trim().split(/\s*[,;]\s*|\s+/)
  if (parts.some((part) => !integer.test(part) || !Number.isSafeInteger(Number(part)))) {
    throw new Error('La lista debe contener enteros seguros separados por comas o espacios.')
  }
  const numbers = parts.map(Number)
  if (numbers.length > maxListLength) throw new Error(`Introduce como máximo ${maxListLength} números.`)
  if (requireSorted && numbers.some((number, index) => index > 0 && number < numbers[index - 1])) {
    throw new Error('La lista debe estar ordenada de menor a mayor. Se permiten repetidos.')
  }
  return numbers
}

export function parseTarget(targetText: string): number {
  if (!integer.test(targetText.trim()) || !Number.isSafeInteger(Number(targetText))) {
    throw new Error('El objetivo debe ser un entero seguro.')
  }
  return Number(targetText)
}
