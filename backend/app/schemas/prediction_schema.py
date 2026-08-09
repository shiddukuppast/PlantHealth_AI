from datetime import datetime

from pydantic import BaseModel


class PredictionResponse(BaseModel):
    prediction: str
    confidence: float
    description: str
    symptoms: str
    treatment: str
    prevention: str
    recommendations: str


class PredictionHistoryItem(BaseModel):
    id: str
    prediction: str
    confidence: float
    filename: str
    created_at: datetime

