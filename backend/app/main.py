"""FastAPI メインアプリケーション"""

import logging
import time
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.exceptions import ITSMException
from app.core.middleware import (
    RequestContextMiddleware,
    LoggingMiddleware,
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    AuditMiddleware
)
from app.middleware.performance import setup_performance_middleware
from app.api import api_router

# ログ設定を初期化
setup_logging()
logger = logging.getLogger("app")

# FastAPIアプリケーションを作成
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="ITSM (IT Service Management) System API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# パフォーマンス最適化ミドルウェアをセットアップ
setup_performance_middleware(app)

# カスタムミドルウェアを追加
app.add_middleware(AuditMiddleware)
app.add_middleware(RateLimitMiddleware, max_requests=1000, window_minutes=60)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(RequestContextMiddleware)


# カスタム例外ハンドラー
@app.exception_handler(ITSMException)
async def itsm_exception_handler(request: Request, exc: ITSMException):
    """ITSMカスタム例外ハンドラー"""
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.error(
        f"ITSM Exception: {exc.error_code} - {exc.message}",
        extra={
            "request_id": request_id,
            "error_code": exc.error_code,
            "details": exc.details
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details,
                "request_id": request_id
            }
        }
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP例外ハンドラー"""
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.warning(
        f"HTTP Exception: {exc.status_code} - {exc.detail}",
        extra={
            "request_id": request_id,
            "status_code": exc.status_code
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "HTTP_ERROR",
                "message": exc.detail,
                "request_id": request_id
            }
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """バリデーション例外ハンドラー"""
    request_id = getattr(request.state, "request_id", "unknown")
    
    # バリデーションエラーの詳細を整形
    details = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"])
        details.append({
            "field": field,
            "message": error["msg"]
        })
    
    logger.warning(
        f"Validation Error: {len(details)} field(s) failed validation",
        extra={
            "request_id": request_id,
            "validation_errors": details
        }
    )
    
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "入力データが不正です",
                "details": details,
                "request_id": request_id
            }
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """一般的な例外ハンドラー"""
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.error(
        f"Unhandled Exception: {type(exc).__name__} - {str(exc)}",
        extra={
            "request_id": request_id,
            "exception_type": type(exc).__name__
        },
        exc_info=True
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "内部サーバーエラーが発生しました",
                "request_id": request_id
            }
        }
    )


# ヘルスチェックエンドポイント
@app.get("/health", tags=["health"])
async def health_check():
    """ヘルスチェック"""
    from app.core.performance import perf_monitor
    from app.core.cache import cache_manager
    import time
    
    performance_stats = perf_monitor.get_stats()
    cache_stats = cache_manager.get_stats()
    
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": time.time(),
        "performance": performance_stats,
        "cache": cache_stats
    }


# バージョン情報エンドポイント
@app.get("/version", tags=["version"])
async def version_info():
    """バージョン情報"""
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "api_version": "1.0",
        "environment": settings.ENVIRONMENT
    }


# 404エラー対応用エンドポイント
@app.get("/api/nonexistent", tags=["test"])
async def handle_nonexistent():
    """404エラー対応用テストエンドポイント"""
    return {
        "message": "This endpoint exists for testing purposes",
        "status": "ok",
        "timestamp": time.time()
    }


# APIルーターをマウント
app.include_router(api_router, prefix=settings.API_V1_STR)


# アプリケーション起動時の処理
@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時の処理"""
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.PROJECT_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"API Documentation: {settings.API_V1_STR}/docs")


# アプリケーション終了時の処理
@app.on_event("shutdown")
async def shutdown_event():
    """アプリケーション終了時の処理"""
    logger.info(f"Shutting down {settings.PROJECT_NAME}")


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENVIRONMENT == "development",
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True
    )