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
    required_keys = {
        "summary",
        "symptoms",
        "recommended_actions",
        "prevention",
        "severity",
        "when_to_seek_expert_help",
    }
    if (
        not isinstance(guidance, dict)
        or not required_keys.issubset(guidance)
        or not isinstance(guidance["summary"], str)
        or not isinstance(guidance["symptoms"], list)
        or not isinstance(guidance["recommended_actions"], list)
        or not isinstance(guidance["prevention"], list)
        or not isinstance(guidance["severity"], str)
        or not isinstance(guidance["when_to_seek_expert_help"], str)
    ):
        raise ValueError("LLM response is missing required guidance fields.")

    if "weather_insight" in guidance and guidance["weather_insight"] is not None:
        guidance["weather_insight"] = str(guidance["weather_insight"]).strip()
    else:
        guidance["weather_insight"] = None

    return guidance


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
            weather_parts.append(f"Humidity: {wc['humidity']}%")
        if wc.get("condition"):
            weather_parts.append(f"Weather condition: {wc['condition']}")
        if wc.get("rainfall") is not None and wc.get("rainfall") > 0:
            weather_parts.append(f"Rain/precipitation: {wc['rainfall']} mm")
        if wc.get("wind_speed") is not None:
            weather_parts.append(f"Wind: {wc['wind_speed']} m/s")
        if wc.get("cloud_coverage") is not None:
            weather_parts.append(f"Cloud coverage: {wc['cloud_coverage']}%")
        if wc.get("location"):
            weather_parts.append(f"Location: {wc['location']}")

    weather_text = "\n".join(weather_parts) if weather_parts else "Weather data unavailable."

    prompt = (
        "You provide cautious, farmer-friendly plant health guidance.\n\n"
        "AUTHORITATIVE CLASSIFICATION:\n"
        "The supplied diagnosis (type, condition, confidence) comes strictly from an authoritative ML image classifier. "
        "You must NEVER change, question, or replace that prediction. Always explain the exact diagnosed condition. "
        "Respect low confidence without claiming certainty.\n\n"
        "WEATHER CONTEXT & INTERPRETATION RULES:\n"
        "- Weather is supplementary context, NOT the primary cause. Never claim that weather caused the disease "
        "(e.g., say 'wet and humid conditions can favor the development and spread of late blight', "
        "NOT 'the rain caused your late blight').\n"
        "- Weather relevance: Only mention weather when it is actually relevant to the condition. "
        "For fungal diseases, humid or wet conditions may be highly relevant. For pests, temperature and humidity may influence activity. "
        "For other conditions or when weather is not a major factor, be concise in weather_insight: "
        "'Current weather conditions do not appear to be a major factor for this diagnosis.'\n"
        "- Weather-aware recommendations: When weather is relevant, make recommended actions context-aware "
        "(e.g., avoid overhead watering in high humidity, improve ventilation, monitor adjacent plants).\n"
        "- Safety: Do not prescribe pesticide or fungicide dosages. Encourage following local agricultural advice "
        "and consulting an extension officer for chemical recommendations.\n\n"
        "Return valid JSON with exactly these keys:\n"
        "- summary (string): Clear, concise explanation of the diagnosed condition.\n"
        "- weather_insight (string or null): If weather is available, a 1-2 sentence context insight explaining how current weather "
        "can favor disease spread, pest activity, or plant stress (or concisely stating it is not a major factor). "
        "If weather is unavailable, return null.\n"
        "- symptoms (array of strings): Common observable symptoms.\n"
        "- recommended_actions (array of strings): Practical management actions, adapted to weather when relevant.\n"
        "- prevention (array of strings): Preventive agricultural practices.\n"
        "- severity (string): Severity level (e.g. Low, Medium, High).\n"
        "- when_to_seek_expert_help (string): Clear guidance on when to consult an agronomist.\n\n"
        "Diagnostic Details:\n"
        f"Detected type: {payload.get('type')}\n"
        f"Detected condition: {payload.get('class_name')}\n"
        f"ML confidence: {payload.get('confidence')}\n"
        f"Low confidence flag: {payload.get('low_confidence')}\n\n"
        f"Current Weather Context:\n{weather_text}"
    )

    request_body = json.dumps(
        {
            "model": settings.llm_model,
            "temperature": 0.2,
            "messages": [
                {
                    "role": "system",
                    "content": "Return only the requested JSON object.",
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
            "User-Agent": "PlantHealthAI/1.0",
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
