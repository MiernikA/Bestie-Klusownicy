from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Bestie-Klusownicy API"
    api_prefix: str = "/api"
    database_url: str = "sqlite:///./bestie_klusownicy.db"
    cors_origins: list[str] = []
    allowed_hosts: list[str] = ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
