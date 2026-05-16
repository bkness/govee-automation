from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.exceptions import (
    httpx_connect_error_handler,
    httpx_exception_handler,
    unhandled_exception_handler,
)
from app.logger import log
from app.middleware import RequestLogMiddleware
from app.routers import lights


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting Govee Automation API")

    app.state.http_client = httpx.AsyncClient(
        base_url="https://developer-api.govee.com/v1",
        headers={"Govee-API-Key": settings.govee_api_key},
        timeout=10.0,
    )

    # ── Startup connectivity check ────────────────────────────────────────────
    try:
        res = await app.state.http_client.get("/devices")
        if res.is_error:
            log.warning("Govee API reachable but returned status=%d on startup", res.status_code)
        else:
            device_count = len(res.json().get("data", {}).get("devices", []))
            log.info("Govee API reachable — %d device(s) registered", device_count)
    except httpx.ConnectError:
        log.error("Govee API unreachable at startup — check your network or API key")
    except httpx.TimeoutException:
        log.warning("Govee API startup check timed out — continuing anyway")

    yield

    log.info("Shutting down — closing httpx client")
    await app.state.http_client.aclose()


app = FastAPI(title="Govee Automation API", lifespan=lifespan)

# ── Middleware ─────────────────────────────────────────────────────────────────
app.add_middleware(RequestLogMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "PUT"],
    allow_headers=["x-api-key", "Content-Type"],
)

# ── Exception handlers ────────────────────────────────────────────────────────
app.add_exception_handler(httpx.TimeoutException, httpx_exception_handler)
app.add_exception_handler(httpx.ConnectError, httpx_connect_error_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(lights.router)


@app.get("/")
def root():
    return {"message": "Govee lights API is running!"}
