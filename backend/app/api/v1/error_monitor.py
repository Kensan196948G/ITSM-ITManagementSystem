"""
エラー監視API エンドポイント
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.services.api_error_monitor import api_monitor, ErrorSeverity, ErrorCategory

router = APIRouter(prefix="/error-monitor", tags=["error-monitor"])

class ErrorResponse(BaseModel):
    """エラー情報レスポンス"""
    timestamp: datetime
    error_type: str
    category: str
    severity: str
    message: str
    endpoint: str
    status_code: Optional[int]
    response_time: Optional[float]
    fix_attempted: bool
    fix_successful: bool
    fix_description: str

class HealthCheckResponse(BaseModel):
    """ヘルスチェックレスポンス"""
    timestamp: datetime
    endpoint: str
    status_code: int
    response_time: float
    is_healthy: bool
    error_message: Optional[str] = None

class MonitorStatusResponse(BaseModel):
    """監視ステータスレスポンス"""
    monitoring: bool
    total_errors: int
    recent_errors: int
    last_health_check: Optional[datetime]
    is_healthy: Optional[bool]
    uptime: Optional[float]

class ErrorSummaryResponse(BaseModel):
    """エラーサマリーレスポンス"""
    total_errors: int
    critical_errors: int
    high_errors: int
    medium_errors: int
    low_errors: int
    fixed_errors: int
    fix_success_rate: float
    error_categories: Dict[str, int]
    recent_error_trend: List[Dict[str, Any]]

@router.get("/status", response_model=MonitorStatusResponse)
async def get_monitor_status():
    """監視ステータスを取得"""
    status = api_monitor.get_status()
    return MonitorStatusResponse(
        monitoring=status["monitoring"],
        total_errors=status["total_errors"],
        recent_errors=status["recent_errors"],
        last_health_check=datetime.fromisoformat(status["last_health_check"]) if status["last_health_check"] else None,
        is_healthy=status["is_healthy"]
    )

@router.get("/errors", response_model=List[ErrorResponse])
async def get_errors(
    category: Optional[str] = Query(None, description="エラーカテゴリでフィルタ"),
    severity: Optional[str] = Query(None, description="重要度でフィルタ"),
    hours: int = Query(24, description="過去何時間のエラーを取得"),
    limit: int = Query(100, description="最大取得件数")
):
    """エラー一覧を取得"""
    cutoff_time = datetime.now() - timedelta(hours=hours)
    errors = [e for e in api_monitor.errors if e.timestamp > cutoff_time]
    
    # フィルタリング
    if category:
        try:
            cat_enum = ErrorCategory(category)
            errors = [e for e in errors if e.category == cat_enum]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"無効なカテゴリ: {category}")
    
    if severity:
        try:
            sev_enum = ErrorSeverity(severity)
            errors = [e for e in errors if e.severity == sev_enum]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"無効な重要度: {severity}")
    
    # 最新順でソート・制限
    errors = sorted(errors, key=lambda x: x.timestamp, reverse=True)[:limit]
    
    return [
        ErrorResponse(
            timestamp=error.timestamp,
            error_type=error.error_type,
            category=error.category.value,
            severity=error.severity.value,
            message=error.message,
            endpoint=error.endpoint,
            status_code=error.status_code,
            response_time=error.response_time,
            fix_attempted=error.fix_attempted,
            fix_successful=error.fix_successful,
            fix_description=error.fix_description
        ) for error in errors
    ]

@router.get("/health-history", response_model=List[HealthCheckResponse])
async def get_health_history(
    hours: int = Query(24, description="過去何時間の履歴を取得"),
    limit: int = Query(100, description="最大取得件数")
):
    """ヘルスチェック履歴を取得"""
    cutoff_time = datetime.now() - timedelta(hours=hours)
    health_history = [h for h in api_monitor.health_history if h.timestamp > cutoff_time]
    
    # 最新順でソート・制限
    health_history = sorted(health_history, key=lambda x: x.timestamp, reverse=True)[:limit]
    
    return [
        HealthCheckResponse(
            timestamp=health.timestamp,
            endpoint=health.endpoint,
            status_code=health.status_code,
            response_time=health.response_time,
            is_healthy=health.is_healthy,
            error_message=health.error_message
        ) for health in health_history
    ]

@router.get("/summary", response_model=ErrorSummaryResponse)
async def get_error_summary(
    hours: int = Query(24, description="過去何時間のサマリーを取得")
):
    """エラーサマリーを取得"""
    cutoff_time = datetime.now() - timedelta(hours=hours)
    recent_errors = [e for e in api_monitor.errors if e.timestamp > cutoff_time]
    
    # 重要度別集計
    critical_errors = len([e for e in recent_errors if e.severity == ErrorSeverity.CRITICAL])
    high_errors = len([e for e in recent_errors if e.severity == ErrorSeverity.HIGH])
    medium_errors = len([e for e in recent_errors if e.severity == ErrorSeverity.MEDIUM])
    low_errors = len([e for e in recent_errors if e.severity == ErrorSeverity.LOW])
    
    # 修復率計算
    attempted_fixes = [e for e in recent_errors if e.fix_attempted]
    successful_fixes = [e for e in attempted_fixes if e.fix_successful]
    fix_success_rate = (len(successful_fixes) / len(attempted_fixes) * 100) if attempted_fixes else 0
    
    # カテゴリ別集計
    error_categories = {}
    for error in recent_errors:
        cat = error.category.value
        error_categories[cat] = error_categories.get(cat, 0) + 1
    
    # 時間別トレンド（過去24時間を1時間ごと）
    recent_error_trend = []
    for i in range(24):
        hour_start = datetime.now() - timedelta(hours=i+1)
        hour_end = datetime.now() - timedelta(hours=i)
        hour_errors = [e for e in recent_errors if hour_start <= e.timestamp < hour_end]
        
        recent_error_trend.append({
            "hour": hour_start.strftime("%H:00"),
            "count": len(hour_errors),
            "critical": len([e for e in hour_errors if e.severity == ErrorSeverity.CRITICAL])
        })
    
    recent_error_trend.reverse()  # 古い順に並び替え
    
    return ErrorSummaryResponse(
        total_errors=len(recent_errors),
        critical_errors=critical_errors,
        high_errors=high_errors,
        medium_errors=medium_errors,
        low_errors=low_errors,
        fixed_errors=len(successful_fixes),
        fix_success_rate=round(fix_success_rate, 2),
        error_categories=error_categories,
        recent_error_trend=recent_error_trend
    )

@router.post("/health-check")
async def trigger_health_check(background_tasks: BackgroundTasks):
    """ヘルスチェックを実行"""
    background_tasks.add_task(api_monitor.perform_health_check)
    return {"message": "ヘルスチェックを開始しました"}

@router.post("/analyze-logs")
async def trigger_log_analysis(background_tasks: BackgroundTasks):
    """ログ解析を実行"""
    background_tasks.add_task(api_monitor.analyze_logs)
    return {"message": "ログ解析を開始しました"}

@router.post("/fix-errors")
async def trigger_error_fixes(background_tasks: BackgroundTasks):
    """エラー修復を実行"""
    unfixed_errors = [e for e in api_monitor.errors if not e.fix_attempted]
    if not unfixed_errors:
        return {"message": "修復が必要なエラーはありません"}
    
    background_tasks.add_task(api_monitor.attempt_error_fixes)
    return {"message": f"{len(unfixed_errors)}件のエラー修復を開始しました"}

@router.post("/start-monitoring")
async def start_monitoring(
    background_tasks: BackgroundTasks,
    interval: int = Query(30, description="監視間隔（秒）")
):
    """継続監視を開始"""
    if api_monitor.monitoring:
        raise HTTPException(status_code=400, detail="監視は既に実行中です")
    
    background_tasks.add_task(api_monitor.start_monitoring, interval)
    return {"message": f"継続監視を開始しました（間隔: {interval}秒）"}

@router.post("/stop-monitoring")
async def stop_monitoring():
    """監視を停止"""
    if not api_monitor.monitoring:
        raise HTTPException(status_code=400, detail="監視は実行されていません")
    
    api_monitor.stop_monitoring()
    return {"message": "監視を停止しました"}

@router.get("/report")
async def get_error_report():
    """エラーレポートを取得"""
    report = await api_monitor.generate_error_report()
    if not report:
        raise HTTPException(status_code=500, detail="レポート生成に失敗しました")
    
    return report

@router.delete("/errors")
async def clear_errors():
    """エラー履歴をクリア"""
    api_monitor.errors.clear()
    api_monitor.health_history.clear()
    return {"message": "エラー履歴をクリアしました"}

@router.get("/categories")
async def get_error_categories():
    """利用可能なエラーカテゴリを取得"""
    return [{"value": cat.value, "name": cat.name} for cat in ErrorCategory]

@router.get("/severities")
async def get_error_severities():
    """利用可能な重要度レベルを取得"""
    return [{"value": sev.value, "name": sev.name} for sev in ErrorSeverity]

@router.get("/metrics")
async def get_metrics():
    """メトリクスファイルの内容を取得"""
    try:
        import json
        from pathlib import Path
        
        metrics_path = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/api_error_metrics.json")
        if not metrics_path.exists():
            return {"message": "メトリクスファイルが見つかりません"}
        
        with open(metrics_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"メトリクス取得エラー: {str(e)}")