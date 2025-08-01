"""ログ設定"""

import logging
import logging.config
import sys
from typing import Dict, Any
from pathlib import Path

from app.core.config import settings


def setup_logging() -> None:
    """ログ設定を初期化する"""
    
    # ログディレクトリを作成
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # ログ設定
    logging_config: Dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "detailed": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(module)s - %(funcName)s - %(lineno)d - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "json": {
                "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
                "format": "%(asctime)s %(name)s %(levelname)s %(module)s %(funcName)s %(lineno)d %(message)s",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": settings.LOG_LEVEL,
                "formatter": "default",
                "stream": sys.stdout,
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "INFO",
                "formatter": "detailed",
                "filename": "logs/itsm.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "encoding": "utf8",
            },
            "error_file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "ERROR",
                "formatter": "detailed",
                "filename": "logs/itsm_error.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "encoding": "utf8",
            },
            "audit_file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "INFO",
                "formatter": "json",
                "filename": "logs/itsm_audit.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 10,
                "encoding": "utf8",
            },
        },
        "loggers": {
            # アプリケーションロガー
            "app": {
                "level": settings.LOG_LEVEL,
                "handlers": ["console", "file", "error_file"],
                "propagate": False,
            },
            # 監査ロガー
            "app.audit": {
                "level": "INFO",
                "handlers": ["audit_file"],
                "propagate": False,
            },
            # SQLAlchemyロガー
            "sqlalchemy.engine": {
                "level": "WARNING" if settings.ENVIRONMENT == "production" else "INFO",
                "handlers": ["console", "file"],
                "propagate": False,
            },
            # FastAPIロガー
            "uvicorn": {
                "level": "INFO",
                "handlers": ["console", "file"],
                "propagate": False,
            },
            "uvicorn.access": {
                "level": "INFO",
                "handlers": ["console", "file"],
                "propagate": False,
            },
        },
        "root": {
            "level": "WARNING",
            "handlers": ["console"],
        },
    }
    
    # 開発環境では詳細なログを出力
    if settings.ENVIRONMENT == "development":
        logging_config["loggers"]["sqlalchemy.engine"]["level"] = "INFO"
        logging_config["handlers"]["console"]["level"] = "DEBUG"
    
    # 本番環境ではコンソール出力を制限
    if settings.ENVIRONMENT == "production":
        logging_config["handlers"]["console"]["level"] = "WARNING"
        logging_config["loggers"]["sqlalchemy.engine"]["level"] = "ERROR"
    
    logging.config.dictConfig(logging_config)


class AuditLogger:
    """監査ログ専用クラス"""
    
    def __init__(self):
        self.logger = logging.getLogger("app.audit")
    
    def log_user_action(
        self,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        details: Dict[str, Any] = None,
        client_ip: str = None,
        user_agent: str = None
    ):
        """ユーザーアクションを監査ログに記録"""
        audit_data = {
            "event_type": "user_action",
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "client_ip": client_ip,
            "user_agent": user_agent,
            "details": details or {}
        }
        
        self.logger.info("User action logged", extra=audit_data)
    
    def log_system_event(
        self,
        event_type: str,
        description: str,
        details: Dict[str, Any] = None
    ):
        """システムイベントを監査ログに記録"""
        audit_data = {
            "event_type": event_type,
            "description": description,
            "details": details or {}
        }
        
        self.logger.info("System event logged", extra=audit_data)
    
    def log_security_event(
        self,
        event_type: str,
        user_id: str,
        description: str,
        severity: str = "medium",
        client_ip: str = None,
        details: Dict[str, Any] = None
    ):
        """セキュリティイベントを監査ログに記録"""
        audit_data = {
            "event_type": "security_event",
            "security_event_type": event_type,
            "user_id": user_id,
            "description": description,
            "severity": severity,
            "client_ip": client_ip,
            "details": details or {}
        }
        
        self.logger.warning("Security event logged", extra=audit_data)


# グローバル監査ロガーインスタンス
audit_logger = AuditLogger()