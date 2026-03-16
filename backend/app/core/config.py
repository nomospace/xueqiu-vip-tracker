"""
应用配置
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # 应用配置
    APP_NAME: str = "mini脱水雪球"
    DEBUG: bool = True
    
    # 数据库配置
    DATABASE_URL: str = "sqlite+aiosqlite:///./snowball_vip.db"
    
    # CORS 配置
    CORS_ORIGINS: List[str] = ["http://localhost:4200", "http://localhost:3000", "*"]
    
    # 雪球配置
    XUEQIU_BASE_URL: str = "https://xueqiu.com"
    CRAWLER_INTERVAL: int = 900  # 爬虫间隔（秒），默认15分钟
    
    # JWT 配置
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24小时
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()