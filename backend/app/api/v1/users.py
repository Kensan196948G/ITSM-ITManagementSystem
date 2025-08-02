"""ユーザー管理API"""

from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.services.user_service import UserService
from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse, UserListResponse,
    UserRoleUpdate, UserPermissionResponse, UserDetailResponse,
    UserActivityResponse, AssignedTicketInfo
)
from app.schemas.common import SuccessResponse, APIError
from app.api.v1.auth import get_current_user_id, require_permission

router = APIRouter()


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="ユーザー作成",
    description="新しいユーザーを作成します",
    responses={
        201: {"description": "ユーザーが正常に作成されました"},
        400: {"model": APIError, "description": "リクエストデータが不正です"},
        403: {"model": APIError, "description": "ユーザー作成権限がありません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("users", "create"))
) -> UserResponse:
    """ユーザーを作成する"""
    service = UserService(db)
    return service.create_user(user_data, current_user_id)


@router.get(
    "/",
    response_model=UserListResponse,
    summary="ユーザー一覧取得",
    description="ユーザーの一覧を取得します（フィルター・ページネーション対応）",
    responses={
        200: {"description": "ユーザー一覧を正常に取得しました"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def list_users(
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(20, ge=1, le=100, description="1ページあたりの件数"),
    # フィルター
    role: Optional[List[str]] = Query(None, description="ロールフィルター"),
    department: Optional[str] = Query(None, description="部署フィルター"),
    is_active: Optional[bool] = Query(None, description="アクティブ状態フィルター"),
    location: Optional[str] = Query(None, description="勤務地フィルター"),
    # 検索
    q: Optional[str] = Query(None, description="フリーワード検索（名前・メール）"),
    sort: Optional[str] = Query(None, description="ソート順（例: -created_at）"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("users", "read"))
) -> UserListResponse:
    """ユーザー一覧を取得する"""
    service = UserService(db)
    return service.list_users(
        current_user_id=current_user_id,
        page=page,
        per_page=per_page,
        role=role,
        department=department,
        is_active=is_active,
        location=location,
        q=q,
        sort=sort
    )


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="ユーザー詳細取得",
    description="指定されたユーザーの詳細情報を取得します",
    responses={
        200: {"description": "ユーザー詳細を正常に取得しました"},
        404: {"model": APIError, "description": "指定されたユーザーが見つかりません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("users", "read"))
) -> UserResponse:
    """ユーザーの詳細を取得する"""
    service = UserService(db)
    return service.get_user(user_id, current_user_id)


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="ユーザー情報更新",
    description="指定されたユーザーの情報を更新します",
    responses={
        200: {"description": "ユーザー情報が正常に更新されました"},
        400: {"model": APIError, "description": "リクエストデータが不正です"},
        404: {"model": APIError, "description": "指定されたユーザーが見つかりません"},
        403: {"model": APIError, "description": "ユーザー更新権限がありません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("users", "update"))
) -> UserResponse:
    """ユーザー情報を更新する"""
    service = UserService(db)
    return service.update_user(user_id, user_data, current_user_id)


@router.delete(
    "/{user_id}",
    response_model=SuccessResponse,
    summary="ユーザー削除",
    description="指定されたユーザーを削除します（論理削除）",
    responses={
        200: {"description": "ユーザーが正常に削除されました"},
        404: {"model": APIError, "description": "指定されたユーザーが見つかりません"},
        403: {"model": APIError, "description": "ユーザー削除権限がありません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("users", "delete"))
) -> SuccessResponse:
    """ユーザーを削除する"""
    service = UserService(db)
    service.delete_user(user_id, current_user_id)
    return SuccessResponse(
        message="ユーザーが正常に削除されました",
        data={"user_id": user_id}
    )


@router.post(
    "/{user_id}/activate",
    response_model=SuccessResponse,
    summary="ユーザーアクティベート",
    description="指定されたユーザーをアクティブ状態にします",
    responses={
        200: {"description": "ユーザーが正常にアクティベートされました"},
        404: {"model": APIError, "description": "指定されたユーザーが見つかりません"},
        403: {"model": APIError, "description": "ユーザー管理権限がありません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def activate_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("users", "update"))
) -> SuccessResponse:
    """ユーザーをアクティベートする"""
    service = UserService(db)
    service.activate_user(user_id, current_user_id)
    return SuccessResponse(
        message="ユーザーが正常にアクティベートされました",
        data={"user_id": user_id}
    )


@router.post(
    "/{user_id}/deactivate",
    response_model=SuccessResponse,
    summary="ユーザー無効化",
    description="指定されたユーザーを無効状態にします",
    responses={
        200: {"description": "ユーザーが正常に無効化されました"},
        404: {"model": APIError, "description": "指定されたユーザーが見つかりません"},
        403: {"model": APIError, "description": "ユーザー管理権限がありません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def deactivate_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("users", "update"))
) -> SuccessResponse:
    """ユーザーを無効化する"""
    service = UserService(db)
    service.deactivate_user(user_id, current_user_id)
    return SuccessResponse(
        message="ユーザーが正常に無効化されました",
        data={"user_id": user_id}
    )


@router.put(
    "/{user_id}/role",
    response_model=UserResponse,
    summary="ユーザーロール変更",
    description="指定されたユーザーのロールを変更します",
    responses={
        200: {"description": "ユーザーロールが正常に変更されました"},
        400: {"model": APIError, "description": "リクエストデータが不正です"},
        404: {"model": APIError, "description": "指定されたユーザーが見つかりません"},
        403: {"model": APIError, "description": "ロール変更権限がありません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def update_user_role(
    user_id: UUID,
    role_data: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("users", "update_role"))
) -> UserResponse:
    """ユーザーのロールを変更する"""
    service = UserService(db)
    return service.update_user_role(user_id, role_data, current_user_id)


@router.get(
    "/{user_id}/permissions",
    response_model=UserPermissionResponse,
    summary="ユーザー権限取得",
    description="指定されたユーザーの権限情報を取得します",
    responses={
        200: {"description": "ユーザー権限を正常に取得しました"},
        404: {"model": APIError, "description": "指定されたユーザーが見つかりません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def get_user_permissions(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("users", "read"))
) -> UserPermissionResponse:
    """ユーザーの権限情報を取得する"""
    service = UserService(db)
    return service.get_user_permissions(user_id, current_user_id)


@router.post(
    "/{user_id}/reset-password",
    response_model=SuccessResponse,
    summary="パスワードリセット",
    description="指定されたユーザーのパスワードをリセットします",
    responses={
        200: {"description": "パスワードが正常にリセットされました"},
        404: {"model": APIError, "description": "指定されたユーザーが見つかりません"},
        403: {"model": APIError, "description": "パスワードリセット権限がありません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def reset_user_password(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("users", "reset_password"))
) -> SuccessResponse:
    """ユーザーのパスワードをリセットする"""
    service = UserService(db)
    temporary_password = service.reset_user_password(user_id, current_user_id)
    return SuccessResponse(
        message="パスワードが正常にリセットされました",
        data={
            "user_id": user_id,
            "temporary_password": temporary_password,
            "expires_at": "24時間後に失効します"
        }
    )


@router.get(
    "/{user_id}/performance",
    response_model=Dict[str, Any],
    summary="ユーザーパフォーマンス取得",
    description="指定されたユーザーのパフォーマンス統計を取得します",
    responses={
        200: {"description": "パフォーマンス統計を正常に取得しました"},
        404: {"model": APIError, "description": "指定されたユーザーが見つかりません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def get_user_performance(
    user_id: UUID,
    days: int = Query(30, ge=1, le=365, description="過去何日間のデータを取得するか"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("users", "read"))
) -> Dict[str, Any]:
    """ユーザーのパフォーマンス統計を取得する"""
    service = UserService(db)
    return service.get_user_performance(user_id, current_user_id, days)


@router.get(
    "/roles/list",
    response_model=List[Dict[str, Any]],
    summary="利用可能ロール一覧取得",
    description="システムで利用可能なロール一覧を取得します"
)
async def list_available_roles(
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> List[Dict[str, Any]]:
    """利用可能なロール一覧を取得する"""
    service = UserService(db)
    return service.get_available_roles()


@router.get(
    "/departments/list",
    response_model=List[Dict[str, Any]],
    summary="部署一覧取得",
    description="システムで利用可能な部署一覧を取得します"
)
async def list_departments(
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> List[Dict[str, Any]]:
    """部署一覧を取得する"""
    service = UserService(db)
    return service.get_departments()


@router.get(
    "/{user_id}/detail",
    response_model=UserDetailResponse,
    summary="ユーザー詳細情報取得（詳細パネル用）",
    description="詳細パネル表示のための統合されたユーザー詳細情報を取得します",
    responses={
        200: {"description": "ユーザー詳細情報を正常に取得しました"},
        404: {"model": APIError, "description": "指定されたユーザーが見つかりません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def get_user_detail(
    user_id: UUID,
    include_tickets: bool = Query(True, description="担当チケットを含むか"),
    include_performance: bool = Query(True, description="パフォーマンス統計を含むか"),
    include_activities: bool = Query(True, description="最近の活動を含むか"),
    include_team_info: bool = Query(True, description="チーム情報を含むか"),
    ticket_limit: int = Query(10, ge=1, le=50, description="取得するチケット数"),
    activity_limit: int = Query(10, ge=1, le=50, description="取得する活動数"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("users", "read"))
) -> UserDetailResponse:
    """詳細パネル用のユーザー詳細情報を取得する"""
    service = UserService(db)
    return service.get_user_detail(
        user_id=user_id,
        current_user_id=current_user_id,
        include_tickets=include_tickets,
        include_performance=include_performance,
        include_activities=include_activities,
        include_team_info=include_team_info,
        ticket_limit=ticket_limit,
        activity_limit=activity_limit
    )


@router.get(
    "/{user_id}/assigned-tickets",
    response_model=List[AssignedTicketInfo],
    summary="ユーザー担当チケット一覧取得",
    description="指定されたユーザーが担当するチケット一覧を取得します",
    responses={
        200: {"description": "担当チケット一覧を正常に取得しました"},
        404: {"model": APIError, "description": "指定されたユーザーが見つかりません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def get_user_assigned_tickets(
    user_id: UUID,
    status_filter: Optional[List[str]] = Query(None, description="ステータスフィルター"),
    priority_filter: Optional[List[str]] = Query(None, description="優先度フィルター"),
    limit: int = Query(20, ge=1, le=100, description="取得件数"),
    offset: int = Query(0, ge=0, description="オフセット"),
    include_overdue_only: bool = Query(False, description="期限超過のみ取得"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("users", "read"))
) -> List[AssignedTicketInfo]:
    """ユーザーの担当チケット一覧を取得する"""
    service = UserService(db)
    return service.get_user_assigned_tickets(
        user_id=user_id,
        current_user_id=current_user_id,
        status_filter=status_filter,
        priority_filter=priority_filter,
        limit=limit,
        offset=offset,
        include_overdue_only=include_overdue_only
    )


@router.get(
    "/{user_id}/activities",
    response_model=UserActivityResponse,
    summary="ユーザー活動履歴取得",
    description="指定されたユーザーの活動履歴を取得します",
    responses={
        200: {"description": "活動履歴を正常に取得しました"},
        404: {"model": APIError, "description": "指定されたユーザーが見つかりません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def get_user_activities(
    user_id: UUID,
    activity_types: Optional[List[str]] = Query(None, description="活動タイプフィルター"),
    date_from: Optional[datetime] = Query(None, description="開始日時"),
    date_to: Optional[datetime] = Query(None, description="終了日時"),
    limit: int = Query(50, ge=1, le=200, description="取得件数"),
    offset: int = Query(0, ge=0, description="オフセット"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("users", "read"))
) -> UserActivityResponse:
    """ユーザーの活動履歴を取得する"""
    service = UserService(db)
    return service.get_user_activities(
        user_id=user_id,
        current_user_id=current_user_id,
        activity_types=activity_types,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset
    )


@router.get(
    "/{user_id}/team-members",
    response_model=List[Dict[str, Any]],
    summary="チームメンバー取得",
    description="指定されたユーザーと同じチームのメンバー一覧を取得します",
    responses={
        200: {"description": "チームメンバー一覧を正常に取得しました"},
        404: {"model": APIError, "description": "指定されたユーザーが見つかりません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def get_team_members(
    user_id: UUID,
    include_performance: bool = Query(False, description="パフォーマンス統計を含むか"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("users", "read"))
) -> List[Dict[str, Any]]:
    """ユーザーのチームメンバーを取得する"""
    service = UserService(db)
    return service.get_team_members(
        user_id=user_id,
        current_user_id=current_user_id,
        include_performance=include_performance
    )


@router.get(
    "/{user_id}/subordinates",
    response_model=List[Dict[str, Any]],
    summary="部下一覧取得",
    description="指定されたユーザーの部下一覧を取得します",
    responses={
        200: {"description": "部下一覧を正常に取得しました"},
        404: {"model": APIError, "description": "指定されたユーザーが見つかりません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def get_subordinates(
    user_id: UUID,
    include_performance: bool = Query(False, description="パフォーマンス統計を含むか"),
    recursive: bool = Query(False, description="階層的に部下を取得するか"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("users", "read"))
) -> List[Dict[str, Any]]:
    """ユーザーの部下一覧を取得する"""
    service = UserService(db)
    return service.get_subordinates(
        user_id=user_id,
        current_user_id=current_user_id,
        include_performance=include_performance,
        recursive=recursive
    )


@router.get(
    "/{user_id}/workload",
    response_model=Dict[str, Any],
    summary="ユーザーワークロード取得",
    description="指定されたユーザーの現在のワークロード情報を取得します",
    responses={
        200: {"description": "ワークロード情報を正常に取得しました"},
        404: {"model": APIError, "description": "指定されたユーザーが見つかりません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def get_user_workload(
    user_id: UUID,
    include_predictions: bool = Query(False, description="予測情報を含むか"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("users", "read"))
) -> Dict[str, Any]:
    """ユーザーのワークロード情報を取得する"""
    service = UserService(db)
    return service.get_user_workload(
        user_id=user_id,
        current_user_id=current_user_id,
        include_predictions=include_predictions
    )