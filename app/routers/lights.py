import asyncio

from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import settings
from app.dependencies import require_auth
from app.logger import log

router = APIRouter(prefix="/lights", tags=["lights"])


def _req_id(request: Request) -> str:
    return getattr(request.state, "req_id", "-")


@router.get("/", dependencies=[Depends(require_auth)])
async def get_lights(request: Request):
    rid = _req_id(request)
    log.debug("[%s] Fetching device list from Govee API", rid)

    res = await request.app.state.http_client.get("/devices")

    if res.is_error:
        log.error(
            "[%s] Govee API error on GET /devices — status=%d body=%s",
            rid, res.status_code, res.text[:200],
        )
        raise HTTPException(status_code=res.status_code, detail="Govee API error")

    devices = res.json().get("data", {}).get("devices", [])
    log.info("[%s] Returned %d device(s)", rid, len(devices))
    return res.json()


@router.put("/{device_id}/control", dependencies=[Depends(require_auth)])
async def control_light(device_id: str, model: str, command: dict, request: Request):
    rid = _req_id(request)
    log.info(
        "[%s] Control — device=%s model=%s cmd=%s",
        rid, device_id, model, command.get("name"),
    )

    # Serialize cloud writes through the semaphore to stay under 10 req/min
    async with request.app.state.govee_sem:
        res = await request.app.state.http_client.put(
            "/devices/control",
            json={"device": device_id, "model": model, "cmd": command},
        )
        # Small delay after each write to spread burst calls over time
        await asyncio.sleep(settings.govee_cmd_delay)

    if res.is_error:
        log.error(
            "[%s] Govee API error on PUT /devices/control — device=%s status=%d body=%s",
            rid, device_id, res.status_code, res.text[:200],
        )
        raise HTTPException(status_code=res.status_code, detail="Govee API error")

    log.debug("[%s] Control OK — device=%s status=%d", rid, device_id, res.status_code)
    return res.json() if res.content else {"code": res.status_code}
