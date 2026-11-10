import type { PredictionFeedback, PredictionPreview, PredictionQuestion } from '../prediction/usePrediction'

interface Props {
  /** Question about the next step; null when every step has been revealed. */
  question: PredictionQuestion | null
  feedback: PredictionFeedback | null
  score: { correct: number; answered: number }
  onAnswer: (optionId: string) => void
  /** Called with an option's preview while it is hovered or focused, and null when it is not. */
  onPreview?: (preview: PredictionPreview | null) => void
  onContinue: () => void
  onRestart: () => void
}

export function PredictionPanel({ question, feedback, score, onAnswer, onPreview, onContinue, onRestart }: Props) {
  const finished = !feedback && question === null

  return (
    <section
      aria-label="Modo predicción"
      className="space-y-3 border-t border-slate-800 pt-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <h3 className="font-medium text-emerald-300">Modo predicción</h3>
        <p className="font-mono text-xs text-slate-400">
          Aciertos: <strong className="text-emerald-300">{score.correct}</strong> de {score.answered}
        </p>
      </div>

      {feedback && (
        <div role="status" className="space-y-3">
          <p className={`rounded-lg border px-3 py-2 text-sm ${feedback.correct ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200' : 'border-rose-500/50 bg-rose-950/40 text-rose-200'}`}>
            {feedback.correct
              ? <>✓ Correcto: <strong>{feedback.expected}</strong></>
              : <>✗ Elegiste «{feedback.chosen}». Tu código hizo: <strong>{feedback.expected}</strong></>}
          </p>
          <button type="button" className="control control-primary" onClick={onContinue}>
            {question ? 'Siguiente pregunta' : 'Ver resultado'}
          </button>
        </div>
      )}

      {!feedback && question && (
        <fieldset className="space-y-3">
          <legend className="text-sm leading-relaxed text-slate-200">{question.prompt}</legend>
          <div className="flex flex-wrap gap-2">
            {question.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className="control text-left"
                onMouseEnter={() => onPreview?.(option.preview ?? null)}
                onMouseLeave={() => onPreview?.(null)}
                onFocus={() => onPreview?.(option.preview ?? null)}
                onBlur={() => onPreview?.(null)}
                onClick={() => {
                  onPreview?.(null)
                  onAnswer(option.id)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {finished && (
        <div role="status" className="space-y-3">
          <p className="text-sm text-slate-200">
            Ejecución completa. Acertaste <strong className="text-emerald-300">{score.correct}</strong> de {score.answered} {score.answered === 1 ? 'predicción' : 'predicciones'}.
          </p>
          <button type="button" className="control" onClick={onRestart}>Volver a intentarlo</button>
        </div>
      )}
    </section>
  )
}
