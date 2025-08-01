"""インシデント管理API"""

from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.services.incident_service import IncidentService
from app.schemas.incident import (
    IncidentCreate, IncidentUpdate, IncidentResponse, 
    IncidentWorkNoteCreate, IncidentWorkNoteResponse, IncidentHistoryResponse
)
from app.schemas.common import SuccessResponse, APIError
from app.api.v1.auth import get_current_user_id

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
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def create_incident(
    incident_data: IncidentCreate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> IncidentResponse:
    """インシデントを作成する"""
    service = IncidentService(db)
    return service.create_incident(incident_data, current_user_id)


@router.get(
    "/",
    response_model=Dict[str, Any],
    summary="インシデント一覧取得",
    description="インシデントの一覧を取得します（フィルター・ページネーション対応）",
    responses={
        200: {"description": "インシデント一覧を正常に取得しました"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def list_incidents(
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(20, ge=1, le=100, description="1ページあたりの件数"),
    status: Optional[List[str]] = Query(None, description="ステータスフィルター"),
    priority: Optional[List[str]] = Query(None, description="優先度フィルター"),
    assignee_id: Optional[UUID] = Query(None, description="担当者IDフィルター"),
    category_id: Optional[UUID] = Query(None, description="カテゴリIDフィルター"),
    q: Optional[str] = Query(None, description="フリーワード検索"),
    sort: Optional[str] = Query(None, description="ソート順（例: -created_at）"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """インシデント一覧を取得する"""
    service = IncidentService(db)
    return service.list_incidents(
        current_user_id=current_user_id,
        page=page,
        per_page=per_page,
        status=status,
        priority=priority,
        assignee_id=assignee_id,
        category_id=category_id,
        q=q,
        sort=sort
    )


@router.get(
    "/{incident_id}",
    response_model=IncidentResponse,
    summary="インシデント詳細取得",
    description="指定されたインシデントの詳細情報を取得します",
    responses={
        200: {"description": "インシデント詳細を正常に取得しました"},
        404: {"model": APIError, "description": "指定されたインシデントが見つかりません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def get_incident(
    incident_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
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
        404: {"model": APIError, "description": "指定されたインシデントが見つかりません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def update_incident(
    incident_id: UUID,
    incident_data: IncidentUpdate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
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
        404: {"model": APIError, "description": "指定されたインシデントが見つかりません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def add_work_note(
    incident_id: UUID,
    note_data: IncidentWorkNoteCreate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
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
        404: {"model": APIError, "description": "指定されたインシデントが見つかりません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def get_incident_history(
    incident_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> List[IncidentHistoryResponse]:
    """インシデントの履歴を取得する"""
    # 実装は簡略化
    return []


@router.post(
    "/{incident_id}/assign",
    response_model=SuccessResponse,
    summary="インシデント担当者割り当て",
    description="指定されたインシデントに担当者を割り当てます",
    responses={
        200: {"description": "担当者が正常に割り当てられました"},
        404: {"model": APIError, "description": "指定されたインシデントが見つかりません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def assign_incident(
    incident_id: UUID,
    assignee_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> SuccessResponse:
    """インシデントに担当者を割り当てる"""
    service = IncidentService(db)
    update_data = IncidentUpdate(assignee_id=assignee_id)
    service.update_incident(incident_id, update_data, current_user_id)
    
    return SuccessResponse(
        message="担当者が正常に割り当てられました",
        data={"incident_id": incident_id, "assignee_id": assignee_id}
    )


@router.post(
    "/{incident_id}/resolve",
    response_model=SuccessResponse,
    summary="インシデント解決",
    description="指定されたインシデントを解決済みに変更します",
    responses={
        200: {"description": "インシデントが正常に解決されました"},
        404: {"model": APIError, "description": "指定されたインシデントが見つかりません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def resolve_incident(
    incident_id: UUID,
    resolution: str,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> SuccessResponse:
    """インシデントを解決する"""
    service = IncidentService(db)
    update_data = IncidentUpdate(
        status="resolved",
        resolution=resolution
    )
    service.update_incident(incident_id, update_data, current_user_id)
    
    return SuccessResponse(
        message="インシデントが正常に解決されました",
        data={"incident_id": incident_id}
    )