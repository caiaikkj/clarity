import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lang } from '../i18n/translations'

interface RecognitionAlternative {
  transcript: string
}

interface RecognitionResult {
  readonly length: number
  [index: number]: RecognitionAlternative
}

interface RecognitionEvent {
  results: { readonly length: number; [index: number]: RecognitionResult }
}

interface RecognitionErrorEvent {
  error: string
}

interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type RecognitionConstructor = new () => Recognition

type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionConstructor
  webkitSpeechRecognition?: RecognitionConstructor
}

export type SpeechFailure = 'denied' | 'no-microphone' | 'network' | 'unknown'

const recognitionConstructor = (): RecognitionConstructor | null => {
  if (typeof window === 'undefined') return null
  const w = window as SpeechWindow
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const failureOf = (code: string): SpeechFailure | null => {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'denied'
  if (code === 'audio-capture') return 'no-microphone'
  if (code === 'network') return 'network'
  if (code === 'no-speech' || code === 'aborted') return null
  return 'unknown'
}

interface SpeechOptions {
  lang: Lang
  onTranscript: (transcript: string) => void
  onFailure?: (failure: SpeechFailure) => void
}

export const useSpeech = ({ lang, onTranscript, onFailure }: SpeechOptions) => {
  const [listening, setListening] = useState(false)
  const recognition = useRef<Recognition | null>(null)
  const active = useRef(false)
  const transcriptRef = useRef(onTranscript)
  const failureRef = useRef(onFailure)
  transcriptRef.current = onTranscript
  failureRef.current = onFailure
  const supported = recognitionConstructor() !== null

  const stop = useCallback(() => {
    active.current = false
    recognition.current?.stop()
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const Ctor = recognitionConstructor()
    if (!Ctor || active.current) return
    const instance = new Ctor()
    instance.lang = lang
    instance.continuous = true
    instance.interimResults = true
    instance.onresult = (event) => {
      if (!active.current) return
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript
      transcriptRef.current(transcript.trim())
    }
    instance.onerror = (event) => {
      const failure = failureOf(event.error)
      if (failure) {
        active.current = false
        setListening(false)
        failureRef.current?.(failure)
      }
    }
    instance.onend = () => {
      active.current = false
      setListening(false)
    }
    recognition.current = instance
    active.current = true
    try {
      instance.start()
      setListening(true)
    } catch {
      active.current = false
      setListening(false)
      failureRef.current?.('unknown')
    }
  }, [lang])

  useEffect(() => {
    if (!active.current) return
    stop()
  }, [lang, stop])

  useEffect(
    () => () => {
      active.current = false
      recognition.current?.abort()
    },
    [],
  )

  return { supported, listening, start, stop }
}
