from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    govee_api_key: str
    govee_server_key: str
    # Seconds between sequential Govee cloud calls (10 req/min limit)
    govee_cmd_delay: float = 0.15

    model_config = {"env_file": ".env"}


settings = Settings()
