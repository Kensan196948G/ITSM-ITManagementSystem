"""通知システムAPI"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.services.notification_service import NotificationService
from app.schemas.notification import (
    NotificationResponse,
    NotificationCreateRequest,
    NotificationUpdateRequest,
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate,
    NotificationChannelResponse,
    NotificationTemplateResponse,
    NotificationStatisticsResponse,
    BulkNotificationRequest,
)
from app.schemas.common import SuccessResponse, APIError
from app.api.v1.auth import get_current_user_id, require_permission

router = APIRouter()


@router.get(
    "/",
    response_model=Dict[str, Any],
    summary="通知一覧取得",
    description="ユーザーの通知一覧を取得します（ページネーション・フィルタリング対応）",
    responses={
        200: {"description": "通知一覧を正常に取得しました"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def list_notifications(
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(20, ge=1, le=100, description="1ページあたりの件数"),
    # フィルター
    is_read: Optional[bool] = Query(None, description="既読フィルター"),
    notification_type: Optional[str] = Query(None, description="通知タイプフィルター"),
    priority: Optional[str] = Query(
        None, pattern="^(low|medium|high|critical)$", description="優先度フィルター"
    ),
    channel: Optional[str] = Query(None, description="通知チャネルフィルター"),
    date_from: Optional[datetime] = Query(None, description="作成日時（開始）"),
    date_to: Optional[datetime] = Query(None, description="作成日時（終了）"),
    # ソート
    sort: Optional[str] = Query("-created_at", description="ソート順"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> Dict[str, Any]:
    """通知一覧を取得する"""
    service = NotificationService(db)
    return service.list_notifications(
        user_id=current_user_id,
        page=page,
        per_page=per_page,
        is_read=is_read,
        notification_type=notification_type,
        priority=priority,
        channel=channel,
        date_from=date_from,
        date_to=date_to,
        sort=sort,
    )


@router.get(
    "/unread-count",
    response_model=Dict[str, int],
    summary="未読通知数取得",
    description="ユーザーの未読通知数を取得します",
)
async def get_unread_count(
    db: Session = Depends(get_db), current_user_id: UUID = Depends(get_current_user_id)
) -> Dict[str, int]:
    """未読通知数を取得する"""
    service = NotificationService(db)
    return service.get_unread_count(current_user_id)


@router.get(
    "/{notification_id}",
    response_model=NotificationResponse,
    summary="通知詳細取得",
    description="指定された通知の詳細を取得します",
    responses={
        200: {"description": "通知詳細を正常に取得しました"},
        404: {"model": APIError, "description": "指定された通知が見つかりません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def get_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> NotificationResponse:
    """通知詳細を取得する"""
    service = NotificationService(db)
    return service.get_notification(notification_id, current_user_id)


@router.patch(
    "/{notification_id}/read",
    response_model=SuccessResponse,
    summary="通知既読化",
    description="指定された通知を既読にします",
)
async def mark_as_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> SuccessResponse:
    """通知を既読にする"""
    service = NotificationService(db)
    service.mark_as_read(notification_id, current_user_id)
    return SuccessResponse(
        message="通知を既読にしました", data={"notification_id": notification_id}
    )


@router.patch(
    "/{notification_id}/unread",
    response_model=SuccessResponse,
    summary="通知未読化",
    description="指定された通知を未読にします",
)
async def mark_as_unread(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> SuccessResponse:
    """通知を未読にする"""
    service = NotificationService(db)
    service.mark_as_unread(notification_id, current_user_id)
    return SuccessResponse(
        message="通知を未読にしました", data={"notification_id": notification_id}
    )


@router.patch(
    "/bulk/read",
    response_model=SuccessResponse,
    summary="一括既読化",
    description="複数の通知を一括で既読にします",
)
async def bulk_mark_as_read(
    notification_ids: List[UUID] = Query(..., description="通知ID一覧"),
    mark_all: bool = Query(False, description="全ての未読通知を既読にするか"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> SuccessResponse:
    """通知を一括で既読にする"""
    service = NotificationService(db)

    if mark_all:
        count = service.mark_all_as_read(current_user_id)
        return SuccessResponse(
            message=f"全ての未読通知（{count}件）を既読にしました",
            data={"marked_count": count},
        )
    else:
        count = service.bulk_mark_as_read(notification_ids, current_user_id)
        return SuccessResponse(
            message=f"{count}件の通知を既読にしました", data={"marked_count": count}
        )


@router.delete(
    "/{notification_id}",
    response_model=SuccessResponse,
    summary="通知削除",
    description="指定された通知を削除します",
)
async def delete_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> SuccessResponse:
    """通知を削除する"""
    service = NotificationService(db)
    service.delete_notification(notification_id, current_user_id)
    return SuccessResponse(
        message="通知を削除しました", data={"notification_id": notification_id}
    )


@router.delete(
    "/bulk/delete",
    response_model=SuccessResponse,
    summary="一括削除",
    description="複数の通知を一括削除します",
)
async def bulk_delete_notifications(
    notification_ids: List[UUID] = Query(..., description="通知ID一覧"),
    delete_read: bool = Query(False, description="既読通知をすべて削除するか"),
    older_than_days: Optional[int] = Query(
        None, ge=1, description="指定日数より古い通知を削除"
    ),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> SuccessResponse:
    """通知を一括削除する"""
    service = NotificationService(db)

    if delete_read:
        count = service.delete_read_notifications(current_user_id)
        return SuccessResponse(
            message=f"既読通知（{count}件）を削除しました",
            data={"deleted_count": count},
        )
    elif older_than_days:
        count = service.delete_old_notifications(current_user_id, older_than_days)
        return SuccessResponse(
            message=f"{older_than_days}日より古い通知（{count}件）を削除しました",
            data={"deleted_count": count},
        )
    else:
        count = service.bulk_delete_notifications(notification_ids, current_user_id)
        return SuccessResponse(
            message=f"{count}件の通知を削除しました", data={"deleted_count": count}
        )


@router.post(
    "/send",
    response_model=SuccessResponse,
    summary="通知送信",
    description="通知を送信します（管理者権限必要）",
    responses={
        201: {"description": "通知が正常に送信されました"},
        403: {"model": APIError, "description": "通知送信権限がありません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def send_notification(
    notification_data: NotificationCreateRequest,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("notifications", "send")),
) -> SuccessResponse:
    """通知を送信する"""
    service = NotificationService(db)
    notification = service.send_notification(notification_data, current_user_id)
    return SuccessResponse(
        message="通知を送信しました", data={"notification_id": notification.id}
    )


@router.post(
    "/bulk-send",
    response_model=SuccessResponse,
    summary="一括通知送信",
    description="複数の通知を一括送信します（管理者権限必要）",
)
async def bulk_send_notifications(
    bulk_request: BulkNotificationRequest,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("notifications", "send")),
) -> SuccessResponse:
    """通知を一括送信する"""
    service = NotificationService(db)
    sent_count = service.bulk_send_notifications(bulk_request, current_user_id)
    return SuccessResponse(
        message=f"{sent_count}件の通知を送信しました", data={"sent_count": sent_count}
    )


@router.get(
    "/preferences",
    response_model=NotificationPreferencesResponse,
    summary="通知設定取得",
    description="ユーザーの通知設定を取得します",
)
async def get_preferences(
    db: Session = Depends(get_db), current_user_id: UUID = Depends(get_current_user_id)
) -> NotificationPreferencesResponse:
    """通知設定を取得する"""
    service = NotificationService(db)
    return service.get_user_preferences(current_user_id)


@router.put(
    "/preferences",
    response_model=NotificationPreferencesResponse,
    summary="通知設定更新",
    description="ユーザーの通知設定を更新します",
)
async def update_preferences(
    preferences: NotificationPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> NotificationPreferencesResponse:
    """通知設定を更新する"""
    service = NotificationService(db)
    return service.update_user_preferences(current_user_id, preferences)


@router.get(
    "/channels",
    response_model=List[NotificationChannelResponse],
    summary="通知チャネル一覧取得",
    description="利用可能な通知チャネルの一覧を取得します",
)
async def list_channels(
    db: Session = Depends(get_db), current_user_id: UUID = Depends(get_current_user_id)
) -> List[NotificationChannelResponse]:
    """通知チャネル一覧を取得する"""
    service = NotificationService(db)
    return service.list_channels()


@router.get(
    "/templates",
    response_model=List[NotificationTemplateResponse],
    summary="通知テンプレート一覧取得",
    description="利用可能な通知テンプレートの一覧を取得します（管理者権限必要）",
)
async def list_templates(
    template_type: Optional[str] = Query(
        None, description="テンプレートタイプフィルター"
    ),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("notifications", "manage_templates")),
) -> List[NotificationTemplateResponse]:
    """通知テンプレート一覧を取得する"""
    service = NotificationService(db)
    return service.list_templates(template_type)


@router.get(
    "/statistics",
    response_model=NotificationStatisticsResponse,
    summary="通知統計取得",
    description="通知システムの統計情報を取得します（管理者権限必要）",
)
async def get_statistics(
    days: int = Query(30, ge=1, le=365, description="統計期間（日数）"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("notifications", "view_statistics")),
) -> NotificationStatisticsResponse:
    """通知統計を取得する"""
    service = NotificationService(db)
    return service.get_statistics(days)


@router.post(
    "/test-send",
    response_model=SuccessResponse,
    summary="テスト通知送信",
    description="テスト用の通知を送信します",
)
async def send_test_notification(
    channel: str = Query(..., description="テスト送信するチャネル"),
    message: str = Query("これはテスト通知です", description="テストメッセージ"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> SuccessResponse:
    """テスト通知を送信する"""
    service = NotificationService(db)
    service.send_test_notification(current_user_id, channel, message)
    return SuccessResponse(
        message="テスト通知を送信しました",
        data={"channel": channel, "message": message},
    )


@router.get(
    "/delivery-status/{notification_id}",
    response_model=Dict[str, Any],
    summary="配信状況取得",
    description="指定された通知の配信状況を取得します",
)
async def get_delivery_status(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> Dict[str, Any]:
    """通知の配信状況を取得する"""
    service = NotificationService(db)
    return service.get_delivery_status(notification_id, current_user_id)


@router.post(
    "/webhook/{channel}",
    response_model=SuccessResponse,
    summary="Webhook受信",
    description="外部サービスからのWebhook通知を受信します",
)
async def receive_webhook(
    channel: str, payload: Dict[str, Any], db: Session = Depends(get_db)
) -> SuccessResponse:
    """Webhook通知を受信して処理する"""
    service = NotificationService(db)
    processed = service.process_webhook(channel, payload)
    return SuccessResponse(
        message="Webhook通知を処理しました", data={"processed": processed}
    )
