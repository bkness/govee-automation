from fastapi import Request
from fastapi.responses import JSONResponse
import httpx
from app.logger import log


async def httpx_exception_handler(request: Request, exc: httpx.TimeoutException):
    log.error("Govee API timeout — %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=504,
        content={"detail": "Govee API timed out. Try again shortly."},
    )


async def httpx_connect_error_handler(request: Request, exc: httpx.ConnectError):
    log.error("Govee API unreachable — %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=502,
        content={"detail": "Could not reach Govee API."},
    )


async def unhandled_exception_handler(request: Request, exc: Exception):
    log.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error."},
    )
