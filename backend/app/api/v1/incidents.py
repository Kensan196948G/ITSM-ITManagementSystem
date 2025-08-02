"""インシデント管理API"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.services.incident_service import IncidentService
from app.schemas.incident import (
    IncidentCreate,
    IncidentUpdate,
    IncidentResponse,
    IncidentWorkNoteCreate,
    IncidentWorkNoteResponse,
    IncidentHistoryResponse,
    IncidentDetailResponse,
    IncidentTimelineResponse,
    IncidentAttachmentResponse,
    IncidentFieldUpdate,
    IncidentBulkUpdate,
    IncidentCustomFieldsUpdate,
)
from app.schemas.common import SuccessResponse, APIError
from app.api.v1.auth import get_current_user_id
from app.core.cache import incidents_list_cache_key, cache_manager, CacheInvalidator
from app.core.performance import measure_time, compress_response, optimize_json_response

router = APIRouter()


@router.post(
    "/",
    response_model=IncidentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="インシデント作成",
    description="新しいインシデントを作成します",
    responses={
        201: {"description": "インシデントが正常に作成されました"},
        400: {"model": APIError, "description": "リクエストデータが不正です"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
@measure_time("create_incident")
async def create_incident(
    incident_data: IncidentCreate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> IncidentResponse:
    """インシデントを作成する"""
    service = IncidentService(db)
    result = service.create_incident(incident_data, current_user_id)

    # インシデント関連キャッシュを無効化
    CacheInvalidator.invalidate_incident_cache()
    CacheInvalidator.invalidate_dashboard_cache()

    return result


@router.get(
    "/",
    response_model=Dict[str, Any],
    summary="インシデント一覧取得",
    description="インシデントの一覧を取得します（フィルター・ページネーション対応）",
    responses={
        200: {"description": "インシデント一覧を正常に取得しました"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
@measure_time("list_incidents")
@compress_response(min_size=1500)
async def list_incidents(
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(20, ge=1, le=100, description="1ページあたりの件数"),
    # 基本フィルター
    status: Optional[List[str]] = Query(None, description="ステータスフィルター"),
    priority: Optional[List[str]] = Query(None, description="優先度フィルター"),
    impact: Optional[List[str]] = Query(None, description="影響度フィルター"),
    urgency: Optional[List[str]] = Query(None, description="緊急度フィルター"),
    assignee_id: Optional[UUID] = Query(None, description="担当者IDフィルター"),
    reporter_id: Optional[UUID] = Query(None, description="報告者IDフィルター"),
    team_id: Optional[UUID] = Query(None, description="チームIDフィルター"),
    category_id: Optional[UUID] = Query(None, description="カテゴリIDフィルター"),
    # 高度フィルター
    date_from: Optional[datetime] = Query(None, description="作成日時（開始）"),
    date_to: Optional[datetime] = Query(None, description="作成日時（終了）"),
    due_date_from: Optional[datetime] = Query(None, description="期限（開始）"),
    due_date_to: Optional[datetime] = Query(None, description="期限（終了）"),
    sla_status: Optional[str] = Query(
        None, pattern="^(compliant|at_risk|violated)$", description="SLAステータス"
    ),
    has_attachments: Optional[bool] = Query(None, description="添付ファイル有無"),
    last_updated_days: Optional[int] = Query(
        None, ge=1, description="最終更新日（〜日以内）"
    ),
    # 検索
    q: Optional[str] = Query(None, description="フリーワード検索"),
    search_fields: Optional[List[str]] = Query(None, description="検索対象フィールド"),
    sort: Optional[str] = Query(None, description="ソート順（例: -created_at）"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> Dict[str, Any]:
    """インシデント一覧を取得する"""

    # キャッシュキーを生成（検索クエリがない場合のみキャッシュを使用）
    cache_key = None
    if not q and not search_fields:  # 検索クエリがない場合のみキャッシュ
        filters = {
            "status": status,
            "priority": priority,
            "impact": impact,
            "urgency": urgency,
            "assignee_id": assignee_id,
            "reporter_id": reporter_id,
            "team_id": team_id,
            "category_id": category_id,
            "date_from": date_from,
            "date_to": date_to,
            "due_date_from": due_date_from,
            "due_date_to": due_date_to,
            "sla_status": sla_status,
            "has_attachments": has_attachments,
            "last_updated_days": last_updated_days,
            "sort": sort,
        }
        cache_key = incidents_list_cache_key(
            str(current_user_id), page, per_page, **filters
        )

        # キャッシュから取得を試行
        cached_result = cache_manager.get(cache_key)
        if cached_result is not None:
            return optimize_json_response(cached_result)

    service = IncidentService(db)
    result = service.list_incidents(
        current_user_id=current_user_id,
        page=page,
        per_page=per_page,
        status=status,
        priority=priority,
        impact=impact,
        urgency=urgency,
        assignee_id=assignee_id,
        reporter_id=reporter_id,
        team_id=team_id,
        category_id=category_id,
        date_from=date_from,
        date_to=date_to,
        due_date_from=due_date_from,
        due_date_to=due_date_to,
        sla_status=sla_status,
        has_attachments=has_attachments,
        last_updated_days=last_updated_days,
        q=q,
        search_fields=search_fields,
        sort=sort,
    )

    # キャッシュに保存（検索クエリがない場合のみ、2分間）
    if cache_key:
        cache_manager.set(cache_key, result, expire=120)

    return optimize_json_response(result)


@router.get(
    "/{incident_id}",
    response_model=IncidentResponse,
    summary="インシデント詳細取得",
    description="指定されたインシデントの詳細情報を取得します",
    responses={
        200: {"description": "インシデント詳細を正常に取得しました"},
        404: {
            "model": APIError,
            "description": "指定されたインシデントが見つかりません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def get_incident(
    incident_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> IncidentResponse:
    """インシデントの詳細を取得する"""
    service = IncidentService(db)
    return service.get_incident(incident_id, current_user_id)


@router.patch(
    "/{incident_id}",
    response_model=IncidentResponse,
    summary="インシデント更新",
    description="指定されたインシデントの情報を更新します",
    responses={
        200: {"description": "インシデントが正常に更新されました"},
        400: {"model": APIError, "description": "リクエストデータが不正です"},
        404: {
            "model": APIError,
            "description": "指定されたインシデントが見つかりません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def update_incident(
    incident_id: UUID,
    incident_data: IncidentUpdate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> IncidentResponse:
    """インシデントを更新する"""
    service = IncidentService(db)
    return service.update_incident(incident_id, incident_data, current_user_id)


@router.post(
    "/{incident_id}/work-notes",
    response_model=IncidentWorkNoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="作業ノート追加",
    description="指定されたインシデントに作業ノートを追加します",
    responses={
        201: {"description": "作業ノートが正常に追加されました"},
        400: {"model": APIError, "description": "リクエストデータが不正です"},
        404: {
            "model": APIError,
            "description": "指定されたインシデントが見つかりません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def add_work_note(
    incident_id: UUID,
    note_data: IncidentWorkNoteCreate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> IncidentWorkNoteResponse:
    """インシデントに作業ノートを追加する"""
    service = IncidentService(db)
    return service.add_work_note(incident_id, note_data, current_user_id)


@router.get(
    "/{incident_id}/history",
    response_model=List[IncidentHistoryResponse],
    summary="インシデント履歴取得",
    description="指定されたインシデントの変更履歴を取得します",
    responses={
        200: {"description": "インシデント履歴を正常に取得しました"},
        404: {
            "model": APIError,
            "description": "指定されたインシデントが見つかりません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def get_incident_history(
    incident_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> List[IncidentHistoryResponse]:
    """インシデントの履歴を取得する"""
    service = IncidentService(db)
    return service.get_incident_history(incident_id, current_user_id)


@router.get(
    "/{incident_id}/work-notes",
    response_model=List[IncidentWorkNoteResponse],
    summary="作業ノート一覧取得",
    description="指定されたインシデントの作業ノート一覧を取得します",
    responses={
        200: {"description": "作業ノート一覧を正常に取得しました"},
        404: {
            "model": APIError,
            "description": "指定されたインシデントが見つかりません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def get_work_notes(
    incident_id: UUID,
    include_private: bool = Query(False, description="プライベートノートも含むか"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> List[IncidentWorkNoteResponse]:
    """インシデントの作業ノート一覧を取得する"""
    service = IncidentService(db)
    return service.get_work_notes(incident_id, current_user_id, include_private)


@router.put(
    "/{incident_id}/work-notes/{note_id}",
    response_model=IncidentWorkNoteResponse,
    summary="作業ノート更新",
    description="指定された作業ノートを更新します",
    responses={
        200: {"description": "作業ノートが正常に更新されました"},
        404: {"model": APIError, "description": "指定された作業ノートが見つかりません"},
        403: {"model": APIError, "description": "作業ノートの更新権限がありません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def update_work_note(
    incident_id: UUID,
    note_id: UUID,
    note_data: IncidentWorkNoteCreate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> IncidentWorkNoteResponse:
    """作業ノートを更新する"""
    service = IncidentService(db)
    return service.update_work_note(incident_id, note_id, note_data, current_user_id)


@router.delete(
    "/{incident_id}/work-notes/{note_id}",
    response_model=SuccessResponse,
    summary="作業ノート削除",
    description="指定された作業ノートを削除します",
    responses={
        200: {"description": "作業ノートが正常に削除されました"},
        404: {"model": APIError, "description": "指定された作業ノートが見つかりません"},
        403: {"model": APIError, "description": "作業ノートの削除権限がありません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def delete_work_note(
    incident_id: UUID,
    note_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> SuccessResponse:
    """作業ノートを削除する"""
    service = IncidentService(db)
    service.delete_work_note(incident_id, note_id, current_user_id)
    return SuccessResponse(
        message="作業ノートが正常に削除されました",
        data={"incident_id": incident_id, "note_id": note_id},
    )


@router.post(
    "/{incident_id}/assign",
    response_model=SuccessResponse,
    summary="インシデント担当者割り当て",
    description="指定されたインシデントに担当者を割り当てます",
    responses={
        200: {"description": "担当者が正常に割り当てられました"},
        404: {
            "model": APIError,
            "description": "指定されたインシデントが見つかりません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def assign_incident(
    incident_id: UUID,
    assignee_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> SuccessResponse:
    """インシデントに担当者を割り当てる"""
    service = IncidentService(db)
    update_data = IncidentUpdate(assignee_id=assignee_id)
    service.update_incident(incident_id, update_data, current_user_id)

    return SuccessResponse(
        message="担当者が正常に割り当てられました",
        data={"incident_id": incident_id, "assignee_id": assignee_id},
    )


@router.post(
    "/{incident_id}/resolve",
    response_model=SuccessResponse,
    summary="インシデント解決",
    description="指定されたインシデントを解決済みに変更します",
    responses={
        200: {"description": "インシデントが正常に解決されました"},
        404: {
            "model": APIError,
            "description": "指定されたインシデントが見つかりません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def resolve_incident(
    incident_id: UUID,
    resolution: str,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> SuccessResponse:
    """インシデントを解決する"""
    service = IncidentService(db)
    update_data = IncidentUpdate(status="resolved", resolution=resolution)
    service.update_incident(incident_id, update_data, current_user_id)

    return SuccessResponse(
        message="インシデントが正常に解決されました", data={"incident_id": incident_id}
    )


@router.get(
    "/{incident_id}/detail",
    response_model=IncidentDetailResponse,
    summary="インシデント詳細情報取得（詳細パネル用）",
    description="詳細パネル表示のための統合されたインシデント詳細情報を取得します",
    responses={
        200: {"description": "インシデント詳細情報を正常に取得しました"},
        404: {
            "model": APIError,
            "description": "指定されたインシデントが見つかりません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
@measure_time("get_incident_detail")
@compress_response(min_size=2000)
async def get_incident_detail(
    incident_id: UUID,
    include_work_notes: bool = Query(True, description="作業ノートを含むか"),
    include_histories: bool = Query(True, description="変更履歴を含むか"),
    include_attachments: bool = Query(True, description="添付ファイルを含むか"),
    include_related: bool = Query(True, description="関連インシデントを含むか"),
    include_stats: bool = Query(True, description="統計情報を含むか"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> IncidentDetailResponse:
    """詳細パネル用のインシデント詳細情報を取得する"""

    # キャッシュキーを生成
    cache_key = f"incident_detail:{incident_id}:{current_user_id}:{include_work_notes}:{include_histories}:{include_attachments}:{include_related}:{include_stats}"

    # キャッシュから取得を試行
    cached_result = cache_manager.get(cache_key)
    if cached_result is not None:
        return optimize_json_response(cached_result)

    service = IncidentService(db)
    result = service.get_incident_detail(
        incident_id=incident_id,
        current_user_id=current_user_id,
        include_work_notes=include_work_notes,
        include_histories=include_histories,
        include_attachments=include_attachments,
        include_related=include_related,
        include_stats=include_stats,
    )

    # キャッシュに保存（5分間）
    cache_manager.set(cache_key, result, expire=300)

    return optimize_json_response(result)


@router.get(
    "/{incident_id}/timeline",
    response_model=IncidentTimelineResponse,
    summary="インシデントタイムライン取得",
    description="インシデントの時系列活動履歴を取得します",
    responses={
        200: {"description": "タイムラインを正常に取得しました"},
        404: {
            "model": APIError,
            "description": "指定されたインシデントが見つかりません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
@measure_time("get_incident_timeline")
async def get_incident_timeline(
    incident_id: UUID,
    limit: int = Query(50, ge=1, le=200, description="取得件数"),
    offset: int = Query(0, ge=0, description="オフセット"),
    event_types: Optional[List[str]] = Query(
        None, description="イベントタイプフィルター"
    ),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> IncidentTimelineResponse:
    """インシデントのタイムラインを取得する"""
    service = IncidentService(db)
    return service.get_incident_timeline(
        incident_id=incident_id,
        current_user_id=current_user_id,
        limit=limit,
        offset=offset,
        event_types=event_types,
    )


@router.get(
    "/{incident_id}/attachments",
    response_model=List[IncidentAttachmentResponse],
    summary="インシデント添付ファイル一覧取得",
    description="指定されたインシデントの添付ファイル一覧を取得します",
    responses={
        200: {"description": "添付ファイル一覧を正常に取得しました"},
        404: {
            "model": APIError,
            "description": "指定されたインシデントが見つかりません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def get_incident_attachments(
    incident_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> List[IncidentAttachmentResponse]:
    """インシデントの添付ファイル一覧を取得する"""
    service = IncidentService(db)
    return service.get_incident_attachments(incident_id, current_user_id)


@router.get(
    "/{incident_id}/related",
    response_model=List[Dict[str, Any]],
    summary="関連インシデント取得",
    description="指定されたインシデントに関連するインシデント一覧を取得します",
    responses={
        200: {"description": "関連インシデント一覧を正常に取得しました"},
        404: {
            "model": APIError,
            "description": "指定されたインシデントが見つかりません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def get_related_incidents(
    incident_id: UUID,
    relation_type: Optional[str] = Query(None, description="関連タイプ"),
    limit: int = Query(10, ge=1, le=50, description="取得件数"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> List[Dict[str, Any]]:
    """関連インシデントを取得する"""
    service = IncidentService(db)
    return service.get_related_incidents(
        incident_id=incident_id,
        current_user_id=current_user_id,
        relation_type=relation_type,
        limit=limit,
    )


@router.get(
    "/{incident_id}/statistics",
    response_model=Dict[str, Any],
    summary="インシデント統計情報取得",
    description="指定されたインシデントの統計情報を取得します",
    responses={
        200: {"description": "統計情報を正常に取得しました"},
        404: {
            "model": APIError,
            "description": "指定されたインシデントが見つかりません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def get_incident_statistics(
    incident_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> Dict[str, Any]:
    """インシデントの統計情報を取得する"""
    service = IncidentService(db)
    return service.get_incident_statistics(incident_id, current_user_id)


@router.patch(
    "/{incident_id}/field",
    response_model=IncidentResponse,
    summary="インシデント単一フィールド更新",
    description="指定されたインシデントの単一フィールドを更新します（詳細パネル用）",
    responses={
        200: {"description": "フィールドが正常に更新されました"},
        400: {"model": APIError, "description": "リクエストデータが不正です"},
        404: {
            "model": APIError,
            "description": "指定されたインシデントが見つかりません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
@measure_time("update_incident_field")
async def update_incident_field(
    incident_id: UUID,
    field_update: IncidentFieldUpdate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> IncidentResponse:
    """インシデントの単一フィールドを更新する"""
    service = IncidentService(db)
    result = service.update_incident_field(
        incident_id=incident_id,
        field_update=field_update,
        current_user_id=current_user_id,
    )

    # インシデント関連キャッシュを無効化
    CacheInvalidator.invalidate_incident_cache()
    CacheInvalidator.invalidate_dashboard_cache()

    return result


@router.patch(
    "/{incident_id}/custom-fields",
    response_model=IncidentResponse,
    summary="インシデントカスタムフィールド更新",
    description="指定されたインシデントのカスタムフィールドを更新します",
    responses={
        200: {"description": "カスタムフィールドが正常に更新されました"},
        400: {"model": APIError, "description": "リクエストデータが不正です"},
        404: {
            "model": APIError,
            "description": "指定されたインシデントが見つかりません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def update_incident_custom_fields(
    incident_id: UUID,
    custom_fields_update: IncidentCustomFieldsUpdate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> IncidentResponse:
    """インシデントのカスタムフィールドを更新する"""
    service = IncidentService(db)
    result = service.update_incident_custom_fields(
        incident_id=incident_id,
        custom_fields_update=custom_fields_update,
        current_user_id=current_user_id,
    )

    # インシデント関連キャッシュを無効化
    CacheInvalidator.invalidate_incident_cache()

    return result


@router.post(
    "/bulk-update",
    response_model=Dict[str, Any],
    summary="インシデント一括更新",
    description="複数のインシデントを一括で更新します",
    responses={
        200: {"description": "一括更新が正常に完了しました"},
        400: {"model": APIError, "description": "リクエストデータが不正です"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
@measure_time("bulk_update_incidents")
async def bulk_update_incidents(
    bulk_update: IncidentBulkUpdate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> Dict[str, Any]:
    """インシデントを一括更新する"""
    service = IncidentService(db)
    result = service.bulk_update_incidents(
        bulk_update=bulk_update, current_user_id=current_user_id
    )

    # インシデント関連キャッシュを無効化
    CacheInvalidator.invalidate_incident_cache()
    CacheInvalidator.invalidate_dashboard_cache()

    return result


@router.post(
    "/{incident_id}/quick-actions",
    response_model=SuccessResponse,
    summary="インシデントクイックアクション実行",
    description="詳細パネルからのクイックアクションを実行します",
    responses={
        200: {"description": "アクションが正常に実行されました"},
        400: {"model": APIError, "description": "リクエストデータが不正です"},
        404: {
            "model": APIError,
            "description": "指定されたインシデントが見つかりません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def execute_incident_quick_action(
    incident_id: UUID,
    action: str = Query(..., description="実行するアクション"),
    parameters: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> SuccessResponse:
    """インシデントのクイックアクションを実行する"""
    service = IncidentService(db)
    result = service.execute_quick_action(
        incident_id=incident_id,
        action=action,
        parameters=parameters or {},
        current_user_id=current_user_id,
    )

    # インシデント関連キャッシュを無効化
    CacheInvalidator.invalidate_incident_cache()
    CacheInvalidator.invalidate_dashboard_cache()

    return SuccessResponse(
        message=f"アクション '{action}' が正常に実行されました", data=result
    )
