from pydantic_settings import BaseSettings
from typing import List, Optional
from urllib.parse import quote_plus, urlparse, urlunparse


class Settings(BaseSettings):
    SECRET_KEY: str = "burnoutai-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    DATABASE_URL: str = "sqlite:///./burnout.db"

    # Separate password field — avoids URL-encoding issues in render.yaml
    # Set DB_PASSWORD as a plain string; config will inject it into DATABASE_URL
    DB_PASSWORD: Optional[str] = None

    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8081", "*"]

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SECRET_KEY: str = ""

    @property
    def effective_database_url(self) -> str:
        """Returns DATABASE_URL with the password safely injected via quote_plus."""
        if not self.DB_PASSWORD:
            return self.DATABASE_URL
        parsed = urlparse(self.DATABASE_URL)
        encoded_pw = quote_plus(self.DB_PASSWORD)  # encodes @ -> %40, etc.
        host_part = parsed.hostname
        if parsed.port:
            host_part = f"{host_part}:{parsed.port}"
        new_netloc = f"{parsed.username}:{encoded_pw}@{host_part}"
        return urlunparse((
            parsed.scheme, new_netloc, parsed.path,
            parsed.params, parsed.query, parsed.fragment
        ))

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
