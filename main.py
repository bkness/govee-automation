from fastapi import FastAPI
from dotenv import load_dotenv
import os
import httpx

load_dotenv()

api_key = os.getenv("GOVEE_API_KEY")

app = FastAPI()


@app.get("/")
def root():
    return {"message": "Govee lights API is running!"}


@app.get("/lights")
async def get_lights():
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://developer-api.govee.com/v1/devices",
            headers={"Govee-API-Key": api_key}
      )
        return res.json()
    
@app.put("/lights/{device_id}/control")
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
        return res.json()
