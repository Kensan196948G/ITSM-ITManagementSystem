"""
Security Error Detection and Repair System
セキュリティ関連エラーの検知・修復システム
"""

import asyncio
import json
import logging
import re
import time
import hashlib
import ipaddress
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, asdict
from pathlib import Path
import traceback
import httpx
import requests
from urllib.parse import urlparse, parse_qs
import jwt
import base64
from collections import defaultdict, deque

from app.core.config import settings


@dataclass
class SecurityThreat:
    """セキュリティ脅威情報"""

    timestamp: str
    threat_type: str
    severity: str
    source_ip: Optional[str]
    endpoint: Optional[str]
    user_agent: Optional[str]
    payload: Optional[str]
    description: str
    mitigation_applied: bool = False
    mitigation_description: Optional[str] = None


@dataclass
class SecurityMetrics:
    """セキュリティメトリクス"""

    timestamp: str
    total_threats: int
    threats_by_type: Dict[str, int]
    threats_by_severity: Dict[str, int]
    blocked_ips: int
    suspicious_activities: int
    authentication_failures: int
    authorization_violations: int
    data_exposure_attempts: int
    mitigation_success_rate: float


class SecurityErrorMonitor:
    """セキュリティエラー監視・修復システム"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.base_url = "http://192.168.3.135:8000"

        # ファイルパス
        self.security_log_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/security_threats.log"
        self.metrics_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/security_metrics.json"
        self.blocklist_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/security_blocklist.json"

        # セキュリティ脅威履歴
        self.security_threats: List[SecurityThreat] = []
        self.monitoring_active = False
        self.monitoring_interval = 20  # 20秒間隔

        # IP制限とレート制限
        self.blocked_ips: Set[str] = set()
        self.rate_limit_tracker = defaultdict(deque)  # IP -> timestamps
        self.failed_auth_tracker = defaultdict(int)  # IP -> failed count

        # セキュリティパターン
        self.sql_injection_patterns = [
            r"(\b(SELECT|INSERT|UPDATE|DELETE|UNION|DROP|CREATE|ALTER)\b)",
            r"(\'|\"|;|--|\*|\/\*|\*\/)",
            r"(\bOR\b.*=.*\bOR\b)",
            r"(\bAND\b.*=.*\bAND\b)",
            r"(1=1|1=0)",
            r"(\bEXEC\b|\bEXECUTE\b)",
        ]

        self.xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on(load|error|click|mouseover|focus|blur)=",
            r"<iframe[^>]*>",
            r"<object[^>]*>",
            r"<embed[^>]*>",
            r"<link[^>]*>",
            r"<meta[^>]*>",
        ]

        self.path_traversal_patterns = [
            r"\.\./",
            r"\.\.\\",
            r"%2e%2e%2f",
            r"%2e%2e%5c",
            r"\.\.%2f",
            r"\.\.%5c",
        ]

        self.command_injection_patterns = [
            r"(;|\||&|`|\$\(|\${)",
            r"(nc|netcat|telnet|ssh|ftp)",
            r"(wget|curl|lynx)",
            r"(/bin/|/usr/bin/|/sbin/)",
            r"(cat|grep|awk|sed|sort)",
        ]

        # セキュリティ閾値
        self.security_thresholds = {
            "max_requests_per_minute": 60,
            "max_failed_auth_attempts": 5,
            "suspicious_pattern_score": 3,
            "rate_limit_window_minutes": 10,
            "auto_block_threshold": 10,
        }

        # 許可リスト（ホワイトリスト）
        self.whitelisted_ips = {"127.0.0.1", "localhost", "192.168.3.135"}
        self.whitelisted_user_agents = {"HealthCheck", "Monitoring"}

        # 既知の攻撃パターン
        self.known_attack_signatures = {
            "nikto": r"nikto",
            "sqlmap": r"sqlmap",
            "nmap": r"nmap",
            "dirb": r"dirb",
            "gobuster": r"gobuster",
            "burpsuite": r"burp",
            "owasp_zap": r"zaproxy",
        }

        # セキュリティポリシー
        self.security_policies = {
            "enforce_https": True,
            "require_authentication": True,
            "enable_rate_limiting": True,
            "block_suspicious_ips": True,
            "log_all_requests": True,
            "validate_input": True,
        }

    async def start_infinite_security_monitoring(self):
        """無限ループでのセキュリティ監視開始"""
        self.monitoring_active = True
        self.logger.info("Starting infinite security monitoring...")

        # ブロックリストの読み込み
        await self.load_blocklist()

        monitoring_cycle = 0
        consecutive_failures = 0
        max_consecutive_failures = 5

        while self.monitoring_active:
            try:
                monitoring_cycle += 1
                self.logger.info(
                    f"Starting security monitoring cycle #{monitoring_cycle}"
                )

                # 1. Authentication & Authorization Monitoring
                auth_status = await self.monitor_authentication_security()

                # 2. Input Validation & Injection Attack Detection
                injection_status = await self.detect_injection_attacks()

                # 3. Rate Limiting & DDoS Detection
                rate_limit_status = await self.monitor_rate_limiting()

                # 4. Suspicious Activity Detection
                suspicious_status = await self.detect_suspicious_activities()

                # 5. Data Exposure & Information Leakage Detection
                data_exposure_status = await self.detect_data_exposure()

                # 6. Security Header & Configuration Check
                security_config_status = await self.check_security_configuration()

                # 7. Threat Intelligence & Pattern Matching
                threat_intel_status = await self.analyze_threat_intelligence()

                # 8. Auto Mitigation
                mitigation_result = await self.execute_security_mitigation()

                # 9. Generate Security Report
                await self.generate_security_report(
                    auth_status,
                    injection_status,
                    rate_limit_status,
                    suspicious_status,
                    data_exposure_status,
                    security_config_status,
                    threat_intel_status,
                    mitigation_result,
                )

                # 10. Cleanup Old Data
                await self.cleanup_old_security_data()

                consecutive_failures = 0
                await asyncio.sleep(self.monitoring_interval)

            except Exception as e:
                consecutive_failures += 1
                self.logger.error(
                    f"Security monitoring cycle #{monitoring_cycle} failed: {str(e)}"
                )
                self.logger.error(traceback.format_exc())

                if consecutive_failures >= max_consecutive_failures:
                    self.logger.critical(
                        f"Too many consecutive security monitoring failures: {consecutive_failures}"
                    )
                    await self.emergency_security_response()
                    consecutive_failures = 0

                # Exponential backoff
                wait_time = min(
                    300, self.monitoring_interval * (2 ** min(consecutive_failures, 5))
                )
                await asyncio.sleep(wait_time)

    async def monitor_authentication_security(self) -> Dict[str, Any]:
        """認証・認可セキュリティ監視"""
        auth_status = {
            "timestamp": datetime.now().isoformat(),
            "authentication_tests": {},
            "authorization_tests": {},
            "vulnerabilities_found": [],
            "overall_status": "secure",
        }

        try:
            # 1. 認証エンドポイントのテスト
            auth_endpoints = [
                "/api/v1/auth/login",
                "/api/v1/auth/register",
                "/api/v1/auth/logout",
                "/api/v1/auth/refresh",
            ]

            for endpoint in auth_endpoints:
                auth_test_result = await self._test_authentication_endpoint(endpoint)
                auth_status["authentication_tests"][endpoint] = auth_test_result

                if not auth_test_result.get("secure", True):
                    auth_status["vulnerabilities_found"].append(
                        f"Authentication vulnerability in {endpoint}: {auth_test_result.get('issue', 'Unknown')}"
                    )

            # 2. 認可テスト（保護されたエンドポイント）
            protected_endpoints = [
                "/api/v1/users",
                "/api/v1/incidents",
                "/api/v1/problems",
                "/api/v1/dashboard",
            ]

            for endpoint in protected_endpoints:
                authz_test_result = await self._test_authorization_endpoint(endpoint)
                auth_status["authorization_tests"][endpoint] = authz_test_result

                if not authz_test_result.get("secure", True):
                    auth_status["vulnerabilities_found"].append(
                        f"Authorization vulnerability in {endpoint}: {authz_test_result.get('issue', 'Unknown')}"
                    )

            # 3. JWT セキュリティテスト
            jwt_test_result = await self._test_jwt_security()
            auth_status["jwt_security"] = jwt_test_result

            if not jwt_test_result.get("secure", True):
                auth_status["vulnerabilities_found"].append(
                    f"JWT security issue: {jwt_test_result.get('issue', 'Unknown')}"
                )

            # 4. セッション管理テスト
            session_test_result = await self._test_session_security()
            auth_status["session_security"] = session_test_result

            if not session_test_result.get("secure", True):
                auth_status["vulnerabilities_found"].append(
                    f"Session security issue: {session_test_result.get('issue', 'Unknown')}"
                )

            # 総合評価
            if auth_status["vulnerabilities_found"]:
                auth_status["overall_status"] = "vulnerable"

                # セキュリティ脅威として記録
                threat = SecurityThreat(
                    timestamp=datetime.now().isoformat(),
                    threat_type="AUTHENTICATION_VULNERABILITY",
                    severity="high",
                    source_ip=None,
                    endpoint=None,
                    user_agent=None,
                    payload=None,
                    description=f"Authentication vulnerabilities found: {len(auth_status['vulnerabilities_found'])}",
                )
                self.security_threats.append(threat)

            self.logger.info(
                f"Authentication security check: {auth_status['overall_status']}"
            )

        except Exception as e:
            auth_status.update({"overall_status": "error", "error": str(e)})
            self.logger.error(f"Authentication security monitoring failed: {str(e)}")

        return auth_status

    async def _test_authentication_endpoint(self, endpoint: str) -> Dict[str, Any]:
        """認証エンドポイントテスト"""
        test_result = {
            "endpoint": endpoint,
            "secure": True,
            "tests_performed": [],
            "issues": [],
        }

        try:
            url = f"{self.base_url}{endpoint}"

            # 1. 無効な認証情報でのテスト
            async with httpx.AsyncClient() as client:
                # ブルートフォース攻撃のシミュレーション
                test_credentials = [
                    {"username": "admin", "password": "admin"},
                    {"username": "admin", "password": "password"},
                    {"username": "admin", "password": "123456"},
                    {"username": "test", "password": "test"},
                ]

                for creds in test_credentials:
                    try:
                        response = await client.post(url, json=creds, timeout=5)

                        if response.status_code == 200:
                            test_result["secure"] = False
                            test_result["issues"].append(
                                f"Weak credentials accepted: {creds['username']}"
                            )

                        # レート制限チェック
                        if response.status_code != 429:  # Too Many Requests
                            test_result["tests_performed"].append("Rate limiting check")

                    except Exception:
                        pass  # エンドポイントが存在しない場合は正常

                # 2. SQLインジェクション試行
                injection_payloads = [
                    {"username": "admin' OR '1'='1", "password": "password"},
                    {"username": "admin", "password": "' OR '1'='1"},
                ]

                for payload in injection_payloads:
                    try:
                        response = await client.post(url, json=payload, timeout=5)

                        if response.status_code == 200:
                            test_result["secure"] = False
                            test_result["issues"].append(
                                "SQL injection vulnerability detected"
                            )

                            # 脅威として記録
                            threat = SecurityThreat(
                                timestamp=datetime.now().isoformat(),
                                threat_type="SQL_INJECTION",
                                severity="critical",
                                source_ip="security_test",
                                endpoint=endpoint,
                                user_agent="SecurityMonitor",
                                payload=json.dumps(payload),
                                description="SQL injection vulnerability detected in authentication endpoint",
                            )
                            self.security_threats.append(threat)

                    except Exception:
                        pass

                test_result["tests_performed"].append("SQL injection resistance")

        except Exception as e:
            test_result["issues"].append(f"Test failed: {str(e)}")

        return test_result

    async def _test_authorization_endpoint(self, endpoint: str) -> Dict[str, Any]:
        """認可エンドポイントテスト"""
        test_result = {
            "endpoint": endpoint,
            "secure": True,
            "tests_performed": [],
            "issues": [],
        }

        try:
            url = f"{self.base_url}{endpoint}"

            async with httpx.AsyncClient() as client:
                # 1. 認証なしでのアクセス試行
                response = await client.get(url, timeout=5)

                if response.status_code == 200:
                    test_result["secure"] = False
                    test_result["issues"].append(
                        "Endpoint accessible without authentication"
                    )
                elif response.status_code == 401:
                    test_result["tests_performed"].append(
                        "Authentication requirement verified"
                    )

                # 2. 無効なトークンでのアクセス試行
                invalid_tokens = [
                    "Bearer invalid_token",
                    "Bearer ",
                    "Bearer null",
                    "Bearer undefined",
                ]

                for token in invalid_tokens:
                    headers = {"Authorization": token}
                    response = await client.get(url, headers=headers, timeout=5)

                    if response.status_code == 200:
                        test_result["secure"] = False
                        test_result["issues"].append(f"Invalid token accepted: {token}")

                test_result["tests_performed"].append("Invalid token handling")

                # 3. 権限昇格試行
                privilege_escalation_headers = [
                    {"X-User-Role": "admin"},
                    {"X-Admin": "true"},
                    {"User-Agent": "admin"},
                ]

                for headers in privilege_escalation_headers:
                    response = await client.get(url, headers=headers, timeout=5)

                    if response.status_code == 200:
                        test_result["secure"] = False
                        test_result["issues"].append(
                            "Privilege escalation possible via headers"
                        )

                test_result["tests_performed"].append("Privilege escalation resistance")

        except Exception as e:
            test_result["issues"].append(f"Authorization test failed: {str(e)}")

        return test_result

    async def _test_jwt_security(self) -> Dict[str, Any]:
        """JWT セキュリティテスト"""
        jwt_test = {"secure": True, "tests_performed": [], "issues": []}

        try:
            # JWT 弱点テスト用のペイロード
            weak_jwt_tests = [
                # None アルゴリズム攻撃
                {"alg": "none"},
                # 弱いシークレット
                {"secret": "secret"},
                {"secret": "123456"},
                {"secret": "password"},
            ]

            for test_case in weak_jwt_tests:
                if "alg" in test_case:
                    # None アルゴリズムのテスト
                    payload = {"user": "admin", "role": "admin"}

                    # 署名なしのトークン生成
                    header = (
                        base64.urlsafe_b64encode(
                            json.dumps({"alg": "none", "typ": "JWT"}).encode()
                        )
                        .decode()
                        .rstrip("=")
                    )

                    body = (
                        base64.urlsafe_b64encode(json.dumps(payload).encode())
                        .decode()
                        .rstrip("=")
                    )

                    none_token = f"{header}.{body}."

                    # エンドポイントでテスト
                    try:
                        async with httpx.AsyncClient() as client:
                            headers = {"Authorization": f"Bearer {none_token}"}
                            response = await client.get(
                                f"{self.base_url}/api/v1/users",
                                headers=headers,
                                timeout=5,
                            )

                            if response.status_code == 200:
                                jwt_test["secure"] = False
                                jwt_test["issues"].append(
                                    "None algorithm attack successful"
                                )

                                # 脅威として記録
                                threat = SecurityThreat(
                                    timestamp=datetime.now().isoformat(),
                                    threat_type="JWT_VULNERABILITY",
                                    severity="critical",
                                    source_ip="security_test",
                                    endpoint="/api/v1/users",
                                    user_agent="SecurityMonitor",
                                    payload=none_token,
                                    description="JWT None algorithm vulnerability",
                                )
                                self.security_threats.append(threat)

                    except Exception:
                        pass

                jwt_test["tests_performed"].append("None algorithm resistance")

        except Exception as e:
            jwt_test["issues"].append(f"JWT test failed: {str(e)}")

        return jwt_test

    async def _test_session_security(self) -> Dict[str, Any]:
        """セッションセキュリティテスト"""
        session_test = {"secure": True, "tests_performed": [], "issues": []}

        try:
            # セッション固定化攻撃のテスト
            async with httpx.AsyncClient() as client:
                # 1. セッションクッキーの確認
                response = await client.get(f"{self.base_url}/api/v1/health", timeout=5)

                if response.cookies:
                    for cookie_name, cookie_value in response.cookies.items():
                        # セキュアフラグのチェック
                        if "secure" not in str(cookie_value).lower():
                            session_test["secure"] = False
                            session_test["issues"].append(
                                f"Cookie {cookie_name} missing Secure flag"
                            )

                        # HttpOnlyフラグのチェック
                        if "httponly" not in str(cookie_value).lower():
                            session_test["secure"] = False
                            session_test["issues"].append(
                                f"Cookie {cookie_name} missing HttpOnly flag"
                            )

                session_test["tests_performed"].append("Cookie security flags")

                # 2. セッション予測可能性テスト
                session_ids = []
                for _ in range(5):
                    response = await client.get(
                        f"{self.base_url}/api/v1/health", timeout=5
                    )
                    if response.cookies:
                        session_ids.extend(response.cookies.values())

                if len(set(session_ids)) < len(session_ids):
                    session_test["secure"] = False
                    session_test["issues"].append("Predictable session IDs detected")

                session_test["tests_performed"].append("Session ID randomness")

        except Exception as e:
            session_test["issues"].append(f"Session test failed: {str(e)}")

        return session_test

    async def detect_injection_attacks(self) -> Dict[str, Any]:
        """インジェクション攻撃検知"""
        injection_status = {
            "timestamp": datetime.now().isoformat(),
            "sql_injection_attempts": 0,
            "xss_attempts": 0,
            "command_injection_attempts": 0,
            "path_traversal_attempts": 0,
            "detected_attacks": [],
            "mitigation_actions": [],
        }

        try:
            # 1. SQL インジェクションテスト
            sql_payloads = [
                "' OR '1'='1",
                "'; DROP TABLE users; --",
                "' UNION SELECT * FROM users --",
                "admin'/*",
                "1' OR '1'='1' /*",
            ]

            test_endpoints = [
                "/api/v1/incidents",
                "/api/v1/problems",
                "/api/v1/users",
            ]

            for endpoint in test_endpoints:
                for payload in sql_payloads:
                    try:
                        # GET パラメータでのテスト
                        async with httpx.AsyncClient() as client:
                            response = await client.get(
                                f"{self.base_url}{endpoint}",
                                params={"search": payload},
                                timeout=5,
                            )

                            # データベースエラーの検出
                            error_indicators = [
                                "sql",
                                "database",
                                "mysql",
                                "postgresql",
                                "sqlite",
                                "syntax error",
                                "table",
                                "column",
                                "constraint",
                            ]

                            response_text = response.text.lower()
                            if any(
                                indicator in response_text
                                for indicator in error_indicators
                            ):
                                injection_status["sql_injection_attempts"] += 1
                                injection_status["detected_attacks"].append(
                                    {
                                        "type": "SQL_INJECTION",
                                        "endpoint": endpoint,
                                        "payload": payload,
                                        "timestamp": datetime.now().isoformat(),
                                    }
                                )

                                # 脅威として記録
                                threat = SecurityThreat(
                                    timestamp=datetime.now().isoformat(),
                                    threat_type="SQL_INJECTION",
                                    severity="high",
                                    source_ip="security_test",
                                    endpoint=endpoint,
                                    user_agent="SecurityMonitor",
                                    payload=payload,
                                    description="SQL injection attempt detected",
                                )
                                self.security_threats.append(threat)

                    except Exception:
                        pass

            # 2. XSS テスト
            xss_payloads = [
                "<script>alert('XSS')</script>",
                "<img src=x onerror=alert('XSS')>",
                "javascript:alert('XSS')",
                "<svg onload=alert('XSS')>",
                "';alert('XSS');//",
            ]

            for endpoint in test_endpoints:
                for payload in xss_payloads:
                    try:
                        async with httpx.AsyncClient() as client:
                            response = await client.post(
                                f"{self.base_url}{endpoint}",
                                json={"title": payload, "description": "test"},
                                timeout=5,
                            )

                            # レスポンスでのスクリプト実行可能性チェック
                            if payload in response.text:
                                injection_status["xss_attempts"] += 1
                                injection_status["detected_attacks"].append(
                                    {
                                        "type": "XSS",
                                        "endpoint": endpoint,
                                        "payload": payload,
                                        "timestamp": datetime.now().isoformat(),
                                    }
                                )

                                # 脅威として記録
                                threat = SecurityThreat(
                                    timestamp=datetime.now().isoformat(),
                                    threat_type="XSS",
                                    severity="medium",
                                    source_ip="security_test",
                                    endpoint=endpoint,
                                    user_agent="SecurityMonitor",
                                    payload=payload,
                                    description="XSS vulnerability detected",
                                )
                                self.security_threats.append(threat)

                    except Exception:
                        pass

            # 3. パストラバーサルテスト
            path_payloads = [
                "../../../etc/passwd",
                "..\\..\\..\\windows\\system32\\config\\sam",
                "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
                "....//....//....//etc/passwd",
            ]

            for payload in path_payloads:
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(
                            f"{self.base_url}/api/v1/attachments/{payload}", timeout=5
                        )

                        # システムファイルの内容検出
                        system_file_indicators = [
                            "root:x:",
                            "daemon:x:",
                            "[boot loader]",
                            "windows registry",
                        ]

                        response_text = response.text.lower()
                        if any(
                            indicator in response_text
                            for indicator in system_file_indicators
                        ):
                            injection_status["path_traversal_attempts"] += 1
                            injection_status["detected_attacks"].append(
                                {
                                    "type": "PATH_TRAVERSAL",
                                    "endpoint": f"/api/v1/attachments/{payload}",
                                    "payload": payload,
                                    "timestamp": datetime.now().isoformat(),
                                }
                            )

                            # 脅威として記録
                            threat = SecurityThreat(
                                timestamp=datetime.now().isoformat(),
                                threat_type="PATH_TRAVERSAL",
                                severity="high",
                                source_ip="security_test",
                                endpoint=f"/api/v1/attachments/{payload}",
                                user_agent="SecurityMonitor",
                                payload=payload,
                                description="Path traversal vulnerability detected",
                            )
                            self.security_threats.append(threat)

                except Exception:
                    pass

            self.logger.info(
                f"Injection attack detection completed: {len(injection_status['detected_attacks'])} attacks detected"
            )

        except Exception as e:
            injection_status["error"] = str(e)
            self.logger.error(f"Injection attack detection failed: {str(e)}")

        return injection_status

    async def monitor_rate_limiting(self) -> Dict[str, Any]:
        """レート制限・DDoS監視"""
        rate_limit_status = {
            "timestamp": datetime.now().isoformat(),
            "rate_limit_tests": {},
            "ddos_simulation": {},
            "blocked_ips": len(self.blocked_ips),
            "rate_violations": 0,
        }

        try:
            # 1. レート制限テスト
            test_endpoint = "/api/v1/health"
            request_count = 100
            time_window = 60  # 60秒

            start_time = time.time()
            successful_requests = 0
            rate_limited_requests = 0

            async with httpx.AsyncClient() as client:
                for i in range(request_count):
                    try:
                        response = await client.get(
                            f"{self.base_url}{test_endpoint}", timeout=2
                        )

                        if response.status_code == 200:
                            successful_requests += 1
                        elif response.status_code == 429:  # Too Many Requests
                            rate_limited_requests += 1

                        # 短い間隔で連続リクエスト
                        if i % 10 == 0:
                            await asyncio.sleep(0.1)

                    except Exception:
                        pass

            elapsed_time = time.time() - start_time
            requests_per_second = request_count / elapsed_time

            rate_limit_status["rate_limit_tests"] = {
                "total_requests": request_count,
                "successful_requests": successful_requests,
                "rate_limited_requests": rate_limited_requests,
                "requests_per_second": requests_per_second,
                "rate_limiting_effective": rate_limited_requests > 0,
            }

            # 2. DDoS シミュレーション（軽量版）
            concurrent_requests = 10
            ddos_start_time = time.time()

            tasks = []
            for _ in range(concurrent_requests):
                task = asyncio.create_task(
                    self._send_concurrent_requests(test_endpoint, 5)
                )
                tasks.append(task)

            ddos_results = await asyncio.gather(*tasks, return_exceptions=True)
            ddos_elapsed_time = time.time() - ddos_start_time

            ddos_successful = sum(
                1 for result in ddos_results if isinstance(result, int) and result > 0
            )

            rate_limit_status["ddos_simulation"] = {
                "concurrent_sessions": concurrent_requests,
                "successful_sessions": ddos_successful,
                "total_time": ddos_elapsed_time,
                "ddos_resistance": ddos_successful < concurrent_requests * 0.8,
            }

            # 3. IP レート制限チェック
            current_time = datetime.now()
            window_start = current_time - timedelta(
                minutes=self.security_thresholds["rate_limit_window_minutes"]
            )

            for ip, timestamps in self.rate_limit_tracker.items():
                # 古いタイムスタンプを削除
                while (
                    timestamps and datetime.fromisoformat(timestamps[0]) < window_start
                ):
                    timestamps.popleft()

                # レート制限違反チェック
                if (
                    len(timestamps)
                    > self.security_thresholds["max_requests_per_minute"]
                ):
                    rate_limit_status["rate_violations"] += 1

                    if ip not in self.whitelisted_ips:
                        self.blocked_ips.add(ip)

                        # 脅威として記録
                        threat = SecurityThreat(
                            timestamp=datetime.now().isoformat(),
                            threat_type="RATE_LIMIT_VIOLATION",
                            severity="medium",
                            source_ip=ip,
                            endpoint=None,
                            user_agent=None,
                            payload=None,
                            description=f"Rate limit violation: {len(timestamps)} requests in {self.security_thresholds['rate_limit_window_minutes']} minutes",
                        )
                        self.security_threats.append(threat)

            self.logger.info(
                f"Rate limiting monitoring completed: {rate_limit_status['rate_violations']} violations"
            )

        except Exception as e:
            rate_limit_status["error"] = str(e)
            self.logger.error(f"Rate limiting monitoring failed: {str(e)}")

        return rate_limit_status

    async def _send_concurrent_requests(self, endpoint: str, count: int) -> int:
        """同時リクエスト送信"""
        successful = 0
        try:
            async with httpx.AsyncClient() as client:
                for _ in range(count):
                    try:
                        response = await client.get(
                            f"{self.base_url}{endpoint}", timeout=1
                        )
                        if response.status_code < 400:
                            successful += 1
                    except Exception:
                        pass
        except Exception:
            pass

        return successful

    async def detect_suspicious_activities(self) -> Dict[str, Any]:
        """疑わしい活動の検知"""
        suspicious_status = {
            "timestamp": datetime.now().isoformat(),
            "scanner_detection": {},
            "bot_detection": {},
            "anomaly_detection": {},
            "suspicious_patterns": [],
        }

        try:
            # 1. セキュリティスキャナー検出
            scanner_patterns = [
                ("nikto", r"nikto"),
                ("sqlmap", r"sqlmap"),
                ("nmap", r"nmap"),
                ("dirb", r"dirb"),
                ("gobuster", r"gobuster"),
                ("burpsuite", r"burp"),
                ("owasp_zap", r"zaproxy"),
            ]

            # 疑わしいパスへのアクセステスト
            suspicious_paths = [
                "/admin",
                "/phpMyAdmin",
                "/wp-admin",
                "/.env",
                "/config.php",
                "/backup",
                "/test",
                "/debug",
            ]

            for path in suspicious_paths:
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(f"{self.base_url}{path}", timeout=2)

                        # 404以外のレスポンスは疑わしい
                        if response.status_code != 404:
                            suspicious_status["suspicious_patterns"].append(
                                {
                                    "type": "SUSPICIOUS_PATH_ACCESS",
                                    "path": path,
                                    "status_code": response.status_code,
                                    "timestamp": datetime.now().isoformat(),
                                }
                            )

                            # 脅威として記録
                            threat = SecurityThreat(
                                timestamp=datetime.now().isoformat(),
                                threat_type="SUSPICIOUS_ACCESS",
                                severity="low",
                                source_ip="security_test",
                                endpoint=path,
                                user_agent="SecurityMonitor",
                                payload=None,
                                description=f"Suspicious path access: {path}",
                            )
                            self.security_threats.append(threat)

                except Exception:
                    pass

            # 2. ボット検出テスト
            bot_user_agents = [
                "",  # 空のUser-Agent
                "Bot",
                "Spider",
                "Crawler",
                "python-requests",
                "curl",
                "wget",
            ]

            for user_agent in bot_user_agents:
                try:
                    async with httpx.AsyncClient() as client:
                        headers = {"User-Agent": user_agent} if user_agent else {}
                        response = await client.get(
                            f"{self.base_url}/api/v1/health", headers=headers, timeout=2
                        )

                        # ボットブロッキングの確認
                        if (
                            response.status_code == 200
                            and user_agent not in self.whitelisted_user_agents
                        ):
                            suspicious_status["bot_detection"][
                                user_agent or "empty"
                            ] = {"blocked": False, "status_code": response.status_code}
                        else:
                            suspicious_status["bot_detection"][
                                user_agent or "empty"
                            ] = {"blocked": True, "status_code": response.status_code}

                except Exception:
                    pass

            # 3. 異常パターン検出
            anomaly_tests = [
                # 異常に長いURL
                {"test": "long_url", "path": "/api/v1/incidents/" + "A" * 1000},
                # 不正な文字
                {"test": "invalid_chars", "path": "/api/v1/incidents/<script>"},
                # エンコーディング攻撃
                {"test": "encoding_attack", "path": "/api/v1/incidents/%00"},
            ]

            for test in anomaly_tests:
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(
                            f"{self.base_url}{test['path']}", timeout=2
                        )

                        suspicious_status["anomaly_detection"][test["test"]] = {
                            "status_code": response.status_code,
                            "blocked": response.status_code in [400, 404, 403],
                        }

                except Exception:
                    suspicious_status["anomaly_detection"][test["test"]] = {
                        "status_code": "error",
                        "blocked": True,
                    }

            self.logger.info(
                f"Suspicious activity detection completed: {len(suspicious_status['suspicious_patterns'])} patterns found"
            )

        except Exception as e:
            suspicious_status["error"] = str(e)
            self.logger.error(f"Suspicious activity detection failed: {str(e)}")

        return suspicious_status

    async def detect_data_exposure(self) -> Dict[str, Any]:
        """データ露出・情報漏洩検知"""
        data_exposure_status = {
            "timestamp": datetime.now().isoformat(),
            "information_disclosure": {},
            "sensitive_data_exposure": {},
            "directory_listing": {},
            "exposure_risks": [],
        }

        try:
            # 1. 情報開示テスト
            info_endpoints = [
                "/api/v1/debug",
                "/api/v1/status",
                "/api/v1/config",
                "/api/v1/logs",
                "/server-info",
                "/phpinfo",
            ]

            for endpoint in info_endpoints:
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(
                            f"{self.base_url}{endpoint}", timeout=2
                        )

                        if response.status_code == 200:
                            # 機密情報の検出
                            sensitive_patterns = [
                                r"password",
                                r"secret",
                                r"key",
                                r"token",
                                r"database",
                                r"config",
                                r"debug",
                                r"version",
                            ]

                            response_text = response.text.lower()
                            exposed_info = []

                            for pattern in sensitive_patterns:
                                if re.search(pattern, response_text):
                                    exposed_info.append(pattern)

                            if exposed_info:
                                data_exposure_status["information_disclosure"][
                                    endpoint
                                ] = {"exposed": True, "sensitive_data": exposed_info}

                                data_exposure_status["exposure_risks"].append(
                                    f"Information disclosure at {endpoint}: {', '.join(exposed_info)}"
                                )

                                # 脅威として記録
                                threat = SecurityThreat(
                                    timestamp=datetime.now().isoformat(),
                                    threat_type="INFORMATION_DISCLOSURE",
                                    severity="medium",
                                    source_ip="security_test",
                                    endpoint=endpoint,
                                    user_agent="SecurityMonitor",
                                    payload=None,
                                    description=f"Information disclosure: {', '.join(exposed_info)}",
                                )
                                self.security_threats.append(threat)

                except Exception:
                    pass

            # 2. エラーメッセージでの情報漏洩テスト
            error_test_endpoints = [
                "/api/v1/nonexistent",
                "/api/v1/incidents/invalid_id",
                "/api/v1/users/999999",
            ]

            for endpoint in error_test_endpoints:
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(
                            f"{self.base_url}{endpoint}", timeout=2
                        )

                        if response.status_code >= 400:
                            # エラーメッセージでの情報露出チェック
                            error_disclosure_patterns = [
                                r"stack trace",
                                r"file path",
                                r"database.*error",
                                r"internal.*error",
                                r"debug.*info",
                            ]

                            response_text = response.text.lower()
                            disclosed_info = []

                            for pattern in error_disclosure_patterns:
                                if re.search(pattern, response_text):
                                    disclosed_info.append(pattern)

                            if disclosed_info:
                                data_exposure_status["sensitive_data_exposure"][
                                    endpoint
                                ] = {
                                    "error_code": response.status_code,
                                    "disclosed_info": disclosed_info,
                                }

                except Exception:
                    pass

            # 3. ディレクトリリスティングテスト
            directory_paths = [
                "/static/",
                "/assets/",
                "/uploads/",
                "/files/",
                "/backup/",
            ]

            for path in directory_paths:
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(f"{self.base_url}{path}", timeout=2)

                        if response.status_code == 200:
                            # ディレクトリリスティングの検出
                            listing_indicators = [
                                "index of",
                                "directory listing",
                                "<a href=",
                                "parent directory",
                            ]

                            response_text = response.text.lower()
                            if any(
                                indicator in response_text
                                for indicator in listing_indicators
                            ):
                                data_exposure_status["directory_listing"][path] = {
                                    "listing_enabled": True,
                                    "status_code": response.status_code,
                                }

                                data_exposure_status["exposure_risks"].append(
                                    f"Directory listing enabled: {path}"
                                )

                except Exception:
                    pass

            self.logger.info(
                f"Data exposure detection completed: {len(data_exposure_status['exposure_risks'])} risks found"
            )

        except Exception as e:
            data_exposure_status["error"] = str(e)
            self.logger.error(f"Data exposure detection failed: {str(e)}")

        return data_exposure_status

    async def check_security_configuration(self) -> Dict[str, Any]:
        """セキュリティ設定・ヘッダーチェック"""
        config_status = {
            "timestamp": datetime.now().isoformat(),
            "security_headers": {},
            "https_configuration": {},
            "cookie_security": {},
            "configuration_issues": [],
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/api/v1/health", timeout=5)

                # 1. セキュリティヘッダーチェック
                required_headers = {
                    "X-Content-Type-Options": "nosniff",
                    "X-Frame-Options": ["DENY", "SAMEORIGIN"],
                    "X-XSS-Protection": "1; mode=block",
                    "Strict-Transport-Security": None,  # HTTPS時のみ
                    "Content-Security-Policy": None,
                    "Referrer-Policy": None,
                }

                for header, expected_value in required_headers.items():
                    header_value = response.headers.get(header)

                    if header_value is None:
                        config_status["security_headers"][header] = {
                            "present": False,
                            "value": None,
                            "secure": False,
                        }
                        config_status["configuration_issues"].append(
                            f"Missing security header: {header}"
                        )
                    else:
                        is_secure = True
                        if expected_value:
                            if isinstance(expected_value, list):
                                is_secure = header_value in expected_value
                            else:
                                is_secure = expected_value in header_value

                        config_status["security_headers"][header] = {
                            "present": True,
                            "value": header_value,
                            "secure": is_secure,
                        }

                        if not is_secure:
                            config_status["configuration_issues"].append(
                                f"Insecure {header} header: {header_value}"
                            )

                # 2. HTTPS設定チェック
                if self.base_url.startswith("http://"):
                    config_status["https_configuration"] = {
                        "https_enabled": False,
                        "issues": ["HTTP used instead of HTTPS"],
                    }
                    config_status["configuration_issues"].append("HTTPS not enabled")
                else:
                    config_status["https_configuration"] = {
                        "https_enabled": True,
                        "issues": [],
                    }

                # 3. Cookieセキュリティチェック
                cookies_secure = True
                for cookie_name, cookie_value in response.cookies.items():
                    cookie_secure = "secure" in str(cookie_value).lower()
                    cookie_httponly = "httponly" in str(cookie_value).lower()

                    config_status["cookie_security"][cookie_name] = {
                        "secure_flag": cookie_secure,
                        "httponly_flag": cookie_httponly,
                        "samesite_flag": "samesite" in str(cookie_value).lower(),
                    }

                    if not cookie_secure:
                        cookies_secure = False
                        config_status["configuration_issues"].append(
                            f"Cookie {cookie_name} missing Secure flag"
                        )

                    if not cookie_httponly:
                        config_status["configuration_issues"].append(
                            f"Cookie {cookie_name} missing HttpOnly flag"
                        )

                # 4. サーバー情報漏洩チェック
                server_header = response.headers.get("Server")
                if server_header:
                    config_status["configuration_issues"].append(
                        f"Server information disclosed: {server_header}"
                    )

                x_powered_by = response.headers.get("X-Powered-By")
                if x_powered_by:
                    config_status["configuration_issues"].append(
                        f"Technology stack disclosed: {x_powered_by}"
                    )

            self.logger.info(
                f"Security configuration check completed: {len(config_status['configuration_issues'])} issues found"
            )

        except Exception as e:
            config_status["error"] = str(e)
            self.logger.error(f"Security configuration check failed: {str(e)}")

        return config_status

    async def analyze_threat_intelligence(self) -> Dict[str, Any]:
        """脅威インテリジェンス分析"""
        threat_intel_status = {
            "timestamp": datetime.now().isoformat(),
            "pattern_analysis": {},
            "threat_classification": {},
            "risk_assessment": {},
            "recommendations": [],
        }

        try:
            # 最近の脅威パターン分析
            recent_threats = [
                threat
                for threat in self.security_threats
                if datetime.fromisoformat(threat.timestamp)
                > datetime.now() - timedelta(hours=24)
            ]

            if recent_threats:
                # 脅威タイプ別分析
                threat_types = defaultdict(int)
                severity_distribution = defaultdict(int)
                source_ips = defaultdict(int)

                for threat in recent_threats:
                    threat_types[threat.threat_type] += 1
                    severity_distribution[threat.severity] += 1
                    if threat.source_ip:
                        source_ips[threat.source_ip] += 1

                threat_intel_status["pattern_analysis"] = {
                    "total_threats": len(recent_threats),
                    "threat_types": dict(threat_types),
                    "severity_distribution": dict(severity_distribution),
                    "top_source_ips": dict(
                        sorted(source_ips.items(), key=lambda x: x[1], reverse=True)[:5]
                    ),
                }

                # リスクアセスメント
                critical_threats = sum(
                    1 for t in recent_threats if t.severity == "critical"
                )
                high_threats = sum(1 for t in recent_threats if t.severity == "high")

                if critical_threats > 0:
                    risk_level = "critical"
                elif high_threats > 5:
                    risk_level = "high"
                elif len(recent_threats) > 20:
                    risk_level = "medium"
                else:
                    risk_level = "low"

                threat_intel_status["risk_assessment"] = {
                    "risk_level": risk_level,
                    "critical_threats": critical_threats,
                    "high_threats": high_threats,
                    "total_threats": len(recent_threats),
                }

                # 推奨事項生成
                if critical_threats > 0:
                    threat_intel_status["recommendations"].append(
                        "Immediate security review required for critical threats"
                    )

                if "SQL_INJECTION" in threat_types:
                    threat_intel_status["recommendations"].append(
                        "Implement parameterized queries and input validation"
                    )

                if "XSS" in threat_types:
                    threat_intel_status["recommendations"].append(
                        "Implement output encoding and CSP headers"
                    )

                if "RATE_LIMIT_VIOLATION" in threat_types:
                    threat_intel_status["recommendations"].append(
                        "Review and strengthen rate limiting policies"
                    )

                # 攻撃パターンの特定
                attack_patterns = []
                for ip, count in source_ips.items():
                    if count > 5:  # 同一IPから5回以上の脅威
                        attack_patterns.append(
                            f"Repeated attacks from {ip}: {count} incidents"
                        )

                threat_intel_status["pattern_analysis"][
                    "attack_patterns"
                ] = attack_patterns

            else:
                threat_intel_status["pattern_analysis"] = {
                    "total_threats": 0,
                    "message": "No recent threats detected",
                }
                threat_intel_status["risk_assessment"] = {
                    "risk_level": "low",
                    "message": "No security threats in the last 24 hours",
                }

            self.logger.info(
                f"Threat intelligence analysis completed: Risk level {threat_intel_status.get('risk_assessment', {}).get('risk_level', 'unknown')}"
            )

        except Exception as e:
            threat_intel_status["error"] = str(e)
            self.logger.error(f"Threat intelligence analysis failed: {str(e)}")

        return threat_intel_status

    async def execute_security_mitigation(self) -> Dict[str, Any]:
        """セキュリティ脅威の自動緩和"""
        mitigation_result = {
            "timestamp": datetime.now().isoformat(),
            "mitigations_applied": [],
            "blocked_ips_added": 0,
            "success": False,
        }

        try:
            # 1. 高頻度攻撃IPのブロック
            recent_threats = [
                threat
                for threat in self.security_threats
                if datetime.fromisoformat(threat.timestamp)
                > datetime.now() - timedelta(hours=1)
            ]

            source_ip_counts = defaultdict(int)
            for threat in recent_threats:
                if threat.source_ip and threat.source_ip not in self.whitelisted_ips:
                    source_ip_counts[threat.source_ip] += 1

            for ip, count in source_ip_counts.items():
                if count >= self.security_thresholds["auto_block_threshold"]:
                    if ip not in self.blocked_ips:
                        self.blocked_ips.add(ip)
                        mitigation_result["blocked_ips_added"] += 1
                        mitigation_result["mitigations_applied"].append(
                            f"Blocked IP {ip} (threat count: {count})"
                        )

            # 2. 脅威レベルに基づく緩和策
            critical_threats = [t for t in recent_threats if t.severity == "critical"]

            if critical_threats:
                # クリティカル脅威に対する緊急対応
                mitigation_result["mitigations_applied"].append(
                    "Emergency security mode activated for critical threats"
                )

                # 監視間隔を短縮
                original_interval = self.monitoring_interval
                self.monitoring_interval = max(10, original_interval // 2)
                mitigation_result["mitigations_applied"].append(
                    f"Monitoring interval reduced: {original_interval}s -> {self.monitoring_interval}s"
                )

            # 3. 認証失敗に対する緩和
            high_auth_failure_ips = []
            for ip, failed_count in self.failed_auth_tracker.items():
                if failed_count >= self.security_thresholds["max_failed_auth_attempts"]:
                    high_auth_failure_ips.append(ip)

            for ip in high_auth_failure_ips:
                if ip not in self.whitelisted_ips and ip not in self.blocked_ips:
                    self.blocked_ips.add(ip)
                    mitigation_result["blocked_ips_added"] += 1
                    mitigation_result["mitigations_applied"].append(
                        f"Blocked IP {ip} for authentication failures"
                    )

            # 4. ブロックリストの永続化
            await self.save_blocklist()

            # 5. セキュリティポリシーの動的調整
            if len(recent_threats) > 50:  # 高い脅威レベル
                mitigation_result["mitigations_applied"].append(
                    "Increased security monitoring due to high threat activity"
                )

            mitigation_result["success"] = True
            self.logger.info(
                f"Security mitigation completed: {len(mitigation_result['mitigations_applied'])} actions applied"
            )

        except Exception as e:
            mitigation_result.update({"success": False, "error": str(e)})
            self.logger.error(f"Security mitigation failed: {str(e)}")

        return mitigation_result

    async def emergency_security_response(self):
        """緊急セキュリティ対応"""
        self.logger.critical("Initiating emergency security response...")

        response_actions = []

        try:
            # 1. システム状態の記録
            threat_count = len(self.security_threats)
            blocked_count = len(self.blocked_ips)

            response_actions.append(
                f"System state: {threat_count} threats, {blocked_count} blocked IPs"
            )

            # 2. 緊急ブロックリストの拡張
            critical_threats = [
                t
                for t in self.security_threats[-100:]  # 最新100件
                if t.severity == "critical" and t.source_ip
            ]

            emergency_blocked = 0
            for threat in critical_threats:
                if (
                    threat.source_ip not in self.whitelisted_ips
                    and threat.source_ip not in self.blocked_ips
                ):
                    self.blocked_ips.add(threat.source_ip)
                    emergency_blocked += 1

            response_actions.append(
                f"Emergency blocked {emergency_blocked} critical threat IPs"
            )

            # 3. 監視強化
            original_interval = self.monitoring_interval
            self.monitoring_interval = 10  # 10秒間隔に強化
            response_actions.append(
                f"Enhanced monitoring: {original_interval}s -> {self.monitoring_interval}s"
            )

            # 4. 脅威履歴の分析とクリーンアップ
            high_severity_threats = len(
                [t for t in self.security_threats if t.severity in ["critical", "high"]]
            )

            # 古い脅威データをクリーンアップ（メモリ節約）
            cutoff_time = datetime.now() - timedelta(hours=6)
            original_count = len(self.security_threats)
            self.security_threats = [
                t
                for t in self.security_threats
                if datetime.fromisoformat(t.timestamp) > cutoff_time
                or t.severity in ["critical", "high"]
            ]
            cleaned_count = original_count - len(self.security_threats)

            response_actions.append(
                f"Threat data cleanup: {cleaned_count} old threats removed"
            )
            response_actions.append(
                f"High severity threats in system: {high_severity_threats}"
            )

            # 5. ブロックリスト保存
            await self.save_blocklist()
            response_actions.append("Emergency blocklist saved")

            # 6. システム安定化待機
            await asyncio.sleep(30)
            response_actions.append("System stabilization completed")

            self.logger.info(
                f"Emergency security response completed: {', '.join(response_actions)}"
            )

        except Exception as e:
            response_actions.append(f"Emergency response failed: {str(e)}")
            self.logger.error(f"Emergency security response failed: {str(e)}")

    async def generate_security_report(
        self,
        auth_status,
        injection_status,
        rate_limit_status,
        suspicious_status,
        data_exposure_status,
        security_config_status,
        threat_intel_status,
        mitigation_result,
    ):
        """セキュリティレポート生成"""
        try:
            # セキュリティメトリクス計算
            recent_threats = [
                threat
                for threat in self.security_threats
                if datetime.fromisoformat(threat.timestamp)
                > datetime.now() - timedelta(hours=24)
            ]

            threats_by_type = defaultdict(int)
            threats_by_severity = defaultdict(int)

            for threat in recent_threats:
                threats_by_type[threat.threat_type] += 1
                threats_by_severity[threat.severity] += 1

            # 緩和成功率計算
            total_threats = len(recent_threats)
            mitigated_threats = sum(1 for t in recent_threats if t.mitigation_applied)
            mitigation_success_rate = (
                mitigated_threats / total_threats if total_threats > 0 else 0
            )

            security_metrics = SecurityMetrics(
                timestamp=datetime.now().isoformat(),
                total_threats=total_threats,
                threats_by_type=dict(threats_by_type),
                threats_by_severity=dict(threats_by_severity),
                blocked_ips=len(self.blocked_ips),
                suspicious_activities=len(
                    suspicious_status.get("suspicious_patterns", [])
                ),
                authentication_failures=sum(self.failed_auth_tracker.values()),
                authorization_violations=len(
                    auth_status.get("vulnerabilities_found", [])
                ),
                data_exposure_attempts=len(
                    data_exposure_status.get("exposure_risks", [])
                ),
                mitigation_success_rate=mitigation_success_rate,
            )

            # 総合レポート
            security_report = {
                "timestamp": datetime.now().isoformat(),
                "security_metrics": asdict(security_metrics),
                "detailed_analysis": {
                    "authentication_security": auth_status,
                    "injection_attacks": injection_status,
                    "rate_limiting": rate_limit_status,
                    "suspicious_activities": suspicious_status,
                    "data_exposure": data_exposure_status,
                    "security_configuration": security_config_status,
                    "threat_intelligence": threat_intel_status,
                    "mitigation_results": mitigation_result,
                },
                "overall_security_status": self._calculate_overall_security_status(
                    auth_status,
                    injection_status,
                    rate_limit_status,
                    suspicious_status,
                    data_exposure_status,
                    security_config_status,
                ),
                "blocked_ips": list(self.blocked_ips),
                "security_recommendations": self._generate_security_recommendations(
                    auth_status,
                    injection_status,
                    data_exposure_status,
                    security_config_status,
                ),
            }

            # レポート保存
            with open(self.metrics_file, "w") as f:
                json.dump(security_report, f, indent=2)

            # 詳細ログ保存
            report_file = f"/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/security_report_{int(time.time())}.json"
            with open(report_file, "w") as f:
                json.dump(security_report, f, indent=2)

            self.logger.info(
                f"Security report generated: {security_report['overall_security_status']} status"
            )

        except Exception as e:
            self.logger.error(f"Failed to generate security report: {str(e)}")

    def _calculate_overall_security_status(
        self,
        auth_status,
        injection_status,
        rate_limit_status,
        suspicious_status,
        data_exposure_status,
        security_config_status,
    ) -> str:
        """総合セキュリティ状態計算"""
        # クリティカル問題の検出
        if auth_status.get("overall_status") == "vulnerable":
            return "critical"

        if len(injection_status.get("detected_attacks", [])) > 0:
            return "critical"

        if len(data_exposure_status.get("exposure_risks", [])) > 3:
            return "critical"

        # 警告レベルの問題
        warning_conditions = [
            len(suspicious_status.get("suspicious_patterns", [])) > 5,
            len(security_config_status.get("configuration_issues", [])) > 3,
            rate_limit_status.get("rate_violations", 0) > 2,
            len(self.security_threats) > 20,
        ]

        if any(warning_conditions):
            return "warning"

        # マイナーな問題
        if len(security_config_status.get("configuration_issues", [])) > 0:
            return "attention_needed"

        return "secure"

    def _generate_security_recommendations(
        self,
        auth_status,
        injection_status,
        data_exposure_status,
        security_config_status,
    ) -> List[str]:
        """セキュリティ推奨事項生成"""
        recommendations = []

        try:
            # 認証関連
            auth_issues = auth_status.get("vulnerabilities_found", [])
            if auth_issues:
                recommendations.append(
                    "Strengthen authentication mechanisms and access controls"
                )

            # インジェクション攻撃
            injection_attacks = injection_status.get("detected_attacks", [])
            if injection_attacks:
                recommendations.append(
                    "Implement input validation and parameterized queries"
                )
                recommendations.append("Deploy Web Application Firewall (WAF)")

            # データ露出
            exposure_risks = data_exposure_status.get("exposure_risks", [])
            if exposure_risks:
                recommendations.append(
                    "Review and secure information disclosure endpoints"
                )
                recommendations.append(
                    "Implement proper error handling to prevent information leakage"
                )

            # 設定問題
            config_issues = security_config_status.get("configuration_issues", [])
            if config_issues:
                recommendations.append("Configure security headers and HTTPS")
                recommendations.append("Secure cookie settings and session management")

            # 脅威レベル対応
            recent_threats = len(
                [
                    t
                    for t in self.security_threats
                    if datetime.fromisoformat(t.timestamp)
                    > datetime.now() - timedelta(hours=24)
                ]
            )

            if recent_threats > 10:
                recommendations.append(
                    "Enhance monitoring and incident response capabilities"
                )

            if len(self.blocked_ips) > 20:
                recommendations.append(
                    "Review IP blocking policies and whitelist management"
                )

            # 一般的な推奨事項
            if not recommendations:
                recommendations.append(
                    "Maintain current security posture and continue monitoring"
                )

        except Exception as e:
            recommendations.append(f"Error generating recommendations: {str(e)}")

        return recommendations[:10]  # 最大10件

    async def load_blocklist(self):
        """ブロックリストの読み込み"""
        try:
            if os.path.exists(self.blocklist_file):
                with open(self.blocklist_file, "r") as f:
                    data = json.load(f)
                    self.blocked_ips = set(data.get("blocked_ips", []))
                    self.logger.info(f"Loaded {len(self.blocked_ips)} blocked IPs")
        except Exception as e:
            self.logger.error(f"Failed to load blocklist: {str(e)}")

    async def save_blocklist(self):
        """ブロックリストの保存"""
        try:
            blocklist_data = {
                "timestamp": datetime.now().isoformat(),
                "blocked_ips": list(self.blocked_ips),
                "total_blocked": len(self.blocked_ips),
            }

            with open(self.blocklist_file, "w") as f:
                json.dump(blocklist_data, f, indent=2)

            self.logger.info(f"Saved {len(self.blocked_ips)} blocked IPs")

        except Exception as e:
            self.logger.error(f"Failed to save blocklist: {str(e)}")

    async def cleanup_old_security_data(self):
        """古いセキュリティデータのクリーンアップ"""
        try:
            # 脅威履歴のクリーンアップ（7日以上古いものを削除）
            cutoff_time = datetime.now() - timedelta(days=7)

            original_count = len(self.security_threats)
            self.security_threats = [
                threat
                for threat in self.security_threats
                if datetime.fromisoformat(threat.timestamp) > cutoff_time
            ]
            cleaned_count = original_count - len(self.security_threats)

            if cleaned_count > 0:
                self.logger.info(f"Cleaned up {cleaned_count} old security threats")

            # レート制限トラッカーのクリーンアップ
            current_time = datetime.now()
            window_start = current_time - timedelta(
                minutes=self.security_thresholds["rate_limit_window_minutes"]
            )

            for ip, timestamps in list(self.rate_limit_tracker.items()):
                # 古いタイムスタンプを削除
                while (
                    timestamps and datetime.fromisoformat(timestamps[0]) < window_start
                ):
                    timestamps.popleft()

                # 空になったエントリを削除
                if not timestamps:
                    del self.rate_limit_tracker[ip]

            # 認証失敗トラッカーのリセット（1時間毎）
            if hasattr(self, "_last_auth_reset"):
                if datetime.now() - self._last_auth_reset > timedelta(hours=1):
                    self.failed_auth_tracker.clear()
                    self._last_auth_reset = datetime.now()
            else:
                self._last_auth_reset = datetime.now()

        except Exception as e:
            self.logger.error(f"Security data cleanup failed: {str(e)}")

    def stop_monitoring(self):
        """セキュリティ監視停止"""
        self.monitoring_active = False
        self.logger.info("Security monitoring stopped")


# 使用例とエントリーポイント
async def main():
    """メイン実行関数"""
    security_monitor = SecurityErrorMonitor()

    try:
        await security_monitor.start_infinite_security_monitoring()
    except KeyboardInterrupt:
        security_monitor.stop_monitoring()
        print("Security monitoring stopped by user")
    except Exception as e:
        print(f"Security monitoring failed: {str(e)}")


if __name__ == "__main__":
    # ログ設定
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler(
                "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/security_monitor.log"
            ),
            logging.StreamHandler(),
        ],
    )

    # 非同期実行
    asyncio.run(main())
