from fastapi import APIRouter

from app.services.weather_service import get_current_weather

router = APIRouter(tags=["weather"])


@router.get("/weather")
async def weather() -> dict:
    return await get_current_weather()
