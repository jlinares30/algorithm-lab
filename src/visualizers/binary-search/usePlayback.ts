import { useEffect, useMemo, useRef, useState } from 'react'
import type { AnimationClock } from '../../playback/animationClock'

export function usePlayback(total: number) {
  // Position 0 is the input, before any Python event has been consumed.
  const [position, setPosition] = useState(0)
  const [scrubTime, setScrubTime] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [revision, setRevision] = useState(0)
  const autoplay = useRef(false)
  const progress = useRef(1)
  const sample = useRef<(() => number) | null>(null)
  const listeners = useRef(new Set<(progress: number) => void>())

  const clock = useMemo<AnimationClock>(() => ({
    subscribe: (render) => {
      listeners.current.add(render)
      render(progress.current)
      return () => { listeners.current.delete(render) }
    },
  }), [])

  function publish(value: number) {
    progress.current = value
    listeners.current.forEach((render) => render(value))
  }

  function freeze() {
    if (sample.current) publish(sample.current())
    sample.current = null
  }

  useEffect(() => {
    if (!playing || total === 0) return
    const start = performance.now()
    const from = progress.current
    const read = () => Math.min(1, from + ((performance.now() - start) * speed) / 1000)
    sample.current = read
    let frame = 0
    const tick = () => {
      publish(read())
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    const remainingTime = Math.max(0, ((1 - from) * 1000) / speed)
    const timer = window.setTimeout(() => {
      window.cancelAnimationFrame(frame)
      publish(1)
      sample.current = null
      if (autoplay.current && position < total) {
        progress.current = 0
        publish(0)
        setScrubTime(null)
        setPosition((current) => Math.min(current + 1, total))
      } else {
        setPlaying(false)
      }
    }, remainingTime)
    return () => {
      window.clearTimeout(timer)
      window.cancelAnimationFrame(frame)
      if (sample.current === read) sample.current = null
    }
  }, [playing, position, speed, revision, total])

  function reset() {
    sample.current = null
    autoplay.current = false
    progress.current = 1
    setPlaying(false)
    setScrubTime(0)
    setPosition(0)
    setRevision((current) => current + 1)
  }

  function seek(step: number) {
    sample.current = null
    autoplay.current = false
    progress.current = 1
    setPlaying(false)
    const bounded = Math.max(0, Math.min(total, Math.trunc(step)))
    setScrubTime(bounded)
    setPosition(bounded)
    setRevision((current) => current + 1)
  }

  function seekContinuous(time: number) {
    sample.current = null
    autoplay.current = false
    setPlaying(false)
    const boundedTime = Math.max(0, Math.min(total, time))
    setScrubTime(boundedTime)
    if (boundedTime === 0) {
      progress.current = 1
      setPosition(0)
      publish(1)
    } else {
      const stepIndex = Math.min(total, Math.max(1, Math.ceil(boundedTime)))
      const intraProgress = boundedTime === stepIndex ? 1 : boundedTime - (stepIndex - 1)
      progress.current = intraProgress
      setPosition(stepIndex)
      publish(intraProgress)
    }
    setRevision((current) => current + 1)
  }

  // Current continuous time without reading ref during render
  const currentTime = scrubTime ?? (position === 0 ? 0 : position)

  return {
    position, currentTime, playing, speed, clock, revision, reset, seek, seekContinuous,
    setSpeed: (value: number) => { if (value !== speed) { freeze(); setSpeed(value) } },
    next: () => {
      if (position >= total) return
      sample.current = null
      autoplay.current = false
      progress.current = 0
      publish(0)
      setScrubTime(null)
      setPosition((current) => Math.min(total, current + 1))
      setPlaying(true)
      setRevision((current) => current + 1)
    },
    previous: () => seek(Math.max(0, position - 1)),
    toggle: () => {
      if (total === 0) return
      if (playing) {
        freeze()
        setPlaying(false)
      } else {
        if (progress.current >= 1) {
          progress.current = 0
          publish(0)
          if (position === total) setPosition(0)
          setRevision((current) => current + 1)
        }
        setScrubTime(null)
        autoplay.current = true
        setPlaying(true)
      }
    },
  }
}
