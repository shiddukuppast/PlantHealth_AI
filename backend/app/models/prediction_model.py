from datetime import datetime
from typing import NotRequired, TypedDict

from bson import ObjectId


class PredictionDocument(TypedDict):
    _id: NotRequired[ObjectId]
    user_id: ObjectId
    prediction: str
    confidence: float
    filename: str
    created_at: datetime

