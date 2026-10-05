from datetime import datetime, timezone
import logging
from typing import Any

import numpy as np
from bson import ObjectId
from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.database import get_database
from app.schemas.user_schema import UserPublic
from app.services import model_service
from app.services.llm_service import generate_guidance
from app.services.weather_service import get_current_weather
from app.utils.image_utils import (
    preprocess_image,
    read_and_validate_upload,
)

logger = logging.getLogger(__name__)


# ============================================================
# GENERAL
# ============================================================

FALLBACK_INFO = (
    "Detailed information is not available for this class."
)


# ============================================================
# DISEASE INFORMATION
# ============================================================

DISEASE_INFO: dict[str, dict[str, str]] = {

    "Pepper__bell___Bacterial_spot": {
        "description":
            "Bacterial spot causes dark, water-soaked lesions "
            "on pepper leaves and fruits.",

        "symptoms":
            "Small dark spots with yellow halos that may merge "
            "over time.",

        "treatment":
            "Remove heavily infected leaves and follow local "
            "agricultural guidance for approved control methods.",

        "prevention":
            "Use disease-free seed, avoid overhead irrigation, "
            "and improve air circulation.",

        "recommendations":
            "Sanitize tools and monitor nearby plants frequently "
            "for early signs.",
    },

    "Pepper__bell___healthy": {
        "description":
            "No visible disease pattern detected in this "
            "pepper leaf.",

        "symptoms":
            "Leaf tissue appears normal for the crop.",

        "treatment":
            "No treatment is required based on this image.",

        "prevention":
            "Continue balanced watering and routine field hygiene.",

        "recommendations":
            "Keep scouting regularly and maintain good nutrition "
            "and spacing.",
    },

    "Potato___Early_blight": {
        "description":
            "Early blight is a fungal disease that affects "
            "older potato leaves first.",

        "symptoms":
            "Brown spots with concentric rings and yellowing "
            "around lesions.",

        "treatment":
            "Remove infected foliage and consult local extension "
            "recommendations for region-appropriate fungicide use.",

        "prevention":
            "Rotate crops and avoid wet foliage for extended periods.",

        "recommendations":
            "Improve spacing and avoid working in fields when "
            "leaves are wet.",
    },

    "Potato___Late_blight": {
        "description":
            "Late blight is a serious disease that can spread "
            "rapidly in cool, humid conditions.",

        "symptoms":
            "Water-soaked lesions that turn dark, often with "
            "pale green borders.",

        "treatment":
            "Isolate affected plants and seek immediate local "
            "agronomy guidance.",

        "prevention":
            "Use resistant varieties where available and reduce "
            "leaf wetness duration.",

        "recommendations":
            "Inspect nearby plants daily and remove severely "
            "affected material safely.",
    },

    "Potato___healthy": {
        "description":
            "No disease signals were detected for this potato "
            "leaf sample.",

        "symptoms":
            "Leaf color and texture appear healthy.",

        "treatment":
            "No treatment is currently indicated.",

        "prevention":
            "Maintain consistent field sanitation and irrigation "
            "management.",

        "recommendations":
            "Continue periodic monitoring for early disease detection.",
    },

    "Tomato_healthy": {
        "description":
            "No visible disease pattern detected in this tomato leaf.",

        "symptoms":
            "Leaf appearance is consistent with healthy growth.",

        "treatment":
            "No treatment is required based on this image.",

        "prevention":
            "Maintain good airflow, balanced nutrition, and "
            "regular scouting.",

        "recommendations":
            "Keep preventive care practices consistent through "
            "the season.",
    },
}


# ============================================================
# PEST INFORMATION
# ============================================================

PEST_INFO: dict[str, dict[str, str]] = {

    # We will add detailed information for your IP102
    # pest classes here later.

}


# ============================================================
# INFORMATION HELPERS
# ============================================================

def _empty_info() -> dict[str, str]:

    return {
        "description": FALLBACK_INFO,
        "symptoms": FALLBACK_INFO,
        "treatment": FALLBACK_INFO,
        "prevention": FALLBACK_INFO,
        "recommendations": FALLBACK_INFO,
    }


def _info_for_disease(
    class_name: str,
) -> dict[str, str]:

    data = DISEASE_INFO.get(class_name)

    if data:
        return data

    return _empty_info()


def _info_for_pest(
    class_name: str,
) -> dict[str, str]:

    data = PEST_INFO.get(class_name)

    if data:
        return data

    return _empty_info()


# ============================================================
# PREDICTION
# ============================================================

async def predict_disease(
    file: UploadFile,
    current_user: UserPublic,
) -> dict:

    settings = get_settings()

    # --------------------------------------------------------
    # 1. Read uploaded image
    # --------------------------------------------------------

    image = await read_and_validate_upload(
        file,
        settings.max_upload_size_bytes,
    )


    # ========================================================
    # 2. MODEL 1
    # Disease vs Pest
    # ========================================================

    try:

        classifier_input_size = (
            model_service.get_classifier_input_size()
        )

        classifier_batch = preprocess_image(
            image,
            classifier_input_size,
        )

        classifier_probabilities = (
            model_service.predict_classifier(
                classifier_batch
            )
        )

    except Exception as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Disease/Pest classifier prediction failed.",
        ) from exc


    # --------------------------------------------------------
    # Check Model 1 output
    # --------------------------------------------------------

    if classifier_probabilities.size == 0:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Disease/Pest classifier returned empty predictions.",
        )


    # --------------------------------------------------------
    # Model 1 prediction
    # --------------------------------------------------------

    classifier_index = int(
        np.argmax(classifier_probabilities)
    )

    classifier_confidence = float(
        classifier_probabilities[classifier_index]
    )

    category = model_service.get_classifier_class_name(
        classifier_index
    )


    # ========================================================
    # 3. ROUTE TO THE CORRECT MODEL
    # ========================================================

    if category.lower() == "disease":

        # ====================================================
        # MODEL 2
        # Plant Disease Classifier
        # ====================================================

        try:

            disease_input_size = (
                model_service.get_disease_input_size()
            )

            disease_batch = preprocess_image(
                image,
                disease_input_size,
            )

            probabilities = model_service.predict_disease(
                disease_batch
            )

        except Exception as exc:

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Disease model prediction failed.",
            ) from exc


        if probabilities.size == 0:

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Disease model returned empty predictions.",
            )


        predicted_index = int(
            np.argmax(probabilities)
        )

        confidence = float(
            probabilities[predicted_index]
        )

        class_name = model_service.get_disease_class_name(
            predicted_index
        )

        info = _info_for_disease(
            class_name
        )


    elif category.lower() == "pest":

        # ====================================================
        # MODEL 3
        # Pest Classifier
        # ====================================================

        try:

            pest_input_size = (
                model_service.get_pest_input_size()
            )

            pest_batch = preprocess_image(
                image,
                pest_input_size,
            )

            probabilities = model_service.predict_pest(
                pest_batch
            )

        except Exception as exc:

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Pest model prediction failed.",
            ) from exc


        if probabilities.size == 0:

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Pest model returned empty predictions.",
            )


        predicted_index = int(
            np.argmax(probabilities)
        )

        confidence = float(
            probabilities[predicted_index]
        )

        class_name = model_service.get_pest_class_name(
            predicted_index
        )

        info = _info_for_pest(
            class_name
        )


    else:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                f"Unknown classifier category: "
                f"{category}"
            ),
        )

    if confidence < settings.model_rejection_threshold:
        return {
            "success": True,
            "prediction": None,
            "ai_guidance": None,
            "llm_available": False,
            "input_valid": False,
            "rejection_reason": "low_confidence",
            "message": (
                "Please upload a clear image of a plant leaf suitable "
                "for disease or pest detection."
            ),
            "category": category,
            "confidence": confidence,
        }

    low_confidence = confidence < settings.model_confidence_threshold

    weather_context: dict[str, Any] = {"available": False}
    try:
        weather_data = await get_current_weather()
        if weather_data.get("success"):
            weather_context = {
                "available": True,
                "temperature": weather_data.get("temperature"),
                "feels_like": weather_data.get("feels_like"),
                "humidity": weather_data.get("humidity"),
                "condition": weather_data.get("condition"),
                "rainfall": weather_data.get("rainfall"),
                "wind_speed": weather_data.get("wind_speed"),
                "cloud_coverage": weather_data.get("cloud_coverage"),
                "location": weather_data.get("location"),
                "country": weather_data.get("country"),
                "icon": weather_data.get("icon"),
            }
    except Exception as exc:
        logger.warning("Weather fetch failed during prediction: %s", exc)
        weather_context = {"available": False}

    ai_guidance = await generate_guidance(
        prediction_type=category,
        class_name=class_name,
        confidence=confidence,
        low_confidence=low_confidence,
        weather_context=weather_context,
    )


    # ========================================================
    # 4. SAVE TO MONGODB
    # ========================================================

    db = get_database()

    await db["predictions"].insert_one(
        {
            "user_id": ObjectId(current_user.id),

            "category": category,

            "prediction": class_name,

            "confidence": confidence,

            "classifier_confidence":
                classifier_confidence,

            "filename":
                file.filename or "uploaded-image",

            "created_at":
                datetime.now(timezone.utc),
        }
    )


    # ========================================================
    # 5. RETURN RESULT
    # ========================================================

    weather_insight = ai_guidance.get("weather_insight") if ai_guidance else None

    return {
        "success": True,
        "prediction": {
            "type": category,
            "class_name": class_name,
            "confidence": confidence,
            "low_confidence": low_confidence,
        },
        "ai_guidance": ai_guidance,
        "weather_context": weather_context,
        "weather_insight": weather_insight,
        "llm_available": ai_guidance is not None,
        "category": category,
        "prediction_label": class_name,
        "confidence": confidence,

        **info,
    }


# ============================================================
# PREDICTION HISTORY
# ============================================================

async def get_prediction_history(
    current_user: UserPublic,
    limit: int = 100,
) -> list[dict]:

    db = get_database()

    cursor = (
        db["predictions"]
        .find(
            {
                "user_id":
                    ObjectId(current_user.id)
            }
        )
        .sort(
            "created_at",
            -1
        )
        .limit(limit)
    )


    results: list[dict] = []


    async for item in cursor:

        results.append(
            {
                "id":
                    str(item["_id"]),

                "prediction":
                    item["prediction"],

                "confidence":
                    float(item["confidence"]),

                "filename":
                    item["filename"],

                "created_at":
                    item["created_at"],
            }
        )


    return results