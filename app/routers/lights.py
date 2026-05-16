import asyncio

from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import settings
from app.dependencies import require_auth
from app.logger import log

router = APIRouter(prefix="/lights", tags=["lights"])


def _req_id(request: Request) -> str:
    return getattr(request.state, "req_id", "-")


def _parse_props(props) -> dict:
    """Normalize Govee property array or dict → flat dict with on/brightness/colorTem/color/mode."""
    out: dict = {}
    items = [props] if isinstance(props, dict) else props
    for prop in items:
        if not isinstance(prop, dict):
            continue
        if "powerSwitch" in prop:
            out["on"] = prop["powerSwitch"] == 1
        if "powerState" in prop:
            out["on"] = prop["powerState"] == "on"
        if "brightness" in prop:
            out["brightness"] = prop["brightness"]
        if "colorTem" in prop and prop["colorTem"] > 0:
            out["colorTem"] = prop["colorTem"]
        if "color" in prop and isinstance(prop["color"], dict):
            out["color"] = prop["color"]
    # Govee returns colorTem=0 when in color mode, so infer mode from what's present
    if "colorTem" in out:
        out["mode"] = "white"
    elif "color" in out:
        out["mode"] = "color"
    return out


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
    # Keep cache fresh whenever the device list is explicitly fetched
    request.app.state.devices = devices
    request.app.state.device_count = len(devices)

    log.info("[%s] Returned %d device(s)", rid, len(devices))
    return res.json()


@router.get("/states", dependencies=[Depends(require_auth)])
async def get_all_states(request: Request):
    """
    Fetch real-time on/off + brightness/color/colorTem state for every
    retrievable device. Uses the cached device list (populated at startup
    or by the last GET /lights/ call) to avoid a redundant Govee list call.
    All state requests are serialised through the shared semaphore so we
    stay under the 10 req/min rate limit.
    """
    rid = _req_id(request)
    devices: list = request.app.state.devices

    if not devices:
        log.warning("[%s] Device cache empty — falling back to live fetch", rid)
        res = await request.app.state.http_client.get("/devices")
        if res.is_error:
            raise HTTPException(status_code=res.status_code, detail="Govee API error")
        devices = res.json().get("data", {}).get("devices", [])
        request.app.state.devices = devices

    retrievable = [d for d in devices if d.get("retrievable", False)]
    log.info("[%s] Fetching state for %d retrievable device(s)", rid, len(retrievable))

    states: dict = {}
    for device in retrievable:
        async with request.app.state.govee_sem:
            try:
                res = await request.app.state.http_client.get(
                    "/devices/state",
                    params={"device": device["device"], "model": device["model"]},
                )
                await asyncio.sleep(settings.govee_cmd_delay)

                if res.is_success:
                    props = res.json().get("data", {}).get("properties", [])
                    states[device["device"]] = _parse_props(props)
                    log.debug(
                        "[%s] State OK — device=%s on=%s",
                        rid, device["device"], states[device["device"]].get("on"),
                    )
                else:
                    log.warning(
                        "[%s] State error — device=%s status=%d",
                        rid, device["device"], res.status_code,
                    )
            except Exception as exc:
                log.warning("[%s] State fetch failed — device=%s err=%s", rid, device["device"], exc)

    log.info("[%s] Returned state for %d/%d device(s)", rid, len(states), len(retrievable))
    return {"states": states}


@router.put("/{device_id}/control", dependencies=[Depends(require_auth)])
async def control_light(device_id: str, model: str, command: dict, request: Request):
    rid = _req_id(request)
    log.info(
        "[%s] Control — device=%s model=%s cmd=%s",
        rid, device_id, model, command.get("name"),
    )

    async with request.app.state.govee_sem:
        res = await request.app.state.http_client.put(
            "/devices/control",
            json={"device": device_id, "model": model, "cmd": command},
        )
        await asyncio.sleep(settings.govee_cmd_delay)

    if res.is_error:
        log.error(
            "[%s] Govee API error on PUT /devices/control — device=%s status=%d body=%s",
            rid, device_id, res.status_code, res.text[:200],
        )
        raise HTTPException(status_code=res.status_code, detail="Govee API error")

    log.debug("[%s] Control OK — device=%s status=%d", rid, device_id, res.status_code)
    return res.json() if res.content else {"code": res.status_code}
