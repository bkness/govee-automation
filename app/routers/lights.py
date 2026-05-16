from fastapi import APIRouter, Depends, HTTPException, Request
from app.dependencies import require_auth
from app.logger import log

router = APIRouter(prefix="/lights", tags=["lights"])


@router.get("/", dependencies=[Depends(require_auth)])
async def get_lights(request: Request):
    log.debug("Fetching device list from Govee API")
    res = await request.app.state.http_client.get("/devices")

    if res.is_error:
        log.error("Govee API error on GET /devices — status=%d body=%s", res.status_code, res.text[:200])
        raise HTTPException(status_code=res.status_code, detail="Govee API error")

    devices = res.json().get("data", {}).get("devices", [])
    log.info("Returned %d device(s)", len(devices))
    return res.json()


@router.put("/{device_id}/control", dependencies=[Depends(require_auth)])
async def control_light(device_id: str, model: str, command: dict, request: Request):
    log.info(
        "Control command — device=%s model=%s cmd=%s",
        device_id, model, command.get("name"), 
    )

    res = await request.app.state.http_client.put(
        "/devices/control",
        json={
            "device": device_id,
            "model": model,
            "cmd": command,
        },
    )

    if res.is_error:
        log.error(
            "Govee API error on PUT /devices/control — device=%s status=%d body=%s",
            device_id, res.status_code, res.text[:200],
        )
        raise HTTPException(status_code=res.status_code, detail="Govee API error")

    log.debug("Control OK — device=%s status=%d", device_id, res.status_code)
    return res.json() if res.content else {"code": res.status_code}
