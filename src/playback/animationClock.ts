// Presentation adapters subscribe without causing a React render every frame.
// The playback hook owns time; animation libraries only render this progress.
export interface AnimationClock {
  subscribe: (render: (progress: number) => void) => () => void
}
