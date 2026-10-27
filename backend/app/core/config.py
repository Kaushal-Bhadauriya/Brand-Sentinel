from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """
    Application configuration loaded from environment variables or .env file.
    Follows 12-factor application design principles with safe defaults.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Core Application Settings
    PROJECT_NAME: str = "BrandSentinel"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Vector Database (Qdrant) Settings
    QDRANT_URL: str = Field(default="http://localhost:6333", description="Qdrant service URL")
    QDRANT_API_KEY: Optional[str] = Field(default=None, description="API Key for Qdrant Cloud or protected instance")
    QDRANT_COLLECTION: str = "brand_guidelines"
    QDRANT_LOCAL_PATH: str = "./qdrant_storage"

    # Embedding & RAG Model Settings
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    SIMILARITY_THRESHOLD: float = 0.55
    HYBRID_RRF_K: int = 60

    # Optional AI Provider Keys
    GEMINI_API_KEY: Optional[str] = Field(default=None, description="Google Gemini API Key for LLM assistance")
    OPENAI_API_KEY: Optional[str] = Field(default=None, description="OpenAI API Key for LLM assistance")

    # CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]


settings = Settings()
