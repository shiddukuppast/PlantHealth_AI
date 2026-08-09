from fastapi import APIRouter, UploadFile

from app.schemas.prediction_schema import PredictionResponse
from app.schemas.user_schema import UserPublic
from app.services.auth_service import CurrentUser
from app.services.prediction_service import get_prediction_history, predict_disease

router = APIRouter(prefix="/ml", tags=["ml"])


@router.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile, current_user: UserPublic = CurrentUser) -> dict:
    return await predict_disease(file=file, current_user=current_user)


@router.get("/history")
async def history(current_user: UserPublic = CurrentUser) -> dict:
    data = await get_prediction_history(current_user)
    return {"success": True, "data": data}

