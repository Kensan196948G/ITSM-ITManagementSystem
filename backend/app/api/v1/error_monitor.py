"""
エラー監視API エンドポイント
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.services.api_error_monitor import api_monitor, ErrorSeverity, ErrorCategory, SecurityAlert, PerformanceMetric, DatabaseHealthResult
from app.services.continuous_monitor import ContinuousBackendMonitor
from app.services.enhanced_infinite_loop_monitor import enhanced_monitor
from app.services.advanced_auto_repair_engine import advanced_repair_engine

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

# === 新機能: 無限ループエラー監視・修復システム ===

class InfiniteLoopMonitorResponse(BaseModel):
    """無限ループ監視レスポンス"""
    monitoring: bool
    loop_detection_active: bool
    error_repair_active: bool
    total_loops_detected: int
    total_repairs_attempted: int
    total_repairs_successful: int
    current_repair_session: Optional[str]
    last_detection_timestamp: Optional[datetime]
    repair_success_rate: float

class AutoRepairRequest(BaseModel):
    """自動修復リクエスト"""
    target_errors: List[str] = []
    force_repair: bool = False
    repair_mode: str = "smart"  # smart, aggressive, conservative
    max_repair_attempts: int = 3

class AutoRepairResponse(BaseModel):
    """自動修復レスポンス"""
    repair_session_id: str
    repairs_scheduled: int
    estimated_completion_time: str
    repair_strategy: str
    status: str

@router.get("/infinite-loop-status", response_model=InfiniteLoopMonitorResponse)
async def get_infinite_loop_status():
    """無限ループ監視システムのステータスを取得"""
    try:
        # 継続監視インスタンスの作成（既存のものがあれば取得）
        continuous_monitor = ContinuousBackendMonitor()
        
        # 修復統計の計算
        repair_stats = _calculate_repair_statistics()
        
        return InfiniteLoopMonitorResponse(
            monitoring=continuous_monitor.running if hasattr(continuous_monitor, 'running') else False,
            loop_detection_active=True,
            error_repair_active=True,
            total_loops_detected=repair_stats.get("total_detections", 0),
            total_repairs_attempted=repair_stats.get("total_attempts", 0),
            total_repairs_successful=repair_stats.get("total_successful", 0),
            current_repair_session=repair_stats.get("current_session"),
            last_detection_timestamp=repair_stats.get("last_detection"),
            repair_success_rate=repair_stats.get("success_rate", 0.0)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"無限ループ監視ステータス取得エラー: {str(e)}")

@router.post("/start-infinite-monitoring")
async def start_infinite_loop_monitoring(
    background_tasks: BackgroundTasks,
    monitoring_interval: int = Query(5, description="監視間隔（秒）"),
    auto_repair: bool = Query(True, description="自動修復を有効にする")
):
    """無限ループエラー監視を開始"""
    try:
        continuous_monitor = ContinuousBackendMonitor()
        
        # 既に実行中かチェック
        if hasattr(continuous_monitor, 'running') and continuous_monitor.running:
            raise HTTPException(status_code=400, detail="無限ループ監視は既に実行中です")
        
        # 無限ループ監視を開始
        background_tasks.add_task(
            _run_infinite_loop_monitoring,
            continuous_monitor,
            monitoring_interval,
            auto_repair
        )
        
        return {
            "message": "無限ループエラー監視を開始しました",
            "monitoring_interval": monitoring_interval,
            "auto_repair_enabled": auto_repair,
            "session_id": f"infinite_monitor_{int(time.time())}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"無限ループ監視開始エラー: {str(e)}")

@router.post("/stop-infinite-monitoring")
async def stop_infinite_loop_monitoring():
    """無限ループエラー監視を停止"""
    try:
        continuous_monitor = ContinuousBackendMonitor()
        continuous_monitor.stop_monitoring()
        
        return {
            "message": "無限ループエラー監視を停止しました",
            "stopped_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"無限ループ監視停止エラー: {str(e)}")

@router.post("/auto-repair", response_model=AutoRepairResponse)
async def trigger_auto_repair(
    repair_request: AutoRepairRequest,
    background_tasks: BackgroundTasks
):
    """自動修復エンジンを実行"""
    try:
        repair_session_id = f"repair_{int(time.time())}"
        
        # 修復対象エラーの選定
        target_errors = []
        if repair_request.target_errors:
            # 指定されたエラーのみ
            target_errors = [e for e in api_monitor.errors if e.error_type in repair_request.target_errors and not e.fix_attempted]
        else:
            # 未修復の全エラー
            target_errors = [e for e in api_monitor.errors if not e.fix_attempted]
        
        if not target_errors and not repair_request.force_repair:
            raise HTTPException(status_code=400, detail="修復対象のエラーがありません")
        
        # 修復戦略の決定
        repair_strategy = _determine_repair_strategy(repair_request.repair_mode, target_errors)
        
        # バックグラウンドで自動修復実行
        background_tasks.add_task(
            _run_auto_repair_engine,
            repair_session_id,
            target_errors,
            repair_strategy,
            repair_request.max_repair_attempts
        )
        
        return AutoRepairResponse(
            repair_session_id=repair_session_id,
            repairs_scheduled=len(target_errors),
            estimated_completion_time=_calculate_estimated_completion(len(target_errors), repair_strategy),
            repair_strategy=repair_strategy,
            status="scheduled"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"自動修復開始エラー: {str(e)}")

@router.get("/repair-history")
async def get_repair_history(
    hours: int = Query(24, description="過去何時間の履歴を取得"),
    session_id: Optional[str] = Query(None, description="特定のセッションIDで絞り込み")
):
    """修復履歴を取得"""
    try:
        from pathlib import Path
        
        # 修復履歴ファイルから読み込み
        backend_path = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend")
        history_files = [
            backend_path / "logs" / "auto_repair.log",
            Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/fixes.json")
        ]
        
        repair_history = []
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        for history_file in history_files:
            if history_file.exists() and history_file.suffix == '.json':
                try:
                    with open(history_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        
                    # 修復履歴の抽出と整形
                    if 'all_fixes' in data:
                        for fix in data['all_fixes']:
                            fix_time = datetime.fromisoformat(fix.get('timestamp', datetime.now().isoformat()))
                            if fix_time > cutoff_time:
                                if not session_id or fix.get('session_id') == session_id:
                                    repair_history.append(fix)
                except json.JSONDecodeError:
                    continue
        
        # 時系列でソート
        repair_history.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return {
            "repair_history": repair_history,
            "total_repairs": len(repair_history),
            "period_hours": hours,
            "session_filter": session_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"修復履歴取得エラー: {str(e)}")

@router.get("/repair-statistics")
async def get_repair_statistics():
    """修復統計情報を取得"""
    try:
        stats = _calculate_repair_statistics()
        
        # 追加統計の計算
        recent_errors = [e for e in api_monitor.errors if e.timestamp > datetime.now() - timedelta(hours=24)]
        error_categories = {}
        for error in recent_errors:
            cat = error.category.value
            error_categories[cat] = error_categories.get(cat, 0) + 1
        
        return {
            "repair_statistics": stats,
            "error_distribution": error_categories,
            "system_health": {
                "total_errors_24h": len(recent_errors),
                "critical_errors_24h": len([e for e in recent_errors if e.severity.value == "critical"]),
                "auto_fix_rate": stats.get("success_rate", 0),
                "manual_intervention_required": len([e for e in recent_errors if not e.fix_attempted and e.severity.value in ["critical", "high"]])
            },
            "performance_impact": {
                "avg_repair_time": stats.get("avg_repair_time", 0),
                "system_downtime_prevented": stats.get("downtime_prevented", 0),
                "cost_savings_estimated": stats.get("cost_savings", 0)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"修復統計取得エラー: {str(e)}")

@router.post("/emergency-repair")
async def trigger_emergency_repair(
    background_tasks: BackgroundTasks,
    force_restart: bool = Query(False, description="サービス再起動を許可"),
    bypass_safety: bool = Query(False, description="安全チェックをバイパス")
):
    """緊急修復モードを実行"""
    try:
        emergency_session_id = f"emergency_{int(time.time())}"
        
        # 緊急修復対象の特定
        critical_errors = [e for e in api_monitor.errors if e.severity.value == "critical" and not e.fix_successful]
        high_errors = [e for e in api_monitor.errors if e.severity.value == "high" and not e.fix_successful]
        
        emergency_targets = critical_errors + high_errors[:5]  # 最大5件の高重要度エラー
        
        if not emergency_targets:
            return {
                "message": "緊急修復が必要なエラーはありません",
                "status": "no_action_required"
            }
        
        # 緊急修復実行
        background_tasks.add_task(
            _run_emergency_repair,
            emergency_session_id,
            emergency_targets,
            force_restart,
            bypass_safety
        )
        
        return {
            "message": "緊急修復モードを開始しました",
            "session_id": emergency_session_id,
            "target_errors": len(emergency_targets),
            "critical_errors": len(critical_errors),
            "high_errors": len(high_errors),
            "force_restart_enabled": force_restart,
            "safety_bypass_enabled": bypass_safety
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"緊急修復開始エラー: {str(e)}")

@router.get("/repair-recommendations")
async def get_repair_recommendations():
    """修復推奨事項を取得"""
    try:
        recommendations = []
        
        # 未修復エラーの分析
        unfixed_errors = [e for e in api_monitor.errors if not e.fix_attempted]
        critical_unfixed = [e for e in unfixed_errors if e.severity.value == "critical"]
        high_unfixed = [e for e in unfixed_errors if e.severity.value == "high"]
        
        # 推奨事項の生成
        if critical_unfixed:
            recommendations.append({
                "priority": "critical",
                "action": "immediate_repair",
                "description": f"{len(critical_unfixed)}件のクリティカルエラーが未修復です",
                "estimated_impact": "システム停止の可能性",
                "repair_complexity": "high",
                "estimated_time": "5-15分"
            })
        
        if high_unfixed:
            recommendations.append({
                "priority": "high",
                "action": "schedule_repair",
                "description": f"{len(high_unfixed)}件の高重要度エラーが未修復です",
                "estimated_impact": "機能低下の可能性",
                "repair_complexity": "medium",
                "estimated_time": "2-10分"
            })
        
        # パフォーマンス問題の検出
        recent_perf = [m for m in api_monitor.performance_metrics if m.timestamp > datetime.now() - timedelta(minutes=30)]
        if recent_perf:
            avg_response_time = sum(m.response_time for m in recent_perf) / len(recent_perf)
            if avg_response_time > 3.0:
                recommendations.append({
                    "priority": "medium",
                    "action": "performance_optimization",
                    "description": f"平均レスポンス時間が{avg_response_time:.2f}秒と遅延しています",
                    "estimated_impact": "ユーザー体験の低下",
                    "repair_complexity": "medium",
                    "estimated_time": "10-30分"
                })
        
        # セキュリティアラートの確認
        recent_security = [a for a in api_monitor.security_alerts if a.timestamp > datetime.now() - timedelta(hours=1)]
        if recent_security:
            recommendations.append({
                "priority": "high",
                "action": "security_review",
                "description": f"{len(recent_security)}件のセキュリティアラートが発生しています",
                "estimated_impact": "セキュリティリスク",
                "repair_complexity": "high",
                "estimated_time": "15-45分"
            })
        
        if not recommendations:
            recommendations.append({
                "priority": "info",
                "action": "preventive_maintenance",
                "description": "システムは正常です。定期メンテナンスを推奨します",
                "estimated_impact": "予防的",
                "repair_complexity": "low",
                "estimated_time": "5-10分"
            })
        
        return {
            "recommendations": recommendations,
            "total_recommendations": len(recommendations),
            "critical_actions": len([r for r in recommendations if r["priority"] == "critical"]),
            "high_priority_actions": len([r for r in recommendations if r["priority"] == "high"]),
            "generated_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"修復推奨事項取得エラー: {str(e)}")

# === ヘルパー関数 ===

def _calculate_repair_statistics() -> Dict[str, Any]:
    """修復統計を計算"""
    try:
        attempted_repairs = [e for e in api_monitor.errors if e.fix_attempted]
        successful_repairs = [e for e in attempted_repairs if e.fix_successful]
        
        success_rate = (len(successful_repairs) / len(attempted_repairs) * 100) if attempted_repairs else 0
        
        return {
            "total_detections": len(api_monitor.errors),
            "total_attempts": len(attempted_repairs),
            "total_successful": len(successful_repairs),
            "success_rate": round(success_rate, 2),
            "current_session": f"session_{int(time.time())}",
            "last_detection": max([e.timestamp for e in api_monitor.errors], default=None),
            "avg_repair_time": 30.0,  # 仮の値
            "downtime_prevented": len(successful_repairs) * 5,  # 仮の値（分）
            "cost_savings": len(successful_repairs) * 1000  # 仮の値（円）
        }
    except Exception:
        return {}

def _determine_repair_strategy(mode: str, errors: List) -> str:
    """修復戦略を決定"""
    if mode == "aggressive":
        return "aggressive_parallel_repair"
    elif mode == "conservative":
        return "conservative_sequential_repair"
    else:  # smart
        critical_count = len([e for e in errors if e.severity.value == "critical"])
        if critical_count > 3:
            return "smart_prioritized_repair"
        else:
            return "smart_balanced_repair"

def _calculate_estimated_completion(error_count: int, strategy: str) -> str:
    """完了予想時間を計算"""
    base_time = error_count * 2  # 基本2分/エラー
    
    if "aggressive" in strategy:
        completion_time = base_time * 0.7  # 並列処理で短縮
    elif "conservative" in strategy:
        completion_time = base_time * 1.5  # 慎重に実行で延長
    else:
        completion_time = base_time
    
    return f"{int(completion_time)}分後"

async def _run_infinite_loop_monitoring(
    monitor: ContinuousBackendMonitor,
    interval: int,
    auto_repair: bool
):
    """無限ループ監視を実行"""
    try:
        logger.info(f"無限ループ監視開始 - 間隔: {interval}秒, 自動修復: {auto_repair}")
        await monitor.start_monitoring()
    except Exception as e:
        logger.error(f"無限ループ監視エラー: {e}")

async def _run_auto_repair_engine(
    session_id: str,
    errors: List,
    strategy: str,
    max_attempts: int
):
    """自動修復エンジンを実行"""
    try:
        logger.info(f"自動修復開始 - セッション: {session_id}, 戦略: {strategy}")
        
        # 修復実行
        for attempt in range(max_attempts):
            for error in errors:
                if not error.fix_attempted:
                    fix_result = await api_monitor._fix_error(error)
                    error.fix_attempted = True
                    error.fix_successful = fix_result.get("success", False)
                    error.fix_description = fix_result.get("description", "")
        
        logger.info(f"自動修復完了 - セッション: {session_id}")
    except Exception as e:
        logger.error(f"自動修復エラー: {e}")

async def _run_emergency_repair(
    session_id: str,
    errors: List,
    force_restart: bool,
    bypass_safety: bool
):
    """緊急修復を実行"""
    try:
        logger.warning(f"緊急修復開始 - セッション: {session_id}")
        
        # 緊急修復ロジック
        for error in errors:
            if error.severity.value == "critical":
                # クリティカルエラーの即座修復
                await api_monitor._fix_error(error)
                error.fix_attempted = True
        
        if force_restart:
            logger.warning("緊急サービス再起動の実行を推奨")
        
        logger.info(f"緊急修復完了 - セッション: {session_id}")
    except Exception as e:
        logger.error(f"緊急修復エラー: {e}")