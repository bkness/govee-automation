from fastapi import FastAPI, Header, HTTPException, Depends
from dotenv import load_dotenv
import os
import httpx

load_dotenv()

api_key = os.getenv("GOVEE_API_KEY", "")
server_key = os.getenv("GOVEE_SERVER_KEY", "")

app = FastAPI()


def require_auth(x_api_key: str = Header(...)):
    if x_api_key != server_key:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/")
def root():
    return {"message": "Govee lights API is running!"}


@app.get("/lights", dependencies=[Depends(require_auth)])
async def get_lights():
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://developer-api.govee.com/v1/devices",
            headers={"Govee-API-Key": api_key}
        )
        return res.json()


@app.put("/lights/{device_id}/control", dependencies=[Depends(require_auth)])
async def control_light(device_id: str, model: str, command: dict):
    async with httpx.AsyncClient() as client:
        res = await client.put(
            "https://developer-api.govee.com/v1/devices/control",
            headers={"Govee-API-Key": api_key},
            json={
                "device": device_id,
                "model": model,
                "cmd": command
            }
        )
        try:
            return res.json()
        except Exception:
            # Log for debugging
            print("Non-JSON response from Govee:", res.status_code, res.text)
            return {
                "code": res.status_code,
                "content": res.text,
                "error": "Non-JSON respons from Govee"
            }
        # return res.json() if res.content else {"code": res.status_code}
