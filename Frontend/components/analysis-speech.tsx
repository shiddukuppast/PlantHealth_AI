'use client'

import { useEffect, useRef, useState } from 'react'
import { Info, Pause, Play, Square, Volume2, VolumeX } from 'lucide-react'
import { Prediction } from '@/lib/api'

export type AnalysisSpeechProps = {
  prediction: Prediction
  aiGuidance?: Prediction['ai_guidance']
  className?: string
}

type SpeechState = 'idle' | 'speaking' | 'paused'

function cleanText(text: string): string {
  if (!text) return ''
  return text
    .replace(/%/g, ' percent')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function ensurePeriod(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  if (/[.!?]$/.test(trimmed)) return trimmed
  return `${trimmed}.`
}

function cleanActionItem(action: string): string {
  if (!action) return ''
  // Strip leading bullets, numbers, and duplicate digit patterns like '1. 1Remove'
  let cleaned = action
    .replace(/^[•\-\*\d\.\)\s]+/, '')
    .replace(/^\d+/, '')
    .trim()
  cleaned = cleanText(cleaned)
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toLowerCase() + cleaned.slice(1)
  }
  return cleaned
}

function parseList(content: string[] | string | undefined | null): string[] {
  if (!content) return []
  if (Array.isArray(content)) {
    return content
      .flatMap((item) => (typeof item === 'string' ? item.split(/\r?\n/) : []))
      .map((item) => item.replace(/^[•\-\*\d\.\s]+/, '').trim())
      .filter(Boolean)
  }
  if (typeof content === 'string') {
    const trimmed = content.trim()
    if (!trimmed) return []
    if (trimmed.includes('\n') || trimmed.includes('•') || trimmed.includes('*')) {
      return trimmed
        .split(/\r?\n/)
        .map((l) => l.replace(/^[•\-\*\d\.\s]+/, '').trim())
        .filter(Boolean)
    }
    if (trimmed.includes(';')) {
      return trimmed
        .split(';')
        .map((s) => s.replace(/^[•\-\*\d\.\s]+/, '').trim())
        .filter(Boolean)
    }
    const sentences = trimmed
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.replace(/^[•\-\*\d\.\s]+/, '').trim())
      .filter(Boolean)
    return sentences.length > 0 ? sentences : [trimmed]
  }
  return []
}

function formatNameForSpeech(raw: string): string {
  if (!raw) return 'Unknown condition'
  let text = raw
    .replace(/___+/g, ' ')
    .replace(/__+/g, ' ')
    .replace(/_/g, ' ')
    .replace(/·/g, ' ')
    .trim()

  text = text.replace(/([a-z])([A-Z])/g, '$1 $2')
  text = text.replace(/\bPepper\s+bell\b/gi, 'Bell Pepper')
  text = text.replace(
    /Spider\s+mites?\s+Two\s+spotted\s+spider\s+mites?/gi,
    'Spider Mites (Two-Spotted Spider Mite)'
  )

  const words = text.split(/\s+/)
  const deduped: string[] = []
  for (let i = 0; i < words.length; i++) {
    const cur = words[i]
    const prev = deduped[deduped.length - 1]
    if (prev && prev.toLowerCase() === cur.toLowerCase()) {
      continue
    }
    deduped.push(cur)
  }
  text = deduped.join(' ')

  if (/\bhealthy$/i.test(text)) {
    const plant = text.replace(/\bhealthy$/i, '').trim()
    text = plant ? `${plant} Healthy` : 'Healthy plant'
  }

  // Title case words cleanly
  text = text
    .split(' ')
    .map((w) => {
      if (!w) return ''
      if (w.startsWith('(') && w.endsWith(')')) {
        const inner = w.slice(1, -1)
        return `(${inner.charAt(0).toUpperCase() + inner.slice(1)})`
      }
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')

  return cleanText(text)
}

export function buildSpeechChunks(
  prediction: Prediction,
  aiGuidance?: Prediction['ai_guidance']
): string[] {
  if (!prediction.input_valid) {
    return [
      'PlantGuard could not confidently identify a plant disease or pest from this image. Please upload a clear image of a plant leaf.'
    ]
  }

  const chunks: string[] = []
  const guidance = aiGuidance ?? prediction.ai_guidance
  const percent = Math.round(prediction.confidence * 1000) / 10
  const isLowConfidence = prediction.low_confidence || percent < 60
  const conditionName = formatNameForSpeech(prediction.class_name)

  // 1. Detection Summary
  const detectionType = prediction.type ? `${cleanText(prediction.type)} detected.` : 'Condition detected.'
  const conditionSentence = `The detected condition is ${conditionName}.`
  const confidenceSentence = `Confidence is ${percent} percent.`
  const lowConfidenceSentence = isLowConfidence
    ? 'This is a low confidence prediction. Try uploading a clearer image for verification.'
    : ''
  const severitySentence = guidance?.severity
    ? `Severity is ${cleanText(guidance.severity.toLowerCase())}.`
    : ''

  const summarySection = [
    detectionType,
    conditionSentence,
    confidenceSentence,
    lowConfidenceSentence,
    severitySentence,
  ]
    .filter(Boolean)
    .map(ensurePeriod)
    .join(' ')

  // 2. AI Insight
  const rawInsight = guidance?.summary || prediction.description
  const insightSection = rawInsight ? `AI insight: ${ensurePeriod(cleanText(rawInsight))}` : ''

  const openingChunk = [summarySection, insightSection].filter(Boolean).join(' ')
  if (openingChunk) chunks.push(openingChunk)

  // 2.5 Weather Context (if available)
  const weather = prediction.weather_context
  if (weather && weather.available) {
    const weatherDetails: string[] = []
    if (weather.temperature != null) {
      weatherDetails.push(`${weather.temperature} degrees Celsius`)
    }
    if (weather.humidity != null) {
      weatherDetails.push(`${weather.humidity} percent humidity`)
    }
    if (weather.condition) {
      weatherDetails.push(weather.condition.toLowerCase())
    }

    let weatherConditionsSentence = ''
    if (weatherDetails.length >= 3) {
      weatherConditionsSentence = `The current temperature is ${weatherDetails[0]} with ${weatherDetails[1]} and ${weatherDetails[2]}.`
    } else if (weatherDetails.length === 2) {
      weatherConditionsSentence = `The current conditions are ${weatherDetails[0]} with ${weatherDetails[1]}.`
    } else if (weatherDetails.length === 1) {
      weatherConditionsSentence = `The current temperature is ${weatherDetails[0]}.`
    }

    const weatherInsight = cleanText(
      prediction.weather_insight || guidance?.weather_insight || ''
    )

    const weatherChunk = [
      'Weather context.',
      weatherConditionsSentence ? ensurePeriod(weatherConditionsSentence) : '',
      weatherInsight ? ensurePeriod(weatherInsight) : '',
    ]
      .filter(Boolean)
      .join(' ')

    if (weatherChunk.trim()) {
      chunks.push(weatherChunk)
    }
  }

  // 3. Symptoms
  const symptomsList = parseList(guidance ? guidance.symptoms : prediction.symptoms)
  if (symptomsList.length > 0) {
    const spokenSymptoms = symptomsList
      .map((s) => cleanText(s.replace(/^[•\-\*\d\.\)\s]+/, '')))
      .filter(Boolean)
      .map(ensurePeriod)
      .join(' ')
    if (spokenSymptoms) {
      chunks.push(`Symptoms include: ${spokenSymptoms}`)
    }
  }

  // 4. Recommended Actions
  const actionsList = parseList(
    guidance
      ? guidance.recommended_actions
      : prediction.treatment || prediction.recommendations
  )
  if (actionsList.length > 0) {
    const ordinals = [
      'First', 'Second', 'Third', 'Fourth', 'Fifth',
      'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'
    ]
    const spokenActions = actionsList
      .map((action, idx) => {
        const prefix = ordinals[idx] || 'Next'
        const cleaned = cleanActionItem(action)
        return ensurePeriod(`${prefix}, ${cleaned}`)
      })
      .filter(Boolean)
      .join(' ')
    if (spokenActions) {
      chunks.push(`Recommended actions: ${spokenActions}`)
    }
  }

  // 5. Prevention
  const preventionList = parseList(guidance ? guidance.prevention : prediction.prevention)
  if (preventionList.length > 0) {
    const spokenPrevention = preventionList
      .map((p) => cleanText(p.replace(/^[•\-\*\d\.\)\s]+/, '')))
      .filter(Boolean)
      .map(ensurePeriod)
      .join(' ')
    if (spokenPrevention) {
      chunks.push(`Prevention tips include: ${spokenPrevention}`)
    }
  }

  // 6. Important Note
  const rawNote =
    guidance?.when_to_seek_expert_help ||
    (guidance
      ? ''
      : 'If symptoms rapidly progress, yield drops sharply, or you are unsure about the diagnosis, contact your local agricultural advisor for confirmation and tailored management.')
  if (rawNote) {
    const cleanedNote = cleanText(rawNote)
    if (cleanedNote) {
      chunks.push(`Important note: ${ensurePeriod(cleanedNote)}`)
    }
  }

  return chunks
}

function getPreferredVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = synth.getVoices()
  if (!voices || voices.length === 0) return null

  const enVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'))
  if (enVoices.length > 0) {
    const defaultEn = enVoices.find((v) => v.default)
    if (defaultEn) return defaultEn
    const preferred = enVoices.find((v) =>
      /natural|google|samantha|karen|daniel|george|zira|en-us|en-gb/i.test(v.name)
    )
    return preferred || enVoices[0]
  }

  const defaultVoice = voices.find((v) => v.default)
  return defaultVoice || voices[0] || null
}

export function AnalysisSpeech({
  prediction,
  aiGuidance,
  className = '',
}: AnalysisSpeechProps) {
  const [speechState, setSpeechState] = useState<SpeechState>('idle')
  const [hasPlayed, setHasPlayed] = useState(false)
  const [isSupported, setIsSupported] = useState(true)

  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const currentChunkIndexRef = useRef<number>(0)
  const isStoppedRef = useRef<boolean>(false)
  const chunksRef = useRef<string[]>([])

  // Check browser speech synthesis support & load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false)
      return
    }

    setIsSupported(true)
    const synth = window.speechSynthesis

    const updateVoices = () => {
      voiceRef.current = getPreferredVoice(synth)
    }

    updateVoices()
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = updateVoices
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [])

  // Cancel speech when component unmounts or prediction changes
  useEffect(() => {
    isStoppedRef.current = true
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setSpeechState('idle')
    setHasPlayed(false)
    currentChunkIndexRef.current = 0
    activeUtteranceRef.current = null
  }, [prediction])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isStoppedRef.current = true
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const playChunk = (index: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const chunks = chunksRef.current
    if (index >= chunks.length) {
      setSpeechState('idle')
      setHasPlayed(true)
      currentChunkIndexRef.current = 0
      activeUtteranceRef.current = null
      return
    }

    currentChunkIndexRef.current = index
    const text = chunks[index]
    const utterance = new SpeechSynthesisUtterance(text)

    if (voiceRef.current) {
      utterance.voice = voiceRef.current
    }
    utterance.rate = 0.95
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => {
      setSpeechState('speaking')
    }

    utterance.onend = () => {
      if (isStoppedRef.current) return
      playChunk(index + 1)
    }

    utterance.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') {
        return
      }
      console.warn('Speech synthesis warning:', e.error)
      setSpeechState('idle')
    }

    activeUtteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  const handlePlay = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    isStoppedRef.current = false
    window.speechSynthesis.cancel()

    // Build the clean speech chunks
    const chunks = buildSpeechChunks(prediction, aiGuidance)
    chunksRef.current = chunks

    if (chunks.length === 0) return

    playChunk(0)
  }

  const handlePause = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.pause()
    setSpeechState('paused')
  }

  const handleResume = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setSpeechState('speaking')
    } else {
      // Re-trigger from current chunk if paused state was lost by browser
      isStoppedRef.current = false
      playChunk(currentChunkIndexRef.current)
    }
  }

  const handleStop = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    isStoppedRef.current = true
    window.speechSynthesis.cancel()
    currentChunkIndexRef.current = 0
    activeUtteranceRef.current = null
    setSpeechState('idle')
  }

  if (!isSupported) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
        <Info className="size-3.5 shrink-0" />
        <span>Text-to-speech is not available in this browser.</span>
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {speechState === 'idle' && (
        <button
          type="button"
          onClick={handlePlay}
          aria-label={hasPlayed ? 'Listen to plant analysis again' : 'Listen to plant analysis'}
          className="inline-flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/15 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Volume2 className="size-4" />
          <span>{hasPlayed ? 'Listen Again' : 'Listen to Analysis'}</span>
        </button>
      )}

      {speechState === 'speaking' && (
        <>
          <div className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs animate-pulse">
            <Volume2 className="size-4" />
            <span>Speaking...</span>
          </div>
          <button
            type="button"
            onClick={handlePause}
            aria-label="Pause speech"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Pause className="size-4" />
            <span>Pause</span>
          </button>
          <button
            type="button"
            onClick={handleStop}
            aria-label="Stop speech"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Square className="size-4" />
            <span>Stop</span>
          </button>
        </>
      )}

      {speechState === 'paused' && (
        <>
          <div className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground border border-border">
            <VolumeX className="size-4" />
            <span>Paused</span>
          </div>
          <button
            type="button"
            onClick={handleResume}
            aria-label="Resume speech"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Play className="size-4" />
            <span>Resume</span>
          </button>
          <button
            type="button"
            onClick={handleStop}
            aria-label="Stop speech"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Square className="size-4" />
            <span>Stop</span>
          </button>
        </>
      )}
    </div>
  )
}

export default AnalysisSpeech
