from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql+psycopg://zippalgo:zippalgo@localhost:5432/zippalgo360_db"
    jwt_secret: str = "change-this-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24
    cors_origins: str = "http://localhost:3000"
    upload_dir: str = "./uploads"
    zipterior_api_base_url: str = "https://zipterior.kr"
    sso_shared_secret: str = "change-this-in-production"
    sso_code_ttl_seconds: int = 30
    kakao_rest_api_key: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
