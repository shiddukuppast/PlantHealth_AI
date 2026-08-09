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

export type Prediction = {
  disease: string
  confidence: number
  description?: string
  symptoms?: string
  treatment?: string
  prevention?: string
  recommendations?: string
}

export type PredictionHistoryItem = {
  id: string
  prediction: string
  confidence: number
  filename: string
  created_at: string
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
    prediction?: string
    disease?: string
    class?: string
    label?: string
    confidence?: number
    score?: number
    probability?: number
    description?: string
    symptoms?: string
    treatment?: string
    prevention?: string
    recommendations?: string
  }>('/ml/predict', {
    method: 'POST',
    body: formData,
  })

  const disease = data.prediction ?? data.disease ?? data.class ?? data.label
  const rawConfidence = data.confidence ?? data.score ?? data.probability
  if (typeof disease !== 'string' || typeof rawConfidence !== 'number') {
    throw new ApiError('Invalid prediction response.', 500)
  }

  return {
    disease: disease.replaceAll('___', ' · ').replaceAll('_', ' '),
    confidence: rawConfidence > 1 ? rawConfidence / 100 : rawConfidence,
    description: data.description,
    symptoms: data.symptoms,
    treatment: data.treatment,
    prevention: data.prevention,
    recommendations: data.recommendations,
  }
}

export async function getPredictionHistory(): Promise<PredictionHistoryItem[]> {
  const response = await request<{ success: boolean; data: PredictionHistoryItem[] }>('/ml/history')
  return response.data
}

