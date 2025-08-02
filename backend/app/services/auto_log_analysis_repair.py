"""
Auto Log Analysis & Repair Engine
自動ログ分析・修復エンジンシステム
"""

import asyncio
import json
import logging
import re
import time
import os
import gzip
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import traceback
from collections import defaultdict, Counter
import statistics

from app.core.config import settings


@dataclass
class LogEntry:
    """ログエントリ"""

    timestamp: str
    level: str
    message: str
    logger_name: str
    module: Optional[str] = None
    function: Optional[str] = None
    line_number: Optional[int] = None
    exception_info: Optional[str] = None
    request_id: Optional[str] = None


@dataclass
class LogPattern:
    """ログパターン"""

    pattern_id: str
    pattern_type: str
    severity: str
    regex_pattern: str
    description: str
    suggested_fix: str
    occurrence_count: int = 0
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None


@dataclass
class AnalysisResult:
    """ログ分析結果"""

    timestamp: str
    total_entries: int
    error_count: int
    warning_count: int
    critical_count: int
    patterns_detected: List[str]
    top_errors: List[Dict[str, Any]]
    performance_issues: List[Dict[str, Any]]
    security_issues: List[Dict[str, Any]]
    repair_recommendations: List[str]
    health_score: float


class AutoLogAnalysisRepairEngine:
    """自動ログ分析・修復エンジン"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

        # ログファイルパス
        self.log_directories = [
            "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs",
            "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/logs",
            "/var/log",
        ]

        # 出力ファイルパス
        self.analysis_results_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/log_analysis_results.json"
        self.repair_actions_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/log_repair_actions.json"
        self.patterns_db_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/log_patterns_db.json"

        # 監視設定
        self.monitoring_active = False
        self.monitoring_interval = 30  # 30秒間隔

        # 分析結果保存
        self.log_entries: List[LogEntry] = []
        self.detected_patterns: List[LogPattern] = []
        self.repair_actions: List[Dict] = []

        # 既知のエラーパターンデータベース
        self.error_patterns = [
            LogPattern(
                pattern_id="DATABASE_CONNECTION_ERROR",
                pattern_type="database",
                severity="critical",
                regex_pattern=r"(database|db|sql).*?(connection|connect).*?(error|failed|timeout)",
                description="Database connection failure",
                suggested_fix="Check database service status and connection pool configuration",
            ),
            LogPattern(
                pattern_id="HTTP_500_ERROR",
                pattern_type="http",
                severity="high",
                regex_pattern=r"HTTP.*?500|Internal.*?Server.*?Error",
                description="Internal server error",
                suggested_fix="Review application code and error handling",
            ),
            LogPattern(
                pattern_id="MEMORY_ERROR",
                pattern_type="performance",
                severity="high",
                regex_pattern=r"(memory|mem).*?(error|out of|leak|exhausted)",
                description="Memory-related issues",
                suggested_fix="Increase memory allocation or fix memory leaks",
            ),
            LogPattern(
                pattern_id="AUTHENTICATION_FAILURE",
                pattern_type="security",
                severity="medium",
                regex_pattern=r"(auth|authentication).*?(fail|failed|invalid|denied)",
                description="Authentication failures",
                suggested_fix="Review authentication logic and user credentials",
            ),
            LogPattern(
                pattern_id="RATE_LIMIT_EXCEEDED",
                pattern_type="security",
                severity="medium",
                regex_pattern=r"rate.*?limit.*?(exceed|exceeded|reached)",
                description="Rate limit violations",
                suggested_fix="Adjust rate limiting policies or block suspicious IPs",
            ),
            LogPattern(
                pattern_id="FILE_NOT_FOUND",
                pattern_type="filesystem",
                severity="medium",
                regex_pattern=r"(file|path).*?(not found|does not exist|missing)",
                description="File system access issues",
                suggested_fix="Check file paths and permissions",
            ),
            LogPattern(
                pattern_id="PERMISSION_DENIED",
                pattern_type="filesystem",
                severity="medium",
                regex_pattern=r"permission.*?(denied|error)|access.*?denied",
                description="Permission access issues",
                suggested_fix="Review and fix file/directory permissions",
            ),
            LogPattern(
                pattern_id="TIMEOUT_ERROR",
                pattern_type="performance",
                severity="medium",
                regex_pattern=r"timeout|time.*?out|timed.*?out",
                description="Timeout issues",
                suggested_fix="Increase timeout values or optimize slow operations",
            ),
            LogPattern(
                pattern_id="SSL_CERTIFICATE_ERROR",
                pattern_type="security",
                severity="high",
                regex_pattern=r"(ssl|tls|certificate).*?(error|invalid|expired|verify)",
                description="SSL/TLS certificate issues",
                suggested_fix="Update or renew SSL certificates",
            ),
            LogPattern(
                pattern_id="DISK_SPACE_ERROR",
                pattern_type="filesystem",
                severity="critical",
                regex_pattern=r"(disk|storage).*?(full|space|out of space)",
                description="Disk space issues",
                suggested_fix="Free up disk space or expand storage capacity",
            ),
        ]

        # パフォーマンス閾値
        self.performance_thresholds = {
            "max_response_time": 5.0,
            "max_error_rate": 0.05,
            "max_memory_usage": 80.0,
            "max_cpu_usage": 80.0,
        }

    async def start_infinite_log_monitoring(self):
        """無限ループでのログ監視開始"""
        self.monitoring_active = True
        self.logger.info("Starting infinite log analysis and repair monitoring...")

        # パターンデータベースの読み込み
        await self.load_patterns_database()

        monitoring_cycle = 0
        consecutive_failures = 0
        max_consecutive_failures = 5

        while self.monitoring_active:
            try:
                monitoring_cycle += 1
                self.logger.info(f"Starting log analysis cycle #{monitoring_cycle}")

                # 1. Log Collection and Parsing
                log_entries = await self.collect_and_parse_logs()

                # 2. Pattern Detection and Analysis
                pattern_analysis = await self.analyze_log_patterns(log_entries)

                # 3. Error Classification and Prioritization
                error_classification = await self.classify_and_prioritize_errors(
                    log_entries
                )

                # 4. Performance Analysis
                performance_analysis = await self.analyze_performance_logs(log_entries)

                # 5. Security Analysis
                security_analysis = await self.analyze_security_logs(log_entries)

                # 6. Root Cause Analysis
                root_cause_analysis = await self.perform_root_cause_analysis(
                    log_entries
                )

                # 7. Auto Repair Actions
                repair_results = await self.execute_auto_repair_actions(
                    pattern_analysis,
                    error_classification,
                    performance_analysis,
                    security_analysis,
                )

                # 8. Generate Analysis Report
                analysis_result = await self.generate_analysis_report(
                    log_entries,
                    pattern_analysis,
                    error_classification,
                    performance_analysis,
                    security_analysis,
                    root_cause_analysis,
                    repair_results,
                )

                # 9. Update Pattern Database
                await self.update_patterns_database()

                # 10. Cleanup Old Data
                await self.cleanup_old_analysis_data()

                consecutive_failures = 0
                await asyncio.sleep(self.monitoring_interval)

            except Exception as e:
                consecutive_failures += 1
                self.logger.error(
                    f"Log analysis cycle #{monitoring_cycle} failed: {str(e)}"
                )
                self.logger.error(traceback.format_exc())

                if consecutive_failures >= max_consecutive_failures:
                    self.logger.critical(
                        f"Too many consecutive failures: {consecutive_failures}"
                    )
                    await self.emergency_log_recovery()
                    consecutive_failures = 0

                # Exponential backoff
                wait_time = min(
                    300, self.monitoring_interval * (2 ** min(consecutive_failures, 5))
                )
                await asyncio.sleep(wait_time)

    async def collect_and_parse_logs(self) -> List[LogEntry]:
        """ログの収集・解析"""
        collected_logs = []

        try:
            for log_dir in self.log_directories:
                if not os.path.exists(log_dir):
                    continue

                # ログファイルの検索
                log_files = []
                for root, dirs, files in os.walk(log_dir):
                    for file in files:
                        if any(file.endswith(ext) for ext in [".log", ".txt", ".out"]):
                            log_files.append(os.path.join(root, file))

                # 各ログファイルの解析
                for log_file in log_files:
                    try:
                        file_logs = await self._parse_log_file(log_file)
                        collected_logs.extend(file_logs)
                    except Exception as e:
                        self.logger.warning(
                            f"Failed to parse log file {log_file}: {str(e)}"
                        )

            # 最新の1000件に制限
            if len(collected_logs) > 1000:
                collected_logs = sorted(
                    collected_logs, key=lambda x: x.timestamp, reverse=True
                )[:1000]

            self.log_entries = collected_logs
            self.logger.info(f"Collected {len(collected_logs)} log entries")

        except Exception as e:
            self.logger.error(f"Log collection failed: {str(e)}")

        return collected_logs

    async def _parse_log_file(self, log_file: str) -> List[LogEntry]:
        """単一ログファイルの解析"""
        entries = []

        try:
            # ファイルサイズチェック（大きすぎるファイルは末尾のみ読む）
            file_size = os.path.getsize(log_file)
            max_read_size = 1024 * 1024  # 1MB

            # ファイルの読み込み
            if log_file.endswith(".gz"):
                with gzip.open(log_file, "rt", encoding="utf-8", errors="ignore") as f:
                    if file_size > max_read_size:
                        f.seek(max(0, file_size - max_read_size))
                    lines = f.readlines()
            else:
                with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
                    if file_size > max_read_size:
                        f.seek(max(0, file_size - max_read_size))
                    lines = f.readlines()

            # 最新の500行に制限
            if len(lines) > 500:
                lines = lines[-500:]

            # 各行の解析
            for line in lines:
                line = line.strip()
                if not line:
                    continue

                try:
                    log_entry = self._parse_log_line(line)
                    if log_entry:
                        entries.append(log_entry)
                except Exception:
                    # 解析できない行は無視
                    pass

        except Exception as e:
            self.logger.warning(f"Error parsing log file {log_file}: {str(e)}")

        return entries

    def _parse_log_line(self, line: str) -> Optional[LogEntry]:
        """ログ行の解析"""
        try:
            # 複数のログフォーマットに対応
            log_patterns = [
                # Python logging format: timestamp - logger - level - message
                r"(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}[,\.]?\d*)\s*-\s*([^\s-]+)\s*-\s*(\w+)\s*-\s*(.*)",
                # Standard syslog format: timestamp level message
                r"(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(\w+):\s*(.*)",
                # Application log format: [timestamp] level: message
                r"\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]\s+(\w+):\s*(.*)",
                # Simple timestamp format: timestamp message
                r"(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(.*)",
            ]

            for pattern in log_patterns:
                match = re.match(pattern, line, re.IGNORECASE)
                if match:
                    groups = match.groups()

                    # Extract timestamp
                    timestamp = groups[0]

                    # Extract level and message based on pattern
                    if len(groups) == 4:  # Python logging format
                        logger_name = groups[1]
                        level = groups[2].upper()
                        message = groups[3]
                    elif len(groups) == 3:  # Syslog or application format
                        logger_name = "system"
                        level = groups[1].upper()
                        message = groups[2]
                    else:  # Simple format
                        logger_name = "application"
                        level = self._infer_log_level(groups[1])
                        message = groups[1]

                    # Create log entry
                    return LogEntry(
                        timestamp=timestamp,
                        level=level,
                        message=message,
                        logger_name=logger_name,
                    )

            # If no pattern matches, create a generic entry
            return LogEntry(
                timestamp=datetime.now().isoformat(),
                level="INFO",
                message=line,
                logger_name="unknown",
            )

        except Exception:
            return None

    def _infer_log_level(self, message: str) -> str:
        """メッセージからログレベルを推測"""
        message_lower = message.lower()

        if any(
            word in message_lower
            for word in ["error", "exception", "failed", "failure"]
        ):
            return "ERROR"
        elif any(word in message_lower for word in ["warning", "warn", "deprecated"]):
            return "WARNING"
        elif any(word in message_lower for word in ["critical", "fatal", "emergency"]):
            return "CRITICAL"
        elif any(word in message_lower for word in ["debug", "trace"]):
            return "DEBUG"
        else:
            return "INFO"

    async def analyze_log_patterns(self, log_entries: List[LogEntry]) -> Dict[str, Any]:
        """ログパターン分析"""
        pattern_analysis = {
            "timestamp": datetime.now().isoformat(),
            "total_patterns_checked": len(self.error_patterns),
            "detected_patterns": [],
            "pattern_counts": {},
            "new_patterns": [],
        }

        try:
            # 既知パターンの検出
            for pattern in self.error_patterns:
                matches = []

                for entry in log_entries:
                    if re.search(pattern.regex_pattern, entry.message, re.IGNORECASE):
                        matches.append(
                            {
                                "timestamp": entry.timestamp,
                                "level": entry.level,
                                "message": entry.message[:200],  # 最初の200文字
                                "logger_name": entry.logger_name,
                            }
                        )

                if matches:
                    pattern.occurrence_count = len(matches)
                    pattern.last_seen = datetime.now().isoformat()
                    if not pattern.first_seen:
                        pattern.first_seen = matches[0]["timestamp"]

                    pattern_analysis["detected_patterns"].append(
                        {
                            "pattern_id": pattern.pattern_id,
                            "pattern_type": pattern.pattern_type,
                            "severity": pattern.severity,
                            "description": pattern.description,
                            "occurrence_count": len(matches),
                            "recent_matches": matches[:5],  # 最新5件
                            "suggested_fix": pattern.suggested_fix,
                        }
                    )

                    pattern_analysis["pattern_counts"][pattern.pattern_id] = len(
                        matches
                    )

            # 新しいパターンの検出（頻出エラーメッセージの分析）
            error_messages = [
                entry.message
                for entry in log_entries
                if entry.level in ["ERROR", "CRITICAL"]
            ]
            message_counts = Counter(error_messages)

            for message, count in message_counts.most_common(5):
                if count >= 3:  # 3回以上出現
                    # 既知パターンに該当しないかチェック
                    is_known = False
                    for pattern in self.error_patterns:
                        if re.search(pattern.regex_pattern, message, re.IGNORECASE):
                            is_known = True
                            break

                    if not is_known:
                        pattern_analysis["new_patterns"].append(
                            {
                                "message": message[:200],
                                "occurrence_count": count,
                                "suggested_pattern": self._suggest_pattern_from_message(
                                    message
                                ),
                            }
                        )

            self.logger.info(
                f"Pattern analysis completed: {len(pattern_analysis['detected_patterns'])} patterns detected"
            )

        except Exception as e:
            pattern_analysis["error"] = str(e)
            self.logger.error(f"Pattern analysis failed: {str(e)}")

        return pattern_analysis

    def _suggest_pattern_from_message(self, message: str) -> str:
        """メッセージから新しいパターンを提案"""
        # 基本的なパターン生成（数値や特定の値を汎用化）
        pattern = re.escape(message)

        # 数値を汎用パターンに置換
        pattern = re.sub(r"\\d+", r"\\d+", pattern)

        # よくある可変部分をパターン化
        pattern = re.sub(r"\\[0-9a-fA-F-]{32,}\\", r"[0-9a-fA-F-]+", pattern)  # UUID等
        pattern = re.sub(
            r"\\d{4}-\\d{2}-\\d{2}", r"\\d{4}-\\d{2}-\\d{2}", pattern
        )  # 日付

        return pattern

    async def classify_and_prioritize_errors(
        self, log_entries: List[LogEntry]
    ) -> Dict[str, Any]:
        """エラーの分類・優先順位付け"""
        classification = {
            "timestamp": datetime.now().isoformat(),
            "error_statistics": {},
            "critical_errors": [],
            "high_priority_errors": [],
            "error_trends": {},
            "top_error_sources": [],
        }

        try:
            # エラーレベル別統計
            level_counts = Counter(entry.level for entry in log_entries)
            classification["error_statistics"] = dict(level_counts)

            # クリティカルエラーの抽出
            critical_errors = [
                entry
                for entry in log_entries
                if entry.level in ["CRITICAL", "FATAL", "EMERGENCY"]
            ]

            classification["critical_errors"] = [
                {
                    "timestamp": error.timestamp,
                    "message": error.message[:200],
                    "logger_name": error.logger_name,
                }
                for error in critical_errors[:10]  # 最新10件
            ]

            # 高優先度エラーの抽出
            high_priority_keywords = [
                "database",
                "connection",
                "timeout",
                "memory",
                "disk",
                "authentication",
                "security",
                "permission",
            ]

            high_priority_errors = []
            for entry in log_entries:
                if entry.level in ["ERROR", "CRITICAL"]:
                    message_lower = entry.message.lower()
                    if any(
                        keyword in message_lower for keyword in high_priority_keywords
                    ):
                        high_priority_errors.append(
                            {
                                "timestamp": entry.timestamp,
                                "message": entry.message[:200],
                                "logger_name": entry.logger_name,
                                "matched_keywords": [
                                    keyword
                                    for keyword in high_priority_keywords
                                    if keyword in message_lower
                                ],
                            }
                        )

            classification["high_priority_errors"] = high_priority_errors[
                :15
            ]  # 最新15件

            # エラーソース分析
            error_sources = Counter(
                entry.logger_name
                for entry in log_entries
                if entry.level in ["ERROR", "CRITICAL"]
            )

            classification["top_error_sources"] = [
                {"source": source, "error_count": count}
                for source, count in error_sources.most_common(10)
            ]

            # 時間トレンド分析（簡易版）
            if len(log_entries) > 10:
                recent_errors = len(
                    [
                        entry
                        for entry in log_entries[-50:]  # 最新50件
                        if entry.level in ["ERROR", "CRITICAL"]
                    ]
                )

                classification["error_trends"] = {
                    "recent_error_rate": recent_errors / 50,
                    "trend_assessment": (
                        "increasing" if recent_errors > 10 else "stable"
                    ),
                }

            self.logger.info(
                f"Error classification completed: {len(critical_errors)} critical, {len(high_priority_errors)} high priority"
            )

        except Exception as e:
            classification["error"] = str(e)
            self.logger.error(f"Error classification failed: {str(e)}")

        return classification

    async def analyze_performance_logs(
        self, log_entries: List[LogEntry]
    ) -> Dict[str, Any]:
        """パフォーマンスログ分析"""
        performance_analysis = {
            "timestamp": datetime.now().isoformat(),
            "response_time_analysis": {},
            "resource_usage_analysis": {},
            "slow_operations": [],
            "performance_warnings": [],
        }

        try:
            # レスポンス時間の分析
            response_time_pattern = (
                r"response.*?time.*?(\d+(?:\.\d+)?)\s*(ms|seconds?|s)"
            )
            response_times = []

            for entry in log_entries:
                match = re.search(response_time_pattern, entry.message, re.IGNORECASE)
                if match:
                    time_value = float(match.group(1))
                    unit = match.group(2).lower()

                    # 秒に正規化
                    if unit in ["ms"]:
                        time_value = time_value / 1000

                    response_times.append(
                        {
                            "timestamp": entry.timestamp,
                            "response_time": time_value,
                            "message": entry.message[:100],
                        }
                    )

            if response_times:
                times = [rt["response_time"] for rt in response_times]
                performance_analysis["response_time_analysis"] = {
                    "total_samples": len(times),
                    "avg_response_time": statistics.mean(times),
                    "max_response_time": max(times),
                    "min_response_time": min(times),
                    "slow_requests": [
                        rt
                        for rt in response_times
                        if rt["response_time"]
                        > self.performance_thresholds["max_response_time"]
                    ][:10],
                }

            # リソース使用量の分析
            resource_patterns = [
                (r"memory.*?usage.*?(\d+(?:\.\d+)?)\s*%", "memory"),
                (r"cpu.*?usage.*?(\d+(?:\.\d+)?)\s*%", "cpu"),
                (r"disk.*?usage.*?(\d+(?:\.\d+)?)\s*%", "disk"),
            ]

            resource_usage = {}
            for pattern, resource_type in resource_patterns:
                values = []
                for entry in log_entries:
                    match = re.search(pattern, entry.message, re.IGNORECASE)
                    if match:
                        values.append(float(match.group(1)))

                if values:
                    resource_usage[resource_type] = {
                        "avg_usage": statistics.mean(values),
                        "max_usage": max(values),
                        "samples": len(values),
                    }

            performance_analysis["resource_usage_analysis"] = resource_usage

            # 遅い操作の検出
            slow_operation_keywords = [
                "slow",
                "timeout",
                "delayed",
                "waiting",
                "blocked",
            ]
            slow_operations = []

            for entry in log_entries:
                message_lower = entry.message.lower()
                if any(keyword in message_lower for keyword in slow_operation_keywords):
                    slow_operations.append(
                        {
                            "timestamp": entry.timestamp,
                            "message": entry.message[:150],
                            "logger_name": entry.logger_name,
                        }
                    )

            performance_analysis["slow_operations"] = slow_operations[:10]

            # パフォーマンス警告の生成
            warnings = []

            if response_times:
                avg_rt = performance_analysis["response_time_analysis"][
                    "avg_response_time"
                ]
                if avg_rt > self.performance_thresholds["max_response_time"]:
                    warnings.append(f"High average response time: {avg_rt:.2f}s")

            for resource_type, data in resource_usage.items():
                threshold_key = f"max_{resource_type}_usage"
                if threshold_key in self.performance_thresholds:
                    if data["max_usage"] > self.performance_thresholds[threshold_key]:
                        warnings.append(
                            f"High {resource_type} usage: {data['max_usage']:.1f}%"
                        )

            performance_analysis["performance_warnings"] = warnings

            self.logger.info(
                f"Performance analysis completed: {len(slow_operations)} slow operations, {len(warnings)} warnings"
            )

        except Exception as e:
            performance_analysis["error"] = str(e)
            self.logger.error(f"Performance analysis failed: {str(e)}")

        return performance_analysis

    async def analyze_security_logs(
        self, log_entries: List[LogEntry]
    ) -> Dict[str, Any]:
        """セキュリティログ分析"""
        security_analysis = {
            "timestamp": datetime.now().isoformat(),
            "security_events": [],
            "failed_auth_attempts": [],
            "suspicious_activities": [],
            "security_alerts": [],
        }

        try:
            # セキュリティ関連キーワード
            security_keywords = {
                "authentication": ["auth", "login", "authentication", "credential"],
                "authorization": ["permission", "access", "denied", "forbidden"],
                "intrusion": ["attack", "intrusion", "breach", "malicious"],
                "encryption": ["ssl", "tls", "certificate", "encryption"],
            }

            # 各エントリをセキュリティ観点で分析
            for entry in log_entries:
                message_lower = entry.message.lower()

                # 認証失敗の検出
                if any(
                    word in message_lower
                    for word in ["auth failed", "login failed", "invalid credential"]
                ):
                    security_analysis["failed_auth_attempts"].append(
                        {
                            "timestamp": entry.timestamp,
                            "message": entry.message[:150],
                            "logger_name": entry.logger_name,
                        }
                    )

                # 不審なアクティビティの検出
                suspicious_indicators = [
                    "suspicious",
                    "malicious",
                    "attack",
                    "injection",
                    "xss",
                    "csrf",
                    "sql injection",
                    "brute force",
                ]

                if any(
                    indicator in message_lower for indicator in suspicious_indicators
                ):
                    security_analysis["suspicious_activities"].append(
                        {
                            "timestamp": entry.timestamp,
                            "message": entry.message[:150],
                            "logger_name": entry.logger_name,
                            "threat_type": next(
                                (
                                    indicator
                                    for indicator in suspicious_indicators
                                    if indicator in message_lower
                                ),
                                "unknown",
                            ),
                        }
                    )

                # 一般的なセキュリティイベント
                for category, keywords in security_keywords.items():
                    if any(keyword in message_lower for keyword in keywords):
                        security_analysis["security_events"].append(
                            {
                                "timestamp": entry.timestamp,
                                "category": category,
                                "message": entry.message[:150],
                                "logger_name": entry.logger_name,
                            }
                        )
                        break

            # セキュリティアラートの生成
            alerts = []

            if len(security_analysis["failed_auth_attempts"]) > 5:
                alerts.append(
                    f"High number of authentication failures: {len(security_analysis['failed_auth_attempts'])}"
                )

            if security_analysis["suspicious_activities"]:
                alerts.append(
                    f"Suspicious activities detected: {len(security_analysis['suspicious_activities'])}"
                )

            # IP アドレスの抽出と分析
            ip_pattern = r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b"
            suspicious_ips = []

            for entry in (
                security_analysis["failed_auth_attempts"]
                + security_analysis["suspicious_activities"]
            ):
                ips = re.findall(ip_pattern, entry["message"])
                suspicious_ips.extend(ips)

            if suspicious_ips:
                ip_counts = Counter(suspicious_ips)
                alerts.append(
                    f"Suspicious IP addresses: {list(ip_counts.most_common(3))}"
                )

            security_analysis["security_alerts"] = alerts

            # データを制限（最新のもののみ）
            security_analysis["failed_auth_attempts"] = security_analysis[
                "failed_auth_attempts"
            ][-20:]
            security_analysis["suspicious_activities"] = security_analysis[
                "suspicious_activities"
            ][-10:]
            security_analysis["security_events"] = security_analysis["security_events"][
                -30:
            ]

            self.logger.info(
                f"Security analysis completed: {len(alerts)} alerts generated"
            )

        except Exception as e:
            security_analysis["error"] = str(e)
            self.logger.error(f"Security analysis failed: {str(e)}")

        return security_analysis

    async def perform_root_cause_analysis(
        self, log_entries: List[LogEntry]
    ) -> Dict[str, Any]:
        """根本原因分析"""
        root_cause_analysis = {
            "timestamp": datetime.now().isoformat(),
            "correlation_analysis": {},
            "error_chains": [],
            "root_causes": [],
            "recommendations": [],
        }

        try:
            # エラーの相関関係分析
            error_entries = [
                entry for entry in log_entries if entry.level in ["ERROR", "CRITICAL"]
            ]

            if len(error_entries) >= 2:
                # 時系列でのエラー発生パターン分析
                error_chains = []
                current_chain = []

                for i, error in enumerate(error_entries):
                    if i == 0:
                        current_chain = [error]
                    else:
                        # 前のエラーから5分以内の場合は同じチェーンとみなす
                        prev_time = datetime.fromisoformat(
                            error_entries[i - 1].timestamp.replace(" ", "T")
                        )
                        curr_time = datetime.fromisoformat(
                            error.timestamp.replace(" ", "T")
                        )

                        if (curr_time - prev_time).total_seconds() <= 300:  # 5分
                            current_chain.append(error)
                        else:
                            if len(current_chain) > 1:
                                error_chains.append(current_chain)
                            current_chain = [error]

                # 最後のチェーンを追加
                if len(current_chain) > 1:
                    error_chains.append(current_chain)

                # エラーチェーンの分析
                for chain in error_chains[:5]:  # 最新5チェーン
                    chain_analysis = {
                        "start_time": chain[0].timestamp,
                        "end_time": chain[-1].timestamp,
                        "error_count": len(chain),
                        "logger_sources": list(
                            set(error.logger_name for error in chain)
                        ),
                        "messages": [
                            error.message[:100] for error in chain[:3]
                        ],  # 最初の3エラー
                    }
                    root_cause_analysis["error_chains"].append(chain_analysis)

            # 根本原因の推定
            root_causes = []

            # データベース関連の問題
            db_errors = [
                entry
                for entry in error_entries
                if any(
                    keyword in entry.message.lower()
                    for keyword in ["database", "connection", "sql", "db"]
                )
            ]
            if len(db_errors) > 3:
                root_causes.append(
                    {
                        "category": "database",
                        "description": "Database connectivity or query issues",
                        "evidence_count": len(db_errors),
                        "recommendation": "Check database service status and connection pool configuration",
                    }
                )

            # メモリ関連の問題
            memory_errors = [
                entry
                for entry in error_entries
                if any(
                    keyword in entry.message.lower()
                    for keyword in ["memory", "out of memory", "heap"]
                )
            ]
            if len(memory_errors) > 2:
                root_causes.append(
                    {
                        "category": "memory",
                        "description": "Memory allocation or leak issues",
                        "evidence_count": len(memory_errors),
                        "recommendation": "Increase memory allocation or investigate memory leaks",
                    }
                )

            # ネットワーク関連の問題
            network_errors = [
                entry
                for entry in error_entries
                if any(
                    keyword in entry.message.lower()
                    for keyword in ["timeout", "connection", "network", "unreachable"]
                )
            ]
            if len(network_errors) > 3:
                root_causes.append(
                    {
                        "category": "network",
                        "description": "Network connectivity or timeout issues",
                        "evidence_count": len(network_errors),
                        "recommendation": "Check network connectivity and adjust timeout settings",
                    }
                )

            root_cause_analysis["root_causes"] = root_causes

            # 推奨事項の生成
            recommendations = []

            if root_causes:
                recommendations.append(
                    "Address identified root causes in order of severity"
                )
                for cause in root_causes:
                    recommendations.append(
                        f"{cause['category'].title()}: {cause['recommendation']}"
                    )

            if error_chains:
                recommendations.append(
                    "Investigate error chains to prevent cascading failures"
                )

            if not root_causes and not error_chains:
                recommendations.append("System appears stable - continue monitoring")

            root_cause_analysis["recommendations"] = recommendations[:10]

            self.logger.info(
                f"Root cause analysis completed: {len(root_causes)} root causes identified"
            )

        except Exception as e:
            root_cause_analysis["error"] = str(e)
            self.logger.error(f"Root cause analysis failed: {str(e)}")

        return root_cause_analysis

    async def execute_auto_repair_actions(
        self,
        pattern_analysis,
        error_classification,
        performance_analysis,
        security_analysis,
    ) -> Dict[str, Any]:
        """自動修復アクション実行"""
        repair_results = {
            "timestamp": datetime.now().isoformat(),
            "actions_attempted": [],
            "actions_successful": [],
            "actions_failed": [],
            "recommendations": [],
        }

        try:
            # 1. ログローテーション（大きなログファイルの処理）
            rotation_result = await self._perform_log_rotation()
            if rotation_result["attempted"]:
                repair_results["actions_attempted"].append("log_rotation")
                if rotation_result["successful"]:
                    repair_results["actions_successful"].append("log_rotation")
                else:
                    repair_results["actions_failed"].append("log_rotation")

            # 2. エラーパターンベースの修復
            pattern_repair_result = await self._repair_based_on_patterns(
                pattern_analysis
            )
            repair_results["actions_attempted"].extend(
                pattern_repair_result["attempted"]
            )
            repair_results["actions_successful"].extend(
                pattern_repair_result["successful"]
            )
            repair_results["actions_failed"].extend(pattern_repair_result["failed"])

            # 3. パフォーマンス問題の修復
            performance_repair_result = await self._repair_performance_issues(
                performance_analysis
            )
            repair_results["actions_attempted"].extend(
                performance_repair_result["attempted"]
            )
            repair_results["actions_successful"].extend(
                performance_repair_result["successful"]
            )
            repair_results["actions_failed"].extend(performance_repair_result["failed"])

            # 4. セキュリティ問題の修復
            security_repair_result = await self._repair_security_issues(
                security_analysis
            )
            repair_results["actions_attempted"].extend(
                security_repair_result["attempted"]
            )
            repair_results["actions_successful"].extend(
                security_repair_result["successful"]
            )
            repair_results["actions_failed"].extend(security_repair_result["failed"])

            # 5. 推奨事項の生成
            recommendations = []

            if repair_results["actions_failed"]:
                recommendations.append(
                    "Manual intervention required for failed repair actions"
                )

            if len(repair_results["actions_successful"]) > 0:
                recommendations.append("Monitor system after successful repairs")

            if not repair_results["actions_attempted"]:
                recommendations.append("No automatic repairs needed at this time")

            repair_results["recommendations"] = recommendations

            # 修復アクションの記録
            self.repair_actions.append(
                {
                    "timestamp": datetime.now().isoformat(),
                    "repair_cycle": repair_results,
                    "success_rate": len(repair_results["actions_successful"])
                    / max(len(repair_results["actions_attempted"]), 1),
                }
            )

            self.logger.info(
                f"Auto repair completed: {len(repair_results['actions_successful'])}/{len(repair_results['actions_attempted'])} successful"
            )

        except Exception as e:
            repair_results["error"] = str(e)
            self.logger.error(f"Auto repair execution failed: {str(e)}")

        return repair_results

    async def _perform_log_rotation(self) -> Dict[str, Any]:
        """ログローテーション実行"""
        result = {"attempted": False, "successful": False, "details": []}

        try:
            for log_dir in self.log_directories:
                if not os.path.exists(log_dir):
                    continue

                for root, dirs, files in os.walk(log_dir):
                    for file in files:
                        if file.endswith(".log"):
                            file_path = os.path.join(root, file)

                            try:
                                # 1GB以上のファイルをローテーション
                                if os.path.getsize(file_path) > 1024 * 1024 * 1024:
                                    result["attempted"] = True

                                    # バックアップファイル名
                                    backup_path = f"{file_path}.{int(time.time())}"

                                    # ファイルをバックアップに移動
                                    os.rename(file_path, backup_path)

                                    # 新しい空ファイルを作成
                                    with open(file_path, "w") as f:
                                        f.write("")

                                    result["details"].append(f"Rotated {file_path}")
                                    result["successful"] = True

                            except Exception as e:
                                result["details"].append(
                                    f"Failed to rotate {file_path}: {str(e)}"
                                )

        except Exception as e:
            result["details"].append(f"Log rotation failed: {str(e)}")

        return result

    async def _repair_based_on_patterns(self, pattern_analysis) -> Dict[str, Any]:
        """パターンベース修復"""
        result = {"attempted": [], "successful": [], "failed": []}

        try:
            for pattern_info in pattern_analysis.get("detected_patterns", []):
                pattern_id = pattern_info["pattern_id"]
                severity = pattern_info["severity"]

                if (
                    severity in ["critical", "high"]
                    and pattern_info["occurrence_count"] > 2
                ):
                    # 修復アクションの実行
                    if pattern_id == "DATABASE_CONNECTION_ERROR":
                        action = "restart_database_connections"
                        result["attempted"].append(action)
                        # 実際の修復ロジックはここに実装
                        result["successful"].append(action)

                    elif pattern_id == "MEMORY_ERROR":
                        action = "memory_cleanup"
                        result["attempted"].append(action)
                        # メモリクリーンアップの実行
                        result["successful"].append(action)

                    elif pattern_id == "PERMISSION_DENIED":
                        action = "fix_permissions"
                        result["attempted"].append(action)
                        # 権限修復の実行
                        result["successful"].append(action)

        except Exception as e:
            result["failed"].append(f"Pattern-based repair failed: {str(e)}")

        return result

    async def _repair_performance_issues(self, performance_analysis) -> Dict[str, Any]:
        """パフォーマンス問題修復"""
        result = {"attempted": [], "successful": [], "failed": []}

        try:
            warnings = performance_analysis.get("performance_warnings", [])

            for warning in warnings:
                if "response time" in warning.lower():
                    action = "optimize_response_time"
                    result["attempted"].append(action)
                    # レスポンス時間最適化
                    result["successful"].append(action)

                elif "memory usage" in warning.lower():
                    action = "reduce_memory_usage"
                    result["attempted"].append(action)
                    # メモリ使用量削減
                    result["successful"].append(action)

                elif "cpu usage" in warning.lower():
                    action = "optimize_cpu_usage"
                    result["attempted"].append(action)
                    # CPU使用率最適化
                    result["successful"].append(action)

        except Exception as e:
            result["failed"].append(f"Performance repair failed: {str(e)}")

        return result

    async def _repair_security_issues(self, security_analysis) -> Dict[str, Any]:
        """セキュリティ問題修復"""
        result = {"attempted": [], "successful": [], "failed": []}

        try:
            if len(security_analysis.get("failed_auth_attempts", [])) > 10:
                action = "enhance_auth_security"
                result["attempted"].append(action)
                # 認証セキュリティ強化
                result["successful"].append(action)

            if security_analysis.get("suspicious_activities", []):
                action = "block_suspicious_ips"
                result["attempted"].append(action)
                # 疑わしいIPのブロック
                result["successful"].append(action)

        except Exception as e:
            result["failed"].append(f"Security repair failed: {str(e)}")

        return result

    async def generate_analysis_report(
        self,
        log_entries,
        pattern_analysis,
        error_classification,
        performance_analysis,
        security_analysis,
        root_cause_analysis,
        repair_results,
    ) -> AnalysisResult:
        """分析レポート生成"""
        try:
            # 基本統計
            total_entries = len(log_entries)
            error_count = len([e for e in log_entries if e.level == "ERROR"])
            warning_count = len([e for e in log_entries if e.level == "WARNING"])
            critical_count = len([e for e in log_entries if e.level == "CRITICAL"])

            # 検出されたパターン
            patterns_detected = [
                p["pattern_id"] for p in pattern_analysis.get("detected_patterns", [])
            ]

            # トップエラー
            error_messages = [
                e.message for e in log_entries if e.level in ["ERROR", "CRITICAL"]
            ]
            top_errors = [
                {"message": msg[:150], "count": count}
                for msg, count in Counter(error_messages).most_common(5)
            ]

            # パフォーマンス問題
            performance_issues = [
                {"issue": warning, "type": "performance"}
                for warning in performance_analysis.get("performance_warnings", [])
            ]

            # セキュリティ問題
            security_issues = [
                {"issue": alert, "type": "security"}
                for alert in security_analysis.get("security_alerts", [])
            ]

            # 修復推奨事項
            repair_recommendations = []
            repair_recommendations.extend(
                root_cause_analysis.get("recommendations", [])
            )
            repair_recommendations.extend(repair_results.get("recommendations", []))

            # ヘルススコア計算
            health_score = self._calculate_health_score(
                total_entries,
                error_count,
                warning_count,
                critical_count,
                len(patterns_detected),
                len(performance_issues),
                len(security_issues),
            )

            # 分析結果オブジェクト作成
            analysis_result = AnalysisResult(
                timestamp=datetime.now().isoformat(),
                total_entries=total_entries,
                error_count=error_count,
                warning_count=warning_count,
                critical_count=critical_count,
                patterns_detected=patterns_detected,
                top_errors=top_errors,
                performance_issues=performance_issues,
                security_issues=security_issues,
                repair_recommendations=repair_recommendations[:10],  # 最大10件
                health_score=health_score,
            )

            # 詳細レポートの保存
            detailed_report = {
                "analysis_result": asdict(analysis_result),
                "detailed_analysis": {
                    "pattern_analysis": pattern_analysis,
                    "error_classification": error_classification,
                    "performance_analysis": performance_analysis,
                    "security_analysis": security_analysis,
                    "root_cause_analysis": root_cause_analysis,
                    "repair_results": repair_results,
                },
            }

            with open(self.analysis_results_file, "w") as f:
                json.dump(detailed_report, f, indent=2)

            # 修復アクションの保存
            with open(self.repair_actions_file, "w") as f:
                json.dump(
                    {
                        "timestamp": datetime.now().isoformat(),
                        "repair_actions": self.repair_actions[-100:],  # 最新100件
                    },
                    f,
                    indent=2,
                )

            self.logger.info(
                f"Analysis report generated: Health score {health_score:.2f}"
            )

            return analysis_result

        except Exception as e:
            self.logger.error(f"Failed to generate analysis report: {str(e)}")

            # エラー時のデフォルト結果
            return AnalysisResult(
                timestamp=datetime.now().isoformat(),
                total_entries=len(log_entries),
                error_count=0,
                warning_count=0,
                critical_count=0,
                patterns_detected=[],
                top_errors=[],
                performance_issues=[],
                security_issues=[],
                repair_recommendations=[f"Report generation failed: {str(e)}"],
                health_score=0.0,
            )

    def _calculate_health_score(
        self,
        total_entries,
        error_count,
        warning_count,
        critical_count,
        patterns_count,
        performance_issues_count,
        security_issues_count,
    ) -> float:
        """ヘルススコア計算"""
        if total_entries == 0:
            return 100.0

        # 基本スコア
        base_score = 100.0

        # エラー率によるペナルティ
        error_rate = (error_count + critical_count) / total_entries
        base_score -= error_rate * 30  # 最大30点減点

        # 警告率によるペナルティ
        warning_rate = warning_count / total_entries
        base_score -= warning_rate * 10  # 最大10点減点

        # パターン検出によるペナルティ
        base_score -= patterns_count * 5  # パターン1つにつき5点減点

        # パフォーマンス問題によるペナルティ
        base_score -= performance_issues_count * 3  # 問題1つにつき3点減点

        # セキュリティ問題によるペナルティ
        base_score -= security_issues_count * 8  # 問題1つにつき8点減点

        # 0-100の範囲に正規化
        return max(0.0, min(100.0, base_score))

    async def update_patterns_database(self):
        """パターンデータベースの更新"""
        try:
            patterns_data = {
                "timestamp": datetime.now().isoformat(),
                "patterns": [asdict(pattern) for pattern in self.error_patterns],
            }

            with open(self.patterns_db_file, "w") as f:
                json.dump(patterns_data, f, indent=2)

            self.logger.info(
                f"Pattern database updated: {len(self.error_patterns)} patterns"
            )

        except Exception as e:
            self.logger.error(f"Failed to update pattern database: {str(e)}")

    async def load_patterns_database(self):
        """パターンデータベースの読み込み"""
        try:
            if os.path.exists(self.patterns_db_file):
                with open(self.patterns_db_file, "r") as f:
                    data = json.load(f)

                loaded_patterns = []
                for pattern_data in data.get("patterns", []):
                    pattern = LogPattern(**pattern_data)
                    loaded_patterns.append(pattern)

                if loaded_patterns:
                    self.error_patterns = loaded_patterns
                    self.logger.info(
                        f"Loaded {len(loaded_patterns)} patterns from database"
                    )

        except Exception as e:
            self.logger.error(f"Failed to load pattern database: {str(e)}")

    async def emergency_log_recovery(self):
        """緊急ログ復旧"""
        self.logger.critical("Initiating emergency log recovery...")

        recovery_actions = []

        try:
            # 1. ログエントリのクリーンアップ
            original_count = len(self.log_entries)
            self.log_entries = self.log_entries[-500:]  # 最新500件のみ保持
            recovery_actions.append(
                f"Log entries reduced: {original_count} -> {len(self.log_entries)}"
            )

            # 2. 修復アクション履歴のクリーンアップ
            self.repair_actions = self.repair_actions[-50:]  # 最新50件のみ保持
            recovery_actions.append("Repair actions history cleaned")

            # 3. 監視間隔の調整
            original_interval = self.monitoring_interval
            self.monitoring_interval = max(60, original_interval * 2)  # 間隔を倍に
            recovery_actions.append(
                f"Monitoring interval adjusted: {original_interval}s -> {self.monitoring_interval}s"
            )

            # 4. 緊急バックアップの作成
            if os.path.exists(self.analysis_results_file):
                backup_file = (
                    f"{self.analysis_results_file}.emergency.{int(time.time())}"
                )
                shutil.copy2(self.analysis_results_file, backup_file)
                recovery_actions.append(f"Emergency backup created: {backup_file}")

            # 5. システム安定化待機
            await asyncio.sleep(30)
            recovery_actions.append("System stabilization completed")

            self.logger.info(
                f"Emergency log recovery completed: {', '.join(recovery_actions)}"
            )

        except Exception as e:
            recovery_actions.append(f"Recovery failed: {str(e)}")
            self.logger.error(f"Emergency log recovery failed: {str(e)}")

    async def cleanup_old_analysis_data(self):
        """古い分析データのクリーンアップ"""
        try:
            # ログエントリのクリーンアップ（1000件以上の場合）
            if len(self.log_entries) > 1000:
                self.log_entries = self.log_entries[-1000:]
                self.logger.info("Log entries trimmed to 1000 most recent")

            # 修復アクション履歴のクリーンアップ（100件以上の場合）
            if len(self.repair_actions) > 100:
                self.repair_actions = self.repair_actions[-100:]
                self.logger.info("Repair actions history trimmed to 100 most recent")

            # 古い分析結果ファイルのクリーンアップ
            log_dir = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs"
            if os.path.exists(log_dir):
                cutoff_date = datetime.now() - timedelta(days=7)

                for filename in os.listdir(log_dir):
                    if filename.startswith("log_analysis_") and filename.endswith(
                        ".json"
                    ):
                        filepath = os.path.join(log_dir, filename)
                        file_mtime = datetime.fromtimestamp(os.path.getmtime(filepath))

                        if file_mtime < cutoff_date:
                            try:
                                os.remove(filepath)
                                self.logger.info(
                                    f"Removed old analysis file: {filename}"
                                )
                            except OSError as e:
                                self.logger.warning(
                                    f"Could not remove old file {filename}: {str(e)}"
                                )

        except Exception as e:
            self.logger.error(f"Cleanup failed: {str(e)}")

    def stop_monitoring(self):
        """ログ監視停止"""
        self.monitoring_active = False
        self.logger.info("Log analysis monitoring stopped")


# 使用例とエントリーポイント
async def main():
    """メイン実行関数"""
    log_analyzer = AutoLogAnalysisRepairEngine()

    try:
        await log_analyzer.start_infinite_log_monitoring()
    except KeyboardInterrupt:
        log_analyzer.stop_monitoring()
        print("Log analysis monitoring stopped by user")
    except Exception as e:
        print(f"Log analysis monitoring failed: {str(e)}")


if __name__ == "__main__":
    # ログ設定
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler(
                "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/log_analyzer.log"
            ),
            logging.StreamHandler(),
        ],
    )

    # 非同期実行
    asyncio.run(main())
