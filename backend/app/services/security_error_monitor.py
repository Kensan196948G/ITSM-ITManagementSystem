"""セキュリティ関連エラー検知・修復システム"""

import asyncio
import hashlib
import hmac
import json
import logging
import re
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
import sqlite3
import aiofiles
import ipaddress
from collections import defaultdict, Counter
import jwt
import bcrypt

from app.core.config import settings

logger = logging.getLogger(__name__)


class SecurityThreatLevel(Enum):
    """セキュリティ脅威レベル"""
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SecurityEventType(Enum):
    """セキュリティイベントタイプ"""
    AUTHENTICATION_FAILURE = "authentication_failure"
    AUTHORIZATION_FAILURE = "authorization_failure"
    BRUTE_FORCE_ATTACK = "brute_force_attack"
    SQL_INJECTION_ATTEMPT = "sql_injection_attempt"
    XSS_ATTEMPT = "xss_attempt"
    CSRF_ATTEMPT = "csrf_attempt"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    SUSPICIOUS_USER_AGENT = "suspicious_user_agent"
    ANOMALOUS_REQUEST_PATTERN = "anomalous_request_pattern"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    TOKEN_MANIPULATION = "token_manipulation"
    DATA_EXFILTRATION_ATTEMPT = "data_exfiltration_attempt"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    MALICIOUS_FILE_UPLOAD = "malicious_file_upload"
    DIRECTORY_TRAVERSAL = "directory_traversal"
    COMMAND_INJECTION = "command_injection"


@dataclass
class SecurityEvent:
    """セキュリティイベント"""
    timestamp: float
    event_type: SecurityEventType
    threat_level: SecurityThreatLevel
    source_ip: str
    user_agent: str
    endpoint: str
    method: str
    description: str
    details: Dict[str, Any]
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    blocked: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['event_type'] = self.event_type.value
        result['threat_level'] = self.threat_level.value
        return result


@dataclass
class SecurityPattern:
    """セキュリティパターン"""
    name: str
    pattern: str
    event_type: SecurityEventType
    threat_level: SecurityThreatLevel
    description: str
    regex_flags: int = re.IGNORECASE


class SecurityDatabase:
    """セキュリティデータベース"""
    
    def __init__(self, db_path: str = "security_monitor.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """データベース初期化"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # セキュリティイベントテーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS security_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL,
                    event_type TEXT,
                    threat_level TEXT,
                    source_ip TEXT,
                    user_agent TEXT,
                    endpoint TEXT,
                    method TEXT,
                    description TEXT,
                    details TEXT,
                    user_id TEXT,
                    session_id TEXT,
                    blocked BOOLEAN
                )
            """)
            
            # IPブラックリストテーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ip_blacklist (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ip_address TEXT UNIQUE,
                    reason TEXT,
                    added_timestamp REAL,
                    expires_timestamp REAL
                )
            """)
            
            # セキュリティルールテーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS security_rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    rule_name TEXT,
                    rule_type TEXT,
                    pattern TEXT,
                    action TEXT,
                    enabled BOOLEAN DEFAULT TRUE,
                    created_timestamp REAL
                )
            """)
            
            # インデックス作成
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON security_events (timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_ip ON security_events (source_ip)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_type ON security_events (event_type)")
            
            conn.commit()
    
    def save_event(self, event: SecurityEvent) -> int:
        """セキュリティイベントを保存"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO security_events 
                (timestamp, event_type, threat_level, source_ip, user_agent, 
                 endpoint, method, description, details, user_id, session_id, blocked)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.timestamp, event.event_type.value, event.threat_level.value,
                event.source_ip, event.user_agent, event.endpoint, event.method,
                event.description, json.dumps(event.details), event.user_id,
                event.session_id, event.blocked
            ))
            return cursor.lastrowid
    
    def add_to_blacklist(self, ip_address: str, reason: str, duration_hours: int = 24):
        """IPをブラックリストに追加"""
        expires_timestamp = time.time() + (duration_hours * 3600)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO ip_blacklist 
                (ip_address, reason, added_timestamp, expires_timestamp)
                VALUES (?, ?, ?, ?)
            """, (ip_address, reason, time.time(), expires_timestamp))
    
    def is_blacklisted(self, ip_address: str) -> bool:
        """IPがブラックリストに含まれているかチェック"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) FROM ip_blacklist 
                WHERE ip_address = ? AND expires_timestamp > ?
            """, (ip_address, time.time()))
            return cursor.fetchone()[0] > 0
    
    def get_recent_events(self, hours: int = 24, event_type: Optional[SecurityEventType] = None) -> List[Dict[str, Any]]:
        """最近のセキュリティイベントを取得"""
        cutoff_time = time.time() - (hours * 3600)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            if event_type:
                cursor.execute("""
                    SELECT * FROM security_events 
                    WHERE timestamp > ? AND event_type = ?
                    ORDER BY timestamp DESC
                """, (cutoff_time, event_type.value))
            else:
                cursor.execute("""
                    SELECT * FROM security_events 
                    WHERE timestamp > ?
                    ORDER BY timestamp DESC
                """, (cutoff_time,))
            
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
    
    def get_ip_event_count(self, ip_address: str, hours: int = 1) -> int:
        """指定IPの指定時間内のイベント数を取得"""
        cutoff_time = time.time() - (hours * 3600)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) FROM security_events 
                WHERE source_ip = ? AND timestamp > ?
            """, (ip_address, cutoff_time))
            return cursor.fetchone()[0]


class SecurityPatternManager:
    """セキュリティパターン管理"""
    
    def __init__(self):
        self.patterns = self._load_security_patterns()
    
    def _load_security_patterns(self) -> List[SecurityPattern]:
        """セキュリティパターンを読み込み"""
        return [
            # SQL インジェクション
            SecurityPattern(
                name="SQL Injection - Union",
                pattern=r"(union\s+select|union\s+all\s+select)",
                event_type=SecurityEventType.SQL_INJECTION_ATTEMPT,
                threat_level=SecurityThreatLevel.HIGH,
                description="SQL injection attempt using UNION"
            ),
            SecurityPattern(
                name="SQL Injection - Comments",
                pattern=r"(/\*.*?\*/|--[^\r\n]*|#[^\r\n]*)",
                event_type=SecurityEventType.SQL_INJECTION_ATTEMPT,
                threat_level=SecurityThreatLevel.MEDIUM,
                description="SQL injection attempt using comments"
            ),
            SecurityPattern(
                name="SQL Injection - Boolean",
                pattern=r"(\s+(or|and)\s+[0-9]+\s*=\s*[0-9]+|\s+(or|and)\s+['\"][^'\"]*['\"])",
                event_type=SecurityEventType.SQL_INJECTION_ATTEMPT,
                threat_level=SecurityThreatLevel.HIGH,
                description="SQL injection attempt using boolean conditions"
            ),
            
            # XSS
            SecurityPattern(
                name="XSS - Script Tags",
                pattern=r"<script[^>]*>.*?</script>",
                event_type=SecurityEventType.XSS_ATTEMPT,
                threat_level=SecurityThreatLevel.HIGH,
                description="XSS attempt using script tags"
            ),
            SecurityPattern(
                name="XSS - JavaScript Events",
                pattern=r"(on\w+\s*=|javascript:)",
                event_type=SecurityEventType.XSS_ATTEMPT,
                threat_level=SecurityThreatLevel.MEDIUM,
                description="XSS attempt using JavaScript events"
            ),
            
            # Directory Traversal
            SecurityPattern(
                name="Directory Traversal",
                pattern=r"(\.\./|\.\.\x5c|%2e%2e%2f|%2e%2e%5c)",
                event_type=SecurityEventType.DIRECTORY_TRAVERSAL,
                threat_level=SecurityThreatLevel.HIGH,
                description="Directory traversal attempt"
            ),
            
            # Command Injection
            SecurityPattern(
                name="Command Injection",
                pattern=r"(\||&|;|\$\(|\`|<|>)",
                event_type=SecurityEventType.COMMAND_INJECTION,
                threat_level=SecurityThreatLevel.CRITICAL,
                description="Command injection attempt"
            ),
            
            # Suspicious User Agents
            SecurityPattern(
                name="Scanner User Agent",
                pattern=r"(nmap|sqlmap|nikto|burp|zap|acunetix|nessus)",
                event_type=SecurityEventType.SUSPICIOUS_USER_AGENT,
                threat_level=SecurityThreatLevel.MEDIUM,
                description="Suspicious scanner user agent detected"
            ),
        ]
    
    def analyze_request(self, endpoint: str, method: str, headers: Dict[str, str], 
                       body: Optional[str] = None) -> List[SecurityEvent]:
        """リクエストを分析してセキュリティイベントを検出"""
        events = []
        current_time = time.time()
        
        # User-Agentチェック
        user_agent = headers.get('User-Agent', '')
        source_ip = headers.get('X-Forwarded-For', headers.get('X-Real-IP', '127.0.0.1'))
        
        # すべてのデータを結合して分析
        all_data = f"{endpoint} {method} {user_agent}"
        if body:
            all_data += f" {body}"
        
        # パターンマッチング
        for pattern in self.patterns:
            if re.search(pattern.pattern, all_data, pattern.regex_flags):
                event = SecurityEvent(
                    timestamp=current_time,
                    event_type=pattern.event_type,
                    threat_level=pattern.threat_level,
                    source_ip=source_ip,
                    user_agent=user_agent,
                    endpoint=endpoint,
                    method=method,
                    description=pattern.description,
                    details={
                        "pattern_name": pattern.name,
                        "matched_pattern": pattern.pattern,
                        "request_body": body[:1000] if body else None  # 最初の1000文字のみ
                    }
                )
                events.append(event)
        
        return events


class BruteForceDetector:
    """ブルートフォース攻撃検出"""
    
    def __init__(self):
        self.failed_attempts: Dict[str, List[float]] = defaultdict(list)
        self.max_attempts = 5
        self.time_window = 300  # 5分
    
    def check_brute_force(self, ip_address: str, endpoint: str, success: bool) -> Optional[SecurityEvent]:
        """ブルートフォース攻撃をチェック"""
        if success:
            # 成功した場合はカウンターをリセット
            key = f"{ip_address}:{endpoint}"
            if key in self.failed_attempts:
                del self.failed_attempts[key]
            return None
        
        # 失敗した場合
        current_time = time.time()
        key = f"{ip_address}:{endpoint}"
        
        # 古い試行を削除
        self.failed_attempts[key] = [
            t for t in self.failed_attempts[key] 
            if current_time - t < self.time_window
        ]
        
        # 新しい失敗を記録
        self.failed_attempts[key].append(current_time)
        
        # 閾値チェック
        if len(self.failed_attempts[key]) >= self.max_attempts:
            return SecurityEvent(
                timestamp=current_time,
                event_type=SecurityEventType.BRUTE_FORCE_ATTACK,
                threat_level=SecurityThreatLevel.HIGH,
                source_ip=ip_address,
                user_agent="",
                endpoint=endpoint,
                method="",
                description=f"Brute force attack detected: {len(self.failed_attempts[key])} failed attempts",
                details={
                    "failed_attempts": len(self.failed_attempts[key]),
                    "time_window": self.time_window,
                    "max_attempts": self.max_attempts
                }
            )
        
        return None


class RateLimitMonitor:
    """レート制限監視"""
    
    def __init__(self):
        self.request_counts: Dict[str, List[float]] = defaultdict(list)
        self.rate_limit = 100  # 1分間に100リクエスト
        self.time_window = 60  # 1分
    
    def check_rate_limit(self, ip_address: str) -> Optional[SecurityEvent]:
        """レート制限チェック"""
        current_time = time.time()
        
        # 古いリクエストを削除
        self.request_counts[ip_address] = [
            t for t in self.request_counts[ip_address]
            if current_time - t < self.time_window
        ]
        
        # 新しいリクエストを記録
        self.request_counts[ip_address].append(current_time)
        
        # レート制限チェック
        if len(self.request_counts[ip_address]) > self.rate_limit:
            return SecurityEvent(
                timestamp=current_time,
                event_type=SecurityEventType.RATE_LIMIT_EXCEEDED,
                threat_level=SecurityThreatLevel.MEDIUM,
                source_ip=ip_address,
                user_agent="",
                endpoint="",
                method="",
                description=f"Rate limit exceeded: {len(self.request_counts[ip_address])} requests in {self.time_window}s",
                details={
                    "request_count": len(self.request_counts[ip_address]),
                    "rate_limit": self.rate_limit,
                    "time_window": self.time_window
                }
            )
        
        return None


class SecurityResponseEngine:
    """セキュリティ対応エンジン"""
    
    def __init__(self, database: SecurityDatabase):
        self.database = database
        self.auto_block_enabled = True
        self.notification_enabled = True
    
    async def handle_security_event(self, event: SecurityEvent) -> Dict[str, Any]:
        """セキュリティイベントを処理"""
        # イベントをデータベースに保存
        event_id = self.database.save_event(event)
        
        response_actions = []
        
        # 脅威レベルに応じた対応
        if event.threat_level == SecurityThreatLevel.CRITICAL:
            response_actions.extend(await self._handle_critical_threat(event))
        elif event.threat_level == SecurityThreatLevel.HIGH:
            response_actions.extend(await self._handle_high_threat(event))
        elif event.threat_level == SecurityThreatLevel.MEDIUM:
            response_actions.extend(await self._handle_medium_threat(event))
        
        # イベントタイプ別の対応
        if event.event_type == SecurityEventType.BRUTE_FORCE_ATTACK:
            response_actions.extend(await self._handle_brute_force(event))
        elif event.event_type == SecurityEventType.SQL_INJECTION_ATTEMPT:
            response_actions.extend(await self._handle_sql_injection(event))
        
        return {
            "event_id": event_id,
            "actions_taken": response_actions,
            "blocked": event.blocked
        }
    
    async def _handle_critical_threat(self, event: SecurityEvent) -> List[str]:
        """重要な脅威への対応"""
        actions = []
        
        # 自動ブロック
        if self.auto_block_enabled:
            self.database.add_to_blacklist(
                event.source_ip, 
                f"Critical threat: {event.description}",
                duration_hours=24
            )
            actions.append(f"Blocked IP {event.source_ip} for 24 hours")
        
        # 緊急通知
        await self._send_emergency_notification(event)
        actions.append("Emergency notification sent")
        
        return actions
    
    async def _handle_high_threat(self, event: SecurityEvent) -> List[str]:
        """高レベル脅威への対応"""
        actions = []
        
        # 条件付きブロック（繰り返し攻撃の場合）
        recent_events = self.database.get_ip_event_count(event.source_ip, hours=1)
        if recent_events >= 3:
            self.database.add_to_blacklist(
                event.source_ip,
                f"Multiple high-level threats: {recent_events} events",
                duration_hours=6
            )
            actions.append(f"Blocked IP {event.source_ip} for 6 hours")
        
        # アラート通知
        await self._send_security_alert(event)
        actions.append("Security alert sent")
        
        return actions
    
    async def _handle_medium_threat(self, event: SecurityEvent) -> List[str]:
        """中レベル脅威への対応"""
        actions = []
        
        # 監視強化
        actions.append("Enhanced monitoring activated")
        
        # ログ記録
        await self._log_security_event(event)
        actions.append("Event logged for analysis")
        
        return actions
    
    async def _handle_brute_force(self, event: SecurityEvent) -> List[str]:
        """ブルートフォース攻撃への対応"""
        actions = []
        
        # 即座にブロック
        self.database.add_to_blacklist(
            event.source_ip,
            "Brute force attack detected",
            duration_hours=12
        )
        actions.append(f"Blocked IP {event.source_ip} for brute force attack")
        
        return actions
    
    async def _handle_sql_injection(self, event: SecurityEvent) -> List[str]:
        """SQLインジェクション攻撃への対応"""
        actions = []
        
        # クエリ分析とブロック
        self.database.add_to_blacklist(
            event.source_ip,
            "SQL injection attempt detected",
            duration_hours=6
        )
        actions.append(f"Blocked IP {event.source_ip} for SQL injection attempt")
        
        return actions
    
    async def _send_emergency_notification(self, event: SecurityEvent):
        """緊急通知送信"""
        notification_data = {
            "type": "security_emergency",
            "timestamp": event.timestamp,
            "event": event.to_dict(),
            "message": f"CRITICAL SECURITY THREAT DETECTED: {event.description}"
        }
        
        # ファイルに保存（実際の実装では外部システムに送信）
        await self._save_notification(notification_data, "emergency")
    
    async def _send_security_alert(self, event: SecurityEvent):
        """セキュリティアラート送信"""
        alert_data = {
            "type": "security_alert",
            "timestamp": event.timestamp,
            "event": event.to_dict(),
            "message": f"Security threat detected: {event.description}"
        }
        
        await self._save_notification(alert_data, "alert")
    
    async def _log_security_event(self, event: SecurityEvent):
        """セキュリティイベントログ記録"""
        log_entry = {
            "timestamp": event.timestamp,
            "level": "SECURITY",
            "event": event.to_dict()
        }
        
        log_file = Path("security_logs") / f"security_{datetime.now().strftime('%Y%m%d')}.log"
        log_file.parent.mkdir(exist_ok=True)
        
        async with aiofiles.open(log_file, 'a') as f:
            await f.write(json.dumps(log_entry, default=str) + "\n")
    
    async def _save_notification(self, notification_data: Dict[str, Any], notification_type: str):
        """通知をファイルに保存"""
        notifications_dir = Path("security_notifications")
        notifications_dir.mkdir(exist_ok=True)
        
        filename = f"{notification_type}_{int(time.time())}.json"
        notification_file = notifications_dir / filename
        
        async with aiofiles.open(notification_file, 'w') as f:
            await f.write(json.dumps(notification_data, indent=2, default=str))


class SecurityErrorMonitor:
    """セキュリティエラー監視メインクラス"""
    
    def __init__(self):
        self.database = SecurityDatabase()
        self.pattern_manager = SecurityPatternManager()
        self.brute_force_detector = BruteForceDetector()
        self.rate_limit_monitor = RateLimitMonitor()
        self.response_engine = SecurityResponseEngine(self.database)
        self.monitoring = False
    
    async def analyze_request(self, request_data: Dict[str, Any]) -> List[SecurityEvent]:
        """リクエストを分析"""
        events = []
        
        endpoint = request_data.get('endpoint', '')
        method = request_data.get('method', '')
        headers = request_data.get('headers', {})
        body = request_data.get('body')
        source_ip = headers.get('X-Forwarded-For', headers.get('X-Real-IP', '127.0.0.1'))
        
        # ブラックリストチェック
        if self.database.is_blacklisted(source_ip):
            events.append(SecurityEvent(
                timestamp=time.time(),
                event_type=SecurityEventType.UNAUTHORIZED_ACCESS,
                threat_level=SecurityThreatLevel.HIGH,
                source_ip=source_ip,
                user_agent=headers.get('User-Agent', ''),
                endpoint=endpoint,
                method=method,
                description="Request from blacklisted IP",
                details={"blacklisted": True},
                blocked=True
            ))
            return events
        
        # パターン分析
        pattern_events = self.pattern_manager.analyze_request(endpoint, method, headers, body)
        events.extend(pattern_events)
        
        # レート制限チェック
        rate_limit_event = self.rate_limit_monitor.check_rate_limit(source_ip)
        if rate_limit_event:
            events.append(rate_limit_event)
        
        # 認証失敗の場合のブルートフォースチェック
        if request_data.get('auth_failed', False):
            brute_force_event = self.brute_force_detector.check_brute_force(
                source_ip, endpoint, False
            )
            if brute_force_event:
                events.append(brute_force_event)
        
        return events
    
    async def process_security_events(self, events: List[SecurityEvent]) -> List[Dict[str, Any]]:
        """セキュリティイベントを処理"""
        results = []
        
        for event in events:
            try:
                result = await self.response_engine.handle_security_event(event)
                results.append(result)
                
                # ログ出力
                logger.warning(f"Security event: {event.event_type.value} from {event.source_ip}")
                
            except Exception as e:
                logger.error(f"Error processing security event: {e}")
        
        return results
    
    async def start_monitoring(self, interval: int = 60):
        """監視開始"""
        self.monitoring = True
        logger.info("Starting security monitoring")
        
        while self.monitoring:
            try:
                # 定期的なセキュリティチェック
                await self._periodic_security_check()
                
                await asyncio.sleep(interval)
                
            except Exception as e:
                logger.error(f"Error in security monitoring cycle: {e}")
                await asyncio.sleep(10)
    
    def stop_monitoring(self):
        """監視停止"""
        self.monitoring = False
        logger.info("Stopping security monitoring")
    
    async def _periodic_security_check(self):
        """定期的なセキュリティチェック"""
        # ブラックリストの期限切れIPを削除
        await self._cleanup_expired_blacklist()
        
        # セキュリティレポート生成
        await self._generate_security_report()
    
    async def _cleanup_expired_blacklist(self):
        """期限切れのブラックリストエントリを削除"""
        with sqlite3.connect(self.database.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM ip_blacklist 
                WHERE expires_timestamp < ?
            """, (time.time(),))
    
    async def _generate_security_report(self):
        """セキュリティレポート生成"""
        recent_events = self.database.get_recent_events(24)
        
        if not recent_events:
            return
        
        # 統計計算
        event_counts = Counter(event['event_type'] for event in recent_events)
        ip_counts = Counter(event['source_ip'] for event in recent_events)
        threat_counts = Counter(event['threat_level'] for event in recent_events)
        
        report = {
            "timestamp": time.time(),
            "period_hours": 24,
            "total_events": len(recent_events),
            "event_type_distribution": dict(event_counts),
            "top_source_ips": dict(ip_counts.most_common(10)),
            "threat_level_distribution": dict(threat_counts),
            "critical_events": len([e for e in recent_events if e['threat_level'] == 'critical']),
            "high_events": len([e for e in recent_events if e['threat_level'] == 'high'])
        }
        
        # レポートを保存
        report_file = Path("security_reports") / f"security_report_{int(time.time())}.json"
        report_file.parent.mkdir(exist_ok=True)
        
        async with aiofiles.open(report_file, 'w') as f:
            await f.write(json.dumps(report, indent=2, default=str))
    
    def get_security_status(self) -> Dict[str, Any]:
        """セキュリティ状態を取得"""
        recent_events = self.database.get_recent_events(1)  # 過去1時間
        
        critical_events = len([e for e in recent_events if e['threat_level'] == 'critical'])
        high_events = len([e for e in recent_events if e['threat_level'] == 'high'])
        
        if critical_events > 0:
            security_level = "critical"
        elif high_events > 5:
            security_level = "high"
        elif len(recent_events) > 50:
            security_level = "medium"
        else:
            security_level = "normal"
        
        return {
            "timestamp": time.time(),
            "security_level": security_level,
            "monitoring_active": self.monitoring,
            "events_last_hour": len(recent_events),
            "critical_events_last_hour": critical_events,
            "high_events_last_hour": high_events,
            "auto_block_enabled": self.response_engine.auto_block_enabled
        }


# メイン実行用
async def main():
    """メイン実行関数"""
    monitor = SecurityErrorMonitor()
    
    try:
        await monitor.start_monitoring()
    except KeyboardInterrupt:
        logger.info("Security monitoring stopped by user")
    finally:
        monitor.stop_monitoring()


if __name__ == "__main__":
    asyncio.run(main())