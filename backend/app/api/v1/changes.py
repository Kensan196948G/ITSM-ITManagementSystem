"""変更管理API"""

from datetime import datetime, date
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.models.change import Change, ChangeApproval, ChangeTask
from app.schemas.change import (
    ChangeCreate, ChangeUpdate, ChangeResponse, 
    ChangeApprovalRequest, ChangeCalendarResponse, ChangeCalendarItem,
    ChangeTaskCreate, ChangeTaskResponse
)
from app.schemas.common import SuccessResponse, APIError

router = APIRouter()


def get_current_user_id() -> UUID:
    """現在のユーザーIDを取得する（仮実装）"""
    return UUID("12345678-1234-1234-1234-123456789012")


def get_user_tenant_id(user_id: UUID) -> UUID:
    """ユーザーのテナントIDを取得する（仮実装）"""
    return UUID("12345678-1234-1234-1234-123456789012")


@router.post(
    "/",
    response_model=ChangeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="RFC（変更要求）作成",
    description="新しい変更要求を作成します",
    responses={
        201: {"description": "変更要求が正常に作成されました"},
        400: {"model": APIError, "description": "リクエストデータが不正です"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def create_change(
    change_data: ChangeCreate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> ChangeResponse:
    """変更要求を作成する"""
    try:
        # 変更番号を生成
        from sqlalchemy import func
        
        today = datetime.now().strftime("%Y%m%d")
        count = db.query(func.count(Change.id)).filter(
            Change.change_number.like(f"CHG{today}%")
        ).scalar() or 0
        
        change_number = f"CHG{today}{count+1:04d}"
        
        # 変更要求を作成
        db_change = Change(
            change_number=change_number,
            tenant_id=get_user_tenant_id(current_user_id),
            title=change_data.title,
            type=change_data.type,
            description=change_data.description,
            justification=change_data.justification,
            risk_level=change_data.risk_level,
            implementation_plan=change_data.implementation_plan,
            rollback_plan=change_data.rollback_plan,
            test_plan=change_data.test_plan,
            scheduled_start=change_data.scheduled_start,
            scheduled_end=change_data.scheduled_end,
            requester_id=change_data.requester_id,
            implementer_id=change_data.implementer_id,
            cab_required="Y" if change_data.cab_required else "N"
        )
        
        db.add(db_change)
        db.commit()
        db.refresh(db_change)
        
        # 承認者を追加
        if change_data.approvers:
            for i, approver_id in enumerate(change_data.approvers, 1):
                approval = ChangeApproval(
                    change_id=db_change.id,
                    approver_id=approver_id,
                    approval_order=i
                )
                db.add(approval)
        
        db.commit()
        
        return ChangeResponse(
            id=db_change.id,
            change_number=db_change.change_number,
            title=db_change.title,
            type=db_change.type,
            description=db_change.description,
            justification=db_change.justification,
            status=db_change.status,
            risk_level=db_change.risk_level,
            implementation_plan=db_change.implementation_plan,
            rollback_plan=db_change.rollback_plan,
            test_plan=db_change.test_plan,
            scheduled_start=db_change.scheduled_start,
            scheduled_end=db_change.scheduled_end,
            implementer_id=db_change.implementer_id,
            cab_required=db_change.cab_required == "Y",
            requester={"id": db_change.requester_id, "display_name": "Requester User", "email": "requester@example.com"} if db_change.requester_id else None,
            implementer={"id": db_change.implementer_id, "display_name": "Implementer User", "email": "implementer@example.com"} if db_change.implementer_id else None,
            actual_start=db_change.actual_start,
            actual_end=db_change.actual_end,
            approvals=[],
            tasks=[],
            created_at=db_change.created_at,
            updated_at=db_change.updated_at
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="変更要求の作成中にエラーが発生しました"
        )


@router.get(
    "/",
    response_model=Dict[str, Any],
    summary="変更要求一覧取得",
    description="変更要求の一覧を取得します",
)
async def list_changes(
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(20, ge=1, le=100, description="1ページあたりの件数"),
    status: Optional[List[str]] = Query(None, description="ステータスフィルター"),
    type: Optional[List[str]] = Query(None, description="変更タイプフィルター"),
    risk_level: Optional[List[str]] = Query(None, description="リスクレベルフィルター"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """変更要求一覧を取得する"""
    try:
        query = db.query(Change).filter(
            Change.tenant_id == get_user_tenant_id(current_user_id)
        )
        
        # フィルター適用
        if status:
            query = query.filter(Change.status.in_(status))
        
        if type:
            query = query.filter(Change.type.in_(type))
        
        if risk_level:
            query = query.filter(Change.risk_level.in_(risk_level))
        
        # 総件数
        total_count = query.count()
        
        # ページネーション
        offset = (page - 1) * per_page
        changes = query.offset(offset).limit(per_page).all()
        
        # レスポンス構築
        change_list = []
        for change in changes:
            change_list.append(ChangeResponse(
                id=change.id,
                change_number=change.change_number,
                title=change.title,
                type=change.type,
                description=change.description,
                justification=change.justification,
                status=change.status,
                risk_level=change.risk_level,
                implementation_plan=change.implementation_plan,
                rollback_plan=change.rollback_plan,
                test_plan=change.test_plan,
                scheduled_start=change.scheduled_start,
                scheduled_end=change.scheduled_end,
                implementer_id=change.implementer_id,
                cab_required=change.cab_required == "Y",
                requester={"id": change.requester_id, "display_name": "Requester User", "email": "requester@example.com"} if change.requester_id else None,
                implementer={"id": change.implementer_id, "display_name": "Implementer User", "email": "implementer@example.com"} if change.implementer_id else None,
                actual_start=change.actual_start,
                actual_end=change.actual_end,
                approvals=[],
                tasks=[],
                created_at=change.created_at,
                updated_at=change.updated_at
            ))
        
        # メタ情報
        total_pages = (total_count + per_page - 1) // per_page
        meta = {
            "current_page": page,
            "total_pages": total_pages,
            "total_count": total_count,
            "per_page": per_page
        }
        
        return {
            "data": change_list,
            "meta": meta
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="変更要求一覧の取得中にエラーが発生しました"
        )


@router.get(
    "/{change_id}",
    response_model=ChangeResponse,
    summary="変更要求詳細取得",
    description="指定された変更要求の詳細情報を取得します",
)
async def get_change(
    change_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> ChangeResponse:
    """変更要求の詳細を取得する"""
    change = db.query(Change).filter(
        Change.id == change_id,
        Change.tenant_id == get_user_tenant_id(current_user_id)
    ).first()
    
    if not change:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された変更要求が見つかりません"
        )
    
    return ChangeResponse(
        id=change.id,
        change_number=change.change_number,
        title=change.title,
        type=change.type,
        description=change.description,
        justification=change.justification,
        status=change.status,
        risk_level=change.risk_level,
        implementation_plan=change.implementation_plan,
        rollback_plan=change.rollback_plan,
        test_plan=change.test_plan,
        scheduled_start=change.scheduled_start,
        scheduled_end=change.scheduled_end,
        implementer_id=change.implementer_id,
        cab_required=change.cab_required == "Y",
        requester={"id": change.requester_id, "display_name": "Requester User", "email": "requester@example.com"} if change.requester_id else None,
        implementer={"id": change.implementer_id, "display_name": "Implementer User", "email": "implementer@example.com"} if change.implementer_id else None,
        actual_start=change.actual_start,
        actual_end=change.actual_end,
        approvals=[],
        tasks=[],
        created_at=change.created_at,
        updated_at=change.updated_at
    )


@router.patch(
    "/{change_id}",
    response_model=ChangeResponse,
    summary="変更要求更新",
    description="指定された変更要求の情報を更新します",
)
async def update_change(
    change_id: UUID,
    change_data: ChangeUpdate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> ChangeResponse:
    """変更要求を更新する"""
    try:
        change = db.query(Change).filter(
            Change.id == change_id,
            Change.tenant_id == get_user_tenant_id(current_user_id)
        ).first()
        
        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="指定された変更要求が見つかりません"
            )
        
        # フィールドを更新
        update_data = change_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(change, field):
                setattr(change, field, value)
        
        db.commit()
        db.refresh(change)
        
        return ChangeResponse(
            id=change.id,
            change_number=change.change_number,
            title=change.title,
            type=change.type,
            description=change.description,
            justification=change.justification,
            status=change.status,
            risk_level=change.risk_level,
            implementation_plan=change.implementation_plan,
            rollback_plan=change.rollback_plan,
            test_plan=change.test_plan,
            scheduled_start=change.scheduled_start,
            scheduled_end=change.scheduled_end,
            implementer_id=change.implementer_id,
            cab_required=change.cab_required == "Y",
            requester={"id": change.requester_id, "display_name": "Requester User", "email": "requester@example.com"} if change.requester_id else None,
            implementer={"id": change.implementer_id, "display_name": "Implementer User", "email": "implementer@example.com"} if change.implementer_id else None,
            actual_start=change.actual_start,
            actual_end=change.actual_end,
            approvals=[],
            tasks=[],
            created_at=change.created_at,
            updated_at=change.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="変更要求の更新中にエラーが発生しました"
        )


@router.post(
    "/{change_id}/approve",
    response_model=SuccessResponse,
    summary="CAB承認処理",
    description="指定された変更要求の承認/拒否を行います",
)
async def approve_change(
    change_id: UUID,
    approval_data: ChangeApprovalRequest,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> SuccessResponse:
    """変更要求を承認/拒否する"""
    try:
        # 変更要求の存在確認
        change = db.query(Change).filter(
            Change.id == change_id,
            Change.tenant_id == get_user_tenant_id(current_user_id)
        ).first()
        
        if not change:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="指定された変更要求が見つかりません"
            )
        
        # 承認レコードを更新
        approval = db.query(ChangeApproval).filter(
            ChangeApproval.change_id == change_id,
            ChangeApproval.approver_id == current_user_id
        ).first()
        
        if not approval:
            # 新規承認レコードを作成
            approval = ChangeApproval(
                change_id=change_id,
                approver_id=current_user_id,
                approval_order=1
            )
            db.add(approval)
        
        approval.decision = approval_data.decision
        approval.comments = approval_data.comments
        approval.decided_at = datetime.now()
        
        # 承認された場合、変更要求のステータスを更新
        if approval_data.decision == "approved":
            change.status = "approved"
        elif approval_data.decision == "rejected":
            change.status = "rejected"
        
        db.commit()
        
        return SuccessResponse(
            message=f"変更要求が{approval_data.decision}されました",
            data={"change_id": change_id, "decision": approval_data.decision}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="承認処理中にエラーが発生しました"
        )


@router.get(
    "/calendar",
    response_model=ChangeCalendarResponse,
    summary="変更カレンダー取得",
    description="指定期間の変更要求カレンダーを取得します",
)
async def get_change_calendar(
    start_date: date = Query(..., description="開始日"),
    end_date: date = Query(..., description="終了日"),
    ci_ids: Optional[List[UUID]] = Query(None, description="CI絞り込み"),
    risk_levels: Optional[List[str]] = Query(None, description="リスクレベル絞り込み"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> ChangeCalendarResponse:
    """変更カレンダーを取得する"""
    try:
        query = db.query(Change).filter(
            Change.tenant_id == get_user_tenant_id(current_user_id),
            Change.scheduled_start >= start_date,
            Change.scheduled_end <= end_date
        )
        
        # フィルター適用
        if risk_levels:
            query = query.filter(Change.risk_level.in_(risk_levels))
        
        changes = query.all()
        
        # カレンダーアイテムを構築
        calendar_items = []
        for change in changes:
            calendar_items.append(ChangeCalendarItem(
                id=change.id,
                change_number=change.change_number,
                title=change.title,
                type=change.type,
                risk_level=change.risk_level,
                scheduled_start=change.scheduled_start,
                scheduled_end=change.scheduled_end,
                status=change.status,
                affected_services=[]  # 仮実装
            ))
        
        return ChangeCalendarResponse(data=calendar_items)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="変更カレンダーの取得中にエラーが発生しました"
        )