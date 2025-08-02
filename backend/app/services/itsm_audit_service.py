"""ITSM準拠監査サービス"""

import json
import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from pathlib import Path
import aiofiles
from enum import Enum

from app.core.config import settings
from app.core.exceptions import ITSMException

logger = logging.getLogger(__name__)

class AuditEventType(Enum):
    """監査イベントタイプ"""
    API_ACCESS = "api_access"
    CI_WORKFLOW_ACTION = "ci_workflow_action"
    SECURITY_EVENT = "security_event"
    SYSTEM_CHANGE = "system_change"
    DATA_ACCESS = "data_access"
    USER_ACTION = "user_action"
    AUTOMATED_REPAIR = "automated_repair"
    CONFIGURATION_CHANGE = "configuration_change"


class AuditSeverity(Enum):
    """監査重要度"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ITSMAuditService:
    """ITSM準拠監査サービス"""
    
    def __init__(self):
        self.audit_log_dir = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/audit"
        self.metrics_dir = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/metrics"
        self.compliance_dir = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/compliance"
        
        # ディレクトリ作成
        for directory in [self.audit_log_dir, self.metrics_dir, self.compliance_dir]:
            os.makedirs(directory, exist_ok=True)
    
    async def log_audit_event(self, 
                            event_type: AuditEventType,
                            event_description: str,
                            user_id: Optional[str] = None,
                            resource_id: Optional[str] = None,
                            severity: AuditSeverity = AuditSeverity.MEDIUM,
                            additional_data: Optional[Dict[str, Any]] = None,
                            source_ip: Optional[str] = None,
                            user_agent: Optional[str] = None) -> str:
        """監査イベントをログに記録"""
        try:
            audit_id = str(uuid.uuid4())
            timestamp = datetime.now()
            
            audit_entry = {
                "audit_id": audit_id,
                "timestamp": timestamp.isoformat(),
                "event_type": event_type.value,
                "event_description": event_description,
                "user_id": user_id,
                "resource_id": resource_id,
                "severity": severity.value,
                "source_ip": source_ip,
                "user_agent": user_agent,
                "session_id": self._generate_session_id(),
                "compliance_version": "ITSM-v1.0",
                "additional_data": additional_data or {},
                "system_context": {
                    "environment": settings.ENVIRONMENT,
                    "service_name": settings.PROJECT_NAME,
                    "service_version": settings.PROJECT_VERSION
                }
            }
            
            # 日付別ファイルに記録
            log_file = os.path.join(
                self.audit_log_dir, 
                f"audit_{timestamp.strftime('%Y%m%d')}.log"
            )
            
            async with aiofiles.open(log_file, 'a', encoding='utf-8') as f:
                await f.write(json.dumps(audit_entry, ensure_ascii=False) + '\n')
            
            # 重要度が高い場合は別途アラート記録
            if severity in [AuditSeverity.HIGH, AuditSeverity.CRITICAL]:
                await self._log_high_severity_event(audit_entry)
            
            # コンプライアンス要件に応じた追加処理
            await self._process_compliance_requirements(audit_entry)
            
            return audit_id
            
        except Exception as e:
            logger.error(f"Error logging audit event: {e}")
            raise ITSMException(
                status_code=500,
                error_code="AUDIT_LOGGING_ERROR",
                message="監査ログの記録に失敗しました"
            )
    
    async def _log_high_severity_event(self, audit_entry: Dict[str, Any]) -> None:
        """高重要度イベントの特別処理"""
        try:
            alert_file = os.path.join(self.audit_log_dir, "high_severity_alerts.log")
            
            alert_entry = {
                "alert_id": str(uuid.uuid4()),
                "original_audit_id": audit_entry["audit_id"],
                "timestamp": datetime.now().isoformat(),
                "severity": audit_entry["severity"],
                "event_type": audit_entry["event_type"],
                "description": audit_entry["event_description"],
                "requires_review": True,
                "escalation_needed": audit_entry["severity"] == AuditSeverity.CRITICAL.value
            }
            
            async with aiofiles.open(alert_file, 'a', encoding='utf-8') as f:
                await f.write(json.dumps(alert_entry, ensure_ascii=False) + '\n')
            
        except Exception as e:
            logger.error(f"Error logging high severity event: {e}")
    
    async def _process_compliance_requirements(self, audit_entry: Dict[str, Any]) -> None:
        """コンプライアンス要件の処理"""
        try:
            # GDPR/個人情報保護対応
            if self._contains_sensitive_data(audit_entry):
                await self._handle_sensitive_data_audit(audit_entry)
            
            # SOX法対応（財務関連）
            if self._is_financial_operation(audit_entry):
                await self._handle_financial_audit(audit_entry)
            
            # セキュリティコンプライアンス
            if audit_entry["event_type"] == AuditEventType.SECURITY_EVENT.value:
                await self._handle_security_compliance(audit_entry)
            
        except Exception as e:
            logger.error(f"Error processing compliance requirements: {e}")
    
    def _contains_sensitive_data(self, audit_entry: Dict[str, Any]) -> bool:
        """機密データが含まれているかチェック"""
        sensitive_indicators = [
            "password", "token", "key", "secret", "personal", "credit_card", "ssn"
        ]
        
        data_str = json.dumps(audit_entry).lower()
        return any(indicator in data_str for indicator in sensitive_indicators)
    
    def _is_financial_operation(self, audit_entry: Dict[str, Any]) -> bool:
        """財務関連操作かチェック"""
        financial_indicators = [
            "payment", "invoice", "financial", "billing", "cost", "budget"
        ]
        
        data_str = json.dumps(audit_entry).lower()
        return any(indicator in data_str for indicator in financial_indicators)
    
    async def _handle_sensitive_data_audit(self, audit_entry: Dict[str, Any]) -> None:
        """機密データ監査の処理"""
        try:
            privacy_log_file = os.path.join(self.compliance_dir, "privacy_audit.log")
            
            privacy_entry = {
                "privacy_audit_id": str(uuid.uuid4()),
                "original_audit_id": audit_entry["audit_id"],
                "timestamp": datetime.now().isoformat(),
                "data_classification": "sensitive",
                "retention_period": "7_years",
                "access_logged": True,
                "encryption_required": True
            }
            
            async with aiofiles.open(privacy_log_file, 'a', encoding='utf-8') as f:
                await f.write(json.dumps(privacy_entry, ensure_ascii=False) + '\n')
            
        except Exception as e:
            logger.error(f"Error handling sensitive data audit: {e}")
    
    async def _handle_financial_audit(self, audit_entry: Dict[str, Any]) -> None:
        """財務監査の処理"""
        try:
            financial_log_file = os.path.join(self.compliance_dir, "financial_audit.log")
            
            financial_entry = {
                "financial_audit_id": str(uuid.uuid4()),
                "original_audit_id": audit_entry["audit_id"],
                "timestamp": datetime.now().isoformat(),
                "sox_compliance": True,
                "retention_period": "7_years",
                "audit_trail_complete": True
            }
            
            async with aiofiles.open(financial_log_file, 'a', encoding='utf-8') as f:
                await f.write(json.dumps(financial_entry, ensure_ascii=False) + '\n')
            
        except Exception as e:
            logger.error(f"Error handling financial audit: {e}")
    
    async def _handle_security_compliance(self, audit_entry: Dict[str, Any]) -> None:
        """セキュリティコンプライアンスの処理"""
        try:
            security_log_file = os.path.join(self.compliance_dir, "security_compliance.log")
            
            security_entry = {
                "security_compliance_id": str(uuid.uuid4()),
                "original_audit_id": audit_entry["audit_id"],
                "timestamp": datetime.now().isoformat(),
                "iso27001_compliant": True,
                "nist_framework_aligned": True,
                "incident_response_triggered": audit_entry["severity"] in ["high", "critical"]
            }
            
            async with aiofiles.open(security_log_file, 'a', encoding='utf-8') as f:
                await f.write(json.dumps(security_entry, ensure_ascii=False) + '\n')
            
        except Exception as e:
            logger.error(f"Error handling security compliance: {e}")
    
    def _generate_session_id(self) -> str:
        """セッションIDを生成"""
        return str(uuid.uuid4())[:8]
    
    async def get_audit_logs(self, 
                           start_date: Optional[datetime] = None,
                           end_date: Optional[datetime] = None,
                           event_type: Optional[AuditEventType] = None,
                           severity: Optional[AuditSeverity] = None,
                           user_id: Optional[str] = None,
                           limit: int = 100) -> List[Dict[str, Any]]:
        """監査ログを検索・取得"""
        try:
            logs = []
            
            # 日付範囲の設定
            if not start_date:
                start_date = datetime.now() - timedelta(days=30)
            if not end_date:
                end_date = datetime.now()
            
            # 該当する日付のログファイルを読み込み
            current_date = start_date.date()
            while current_date <= end_date.date():
                log_file = os.path.join(
                    self.audit_log_dir,
                    f"audit_{current_date.strftime('%Y%m%d')}.log"
                )
                
                if os.path.exists(log_file):
                    async with aiofiles.open(log_file, 'r', encoding='utf-8') as f:
                        async for line in f:
                            try:
                                entry = json.loads(line.strip())
                                
                                # フィルタリング
                                if event_type and entry.get("event_type") != event_type.value:
                                    continue
                                if severity and entry.get("severity") != severity.value:
                                    continue
                                if user_id and entry.get("user_id") != user_id:
                                    continue
                                
                                logs.append(entry)
                                
                                if len(logs) >= limit:
                                    break
                                    
                            except json.JSONDecodeError:
                                continue
                
                current_date += timedelta(days=1)
                
                if len(logs) >= limit:
                    break
            
            # 時間順でソート（新しいものから）
            logs.sort(key=lambda x: x["timestamp"], reverse=True)
            return logs[:limit]
            
        except Exception as e:
            logger.error(f"Error retrieving audit logs: {e}")
            raise ITSMException(
                status_code=500,
                error_code="AUDIT_RETRIEVAL_ERROR",
                message="監査ログの取得に失敗しました"
            )
    
    async def generate_compliance_report(self, 
                                       report_type: str = "monthly",
                                       start_date: Optional[datetime] = None,
                                       end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """コンプライアンスレポートを生成"""
        try:
            if not start_date:
                start_date = datetime.now() - timedelta(days=30)
            if not end_date:
                end_date = datetime.now()
            
            # 監査ログを取得
            all_logs = await self.get_audit_logs(
                start_date=start_date,
                end_date=end_date,
                limit=10000
            )
            
            # 統計を計算
            stats = {
                "total_events": len(all_logs),
                "events_by_type": {},
                "events_by_severity": {},
                "events_by_user": {},
                "security_events": 0,
                "compliance_violations": 0,
                "high_severity_events": 0
            }
            
            for log in all_logs:
                # イベントタイプ別統計
                event_type = log.get("event_type", "unknown")
                stats["events_by_type"][event_type] = stats["events_by_type"].get(event_type, 0) + 1
                
                # 重要度別統計
                severity = log.get("severity", "unknown")
                stats["events_by_severity"][severity] = stats["events_by_severity"].get(severity, 0) + 1
                
                # ユーザー別統計
                user_id = log.get("user_id", "system")
                stats["events_by_user"][user_id] = stats["events_by_user"].get(user_id, 0) + 1
                
                # 特別なカウント
                if event_type == AuditEventType.SECURITY_EVENT.value:
                    stats["security_events"] += 1
                
                if severity in [AuditSeverity.HIGH.value, AuditSeverity.CRITICAL.value]:
                    stats["high_severity_events"] += 1
            
            # コンプライアンススコアを計算
            compliance_score = self._calculate_compliance_score(stats)
            
            report = {
                "report_id": str(uuid.uuid4()),
                "report_type": report_type,
                "generated_at": datetime.now().isoformat(),
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "statistics": stats,
                "compliance_score": compliance_score,
                "recommendations": self._generate_recommendations(stats),
                "certification_status": {
                    "iso27001": compliance_score >= 85,
                    "sox_compliance": compliance_score >= 90,
                    "gdpr_compliance": compliance_score >= 88
                }
            }
            
            # レポートをファイルに保存
            report_file = os.path.join(
                self.compliance_dir,
                f"compliance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            )
            
            async with aiofiles.open(report_file, 'w', encoding='utf-8') as f:
                await f.write(json.dumps(report, ensure_ascii=False, indent=2))
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating compliance report: {e}")
            raise ITSMException(
                status_code=500,
                error_code="COMPLIANCE_REPORT_ERROR",
                message="コンプライアンスレポートの生成に失敗しました"
            )
    
    def _calculate_compliance_score(self, stats: Dict[str, Any]) -> float:
        """コンプライアンススコアを計算"""
        try:
            total_events = stats["total_events"]
            if total_events == 0:
                return 100.0
            
            high_severity_ratio = stats["high_severity_events"] / total_events
            security_event_ratio = stats["security_events"] / total_events
            
            # スコア計算（100点満点）
            base_score = 100.0
            
            # 高重要度イベントが多いとスコア減点
            base_score -= high_severity_ratio * 30
            
            # セキュリティイベントが多いとスコア減点
            base_score -= security_event_ratio * 20
            
            # コンプライアンス違反があるとスコア減点
            violations = stats.get("compliance_violations", 0)
            base_score -= (violations / total_events) * 50
            
            return max(0.0, min(100.0, base_score))
            
        except Exception as e:
            logger.error(f"Error calculating compliance score: {e}")
            return 0.0
    
    def _generate_recommendations(self, stats: Dict[str, Any]) -> List[str]:
        """改善提案を生成"""
        recommendations = []
        
        try:
            total_events = stats["total_events"]
            if total_events == 0:
                return ["監査イベントがありません。システムの監査設定を確認してください。"]
            
            high_severity_ratio = stats["high_severity_events"] / total_events
            if high_severity_ratio > 0.1:
                recommendations.append("高重要度イベントの発生率が高いです。セキュリティ対策の強化を検討してください。")
            
            security_events = stats["security_events"]
            if security_events > 0:
                recommendations.append(f"{security_events}件のセキュリティイベントが発生しています。詳細な調査を実施してください。")
            
            # ユーザーアクティビティの分析
            user_stats = stats["events_by_user"]
            if "system" in user_stats and user_stats["system"] / total_events > 0.8:
                recommendations.append("システム自動処理の割合が高いです。手動承認プロセスの導入を検討してください。")
            
            if len(recommendations) == 0:
                recommendations.append("監査状況は良好です。現在のセキュリティポリシーを維持してください。")
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return ["推奨事項の生成中にエラーが発生しました。"]


# グローバルサービスインスタンス
audit_service = ITSMAuditService()


# 便利な関数
async def log_api_access(endpoint: str, method: str, user_id: str, 
                        source_ip: str, status_code: int, 
                        response_time: float) -> str:
    """API アクセスをログに記録"""
    severity = AuditSeverity.LOW
    if status_code >= 400:
        severity = AuditSeverity.MEDIUM
    if status_code >= 500:
        severity = AuditSeverity.HIGH
    
    return await audit_service.log_audit_event(
        event_type=AuditEventType.API_ACCESS,
        event_description=f"{method} {endpoint} - Status: {status_code}",
        user_id=user_id,
        resource_id=endpoint,
        severity=severity,
        source_ip=source_ip,
        additional_data={
            "http_method": method,
            "status_code": status_code,
            "response_time_ms": response_time * 1000
        }
    )


async def log_ci_workflow_action(action: str, workflow_id: int, 
                               user_id: str, result: str) -> str:
    """CI/CD ワークフローアクションをログに記録"""
    severity = AuditSeverity.MEDIUM
    if result == "failed":
        severity = AuditSeverity.HIGH
    
    return await audit_service.log_audit_event(
        event_type=AuditEventType.CI_WORKFLOW_ACTION,
        event_description=f"CI/CD {action} for workflow {workflow_id} - Result: {result}",
        user_id=user_id,
        resource_id=str(workflow_id),
        severity=severity,
        additional_data={
            "action": action,
            "workflow_id": workflow_id,
            "result": result
        }
    )


async def log_security_event(event_description: str, user_id: Optional[str] = None,
                           source_ip: Optional[str] = None, 
                           severity: AuditSeverity = AuditSeverity.HIGH) -> str:
    """セキュリティイベントをログに記録"""
    return await audit_service.log_audit_event(
        event_type=AuditEventType.SECURITY_EVENT,
        event_description=event_description,
        user_id=user_id,
        severity=severity,
        source_ip=source_ip
    )


async def log_automated_repair(repair_target: str, repair_result: str, 
                             repairs_count: int) -> str:
    """自動修復をログに記録"""
    severity = AuditSeverity.MEDIUM
    if repair_result == "failed":
        severity = AuditSeverity.HIGH
    
    return await audit_service.log_audit_event(
        event_type=AuditEventType.AUTOMATED_REPAIR,
        event_description=f"Automated repair of {repair_target} - Result: {repair_result}",
        user_id="system",
        resource_id=repair_target,
        severity=severity,
        additional_data={
            "repair_target": repair_target,
            "repair_result": repair_result,
            "repairs_count": repairs_count
        }
    )