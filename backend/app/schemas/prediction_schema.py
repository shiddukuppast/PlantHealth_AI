from datetime import datetime

from pydantic import BaseModel


class PredictionDetails(BaseModel):
    type: str
    class_name: str
    confidence: float
    low_confidence: bool


class WeatherContext(BaseModel):
    available: bool = False
    temperature: float | None = None
    feels_like: float | None = None
    humidity: int | None = None
    condition: str | None = None
    rainfall: float | None = None
    wind_speed: float | None = None
    cloud_coverage: int | None = None
    location: str | None = None
    country: str | None = None
    icon: str | None = None


class PredictionGuidance(BaseModel):
    summary: str
    symptoms: list[str]
    recommended_actions: list[str]
    prevention: list[str]
    severity: str
    when_to_seek_expert_help: str
    weather_insight: str | None = None


class PredictionResponse(BaseModel):
    success: bool = True
    prediction: PredictionDetails | None = None
    ai_guidance: PredictionGuidance | None = None
    weather_context: WeatherContext | None = None
    weather_insight: str | None = None
    llm_available: bool = False
    input_valid: bool = True
    rejection_reason: str | None = None
    message: str | None = None
    category: str = ""
    prediction_label: str = ""
    confidence: float = 0.0
    description: str = ""
    symptoms: str = ""
    treatment: str = ""
    prevention: str = ""
    recommendations: str = ""


class PredictionHistoryItem(BaseModel):
    id: str
    prediction: str
    confidence: float
    filename: str
    created_at: datetime