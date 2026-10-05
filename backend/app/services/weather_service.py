import asyncio
import json
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.core.config import get_settings

_weather_cache: dict[str, Any] = {}
_cache_timestamp: float = 0.0
_CACHE_TTL_SECONDS: int = 300


def _fetch_weather() -> dict[str, Any]:
    global _weather_cache, _cache_timestamp

    now = time.monotonic()
    if _weather_cache and (now - _cache_timestamp) < _CACHE_TTL_SECONDS:
        return _weather_cache.copy()

    settings = get_settings()
    if not settings.openweather_api_key:
        raise RuntimeError("OpenWeather API key is not configured.")

    query = f"{settings.openweather_city},{settings.openweather_country}"
    params = urlencode(
        {
            "q": query,
            "appid": settings.openweather_api_key,
            "units": "metric",
        }
    )
    request = Request(
        f"https://api.openweathermap.org/data/2.5/weather?{params}",
        headers={"User-Agent": "PlantGuardAI/1.0"},
        method="GET",
    )
    with urlopen(request, timeout=8) as response:
        data = json.loads(response.read().decode("utf-8"))

    main = data.get("main", {})
    weather = data.get("weather", [{}])[0]
    wind = data.get("wind", {})
    rain = data.get("rain", {})
    clouds = data.get("clouds", {})

    rainfall: float | None = None
    if isinstance(rain, dict):
        if "1h" in rain:
            rainfall = round(float(rain["1h"]), 1)
        elif "3h" in rain:
            rainfall = round(float(rain["3h"]), 1)

    wind_speed: float | None = None
    if "speed" in wind:
        wind_speed = round(float(wind["speed"]), 1)

    cloud_coverage: int | None = None
    if "all" in clouds:
        cloud_coverage = int(clouds["all"])

    raw_desc = str(weather.get("description", ""))
    condition = raw_desc.capitalize() if raw_desc else "Clear"

    result = {
        "success": True,
        "location": data.get("name", settings.openweather_city),
        "country": data.get("sys", {}).get(
            "country",
            settings.openweather_country,
        ),
        "temperature": round(float(main["temp"])),
        "feels_like": round(float(main["feels_like"])),
        "condition": condition,
        "humidity": int(main["humidity"]),
        "icon": str(weather.get("icon", "")),
        "wind_speed": wind_speed,
        "rainfall": rainfall,
        "cloud_coverage": cloud_coverage,
    }

    _weather_cache = result
    _cache_timestamp = now
    return result.copy()


async def get_current_weather() -> dict[str, Any]:
    try:
        return await asyncio.to_thread(_fetch_weather)
    except (
        HTTPError,
        URLError,
        TimeoutError,
        KeyError,
        TypeError,
        ValueError,
        RuntimeError,
        json.JSONDecodeError,
    ):
        return {
            "success": False,
            "message": "Weather unavailable",
        }
