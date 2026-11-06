'use client'

import { ChangeEvent, DragEvent, useEffect, useId, useRef, useState } from 'react'
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
  Globe,
  HeartPulse,
  History,
  Info,
  Leaf,
  LogOut,
  RefreshCw,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  Upload,
  UserRound,
  Volume2,
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
import {
  formatFarmerDate,
  getGreeting,
  Language,
  LANGUAGE_OPTIONS,
  translations,
} from '@/lib/i18n'

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

  // Language state (English, Kannada, Hindi)
  const [lang, setLang] = useState<Language>('en')
  const t = translations[lang]

  // Farmer state
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Weather state
  const [weather, setWeather] = useState<Weather | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false)

  // History state
  const [history, setHistory] = useState<PredictionHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Load language preference from localStorage
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('planthealth_lang') as Language
      if (savedLang && (savedLang === 'en' || savedLang === 'kn' || savedLang === 'hi')) {
        setLang(savedLang)
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  function changeLanguage(newLang: Language) {
    setLang(newLang)
    try {
      localStorage.setItem('planthealth_lang', newLang)
    } catch {
      // Ignore localStorage errors
    }
  }

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
      {/* 1. TOP BRANDING & GREETING BAR */}
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
                  {t.appName}
                </span>
                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  V2
                </span>
              </div>
              <p className="hidden text-xs text-stone-500 sm:block">{t.appTagline}</p>
            </div>
          </div>

          {/* Right Header: Weather + Language Switcher + Farmer Profile + Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Weather Pill */}
            {weather && (
              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-emerald-800/10 bg-emerald-50/70 px-3 py-1.5 text-xs text-emerald-950">
                <Sun className="size-4 text-amber-600" />
                <span className="font-semibold">{weather.temperature}°C</span>
                <span className="text-emerald-800/70 truncate max-w-24">{weather.location}</span>
              </div>
            )}

            {/* Language Switcher */}
            <div className="flex items-center rounded-xl border border-emerald-800/15 bg-stone-50 p-0.5 shadow-2xs">
              <span className="pl-2 pr-1 text-stone-400">
                <Globe className="size-3.5" />
              </span>
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => changeLanguage(opt.code)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    lang === opt.code
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-emerald-800 hover:bg-emerald-50/80'
                  }`}
                  title={opt.label}
                >
                  {opt.nativeName}
                </button>
              ))}
            </div>

            {/* Farmer Profile info */}
            <div className="hidden md:flex items-center gap-2 pl-1 border-l border-stone-200">
              <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <UserRound className="size-4" />
              </span>
              <div className="text-left text-xs leading-tight">
                <p className="font-semibold text-stone-800 max-w-28 truncate">{name || 'Farmer'}</p>
                <p className="text-[10px] text-stone-500">{t.farmerWorkspace}</p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logoutUser}
              aria-label={t.logout}
              title={t.logout}
              className="flex size-9 items-center justify-center rounded-xl text-stone-500 transition hover:bg-stone-100 hover:text-red-700 cursor-pointer"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. WELCOME BANNER FOR FARMERS */}
      <section className="border-b border-emerald-900/5 bg-gradient-to-b from-emerald-50/60 to-transparent py-6 sm:py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-emerald-800">
                🌱 {getGreeting(lang)}{name ? `, ${name}` : ''}!
              </p>
              <h1 className="mt-1 font-mono text-2xl sm:text-3xl font-bold tracking-tight text-emerald-950">
                {t.welcomeBack}
              </h1>
              <p className="mt-1 text-sm text-stone-600 sm:text-base leading-relaxed">
                {t.welcomeSubtitle}
              </p>
            </div>

            {/* Weather Quick Status on Mobile */}
            {weather && (
              <div className="flex sm:hidden items-center gap-3 rounded-2xl border border-emerald-800/15 bg-white p-3 shadow-2xs">
                <Sun className="size-6 text-amber-500 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-stone-800">{weather.temperature}°C · {weather.condition}</span>
                  <p className="text-stone-500">{weather.location}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 space-y-8">
        {!prediction ? (
          <>
            {/* HERO CARD: CROP HEALTH CHECK (PRIMARY FEATURE) */}
            <section
              aria-labelledby="check-crop-health-title"
              className="overflow-hidden rounded-3xl border-2 border-emerald-600/20 bg-white p-6 sm:p-8 shadow-sm transition hover:border-emerald-600/30"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                    <HeartPulse className="size-6" />
                  </span>
                  <div>
                    <h2
                      id="check-crop-health-title"
                      className="font-mono text-xl sm:text-2xl font-bold text-emerald-950 tracking-tight"
                    >
                      {t.checkHealthTitle}
                    </h2>
                    <p className="mt-1 text-sm sm:text-base text-stone-600 leading-relaxed max-w-2xl">
                      {t.checkHealthSubtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Scan using Camera or Upload from Gallery */}
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
                  <span>{t.scanCamera}</span>
                </button>

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex min-h-13 items-center justify-center gap-2.5 rounded-2xl border-2 border-emerald-800/25 bg-white px-6 text-base font-semibold text-emerald-900 transition hover:bg-emerald-50 active:scale-[0.99] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                >
                  <Upload className="size-5 text-emerald-700" />
                  <span>{t.uploadImage}</span>
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
                        {t.retake}
                      </button>
                      <button
                        type="button"
                        onClick={clear}
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 hover:text-red-700 cursor-pointer"
                      >
                        <X className="size-3.5" />
                        {t.removePhoto}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                      <Leaf className="size-7" />
                    </span>
                    <h3 className="font-mono text-base sm:text-lg font-bold text-stone-900">
                      {t.checkHealthTitle}
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-stone-500">
                      {t.orDragDrop}
                    </p>
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="mt-4 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-2xs hover:bg-emerald-800 transition cursor-pointer"
                    >
                      {t.browseImage}
                    </button>
                    <p className="mt-3 text-[11px] text-stone-500">
                      {t.supportedFormats}
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

              {/* Farmer Photo Tips */}
              <div className="mt-5 rounded-2xl border border-emerald-800/10 bg-emerald-50/50 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
                  <Sparkles className="size-4 text-emerald-700" />
                  {t.photoTipsTitle}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3 text-xs text-stone-700">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span>{t.photoTip1}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span>{t.photoTip2}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span>{t.photoTip3}</span>
                  </div>
                </div>
              </div>

              {/* Big Analyze Button */}
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
                      <span>{t.analyzingButton}</span>
                    </>
                  ) : (
                    <>
                      <ScanLine className="size-5" />
                      <span>{t.analyzeButton}</span>
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

            {/* LIVE WEATHER & FIELD ADVISORY SECTION */}
            <section
              aria-labelledby="weather-advisory-title"
              className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs"
            >
              <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
                    <Sun className="size-5" />
                  </span>
                  <div>
                    <h3
                      id="weather-advisory-title"
                      className="font-mono text-lg font-bold text-stone-900"
                    >
                      {t.weatherTitle}
                    </h3>
                    <p className="text-xs text-stone-500">
                      {weather ? `${weather.location}, ${weather.country}` : t.weatherContextNote}
                    </p>
                  </div>
                </div>
              </div>

              {weatherLoading ? (
                <div className="py-8 text-center text-sm text-stone-500 animate-pulse">
                  {t.weatherLoading}
                </div>
              ) : weather ? (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {/* Temperature */}
                  <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      {t.temp}
                    </span>
                    <p className="mt-1 font-mono text-2xl font-bold text-stone-900">
                      {weather.temperature}°C
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {t.feelsLike} {weather.feels_like}°C
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
                    <p className="text-xs text-stone-500 mt-0.5">Live condition</p>
                  </div>

                  {/* Humidity */}
                  <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      {t.humidity}
                    </span>
                    <p className="mt-1 font-mono text-2xl font-bold text-stone-900">
                      {weather.humidity}%
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">Air moisture</p>
                  </div>

                  {/* Wind / Rain */}
                  <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      {t.wind}
                    </span>
                    <p className="mt-1 font-mono text-xl font-bold text-stone-900">
                      {weather.condition.toLowerCase().includes('rain') ? 'Rain alert' : 'Favorable'}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">Field operations</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-stone-50 p-6 text-center text-sm text-stone-500">
                  <Info className="mx-auto size-5 text-stone-400 mb-1" />
                  <p>{t.weatherUnavailable}</p>
                </div>
              )}
            </section>

            {/* RECENT CROP CHECKS (DIAGNOSIS HISTORY) */}
            <section
              aria-labelledby="recent-history-title"
              className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs"
            >
              <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-800">
                    <History className="size-5" />
                  </span>
                  <div>
                    <h3
                      id="recent-history-title"
                      className="font-mono text-lg font-bold text-stone-900"
                    >
                      {t.historyTitle}
                    </h3>
                    <p className="text-xs text-stone-500">{t.historySubtitle}</p>
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
                              {formatFarmerDate(item.created_at, lang)} · AI confidence: {percent}%
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
                          {isHealthy ? t.statusHealthy : t.statusDiagnosed}
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
                  <h4 className="font-semibold text-stone-800 text-sm">{t.historyEmptyTitle}</h4>
                  <p className="mt-1 max-w-md mx-auto text-xs text-stone-500 leading-relaxed">
                    {t.historyEmptyDesc}
                  </p>
                </div>
              )}
            </section>
          </>
        ) : (
          /* DIAGNOSIS RESULT REPORT */
          <FarmerAnalysisReport
            prediction={prediction}
            preview={preview}
            onReset={clear}
            lang={lang}
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
 * FARMER-FRIENDLY DIAGNOSIS REPORT COMPONENT
 * ============================================================ */
function FarmerAnalysisReport({
  prediction,
  preview,
  onReset,
  lang,
}: {
  prediction: Prediction
  preview: string
  onReset: () => void
  lang: Language
}) {
  const t = translations[lang]

  // If leaf image was not suitable for analysis
  if (!prediction.input_valid) {
    return (
      <article className="mx-auto max-w-3xl rounded-3xl border-2 border-amber-300 bg-white p-6 shadow-sm sm:p-10">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-bold text-amber-900">
            <AlertTriangle className="size-4 text-amber-700" />
            {t.invalidImageTitle}
          </span>

          <h2 className="mt-4 font-mono text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            {t.invalidImageSubtitle}
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
            {prediction.message || 'Please upload a clear image of a plant leaf so the AI can inspect it.'}
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
              {t.photoTipsTitle}
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-stone-600">
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold">•</span>
                <span>{t.invalidTip1}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold">•</span>
                <span>{t.invalidTip2}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold">•</span>
                <span>{t.invalidTip3}</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onReset}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-7 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 transition cursor-pointer"
            >
              <RotateCcw className="size-4" />
              <span>{t.tryAgain}</span>
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
      ? t.confidenceHigh
      : percent >= 60
        ? t.confidenceModerate
        : t.confidenceLow

  const isLowConfidence = prediction.low_confidence || percent < 60

  // Lists
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
  const expertNote =
    guidance?.when_to_seek_expert_help || t.expertAdviceDefault

  return (
    <article className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 sm:p-10 shadow-sm space-y-6">
      {/* 1. REPORT HEADER */}
      <div className="text-center border-b border-stone-100 pb-5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-xs font-bold ${
            isHealthy
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-red-100 text-red-900 border border-red-200'
          }`}
        >
          <CheckCircle2 className="size-3.5" />
          {isHealthy ? t.healthyCrop : t.diseaseDetected}
        </span>

        <h2 className="mt-3 font-mono text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
          {formattedCondition}
        </h2>

        <p className="mt-1 text-xs sm:text-sm text-stone-500">
          {t.diagnosisReport}
        </p>
      </div>

      {/* 2. LEAF PHOTO + KEY METRICS */}
      <div className="grid gap-6 sm:grid-cols-2 items-center">
        {/* Leaf image */}
        {preview && (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 p-2 shadow-2xs">
            <img
              src={preview}
              alt="Analyzed leaf specimen"
              className="max-h-60 sm:max-h-64 w-full rounded-xl object-contain mx-auto"
            />
          </div>
        )}

        {/* Diagnosis overview card */}
        <div className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50/80 p-5">
          {/* AI Confidence */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                {t.confidenceLabel}
              </span>
              <span className="font-mono text-xl font-bold text-emerald-800">
                {percent}%
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-600 leading-relaxed">
              {confidenceExplanation}
            </p>
          </div>

          {/* Severity if applicable */}
          {guidance?.severity && (
            <div className="border-t border-stone-200 pt-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                {t.severityLabel}
              </span>
              <p className="mt-0.5 text-sm font-semibold text-stone-800">
                {guidance.severity}
              </p>
            </div>
          )}

          {/* Audio advice trigger */}
          <div className="border-t border-stone-200 pt-3">
            <AnalysisSpeech
              prediction={prediction}
              aiGuidance={guidance}
              playLabel={t.listenAdvice}
              speakingLabel={t.speakingAdvice}
              pauseLabel={t.pauseSpeech}
              resumeLabel={t.resumeSpeech}
              stopLabel={t.stopSpeech}
            />
          </div>
        </div>
      </div>

      {/* 3. AGRICULTURAL INSIGHT */}
      {(guidance?.summary || prediction.description) && (
        <div className="rounded-2xl border border-emerald-600/20 bg-emerald-50/40 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-4 text-emerald-700" />
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-900">
              {t.aiInsightTitle}
            </h4>
          </div>
          <p className="text-sm sm:text-base leading-relaxed text-stone-800">
            {guidance?.summary || prediction.description}
          </p>
        </div>
      )}

      {/* 4. SYMPTOMS */}
      {symptomsList.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
            <Activity className="size-4 text-emerald-700" />
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-700">
              {t.symptomsTitle}
            </h4>
          </div>
          <ul className="space-y-2">
            {symptomsList.map((symptom, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-stone-800">
                <span className="size-1.5 rounded-full bg-emerald-600 shrink-0 mt-2" />
                <span>{symptom}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. STRUCTURED TREATMENT: 1. IMMEDIATE ACTIONS */}
      {actionsList.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-500/25 bg-amber-50/30 p-5 sm:p-6 space-y-3 shadow-2xs">
          <div className="border-b border-amber-200/60 pb-2.5">
            <h4 className="font-mono text-sm sm:text-base font-bold text-amber-950">
              {t.immediateActionsTitle}
            </h4>
            <p className="text-xs text-amber-800/80">{t.immediateActionsSubtitle}</p>
          </div>
          <ol className="space-y-2.5">
            {actionsList.map((action, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-white p-3.5 text-sm text-stone-800"
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

      {/* 6. STRUCTURED TREATMENT: 2. TREATMENT RECOMMENDATIONS */}
      {prediction.treatment && (
        <div className="rounded-2xl border border-emerald-600/20 bg-emerald-50/20 p-5 sm:p-6 space-y-3 shadow-2xs">
          <div className="border-b border-emerald-900/10 pb-2.5">
            <h4 className="font-mono text-sm sm:text-base font-bold text-emerald-950">
              {t.treatmentTitle}
            </h4>
            <p className="text-xs text-stone-500">{t.treatmentSubtitle}</p>
          </div>
          <p className="text-sm leading-relaxed text-stone-800 whitespace-pre-line">
            {prediction.treatment}
          </p>
        </div>
      )}

      {/* 7. STRUCTURED TREATMENT: 3. PREVENTION METHODS */}
      {preventionList.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
            <ShieldCheck className="size-4 text-emerald-700" />
            <div>
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-800">
                {t.preventionTitle}
              </h4>
              <p className="text-xs text-stone-500">{t.preventionSubtitle}</p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {preventionList.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-stone-100 bg-stone-50/60 p-3 text-sm text-stone-800"
              >
                <span className="text-emerald-700 font-bold mt-0.5">🛡️</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 8. EXPERT ADVISORY */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Info className="size-5 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              {t.expertAdviceTitle}
            </h4>
            <p className="mt-1 text-xs sm:text-sm leading-relaxed text-stone-600">
              {expertNote}
            </p>
          </div>
        </div>
      </div>

      {/* 9. BOTTOM ACTION: SCAN ANOTHER PLANT LEAF */}
      <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-8 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 transition cursor-pointer"
        >
          <Upload className="size-4" />
          <span>{t.checkAnother}</span>
        </button>
      </div>
    </article>
  )
}
