from fastapi import Header, HTTPException
from app.config import settings


async def require_auth(x_api_key: str = Header(...)) -> None:
    if x_api_key != settings.govee_server_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
