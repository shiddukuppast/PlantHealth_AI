'use client'

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  AlertCircle,
  Camera,
  CheckCircle2,
  CloudSun,
  Info,
  Leaf,
  LogOut,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import { ApiError, fetchWeather, getCurrentUser, logout, predictDisease, Prediction, Weather } from '@/lib/api'
import CameraCapture from '@/components/camera-capture'
import AnalysisSpeech from '@/components/analysis-speech'
import FieldIntelligence from '@/components/field-intelligence'

const MAX_SIZE = 10 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png']

export function formatConditionName(raw: string): string {
  if (!raw) return ''

  // 1. Normalize dataset delimiters
  let text = raw
    .replace(/___+/g, ' ')
    .replace(/__+/g, ' ')
    .replace(/_/g, ' ')
    .replace(/·/g, ' ')
    .trim()

  // 2. Separate CamelCase words, e.g. "YellowLeaf" -> "Yellow Leaf"
  text = text.replace(/([a-z])([A-Z])/g, '$1 $2')

  // 3. Handle specific dataset naming conventions
  text = text.replace(/\bPepper\s+bell\b/gi, 'Bell Pepper')
  text = text.replace(
    /Spider\s+mites?\s+Two\s+spotted\s+spider\s+mites?/gi,
    'Spider Mites (Two-Spotted Spider Mite)'
  )

  // 4. Deduplicate consecutive repeated words (case-insensitive)
  // e.g. "Tomato Tomato" -> "Tomato"
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

  // 5. Handle healthy ending
  if (/\bhealthy$/i.test(text)) {
    const plant = text.replace(/\bhealthy$/i, '').trim()
    text = plant ? `${plant} (Healthy)` : 'Healthy'
  }

  // 6. Title case words cleanly
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

  return text
}

function parseBulletList(content: string[] | string | undefined | null): string[] {
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

export default function DashboardPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [weather, setWeather] = useState<Weather | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [cameraOpen, setCameraOpen] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const user = await getCurrentUser()
        if (!active) return
        setName(user.name || user.email.split('@')[0])
      } catch {
        if (!active) return
        router.replace('/')
      } finally {
        if (active) setCheckingAuth(false)
      }
    }
    void load()
    void fetchWeather()
      .then(setWeather)
      .catch(() => setWeather(null))
      .finally(() => setWeatherLoading(false))
    return () => {
      active = false
    }
  }, [router])

  function choose(next: File | undefined) {
    if (!next) return
    setError('')
    setPrediction(null)
    if (!TYPES.includes(next.type)) {
      return setError('Please choose a JPG, JPEG, or PNG image.')
    }
    if (next.size > MAX_SIZE) {
      return setError('That image is larger than 10 MB.')
    }
    setFile(next)
    setPreview(URL.createObjectURL(next))
  }

  function capture(next: File) {
    setCameraOpen(false)
    choose(next)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    choose(e.dataTransfer.files[0])
  }

  async function analyze() {
    if (!file) return setError('Select a leaf image first.')
    setBusy(true)
    setError('')
    try {
      const res = await predictDisease(file)
      setPrediction(res)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Unable to analyze the image. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  function clear() {
    setFile(null)
    setPreview('')
    setPrediction(null)
    setError('')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  async function logoutUser() {
    try {
      await logout()
    } finally {
      router.replace('/')
    }
  }

  if (checkingAuth) return <main className="min-h-screen bg-background" />

  return (
    <main className="min-h-screen bg-background pb-16">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="size-5" />
            </span>
            <span className="font-mono font-bold">PlantGuard AI</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border-r border-border pr-3">
              <Sun className="size-4 text-primary" />
              <div className="text-right leading-tight">
                <p className="text-sm font-semibold">
                  {weatherLoading ? '--°C' : weather ? `${weather.temperature}°C` : 'Weather unavailable'}
                </p>
                <p className="hidden max-w-28 truncate text-xs text-muted-foreground sm:block">
                  {weatherLoading ? 'Loading...' : weather ? weather.location : 'Weather unavailable'}
                </p>
              </div>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">Plant health workspace</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-full bg-secondary">
              <UserRound className="size-4 text-muted-foreground" />
            </span>
            <button
              onClick={logoutUser}
              aria-label="Log out"
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground cursor-pointer"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        {!prediction ? (
          <div className="mx-auto max-w-2xl">
            <div className="text-center sm:text-left">
              <p className="mb-2 flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm font-semibold text-primary">
                <ScanLine className="size-4" /> Plant Health Analysis
              </p>
              <h1 className="font-mono text-2xl font-bold tracking-tight sm:text-4xl">
                Plant Disease &amp; Pest Detection
              </h1>
              <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground">
                Upload a clear image of a plant leaf or pest for instant AI-powered diagnosis and guidance.
              </p>
            </div>

            <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setError('')
                    setCameraOpen(true)
                  }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Camera className="size-4" />
                  Scan Leaf
                </button>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold transition hover:bg-secondary cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Upload className="size-4" />
                  Upload from Gallery
                </button>
              </div>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="flex min-h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/25 bg-primary/[0.03] p-6 text-center transition hover:border-primary/50"
              >
                {preview ? (
                  <>
                    <img
                      src={preview}
                      alt="Selected plant leaf or pest"
                      className="max-h-64 max-w-full rounded-xl object-contain shadow-xs"
                    />
                    <div className="mt-4 flex items-center gap-3">
                      <span className="max-w-56 truncate text-sm font-medium">{file?.name}</span>
                      <button
                        type="button"
                        onClick={() => setCameraOpen(true)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 cursor-pointer"
                      >
                        Retake
                      </button>
                      <button
                        onClick={clear}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-secondary cursor-pointer"
                        aria-label="Remove image"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Upload className="size-6" />
                    </span>
                    <h2 className="font-mono text-lg font-bold">Upload a plant or pest image</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Drag and drop your image here or browse
                    </p>
                    <button
                      onClick={() => inputRef.current?.click()}
                      className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
                    >
                      Browse image
                    </button>
                    <p className="mt-4 text-xs text-muted-foreground">
                      JPG, JPEG, PNG · Maximum 10 MB
                    </p>
                  </>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => choose(e.target.files?.[0])}
                />
              </div>

              {file && (
                <button
                  onClick={analyze}
                  disabled={busy}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition cursor-pointer"
                >
                  {busy ? (
                    <>
                      <span className="size-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <ScanLine className="size-4" />
                      Analyze Image
                    </>
                  )}
                </button>
              )}

              {busy && (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-primary animate-pulse">
                  <ScanLine className="size-3.5" />
                  <span>Examining leaf patterns &amp; generating diagnostic report...</span>
                </div>
              )}

              {error && (
                <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </p>
              )}
            </section>

            <CameraCapture
              open={cameraOpen}
              onCapture={capture}
              onClose={() => setCameraOpen(false)}
            />
          </div>
        ) : (
          <AnalysisReport
            prediction={prediction}
            preview={preview}
            onReset={clear}
          />
        )}
      </div>
    </main>
  )
}

function AnalysisReport({
  prediction,
  preview,
  onReset,
}: {
  prediction: Prediction
  preview: string
  onReset: () => void
}) {
  const [fieldIntelligenceOpen, setFieldIntelligenceOpen] = useState(false)

  if (!prediction.input_valid) {
    return (
      <article className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-700">
            <AlertCircle className="size-3.5" />
            Image not suitable for analysis
          </span>
          <h2 className="mt-3 font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Please upload a clear plant image
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {prediction.message || 'Please upload a clear image of a plant leaf suitable for analysis.'}
          </p>
          {preview && (
            <div className="mt-6 flex justify-center">
              <div className="overflow-hidden rounded-2xl border border-border bg-muted/20 shadow-xs">
                <img src={preview} alt="Rejected specimen" className="max-h-64 max-w-full object-contain" />
              </div>
            </div>
          )}
          <ul className="mt-6 space-y-2 text-left text-sm text-muted-foreground">
            <li>Make sure the leaf is clearly visible.</li>
            <li>Avoid heavily blurred images.</li>
            <li>Keep the leaf inside the frame.</li>
            <li>Use good lighting.</li>
          </ul>
          <div className="mt-7 flex flex-col items-center gap-3">
            <AnalysisSpeech prediction={prediction} />
            <button
              onClick={onReset}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 cursor-pointer"
            >
              Analyze Another Image
            </button>
          </div>
        </div>
      </article>
    )
  }

  const percent = Math.round(prediction.confidence * 1000) / 10
  const isLowConfidence = prediction.low_confidence || percent < 60
  const guidance = prediction.ai_guidance
  const formattedCondition = formatConditionName(prediction.class_name)

  const aiExplanation =
    guidance?.summary ||
    prediction.description ||
    'AI analysis completed for this specimen.'
  const symptomsList = parseBulletList(
    guidance ? guidance.symptoms : prediction.symptoms
  )
  const actionsList = parseBulletList(
    guidance
      ? guidance.recommended_actions
      : prediction.treatment || prediction.recommendations
  )
  const preventionList = parseBulletList(
    guidance ? guidance.prevention : prediction.prevention
  )
  const importantNote =
    guidance?.when_to_seek_expert_help ||
    'If symptoms rapidly progress, yield drops sharply, or you are unsure about the diagnosis, contact your local agricultural advisor for confirmation and tailored management.'

  const shouldShowFieldSpread =
    prediction.input_valid &&
    !prediction.low_confidence &&
    (prediction.type === 'Disease' || prediction.type === 'Pest') &&
    !/healthy|no disease|no issue/i.test(prediction.class_name || '') &&
    !/healthy|no disease|no issue/i.test(prediction.type || '')

  return (
    <article className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-sm transition-all">
      {/* 1. RESULT HEADER */}
      <div className="flex flex-col items-center text-center pb-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
          <CheckCircle2 className="size-3.5" />
          Diagnosis Report
        </span>
        <h2 className="mt-2 font-mono text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Analysis Result
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Unified AI-powered health diagnosis and management plan
        </p>
      </div>

      {/* 2. IMAGE SECTION */}
      {preview && (
        <div className="mt-6 flex justify-center">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/20 shadow-xs max-w-sm w-full">
            <img
              src={preview}
              alt="Analyzed specimen"
              className="max-h-64 sm:max-h-72 w-full object-contain mx-auto"
            />
            <div className="absolute bottom-2.5 right-2.5 rounded-lg bg-card/90 backdrop-blur-xs px-2.5 py-1 text-[11px] font-medium text-muted-foreground border border-border/60 shadow-xs">
              Analyzed Specimen
            </div>
          </div>
        </div>
      )}

      {/* DETECTION SUMMARY CARD */}
      <div className="mt-6 rounded-2xl border border-border bg-secondary/35 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Detection Type
              </span>
              <span className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {prediction.type}
              </span>
              {guidance?.severity && (
                <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground border border-border/50">
                  Severity: {guidance.severity}
                </span>
              )}
            </div>
            <h3 className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug pt-1">
              {formattedCondition}
            </h3>
          </div>

          <div className="sm:border-l sm:border-border sm:pl-6 sm:text-right shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Confidence
            </span>
            <div className="mt-0.5 flex items-baseline gap-1 sm:justify-end">
              <span className="font-mono text-2xl sm:text-3xl font-bold text-primary">
                {percent}%
              </span>
            </div>
          </div>
        </div>

        {isLowConfidence && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2.5 text-xs sm:text-sm text-amber-900 font-medium">
            <AlertCircle className="size-4 shrink-0 text-amber-700" />
            <span>Low confidence — try uploading a clearer image.</span>
          </div>
        )}

        {!prediction.llm_available && (
          <div className="mt-3 rounded-xl bg-secondary/80 px-3.5 py-2 text-xs text-muted-foreground">
            AI guidance is temporarily unavailable. The model prediction is still shown.
          </div>
        )}
      </div>

      {/* 3. AI INSIGHT */}
      <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="size-4" />
          </span>
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
            AI Insight
          </h4>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-foreground/90 font-normal">
          {aiExplanation}
        </p>
      </div>

      {/* 3.5 WEATHER CONTEXT */}
      {prediction.weather_context?.available && (
        <div className="mt-6 rounded-2xl border border-border bg-secondary/35 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base" role="img" aria-label="weather">🌦️</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Weather Context
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm sm:text-base font-semibold text-foreground">
            {prediction.weather_context.temperature != null && (
              <span>{prediction.weather_context.temperature}°C</span>
            )}
            {prediction.weather_context.humidity != null && (
              <>
                <span className="text-muted-foreground">·</span>
                <span>{prediction.weather_context.humidity}% humidity</span>
              </>
            )}
            {prediction.weather_context.condition && (
              <>
                <span className="text-muted-foreground">·</span>
                <span>{prediction.weather_context.condition}</span>
              </>
            )}
            {prediction.weather_context.rainfall != null && prediction.weather_context.rainfall > 0 && (
              <>
                <span className="text-muted-foreground">·</span>
                <span>{prediction.weather_context.rainfall} mm rain</span>
              </>
            )}
            {prediction.weather_context.wind_speed != null && (
              <>
                <span className="text-muted-foreground">·</span>
                <span>{prediction.weather_context.wind_speed} m/s wind</span>
              </>
            )}
          </div>
          {(prediction.weather_insight || guidance?.weather_insight) && (
            <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-foreground/90 font-normal">
              {prediction.weather_insight || guidance?.weather_insight}
            </p>
          )}
        </div>
      )}

      {/* 4. SYMPTOMS */}
      {symptomsList.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Symptoms
            </h4>
          </div>
          <ul className="space-y-2.5 pl-1">
            {symptomsList.map((symptom, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-sm sm:text-base leading-relaxed text-foreground/90"
              >
                <span className="size-1.5 rounded-full bg-primary/80 shrink-0 mt-2.5" />
                <span>{symptom}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. RECOMMENDED ACTIONS */}
      {actionsList.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Recommended Actions
            </h4>
          </div>
          <ol className="space-y-2.5">
            {actionsList.map((action, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-border/70 bg-secondary/25 p-3.5 sm:p-4 text-sm sm:text-base leading-relaxed text-foreground/90"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mt-0.5">
                  {idx + 1}
                </span>
                <span className="flex-1">{action}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 6. PREVENTION */}
      {preventionList.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Prevention
            </h4>
          </div>
          <ul className="space-y-2.5 pl-1">
            {preventionList.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-sm sm:text-base leading-relaxed text-foreground/90"
              >
                <span className="size-1.5 rounded-full bg-primary/80 shrink-0 mt-2.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 7. IMPORTANT NOTE */}
      <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Important Note
            </h4>
            <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
              {importantNote}
            </p>
          </div>
        </div>
      </div>

      {/* 8. 🔊 LISTEN TO ANALYSIS */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <AnalysisSpeech
          prediction={prediction}
          aiGuidance={guidance}
        />
      </div>

      {!fieldIntelligenceOpen && shouldShowFieldSpread && (
        <div className="mt-6 rounded-2xl border border-border bg-secondary/20 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              🗺️
            </span>
            <div className="flex-1">
              <h4 className="font-mono text-lg font-bold text-foreground">
                Check Probable Field Spread
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Want to see which areas of your field may need inspection first?
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFieldIntelligenceOpen(true)}
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <span aria-hidden="true">🗺️</span>
            Check Probable Field Spread
          </button>
        </div>
      )}

      {fieldIntelligenceOpen && (
        <div className="mt-6">
          <FieldIntelligence
            conditionName={formattedCondition}
            conditionType={prediction.type}
            onBack={() => setFieldIntelligenceOpen(false)}
          />
        </div>
      )}

      {/* 8. ANALYZE ANOTHER IMAGE */}
      <div className="mt-8 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onReset}
          className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-xs cursor-pointer"
        >
          <Upload className="size-4" />
          Analyze Another Image
        </button>
      </div>
    </article>
  )
}
