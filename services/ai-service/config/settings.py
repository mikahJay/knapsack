from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Anthropic API
    anthropic_api_key: str
    
    # Service URLs (for calling need-server and resource-server)
    need_server_url: str = "http://localhost:8001"
    resource_server_url: str = "http://localhost:8002"
    
    # Database (if match-server has its own DB for caching)
    database_url: Optional[str] = None
    
    # Matching configuration
    default_top_k: int = 10
    min_feasibility_score: int = 20
    
    # API settings
    api_host: str = "0.0.0.0"
    api_port: int = 8003
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = Settings()