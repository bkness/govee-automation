from fastapi import FastAPI
from dotenv import load_dotenv
import os

load_dotenv()

api_key = os.getenv("GOVEE_API_KEY")

app = FastAPI()


@app.get("/")
def root():
    return {"message": "Govee lights API is running!"}


@app.get("/lights")
def get_lights():
    return {"lights": []}

