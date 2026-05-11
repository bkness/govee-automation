from fastapi import FastAPI,  Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from datetime import datetime
import os
import httpx
import asyncio
import socket
import json

load_dotenv()

app = FastAPI()

api_key = os.getenv("GOVEE_API_KEY", "")
server_key = os.getenv("GOVEE_SERVER_KEY", "")

DEVICE_ROUTING = {
    "H610A": "cloud",
    "H6008": "cloud",
    "H6199": "cloud",
}
DEVICE_IPS  = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"]
)

def require_auth(x_api_key: str = Header(...)):
    if x_api_key != server_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
async def send_lan_command(ip: str, command: dict):
    payload = json.dumps({
        "msg": {
            "cmd": command["name"],
            "data": command["value"]
        }
    }).encode("utf-8")

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, lambda: _udp_send(ip, payload))

def _udp_send(ip: str, payload: bytes):
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.sendto(payload, (ip, 4003))

async def send_cloud_command(device_id: str, model: str, command: dict):
    print(f"[cloud] {datetime.now().strftime('%H:%M:%S.%f')[:-3]} {device_id} → {command}")
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
        print(f"[response] {res.status_code} {res.text}")
        try:
            return res.json()
        except Exception:
            print("Non-JSON response from Govee:", res.status_code, res.text)
            return {
                "code": res.status_code,
                "content": res.text,
                "error": "Non-JSON response from Govee"
            }
          
@app.get('/')
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
    route = DEVICE_ROUTING.get(model, "cloud")

    if route == "lan":
        ip = DEVICE_IPS.get(device_id)
        
        if not ip:
            raise HTTPException(status_code=404, detail="No LAN IP for this device")
        await send_lan_command(ip, command)
        return {"status": "sent via LAN"}
    
    return await send_cloud_command(device_id, model, command)

        
