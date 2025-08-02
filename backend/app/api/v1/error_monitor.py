"""
エラー監視API エンドポイント
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.services.api_error_monitor import api_monitor, ErrorSeverity, ErrorCategory, SecurityAlert, PerformanceMetric, DatabaseHealthResult

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
    uptime: Optional[float] = None

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

class SecurityAlertResponse(BaseModel):
    """セキュリティアラートレスポンス"""
    timestamp: datetime
    alert_type: str
    severity: str
    source_ip: str
    target_endpoint: str
    description: str
    blocked: bool
    mitigation_applied: str

class PerformanceMetricResponse(BaseModel):
    """パフォーマンスメトリックレスポンス"""
    timestamp: datetime
    endpoint: str
    response_time: float
    cpu_usage: float
    memory_usage: float
    request_count: int
    error_count: int
    slow_query_count: int

class DatabaseHealthResponse(BaseModel):
    """データベースヘルスレスポンス"""
    timestamp: datetime
    is_healthy: bool
    connection_count: int
    query_performance: Dict[str, float]
    integrity_status: str
    size_mb: float
    backup_status: str

class ComprehensiveStatusResponse(BaseModel):
    """包括的ステータスレスポンス"""
    monitoring: bool
    total_errors: int
    recent_errors: int
    security_alerts: int
    blocked_ips: int
    database_health: Optional[bool]
    last_health_check: Optional[datetime]
    is_healthy: Optional[bool]
    threat_level: str
    performance_status: str

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

# 新しい包括的監視エンドポイント

@router.get("/comprehensive-status", response_model=ComprehensiveStatusResponse)
async def get_comprehensive_status():
    """包括的監視ステータスを取得"""
    status = api_monitor.get_status()
    
    # 脅威レベル判定
    recent_alerts = [a for a in api_monitor.security_alerts if 
                    a.timestamp > datetime.now() - timedelta(hours=1)]
    
    if len([a for a in recent_alerts if a.severity.value == "critical"]) > 0:
        threat_level = "critical"
    elif len([a for a in recent_alerts if a.severity.value == "high"]) > 3:
        threat_level = "high"
    elif len(recent_alerts) > 10:
        threat_level = "medium"
    else:
        threat_level = "low"
    
    # パフォーマンス状態判定
    recent_perf = [m for m in api_monitor.performance_metrics if 
                  m.timestamp > datetime.now() - timedelta(minutes=10)]
    
    if recent_perf:
        avg_response_time = sum(m.response_time for m in recent_perf) / len(recent_perf)
        if avg_response_time > 5.0:
            performance_status = "poor"
        elif avg_response_time > 2.0:
            performance_status = "degraded"
        else:
            performance_status = "good"
    else:
        performance_status = "unknown"
    
    return ComprehensiveStatusResponse(
        monitoring=status["monitoring"],
        total_errors=status["total_errors"],
        recent_errors=status["recent_errors"],
        security_alerts=status["security_alerts"],
        blocked_ips=status["blocked_ips"],
        database_health=status["database_health"],
        last_health_check=datetime.fromisoformat(status["last_health_check"]) if status["last_health_check"] else None,
        is_healthy=status["is_healthy"],
        threat_level=threat_level,
        performance_status=performance_status
    )

@router.get("/security-alerts", response_model=List[SecurityAlertResponse])
async def get_security_alerts(
    hours: int = Query(24, description="過去何時間のアラートを取得"),
    limit: int = Query(100, description="最大取得件数")
):
    """セキュリティアラート一覧を取得"""
    cutoff_time = datetime.now() - timedelta(hours=hours)
    alerts = [a for a in api_monitor.security_alerts if a.timestamp > cutoff_time]
    
    # 最新順でソート・制限
    alerts = sorted(alerts, key=lambda x: x.timestamp, reverse=True)[:limit]
    
    return [
        SecurityAlertResponse(
            timestamp=alert.timestamp,
            alert_type=alert.alert_type,
            severity=alert.severity.value,
            source_ip=alert.source_ip,
            target_endpoint=alert.target_endpoint,
            description=alert.description,
            blocked=alert.blocked,
            mitigation_applied=alert.mitigation_applied
        ) for alert in alerts
    ]

@router.get("/performance-metrics", response_model=List[PerformanceMetricResponse])
async def get_performance_metrics(
    hours: int = Query(1, description="過去何時間のメトリクスを取得"),
    limit: int = Query(100, description="最大取得件数")
):
    """パフォーマンスメトリクス一覧を取得"""
    cutoff_time = datetime.now() - timedelta(hours=hours)
    metrics = [m for m in api_monitor.performance_metrics if m.timestamp > cutoff_time]
    
    # 最新順でソート・制限
    metrics = sorted(metrics, key=lambda x: x.timestamp, reverse=True)[:limit]
    
    return [
        PerformanceMetricResponse(
            timestamp=metric.timestamp,
            endpoint=metric.endpoint,
            response_time=metric.response_time,
            cpu_usage=metric.cpu_usage,
            memory_usage=metric.memory_usage,
            request_count=metric.request_count,
            error_count=metric.error_count,
            slow_query_count=metric.slow_query_count
        ) for metric in metrics
    ]

@router.get("/database-health", response_model=List[DatabaseHealthResponse])
async def get_database_health(
    hours: int = Query(24, description="過去何時間の履歴を取得"),
    limit: int = Query(50, description="最大取得件数")
):
    """データベースヘルス履歴を取得"""
    cutoff_time = datetime.now() - timedelta(hours=hours)
    health_history = [h for h in api_monitor.database_health_history if h.timestamp > cutoff_time]
    
    # 最新順でソート・制限
    health_history = sorted(health_history, key=lambda x: x.timestamp, reverse=True)[:limit]
    
    return [
        DatabaseHealthResponse(
            timestamp=health.timestamp,
            is_healthy=health.is_healthy,
            connection_count=health.connection_count,
            query_performance=health.query_performance,
            integrity_status=health.integrity_status,
            size_mb=health.size_mb,
            backup_status=health.backup_status
        ) for health in health_history
    ]

@router.post("/comprehensive-scan")
async def trigger_comprehensive_scan(background_tasks: BackgroundTasks):
    """包括的スキャンを実行"""
    async def run_comprehensive_scan():
        try:
            await api_monitor.perform_health_check()
            await api_monitor.security_scan()
            await api_monitor.database_health_check()
            await api_monitor.performance_monitoring()
            await api_monitor.documentation_check()
            await api_monitor.ssl_certificate_check()
            await api_monitor.update_comprehensive_metrics()
            await api_monitor.generate_comprehensive_report()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"包括的スキャンエラー: {e}")
    
    background_tasks.add_task(run_comprehensive_scan)
    return {"message": "包括的スキャンを開始しました"}

@router.get("/comprehensive-report")
async def get_comprehensive_report():
    """包括的レポートを取得"""
    report = await api_monitor.generate_comprehensive_report()
    if not report:
        raise HTTPException(status_code=500, detail="レポート生成に失敗しました")
    
    return report

@router.get("/comprehensive-metrics")
async def get_comprehensive_metrics():
    """包括的メトリクスを取得"""
    try:
        import json
        from pathlib import Path
        
        metrics_path = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/comprehensive_api_metrics.json")
        if not metrics_path.exists():
            return {"message": "包括的メトリクスファイルが見つかりません"}
        
        with open(metrics_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"包括的メトリクス取得エラー: {str(e)}")

@router.post("/security-block-ip")
async def block_ip_address(
    ip_address: str = Query(..., description="ブロックするIPアドレス"),
    reason: str = Query("Manual block", description="ブロック理由")
):
    """IPアドレスを手動でブロック"""
    if ip_address in api_monitor.blocked_ips:
        raise HTTPException(status_code=400, detail="IPアドレスは既にブロックされています")
    
    api_monitor.blocked_ips.add(ip_address)
    
    # セキュリティアラート作成
    await api_monitor._create_security_alert(
        "manual_ip_block",
        ErrorSeverity.MEDIUM,
        ip_address,
        "/security",
        f"手動ブロック: {reason}"
    )
    
    return {"message": f"IPアドレス {ip_address} をブロックしました"}

@router.delete("/security-unblock-ip")
async def unblock_ip_address(
    ip_address: str = Query(..., description="ブロック解除するIPアドレス")
):
    """IPアドレスのブロックを解除"""
    if ip_address not in api_monitor.blocked_ips:
        raise HTTPException(status_code=400, detail="IPアドレスはブロックされていません")
    
    api_monitor.blocked_ips.remove(ip_address)
    
    return {"message": f"IPアドレス {ip_address} のブロックを解除しました"}

@router.get("/security-blocked-ips")
async def get_blocked_ips():
    """ブロック中のIPアドレス一覧を取得"""
    return {
        "blocked_ips": list(api_monitor.blocked_ips),
        "suspicious_ips": api_monitor.suspicious_ips,
        "total_blocked": len(api_monitor.blocked_ips)
    }

@router.post("/database-integrity-check")
async def trigger_database_integrity_check(background_tasks: BackgroundTasks):
    """データベース整合性チェックを実行"""
    background_tasks.add_task(api_monitor.database_health_check)
    return {"message": "データベース整合性チェックを開始しました"}

@router.post("/performance-benchmark")
async def trigger_performance_benchmark(background_tasks: BackgroundTasks):
    """パフォーマンスベンチマークを実行"""
    background_tasks.add_task(api_monitor.performance_monitoring)
    return {"message": "パフォーマンスベンチマークを開始しました"}