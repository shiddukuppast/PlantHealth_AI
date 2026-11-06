import asyncio
import json
import logging
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import get_settings

logger = logging.getLogger(__name__)
MAX_LOGGED_RESPONSE_LENGTH = 500


def _safe_response_preview(body: str) -> str:
    return body[:MAX_LOGGED_RESPONSE_LENGTH].replace("\n", "\\n")


def _parse_guidance_content(content: str) -> dict[str, Any]:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    guidance = json.loads(cleaned)
    if not isinstance(guidance, dict):
        raise ValueError("LLM response is not a JSON object")

    def clean_str(val: Any, default: str = "") -> str:
        return str(val).strip() if val is not None else default

    def clean_list(val: Any) -> list[str]:
        if isinstance(val, list):
            return [str(item).strip() for item in val if str(item).strip()]
        if isinstance(val, str) and val.strip():
            return [val.strip()]
        return []

    summary = clean_str(guidance.get("summary"))
    disease_overview = clean_str(guidance.get("disease_overview"))
    symptoms = clean_list(guidance.get("symptoms"))
    possible_causes = clean_list(guidance.get("possible_causes"))

    raw_severity = clean_str(guidance.get("severity"), default="Medium")
    if "high" in raw_severity.lower():
        severity = "High"
    elif "low" in raw_severity.lower():
        severity = "Low"
    else:
        severity = "Medium"

    severity_explanation = clean_str(guidance.get("severity_explanation"))
    immediate_actions = clean_list(guidance.get("immediate_actions"))
    treatment_recommendations = clean_list(guidance.get("treatment_recommendations"))
    prevention = clean_list(guidance.get("prevention"))
    farmer_advisory = clean_str(guidance.get("farmer_advisory"))
    when_to_seek = clean_str(guidance.get("when_to_seek_expert_help"))

    recommended_actions = clean_list(guidance.get("recommended_actions"))
    if not recommended_actions:
        recommended_actions = immediate_actions + treatment_recommendations
    if not immediate_actions and recommended_actions:
        immediate_actions = recommended_actions[:3]
    if not treatment_recommendations and len(recommended_actions) > 3:
        treatment_recommendations = recommended_actions[3:]

    weather_insight = clean_str(guidance.get("weather_insight")) or None

    return {
        "summary": summary or disease_overview or "Plant health analysis completed.",
        "disease_overview": disease_overview or summary,
        "symptoms": symptoms,
        "possible_causes": possible_causes,
        "severity": severity,
        "severity_explanation": severity_explanation,
        "immediate_actions": immediate_actions,
        "treatment_recommendations": treatment_recommendations,
        "prevention": prevention,
        "farmer_advisory": farmer_advisory or when_to_seek,
        "recommended_actions": recommended_actions,
        "when_to_seek_expert_help": when_to_seek or farmer_advisory,
        "weather_insight": weather_insight,
    }


def _request_guidance(payload: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    logger.info(
        "LLM DEBUG: request started (url=%s, model=%s)",
        settings.llm_api_url,
        settings.llm_model,
    )

    wc = payload.get("weather_context")
    weather_parts: list[str] = []
    if wc and wc.get("available"):
        if wc.get("temperature") is not None:
            weather_parts.append(f"Temperature: {wc['temperature']}°C")
        if wc.get("feels_like") is not None:
            weather_parts.append(f"Feels like: {wc['feels_like']}°C")
        if wc.get("humidity") is not None:
            weather_parts.append(f"Relative humidity: {wc['humidity']}%")
        if wc.get("condition"):
            weather_parts.append(f"Weather condition: {wc['condition']}")
        if wc.get("rainfall") is not None and wc.get("rainfall") > 0:
            weather_parts.append(f"Rainfall: {wc['rainfall']} mm")
        if wc.get("wind_speed") is not None:
            weather_parts.append(f"Wind speed: {wc['wind_speed']} m/s")
        if wc.get("cloud_coverage") is not None:
            weather_parts.append(f"Cloud coverage: {wc['cloud_coverage']}%")
        if wc.get("location"):
            weather_parts.append(f"Location: {wc['location']}")

    weather_text = "\n".join(weather_parts) if weather_parts else "Weather data unavailable."

    prompt = (
        "You are an experienced agricultural scientist and agronomy advisory specialist providing practical, farmer-friendly plant health guidance.\n\n"
        "AUTHORITATIVE CLASSIFICATION:\n"
        "The supplied diagnosis (type, condition, confidence) comes strictly from an authoritative ML image classifier. "
        "You must NEVER change, question, or replace that prediction. Always explain the exact diagnosed condition.\n\n"
        "CRITICAL RULES:\n"
        "1. Safety & Chemical Dosages: NEVER invent or prescribe specific unverified chemical dosages or concentrations. "
        "Recommend standard approved organic remedies (e.g., neem oil spray, trichoderma) and general chemical classes (e.g., copper-based fungicides) "
        "with explicit instructions to follow manufacturer labels and wear protective gear.\n"
        "2. Healthy Crops: If the detected condition indicates healthy (e.g. 'healthy'), celebrate the healthy condition. "
        "Provide maintenance, nutrient management, and monitoring advice rather than disease treatments. Severity must be 'Low'.\n"
        "3. Low Confidence: If low_confidence is true or confidence is below 70%, advise the farmer to inspect other leaves "
        "or consult a local Krishi Vigyan Kendra (KVK) / agricultural extension officer for on-field confirmation.\n"
        "4. Weather Context: Weather is supplementary environmental context, NOT the primary root cause. "
        "Explain how temperature/humidity/rainfall might favor or hinder pathogen growth (e.g., 'Warm and humid conditions favor fungal spore germination'). "
        "If weather is unavailable or irrelevant, set weather_insight to null.\n"
        "5. Farmer-Friendly Tone: Use simple, encouraging, respectful language suitable for Indian farmers.\n\n"
        "Return ONLY a valid JSON object with EXACTLY the following keys:\n"
        "{\n"
        '  "summary": "Crisp 1-2 sentence overall diagnosis summary",\n'
        '  "disease_overview": "Detailed explanation of what the condition is, affected plant parts (leaves, stems, fruit), and how it spreads",\n'
        '  "symptoms": ["Observable visual symptom 1", "Observable visual symptom 2", "Observable visual symptom 3"],\n'
        '  "possible_causes": ["Causal pathogen or physiological stress", "Favorable environmental factors"],\n'
        '  "severity": "Low | Medium | High",\n'
        '  "severity_explanation": "Clear explanation of potential crop loss and urgency if left unmanaged",\n'
        '  "immediate_actions": ["Immediate step 1 (e.g., isolate infected plant parts)", "Immediate step 2 (e.g., sanitize pruning shears)", "Immediate step 3 (e.g., adjust irrigation)"],\n'
        '  "treatment_recommendations": ["Safe organic remedy or cultural control", "Approved agricultural treatment with safety precautions (refer to product label)"],\n'
        '  "prevention": ["Crop rotation practice", "Resistant varieties / clean seed stock", "Soil & moisture management"],\n'
        '  "farmer_advisory": "Simple, practical closing advice for the farmer, including when to contact the local agricultural extension officer",\n'
        '  "recommended_actions": ["Combined practical action 1", "Combined practical action 2"],\n'
        '  "when_to_seek_expert_help": "Specific conditions under which the farmer should visit the nearest agricultural center",\n'
        '  "weather_insight": "1-2 sentence insight on how current weather impacts this crop condition, or null if weather is not available"\n'
        "}\n\n"
        "Diagnostic Details:\n"
        f"- Crop type: {payload.get('type')}\n"
        f"- Diagnosed condition: {payload.get('class_name')}\n"
        f"- ML Model confidence: {payload.get('confidence')}\n"
        f"- Low confidence flag: {payload.get('low_confidence')}\n\n"
        f"Current Local Weather Context:\n{weather_text}"
    )

    request_body = json.dumps(
        {
            "model": settings.llm_model,
            "temperature": 0.2,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a professional agricultural advisor. Return only the requested JSON object.",
                },
                {"role": "user", "content": prompt},
            ],
        }
    ).encode("utf-8")
    request = Request(
        settings.llm_api_url,
        data=request_body,
        headers={
            "Authorization": f"Bearer {settings.llm_api_key}",
            "Content-Type": "application/json",
            "User-Agent": "PlantHealthAI/2.0",
        },
        method="POST",
    )
    with urlopen(request, timeout=20) as response:
        response_body = response.read().decode("utf-8")
        logger.info(
            "LLM DEBUG: HTTP status=%s response=%s",
            response.status,
            _safe_response_preview(response_body),
        )
        response_data = json.loads(response_body)
    content = response_data["choices"][0]["message"]["content"]
    logger.info("LLM DEBUG: parsing response")
    return _parse_guidance_content(content)


async def generate_guidance(
    *,
    prediction_type: str,
    class_name: str,
    confidence: float,
    low_confidence: bool,
    weather_context: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    settings = get_settings()
    logger.info(
        "LLM DEBUG: entering service (type=%s, class=%s, confidence=%.4f, configured=%s, weather_available=%s)",
        prediction_type,
        class_name,
        confidence,
        bool(settings.llm_api_key),
        bool(weather_context and weather_context.get("available")),
    )
    if not settings.llm_api_key:
        logger.error("LLM request skipped: LLM_API_KEY is not configured.")
        return None

    payload = {
        "type": prediction_type,
        "class_name": class_name,
        "confidence": confidence,
        "low_confidence": low_confidence,
        "weather_context": weather_context if (weather_context and weather_context.get("available")) else None,
    }
    try:
        guidance = await asyncio.to_thread(_request_guidance, payload)
        logger.info("LLM DEBUG: parsing successful; guidance generated=True")
        return guidance
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        logger.error(
            "LLM request failed: HTTP status=%s response=%s",
            exc.code,
            _safe_response_preview(body),
        )
    except (URLError, TimeoutError) as exc:
        logger.error("LLM request failed: network or timeout error: %s", exc)
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        logger.exception("LLM response parsing failed.")
    except Exception:
        logger.exception("LLM request failed with an unexpected error.")
    logger.info("LLM DEBUG: guidance generated=False")
    return None
