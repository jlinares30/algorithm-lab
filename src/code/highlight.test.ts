import { describe, expect, it } from 'vitest'
import { tokenize } from './highlight'
import type { TokenKind } from './highlight'

const kinds = (line: string) => tokenize(line).filter((token) => token.kind !== 'plain').map((token) => [token.kind, token.text])

describe('Resaltado de Python', () => {
  it('no cambia el texto: unir los tokens devuelve la línea', () => {
    const lines = [
      'def ejemplo(números: list[int], objetivo: int, paso=None) -> tuple[int, list[dict]]:',
      '    if(valores[medio] <= objetivo):  # comentario con "comillas"',
      "        etiqueta = 'sin cerrar",
      '    return -1, pasos',
      '',
    ]

    for (const line of lines) expect(tokenize(line).map((token) => token.text).join('')).toBe(line)
  })

  it('distingue palabras clave, funciones, nombres integrados y números', () => {
    expect(kinds('def ejemplo(datos, tope=None):')).toEqual([
      ['keyword', 'def'], ['function', 'ejemplo'], ['operator', '='], ['builtin', 'None'], ['operator', ':'],
    ])
    expect(kinds('for i in range(len(datos) - 1):')).toEqual([
      ['keyword', 'for'], ['keyword', 'in'], ['builtin', 'range'], ['builtin', 'len'], ['operator', '-'], ['number', '1'], ['operator', ':'],
    ])
  })

  it('trata cadenas y comentarios como un solo bloque', () => {
    expect(kinds('"accion": "if x",  # return aquí')).toEqual([
      ['string', '"accion"'], ['operator', ':'], ['string', '"if x"'], ['comment', '# return aquí'],
    ])
  })

  it('no colorea una palabra clave dentro de otro nombre', () => {
    const found: TokenKind[] = tokenize('informe = iffy + define').map((token) => token.kind)

    expect(found).not.toContain('keyword')
    expect(kinds('añadir(x)')).toEqual([['function', 'añadir']])
  })
})
