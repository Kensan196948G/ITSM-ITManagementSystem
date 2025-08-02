#!/usr/bin/env python3
"""
ITSM準拠インシデント管理システム
- インシデント自動分類・優先度設定
- 修復ログの完全記録
- 成功/失敗メトリクス追跡
- エラー根本原因分析
- SLA準拠の自動エスカレーション
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, asdict, field
from enum import Enum
import hashlib

class IncidentPriority(Enum):
    """ITSM準拠インシデント優先度"""
    P1_CRITICAL = {"level": 1, "sla_minutes": 15, "description": "Business Critical"}
    P2_HIGH = {"level": 2, "sla_minutes": 60, "description": "High Impact"}
    P3_MEDIUM = {"level": 3, "sla_minutes": 240, "description": "Medium Impact"}
    P4_LOW = {"level": 4, "sla_minutes": 1440, "description": "Low Impact"}

class IncidentCategory(Enum):
    """ITSM準拠インシデントカテゴリ"""
    GITHUB_ACTIONS = "github_actions"
    BUILD_FAILURE = "build_failure"
    TEST_FAILURE = "test_failure"
    DEPLOYMENT = "deployment"
    SECURITY = "security"
    PERFORMANCE = "performance"
    INFRASTRUCTURE = "infrastructure"
    APPLICATION = "application"

class IncidentState(Enum):
    """ITSM準拠インシデント状態"""
    NEW = "new"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    PENDING = "pending"
    RESOLVED = "resolved"
    CLOSED = "closed"
    CANCELLED = "cancelled"

class ResolutionMethod(Enum):
    """解決方法"""
    AUTO_REPAIR = "auto_repair"
    MANUAL_FIX = "manual_fix"
    WORKAROUND = "workaround"
    ESCALATION = "escalation"
    DUPLICATE = "duplicate"

@dataclass
class ITSMIncident:
    """ITSM準拠インシデント"""
    incident_id: str
    title: str
    description: str
    category: IncidentCategory
    priority: IncidentPriority
    state: IncidentState
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    
    # GitHub関連情報
    github_run_id: Optional[str] = None
    github_workflow: Optional[str] = None
    github_commit_sha: Optional[str] = None
    
    # エラー分析
    error_patterns: List[str] = field(default_factory=list)
    root_cause: Optional[str] = None
    root_cause_category: Optional[str] = None
    
    # 修復情報
    auto_repair_attempts: int = 0
    manual_interventions: int = 0
    resolution_method: Optional[ResolutionMethod] = None
    resolution_description: Optional[str] = None
    
    # SLA追跡
    sla_due_time: Optional[datetime] = None
    sla_breached: bool = False
    response_time_minutes: Optional[float] = None
    resolution_time_minutes: Optional[float] = None
    
    # 関連情報
    assigned_to: str = "auto_repair_system"
    escalated_to: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    related_incidents: List[str] = field(default_factory=list)

class ITSMIncidentManager:
    """ITSM準拠インシデント管理システム"""
    
    def __init__(self):
        self.base_path = Path(__file__).parent
        self.project_root = self.base_path.parent
        
        # ログ設定
        self.setup_logging()
        
        # インシデントデータベース（ファイルベース）
        self.incidents_db_file = self.base_path / "itsm_incidents.json"
        self.incidents: Dict[str, ITSMIncident] = {}
        
        # メトリクス
        self.metrics = {
            "total_incidents": 0,
            "incidents_by_priority": {p.name: 0 for p in IncidentPriority},
            "incidents_by_category": {c.name: 0 for c in IncidentCategory},
            "incidents_by_state": {s.name: 0 for s in IncidentState},
            "avg_response_time": 0.0,
            "avg_resolution_time": 0.0,
            "sla_breach_rate": 0.0,
            "auto_resolution_rate": 0.0,
            "manual_intervention_rate": 0.0
        }
        
        # 設定
        self.config = {
            "auto_escalation_enabled": True,
            "sla_monitoring_enabled": True,
            "duplicate_detection_enabled": True,
            "root_cause_analysis_enabled": True,
            "notification_enabled": True,
            "metrics_update_interval": 300  # 5分間隔
        }
        
        # 既知のエラーパターン
        self.error_patterns_db = self.load_error_patterns()
        
        # インシデントデータを読み込み
        self.load_incidents()
        
        self.logger.info("🎫 ITSM Incident Manager initialized")

    def setup_logging(self):
        """ログ設定"""
        log_file = self.base_path / "itsm_incident_manager.log"
        
        formatter = logging.Formatter(
            '%(asctime)s.%(msecs)03d - [ITSM] - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        
        self.logger = logging.getLogger("ITSMIncidentManager")
        self.logger.setLevel(logging.INFO)
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)

    def load_error_patterns(self) -> Dict[str, Dict]:
        """エラーパターンデータベース読み込み"""
        return {
            "dependency_error": {
                "patterns": ["ModuleNotFoundError", "ImportError", "npm ERR!", "Package not found"],
                "category": IncidentCategory.BUILD_FAILURE,
                "priority": IncidentPriority.P2_HIGH,
                "root_cause_category": "dependency_management",
                "common_solutions": [
                    "pip install -r requirements.txt",
                    "npm ci",
                    "Update package versions"
                ]
            },
            "test_failure": {
                "patterns": ["FAILED test_", "AssertionError", "Test failed"],
                "category": IncidentCategory.TEST_FAILURE,
                "priority": IncidentPriority.P3_MEDIUM,
                "root_cause_category": "test_logic",
                "common_solutions": [
                    "Fix test logic",
                    "Update test data",
                    "Check test environment"
                ]
            },
            "build_error": {
                "patterns": ["Build failed", "compilation error", "SyntaxError"],
                "category": IncidentCategory.BUILD_FAILURE,
                "priority": IncidentPriority.P2_HIGH,
                "root_cause_category": "code_quality",
                "common_solutions": [
                    "Fix syntax errors",
                    "Update build configuration",
                    "Check dependencies"
                ]
            },
            "deployment_error": {
                "patterns": ["deployment failed", "server not responding", "connection refused"],
                "category": IncidentCategory.DEPLOYMENT,
                "priority": IncidentPriority.P1_CRITICAL,
                "root_cause_category": "infrastructure",
                "common_solutions": [
                    "Check server status",
                    "Verify network connectivity",
                    "Review deployment configuration"
                ]
            },
            "security_issue": {
                "patterns": ["security vulnerability", "CVE-", "audit vulnerability"],
                "category": IncidentCategory.SECURITY,
                "priority": IncidentPriority.P1_CRITICAL,
                "root_cause_category": "security",
                "common_solutions": [
                    "Apply security patches",
                    "Update vulnerable packages",
                    "Review security policies"
                ]
            }
        }

    def load_incidents(self):
        """インシデントデータ読み込み"""
        try:
            if self.incidents_db_file.exists():
                with open(self.incidents_db_file, 'r') as f:
                    incidents_data = json.load(f)
                    
                for incident_id, incident_dict in incidents_data.items():
                    # JSONから ITSMIncident オブジェクトに変換
                    incident = self.dict_to_incident(incident_dict)
                    self.incidents[incident_id] = incident
                    
                self.logger.info(f"📋 Loaded {len(self.incidents)} existing incidents")
                
        except Exception as e:
            self.logger.error(f"Error loading incidents: {e}")
            self.incidents = {}

    def dict_to_incident(self, incident_dict: Dict) -> ITSMIncident:
        """辞書からITSMIncidentオブジェクトに変換"""
        # Enum変換
        category = IncidentCategory(incident_dict["category"])
        priority = IncidentPriority[incident_dict["priority"]]
        state = IncidentState(incident_dict["state"])
        
        # 日時変換
        created_at = datetime.fromisoformat(incident_dict["created_at"])
        updated_at = datetime.fromisoformat(incident_dict["updated_at"])
        resolved_at = datetime.fromisoformat(incident_dict["resolved_at"]) if incident_dict.get("resolved_at") else None
        closed_at = datetime.fromisoformat(incident_dict["closed_at"]) if incident_dict.get("closed_at") else None
        sla_due_time = datetime.fromisoformat(incident_dict["sla_due_time"]) if incident_dict.get("sla_due_time") else None
        
        # ResolutionMethod変換
        resolution_method = ResolutionMethod(incident_dict["resolution_method"]) if incident_dict.get("resolution_method") else None
        
        return ITSMIncident(
            incident_id=incident_dict["incident_id"],
            title=incident_dict["title"],
            description=incident_dict["description"],
            category=category,
            priority=priority,
            state=state,
            created_at=created_at,
            updated_at=updated_at,
            resolved_at=resolved_at,
            closed_at=closed_at,
            github_run_id=incident_dict.get("github_run_id"),
            github_workflow=incident_dict.get("github_workflow"),
            github_commit_sha=incident_dict.get("github_commit_sha"),
            error_patterns=incident_dict.get("error_patterns", []),
            root_cause=incident_dict.get("root_cause"),
            root_cause_category=incident_dict.get("root_cause_category"),
            auto_repair_attempts=incident_dict.get("auto_repair_attempts", 0),
            manual_interventions=incident_dict.get("manual_interventions", 0),
            resolution_method=resolution_method,
            resolution_description=incident_dict.get("resolution_description"),
            sla_due_time=sla_due_time,
            sla_breached=incident_dict.get("sla_breached", False),
            response_time_minutes=incident_dict.get("response_time_minutes"),
            resolution_time_minutes=incident_dict.get("resolution_time_minutes"),
            assigned_to=incident_dict.get("assigned_to", "auto_repair_system"),
            escalated_to=incident_dict.get("escalated_to"),
            tags=incident_dict.get("tags", []),
            related_incidents=incident_dict.get("related_incidents", [])
        )

    def save_incidents(self):
        """インシデントデータ保存"""
        try:
            incidents_data = {}
            for incident_id, incident in self.incidents.items():
                incidents_data[incident_id] = self.incident_to_dict(incident)
            
            with open(self.incidents_db_file, 'w') as f:
                json.dump(incidents_data, f, indent=2, default=str)
                
        except Exception as e:
            self.logger.error(f"Error saving incidents: {e}")

    def incident_to_dict(self, incident: ITSMIncident) -> Dict:
        """ITSMIncidentオブジェクトを辞書に変換"""
        return {
            "incident_id": incident.incident_id,
            "title": incident.title,
            "description": incident.description,
            "category": incident.category.value,
            "priority": incident.priority.name,
            "state": incident.state.value,
            "created_at": incident.created_at.isoformat(),
            "updated_at": incident.updated_at.isoformat(),
            "resolved_at": incident.resolved_at.isoformat() if incident.resolved_at else None,
            "closed_at": incident.closed_at.isoformat() if incident.closed_at else None,
            "github_run_id": incident.github_run_id,
            "github_workflow": incident.github_workflow,
            "github_commit_sha": incident.github_commit_sha,
            "error_patterns": incident.error_patterns,
            "root_cause": incident.root_cause,
            "root_cause_category": incident.root_cause_category,
            "auto_repair_attempts": incident.auto_repair_attempts,
            "manual_interventions": incident.manual_interventions,
            "resolution_method": incident.resolution_method.value if incident.resolution_method else None,
            "resolution_description": incident.resolution_description,
            "sla_due_time": incident.sla_due_time.isoformat() if incident.sla_due_time else None,
            "sla_breached": incident.sla_breached,
            "response_time_minutes": incident.response_time_minutes,
            "resolution_time_minutes": incident.resolution_time_minutes,
            "assigned_to": incident.assigned_to,
            "escalated_to": incident.escalated_to,
            "tags": incident.tags,
            "related_incidents": incident.related_incidents
        }

    def analyze_error_patterns(self, error_logs: str, workflow_name: str) -> Dict[str, Any]:
        """エラーパターン分析"""
        analysis = {
            "matched_patterns": [],
            "suggested_category": IncidentCategory.APPLICATION,
            "suggested_priority": IncidentPriority.P3_MEDIUM,
            "root_cause_category": "unknown",
            "confidence": 0.0
        }
        
        max_confidence = 0.0
        
        for pattern_name, pattern_info in self.error_patterns_db.items():
            matches = 0
            for pattern in pattern_info["patterns"]:
                if pattern.lower() in error_logs.lower():
                    matches += 1
            
            if matches > 0:
                confidence = min(matches / len(pattern_info["patterns"]), 1.0)
                analysis["matched_patterns"].append({
                    "pattern": pattern_name,
                    "confidence": confidence,
                    "matches": matches
                })
                
                if confidence > max_confidence:
                    max_confidence = confidence
                    analysis["suggested_category"] = pattern_info["category"]
                    analysis["suggested_priority"] = pattern_info["priority"]
                    analysis["root_cause_category"] = pattern_info["root_cause_category"]
        
        analysis["confidence"] = max_confidence
        
        # ワークフロー名による優先度調整
        if "deploy" in workflow_name.lower() or "production" in workflow_name.lower():
            analysis["suggested_priority"] = IncidentPriority.P1_CRITICAL
        elif "security" in workflow_name.lower():
            analysis["suggested_priority"] = IncidentPriority.P1_CRITICAL
            analysis["suggested_category"] = IncidentCategory.SECURITY
        
        return analysis

    def detect_duplicate_incidents(self, error_patterns: List[str], github_workflow: str) -> List[str]:
        """重複インシデント検出"""
        similar_incidents = []
        
        for incident_id, incident in self.incidents.items():
            if incident.state in [IncidentState.CLOSED, IncidentState.CANCELLED]:
                continue
                
            # エラーパターンの類似度チェック
            if incident.error_patterns:
                common_patterns = set(error_patterns) & set(incident.error_patterns)
                similarity = len(common_patterns) / max(len(error_patterns), len(incident.error_patterns))
                
                if similarity > 0.7:  # 70%以上の類似度
                    similar_incidents.append(incident_id)
            
            # 同じワークフローでの最近のインシデント
            if (incident.github_workflow == github_workflow and 
                incident.created_at > datetime.now() - timedelta(hours=1)):
                similar_incidents.append(incident_id)
        
        return list(set(similar_incidents))

    def create_incident(self, 
                       title: str,
                       description: str,
                       error_logs: str = "",
                       github_run_id: str = None,
                       github_workflow: str = None,
                       github_commit_sha: str = None) -> ITSMIncident:
        """インシデント作成"""
        
        # エラーパターン分析
        analysis = self.analyze_error_patterns(error_logs, github_workflow or "")
        
        # インシデントID生成
        incident_id = f"INC-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        # SLA期限計算
        sla_minutes = analysis["suggested_priority"].value["sla_minutes"]
        sla_due_time = datetime.now() + timedelta(minutes=sla_minutes)
        
        # 重複インシデント検出
        error_patterns = [match["pattern"] for match in analysis["matched_patterns"]]
        related_incidents = self.detect_duplicate_incidents(error_patterns, github_workflow or "")
        
        # インシデント作成
        incident = ITSMIncident(
            incident_id=incident_id,
            title=title,
            description=description,
            category=analysis["suggested_category"],
            priority=analysis["suggested_priority"],
            state=IncidentState.NEW,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            github_run_id=github_run_id,
            github_workflow=github_workflow,
            github_commit_sha=github_commit_sha,
            error_patterns=error_patterns,
            root_cause_category=analysis["root_cause_category"],
            sla_due_time=sla_due_time,
            related_incidents=related_incidents
        )
        
        # タグ自動生成
        incident.tags = self.generate_incident_tags(incident, error_logs)
        
        # インシデント保存
        self.incidents[incident_id] = incident
        self.save_incidents()
        
        # メトリクス更新
        self.update_metrics()
        
        self.logger.critical(f"🎫 INCIDENT CREATED: {incident_id} - {title} [{analysis['suggested_priority'].name}]")
        
        return incident

    def generate_incident_tags(self, incident: ITSMIncident, error_logs: str) -> List[str]:
        """インシデントタグ自動生成"""
        tags = []
        
        # カテゴリベースタグ
        tags.append(incident.category.value)
        
        # 優先度タグ
        tags.append(incident.priority.name.lower())
        
        # ワークフロータグ
        if incident.github_workflow:
            tags.append(f"workflow_{incident.github_workflow.lower().replace(' ', '_')}")
        
        # エラーパターンタグ
        for pattern in incident.error_patterns:
            tags.append(f"pattern_{pattern}")
        
        # ログ内容からのタグ抽出
        if "docker" in error_logs.lower():
            tags.append("docker")
        if "database" in error_logs.lower():
            tags.append("database")
        if "api" in error_logs.lower():
            tags.append("api")
        if "frontend" in error_logs.lower():
            tags.append("frontend")
        if "backend" in error_logs.lower():
            tags.append("backend")
        
        return list(set(tags))

    def update_incident(self, incident_id: str, **updates) -> bool:
        """インシデント更新"""
        if incident_id not in self.incidents:
            self.logger.error(f"Incident not found: {incident_id}")
            return False
        
        incident = self.incidents[incident_id]
        old_state = incident.state
        
        # 更新適用
        for key, value in updates.items():
            if hasattr(incident, key):
                setattr(incident, key, value)
        
        incident.updated_at = datetime.now()
        
        # 状態変更時の処理
        if "state" in updates and updates["state"] != old_state:
            self.handle_state_change(incident, old_state, updates["state"])
        
        # SLA監視
        self.check_sla_breach(incident)
        
        # インシデント保存
        self.save_incidents()
        self.update_metrics()
        
        self.logger.info(f"📝 INCIDENT UPDATED: {incident_id} - State: {incident.state.value}")
        
        return True

    def handle_state_change(self, incident: ITSMIncident, old_state: IncidentState, new_state: IncidentState):
        """インシデント状態変更処理"""
        now = datetime.now()
        
        if new_state == IncidentState.ASSIGNED and old_state == IncidentState.NEW:
            # 応答時間記録
            incident.response_time_minutes = (now - incident.created_at).total_seconds() / 60
            
        elif new_state == IncidentState.RESOLVED:
            # 解決時間記録
            incident.resolved_at = now
            incident.resolution_time_minutes = (now - incident.created_at).total_seconds() / 60
            
        elif new_state == IncidentState.CLOSED:
            # クローズ時間記録
            incident.closed_at = now
            if not incident.resolved_at:
                incident.resolved_at = now
                incident.resolution_time_minutes = (now - incident.created_at).total_seconds() / 60

    def check_sla_breach(self, incident: ITSMIncident):
        """SLA違反チェック"""
        if not incident.sla_due_time or incident.sla_breached:
            return
        
        if datetime.now() > incident.sla_due_time and incident.state not in [IncidentState.RESOLVED, IncidentState.CLOSED]:
            incident.sla_breached = True
            self.logger.warning(f"⚠️ SLA BREACH: {incident.incident_id} - Due: {incident.sla_due_time}")
            
            # 自動エスカレーション
            if self.config["auto_escalation_enabled"]:
                self.escalate_incident(incident)

    def escalate_incident(self, incident: ITSMIncident):
        """インシデントエスカレーション"""
        if incident.priority == IncidentPriority.P1_CRITICAL:
            incident.escalated_to = "system_administrator"
        elif incident.priority == IncidentPriority.P2_HIGH:
            incident.escalated_to = "senior_engineer"
        else:
            incident.escalated_to = "team_lead"
        
        incident.manual_interventions += 1
        
        self.logger.critical(f"🚨 INCIDENT ESCALATED: {incident.incident_id} to {incident.escalated_to}")

    def record_auto_repair_attempt(self, incident_id: str, success: bool, description: str = "") -> bool:
        """自動修復試行記録"""
        if incident_id not in self.incidents:
            return False
        
        incident = self.incidents[incident_id]
        incident.auto_repair_attempts += 1
        incident.updated_at = datetime.now()
        
        if success:
            incident.state = IncidentState.RESOLVED
            incident.resolution_method = ResolutionMethod.AUTO_REPAIR
            incident.resolution_description = description or "Automatic repair successful"
            self.logger.info(f"✅ AUTO REPAIR SUCCESS: {incident_id}")
        else:
            incident.state = IncidentState.IN_PROGRESS
            self.logger.warning(f"❌ AUTO REPAIR FAILED: {incident_id} (Attempt {incident.auto_repair_attempts})")
            
            # 複数回失敗時のエスカレーション
            if incident.auto_repair_attempts >= 3:
                self.escalate_incident(incident)
        
        self.save_incidents()
        self.update_metrics()
        
        return True

    def update_metrics(self):
        """メトリクス更新"""
        total_incidents = len(self.incidents)
        self.metrics["total_incidents"] = total_incidents
        
        if total_incidents == 0:
            return
        
        # カテゴリ別集計
        for category in IncidentCategory:
            count = sum(1 for inc in self.incidents.values() if inc.category == category)
            self.metrics["incidents_by_category"][category.name] = count
        
        # 優先度別集計
        for priority in IncidentPriority:
            count = sum(1 for inc in self.incidents.values() if inc.priority == priority)
            self.metrics["incidents_by_priority"][priority.name] = count
        
        # 状態別集計
        for state in IncidentState:
            count = sum(1 for inc in self.incidents.values() if inc.state == state)
            self.metrics["incidents_by_state"][state.name] = count
        
        # 時間メトリクス
        response_times = [inc.response_time_minutes for inc in self.incidents.values() if inc.response_time_minutes]
        resolution_times = [inc.resolution_time_minutes for inc in self.incidents.values() if inc.resolution_time_minutes]
        
        self.metrics["avg_response_time"] = sum(response_times) / len(response_times) if response_times else 0
        self.metrics["avg_resolution_time"] = sum(resolution_times) / len(resolution_times) if resolution_times else 0
        
        # SLA違反率
        sla_breached = sum(1 for inc in self.incidents.values() if inc.sla_breached)
        self.metrics["sla_breach_rate"] = sla_breached / total_incidents
        
        # 自動解決率
        auto_resolved = sum(1 for inc in self.incidents.values() if inc.resolution_method == ResolutionMethod.AUTO_REPAIR)
        self.metrics["auto_resolution_rate"] = auto_resolved / total_incidents
        
        # 手動介入率
        manual_interventions = sum(1 for inc in self.incidents.values() if inc.manual_interventions > 0)
        self.metrics["manual_intervention_rate"] = manual_interventions / total_incidents

    def get_incident_report(self, incident_id: str) -> Dict[str, Any]:
        """インシデントレポート取得"""
        if incident_id not in self.incidents:
            return {"error": "Incident not found"}
        
        incident = self.incidents[incident_id]
        
        return {
            "incident_summary": {
                "id": incident.incident_id,
                "title": incident.title,
                "state": incident.state.value,
                "priority": incident.priority.name,
                "category": incident.category.value,
                "created_at": incident.created_at.isoformat(),
                "sla_due_time": incident.sla_due_time.isoformat() if incident.sla_due_time else None,
                "sla_breached": incident.sla_breached
            },
            "github_info": {
                "run_id": incident.github_run_id,
                "workflow": incident.github_workflow,
                "commit_sha": incident.github_commit_sha
            },
            "repair_attempts": {
                "auto_attempts": incident.auto_repair_attempts,
                "manual_interventions": incident.manual_interventions,
                "resolution_method": incident.resolution_method.value if incident.resolution_method else None
            },
            "timing": {
                "response_time_minutes": incident.response_time_minutes,
                "resolution_time_minutes": incident.resolution_time_minutes,
                "created_at": incident.created_at.isoformat(),
                "resolved_at": incident.resolved_at.isoformat() if incident.resolved_at else None
            },
            "analysis": {
                "error_patterns": incident.error_patterns,
                "root_cause": incident.root_cause,
                "root_cause_category": incident.root_cause_category,
                "tags": incident.tags
            }
        }

    def get_metrics_report(self) -> Dict[str, Any]:
        """メトリクスレポート取得"""
        return {
            "timestamp": datetime.now().isoformat(),
            "total_incidents": self.metrics["total_incidents"],
            "breakdown": {
                "by_priority": self.metrics["incidents_by_priority"],
                "by_category": self.metrics["incidents_by_category"],
                "by_state": self.metrics["incidents_by_state"]
            },
            "performance": {
                "avg_response_time_minutes": round(self.metrics["avg_response_time"], 2),
                "avg_resolution_time_minutes": round(self.metrics["avg_resolution_time"], 2),
                "sla_breach_rate": round(self.metrics["sla_breach_rate"] * 100, 2),
                "auto_resolution_rate": round(self.metrics["auto_resolution_rate"] * 100, 2),
                "manual_intervention_rate": round(self.metrics["manual_intervention_rate"] * 100, 2)
            }
        }

    def cleanup_old_incidents(self, days_old: int = 30):
        """古いインシデントのクリーンアップ"""
        cutoff_date = datetime.now() - timedelta(days=days_old)
        
        incidents_to_remove = []
        for incident_id, incident in self.incidents.items():
            if (incident.state == IncidentState.CLOSED and 
                incident.closed_at and 
                incident.closed_at < cutoff_date):
                incidents_to_remove.append(incident_id)
        
        for incident_id in incidents_to_remove:
            del self.incidents[incident_id]
        
        if incidents_to_remove:
            self.save_incidents()
            self.update_metrics()
            self.logger.info(f"🧹 Cleaned up {len(incidents_to_remove)} old incidents")

    async def start_monitoring(self):
        """ITSM監視開始"""
        self.logger.info("🎫 Starting ITSM incident monitoring")
        
        while True:
            try:
                # SLA監視
                for incident in self.incidents.values():
                    self.check_sla_breach(incident)
                
                # メトリクス更新
                self.update_metrics()
                
                # 古いインシデントクリーンアップ（1日1回）
                if datetime.now().hour == 2 and datetime.now().minute < 5:  # 午前2時
                    self.cleanup_old_incidents()
                
                await asyncio.sleep(self.config["metrics_update_interval"])
                
            except Exception as e:
                self.logger.error(f"ITSM monitoring error: {e}")
                await asyncio.sleep(60)


# グローバルITSMマネージャーインスタンス
itsm_manager = ITSMIncidentManager()


async def main():
    """テスト実行"""
    print("🎫 ITSM Incident Manager Test")
    
    # テストインシデント作成
    incident = itsm_manager.create_incident(
        title="GitHub Actions Build Failure",
        description="Build failed due to missing dependencies",
        error_logs="ModuleNotFoundError: No module named 'requests'",
        github_run_id="123456789",
        github_workflow="CI Pipeline",
        github_commit_sha="abc123"
    )
    
    print(f"Created incident: {incident.incident_id}")
    
    # 修復試行記録
    itsm_manager.record_auto_repair_attempt(incident.incident_id, True, "Dependencies installed successfully")
    
    # レポート表示
    report = itsm_manager.get_incident_report(incident.incident_id)
    print(f"Incident report: {json.dumps(report, indent=2, default=str)}")
    
    metrics = itsm_manager.get_metrics_report()
    print(f"Metrics report: {json.dumps(metrics, indent=2)}")


if __name__ == "__main__":
    asyncio.run(main())