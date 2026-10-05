export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export type AuthUser = {
  id: string
  name: string
  email: string
}

export type AuthResponse = {
  message: string
  user: AuthUser
  access_token: string
  token_type: string
}

export type WeatherContext = {
  available: boolean
  temperature?: number | null
  feels_like?: number | null
  condition?: string | null
  humidity?: number | null
  rainfall?: number | null
  wind_speed?: number | null
  cloud_coverage?: number | null
  location?: string | null
  country?: string | null
  icon?: string | null
}

export type Prediction = {
  type: 'Disease' | 'Pest' | string
  class_name: string
  confidence: number
  low_confidence: boolean
  input_valid: boolean
  rejection_reason: string | null
  message: string | null
  ai_guidance: {
    summary: string
    symptoms: string[]
    recommended_actions: string[]
    prevention: string[]
    severity: string
    when_to_seek_expert_help: string
    weather_insight?: string | null
  } | null
  weather_context?: WeatherContext | null
  weather_insight?: string | null
  llm_available: boolean
  description: string
  symptoms: string
  treatment: string
  prevention: string
  recommendations: string
}

export type PredictionHistoryItem = {
  id: string
  prediction: string
  confidence: number
  filename: string
  created_at: string
}

export type Weather = {
  location: string
  country: string
  temperature: number
  feels_like: number
  condition: string
  humidity: number
  icon: string
}

type ApiErrorShape = {
  success?: boolean
  message?: string
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    let message = 'Request failed.'
    try {
      const data = (await response.json()) as ApiErrorShape
      if (typeof data.message === 'string' && data.message.trim()) {
        message = data.message
      }
    } catch {
      message = response.statusText || message
    }
    throw new ApiError(message, response.status)
  }

  return (await response.json()) as T
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
}

export async function signup(name: string, email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
}

export async function getCurrentUser(): Promise<AuthUser> {
  return request<AuthUser>('/auth/me')
}

export async function logout(): Promise<void> {
  await request<{ success: boolean; message: string }>('/auth/logout', { method: 'POST' })
}

export async function predictDisease(file: File): Promise<Prediction> {
  const formData = new FormData()
  formData.append('file', file)
  const data = await request<{
    prediction?: {
      type?: string
      class_name?: string
      confidence?: number
      low_confidence?: boolean
    }
    input_valid?: boolean
    rejection_reason?: string | null
    message?: string | null
    ai_guidance?: Prediction['ai_guidance']
    weather_context?: WeatherContext | null
    weather_insight?: string | null
    llm_available?: boolean
    description?: string
    symptoms?: string
    treatment?: string
    prevention?: string
    recommendations?: string
  }>('/ml/predict', {
    method: 'POST',
    body: formData,
  })

  const result = data.prediction
  if (data.input_valid === false) {
    return {
      type: '',
      class_name: '',
      confidence: 0,
      low_confidence: false,
      input_valid: false,
      rejection_reason: data.rejection_reason ?? 'low_confidence',
      message: data.message ?? 'Please upload a clear image of a plant leaf suitable for analysis.',
      ai_guidance: null,
      weather_context: null,
      weather_insight: null,
      llm_available: false,
      description: '',
      symptoms: '',
      treatment: '',
      prevention: '',
      recommendations: '',
    }
  }

  if (
    !result ||
    typeof result.type !== 'string' ||
    typeof result.class_name !== 'string' ||
    typeof result.confidence !== 'number' ||
    typeof result.low_confidence !== 'boolean'
  ) {
    throw new ApiError('Invalid prediction response.', 500)
  }

  return {
    type: result.type,
    class_name: result.class_name.replaceAll('___', ' · ').replaceAll('_', ' '),
    confidence: result.confidence,
    low_confidence: result.low_confidence,
    input_valid: true,
    rejection_reason: data.rejection_reason ?? null,
    message: data.message ?? null,
    ai_guidance: data.ai_guidance ?? null,
    weather_context: data.weather_context ?? null,
    weather_insight: data.weather_insight ?? data.ai_guidance?.weather_insight ?? null,
    llm_available: data.llm_available === true,
    description: data.description ?? '',
    symptoms: data.symptoms ?? '',
    treatment: data.treatment ?? '',
    prevention: data.prevention ?? '',
    recommendations: data.recommendations ?? '',
  }
}

export async function getPredictionHistory(): Promise<PredictionHistoryItem[]> {
  const response = await request<{ success: boolean; data: PredictionHistoryItem[] }>('/ml/history')
  return response.data
}

export async function fetchWeather(): Promise<Weather | null> {
  const data = await request<Weather & { success: boolean }>('/weather')
  return data.success ? data : null
}
