from datetime import datetime, timezone

import numpy as np
from bson import ObjectId
from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.database import get_database
from app.schemas.user_schema import UserPublic
from app.services import model_service
from app.utils.image_utils import preprocess_image, read_and_validate_upload

FALLBACK_INFO = "Detailed information is not available for this class."

DISEASE_INFO: dict[str, dict[str, str]] = {
    "Pepper__bell___Bacterial_spot": {
        "description": "Bacterial spot causes dark, water-soaked lesions on pepper leaves and fruits.",
        "symptoms": "Small dark spots with yellow halos that may merge over time.",
        "treatment": "Remove heavily infected leaves and follow local agricultural guidance for approved control methods.",
        "prevention": "Use disease-free seed, avoid overhead irrigation, and improve air circulation.",
        "recommendations": "Sanitize tools and monitor nearby plants frequently for early signs.",
    },
    "Pepper__bell___healthy": {
        "description": "No visible disease pattern detected in this pepper leaf.",
        "symptoms": "Leaf tissue appears normal for the crop.",
        "treatment": "No treatment is required based on this image.",
        "prevention": "Continue balanced watering and routine field hygiene.",
        "recommendations": "Keep scouting regularly and maintain good nutrition and spacing.",
    },
    "Potato___Early_blight": {
        "description": "Early blight is a fungal disease that affects older potato leaves first.",
        "symptoms": "Brown spots with concentric rings and yellowing around lesions.",
        "treatment": "Remove infected foliage and consult local extension recommendations for region-appropriate fungicide use.",
        "prevention": "Rotate crops and avoid wet foliage for extended periods.",
        "recommendations": "Improve spacing and avoid working in fields when leaves are wet.",
    },
    "Potato___Late_blight": {
        "description": "Late blight is a serious disease that can spread rapidly in cool, humid conditions.",
        "symptoms": "Water-soaked lesions that turn dark, often with pale green borders.",
        "treatment": "Isolate affected plants and seek immediate local agronomy guidance.",
        "prevention": "Use resistant varieties where available and reduce leaf wetness duration.",
        "recommendations": "Inspect nearby plants daily and remove severely affected material safely.",
    },
    "Potato___healthy": {
        "description": "No disease signals were detected for this potato leaf sample.",
        "symptoms": "Leaf color and texture appear healthy.",
        "treatment": "No treatment is currently indicated.",
        "prevention": "Maintain consistent field sanitation and irrigation management.",
        "recommendations": "Continue periodic monitoring for early disease detection.",
    },
    "Tomato_healthy": {
        "description": "No visible disease pattern detected in this tomato leaf.",
        "symptoms": "Leaf appearance is consistent with healthy growth.",
        "treatment": "No treatment is required based on this image.",
        "prevention": "Maintain good airflow, balanced nutrition, and regular scouting.",
        "recommendations": "Keep preventive care practices consistent through the season.",
    },
}


def _info_for_class(class_name: str) -> dict[str, str]:
    data = DISEASE_INFO.get(class_name)
    if data:
        return data
    return {
        "description": FALLBACK_INFO,
        "symptoms": FALLBACK_INFO,
        "treatment": FALLBACK_INFO,
        "prevention": FALLBACK_INFO,
        "recommendations": FALLBACK_INFO,
    }


async def predict_disease(file: UploadFile, current_user: UserPublic) -> dict:
    settings = get_settings()
    image = await read_and_validate_upload(file, settings.max_upload_size_bytes)
    image_batch = preprocess_image(image, model_service.get_input_size())

    try:
        probabilities = model_service.predict(image_batch)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Model prediction failed.") from exc

    if probabilities.size == 0:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Model returned empty predictions.")

    predicted_index = int(np.argmax(probabilities))
    confidence = float(probabilities[predicted_index])
    class_name = model_service.get_class_name(predicted_index)
    info = _info_for_class(class_name)

    db = get_database()
    await db["predictions"].insert_one(
        {
            "user_id": ObjectId(current_user.id),
            "prediction": class_name,
            "confidence": confidence,
            "filename": file.filename or "uploaded-image",
            "created_at": datetime.now(timezone.utc),
        }
    )

    return {"prediction": class_name, "confidence": confidence, **info}


async def get_prediction_history(current_user: UserPublic, limit: int = 100) -> list[dict]:
    db = get_database()
    cursor = db["predictions"].find({"user_id": ObjectId(current_user.id)}).sort("created_at", -1).limit(limit)
    results: list[dict] = []
    async for item in cursor:
        results.append(
            {
                "id": str(item["_id"]),
                "prediction": item["prediction"],
                "confidence": float(item["confidence"]),
                "filename": item["filename"],
                "created_at": item["created_at"],
            }
        )
    return results

