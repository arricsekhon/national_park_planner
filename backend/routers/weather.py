import os
import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/weather", tags=["weather"])

OWM_BASE = "https://api.openweathermap.org/data/2.5"


@router.get("")
async def get_weather(
    lat: float = Query(...),
    lon: float = Query(...),
):
    key = os.getenv("OPENWEATHER_API_KEY", "")
    if not key:
        return {"available": False}

    params = {"lat": lat, "lon": lon, "appid": key, "units": "imperial", "cnt": 5}
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{OWM_BASE}/forecast/daily", params=params, timeout=8)
        if resp.status_code != 200:
            # Fallback to current weather endpoint (free tier)
            resp = await client.get(
                f"{OWM_BASE}/weather",
                params={"lat": lat, "lon": lon, "appid": key, "units": "imperial"},
                timeout=8,
            )
            if resp.status_code != 200:
                return {"available": False}
            data = resp.json()
            return {
                "available": True,
                "current": {
                    "temp": round(data["main"]["temp"]),
                    "feels_like": round(data["main"]["feels_like"]),
                    "description": data["weather"][0]["description"].title(),
                    "icon": data["weather"][0]["icon"],
                    "humidity": data["main"]["humidity"],
                    "wind_speed": round(data["wind"]["speed"]),
                },
            }

    data = resp.json()
    return {"available": True, "forecast": data.get("list", [])}
