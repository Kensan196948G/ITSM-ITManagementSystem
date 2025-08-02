"""アプリケーション設定"""

import os
from typing import List, Union

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """アプリケーション設定クラス"""

    # プロジェクト情報
    PROJECT_NAME: str = "ITSM System"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # データベース
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    ASYNC_DATABASE_URL: str = Field(..., env="ASYNC_DATABASE_URL")

    # Redis
    REDIS_URL: str = Field("redis://localhost:6379/0", env="REDIS_URL")

    # セキュリティ
    SECRET_KEY: str = Field(..., env="SECRET_KEY")
    ALGORITHM: str = Field("HS256", env="ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(30, env="ACCESS_TOKEN_EXPIRE_MINUTES")

    # CORS - 簡素化された設定
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.3.135:3000",
    ]

    # 環境
    ENVIRONMENT: str = Field("development", env="ENVIRONMENT")

    # 暗号化
    ENCRYPTION_KEY: str = Field(..., env="ENCRYPTION_KEY")

    # ページネーション
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # ログ
    LOG_LEVEL: str = Field("INFO", env="LOG_LEVEL")

    # 開発環境設定
    DEVELOPMENT_MODE: bool = Field(True, env="DEVELOPMENT_MODE")
    DISABLE_AUTH_FOR_TESTING: bool = Field(True, env="DISABLE_AUTH_FOR_TESTING")

    # 添付ファイル設定
    MAX_FILE_SIZE: int = Field(50 * 1024 * 1024, env="MAX_FILE_SIZE")  # 50MB
    MAX_FILES_PER_UPLOAD: int = Field(10, env="MAX_FILES_PER_UPLOAD")
    MAX_TOTAL_UPLOAD_SIZE: int = Field(
        200 * 1024 * 1024, env="MAX_TOTAL_UPLOAD_SIZE"
    )  # 200MB
    MAX_ATTACHMENTS_PER_RESOURCE: int = Field(50, env="MAX_ATTACHMENTS_PER_RESOURCE")
    MAX_STORAGE_PER_TENANT: int = Field(
        10 * 1024 * 1024 * 1024, env="MAX_STORAGE_PER_TENANT"
    )  # 10GB
    ATTACHMENT_STORAGE_PATH: str = Field(
        "./storage/attachments", env="ATTACHMENT_STORAGE_PATH"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",  # Allow extra environment variables for testing
    )


# グローバル設定インスタンス
settings = Settings()
