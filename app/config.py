from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    govee_api_key: str
    govee_server_key: str

    model_config = {"env_file": ".env"}


settings = Settings()
