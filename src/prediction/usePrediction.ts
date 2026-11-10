import { useState } from 'react'

/** What choosing an option would do to the array: the affected index range (inclusive). */
export interface PredictionPreview {
  kind: 'discard' | 'found'
  from: number
  to: number
}

export interface PredictionOption {
  id: string
  label: string
  /** Shown on the array while the option is hovered or focused. */
  preview?: PredictionPreview
}

/** The element a question is about, shown on the array with the pointer that will land on it. */
export interface PredictionFocus {
  /** Pointer name as drawn on the array ("mid", "i"). */
  pointer: string
  index: number
}

/** A question about the step that is about to be revealed. */
export interface PredictionQuestion {
  prompt: string
  focus?: PredictionFocus
  options: PredictionOption[]
  /** Id of the option matching what the recorded Python step actually did. */
  answer: string
}

export interface PredictionFeedback {
  correct: boolean
  chosen: string
  expected: string
}

interface Playback {
  next: () => void
  reset: () => void
}

// Prediction mode turns playback into a quiz: each step is revealed only after
// the learner commits to an answer. The correct answer always comes from the
// recorded Python events, never from logic re-implemented in the UI.
export function usePrediction(playback: Playback) {
  const [enabled, setEnabled] = useState(false)
  const [feedback, setFeedback] = useState<PredictionFeedback | null>(null)
  const [score, setScore] = useState({ correct: 0, answered: 0 })

  function restart() {
    setFeedback(null)
    setScore({ correct: 0, answered: 0 })
    playback.reset()
  }

  return {
    enabled,
    /** Set while the answered step is on screen, until the learner continues. */
    feedback,
    score,
    restart,
    setEnabled: (value: boolean) => {
      setEnabled(value)
      // Start from the beginning so no future step is already on screen.
      if (value) restart()
      else setFeedback(null)
    },
    answer: (question: PredictionQuestion, optionId: string) => {
      if (feedback) return
      const label = (id: string) => question.options.find((option) => option.id === id)?.label ?? id
      const correct = optionId === question.answer
      setFeedback({ correct, chosen: label(optionId), expected: label(question.answer) })
      setScore((current) => ({ correct: current.correct + (correct ? 1 : 0), answered: current.answered + 1 }))
      playback.next()
    },
    continue: () => setFeedback(null),
  }
}
