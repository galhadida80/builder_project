import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

const LANG_MAP: Record<string, string> = {
  he: 'he-IL',
  en: 'en-US',
}

const STORAGE_KEY = 'builderops_tts_prefs'

export interface VoiceOption {
  voice: SpeechSynthesisVoice
  label: string
}

interface TtsPrefs {
  voiceURI: string | null
  rate: number
  pitch: number
  volume: number
}

function loadPrefs(): TtsPrefs {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return { voiceURI: null, rate: 1.0, pitch: 1.0, volume: 1.0 }
}

function savePrefs(prefs: TtsPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/---/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function useVoiceOutput() {
  const { language } = useLanguage()
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([])
  const [prefs, setPrefs] = useState<TtsPrefs>(loadPrefs)

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const lang = LANG_MAP[language] || 'he-IL'
  const langPrefix = lang.split('-')[0]

  const loadVoices = useCallback(() => {
    if (!isSupported) return
    const voices = window.speechSynthesis.getVoices()
    const matching = voices
      .filter(v => v.lang.startsWith(langPrefix) || v.lang.startsWith(lang))
      .map(v => ({
        voice: v,
        label: `${v.name}${v.localService ? '' : ' ☁️'}`,
      }))
    const fallback = matching.length === 0
      ? voices.slice(0, 5).map(v => ({ voice: v, label: `${v.name} (${v.lang})` }))
      : []
    setAvailableVoices(matching.length > 0 ? matching : fallback)
  }, [isSupported, lang, langPrefix])

  useEffect(() => {
    loadVoices()
    if (isSupported) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
    return () => {
      if (isSupported) window.speechSynthesis.onvoiceschanged = null
    }
  }, [loadVoices, isSupported])

  const selectedVoice = availableVoices.find(v => v.voice.voiceURI === prefs.voiceURI)?.voice
    || availableVoices.find(v => v.voice.default)?.voice
    || availableVoices[0]?.voice
    || null

  const stop = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [isSupported])

  const speak = useCallback((text: string) => {
    if (!isSupported) return

    window.speechSynthesis.cancel()

    const cleaned = stripMarkdown(text)
    if (!cleaned) return

    const utterance = new SpeechSynthesisUtterance(cleaned)
    utterance.lang = lang
    if (selectedVoice) utterance.voice = selectedVoice
    utterance.rate = prefs.rate
    utterance.pitch = prefs.pitch
    utterance.volume = prefs.volume

    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    setIsSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }, [isSupported, lang, selectedVoice, prefs])

  const setVoice = useCallback((voiceURI: string) => {
    setPrefs(prev => {
      const next = { ...prev, voiceURI }
      savePrefs(next)
      return next
    })
  }, [])

  const setRate = useCallback((rate: number) => {
    setPrefs(prev => {
      const next = { ...prev, rate: Math.max(0.5, Math.min(2, rate)) }
      savePrefs(next)
      return next
    })
  }, [])

  const setPitch = useCallback((pitch: number) => {
    setPrefs(prev => {
      const next = { ...prev, pitch: Math.max(0.5, Math.min(2, pitch)) }
      savePrefs(next)
      return next
    })
  }, [])

  const setVolume = useCallback((volume: number) => {
    setPrefs(prev => {
      const next = { ...prev, volume: Math.max(0, Math.min(1, volume)) }
      savePrefs(next)
      return next
    })
  }, [])

  const previewVoice = useCallback((voiceURI: string) => {
    if (!isSupported) return
    window.speechSynthesis.cancel()
    const voice = availableVoices.find(v => v.voice.voiceURI === voiceURI)?.voice
    if (!voice) return
    const sample = language === 'he' ? 'שלום, אני העוזר החכם שלך' : 'Hello, I am your smart assistant'
    const utterance = new SpeechSynthesisUtterance(sample)
    utterance.voice = voice
    utterance.lang = lang
    utterance.rate = prefs.rate
    utterance.pitch = prefs.pitch
    utterance.volume = prefs.volume
    window.speechSynthesis.speak(utterance)
  }, [isSupported, availableVoices, lang, language, prefs])

  useEffect(() => {
    return () => {
      if (isSupported) window.speechSynthesis.cancel()
    }
  }, [isSupported])

  return {
    isSpeaking,
    speak,
    stop,
    isSupported,
    availableVoices,
    selectedVoice,
    prefs,
    setVoice,
    setRate,
    setPitch,
    setVolume,
    previewVoice,
  }
}
