"""強化されたセキュリティと例外処理システム"""

import asyncio
import hashlib
import hmac
import json
import logging
import secrets
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
from functools import wraps
import jwt
import bcrypt
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import aiofiles
import traceback
import sys

from app.core.config import settings

logger = logging.getLogger(__name__)


class SecurityLevel(Enum):
    """セキュリティレベル"""

    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    SECRET = "secret"
    TOP_SECRET = "top_secret"


class ErrorClassification(Enum):
    """エラー分類"""

    SYSTEM_ERROR = "system_error"
    USER_ERROR = "user_error"
    SECURITY_ERROR = "security_error"
    BUSINESS_ERROR = "business_error"
    INTEGRATION_ERROR = "integration_error"
    DATA_ERROR = "data_error"


class ExceptionSeverity(Enum):
    """例外重要度"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


@dataclass
class SecurityContext:
    """セキュリティコンテキスト"""

    user_id: Optional[str]
    session_id: str
    ip_address: str
    user_agent: str
    permissions: List[str]
    security_level: SecurityLevel
    timestamp: float

    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result["security_level"] = self.security_level.value
        return result


@dataclass
class SecureException:
    """セキュアな例外情報"""

    id: str
    timestamp: float
    classification: ErrorClassification
    severity: ExceptionSeverity
    error_type: str
    message: str
    sanitized_message: str
    context: SecurityContext
    stack_trace_hash: str
    affected_resources: List[str]
    sensitive_data_detected: bool
    remediation_steps: List[str]

    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result["classification"] = self.classification.value
        result["severity"] = self.severity.value
        result["context"] = self.context.to_dict()
        return result


class DataSanitizer:
    """データサニタイザー"""

    def __init__(self):
        self.sensitive_patterns = [
            r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b",  # クレジットカード
            r"\b\d{3}-\d{2}-\d{4}\b",  # SSN
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",  # Email
            r"\b(?:\d{1,3}\.){3}\d{1,3}\b",  # IP Address
            r"password\s*[:=]\s*[^\s]+",  # Password
            r"token\s*[:=]\s*[^\s]+",  # Token
            r"key\s*[:=]\s*[^\s]+",  # API Key
        ]

        self.replacement_map = {
            "credit_card": "[CREDIT_CARD_REDACTED]",
            "ssn": "[SSN_REDACTED]",
            "email": "[EMAIL_REDACTED]",
            "ip": "[IP_REDACTED]",
            "password": "password=[PASSWORD_REDACTED]",
            "token": "token=[TOKEN_REDACTED]",
            "key": "key=[KEY_REDACTED]",
        }

    def sanitize_message(self, message: str) -> tuple[str, bool]:
        """メッセージをサニタイズ"""
        sanitized = message
        sensitive_detected = False

        import re

        for i, pattern in enumerate(self.sensitive_patterns):
            if re.search(pattern, sanitized, re.IGNORECASE):
                sensitive_detected = True
                replacement_keys = list(self.replacement_map.keys())
                if i < len(replacement_keys):
                    replacement = self.replacement_map[replacement_keys[i]]
                    sanitized = re.sub(
                        pattern, replacement, sanitized, flags=re.IGNORECASE
                    )

        return sanitized, sensitive_detected

    def sanitize_data(self, data: Any) -> Dict[str, Any]:
        """データをサニタイズ"""
        if isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                if isinstance(value, str):
                    sanitized_value, _ = self.sanitize_message(value)
                    sanitized[key] = sanitized_value
                else:
                    sanitized[key] = (
                        self.sanitize_data(value)
                        if isinstance(value, (dict, list))
                        else value
                    )
            return sanitized
        elif isinstance(data, list):
            return [self.sanitize_data(item) for item in data]
        elif isinstance(data, str):
            sanitized_value, _ = self.sanitize_message(data)
            return sanitized_value
        else:
            return data


class EncryptionManager:
    """暗号化管理"""

    def __init__(self, encryption_key: Optional[str] = None):
        if encryption_key:
            self.key = encryption_key.encode()
        else:
            self.key = (
                settings.ENCRYPTION_KEY.encode()
                if hasattr(settings, "ENCRYPTION_KEY")
                else Fernet.generate_key()
            )

        # キー派生関数を使用してより安全なキーを生成
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b"itsm_salt_2024",  # 本来はランダムソルトを使用
            iterations=100000,
        )
        derived_key = base64.urlsafe_b64encode(kdf.derive(self.key))
        self.fernet = Fernet(derived_key)

    def encrypt_data(self, data: str) -> str:
        """データを暗号化"""
        try:
            return self.fernet.encrypt(data.encode()).decode()
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            return "[ENCRYPTION_FAILED]"

    def decrypt_data(self, encrypted_data: str) -> str:
        """データを復号化"""
        try:
            return self.fernet.decrypt(encrypted_data.encode()).decode()
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            return "[DECRYPTION_FAILED]"

    def create_secure_hash(self, data: str) -> str:
        """セキュアなハッシュを作成"""
        return hashlib.sha256(data.encode()).hexdigest()

    def verify_integrity(self, data: str, expected_hash: str) -> bool:
        """データ整合性を検証"""
        return self.create_secure_hash(data) == expected_hash


class AccessControlManager:
    """アクセス制御管理"""

    def __init__(self):
        self.permission_cache: Dict[str, Dict[str, Any]] = {}
        self.rate_limits: Dict[str, List[float]] = {}
        self.blocked_ips: Set[str] = set()

    def check_permissions(
        self, context: SecurityContext, required_permission: str
    ) -> bool:
        """権限チェック"""
        if context.security_level == SecurityLevel.TOP_SECRET:
            return True  # 最高レベルは全権限

        # キャッシュからチェック
        cache_key = f"{context.user_id}:{context.session_id}"
        if cache_key in self.permission_cache:
            cached_perms = self.permission_cache[cache_key]
            if time.time() - cached_perms["timestamp"] < 300:  # 5分キャッシュ
                return required_permission in cached_perms["permissions"]

        # 実際の権限チェック
        has_permission = required_permission in context.permissions

        # キャッシュ更新
        self.permission_cache[cache_key] = {
            "permissions": context.permissions,
            "timestamp": time.time(),
        }

        return has_permission

    def check_rate_limit(
        self, identifier: str, max_requests: int = 100, window_seconds: int = 60
    ) -> bool:
        """レート制限チェック"""
        current_time = time.time()

        # 古いリクエストを削除
        if identifier in self.rate_limits:
            self.rate_limits[identifier] = [
                req_time
                for req_time in self.rate_limits[identifier]
                if current_time - req_time < window_seconds
            ]
        else:
            self.rate_limits[identifier] = []

        # 新しいリクエストを追加
        self.rate_limits[identifier].append(current_time)

        # 制限チェック
        return len(self.rate_limits[identifier]) <= max_requests

    def is_ip_blocked(self, ip_address: str) -> bool:
        """IPブロックチェック"""
        return ip_address in self.blocked_ips

    def block_ip(self, ip_address: str):
        """IPをブロック"""
        self.blocked_ips.add(ip_address)
        logger.warning(f"Blocked IP address: {ip_address}")

    def unblock_ip(self, ip_address: str):
        """IPブロック解除"""
        self.blocked_ips.discard(ip_address)
        logger.info(f"Unblocked IP address: {ip_address}")


class SecureExceptionHandler:
    """セキュアな例外ハンドラー"""

    def __init__(self):
        self.sanitizer = DataSanitizer()
        self.encryption_manager = EncryptionManager()
        self.access_control = AccessControlManager()
        self.exception_history: List[SecureException] = []

    def classify_exception(
        self, exc: Exception, context: SecurityContext
    ) -> tuple[ErrorClassification, ExceptionSeverity]:
        """例外を分類"""
        exc_type = type(exc).__name__
        exc_message = str(exc).lower()

        # セキュリティエラーの検出
        if any(
            keyword in exc_message
            for keyword in ["unauthorized", "forbidden", "authentication", "permission"]
        ):
            return ErrorClassification.SECURITY_ERROR, ExceptionSeverity.HIGH

        # システムエラーの検出
        if any(
            keyword in exc_message
            for keyword in ["database", "connection", "timeout", "memory"]
        ):
            severity = (
                ExceptionSeverity.CRITICAL
                if "critical" in exc_message
                else ExceptionSeverity.HIGH
            )
            return ErrorClassification.SYSTEM_ERROR, severity

        # ユーザーエラーの検出
        if any(
            keyword in exc_message
            for keyword in ["validation", "invalid", "bad request"]
        ):
            return ErrorClassification.USER_ERROR, ExceptionSeverity.MEDIUM

        # ビジネスエラーの検出
        if any(
            keyword in exc_message for keyword in ["business", "rule", "constraint"]
        ):
            return ErrorClassification.BUSINESS_ERROR, ExceptionSeverity.MEDIUM

        # データエラーの検出
        if any(keyword in exc_message for keyword in ["data", "format", "parse"]):
            return ErrorClassification.DATA_ERROR, ExceptionSeverity.MEDIUM

        # デフォルト
        return ErrorClassification.SYSTEM_ERROR, ExceptionSeverity.MEDIUM

    def create_secure_exception(
        self, exc: Exception, context: SecurityContext
    ) -> SecureException:
        """セキュアな例外オブジェクトを作成"""
        # メッセージをサニタイズ
        sanitized_message, sensitive_detected = self.sanitizer.sanitize_message(
            str(exc)
        )

        # スタックトレースのハッシュ化
        stack_trace = traceback.format_exc()
        stack_trace_hash = self.encryption_manager.create_secure_hash(stack_trace)

        # 例外分類
        classification, severity = self.classify_exception(exc, context)

        # 修復手順の生成
        remediation_steps = self._generate_remediation_steps(exc, classification)

        # 影響を受けるリソースの特定
        affected_resources = self._identify_affected_resources(exc, context)

        secure_exc = SecureException(
            id=f"exc_{int(time.time())}_{secrets.token_hex(8)}",
            timestamp=time.time(),
            classification=classification,
            severity=severity,
            error_type=type(exc).__name__,
            message=str(exc),
            sanitized_message=sanitized_message,
            context=context,
            stack_trace_hash=stack_trace_hash,
            affected_resources=affected_resources,
            sensitive_data_detected=sensitive_detected,
            remediation_steps=remediation_steps,
        )

        return secure_exc

    def _generate_remediation_steps(
        self, exc: Exception, classification: ErrorClassification
    ) -> List[str]:
        """修復手順を生成"""
        steps_map = {
            ErrorClassification.SECURITY_ERROR: [
                "Review authentication credentials",
                "Check user permissions",
                "Verify security token validity",
                "Audit access logs",
            ],
            ErrorClassification.SYSTEM_ERROR: [
                "Check system resources",
                "Verify service connectivity",
                "Review configuration settings",
                "Monitor system logs",
            ],
            ErrorClassification.USER_ERROR: [
                "Validate input data",
                "Check request format",
                "Review API documentation",
                "Provide user feedback",
            ],
            ErrorClassification.BUSINESS_ERROR: [
                "Review business rules",
                "Check data constraints",
                "Validate business logic",
                "Consult business requirements",
            ],
            ErrorClassification.DATA_ERROR: [
                "Validate data format",
                "Check data integrity",
                "Review data transformation",
                "Verify data sources",
            ],
        }

        return steps_map.get(
            classification, ["Review error details", "Check logs", "Contact support"]
        )

    def _identify_affected_resources(
        self, exc: Exception, context: SecurityContext
    ) -> List[str]:
        """影響を受けるリソースを特定"""
        resources = []

        # スタックトレースから影響を受けるファイル/モジュールを特定
        stack_trace = traceback.format_exc()

        import re

        file_matches = re.findall(r'File "([^"]+)"', stack_trace)
        for file_path in file_matches:
            resources.append(Path(file_path).name)

        # ユーザーセッション
        if context.user_id:
            resources.append(f"user_session:{context.user_id}")

        return list(set(resources))  # 重複除去

    async def handle_exception(
        self, exc: Exception, context: SecurityContext
    ) -> SecureException:
        """例外を安全に処理"""
        secure_exc = self.create_secure_exception(exc, context)

        # 例外履歴に追加
        self.exception_history.append(secure_exc)

        # 履歴サイズ制限
        if len(self.exception_history) > 10000:
            self.exception_history = self.exception_history[-8000:]

        # セキュリティ上重要な例外の場合は特別処理
        if secure_exc.severity in [
            ExceptionSeverity.CRITICAL,
            ExceptionSeverity.EMERGENCY,
        ]:
            await self._handle_critical_exception(secure_exc)

        # ログ記録
        await self._log_secure_exception(secure_exc)

        return secure_exc

    async def _handle_critical_exception(self, secure_exc: SecureException):
        """重要な例外の特別処理"""
        # 緊急通知
        await self._send_emergency_alert(secure_exc)

        # セキュリティ分析
        if secure_exc.classification == ErrorClassification.SECURITY_ERROR:
            # 潜在的な攻撃者IPをブロック
            if secure_exc.context.ip_address:
                self.access_control.block_ip(secure_exc.context.ip_address)

        # システム保護措置
        if secure_exc.severity == ExceptionSeverity.EMERGENCY:
            await self._activate_emergency_protocols(secure_exc)

    async def _send_emergency_alert(self, secure_exc: SecureException):
        """緊急アラート送信"""
        alert = {
            "timestamp": time.time(),
            "type": "emergency_exception",
            "exception_id": secure_exc.id,
            "severity": secure_exc.severity.value,
            "classification": secure_exc.classification.value,
            "sanitized_message": secure_exc.sanitized_message,
            "affected_resources": secure_exc.affected_resources,
        }

        alert_dir = Path("emergency_alerts")
        alert_dir.mkdir(exist_ok=True)

        alert_file = alert_dir / f"emergency_{secure_exc.id}.json"
        async with aiofiles.open(alert_file, "w") as f:
            await f.write(json.dumps(alert, indent=2, default=str))

    async def _activate_emergency_protocols(self, secure_exc: SecureException):
        """緊急プロトコル実行"""
        protocols = {
            "timestamp": time.time(),
            "exception_id": secure_exc.id,
            "protocols_activated": [
                "emergency_logging",
                "enhanced_monitoring",
                "security_lockdown",
            ],
            "actions_taken": [
                f"Blocked IP: {secure_exc.context.ip_address}",
                "Activated enhanced security monitoring",
                "Notified security team",
            ],
        }

        async with aiofiles.open("emergency_protocols.json", "w") as f:
            await f.write(json.dumps(protocols, indent=2, default=str))

    async def _log_secure_exception(self, secure_exc: SecureException):
        """セキュアな例外ログ記録"""
        # センシティブデータを含む場合は暗号化
        if secure_exc.sensitive_data_detected:
            encrypted_message = self.encryption_manager.encrypt_data(secure_exc.message)
            log_entry = secure_exc.to_dict()
            log_entry["message"] = encrypted_message
            log_entry["encrypted"] = True
        else:
            log_entry = secure_exc.to_dict()
            log_entry["encrypted"] = False

        # セキュリティレベルに応じたログファイル分離
        log_dir = Path("secure_exception_logs")
        log_dir.mkdir(exist_ok=True)

        security_level = secure_exc.context.security_level.value
        date_str = datetime.now().strftime("%Y%m%d")
        log_file = log_dir / f"exceptions_{security_level}_{date_str}.log"

        async with aiofiles.open(log_file, "a") as f:
            await f.write(json.dumps(log_entry, default=str) + "\n")


# デコレーター関数
def secure_exception_handler(security_level: SecurityLevel = SecurityLevel.INTERNAL):
    """セキュアな例外処理デコレーター"""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as exc:
                # セキュリティコンテキストを構築
                context = SecurityContext(
                    user_id=kwargs.get("user_id"),
                    session_id=kwargs.get("session_id", secrets.token_hex(16)),
                    ip_address=kwargs.get("ip_address", "127.0.0.1"),
                    user_agent=kwargs.get("user_agent", "Unknown"),
                    permissions=kwargs.get("permissions", []),
                    security_level=security_level,
                    timestamp=time.time(),
                )

                # グローバルハンドラーを使用
                global_handler = getattr(secure_exception_handler, "_handler", None)
                if not global_handler:
                    global_handler = SecureExceptionHandler()
                    secure_exception_handler._handler = global_handler

                secure_exc = await global_handler.handle_exception(exc, context)

                # セキュリティレベルに応じてエラー情報を調整
                if security_level in [SecurityLevel.SECRET, SecurityLevel.TOP_SECRET]:
                    raise type(exc)("An error occurred. Please contact administrator.")
                else:
                    raise type(exc)(secure_exc.sanitized_message)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as exc:
                # 同期版の処理
                sanitizer = DataSanitizer()
                sanitized_message, _ = sanitizer.sanitize_message(str(exc))

                if security_level in [SecurityLevel.SECRET, SecurityLevel.TOP_SECRET]:
                    raise type(exc)("An error occurred. Please contact administrator.")
                else:
                    raise type(exc)(sanitized_message)

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

    return decorator


def require_permission(permission: str):
    """権限要求デコレーター"""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # セキュリティコンテキストから権限チェック
            context = kwargs.get("security_context")
            if not context:
                raise PermissionError("Security context required")

            access_control = AccessControlManager()
            if not access_control.check_permissions(context, permission):
                raise PermissionError(f"Permission '{permission}' required")

            return await func(*args, **kwargs)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            context = kwargs.get("security_context")
            if not context:
                raise PermissionError("Security context required")

            access_control = AccessControlManager()
            if not access_control.check_permissions(context, permission):
                raise PermissionError(f"Permission '{permission}' required")

            return func(*args, **kwargs)

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

    return decorator


def rate_limit(max_requests: int = 100, window_seconds: int = 60):
    """レート制限デコレーター"""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # IP アドレスまたはユーザーIDでレート制限
            identifier = (
                kwargs.get("ip_address") or kwargs.get("user_id") or "anonymous"
            )

            access_control = AccessControlManager()
            if not access_control.check_rate_limit(
                identifier, max_requests, window_seconds
            ):
                raise Exception(
                    f"Rate limit exceeded: {max_requests} requests per {window_seconds} seconds"
                )

            return await func(*args, **kwargs)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            identifier = (
                kwargs.get("ip_address") or kwargs.get("user_id") or "anonymous"
            )

            access_control = AccessControlManager()
            if not access_control.check_rate_limit(
                identifier, max_requests, window_seconds
            ):
                raise Exception(
                    f"Rate limit exceeded: {max_requests} requests per {window_seconds} seconds"
                )

            return func(*args, **kwargs)

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

    return decorator


# 使用例とテスト
@secure_exception_handler(SecurityLevel.CONFIDENTIAL)
@require_permission("api.read")
@rate_limit(max_requests=50, window_seconds=60)
async def secure_api_endpoint(
    user_id: str,
    ip_address: str,
    permissions: List[str],
    security_context: SecurityContext = None,
):
    """セキュアなAPIエンドポイントの例"""
    # 何らかの処理
    if user_id == "test_error":
        raise ValueError("This is a test error with sensitive data: password=secret123")

    return {"status": "success", "user_id": user_id}


# メイン実行用（テスト）
async def main():
    """テスト実行"""
    # セキュリティコンテキスト作成
    context = SecurityContext(
        user_id="test_user",
        session_id="test_session",
        ip_address="192.168.1.100",
        user_agent="Test-Agent/1.0",
        permissions=["api.read", "api.write"],
        security_level=SecurityLevel.CONFIDENTIAL,
        timestamp=time.time(),
    )

    try:
        result = await secure_api_endpoint(
            user_id="test_error",
            ip_address="192.168.1.100",
            permissions=["api.read"],
            security_context=context,
        )
        print(f"Result: {result}")
    except Exception as e:
        print(f"Handled exception: {e}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
