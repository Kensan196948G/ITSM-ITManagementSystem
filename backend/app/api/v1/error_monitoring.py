"""エラー監視・修復システム統合APIエンドポイント"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.exceptions import ITSMException
from app.services.mcp_api_error_monitor import APIErrorMonitor, InfiniteLoopMonitor
from app.services.database_error_repair import DatabaseHealthMonitor
from app.services.performance_monitor import PerformanceMonitor
from app.services.security_error_monitor import SecurityErrorMonitor
from app.services.log_analysis_repair import LogAnalysisEngine
from app.services.infinite_auto_repair_system import InfiniteAutoRepairSystem
from app.services.enhanced_security_exceptions import (
    SecurityContext, SecurityLevel, secure_exception_handler, 
    require_permission, rate_limit
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/error-monitoring", tags=["Error Monitoring"])


# Request/Response モデル
class MonitoringStatus(BaseModel):
    """監視状態"""
    api_monitoring: bool
    database_monitoring: bool
    performance_monitoring: bool
    security_monitoring: bool
    log_analysis: bool
    infinite_loop_active: bool


class SystemHealthResponse(BaseModel):
    """システムヘルス応答"""
    timestamp: float
    overall_status: str
    api_health: Dict[str, Any]
    database_health: Dict[str, Any]
    performance_health: Dict[str, Any]
    security_health: Dict[str, Any]
    active_issues: List[Dict[str, Any]]
    recommendations: List[str]


class ErrorAnalysisRequest(BaseModel):
    """エラー分析リクエスト"""
    error_message: str
    error_type: str
    component: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None


class RepairTaskRequest(BaseModel):
    """修復タスクリクエスト"""
    task_type: str
    priority: int = Field(ge=1, le=5)
    description: str
    system: str
    parameters: Dict[str, Any] = {}


class MonitoringConfigRequest(BaseModel):
    """監視設定リクエスト"""
    api_interval: int = Field(ge=10, le=3600, default=60)
    db_interval: int = Field(ge=60, le=7200, default=300)
    performance_interval: int = Field(ge=30, le=1800, default=60)
    security_interval: int = Field(ge=60, le=3600, default=300)
    auto_repair_enabled: bool = True
    notification_enabled: bool = True


# グローバル監視システムインスタンス
monitoring_system: Optional[InfiniteAutoRepairSystem] = None
monitoring_active = False


async def get_security_context(request: Request) -> SecurityContext:
    """セキュリティコンテキストを取得"""
    return SecurityContext(
        user_id=request.headers.get("X-User-ID"),
        session_id=request.headers.get("X-Session-ID", "anonymous"),
        ip_address=request.client.host,
        user_agent=request.headers.get("User-Agent", "Unknown"),
        permissions=request.headers.get("X-Permissions", "").split(",") if request.headers.get("X-Permissions") else [],
        security_level=SecurityLevel.INTERNAL,
        timestamp=datetime.now().timestamp()
    )


@router.get("/status", response_model=MonitoringStatus)
@secure_exception_handler(SecurityLevel.INTERNAL)
@rate_limit(max_requests=100, window_seconds=60)
async def get_monitoring_status(
    security_context: SecurityContext = Depends(get_security_context)
) -> MonitoringStatus:
    """監視システムの状態を取得"""
    global monitoring_system, monitoring_active
    
    try:
        return MonitoringStatus(
            api_monitoring=monitoring_active and monitoring_system is not None,
            database_monitoring=monitoring_active,
            performance_monitoring=monitoring_active,
            security_monitoring=monitoring_active,
            log_analysis=monitoring_active,
            infinite_loop_active=monitoring_active
        )
    except Exception as e:
        logger.error(f"Error getting monitoring status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get monitoring status")


@router.get("/health", response_model=SystemHealthResponse)
@secure_exception_handler(SecurityLevel.INTERNAL)
@require_permission("monitoring.read")
@rate_limit(max_requests=50, window_seconds=60)
async def get_system_health(
    security_context: SecurityContext = Depends(get_security_context)
) -> SystemHealthResponse:
    """システム全体のヘルス状態を取得"""
    global monitoring_system
    
    try:
        if not monitoring_system:
            raise HTTPException(status_code=503, detail="Monitoring system not initialized")
        
        # 各システムのヘルス情報を収集
        api_monitor = APIErrorMonitor()
        db_monitor = DatabaseHealthMonitor()
        perf_monitor = PerformanceMonitor()
        security_monitor = SecurityErrorMonitor()
        
        async with api_monitor:
            api_health = api_monitor.get_health_report()
        
        db_health = db_monitor.get_health_status()
        
        async with perf_monitor:
            perf_health = perf_monitor.get_performance_report(1)
        
        security_health = security_monitor.get_security_status()
        
        # 全体ステータスの判定
        overall_status = "healthy"
        active_issues = []
        recommendations = []
        
        # API ヘルスチェック
        if api_health.get("overall_health") == "critical":
            overall_status = "critical"
            active_issues.append({
                "type": "api_critical",
                "message": "API monitoring detected critical issues",
                "severity": "high"
            })
            recommendations.append("Investigate API endpoints immediately")
        
        # セキュリティヘルスチェック
        if security_health.get("security_level") == "critical":
            overall_status = "critical"
            active_issues.append({
                "type": "security_critical",
                "message": "Security threats detected",
                "severity": "critical"
            })
            recommendations.append("Review security logs and implement countermeasures")
        
        # パフォーマンスヘルスチェック
        if perf_health.get("performance_level") == "critical":
            if overall_status != "critical":
                overall_status = "degraded"
            active_issues.append({
                "type": "performance_poor",
                "message": "Poor system performance detected",
                "severity": "medium"
            })
            recommendations.append("Optimize system performance")
        
        return SystemHealthResponse(
            timestamp=datetime.now().timestamp(),
            overall_status=overall_status,
            api_health=api_health,
            database_health=db_health,
            performance_health=perf_health,
            security_health=security_health,
            active_issues=active_issues,
            recommendations=recommendations
        )
        
    except Exception as e:
        logger.error(f"Error getting system health: {e}")
        raise HTTPException(status_code=500, detail="Failed to get system health")


@router.post("/start")
@secure_exception_handler(SecurityLevel.CONFIDENTIAL)
@require_permission("monitoring.admin")
@rate_limit(max_requests=10, window_seconds=60)
async def start_monitoring(
    background_tasks: BackgroundTasks,
    config: Optional[MonitoringConfigRequest] = None,
    security_context: SecurityContext = Depends(get_security_context)
) -> Dict[str, Any]:
    """監視システムを開始"""
    global monitoring_system, monitoring_active
    
    try:
        if monitoring_active:
            return {"status": "already_running", "message": "Monitoring system is already active"}
        
        # 監視システムを初期化
        monitoring_system = InfiniteAutoRepairSystem()
        await monitoring_system.initialize()
        
        # バックグラウンドで監視ループを開始
        background_tasks.add_task(run_monitoring_loop)
        
        monitoring_active = True
        
        logger.info(f"Monitoring system started by user {security_context.user_id}")
        
        return {
            "status": "started",
            "message": "Monitoring system started successfully",
            "timestamp": datetime.now().timestamp(),
            "config": config.dict() if config else None
        }
        
    except Exception as e:
        logger.error(f"Error starting monitoring: {e}")
        raise HTTPException(status_code=500, detail="Failed to start monitoring system")


@router.post("/stop")
@secure_exception_handler(SecurityLevel.CONFIDENTIAL)
@require_permission("monitoring.admin")
@rate_limit(max_requests=10, window_seconds=60)
async def stop_monitoring(
    security_context: SecurityContext = Depends(get_security_context)
) -> Dict[str, Any]:
    """監視システムを停止"""
    global monitoring_system, monitoring_active
    
    try:
        if not monitoring_active:
            return {"status": "not_running", "message": "Monitoring system is not active"}
        
        monitoring_active = False
        
        if monitoring_system:
            await monitoring_system.shutdown()
            monitoring_system = None
        
        logger.info(f"Monitoring system stopped by user {security_context.user_id}")
        
        return {
            "status": "stopped",
            "message": "Monitoring system stopped successfully",
            "timestamp": datetime.now().timestamp()
        }
        
    except Exception as e:
        logger.error(f"Error stopping monitoring: {e}")
        raise HTTPException(status_code=500, detail="Failed to stop monitoring system")


@router.post("/analyze-error")
@secure_exception_handler(SecurityLevel.INTERNAL)
@require_permission("monitoring.analyze")
@rate_limit(max_requests=200, window_seconds=60)
async def analyze_error(
    request: ErrorAnalysisRequest,
    security_context: SecurityContext = Depends(get_security_context)
) -> Dict[str, Any]:
    """エラーを分析して修復提案を生成"""
    try:
        # ログ分析エンジンを使用
        log_analyzer = LogAnalysisEngine()
        
        # 簡易的なログエントリを作成
        from app.services.log_analysis_repair import LogEntry
        log_entry = LogEntry(
            timestamp=datetime.now().timestamp(),
            level="ERROR",
            message=request.error_message,
            source_file=request.component
        )
        
        # エラーを分析
        analyzed_error = log_analyzer.pattern_matcher.analyze_log_entry(log_entry)
        
        if analyzed_error:
            # 修復提案を生成
            suggestions = log_analyzer.suggestion_engine.generate_suggestions(analyzed_error)
            
            analysis_result = {
                "error_analysis": analyzed_error.to_dict(),
                "repair_suggestions": [suggestion.to_dict() for suggestion in suggestions],
                "confidence": "high" if len(suggestions) > 0 else "low",
                "estimated_resolution_time": "15-30 minutes" if suggestions else "unknown"
            }
        else:
            analysis_result = {
                "error_analysis": {
                    "category": "unknown",
                    "severity": "medium",
                    "message": "Unable to categorize error"
                },
                "repair_suggestions": [],
                "confidence": "low",
                "estimated_resolution_time": "unknown"
            }
        
        return {
            "status": "analyzed",
            "timestamp": datetime.now().timestamp(),
            "request": request.dict(),
            "analysis": analysis_result
        }
        
    except Exception as e:
        logger.error(f"Error analyzing error: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze error")


@router.post("/repair-task")
@secure_exception_handler(SecurityLevel.CONFIDENTIAL)
@require_permission("monitoring.repair")
@rate_limit(max_requests=50, window_seconds=60)
async def create_repair_task(
    request: RepairTaskRequest,
    security_context: SecurityContext = Depends(get_security_context)
) -> Dict[str, Any]:
    """修復タスクを作成"""
    global monitoring_system
    
    try:
        if not monitoring_system:
            raise HTTPException(status_code=503, detail="Monitoring system not initialized")
        
        # 修復タスクを作成
        from app.services.infinite_auto_repair_system import RepairTask, RepairAction
        
        repair_task = RepairTask(
            id=f"manual_{int(datetime.now().timestamp())}",
            timestamp=datetime.now().timestamp(),
            task_type=request.task_type,
            priority=request.priority,
            description=request.description,
            system=request.system,
            action=RepairAction.AUTO_REPAIR,
            parameters=request.parameters
        )
        
        # タスクを修復コーディネーターに追加
        success = monitoring_system.repair_coordinator.add_repair_task(repair_task)
        
        if success:
            logger.info(f"Repair task created by user {security_context.user_id}: {repair_task.id}")
            
            return {
                "status": "created",
                "task_id": repair_task.id,
                "message": "Repair task created successfully",
                "timestamp": datetime.now().timestamp()
            }
        else:
            return {
                "status": "rejected",
                "message": "Repair task rejected (duplicate or cooldown)",
                "timestamp": datetime.now().timestamp()
            }
        
    except Exception as e:
        logger.error(f"Error creating repair task: {e}")
        raise HTTPException(status_code=500, detail="Failed to create repair task")


@router.get("/repair-history")
@secure_exception_handler(SecurityLevel.INTERNAL)
@require_permission("monitoring.read")
@rate_limit(max_requests=100, window_seconds=60)
async def get_repair_history(
    limit: int = 50,
    security_context: SecurityContext = Depends(get_security_context)
) -> Dict[str, Any]:
    """修復履歴を取得"""
    global monitoring_system
    
    try:
        if not monitoring_system:
            raise HTTPException(status_code=503, detail="Monitoring system not initialized")
        
        # 修復履歴を取得
        repair_history = monitoring_system.repair_coordinator.repair_history[-limit:]
        
        return {
            "status": "success",
            "timestamp": datetime.now().timestamp(),
            "total_repairs": len(monitoring_system.repair_coordinator.repair_history),
            "repair_history": [task.to_dict() for task in repair_history],
            "success_rate": len([t for t in repair_history if t.success]) / len(repair_history) if repair_history else 0
        }
        
    except Exception as e:
        logger.error(f"Error getting repair history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get repair history")


@router.get("/metrics")
@secure_exception_handler(SecurityLevel.INTERNAL)
@require_permission("monitoring.read")
@rate_limit(max_requests=100, window_seconds=60)
async def get_monitoring_metrics(
    hours: int = 24,
    security_context: SecurityContext = Depends(get_security_context)
) -> Dict[str, Any]:
    """監視メトリクスを取得"""
    try:
        # 各監視システムからメトリクスを収集
        metrics = {
            "timestamp": datetime.now().timestamp(),
            "period_hours": hours,
            "api_metrics": {},
            "database_metrics": {},
            "performance_metrics": {},
            "security_metrics": {},
            "system_metrics": {}
        }
        
        # API監視メトリクス
        try:
            api_monitor = APIErrorMonitor()
            async with api_monitor:
                api_errors = api_monitor.db_manager.get_recent_errors(hours)
                metrics["api_metrics"] = {
                    "total_errors": len(api_errors),
                    "error_types": {},
                    "endpoints_affected": len(set(e['endpoint'] for e in api_errors))
                }
        except Exception as e:
            logger.warning(f"Failed to get API metrics: {e}")
            metrics["api_metrics"] = {"error": "Failed to collect API metrics"}
        
        # パフォーマンスメトリクス
        try:
            perf_monitor = PerformanceMonitor()
            async with perf_monitor:
                perf_report = perf_monitor.get_performance_report(hours)
                metrics["performance_metrics"] = perf_report
        except Exception as e:
            logger.warning(f"Failed to get performance metrics: {e}")
            metrics["performance_metrics"] = {"error": "Failed to collect performance metrics"}
        
        # セキュリティメトリクス
        try:
            security_monitor = SecurityErrorMonitor()
            security_status = security_monitor.get_security_status()
            metrics["security_metrics"] = security_status
        except Exception as e:
            logger.warning(f"Failed to get security metrics: {e}")
            metrics["security_metrics"] = {"error": "Failed to collect security metrics"}
        
        return {
            "status": "success",
            "metrics": metrics
        }
        
    except Exception as e:
        logger.error(f"Error getting monitoring metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get monitoring metrics")


@router.post("/emergency-stop")
@secure_exception_handler(SecurityLevel.SECRET)
@require_permission("monitoring.emergency")
@rate_limit(max_requests=5, window_seconds=60)
async def emergency_stop(
    reason: str,
    security_context: SecurityContext = Depends(get_security_context)
) -> Dict[str, Any]:
    """緊急停止"""
    global monitoring_system, monitoring_active
    
    try:
        logger.critical(f"Emergency stop requested by user {security_context.user_id}: {reason}")
        
        monitoring_active = False
        
        if monitoring_system:
            await monitoring_system.shutdown()
            monitoring_system = None
        
        # 緊急停止ログを記録
        emergency_log = {
            "timestamp": datetime.now().timestamp(),
            "user_id": security_context.user_id,
            "reason": reason,
            "ip_address": security_context.ip_address
        }
        
        import aiofiles
        from pathlib import Path
        Path("emergency_logs").mkdir(exist_ok=True)
        
        async with aiofiles.open("emergency_logs/emergency_stop.log", "a") as f:
            await f.write(json.dumps(emergency_log) + "\n")
        
        return {
            "status": "emergency_stopped",
            "message": "System emergency stop executed",
            "timestamp": datetime.now().timestamp(),
            "reason": reason
        }
        
    except Exception as e:
        logger.error(f"Error during emergency stop: {e}")
        raise HTTPException(status_code=500, detail="Failed to execute emergency stop")


async def run_monitoring_loop():
    """監視ループを実行（バックグラウンドタスク）"""
    global monitoring_system, monitoring_active
    
    try:
        if monitoring_system:
            await monitoring_system.start_infinite_loop()
    except Exception as e:
        logger.error(f"Error in monitoring loop: {e}")
        monitoring_active = False


# ヘルスチェックエンドポイント
@router.get("/ping")
@rate_limit(max_requests=1000, window_seconds=60)
async def ping() -> Dict[str, Any]:
    """シンプルなヘルスチェック"""
    return {
        "status": "ok",
        "timestamp": datetime.now().timestamp(),
        "service": "error-monitoring-api"
    }