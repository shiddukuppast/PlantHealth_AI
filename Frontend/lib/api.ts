export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
export const PREDICT_ENDPOINT = '/ml/predict'

export type Prediction = {
  disease: string
  confidence: number
  description?: string
  symptoms?: string
  treatment?: string
  prevention?: string
  recommendations?: string
}

export async function predictDisease(file: File): Promise<Prediction> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${API_BASE_URL}${PREDICT_ENDPOINT}`, { method: 'POST', body: formData })
  if (!response.ok) throw new Error('Prediction request failed')
  const data = await response.json()
  const disease = data.prediction ?? data.disease ?? data.class ?? data.label
  const rawConfidence = data.confidence ?? data.score ?? data.probability
  if (typeof disease !== 'string' || typeof rawConfidence !== 'number') throw new Error('Invalid prediction response')
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
