'use client'

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  CloudRain,
  Compass,
  Droplets,
  HeartPulse,
  History,
  Info,
  Leaf,
  LogOut,
  RefreshCw,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  Upload,
  UserRound,
  Wind,
  X,
} from 'lucide-react'
import {
  ApiError,
  fetchWeather,
  getCurrentUser,
  getPredictionHistory,
  logout,
  predictDisease,
  Prediction,
  PredictionHistoryItem,
  Weather,
} from '@/lib/api'
import CameraCapture from '@/components/camera-capture'
import AnalysisSpeech from '@/components/analysis-speech'

const MAX_SIZE = 10 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png']

function formatConditionName(raw: string): string {
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
    text = plant ? `${plant} (Healthy)` : 'Healthy Crop'
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

function formatFarmerDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function getTodayFormatted(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getWeatherFarmingAdvice(weather: Weather): string {
  const cond = (weather.condition || '').toLowerCase()
  const hum = weather.humidity ?? 0
  const temp = weather.temperature ?? 25

  if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('thunder')) {
    return 'Rain expected today. Postpone pesticide sprays and fertilizer application to prevent runoff.'
  }
  if (hum >= 80) {
    return 'High humidity levels increase risk of fungal infection. Maintain crop spacing and avoid overhead evening watering.'
  }
  if (temp >= 35) {
    return 'High temperatures may cause moisture stress. Irrigate early in the morning or late evening.'
  }
  if (temp <= 14) {
    return 'Cool weather. Inspect crops regularly for morning dew-related fungal or mold growth.'
  }
  return 'Favorable field conditions today for crop inspection, weeding, and routine farm management.'
}

export default function DashboardPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  // Farmer & user state
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Live Weather state
  const [weather, setWeather] = useState<Weather | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false)

  // History state
  const [history, setHistory] = useState<PredictionHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Load user profile, weather, and diagnosis history
  useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        const user = await getCurrentUser()
        if (!active) return
        setName(user.name || user.email.split('@')[0])
      } catch {
        if (!active) return
        router.replace('/')
        return
      } finally {
        if (active) setCheckingAuth(false)
      }

      // Fetch history if authenticated
      if (active) {
        setHistoryLoading(true)
        try {
          const pastScans = await getPredictionHistory()
          if (active) setHistory(pastScans || [])
        } catch {
          if (active) setHistory([])
        } finally {
          if (active) setHistoryLoading(false)
        }
      }
    }

    void loadData()

    // Fetch live weather
    void fetchWeather()
      .then((data) => {
        if (active) setWeather(data)
      })
      .catch(() => {
        if (active) setWeather(null)
      })
      .finally(() => {
        if (active) setWeatherLoading(false)
      })

    return () => {
      active = false
    }
  }, [router])

  function choose(next: File | undefined) {
    if (!next) return
    setError('')
    setPrediction(null)
    if (!TYPES.includes(next.type)) {
      return setError('Please choose a clear JPG, JPEG, or PNG plant photo.')
    }
    if (next.size > MAX_SIZE) {
      return setError('That image is larger than 10 MB. Please choose a smaller photo.')
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
    if (!file) return setError('Please choose or take a plant leaf photo first.')
    setBusy(true)
    setError('')
    try {
      const res = await predictDisease(file)
      setPrediction(res)

      // Refresh history list so the new scan appears
      try {
        const updatedHistory = await getPredictionHistory()
        setHistory(updatedHistory || [])
      } catch {
        // Silent catch for history reload
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Unable to analyze the leaf image right now. Please check your connection and try again.')
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

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfdf9]">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-600/10 text-emerald-700 animate-pulse">
            <Sprout className="size-8" />
          </span>
          <p className="text-sm font-medium text-emerald-800">Opening PlantHealth AI...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fbfdf9] text-stone-900 pb-20">
      {/* 1. TOP BRANDING BAR */}
      <header className="sticky top-0 z-30 border-b border-emerald-900/10 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-xs">
              <Leaf className="size-6" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-lg font-bold tracking-tight text-emerald-950 sm:text-xl">
                  PlantHealth AI
                </span>
                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  V2
                </span>
              </div>
              <p className="hidden text-xs text-stone-500 sm:block">
                AI Agricultural Advisory for Farmers
              </p>
            </div>
          </div>

          {/* Right Header: Weather Pill + Farmer Profile + Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Weather Pill */}
            {weather && (
              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-emerald-800/10 bg-emerald-50/70 px-3 py-1.5 text-xs text-emerald-950">
                <Sun className="size-4 text-amber-600 shrink-0" />
                <span className="font-semibold">{weather.temperature}°C</span>
                <span className="text-emerald-800/70 truncate max-w-28">{weather.location}</span>
              </div>
            )}

            {/* Farmer Profile Badge */}
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-1.5">
              <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <UserRound className="size-3.5" />
              </span>
              <div className="text-left text-xs leading-tight">
                <p className="font-semibold text-stone-800 max-w-28 truncate">{name || 'Farmer'}</p>
                <p className="text-[10px] text-stone-500">Active Member</p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logoutUser}
              aria-label="Log Out"
              title="Log Out"
              className="flex size-9 items-center justify-center rounded-xl text-stone-500 transition hover:bg-stone-100 hover:text-red-700 cursor-pointer"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* SECTION 1: WELCOME & FARMER GREETING */}
      <section className="border-b border-emerald-900/5 bg-gradient-to-b from-emerald-50/70 to-transparent py-6 sm:py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-emerald-800">
                🌱 Namaste{name ? `, ${name}` : ''}!
              </p>
              <h1 className="mt-1 font-mono text-2xl sm:text-3xl font-bold tracking-tight text-emerald-950">
                Welcome to Your Farm Dashboard
              </h1>
              <p className="mt-1 text-sm text-stone-600 sm:text-base leading-relaxed">
                Healthy crops lead to prosperous harvests. Check your crop leaves regularly for early disease detection.
              </p>
            </div>

            <div className="self-start sm:self-auto rounded-2xl border border-emerald-800/15 bg-white px-4 py-2.5 shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Today</p>
              <p className="text-sm font-semibold text-stone-800">{getTodayFormatted()}</p>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN DASHBOARD CONTENT */}
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 space-y-8">
        {!prediction ? (
          <>
            {/* SECTION 3: CROP HEALTH SCANNER (PRIMARY PROMINENT FEATURE) */}
            <section
              aria-labelledby="scanner-heading"
              className="overflow-hidden rounded-3xl border-2 border-emerald-600/25 bg-white p-6 sm:p-8 shadow-sm transition hover:border-emerald-600/40"
            >
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-xs">
                  <HeartPulse className="size-6" />
                </span>
                <div>
                  <h2
                    id="scanner-heading"
                    className="font-mono text-xl sm:text-2xl font-bold text-emerald-950 tracking-tight"
                  >
                    Check Your Crop Health
                  </h2>
                  <p className="mt-1 text-sm sm:text-base text-stone-600 leading-relaxed max-w-2xl">
                    Take a photo or upload an image of an affected leaf to receive instant AI diagnosis, severity assessment, and practical agricultural treatment.
                  </p>
                </div>
              </div>

              {/* Action Buttons: Take Photo or Upload Image */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setError('')
                    setCameraOpen(true)
                  }}
                  className="flex min-h-13 items-center justify-center gap-2.5 rounded-2xl bg-emerald-700 px-6 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-800 active:scale-[0.99] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                >
                  <Camera className="size-5" />
                  <span>Take Photo with Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex min-h-13 items-center justify-center gap-2.5 rounded-2xl border-2 border-emerald-800/25 bg-white px-6 text-base font-semibold text-emerald-900 transition hover:bg-emerald-50 active:scale-[0.99] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                >
                  <Upload className="size-5 text-emerald-700" />
                  <span>Upload from Gallery</span>
                </button>
              </div>

              {/* Upload Dropzone / Image Preview Area */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-600/30 bg-emerald-50/30 p-6 text-center transition hover:border-emerald-600/60"
              >
                {preview ? (
                  <div className="space-y-4">
                    <div className="relative mx-auto overflow-hidden rounded-2xl border border-emerald-900/10 bg-white p-2 shadow-xs">
                      <img
                        src={preview}
                        alt="Selected plant leaf photo"
                        className="max-h-64 sm:max-h-72 w-auto max-w-full rounded-xl object-contain"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <span className="max-w-64 truncate text-xs sm:text-sm font-semibold text-stone-700">
                        {file?.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCameraOpen(true)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-200 cursor-pointer"
                      >
                        <RotateCcw className="size-3.5" />
                        Retake Photo
                      </button>
                      <button
                        type="button"
                        onClick={clear}
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 hover:text-red-700 cursor-pointer"
                      >
                        <X className="size-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                      <Leaf className="size-7" />
                    </span>
                    <h3 className="font-mono text-base sm:text-lg font-bold text-stone-900">
                      Ready to inspect your crop
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-stone-500">
                      Drag and drop a clear plant leaf photo here, or browse your files
                    </p>
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="mt-4 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-2xs hover:bg-emerald-800 transition cursor-pointer"
                    >
                      Browse Files
                    </button>
                    <p className="mt-3 text-[11px] text-stone-500">
                      Supports JPG, JPEG, and PNG files up to 10 MB
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

              {/* Photo Tips Card */}
              <div className="mt-5 rounded-2xl border border-emerald-800/10 bg-emerald-50/50 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
                  <Sparkles className="size-4 text-emerald-700" />
                  Tips for Best AI Diagnosis Results
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3 text-xs text-stone-700">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span><strong>Good Light:</strong> Take photo in bright daylight. Avoid dark shadows.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span><strong>Sharp Focus:</strong> Keep camera steady. Focus directly on the affected leaf.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span><strong>Close View:</strong> Fill frame with leaf surface showing visible spots or symptoms.</span>
                  </div>
                </div>
              </div>

              {/* Prominent Analyze Button */}
              {file && (
                <button
                  type="button"
                  onClick={analyze}
                  disabled={busy}
                  className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 font-mono text-base font-bold text-white shadow-md transition hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
                >
                  {busy ? (
                    <>
                      <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Analyzing leaf with AI...</span>
                    </>
                  ) : (
                    <>
                      <ScanLine className="size-5" />
                      <span>Analyze Crop Leaf Now</span>
                    </>
                  )}
                </button>
              )}

              {/* Error Alert */}
              {error && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
                >
                  <AlertCircle className="size-5 shrink-0 text-red-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </section>

            {/* SECTION 2: CURRENT WEATHER & FARMING ADVISORY */}
            <section
              aria-labelledby="weather-heading"
              className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs"
            >
              <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
                    <Sun className="size-5" />
                  </span>
                  <div>
                    <h3 id="weather-heading" className="font-mono text-lg font-bold text-stone-900">
                      Live Weather & Field Advisory
                    </h3>
                    <p className="text-xs text-stone-500">
                      {weather ? `${weather.location}, ${weather.country}` : 'Environmental context for your farm'}
                    </p>
                  </div>
                </div>
              </div>

              {weatherLoading ? (
                <div className="py-8 text-center text-sm text-stone-500 animate-pulse">
                  Fetching current weather conditions...
                </div>
              ) : weather ? (
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {/* Temperature */}
                    <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                        Temperature
                      </span>
                      <p className="mt-1 font-mono text-2xl font-bold text-stone-900">
                        {weather.temperature}°C
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Feels like {weather.feels_like}°C
                      </p>
                    </div>

                    {/* Conditions */}
                    <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                        Condition
                      </span>
                      <p className="mt-1 font-mono text-lg font-bold text-emerald-950 truncate">
                        {weather.condition}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">Sky & Atmosphere</p>
                    </div>

                    {/* Humidity */}
                    <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                        Relative Humidity
                      </span>
                      <p className="mt-1 font-mono text-2xl font-bold text-stone-900">
                        {weather.humidity}%
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">Air Moisture Level</p>
                    </div>

                    {/* Field Spray Safety */}
                    <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                        Field Spray Status
                      </span>
                      <p className="mt-1 font-mono text-lg font-bold text-stone-900">
                        {weather.condition.toLowerCase().includes('rain') ? 'Spray Alert' : 'Safe to Spray'}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">Field operations</p>
                    </div>
                  </div>

                  {/* Practical Weather Advice Banner */}
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs sm:text-sm text-amber-950">
                    <Info className="size-5 shrink-0 text-amber-700 mt-0.5" />
                    <div>
                      <span className="font-bold">Weather Advisory for Farmers: </span>
                      <span>{getWeatherFarmingAdvice(weather)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-stone-50 p-6 text-center text-sm text-stone-500">
                  <Info className="mx-auto size-5 text-stone-400 mb-1" />
                  <p>Weather information is currently unavailable. AI diagnostics will proceed normally.</p>
                </div>
              )}
            </section>

            {/* SECTION 7: RECENT DIAGNOSIS HISTORY */}
            <section
              aria-labelledby="history-heading"
              className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs"
            >
              <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-800">
                    <History className="size-5" />
                  </span>
                  <div>
                    <h3 id="history-heading" className="font-mono text-lg font-bold text-stone-900">
                      Recent Crop Scans
                    </h3>
                    <p className="text-xs text-stone-500">Your past plant health checkups and results</p>
                  </div>
                </div>
              </div>

              {historyLoading ? (
                <div className="py-8 text-center text-sm text-stone-500 animate-pulse">
                  Loading previous crop health records...
                </div>
              ) : history.length > 0 ? (
                <div className="mt-4 divide-y divide-stone-100">
                  {history.slice(0, 5).map((item) => {
                    const isHealthy = /healthy|no disease/i.test(item.prediction)
                    const formatted = formatConditionName(item.prediction)
                    const percent = Math.round(item.confidence * 1000) / 10

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-sm ${
                              isHealthy
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isHealthy ? '🌿' : '⚠️'}
                          </span>
                          <div>
                            <h4 className="font-semibold text-stone-900 text-sm sm:text-base">
                              {formatted}
                            </h4>
                            <p className="text-xs text-stone-500">
                              {formatFarmerDate(item.created_at)} · Confidence: {percent}%
                            </p>
                          </div>
                        </div>

                        <span
                          className={`self-start sm:self-auto rounded-full px-3 py-1 text-xs font-semibold ${
                            isHealthy
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isHealthy ? 'Healthy' : 'Diagnosed'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 mb-2">
                    <Sprout className="size-6" />
                  </span>
                  <h4 className="font-semibold text-stone-800 text-sm">No scans yet</h4>
                  <p className="mt-1 max-w-md mx-auto text-xs text-stone-500 leading-relaxed">
                    Take a photo of your crop to get started! Your diagnosis history will appear here.
                  </p>
                </div>
              )}
            </section>
          </>
        ) : (
          /* SECTIONS 4, 5, 6: DIAGNOSIS REPORT & RECOMMENDATIONS */
          <FarmerDiagnosisReport
            prediction={prediction}
            preview={preview}
            onReset={clear}
          />
        )}
      </div>

      {/* CAMERA CAPTURE MODAL */}
      <CameraCapture
        open={cameraOpen}
        onCapture={capture}
        onClose={() => setCameraOpen(false)}
      />
    </main>
  )
}

/* ============================================================
 * FARMER-FRIENDLY DIAGNOSIS REPORT COMPONENT (SECTIONS 4, 5, 6)
 * ============================================================ */
function FarmerDiagnosisReport({
  prediction,
  preview,
  onReset,
}: {
  prediction: Prediction
  preview: string
  onReset: () => void
}) {
  // If leaf image was not suitable for analysis
  if (!prediction.input_valid) {
    return (
      <article className="mx-auto max-w-3xl rounded-3xl border-2 border-amber-300 bg-white p-6 shadow-sm sm:p-10">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-bold text-amber-900">
            <AlertTriangle className="size-4 text-amber-700" />
            Image Not Recognized
          </span>

          <h2 className="mt-4 font-mono text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Please Upload a Clear Leaf Photo
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
            {prediction.message || 'We could not detect a valid crop leaf in this picture. Please capture a clear image of the leaf surface.'}
          </p>

          {preview && (
            <div className="mt-6 flex justify-center">
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 p-2 shadow-xs">
                <img
                  src={preview}
                  alt="Uploaded photo"
                  className="max-h-64 max-w-full rounded-xl object-contain"
                />
              </div>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/80 p-5 text-left max-w-md w-full">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
              Tips for Better Results
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-stone-600">
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold">•</span>
                <span>Focus on a single affected plant leaf</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold">•</span>
                <span>Take the photo in bright daylight</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold">•</span>
                <span>Avoid blurry, distant, or shadowed photos</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onReset}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-7 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 transition cursor-pointer"
            >
              <RotateCcw className="size-4" />
              <span>Try Another Photo</span>
            </button>
          </div>
        </div>
      </article>
    )
  }

  const percent = Math.round(prediction.confidence * 1000) / 10
  const isHealthy = /healthy|no disease/i.test(prediction.class_name || '')
  const formattedCondition = formatConditionName(prediction.class_name)
  const guidance = prediction.ai_guidance

  // Human confidence explanation for farmers
  const confidenceExplanation =
    percent >= 80
      ? 'High confidence: The AI clearly identified distinctive leaf patterns matching this condition.'
      : percent >= 60
        ? 'Moderate confidence: Characteristic symptoms were detected. Monitor closely to confirm.'
        : 'Low confidence: The image may be blurry or symptoms are ambiguous. Verify in the field.'

  const isLowConfidence = prediction.low_confidence || percent < 60

  // Severity color indicator
  const severityVal = (guidance?.severity || 'Medium').toLowerCase()
  const severityBadge = isHealthy
    ? { text: 'Low (Healthy)', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' }
    : severityVal.includes('high')
      ? { text: 'High Severity', bg: 'bg-red-100 text-red-900 border-red-300' }
      : severityVal.includes('low')
        ? { text: 'Low Severity', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' }
        : { text: 'Medium Severity', bg: 'bg-amber-100 text-amber-900 border-amber-300' }

  // Lists from guidance or fallback
  const symptomsList = parseBulletList(
    guidance?.symptoms && guidance.symptoms.length > 0 ? guidance.symptoms : prediction.symptoms
  )
  const causesList = parseBulletList(guidance?.possible_causes)
  const immediateActionsList = parseBulletList(
    guidance?.immediate_actions && guidance.immediate_actions.length > 0
      ? guidance.immediate_actions
      : guidance?.recommended_actions && guidance.recommended_actions.length > 0
        ? guidance.recommended_actions
        : prediction.treatment
  )
  const treatmentList = parseBulletList(
    guidance?.treatment_recommendations && guidance.treatment_recommendations.length > 0
      ? guidance.treatment_recommendations
      : prediction.treatment
  )
  const preventionList = parseBulletList(
    guidance?.prevention && guidance.prevention.length > 0 ? guidance.prevention : prediction.prevention
  )
  const diseaseOverview =
    guidance?.disease_overview || guidance?.summary || prediction.description || 'Diagnosis completed.'
  const severityExplanation =
    guidance?.severity_explanation || (isHealthy ? 'Crop is healthy with no visible signs of infection.' : 'Manage early to protect crop yield.')
  const farmerAdvisory =
    guidance?.farmer_advisory || guidance?.when_to_seek_expert_help || 'For critical crop decisions, visit your nearest Krishi Vigyan Kendra (KVK) or agricultural extension officer.'

  return (
    <article className="mx-auto max-w-4xl rounded-3xl border border-stone-200 bg-white p-6 sm:p-10 shadow-sm space-y-8">
      {/* SECTION 4: LATEST DISEASE DIAGNOSIS HEADER */}
      <div className="text-center border-b border-stone-100 pb-6">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-xs font-bold border ${
            isHealthy
              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
              : 'bg-red-100 text-red-900 border-red-200'
          }`}
        >
          <CheckCircle2 className="size-3.5" />
          {isHealthy ? 'Healthy Crop' : 'Disease Detected'}
        </span>

        <h2 className="mt-3 font-mono text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
          {formattedCondition}
        </h2>

        <p className="mt-1 text-xs sm:text-sm text-stone-500">
          Official AI Plant Health Diagnosis Report
        </p>
      </div>

      {/* LEAF PHOTO + KEY METRICS & AUDIO PLAYER */}
      <div className="grid gap-6 sm:grid-cols-2 items-center">
        {/* Leaf image preview */}
        {preview && (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 p-2 shadow-2xs">
            <img
              src={preview}
              alt="Analyzed leaf specimen"
              className="max-h-64 sm:max-h-72 w-full rounded-xl object-contain mx-auto"
            />
          </div>
        )}

        {/* Diagnostic Metrics & Audio */}
        <div className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50/80 p-5">
          {/* AI Confidence */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                AI Confidence
              </span>
              <span className="font-mono text-xl font-bold text-emerald-800">
                {percent}%
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-600 leading-relaxed">
              {confidenceExplanation}
            </p>
            {isLowConfidence && (
              <p className="mt-1.5 text-xs font-medium text-amber-800 bg-amber-50 rounded-lg p-2 border border-amber-200">
                ⚠️ Caution: Low confidence. Inspect other leaves in the field or verify with an agricultural expert.
              </p>
            )}
          </div>

          {/* Severity Level */}
          <div className="border-t border-stone-200 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Disease Severity
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${severityBadge.bg}`}>
                {severityBadge.text}
              </span>
            </div>
            {severityExplanation && (
              <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                {severityExplanation}
              </p>
            )}
          </div>

          {/* Audio Advice Playback (AnalysisSpeech) */}
          <div className="border-t border-stone-200 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">
              Audio Advisory (Listen in English)
            </p>
            <AnalysisSpeech
              prediction={prediction}
              aiGuidance={guidance}
              playLabel="Listen to Advice"
              speakingLabel="Playing Advisory..."
              pauseLabel="Pause"
              resumeLabel="Resume"
              stopLabel="Stop"
            />
          </div>
        </div>
      </div>

      {/* DISEASE OVERVIEW */}
      <div className="rounded-2xl border border-emerald-600/20 bg-emerald-50/40 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="size-4 text-emerald-700" />
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-900">
            Disease Overview & Spread
          </h4>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-stone-800">
          {diseaseOverview}
        </p>
        {guidance?.weather_insight && (
          <div className="mt-3 rounded-xl border border-emerald-700/15 bg-white/80 p-3 text-xs sm:text-sm text-emerald-950">
            <span className="font-bold">Weather Impact: </span>
            <span>{guidance.weather_insight}</span>
          </div>
        )}
      </div>

      {/* SYMPTOMS & POSSIBLE CAUSES */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Symptoms */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
            <Activity className="size-4 text-emerald-700" />
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-700">
              Observable Symptoms
            </h4>
          </div>
          {symptomsList.length > 0 ? (
            <ul className="space-y-2">
              {symptomsList.map((symptom, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-stone-800">
                  <span className="size-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                  <span>{symptom}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-stone-500">
              {isHealthy ? 'No visible disease symptoms observed on this leaf.' : 'No detailed symptoms listed.'}
            </p>
          )}
        </div>

        {/* Possible Causes */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
            <ShieldAlert className="size-4 text-amber-700" />
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-700">
              Possible Causes & Triggers
            </h4>
          </div>
          {causesList.length > 0 ? (
            <ul className="space-y-2">
              {causesList.map((cause, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-stone-800">
                  <span className="size-1.5 rounded-full bg-amber-600 shrink-0 mt-1.5" />
                  <span>{cause}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-stone-500">
              {isHealthy
                ? 'Proper soil nutrition, balanced moisture, and good farming practices maintain this healthy state.'
                : 'Fungal or bacterial pathogens favored by warm temperature and surface leaf moisture.'}
            </p>
          )}
        </div>
      </div>

      {/* SECTION 5: AI-POWERED TREATMENT RECOMMENDATIONS */}
      <div className="space-y-4">
        <h3 className="font-mono text-lg font-bold text-stone-900">
          Treatment & Action Plan
        </h3>

        {/* Immediate Actions */}
        {immediateActionsList.length > 0 && (
          <div className="rounded-2xl border-2 border-amber-500/25 bg-amber-50/30 p-5 sm:p-6 space-y-3 shadow-2xs">
            <div className="border-b border-amber-200/60 pb-2.5">
              <h4 className="font-mono text-sm sm:text-base font-bold text-amber-950">
                Immediate Actions for Today
              </h4>
              <p className="text-xs text-amber-800/80">
                Steps the farmer should take immediately to prevent further damage
              </p>
            </div>
            <ol className="space-y-2.5">
              {immediateActionsList.map((action, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-white p-3.5 text-xs sm:text-sm text-stone-800"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="flex-1 leading-relaxed">{action}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Treatment Recommendations (Organic & Chemical Guidelines) */}
        {treatmentList.length > 0 && (
          <div className="rounded-2xl border border-emerald-600/20 bg-emerald-50/20 p-5 sm:p-6 space-y-3 shadow-2xs">
            <div className="border-b border-emerald-900/10 pb-2.5">
              <h4 className="font-mono text-sm sm:text-base font-bold text-emerald-950">
                Treatment & Remediation Options
              </h4>
              <p className="text-xs text-stone-500">
                Safe organic remedies and approved agricultural controls
              </p>
            </div>
            <ul className="space-y-2.5">
              {treatmentList.map((treatment, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 rounded-xl border border-emerald-700/10 bg-white p-3 text-xs sm:text-sm text-stone-800"
                >
                  <span className="text-emerald-700 font-bold mt-0.5">🌿</span>
                  <span className="leading-relaxed">{treatment}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Chemical Safety Box */}
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-xs text-rose-950">
          <AlertTriangle className="size-5 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <span className="font-bold">Chemical Safety Warning: </span>
            <span>
              Never invent or exceed chemical dosages. Always read the product label, use approved personal protective equipment (mask and gloves), and follow local agricultural authority directions.
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 6: PREVENTION & LONG-TERM MANAGEMENT */}
      <div className="space-y-4">
        <h3 className="font-mono text-lg font-bold text-stone-900">
          Long-Term Crop Health Management
        </h3>

        {/* Prevention */}
        {preventionList.length > 0 && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
              <ShieldCheck className="size-4 text-emerald-700" />
              <div>
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-800">
                  Preventive Farming Practices
                </h4>
                <p className="text-xs text-stone-500">Best practices to stop infection from returning</p>
              </div>
            </div>
            <ul className="space-y-2.5">
              {preventionList.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-stone-100 bg-stone-50/60 p-3 text-xs sm:text-sm text-stone-800"
                >
                  <span className="text-emerald-700 font-bold mt-0.5">🛡️</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Farmer Advisory & Extension Officer Help */}
        <div className="rounded-2xl border border-emerald-800/15 bg-emerald-50/60 p-5">
          <div className="flex items-start gap-3">
            <Info className="size-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                Farmer Advisory & Expert Support
              </h4>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-stone-700">
                {farmerAdvisory}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION: SCAN ANOTHER PLANT LEAF */}
      <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-8 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 transition cursor-pointer"
        >
          <Upload className="size-4" />
          <span>Check Another Plant Leaf</span>
        </button>
      </div>
    </article>
  )
}
