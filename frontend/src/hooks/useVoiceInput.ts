import { useState, useRef, useEffect, useCallback } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: { readonly transcript: string; readonly confidence: number }
}

interface SpeechRecognitionResultList {
  readonly length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onaudiostart: (() => void) | null
  onsoundstart: (() => void) | null
  onsoundend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

const LANG_MAP: Record<string, string> = {
  he: 'he-IL',
  en: 'en-US',
}

export type MicStatus = 'idle' | 'requesting' | 'listening' | 'no-sound' | 'error'

interface VoiceInputOptions {
  silenceTimeoutMs?: number
  onSilenceTimeout?: () => void
}

export function useVoiceInput(options: VoiceInputOptions = {}) {
  const { silenceTimeoutMs = 2000, onSilenceTimeout } = options
  const { language } = useLanguage()
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [micStatus, setMicStatus] = useState<MicStatus>('idle')
  const [audioLevel, setAudioLevel] = useState(0)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const shouldRestartRef = useRef(false)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)
  const soundDetectedRef = useRef(false)
  const noSoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hadSpeechRef = useRef(false)
  const onSilenceTimeoutRef = useRef(onSilenceTimeout)
  onSilenceTimeoutRef.current = onSilenceTimeout

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const lang = LANG_MAP[language] || 'he-IL'

  const cleanupAudio = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    analyserRef.current = null
    setAudioLevel(0)
    if (noSoundTimerRef.current) {
      clearTimeout(noSoundTimerRef.current)
      noSoundTimerRef.current = null
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    hadSpeechRef.current = false
  }, [])

  const startAudioMonitor = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const monitor = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
        const avg = sum / dataArray.length
        const normalized = Math.min(avg / 80, 1)
        setAudioLevel(normalized)

        if (normalized > 0.05) soundDetectedRef.current = true

        animFrameRef.current = requestAnimationFrame(monitor)
      }
      monitor()

      soundDetectedRef.current = false
      noSoundTimerRef.current = setTimeout(() => {
        if (!soundDetectedRef.current) {
          setMicStatus('no-sound')
        }
      }, 3000)

      return true
    } catch {
      setMicStatus('error')
      setErrorCode('mic-blocked')
      return false
    }
  }, [])

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    cleanupAudio()
    setIsListening(false)
    setInterimTranscript('')
    setMicStatus('idle')
  }, [cleanupAudio])

  const startListening = useCallback(async () => {
    if (!isSupported) return

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return

    setMicStatus('requesting')
    setErrorCode(null)

    const micOk = await startAudioMonitor()
    if (!micOk) return

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 3

    recognition.onaudiostart = () => {
      setMicStatus('listening')
    }

    recognition.onsoundstart = () => {
      soundDetectedRef.current = true
      setMicStatus('listening')
      if (noSoundTimerRef.current) {
        clearTimeout(noSoundTimerRef.current)
        noSoundTimerRef.current = null
      }
    }

    recognition.onresult = (event) => {
      let final = ''
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          let best = result[0].transcript
          let bestConfidence = result[0].confidence
          for (let j = 1; j < result.length; j++) {
            if (result[j].confidence > bestConfidence) {
              best = result[j].transcript
              bestConfidence = result[j].confidence
            }
          }
          final += best
        } else {
          interim += result[0].transcript
        }
      }

      if (final) {
        hadSpeechRef.current = true
        setTranscript((prev) => prev + final)
      }
      setInterimTranscript(interim)

      // Reset silence timer on any speech activity
      if (final || interim) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = setTimeout(() => {
          if (hadSpeechRef.current && shouldRestartRef.current) {
            shouldRestartRef.current = false
            recognitionRef.current?.stop()
            cleanupAudio()
            setIsListening(false)
            setInterimTranscript('')
            setMicStatus('idle')
            onSilenceTimeoutRef.current?.()
          }
        }, silenceTimeoutMs)
      }
    }

    recognition.onerror = (event) => {
      const err = event.error
      if (err === 'aborted') return
      if (err === 'no-speech') {
        setMicStatus('no-sound')
        return
      }
      setErrorCode(err)
      setMicStatus('error')
      shouldRestartRef.current = false
      cleanupAudio()
      setIsListening(false)
      setInterimTranscript('')
    }

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        try {
          recognition.start()
          return
        } catch {
          // fall through to cleanup
        }
      }
      cleanupAudio()
      setIsListening(false)
      setInterimTranscript('')
      setMicStatus('idle')
    }

    recognitionRef.current = recognition
    shouldRestartRef.current = true
    setTranscript('')
    setInterimTranscript('')

    try {
      recognition.start()
      setIsListening(true)
    } catch {
      setMicStatus('error')
      setErrorCode('start-failed')
      cleanupAudio()
    }
  }, [isSupported, lang, silenceTimeoutMs, startAudioMonitor, cleanupAudio])

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
      cleanupAudio()
    }
  }, [cleanupAudio])

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    isSupported,
    micStatus,
    audioLevel,
    errorCode,
  }
}
