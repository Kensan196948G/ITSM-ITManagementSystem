"""ダッシュボードAPI"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text, case, and_, or_

from app.db.base import get_db
from app.models.incident import Incident, IncidentStatus, Priority, Impact
from app.models.problem import Problem, ProblemStatus
from app.models.change import Change, ChangeStatus
from app.models.user import User
from app.schemas.common import APIError
from app.api.v1.auth import get_current_user_id
from app.core.exceptions import ITSMException
from app.core.cache import cache_result, dashboard_cache_key, cache_manager
from app.core.performance import measure_time, compress_response, optimize_json_response

router = APIRouter()


@router.get(
    "/metrics",
    response_model=Dict[str, Any],
    summary="ダッシュボードメトリクス取得",
    description="ダッシュボード表示用のメトリクス情報を取得します",
    responses={
        200: {"description": "メトリクス情報を正常に取得しました"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
@measure_time("dashboard_metrics")
@compress_response(min_size=2000)
async def get_dashboard_metrics(
    days: int = Query(30, ge=1, le=365, description="過去何日間のデータを取得するか"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> Dict[str, Any]:
    """ダッシュボードメトリクスを取得する"""

    # キャッシュキーを生成
    cache_key = dashboard_cache_key(str(current_user_id), days)

    # キャッシュから取得を試行
    cached_result = cache_manager.get(cache_key)
    if cached_result is not None:
        return optimize_json_response(cached_result)

    try:
        # 集計期間設定
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        # 基本メトリクス取得
        total_tickets = (
            db.query(func.count(Incident.id))
            .filter(Incident.deleted_at.is_(None))
            .scalar()
            or 0
        )

        open_tickets = (
            db.query(func.count(Incident.id))
            .filter(
                and_(
                    Incident.deleted_at.is_(None),
                    Incident.status.in_(
                        [
                            IncidentStatus.NEW,
                            IncidentStatus.ASSIGNED,
                            IncidentStatus.IN_PROGRESS,
                        ]
                    ),
                )
            )
            .scalar()
            or 0
        )

        resolved_tickets = (
            db.query(func.count(Incident.id))
            .filter(
                and_(
                    Incident.deleted_at.is_(None),
                    Incident.status == IncidentStatus.RESOLVED,
                    Incident.resolved_at >= start_date,
                )
            )
            .scalar()
            or 0
        )

        # 期限超過チケット数
        overdue_tickets = (
            db.query(func.count(Incident.id))
            .filter(
                and_(
                    Incident.deleted_at.is_(None),
                    Incident.status.in_(
                        [
                            IncidentStatus.NEW,
                            IncidentStatus.ASSIGNED,
                            IncidentStatus.IN_PROGRESS,
                        ]
                    ),
                    Incident.resolution_due_at < end_date,
                )
            )
            .scalar()
            or 0
        )

        # 平均解決時間計算（時間単位）
        avg_resolution_query = db.query(
            func.avg(
                func.extract("epoch", Incident.resolved_at - Incident.created_at) / 3600
            )
        ).filter(
            and_(
                Incident.deleted_at.is_(None),
                Incident.status == IncidentStatus.RESOLVED,
                Incident.resolved_at >= start_date,
                Incident.resolved_at.is_not(None),
            )
        )

        avg_resolution_time = avg_resolution_query.scalar() or 0

        # SLA遵守率計算
        sla_compliant = (
            db.query(func.count(Incident.id))
            .filter(
                and_(
                    Incident.deleted_at.is_(None),
                    Incident.status == IncidentStatus.RESOLVED,
                    Incident.resolved_at >= start_date,
                    Incident.resolved_at <= Incident.resolution_due_at,
                )
            )
            .scalar()
            or 0
        )

        total_resolved = resolved_tickets
        sla_compliance_rate = (
            (sla_compliant / total_resolved * 100) if total_resolved > 0 else 100
        )

        # 優先度別統計
        priority_stats = {}
        for priority in Priority:
            count = (
                db.query(func.count(Incident.id))
                .filter(
                    and_(
                        Incident.deleted_at.is_(None),
                        Incident.priority == priority,
                        Incident.status.in_(
                            [
                                IncidentStatus.NEW,
                                IncidentStatus.ASSIGNED,
                                IncidentStatus.IN_PROGRESS,
                            ]
                        ),
                    )
                )
                .scalar()
                or 0
            )
            priority_stats[priority.value] = count

        # ステータス別統計
        status_stats = {}
        for status in IncidentStatus:
            count = (
                db.query(func.count(Incident.id))
                .filter(and_(Incident.deleted_at.is_(None), Incident.status == status))
                .scalar()
                or 0
            )
            status_stats[status.value] = count

        # 最近のチケット取得（最新10件）
        recent_tickets_query = (
            db.query(Incident)
            .filter(Incident.deleted_at.is_(None))
            .order_by(Incident.created_at.desc())
            .limit(10)
        )

        recent_tickets = []
        for incident in recent_tickets_query.all():
            recent_tickets.append(
                {
                    "id": str(incident.id),
                    "incident_number": incident.incident_number,
                    "title": incident.title,
                    "status": incident.status.value,
                    "priority": incident.priority.value,
                    "created_at": (
                        incident.created_at.isoformat() if incident.created_at else None
                    ),
                    "assignee_name": (
                        incident.assignee.full_name if incident.assignee else None
                    ),
                }
            )

        # 時系列データ（過去30日の日別統計）
        daily_stats = []
        for i in range(min(days, 30)):
            day_start = (end_date - timedelta(days=i)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            day_end = day_start + timedelta(days=1)

            created_count = (
                db.query(func.count(Incident.id))
                .filter(
                    and_(
                        Incident.created_at >= day_start,
                        Incident.created_at < day_end,
                        Incident.deleted_at.is_(None),
                    )
                )
                .scalar()
                or 0
            )

            resolved_count = (
                db.query(func.count(Incident.id))
                .filter(
                    and_(
                        Incident.resolved_at >= day_start,
                        Incident.resolved_at < day_end,
                        Incident.deleted_at.is_(None),
                    )
                )
                .scalar()
                or 0
            )

            daily_stats.append(
                {
                    "date": day_start.strftime("%Y-%m-%d"),
                    "created": created_count,
                    "resolved": resolved_count,
                }
            )

        # カテゴリ別統計
        category_stats = (
            db.query(
                func.coalesce(Incident.category_id, text("'uncategorized'")).label(
                    "category"
                ),
                func.count(Incident.id).label("count"),
            )
            .filter(
                and_(Incident.deleted_at.is_(None), Incident.created_at >= start_date)
            )
            .group_by(text("category"))
            .all()
        )

        category_data = [
            {"category": str(stat.category), "count": stat.count}
            for stat in category_stats
        ]

        # 担当者別パフォーマンス（上位10名）
        assignee_performance = (
            db.query(
                User.full_name,
                func.count(Incident.id).label("assigned_count"),
                func.count(
                    case([(Incident.status == IncidentStatus.RESOLVED, 1)])
                ).label("resolved_count"),
                func.avg(
                    case(
                        [
                            (
                                Incident.resolved_at.is_not(None),
                                func.extract(
                                    "epoch", Incident.resolved_at - Incident.created_at
                                )
                                / 3600,
                            )
                        ]
                    )
                ).label("avg_resolution_hours"),
            )
            .join(Incident, User.id == Incident.assignee_id)
            .filter(
                and_(Incident.deleted_at.is_(None), Incident.created_at >= start_date)
            )
            .group_by(User.id, User.full_name)
            .order_by(func.count(Incident.id).desc())
            .limit(10)
            .all()
        )

        performance_data = [
            {
                "assignee_name": perf.full_name,
                "assigned_count": perf.assigned_count,
                "resolved_count": perf.resolved_count,
                "avg_resolution_time": round(perf.avg_resolution_hours or 0, 2),
            }
            for perf in assignee_performance
        ]

        # レスポンス構築
        metrics = {
            # 基本メトリクス
            "totalTickets": total_tickets,
            "openTickets": open_tickets,
            "resolvedTickets": resolved_tickets,
            "overdueTickets": overdue_tickets,
            # パフォーマンス指標
            "avgResolutionTime": round(avg_resolution_time, 2),
            "slaComplianceRate": round(sla_compliance_rate, 2),
            # 分類別統計
            "ticketsByPriority": priority_stats,
            "ticketsByStatus": status_stats,
            # 最近の活動
            "recentTickets": recent_tickets,
            # 時系列データ
            "dailyStats": list(reversed(daily_stats)),  # 古い日付から新しい日付順
            # 追加分析
            "categoryStats": category_data,
            "assigneePerformance": performance_data,
            # メタデータ
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": days,
            },
            "generated_at": datetime.utcnow().isoformat(),
        }

        # キャッシュに保存（5分間）
        cache_manager.set(cache_key, metrics, expire=300)

        return optimize_json_response(metrics)

    except Exception as e:
        raise ITSMException(
            message="ダッシュボードメトリクスの取得に失敗しました",
            error_code="DASHBOARD_METRICS_ERROR",
            details={"error": str(e)},
        )


@router.get(
    "/charts/trend",
    response_model=Dict[str, Any],
    summary="トレンドチャートデータ取得",
    description="時系列トレンドチャート用のデータを取得します",
)
async def get_trend_chart_data(
    period: str = Query("30d", pattern="^(7d|30d|90d|1y)$", description="期間指定"),
    metric: str = Query(
        "tickets",
        pattern="^(tickets|resolution_time|sla)$",
        description="メトリクス種別",
    ),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> Dict[str, Any]:
    """トレンドチャートデータを取得する"""

    try:
        # 期間設定
        end_date = datetime.utcnow()
        period_mapping = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
        days = period_mapping[period]
        start_date = end_date - timedelta(days=days)

        # グループ化単位設定
        if days <= 7:
            group_format = "%Y-%m-%d %H:00:00"
            interval = "hour"
        elif days <= 90:
            group_format = "%Y-%m-%d"
            interval = "day"
        else:
            group_format = "%Y-%m"
            interval = "month"

        trend_data = []

        if metric == "tickets":
            # チケット数トレンド
            query = (
                db.query(
                    func.date_trunc(interval, Incident.created_at).label("period"),
                    func.count(Incident.id).label("created"),
                    func.count(
                        case([(Incident.status == IncidentStatus.RESOLVED, 1)])
                    ).label("resolved"),
                )
                .filter(
                    and_(
                        Incident.created_at >= start_date, Incident.deleted_at.is_(None)
                    )
                )
                .group_by(text("period"))
                .order_by(text("period"))
            )

            for row in query.all():
                trend_data.append(
                    {
                        "period": row.period.isoformat(),
                        "created": row.created,
                        "resolved": row.resolved,
                    }
                )

        elif metric == "resolution_time":
            # 解決時間トレンド
            query = (
                db.query(
                    func.date_trunc(interval, Incident.resolved_at).label("period"),
                    func.avg(
                        func.extract(
                            "epoch", Incident.resolved_at - Incident.created_at
                        )
                        / 3600
                    ).label("avg_hours"),
                )
                .filter(
                    and_(
                        Incident.resolved_at >= start_date,
                        Incident.resolved_at.is_not(None),
                        Incident.deleted_at.is_(None),
                    )
                )
                .group_by(text("period"))
                .order_by(text("period"))
            )

            for row in query.all():
                trend_data.append(
                    {
                        "period": row.period.isoformat(),
                        "avg_resolution_time": round(row.avg_hours or 0, 2),
                    }
                )

        elif metric == "sla":
            # SLA遵守率トレンド
            query = (
                db.query(
                    func.date_trunc(interval, Incident.resolved_at).label("period"),
                    func.count(Incident.id).label("total"),
                    func.count(
                        case([(Incident.resolved_at <= Incident.resolution_due_at, 1)])
                    ).label("compliant"),
                )
                .filter(
                    and_(
                        Incident.resolved_at >= start_date,
                        Incident.resolved_at.is_not(None),
                        Incident.deleted_at.is_(None),
                    )
                )
                .group_by(text("period"))
                .order_by(text("period"))
            )

            for row in query.all():
                compliance_rate = (
                    (row.compliant / row.total * 100) if row.total > 0 else 100
                )
                trend_data.append(
                    {
                        "period": row.period.isoformat(),
                        "sla_compliance_rate": round(compliance_rate, 2),
                        "total_tickets": row.total,
                    }
                )

        return {
            "metric": metric,
            "period": period,
            "interval": interval,
            "data": trend_data,
            "generated_at": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        raise ITSMException(
            message="トレンドデータの取得に失敗しました",
            error_code="TREND_DATA_ERROR",
            details={"error": str(e)},
        )


@router.get(
    "/charts/distribution",
    response_model=Dict[str, Any],
    summary="分布チャートデータ取得",
    description="カテゴリや優先度などの分布チャート用データを取得します",
)
async def get_distribution_chart_data(
    chart_type: str = Query(
        "priority",
        pattern="^(priority|status|category|assignee)$",
        description="分布種別",
    ),
    include_resolved: bool = Query(False, description="解決済みチケットを含むか"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> Dict[str, Any]:
    """分布チャートデータを取得する"""

    try:
        # ベースクエリ
        base_query = db.query(Incident).filter(Incident.deleted_at.is_(None))

        if not include_resolved:
            base_query = base_query.filter(
                Incident.status.in_(
                    [
                        IncidentStatus.NEW,
                        IncidentStatus.ASSIGNED,
                        IncidentStatus.IN_PROGRESS,
                    ]
                )
            )

        distribution_data = []

        if chart_type == "priority":
            query = base_query.with_entities(
                Incident.priority, func.count(Incident.id).label("count")
            ).group_by(Incident.priority)

            for row in query.all():
                distribution_data.append(
                    {
                        "label": row.priority.value,
                        "value": row.count,
                        "color": get_priority_color(row.priority),
                    }
                )

        elif chart_type == "status":
            query = base_query.with_entities(
                Incident.status, func.count(Incident.id).label("count")
            ).group_by(Incident.status)

            for row in query.all():
                distribution_data.append(
                    {
                        "label": row.status.value,
                        "value": row.count,
                        "color": get_status_color(row.status),
                    }
                )

        elif chart_type == "category":
            query = (
                base_query.join(Incident.category, isouter=True)
                .with_entities(
                    func.coalesce(Incident.category_id, text("'uncategorized'")).label(
                        "category"
                    ),
                    func.count(Incident.id).label("count"),
                )
                .group_by(text("category"))
            )

            for row in query.all():
                category_label = (
                    "未分類"
                    if str(row.category) == "uncategorized"
                    else str(row.category)
                )
                distribution_data.append({"label": category_label, "value": row.count})

        elif chart_type == "assignee":
            query = (
                base_query.join(User, Incident.assignee_id == User.id, isouter=True)
                .with_entities(
                    func.coalesce(User.full_name, text("'未割当'")).label("assignee"),
                    func.count(Incident.id).label("count"),
                )
                .group_by(text("assignee"))
                .order_by(func.count(Incident.id).desc())
                .limit(10)
            )

            for row in query.all():
                distribution_data.append({"label": row.assignee, "value": row.count})

        return {
            "chart_type": chart_type,
            "include_resolved": include_resolved,
            "data": distribution_data,
            "total_tickets": sum(item["value"] for item in distribution_data),
            "generated_at": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        raise ITSMException(
            message="分布データの取得に失敗しました",
            error_code="DISTRIBUTION_DATA_ERROR",
            details={"error": str(e)},
        )


def get_priority_color(priority: Priority) -> str:
    """優先度に応じた色を返す"""
    color_map = {
        Priority.CRITICAL: "#d32f2f",  # 赤
        Priority.HIGH: "#ff9800",  # オレンジ
        Priority.MEDIUM: "#1976d2",  # 青
        Priority.LOW: "#388e3c",  # 緑
    }
    return color_map.get(priority, "#9e9e9e")


def get_status_color(status: IncidentStatus) -> str:
    """ステータスに応じた色を返す"""
    color_map = {
        IncidentStatus.NEW: "#2196f3",  # 青
        IncidentStatus.ASSIGNED: "#ff9800",  # オレンジ
        IncidentStatus.IN_PROGRESS: "#9c27b0",  # 紫
        IncidentStatus.RESOLVED: "#4caf50",  # 緑
        IncidentStatus.CLOSED: "#757575",  # グレー
        IncidentStatus.CANCELLED: "#f44336",  # 赤
    }
    return color_map.get(status, "#9e9e9e")
