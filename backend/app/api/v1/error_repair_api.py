"""
エラー検知・修復API エンドポイント
FastAPIベースのITSM準拠システム - MCP Playwright連携
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, status
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio
import json
import logging
from pydantic import BaseModel, Field

from app.services.mcp_playwright_error_monitor import MCPPlaywrightErrorMonitor
from app.services.infinite_loop_repair_controller import InfiniteLoopRepairController
from app.core.security import get_current_user
from app.core.exceptions import ITSMException
from app.models.user import User

router = APIRouter(prefix="/api/v1/error-repair", tags=["error-repair"])
logger = logging.getLogger(__name__)

# グローバルインスタンス（シングルトンパターン）
mcp_monitor = MCPPlaywrightErrorMonitor()
loop_controller = InfiniteLoopRepairController()


# Pydantic モデル定義
class ErrorDetectionRequest(BaseModel):
    """エラー検知リクエスト"""
    scan_type: str = Field(..., description="スキャンタイプ (full, quick, security, performance)")
    target_endpoints: Optional[List[str]] = Field(None, description="対象エンドポイント")
    deep_scan: bool = Field(False, description="詳細スキャン実行")


class ManualRepairRequest(BaseModel):
    """手動修復リクエスト"""
    repair_type: str = Field(..., description="修復タイプ (auto, manual, emergency)")
    target_components: Optional[List[str]] = Field(None, description="対象コンポーネント")
    priority: str = Field("medium", description="優先度 (low, medium, high, critical)")
    force_repair: bool = Field(False, description="強制修復実行")


class LoopControlRequest(BaseModel):
    """ループ制御リクエスト"""
    action: str = Field(..., description="アクション (start, stop, pause, resume)")
    configuration: Optional[Dict[str, Any]] = Field(None, description="設定変更")


class ErrorReportResponse(BaseModel):
    """エラーレポートレスポンス"""
    timestamp: str
    total_errors: int
    error_categories: Dict[str, int]
    critical_errors: List[Dict[str, Any]]
    health_metrics: Dict[str, Any]
    recommendations: List[str]


class RepairResultResponse(BaseModel):
    """修復結果レスポンス"""
    repair_id: str
    start_time: str
    end_time: str
    duration: float
    success: bool
    actions_performed: List[Dict[str, Any]]
    verification_results: Dict[str, Any]
    next_steps: List[str]


# API エンドポイント実装

@router.get("/health", summary="エラー検知・修復システム健全性確認")
async def get_system_health(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """エラー検知・修復システムの健全性確認"""
    try:
        # システム状態取得
        loop_status = loop_controller.get_status()
        
        # MCP Monitor 状態
        mcp_status = {
            "monitoring_active": mcp_monitor.monitoring_active,
            "error_history_count": len(mcp_monitor.error_history),
            "repair_actions_count": len(mcp_monitor.repair_actions)
        }
        
        # 全体的な健全性評価
        overall_health = "healthy"
        if loop_status["emergency_stop"]:
            overall_health = "critical"
        elif loop_status["consecutive_failures"] > 5:
            overall_health = "warning"
        
        return {
            "timestamp": datetime.now().isoformat(),
            "overall_health": overall_health,
            "loop_controller": loop_status,
            "mcp_monitor": mcp_status,
            "system_uptime": "monitoring_active",
            "last_health_check": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: {str(e)}"
        )


@router.post("/detect-errors", summary="エラー検知実行")
async def detect_errors(
    request: ErrorDetectionRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
) -> ErrorReportResponse:
    """エラー検知を実行してレポートを返す"""
    try:
        logger.info(f"Starting error detection: {request.scan_type}")
        
        # スキャンタイプに応じた検知実行
        if request.scan_type == "full":
            health_metrics = await mcp_monitor.check_api_health()
            db_status = await mcp_monitor.check_database_connectivity()
            perf_metrics = await mcp_monitor.monitor_performance()
            security_status = await mcp_monitor.scan_security_issues()
            log_analysis = await mcp_monitor.analyze_error_logs()
            
        elif request.scan_type == "quick":
            health_metrics = await mcp_monitor.check_api_health()
            db_status = await mcp_monitor.check_database_connectivity()
            perf_metrics = {"overall_status": "skipped"}
            security_status = {"overall_status": "skipped"}
            log_analysis = {"total_errors": 0, "error_categories": {}}
            
        elif request.scan_type == "security":
            health_metrics = None
            db_status = {"status": "skipped"}
            perf_metrics = {"overall_status": "skipped"}
            security_status = await mcp_monitor.scan_security_issues()
            log_analysis = await mcp_monitor.analyze_error_logs()
            
        elif request.scan_type == "performance":
            health_metrics = await mcp_monitor.check_api_health()
            db_status = {"status": "skipped"}
            perf_metrics = await mcp_monitor.monitor_performance()
            security_status = {"overall_status": "skipped"}
            log_analysis = {"total_errors": 0, "error_categories": {}}
            
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid scan type: {request.scan_type}"
            )
        
        # エラー集計
        total_errors = 0
        error_categories = {}
        critical_errors = []
        
        # API Health エラー
        if health_metrics and health_metrics.error_rate > 0:
            total_errors += health_metrics.unhealthy_endpoints
            error_categories["api_errors"] = health_metrics.unhealthy_endpoints
        
        # Database エラー
        if db_status["status"] == "error":
            total_errors += 1
            error_categories["database_errors"] = 1
            critical_errors.append({
                "type": "database_connection",
                "severity": "critical",
                "message": db_status.get("error", "Database connection failed"),
                "timestamp": datetime.now().isoformat()
            })
        
        # Performance エラー
        if perf_metrics["overall_status"] == "critical":
            perf_errors = len(perf_metrics.get("slow_endpoints", []))
            total_errors += perf_errors
            error_categories["performance_errors"] = perf_errors
        
        # Security エラー
        if security_status["overall_status"] == "vulnerable":
            sec_errors = len(security_status.get("vulnerabilities", []))
            total_errors += sec_errors
            error_categories["security_errors"] = sec_errors
        
        # Log エラー
        if "error_categories" in log_analysis:
            log_errors = sum(log_analysis["error_categories"].values())
            total_errors += log_errors
            error_categories.update(log_analysis["error_categories"])
        
        # Critical エラー（ログから）
        if "critical_errors" in log_analysis:
            critical_errors.extend(log_analysis["critical_errors"])
        
        # 推奨事項生成
        recommendations = []
        if total_errors > 0:
            recommendations = mcp_monitor._generate_error_recommendations({
                "error_categories": error_categories,
                "critical_errors": critical_errors
            })
        
        # Health メトリクス作成
        health_metrics_dict = {}
        if health_metrics:
            health_metrics_dict = {
                "total_endpoints": health_metrics.total_endpoints,
                "healthy_endpoints": health_metrics.healthy_endpoints,
                "error_rate": health_metrics.error_rate,
                "uptime_percentage": health_metrics.uptime_percentage,
                "average_response_time": health_metrics.response_time_avg
            }
        
        response = ErrorReportResponse(
            timestamp=datetime.now().isoformat(),
            total_errors=total_errors,
            error_categories=error_categories,
            critical_errors=critical_errors,
            health_metrics=health_metrics_dict,
            recommendations=recommendations
        )
        
        # バックグラウンドでメトリクス更新
        background_tasks.add_task(mcp_monitor._update_error_metrics)
        
        logger.info(f"Error detection completed: {total_errors} errors found")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error detection failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error detection failed: {str(e)}"
        )


@router.post("/manual-repair", summary="手動修復実行")
async def execute_manual_repair(
    request: ManualRepairRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
) -> RepairResultResponse:
    """手動修復を実行して結果を返す"""
    try:
        repair_id = f"repair_{int(datetime.now().timestamp())}"
        start_time = datetime.now()
        
        logger.info(f"Starting manual repair: {repair_id}, type: {request.repair_type}")
        
        actions_performed = []
        verification_results = {}
        
        if request.repair_type == "auto":
            # 自動修復実行
            await mcp_monitor.execute_auto_repair()
            actions_performed = mcp_monitor.repair_actions[-5:]  # 最新5件
            
        elif request.repair_type == "manual":
            # ClaudeCode手動修復実行
            claudecode_result = await mcp_monitor._trigger_claudecode_manual_repair()
            actions_performed.append(claudecode_result)
            
            # 追加修復実行
            if not request.target_components or "database" in request.target_components:
                db_repair = await mcp_monitor._perform_database_maintenance()
                actions_performed.append(db_repair)
            
            if not request.target_components or "cache" in request.target_components:
                cache_repair = await mcp_monitor._clear_caches()
                actions_performed.append(cache_repair)
            
        elif request.repair_type == "emergency":
            # 緊急修復実行
            await mcp_monitor.emergency_system_recovery()
            actions_performed.append({
                "action": "emergency_recovery",
                "status": "completed",
                "timestamp": datetime.now().isoformat()
            })
            
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid repair type: {request.repair_type}"
            )
        
        # 修復検証実行
        verification_results = await _verify_repair_results()
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        # 成功判定
        success = verification_results.get("overall_success", False)
        
        # 次のステップ推奨
        next_steps = _generate_next_steps(verification_results, request.repair_type)
        
        response = RepairResultResponse(
            repair_id=repair_id,
            start_time=start_time.isoformat(),
            end_time=end_time.isoformat(),
            duration=duration,
            success=success,
            actions_performed=actions_performed,
            verification_results=verification_results,
            next_steps=next_steps
        )
        
        # バックグラウンドでログ記録
        background_tasks.add_task(_log_repair_result, response)
        
        logger.info(f"Manual repair completed: {repair_id}, success: {success}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Manual repair failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Manual repair failed: {str(e)}"
        )


@router.post("/loop-control", summary="無限ループ制御")
async def control_infinite_loop(
    request: LoopControlRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """無限ループの開始・停止・制御"""
    try:
        logger.info(f"Loop control action: {request.action}")
        
        if request.action == "start":
            if loop_controller.loop_state["active"]:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Loop is already running"
                )
            
            # 設定更新（あれば）
            if request.configuration:
                loop_controller.config.update(request.configuration)
            
            # バックグラウンドでループ開始
            background_tasks.add_task(loop_controller.start_infinite_repair_loop)
            
            return {
                "action": "start",
                "status": "initiated",
                "message": "Infinite repair loop started",
                "configuration": loop_controller.config,
                "timestamp": datetime.now().isoformat()
            }
            
        elif request.action == "stop":
            loop_controller.stop_loop()
            return {
                "action": "stop",
                "status": "requested",
                "message": "Loop stop requested",
                "timestamp": datetime.now().isoformat()
            }
            
        elif request.action == "pause":
            loop_controller.pause_loop()
            return {
                "action": "pause",
                "status": "requested",
                "message": "Loop pause requested",
                "timestamp": datetime.now().isoformat()
            }
            
        elif request.action == "resume":
            loop_controller.resume_loop()
            return {
                "action": "resume",
                "status": "requested",
                "message": "Loop resume requested",
                "timestamp": datetime.now().isoformat()
            }
            
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid action: {request.action}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Loop control failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Loop control failed: {str(e)}"
        )


@router.get("/status", summary="システム状態取得")
async def get_system_status(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """現在のシステム状態と統計情報取得"""
    try:
        # Loop Controller 状態
        loop_status = loop_controller.get_status()
        
        # MCP Monitor 状態
        monitor_stats = {
            "error_history_count": len(mcp_monitor.error_history),
            "repair_actions_count": len(mcp_monitor.repair_actions),
            "monitoring_active": mcp_monitor.monitoring_active
        }
        
        # エラー統計
        error_stats = {}
        if mcp_monitor.error_history:
            recent_errors = mcp_monitor.error_history[-24:]  # 最新24件
            error_stats = {
                "total_errors_24h": len(recent_errors),
                "critical_errors_24h": sum(1 for e in recent_errors if e.severity == "critical"),
                "error_types": {},
                "avg_errors_per_hour": len(recent_errors) / 24 if recent_errors else 0
            }
            
            for error in recent_errors:
                error_type = error.error_type
                error_stats["error_types"][error_type] = error_stats["error_types"].get(error_type, 0) + 1
        
        # 修復統計
        repair_stats = {}
        if loop_controller.repair_history:
            recent_repairs = loop_controller.repair_history[-10:]  # 最新10件
            successful_repairs = sum(1 for r in recent_repairs if r.repair_success)
            repair_stats = {
                "total_repairs": len(loop_controller.repair_history),
                "recent_repairs": len(recent_repairs),
                "success_rate": successful_repairs / len(recent_repairs) if recent_repairs else 0,
                "avg_repair_time": sum(r.duration for r in recent_repairs) / len(recent_repairs) if recent_repairs else 0
            }
        
        return {
            "timestamp": datetime.now().isoformat(),
            "loop_controller": loop_status,
            "monitor_status": monitor_stats,
            "error_statistics": error_stats,
            "repair_statistics": repair_stats,
            "system_metrics": {
                "uptime": "active",
                "health_score": _calculate_health_score(loop_status, error_stats, repair_stats),
                "last_update": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Status retrieval failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Status retrieval failed: {str(e)}"
        )


@router.get("/metrics", summary="詳細メトリクス取得")
async def get_detailed_metrics(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """詳細なメトリクス情報を取得"""
    try:
        metrics = {}
        
        # メトリクスファイルから読み込み
        metrics_files = [
            ("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/infinite_loop_metrics.json", "loop_metrics"),
            ("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/mcp_playwright_metrics.json", "mcp_metrics"),
            ("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/api_error_metrics.json", "api_metrics")
        ]
        
        for file_path, metric_key in metrics_files:
            try:
                with open(file_path, 'r') as f:
                    metrics[metric_key] = json.load(f)
            except FileNotFoundError:
                metrics[metric_key] = {"status": "file_not_found"}
            except json.JSONDecodeError:
                metrics[metric_key] = {"status": "invalid_json"}
        
        # 状態ファイルから読み込み
        state_files = [
            ("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/infinite_loop_state.json", "loop_state"),
            ("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/realtime_repair_state.json", "repair_state")
        ]
        
        for file_path, state_key in state_files:
            try:
                with open(file_path, 'r') as f:
                    metrics[state_key] = json.load(f)
            except FileNotFoundError:
                metrics[state_key] = {"status": "file_not_found"}
            except json.JSONDecodeError:
                metrics[state_key] = {"status": "invalid_json"}
        
        metrics["timestamp"] = datetime.now().isoformat()
        return metrics
        
    except Exception as e:
        logger.error(f"Metrics retrieval failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Metrics retrieval failed: {str(e)}"
        )


@router.delete("/reset", summary="システムリセット")
async def reset_system(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """エラー履歴とメトリクスをリセット"""
    try:
        logger.info("Resetting error repair system")
        
        # Loop Controller リセット
        loop_controller.stop_loop()
        loop_controller.repair_history.clear()
        loop_controller.error_patterns.clear()
        loop_controller.loop_state = {
            "active": False,
            "current_cycle": 0,
            "total_cycles": 0,
            "error_free_cycles": 0,
            "consecutive_failures": 0,
            "last_successful_repair": None,
            "emergency_stop": False,
            "pause_requested": False
        }
        
        # MCP Monitor リセット
        mcp_monitor.error_history.clear()
        mcp_monitor.repair_actions.clear()
        mcp_monitor.monitoring_active = False
        
        # メトリクスファイルリセット
        reset_metrics = {
            "timestamp": datetime.now().isoformat(),
            "total_errors": 0,
            "error_categories": {},
            "error_severities": {},
            "fix_success_rate": 0,
            "health_status": "reset",
            "reset_by": current_user.username if hasattr(current_user, 'username') else "system"
        }
        
        with open("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/api_error_metrics.json", 'w') as f:
            json.dump(reset_metrics, f, indent=2)
        
        return {
            "status": "success",
            "message": "Error repair system reset successfully",
            "reset_timestamp": datetime.now().isoformat(),
            "components_reset": [
                "loop_controller",
                "mcp_monitor",
                "error_metrics",
                "repair_history"
            ]
        }
        
    except Exception as e:
        logger.error(f"System reset failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"System reset failed: {str(e)}"
        )


# ヘルパー関数

async def _verify_repair_results() -> Dict[str, Any]:
    """修復結果の検証"""
    try:
        # API Health チェック
        health_metrics = await mcp_monitor.check_api_health()
        api_health = health_metrics.error_rate < 0.05
        
        # Database チェック
        db_status = await mcp_monitor.check_database_connectivity()
        db_health = db_status["status"] == "healthy"
        
        # Performance チェック
        perf_metrics = await mcp_monitor.monitor_performance()
        perf_health = perf_metrics["overall_status"] != "critical"
        
        verification_results = {
            "api_health": {
                "passed": api_health,
                "error_rate": health_metrics.error_rate,
                "uptime": health_metrics.uptime_percentage
            },
            "database_health": {
                "passed": db_health,
                "status": db_status["status"],
                "connection_time": db_status.get("connection_time", 0)
            },
            "performance_health": {
                "passed": perf_health,
                "status": perf_metrics["overall_status"],
                "avg_response_time": sum(perf_metrics.get("api_response_times", {}).values()) / len(perf_metrics.get("api_response_times", {})) if perf_metrics.get("api_response_times") else 0
            },
            "overall_success": api_health and db_health and perf_health
        }
        
        return verification_results
        
    except Exception as e:
        logger.error(f"Repair verification failed: {str(e)}")
        return {"overall_success": False, "error": str(e)}


def _generate_next_steps(verification_results: Dict[str, Any], repair_type: str) -> List[str]:
    """次のステップ推奨生成"""
    next_steps = []
    
    if verification_results.get("overall_success", False):
        next_steps.append("Repair completed successfully - continue monitoring")
        next_steps.append("Schedule next health check in 30 minutes")
    else:
        if not verification_results.get("api_health", {}).get("passed", False):
            next_steps.append("API health issues persist - consider manual intervention")
        
        if not verification_results.get("database_health", {}).get("passed", False):
            next_steps.append("Database issues detected - review connection settings")
        
        if not verification_results.get("performance_health", {}).get("passed", False):
            next_steps.append("Performance issues remain - consider resource scaling")
        
        if repair_type != "emergency":
            next_steps.append("Consider escalating to emergency repair if issues persist")
    
    return next_steps


async def _log_repair_result(repair_result: RepairResultResponse):
    """修復結果をログに記録"""
    try:
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "repair_id": repair_result.repair_id,
            "duration": repair_result.duration,
            "success": repair_result.success,
            "actions_count": len(repair_result.actions_performed)
        }
        
        log_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/repair_results.log"
        with open(log_file, 'a') as f:
            f.write(json.dumps(log_entry) + "\n")
            
    except Exception as e:
        logger.error(f"Failed to log repair result: {str(e)}")


def _calculate_health_score(loop_status: Dict, error_stats: Dict, repair_stats: Dict) -> float:
    """システムヘルススコア計算"""
    try:
        score = 100.0
        
        # Emergency stop penalty
        if loop_status.get("emergency_stop", False):
            score -= 50
        
        # Consecutive failures penalty
        failures = loop_status.get("consecutive_failures", 0)
        score -= min(failures * 5, 30)
        
        # Error rate penalty
        error_rate = error_stats.get("avg_errors_per_hour", 0)
        score -= min(error_rate * 2, 20)
        
        # Repair success rate bonus/penalty
        repair_success_rate = repair_stats.get("success_rate", 0)
        if repair_success_rate > 0.8:
            score += 10
        elif repair_success_rate < 0.5:
            score -= 15
        
        return max(0, min(100, score))
        
    except Exception:
        return 50.0  # Default middle score on calculation error