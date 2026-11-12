import { tokenize } from '../code/highlight'
import { codeThemes } from '../code/theme'
import type { CodeTheme } from '../code/theme'

/** One line of Python with syntax colours. Must sit inside a `[data-code-theme]` element. */
export function CodeText({ text }: { text: string }) {
  return (
    <>
      {tokenize(text).map((token, index) =>
        token.kind === 'plain' ? token.text : <span key={index} className={`tok-${token.kind}`}>{token.text}</span>
      )}
    </>
  )
}

export function CodeThemeSelect({ value, onChange }: { value: CodeTheme; onChange: (theme: CodeTheme) => void }) {
  return (
    <label className="space-y-1 text-xs text-slate-300">
      <span className="block font-medium">Tema del código</span>
      <select className="field w-auto" value={value} onChange={(event) => onChange(event.target.value as CodeTheme)}>
        {codeThemes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
      </select>
    </label>
  )
}
