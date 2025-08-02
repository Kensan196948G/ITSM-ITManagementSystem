"""
セキュリティ監視・ITSMコンプライアンスシステム
- セキュリティイベント監視
- ITSMフレームワーク準拠チェック
- コンプライアンス監査
- セキュリティアラート管理
- 自動脅威対応
"""

import asyncio
import aiofiles
import json
import logging
import hashlib
import ipaddress
import re
import ssl
import socket
from typing import Dict, List, Optional, Any, Set, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from pathlib import Path
from enum import Enum
import requests
import psutil

logger = logging.getLogger(__name__)

class SecurityLevel(Enum):
    """セキュリティレベル"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ThreatType(Enum):
    """脅威タイプ"""
    BRUTE_FORCE = "brute_force"
    SQL_INJECTION = "sql_injection"
    XSS_ATTACK = "xss_attack"
    CSRF_ATTACK = "csrf_attack"
    DDoS_ATTACK = "ddos_attack"
    MALWARE = "malware"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    DATA_BREACH = "data_breach"
    PRIVILEGE_ESCALATION = "privilege_escalation"

class ComplianceFramework(Enum):
    """コンプライアンスフレームワーク"""
    ITSM_V4 = "itsm_v4"
    ISO_27001 = "iso_27001"
    GDPR = "gdpr"
    SOC2 = "soc2"
    PCI_DSS = "pci_dss"

@dataclass
class SecurityEvent:
    """セキュリティイベント"""
    event_id: str
    timestamp: datetime
    threat_type: ThreatType
    severity: SecurityLevel
    source_ip: str
    target_endpoint: str
    description: str
    evidence: Dict[str, Any]
    blocked: bool = False
    response_action: Optional[str] = None
    false_positive: bool = False

@dataclass
class ComplianceCheck:
    """コンプライアンスチェック"""
    check_id: str
    framework: ComplianceFramework
    control_id: str
    control_name: str
    description: str
    compliant: bool
    evidence: Dict[str, Any]
    remediation_required: bool
    remediation_steps: List[str]
    last_checked: datetime

@dataclass
class SecurityMetrics:
    """セキュリティメトリクス"""
    timestamp: datetime
    total_events: int
    blocked_events: int
    unique_threats: int
    blocked_ips: int
    compliance_score: float
    security_score: float
    vulnerability_count: int
    false_positive_rate: float

class SecurityComplianceMonitor:
    """セキュリティ監視・ITSMコンプライアンスシステム"""
    
    def __init__(self, backend_url: str = "http://192.168.3.135:8000"):
        self.backend_url = backend_url
        self.backend_path = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend")
        self.coordination_path = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination")
        
        # データストレージ
        self.security_events: List[SecurityEvent] = []
        self.compliance_checks: List[ComplianceCheck] = []
        self.security_metrics: List[SecurityMetrics] = []
        self.blocked_ips: Set[str] = set()
        self.suspicious_ips: Dict[str, int] = {}  # IP -> 疑わしい活動カウント
        self.whitelist_ips: Set[str] = set()
        
        # 設定
        self.config = {
            "monitoring_enabled": True,
            "auto_blocking": True,
            "suspicious_threshold": 5,  # 疑わしい活動の閾値
            "block_duration_hours": 24,
            "compliance_check_interval_hours": 6,
            "security_scan_interval_minutes": 15,
            "log_retention_days": 30
        }
        
        # セキュリティルール
        self.security_rules = {
            "brute_force_detection": {
                "enabled": True,
                "max_failed_attempts": 5,
                "time_window_minutes": 10,
                "block_duration_hours": 1
            },
            "sql_injection_detection": {
                "enabled": True,
                "patterns": [
                    r"(\s|^)(union|select|insert|delete|update|drop|create|alter)\s",
                    r"('|\")(\s)*(or|and)(\s)*('|\")?\s*=\s*('|\")?\s*('|\")",
                    r"1\s*=\s*1",
                    r"--\s*$",
                    r"/\*.*\*/"
                ]
            },
            "xss_detection": {
                "enabled": True,
                "patterns": [
                    r"<script[^>]*>.*?</script>",
                    r"javascript:",
                    r"on\w+\s*=",
                    r"<iframe",
                    r"eval\("
                ]
            },
            "rate_limiting": {
                "enabled": True,
                "max_requests_per_minute": 100,
                "burst_threshold": 200
            }
        }
        
        # ITSMコンプライアンスチェック項目
        self.itsm_compliance_checks = {
            "incident_management": {
                "description": "インシデント管理プロセスの実装",
                "requirements": [
                    "インシデント記録システムの存在",
                    "エスカレーション手順の定義",
                    "SLA遵守の監視",
                    "事後レビューの実施"
                ]
            },
            "change_management": {
                "description": "変更管理プロセスの実装",
                "requirements": [
                    "変更承認プロセスの存在",
                    "変更記録の維持",
                    "リスク評価の実施",
                    "ロールバック手順の準備"
                ]
            },
            "access_control": {
                "description": "アクセス制御の実装",
                "requirements": [
                    "ユーザー認証の実装",
                    "権限管理の実装",
                    "監査ログの記録",
                    "定期的なアクセス権レビュー"
                ]
            },
            "data_protection": {
                "description": "データ保護の実装",
                "requirements": [
                    "データ暗号化の実装",
                    "バックアップ戦略の実装",
                    "データ保持ポリシーの遵守",
                    "データ漏洩対策の実装"
                ]
            },
            "monitoring_logging": {
                "description": "監視・ログ記録の実装",
                "requirements": [
                    "システム監視の実装",
                    "セキュリティログの記録",
                    "アラート機能の実装",
                    "ログ分析の実施"
                ]
            }
        }
    
    async def start_security_monitoring(self):
        """セキュリティ監視を開始"""
        logger.info("🔒 セキュリティ監視・ITSMコンプライアンスシステム開始")
        
        # 初期化
        await self._initialize_security_system()
        
        # 並列監視タスク開始
        tasks = [
            self._run_security_monitoring(),
            self._run_compliance_monitoring(),
            self._run_threat_detection(),
            self._run_vulnerability_scanning()
        ]
        
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _initialize_security_system(self):
        """セキュリティシステムの初期化"""
        try:
            # ホワイトリストIPの設定
            self.whitelist_ips.update([
                "127.0.0.1",
                "localhost",
                "192.168.3.135",  # バックエンドサーバー
                "::1"
            ])
            
            # 既存のセキュリティデータ読み込み
            await self._load_security_data()
            
            # 初期コンプライアンスチェック
            await self._perform_initial_compliance_check()
            
            logger.info("セキュリティシステム初期化完了")
            
        except Exception as e:
            logger.error(f"セキュリティシステム初期化エラー: {e}")
            raise
    
    async def _run_security_monitoring(self):
        """セキュリティ監視ループ"""
        while True:
            try:
                # ログファイル監視
                await self._monitor_security_logs()
                
                # ネットワーク監視
                await self._monitor_network_activity()
                
                # システムリソース監視
                await self._monitor_system_security()
                
                # 疑わしいIPの更新
                await self._update_suspicious_ips()
                
                await asyncio.sleep(self.config["security_scan_interval_minutes"] * 60)
                
            except Exception as e:
                logger.error(f"セキュリティ監視エラー: {e}")
                await asyncio.sleep(60)
    
    async def _run_compliance_monitoring(self):
        """コンプライアンス監視ループ"""
        while True:
            try:
                # ITSMコンプライアンスチェック
                await self._check_itsm_compliance()
                
                # セキュリティコンプライアンスチェック
                await self._check_security_compliance()
                
                # 監査証跡の確認
                await self._check_audit_trail()
                
                # コンプライアンスレポート生成
                await self._generate_compliance_report()
                
                await asyncio.sleep(self.config["compliance_check_interval_hours"] * 3600)
                
            except Exception as e:
                logger.error(f"コンプライアンス監視エラー: {e}")
                await asyncio.sleep(3600)
    
    async def _run_threat_detection(self):
        """脅威検出ループ"""
        while True:
            try:
                # API エンドポイント監視
                await self._detect_api_threats()
                
                # ログベース脅威検出
                await self._detect_log_based_threats()
                
                # 異常行動検出
                await self._detect_anomalous_behavior()
                
                # 脅威インテリジェンス連携
                await self._check_threat_intelligence()
                
                await asyncio.sleep(300)  # 5分間隔
                
            except Exception as e:
                logger.error(f"脅威検出エラー: {e}")
                await asyncio.sleep(60)
    
    async def _run_vulnerability_scanning(self):
        """脆弱性スキャンループ"""
        while True:
            try:
                # システム脆弱性スキャン
                vulnerabilities = await self._scan_system_vulnerabilities()
                
                # 設定脆弱性チェック
                config_issues = await self._check_configuration_vulnerabilities()
                
                # 依存関係脆弱性チェック
                dependency_issues = await self._check_dependency_vulnerabilities()
                
                # 脆弱性レポート生成
                await self._generate_vulnerability_report(vulnerabilities, config_issues, dependency_issues)
                
                await asyncio.sleep(24 * 3600)  # 24時間間隔
                
            except Exception as e:
                logger.error(f"脆弱性スキャンエラー: {e}")
                await asyncio.sleep(3600)
    
    # === セキュリティ監視機能 ===
    
    async def _monitor_security_logs(self):
        """セキュリティログ監視"""
        try:
            log_files = [
                self.backend_path / "logs" / "itsm_error.log",
                self.backend_path / "logs" / "itsm_audit.log",
                self.backend_path / "logs" / "itsm_access.log"
            ]
            
            for log_file in log_files:
                if log_file.exists():
                    await self._analyze_log_file(log_file)
                    
        except Exception as e:
            logger.error(f"セキュリティログ監視エラー: {e}")
    
    async def _analyze_log_file(self, log_file: Path):
        """ログファイルを分析"""
        try:
            # 最新の100行を読み込み
            async with aiofiles.open(log_file, 'r', encoding='utf-8') as f:
                lines = await f.readlines()
                recent_lines = lines[-100:]
            
            for line in recent_lines:
                await self._analyze_log_entry(line, str(log_file))
                
        except Exception as e:
            logger.error(f"ログファイル分析エラー {log_file}: {e}")
    
    async def _analyze_log_entry(self, log_entry: str, source_file: str):
        """ログエントリを分析"""
        try:
            # SQLインジェクション検出
            if self.security_rules["sql_injection_detection"]["enabled"]:
                for pattern in self.security_rules["sql_injection_detection"]["patterns"]:
                    if re.search(pattern, log_entry, re.IGNORECASE):
                        await self._create_security_event(
                            ThreatType.SQL_INJECTION,
                            SecurityLevel.HIGH,
                            self._extract_ip_from_log(log_entry),
                            "API",
                            f"SQL injection detected in log: {log_entry[:100]}",
                            {"log_file": source_file, "log_entry": log_entry}
                        )
            
            # XSS攻撃検出
            if self.security_rules["xss_detection"]["enabled"]:
                for pattern in self.security_rules["xss_detection"]["patterns"]:
                    if re.search(pattern, log_entry, re.IGNORECASE):
                        await self._create_security_event(
                            ThreatType.XSS_ATTACK,
                            SecurityLevel.MEDIUM,
                            self._extract_ip_from_log(log_entry),
                            "API",
                            f"XSS attack detected in log: {log_entry[:100]}",
                            {"log_file": source_file, "log_entry": log_entry}
                        )
            
            # 認証失敗検出
            if "authentication failed" in log_entry.lower() or "login failed" in log_entry.lower():
                ip = self._extract_ip_from_log(log_entry)
                await self._track_failed_authentication(ip)
                
        except Exception as e:
            logger.error(f"ログエントリ分析エラー: {e}")
    
    async def _monitor_network_activity(self):
        """ネットワーク活動監視"""
        try:
            # アクティブな接続を監視
            connections = psutil.net_connections(kind='inet')
            suspicious_connections = []
            
            for conn in connections:
                if conn.status == 'ESTABLISHED' and conn.raddr:
                    remote_ip = conn.raddr.ip
                    
                    # 疑わしいIPかチェック
                    if await self._is_suspicious_ip(remote_ip):
                        suspicious_connections.append(conn)
            
            if suspicious_connections:
                for conn in suspicious_connections:
                    await self._create_security_event(
                        ThreatType.UNAUTHORIZED_ACCESS,
                        SecurityLevel.MEDIUM,
                        conn.raddr.ip,
                        f"Port {conn.laddr.port}",
                        f"Suspicious connection from {conn.raddr.ip}:{conn.raddr.port}",
                        {"connection_info": str(conn)}
                    )
                    
        except Exception as e:
            logger.error(f"ネットワーク活動監視エラー: {e}")
    
    async def _monitor_system_security(self):
        """システムセキュリティ監視"""
        try:
            # プロセス監視
            await self._monitor_processes()
            
            # ファイルシステム監視
            await self._monitor_file_system()
            
            # ポート監視
            await self._monitor_open_ports()
            
        except Exception as e:
            logger.error(f"システムセキュリティ監視エラー: {e}")
    
    async def _detect_api_threats(self):
        """API脅威検出"""
        try:
            # API エンドポイントへのリクエスト監視
            test_endpoints = [
                "/api/v1/auth/login",
                "/api/v1/users",
                "/api/v1/incidents"
            ]
            
            for endpoint in test_endpoints:
                # レート制限チェック
                await self._check_rate_limiting(endpoint)
                
                # 異常なペイロードチェック
                await self._check_malicious_payloads(endpoint)
                
        except Exception as e:
            logger.error(f"API脅威検出エラー: {e}")
    
    # === コンプライアンスチェック ===
    
    async def _check_itsm_compliance(self):
        """ITSMコンプライアンスチェック"""
        try:
            for check_category, check_info in self.itsm_compliance_checks.items():
                compliant = True
                evidence = {}
                remediation_steps = []
                
                # カテゴリ別チェック実行
                if check_category == "incident_management":
                    compliant, evidence, remediation_steps = await self._check_incident_management()
                elif check_category == "change_management":
                    compliant, evidence, remediation_steps = await self._check_change_management()
                elif check_category == "access_control":
                    compliant, evidence, remediation_steps = await self._check_access_control()
                elif check_category == "data_protection":
                    compliant, evidence, remediation_steps = await self._check_data_protection()
                elif check_category == "monitoring_logging":
                    compliant, evidence, remediation_steps = await self._check_monitoring_logging()
                
                # コンプライアンスチェック結果を記録
                compliance_check = ComplianceCheck(
                    check_id=f"itsm_{check_category}_{int(datetime.now().timestamp())}",
                    framework=ComplianceFramework.ITSM_V4,
                    control_id=check_category,
                    control_name=check_info["description"],
                    description=f"ITSM v4.0 compliance check for {check_category}",
                    compliant=compliant,
                    evidence=evidence,
                    remediation_required=not compliant,
                    remediation_steps=remediation_steps,
                    last_checked=datetime.now()
                )
                
                self.compliance_checks.append(compliance_check)
                
        except Exception as e:
            logger.error(f"ITSMコンプライアンスチェックエラー: {e}")
    
    async def _check_incident_management(self) -> Tuple[bool, Dict[str, Any], List[str]]:
        """インシデント管理コンプライアンスチェック"""
        evidence = {}
        remediation_steps = []
        
        # インシデント記録システムの確認
        incidents_api_exists = (self.backend_path / "app" / "api" / "v1" / "incidents.py").exists()
        evidence["incidents_api_exists"] = incidents_api_exists
        
        if not incidents_api_exists:
            remediation_steps.append("インシデント管理APIの実装")
        
        # データベーステーブルの確認
        db_file = self.backend_path / "itsm.db"
        incidents_table_exists = False
        if db_file.exists():
            try:
                import sqlite3
                conn = sqlite3.connect(str(db_file))
                tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
                incidents_table_exists = any("incidents" in table[0] for table in tables)
                conn.close()
            except Exception:
                pass
        
        evidence["incidents_table_exists"] = incidents_table_exists
        
        if not incidents_table_exists:
            remediation_steps.append("インシデントデータベーステーブルの作成")
        
        compliant = incidents_api_exists and incidents_table_exists
        
        return compliant, evidence, remediation_steps
    
    async def _check_change_management(self) -> Tuple[bool, Dict[str, Any], List[str]]:
        """変更管理コンプライアンスチェック"""
        evidence = {}
        remediation_steps = []
        
        # 変更管理APIの確認
        changes_api_exists = (self.backend_path / "app" / "api" / "v1" / "changes.py").exists()
        evidence["changes_api_exists"] = changes_api_exists
        
        if not changes_api_exists:
            remediation_steps.append("変更管理APIの実装")
        
        # 変更記録テーブルの確認
        db_file = self.backend_path / "itsm.db"
        changes_table_exists = False
        if db_file.exists():
            try:
                import sqlite3
                conn = sqlite3.connect(str(db_file))
                tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
                changes_table_exists = any("changes" in table[0] for table in tables)
                conn.close()
            except Exception:
                pass
        
        evidence["changes_table_exists"] = changes_table_exists
        
        if not changes_table_exists:
            remediation_steps.append("変更管理データベーステーブルの作成")
        
        compliant = changes_api_exists and changes_table_exists
        
        return compliant, evidence, remediation_steps
    
    async def _check_access_control(self) -> Tuple[bool, Dict[str, Any], List[str]]:
        """アクセス制御コンプライアンスチェック"""
        evidence = {}
        remediation_steps = []
        
        # 認証システムの確認
        auth_api_exists = (self.backend_path / "app" / "api" / "v1" / "auth.py").exists()
        security_module_exists = (self.backend_path / "app" / "core" / "security.py").exists()
        
        evidence["auth_api_exists"] = auth_api_exists
        evidence["security_module_exists"] = security_module_exists
        
        if not auth_api_exists:
            remediation_steps.append("認証APIの実装")
        if not security_module_exists:
            remediation_steps.append("セキュリティモジュールの実装")
        
        # 監査ログの確認
        audit_log_exists = (self.backend_path / "logs" / "itsm_audit.log").exists()
        evidence["audit_log_exists"] = audit_log_exists
        
        if not audit_log_exists:
            remediation_steps.append("監査ログ機能の実装")
        
        compliant = auth_api_exists and security_module_exists and audit_log_exists
        
        return compliant, evidence, remediation_steps
    
    async def _check_data_protection(self) -> Tuple[bool, Dict[str, Any], List[str]]:
        """データ保護コンプライアンスチェック"""
        evidence = {}
        remediation_steps = []
        
        # データベース暗号化の確認（SQLiteの場合は限定的）
        db_file = self.backend_path / "itsm.db"
        db_exists = db_file.exists()
        evidence["database_exists"] = db_exists
        
        # バックアップディレクトリの確認
        backup_dir = self.backend_path / "backups"
        backup_dir_exists = backup_dir.exists()
        evidence["backup_dir_exists"] = backup_dir_exists
        
        if not backup_dir_exists:
            remediation_steps.append("バックアップディレクトリの作成とバックアップ戦略の実装")
        
        # ログ暗号化・保護の確認
        logs_dir = self.backend_path / "logs"
        logs_protected = logs_dir.exists() and oct(logs_dir.stat().st_mode)[-3:] <= "755"
        evidence["logs_protected"] = logs_protected
        
        if not logs_protected:
            remediation_steps.append("ログファイルのアクセス権限強化")
        
        compliant = db_exists and backup_dir_exists and logs_protected
        
        return compliant, evidence, remediation_steps
    
    async def _check_monitoring_logging(self) -> Tuple[bool, Dict[str, Any], List[str]]:
        """監視・ログ記録コンプライアンスチェック"""
        evidence = {}
        remediation_steps = []
        
        # 監視システムの確認
        monitoring_service_exists = (self.backend_path / "app" / "services" / "api_error_monitor.py").exists()
        evidence["monitoring_service_exists"] = monitoring_service_exists
        
        if not monitoring_service_exists:
            remediation_steps.append("監視サービスの実装")
        
        # ログファイルの確認
        required_logs = ["itsm.log", "itsm_error.log", "itsm_audit.log"]
        logs_dir = self.backend_path / "logs"
        existing_logs = []
        
        if logs_dir.exists():
            existing_logs = [log.name for log in logs_dir.glob("*.log")]
        
        evidence["existing_logs"] = existing_logs
        evidence["required_logs"] = required_logs
        
        missing_logs = set(required_logs) - set(existing_logs)
        if missing_logs:
            remediation_steps.append(f"不足ログファイルの作成: {', '.join(missing_logs)}")
        
        # アラート機能の確認
        alert_system_exists = (self.backend_path / "app" / "services" / "alert_manager.py").exists()
        evidence["alert_system_exists"] = alert_system_exists
        
        if not alert_system_exists:
            remediation_steps.append("アラートシステムの実装")
        
        compliant = monitoring_service_exists and not missing_logs and alert_system_exists
        
        return compliant, evidence, remediation_steps
    
    # === 脅威対応 ===
    
    async def _create_security_event(
        self,
        threat_type: ThreatType,
        severity: SecurityLevel,
        source_ip: str,
        target_endpoint: str,
        description: str,
        evidence: Dict[str, Any]
    ):
        """セキュリティイベントを作成"""
        try:
            event_id = hashlib.md5(f"{threat_type.value}{source_ip}{datetime.now()}".encode()).hexdigest()[:8]
            
            # 自動ブロック判定
            blocked = False
            response_action = None
            
            if self.config["auto_blocking"] and source_ip not in self.whitelist_ips:
                if severity in [SecurityLevel.HIGH, SecurityLevel.CRITICAL]:
                    blocked = True
                    self.blocked_ips.add(source_ip)
                    response_action = f"IP {source_ip} を自動ブロック"
                    
                    # ブロック解除のスケジュール
                    await self._schedule_ip_unblock(source_ip, self.config["block_duration_hours"])
                elif threat_type == ThreatType.BRUTE_FORCE:
                    # ブルートフォース攻撃の場合は即座にブロック
                    blocked = True
                    self.blocked_ips.add(source_ip)
                    response_action = f"IP {source_ip} をブルートフォース攻撃によりブロック"
            
            # セキュリティイベント作成
            security_event = SecurityEvent(
                event_id=event_id,
                timestamp=datetime.now(),
                threat_type=threat_type,
                severity=severity,
                source_ip=source_ip,
                target_endpoint=target_endpoint,
                description=description,
                evidence=evidence,
                blocked=blocked,
                response_action=response_action
            )
            
            self.security_events.append(security_event)
            
            # アラート送信
            await self._send_security_alert(security_event)
            
            # セキュリティログに記録
            await self._log_security_event(security_event)
            
            logger.warning(f"セキュリティイベント作成: {threat_type.value} from {source_ip} - {description}")
            
        except Exception as e:
            logger.error(f"セキュリティイベント作成エラー: {e}")
    
    async def _track_failed_authentication(self, ip: str):
        """認証失敗の追跡"""
        if ip in self.whitelist_ips:
            return
        
        # 疑わしいIPカウンターを更新
        self.suspicious_ips[ip] = self.suspicious_ips.get(ip, 0) + 1
        
        # ブルートフォース攻撃判定
        if self.suspicious_ips[ip] >= self.security_rules["brute_force_detection"]["max_failed_attempts"]:
            await self._create_security_event(
                ThreatType.BRUTE_FORCE,
                SecurityLevel.HIGH,
                ip,
                "/api/v1/auth/login",
                f"Brute force attack detected: {self.suspicious_ips[ip]} failed attempts",
                {"failed_attempts": self.suspicious_ips[ip]}
            )
    
    # === ユーティリティ関数 ===
    
    def _extract_ip_from_log(self, log_entry: str) -> str:
        """ログエントリからIPアドレスを抽出"""
        ip_pattern = r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'
        match = re.search(ip_pattern, log_entry)
        return match.group() if match else "unknown"
    
    async def _is_suspicious_ip(self, ip: str) -> bool:
        """IPが疑わしいかチェック"""
        return ip in self.suspicious_ips or ip in self.blocked_ips
    
    async def _schedule_ip_unblock(self, ip: str, hours: int):
        """IPのブロック解除をスケジュール"""
        async def unblock_ip():
            await asyncio.sleep(hours * 3600)
            if ip in self.blocked_ips:
                self.blocked_ips.remove(ip)
                logger.info(f"IP {ip} のブロックを解除しました")
        
        asyncio.create_task(unblock_ip())
    
    async def _send_security_alert(self, event: SecurityEvent):
        """セキュリティアラート送信"""
        try:
            # アラートファイルに記録
            alert_file = self.coordination_path / "security_alerts.json"
            
            alert_data = {
                "timestamp": event.timestamp.isoformat(),
                "event_id": event.event_id,
                "threat_type": event.threat_type.value,
                "severity": event.severity.value,
                "source_ip": event.source_ip,
                "description": event.description,
                "blocked": event.blocked
            }
            
            existing_alerts = []
            if alert_file.exists():
                async with aiofiles.open(alert_file, 'r', encoding='utf-8') as f:
                    existing_alerts = json.loads(await f.read())
            
            existing_alerts.append(alert_data)
            # 最新100件のみ保持
            existing_alerts = existing_alerts[-100:]
            
            async with aiofiles.open(alert_file, 'w', encoding='utf-8') as f:
                await f.write(json.dumps(existing_alerts, indent=2, ensure_ascii=False))
                
        except Exception as e:
            logger.error(f"セキュリティアラート送信エラー: {e}")
    
    async def _log_security_event(self, event: SecurityEvent):
        """セキュリティイベントをログに記録"""
        try:
            security_log = self.backend_path / "logs" / "itsm_security.log"
            
            log_entry = {
                "timestamp": event.timestamp.isoformat(),
                "event_id": event.event_id,
                "threat_type": event.threat_type.value,
                "severity": event.severity.value,
                "source_ip": event.source_ip,
                "target_endpoint": event.target_endpoint,
                "description": event.description,
                "blocked": event.blocked,
                "response_action": event.response_action
            }
            
            async with aiofiles.open(security_log, 'a', encoding='utf-8') as f:
                await f.write(f"{json.dumps(log_entry, ensure_ascii=False)}\n")
                
        except Exception as e:
            logger.error(f"セキュリティログ記録エラー: {e}")
    
    # === データ管理 ===
    
    async def _load_security_data(self):
        """セキュリティデータの読み込み"""
        try:
            # ブロックIPリストの読み込み
            blocked_ips_file = self.coordination_path / "blocked_ips.json"
            if blocked_ips_file.exists():
                async with aiofiles.open(blocked_ips_file, 'r', encoding='utf-8') as f:
                    data = json.loads(await f.read())
                    self.blocked_ips.update(data.get("blocked_ips", []))
                    self.suspicious_ips.update(data.get("suspicious_ips", {}))
            
        except Exception as e:
            logger.error(f"セキュリティデータ読み込みエラー: {e}")
    
    async def _save_security_data(self):
        """セキュリティデータの保存"""
        try:
            # ブロックIPリストの保存
            blocked_ips_file = self.coordination_path / "blocked_ips.json"
            
            data = {
                "blocked_ips": list(self.blocked_ips),
                "suspicious_ips": self.suspicious_ips,
                "last_updated": datetime.now().isoformat()
            }
            
            async with aiofiles.open(blocked_ips_file, 'w', encoding='utf-8') as f:
                await f.write(json.dumps(data, indent=2, ensure_ascii=False))
                
        except Exception as e:
            logger.error(f"セキュリティデータ保存エラー: {e}")
    
    # === 公開API ===
    
    def get_security_status(self) -> Dict[str, Any]:
        """セキュリティステータスを取得"""
        recent_events = [e for e in self.security_events 
                        if e.timestamp > datetime.now() - timedelta(hours=24)]
        
        return {
            "monitoring_active": self.config["monitoring_enabled"],
            "total_events_24h": len(recent_events),
            "critical_events_24h": len([e for e in recent_events if e.severity == SecurityLevel.CRITICAL]),
            "blocked_ips_count": len(self.blocked_ips),
            "suspicious_ips_count": len(self.suspicious_ips),
            "auto_blocking_enabled": self.config["auto_blocking"],
            "last_threat_detected": max([e.timestamp for e in recent_events], default=None),
            "compliance_score": self._calculate_compliance_score()
        }
    
    def get_recent_security_events(self, hours: int = 24) -> List[Dict[str, Any]]:
        """最近のセキュリティイベントを取得"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_events = [e for e in self.security_events if e.timestamp > cutoff_time]
        
        return [asdict(event) for event in recent_events]
    
    def get_compliance_status(self) -> Dict[str, Any]:
        """コンプライアンスステータスを取得"""
        recent_checks = [c for c in self.compliance_checks 
                        if c.last_checked > datetime.now() - timedelta(hours=24)]
        
        compliant_checks = [c for c in recent_checks if c.compliant]
        
        return {
            "total_checks": len(recent_checks),
            "compliant_checks": len(compliant_checks),
            "compliance_rate": (len(compliant_checks) / len(recent_checks) * 100) if recent_checks else 0,
            "frameworks_checked": list(set([c.framework.value for c in recent_checks])),
            "remediation_required": len([c for c in recent_checks if c.remediation_required]),
            "last_check_time": max([c.last_checked for c in recent_checks], default=None)
        }
    
    def _calculate_compliance_score(self) -> float:
        """コンプライアンススコアを計算"""
        if not self.compliance_checks:
            return 0.0
        
        recent_checks = [c for c in self.compliance_checks 
                        if c.last_checked > datetime.now() - timedelta(hours=24)]
        
        if not recent_checks:
            return 0.0
        
        compliant_count = len([c for c in recent_checks if c.compliant])
        return (compliant_count / len(recent_checks)) * 100
    
    # === 簡易実装（実際の実装では詳細化が必要） ===
    
    async def _monitor_processes(self):
        """プロセス監視（簡易実装）"""
        pass
    
    async def _monitor_file_system(self):
        """ファイルシステム監視（簡易実装）"""
        pass
    
    async def _monitor_open_ports(self):
        """オープンポート監視（簡易実装）"""
        pass
    
    async def _check_rate_limiting(self, endpoint: str):
        """レート制限チェック（簡易実装）"""
        pass
    
    async def _check_malicious_payloads(self, endpoint: str):
        """悪意のあるペイロードチェック（簡易実装）"""
        pass
    
    async def _detect_log_based_threats(self):
        """ログベース脅威検出（簡易実装）"""
        pass
    
    async def _detect_anomalous_behavior(self):
        """異常行動検出（簡易実装）"""
        pass
    
    async def _check_threat_intelligence(self):
        """脅威インテリジェンスチェック（簡易実装）"""
        pass
    
    async def _scan_system_vulnerabilities(self) -> List[Dict[str, Any]]:
        """システム脆弱性スキャン（簡易実装）"""
        return []
    
    async def _check_configuration_vulnerabilities(self) -> List[Dict[str, Any]]:
        """設定脆弱性チェック（簡易実装）"""
        return []
    
    async def _check_dependency_vulnerabilities(self) -> List[Dict[str, Any]]:
        """依存関係脆弱性チェック（簡易実装）"""
        return []
    
    async def _generate_vulnerability_report(self, vulnerabilities, config_issues, dependency_issues):
        """脆弱性レポート生成（簡易実装）"""
        pass
    
    async def _check_security_compliance(self):
        """セキュリティコンプライアンスチェック（簡易実装）"""
        pass
    
    async def _check_audit_trail(self):
        """監査証跡確認（簡易実装）"""
        pass
    
    async def _generate_compliance_report(self):
        """コンプライアンスレポート生成（簡易実装）"""
        pass
    
    async def _perform_initial_compliance_check(self):
        """初期コンプライアンスチェック（簡易実装）"""
        pass
    
    async def _update_suspicious_ips(self):
        """疑わしいIPの更新（簡易実装）"""
        # 24時間経過したエントリを削除
        current_time = datetime.now()
        expired_ips = []
        
        for ip, last_activity in self.suspicious_ips.items():
            # 簡易的に現在時刻から24時間以上古いものを削除
            if current_time.hour != last_activity % 24:  # 簡易判定
                expired_ips.append(ip)
        
        for ip in expired_ips:
            del self.suspicious_ips[ip]

# グローバルインスタンス
security_compliance_monitor = SecurityComplianceMonitor()