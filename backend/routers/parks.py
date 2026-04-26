import os
import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/parks", tags=["parks"])

NPS_BASE = "https://developer.nps.gov/api/v1"
PARK_FIELDS = "images,entranceFees,operatingHours,activities,contacts,addresses"


def nps_key() -> str:
    key = os.getenv("NPS_API_KEY", "")
    if not key or key == "your_api_key_here":
        raise HTTPException(status_code=500, detail="NPS_API_KEY not configured")
    return key


@router.get("")
async def search_parks(
    q: str = Query(default=""),
    stateCode: str = Query(default=""),
    limit: int = Query(default=20, le=500),
    start: int = Query(default=0),
):
    params = {
        "api_key": nps_key(),
        "limit": limit,
        "start": start,
        "fields": PARK_FIELDS,
    }
    if q:
        params["q"] = q
    if stateCode:
        params["stateCode"] = stateCode

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{NPS_BASE}/parks", params=params, timeout=10)
        resp.raise_for_status()

    data = resp.json()
    return {"total": int(data.get("total", 0)), "parks": data.get("data", [])}


@router.get("/{park_code}")
async def get_park(park_code: str):
    params = {
        "api_key": nps_key(),
        "parkCode": park_code,
        "fields": PARK_FIELDS,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{NPS_BASE}/parks", params=params, timeout=10)
        resp.raise_for_status()

    data = resp.json()
    parks = data.get("data", [])
    if not parks:
        raise HTTPException(status_code=404, detail="Park not found")
    return parks[0]


@router.get("/{park_code}/alerts")
async def get_park_alerts(park_code: str):
    params = {"api_key": nps_key(), "parkCode": park_code, "limit": 20}
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{NPS_BASE}/alerts", params=params, timeout=10)
        resp.raise_for_status()
    data = resp.json()
    return {"alerts": data.get("data", [])}


@router.get("/{park_code}/campgrounds")
async def get_park_campgrounds(park_code: str):
    params = {"api_key": nps_key(), "parkCode": park_code, "limit": 20}
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{NPS_BASE}/campgrounds", params=params, timeout=10)
        resp.raise_for_status()
    data = resp.json()
    return {"campgrounds": data.get("data", [])}


@router.get("/{park_code}/thingstodo")
async def get_things_to_do(park_code: str, limit: int = Query(default=20, le=50)):
    params = {"api_key": nps_key(), "parkCode": park_code, "limit": limit}
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{NPS_BASE}/thingstodo", params=params, timeout=10)
        resp.raise_for_status()
    data = resp.json()
    return {"thingstodo": data.get("data", [])}
