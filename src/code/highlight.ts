// Colours one line of Python for display. It only classifies text: nothing
// here parses or runs the code, and joining the tokens gives back the line.

export type TokenKind = 'plain' | 'keyword' | 'builtin' | 'function' | 'string' | 'number' | 'comment' | 'operator'

export interface Token {
  kind: TokenKind
  text: string
}

const keywords = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
  'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise',
  'return', 'try', 'while', 'with', 'yield',
])

const builtins = new Set([
  'None', 'True', 'False', 'abs', 'bool', 'dict', 'enumerate', 'float', 'int', 'isinstance', 'len', 'list', 'map',
  'max', 'min', 'print', 'range', 'reversed', 'set', 'sorted', 'str', 'sum', 'tuple', 'zip',
])

// One alternative per kind, tried in order at each position.
const pattern = new RegExp(
  [
    '(?<comment>#.*)',
    '(?<string>[rRbBfFuU]{0,2}(?:"(?:\\\\.|[^"\\\\])*"?|\'(?:\\\\.|[^\'\\\\])*\'?))',
    '(?<number>\\d[\\d_]*(?:\\.\\d+)?)',
    '(?<name>[\\p{L}_][\\p{L}\\p{N}_]*)',
    '(?<operator>[-+*/%=<>!&|^~@:]+)',
    '(?<plain>\\s+|.)',
  ].join('|'),
  'gu'
)

function kindOfName(name: string, previous: string | undefined, next: string): TokenKind {
  if (keywords.has(name)) return 'keyword'
  if (builtins.has(name)) return 'builtin'
  if (previous === 'def' || next === '(') return 'function'
  return 'plain'
}

export function tokenize(line: string): Token[] {
  const tokens: Token[] = []
  let previousName: string | undefined

  for (const match of line.matchAll(pattern)) {
    const groups = match.groups ?? {}
    const text = match[0]
    let kind: TokenKind = 'plain'

    if (groups.comment !== undefined) kind = 'comment'
    else if (groups.string !== undefined) kind = 'string'
    else if (groups.number !== undefined) kind = 'number'
    else if (groups.operator !== undefined) kind = 'operator'
    else if (groups.name !== undefined) {
      kind = kindOfName(text, previousName, line[match.index + text.length] ?? '')
      previousName = text
    }

    const last = tokens.at(-1)
    if (last && last.kind === 'plain' && kind === 'plain') last.text += text
    else tokens.push({ kind, text })
  }

  return tokens
}
