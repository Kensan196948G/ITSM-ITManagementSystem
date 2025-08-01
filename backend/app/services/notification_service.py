"""通知管理サービス"""

import json
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func
from fastapi import HTTPException, status

from app.models.notification import (
    Notification, NotificationPreference, NotificationChannel,
    NotificationTemplate, NotificationDelivery, NotificationType,
    NotificationPriority, DeliveryStatus
)
from app.schemas.notification import (
    NotificationResponse, NotificationCreateRequest, NotificationUpdateRequest,
    NotificationPreferencesResponse, NotificationPreferencesUpdate,
    NotificationChannelResponse, NotificationTemplateResponse,
    NotificationStatisticsResponse, BulkNotificationRequest
)
from app.schemas.common import PaginationMeta, PaginationLinks

logger = logging.getLogger(__name__)


class NotificationService:
    """通知管理サービスクラス"""

    def __init__(self, db: Session):
        self.db = db

    def list_notifications(
        self,
        user_id: UUID,
        page: int = 1,
        per_page: int = 20,
        is_read: Optional[bool] = None,
        notification_type: Optional[str] = None,
        priority: Optional[str] = None,
        channel: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        sort: Optional[str] = None
    ) -> Dict[str, Any]:
        """通知一覧を取得する"""
        try:
            # ベースクエリ
            query = self.db.query(Notification).filter(
                and_(
                    Notification.recipient_id == user_id,
                    Notification.deleted_at.is_(None)
                )
            )

            # フィルター適用
            if is_read is not None:
                query = query.filter(Notification.is_read == is_read)

            if notification_type:
                query = query.filter(Notification.notification_type == notification_type)

            if priority:
                query = query.filter(Notification.priority == priority)

            if channel:
                query = query.filter(Notification.channel == channel)

            if date_from:
                query = query.filter(Notification.created_at >= date_from)

            if date_to:
                query = query.filter(Notification.created_at <= date_to)

            # ソート
            if sort:
                if sort.startswith("-"):
                    field = sort[1:]
                    if hasattr(Notification, field):
                        query = query.order_by(desc(getattr(Notification, field)))
                else:
                    if hasattr(Notification, sort):
                        query = query.order_by(asc(getattr(Notification, sort)))
            else:
                query = query.order_by(desc(Notification.created_at))

            # 総件数を取得
            total_count = query.count()

            # ページネーション
            offset = (page - 1) * per_page
            notifications = query.offset(offset).limit(per_page).all()

            # レスポンス構築
            notification_list = [self._build_notification_response(notification) for notification in notifications]

            # メタ情報
            total_pages = (total_count + per_page - 1) // per_page
            meta = PaginationMeta(
                current_page=page,
                total_pages=total_pages,
                total_count=total_count,
                per_page=per_page
            )

            # サマリー情報
            summary = self._get_notification_summary(user_id)

            return {
                "data": notification_list,
                "meta": meta.model_dump(),
                "summary": summary
            }

        except Exception as e:
            logger.error(f"Error listing notifications: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="通知一覧の取得中にエラーが発生しました"
            )

    def get_unread_count(self, user_id: UUID) -> Dict[str, int]:
        """未読通知数を取得する"""
        try:
            total_unread = self.db.query(func.count(Notification.id)).filter(
                and_(
                    Notification.recipient_id == user_id,
                    Notification.is_read == False,
                    Notification.deleted_at.is_(None)
                )
            ).scalar() or 0

            # タイプ別未読数
            type_counts = self.db.query(
                Notification.notification_type,
                func.count(Notification.id).label('count')
            ).filter(
                and_(
                    Notification.recipient_id == user_id,
                    Notification.is_read == False,
                    Notification.deleted_at.is_(None)
                )
            ).group_by(Notification.notification_type).all()

            by_type = {row.notification_type: row.count for row in type_counts}

            # 優先度別未読数
            priority_counts = self.db.query(
                Notification.priority,
                func.count(Notification.id).label('count')
            ).filter(
                and_(
                    Notification.recipient_id == user_id,
                    Notification.is_read == False,
                    Notification.deleted_at.is_(None)
                )
            ).group_by(Notification.priority).all()

            by_priority = {row.priority.value: row.count for row in priority_counts}

            return {
                "total": total_unread,
                "by_type": by_type,
                "by_priority": by_priority
            }

        except Exception as e:
            logger.error(f"Error getting unread count: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="未読通知数の取得中にエラーが発生しました"
            )

    def get_notification(self, notification_id: UUID, user_id: UUID) -> NotificationResponse:
        """通知詳細を取得する"""
        notification = self._get_notification_by_id(notification_id, user_id)
        
        # 閲覧時に既読にする
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            self.db.commit()
        
        return self._build_notification_response(notification)

    def mark_as_read(self, notification_id: UUID, user_id: UUID):
        """通知を既読にする"""
        try:
            notification = self._get_notification_by_id(notification_id, user_id)
            
            if not notification.is_read:
                notification.is_read = True
                notification.read_at = datetime.utcnow()
                self.db.commit()
                
                logger.info(f"Notification marked as read: {notification_id} by user {user_id}")

        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error marking notification as read {notification_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="通知の既読化中にエラーが発生しました"
            )

    def mark_as_unread(self, notification_id: UUID, user_id: UUID):
        """通知を未読にする"""
        try:
            notification = self._get_notification_by_id(notification_id, user_id)
            
            if notification.is_read:
                notification.is_read = False
                notification.read_at = None
                self.db.commit()
                
                logger.info(f"Notification marked as unread: {notification_id} by user {user_id}")

        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error marking notification as unread {notification_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="通知の未読化中にエラーが発生しました"
            )

    def bulk_mark_as_read(self, notification_ids: List[UUID], user_id: UUID) -> int:
        """通知を一括で既読にする"""
        try:
            count = self.db.query(Notification).filter(
                and_(
                    Notification.id.in_(notification_ids),
                    Notification.recipient_id == user_id,
                    Notification.is_read == False,
                    Notification.deleted_at.is_(None)
                )
            ).update({
                "is_read": True,
                "read_at": datetime.utcnow()
            }, synchronize_session=False)
            
            self.db.commit()
            
            logger.info(f"Bulk marked {count} notifications as read by user {user_id}")
            return count

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error bulk marking notifications as read: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="通知の一括既読化中にエラーが発生しました"
            )

    def mark_all_as_read(self, user_id: UUID) -> int:
        """全ての未読通知を既読にする"""
        try:
            count = self.db.query(Notification).filter(
                and_(
                    Notification.recipient_id == user_id,
                    Notification.is_read == False,
                    Notification.deleted_at.is_(None)
                )
            ).update({
                "is_read": True,
                "read_at": datetime.utcnow()
            }, synchronize_session=False)
            
            self.db.commit()
            
            logger.info(f"All {count} notifications marked as read by user {user_id}")
            return count

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error marking all notifications as read: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="全通知の既読化中にエラーが発生しました"
            )

    def delete_notification(self, notification_id: UUID, user_id: UUID):
        """通知を削除する"""
        try:
            notification = self._get_notification_by_id(notification_id, user_id)
            
            # 論理削除
            notification.deleted_at = datetime.utcnow()
            self.db.commit()
            
            logger.info(f"Notification deleted: {notification_id} by user {user_id}")

        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting notification {notification_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="通知の削除中にエラーが発生しました"
            )

    def bulk_delete_notifications(self, notification_ids: List[UUID], user_id: UUID) -> int:
        """通知を一括削除する"""
        try:
            count = self.db.query(Notification).filter(
                and_(
                    Notification.id.in_(notification_ids),
                    Notification.recipient_id == user_id,
                    Notification.deleted_at.is_(None)
                )
            ).update({
                "deleted_at": datetime.utcnow()
            }, synchronize_session=False)
            
            self.db.commit()
            
            logger.info(f"Bulk deleted {count} notifications by user {user_id}")
            return count

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error bulk deleting notifications: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="通知の一括削除中にエラーが発生しました"
            )

    def delete_read_notifications(self, user_id: UUID) -> int:
        """既読通知をすべて削除する"""
        try:
            count = self.db.query(Notification).filter(
                and_(
                    Notification.recipient_id == user_id,
                    Notification.is_read == True,
                    Notification.deleted_at.is_(None)
                )
            ).update({
                "deleted_at": datetime.utcnow()
            }, synchronize_session=False)
            
            self.db.commit()
            
            logger.info(f"Deleted {count} read notifications by user {user_id}")
            return count

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting read notifications: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="既読通知の削除中にエラーが発生しました"
            )

    def delete_old_notifications(self, user_id: UUID, days: int) -> int:
        """指定日数より古い通知を削除する"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            count = self.db.query(Notification).filter(
                and_(
                    Notification.recipient_id == user_id,
                    Notification.created_at < cutoff_date,
                    Notification.deleted_at.is_(None)
                )
            ).update({
                "deleted_at": datetime.utcnow()
            }, synchronize_session=False)
            
            self.db.commit()
            
            logger.info(f"Deleted {count} old notifications (>{days} days) by user {user_id}")
            return count

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting old notifications: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="古い通知の削除中にエラーが発生しました"
            )

    def send_notification(self, notification_data: NotificationCreateRequest, sender_id: UUID) -> Notification:
        """通知を送信する"""
        try:
            # 通知を作成
            notification = Notification(
                recipient_id=notification_data.recipient_id,
                sender_id=sender_id,
                notification_type=notification_data.notification_type,
                channel=notification_data.channel,
                priority=notification_data.priority,
                title=notification_data.title,
                message=notification_data.message,
                data=json.dumps(notification_data.data) if notification_data.data else None,
                action_url=notification_data.action_url,
                expires_at=notification_data.expires_at
            )

            self.db.add(notification)
            self.db.commit()
            self.db.refresh(notification)

            # 非同期で実際の配信処理を実行
            asyncio.create_task(self._deliver_notification(notification))

            logger.info(f"Notification created: {notification.id} from {sender_id} to {notification_data.recipient_id}")
            
            return notification

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error sending notification: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="通知の送信中にエラーが発生しました"
            )

    def bulk_send_notifications(self, bulk_request: BulkNotificationRequest, sender_id: UUID) -> int:
        """通知を一括送信する"""
        try:
            sent_count = 0
            
            for recipient_id in bulk_request.recipient_ids:
                try:
                    notification_data = NotificationCreateRequest(
                        recipient_id=recipient_id,
                        notification_type=bulk_request.notification_type,
                        channel=bulk_request.channel,
                        priority=bulk_request.priority,
                        title=bulk_request.title,
                        message=bulk_request.message,
                        data=bulk_request.data,
                        action_url=bulk_request.action_url,
                        expires_at=bulk_request.expires_at
                    )
                    
                    self.send_notification(notification_data, sender_id)
                    sent_count += 1
                    
                except Exception as e:
                    logger.warning(f"Failed to send notification to {recipient_id}: {str(e)}")
                    continue

            return sent_count

        except Exception as e:
            logger.error(f"Error bulk sending notifications: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="通知の一括送信中にエラーが発生しました"
            )

    def get_user_preferences(self, user_id: UUID) -> NotificationPreferencesResponse:
        """ユーザーの通知設定を取得する"""
        try:
            preferences = self.db.query(NotificationPreference).filter(
                NotificationPreference.user_id == user_id
            ).all()

            # デフォルト設定を含めた完全な設定を構築
            pref_dict = {}
            for pref in preferences:
                if pref.notification_type not in pref_dict:
                    pref_dict[pref.notification_type] = {}
                pref_dict[pref.notification_type][pref.channel] = {
                    "enabled": pref.enabled,
                    "quiet_hours_start": pref.quiet_hours_start,
                    "quiet_hours_end": pref.quiet_hours_end
                }

            return NotificationPreferencesResponse(
                user_id=user_id,
                preferences=pref_dict,
                global_settings={
                    "enabled": True,
                    "quiet_hours_enabled": True,
                    "digest_frequency": "daily"
                }
            )

        except Exception as e:
            logger.error(f"Error getting user preferences: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="通知設定の取得中にエラーが発生しました"
            )

    def update_user_preferences(self, user_id: UUID, preferences: NotificationPreferencesUpdate) -> NotificationPreferencesResponse:
        """ユーザーの通知設定を更新する"""
        try:
            # 既存設定をクリア
            self.db.query(NotificationPreference).filter(
                NotificationPreference.user_id == user_id
            ).delete()

            # 新しい設定を保存
            for notification_type, channels in preferences.preferences.items():
                for channel, settings in channels.items():
                    pref = NotificationPreference(
                        user_id=user_id,
                        notification_type=notification_type,
                        channel=channel,
                        enabled=settings.get("enabled", True),
                        quiet_hours_start=settings.get("quiet_hours_start"),
                        quiet_hours_end=settings.get("quiet_hours_end")
                    )
                    self.db.add(pref)

            self.db.commit()

            logger.info(f"Updated notification preferences for user {user_id}")
            
            return self.get_user_preferences(user_id)

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating user preferences: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="通知設定の更新中にエラーが発生しました"
            )

    def list_channels(self) -> List[NotificationChannelResponse]:
        """通知チャネル一覧を取得する"""
        try:
            channels = self.db.query(NotificationChannel).filter(
                NotificationChannel.is_active == True
            ).order_by(NotificationChannel.name).all()

            return [
                NotificationChannelResponse(
                    id=channel.id,
                    name=channel.name,
                    display_name=channel.display_name,
                    description=channel.description,
                    is_active=channel.is_active,
                    configuration=json.loads(channel.configuration) if channel.configuration else {},
                    supported_types=channel.supported_types.split(",") if channel.supported_types else []
                )
                for channel in channels
            ]

        except Exception as e:
            logger.error(f"Error listing channels: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="通知チャネル一覧の取得中にエラーが発生しました"
            )

    def list_templates(self, template_type: Optional[str] = None) -> List[NotificationTemplateResponse]:
        """通知テンプレート一覧を取得する"""
        try:
            query = self.db.query(NotificationTemplate).filter(
                NotificationTemplate.is_active == True
            )

            if template_type:
                query = query.filter(NotificationTemplate.notification_type == template_type)

            templates = query.order_by(NotificationTemplate.name).all()

            return [
                NotificationTemplateResponse(
                    id=template.id,
                    name=template.name,
                    display_name=template.display_name,
                    notification_type=template.notification_type,
                    channel=template.channel,
                    subject_template=template.subject_template,
                    body_template=template.body_template,
                    variables=template.variables.split(",") if template.variables else [],
                    is_active=template.is_active
                )
                for template in templates
            ]

        except Exception as e:
            logger.error(f"Error listing templates: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="通知テンプレート一覧の取得中にエラーが発生しました"
            )

    def get_statistics(self, days: int) -> NotificationStatisticsResponse:
        """通知統計を取得する"""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)

            # 基本統計
            total_sent = self.db.query(func.count(Notification.id)).filter(
                Notification.created_at >= start_date
            ).scalar() or 0

            total_delivered = self.db.query(func.count(NotificationDelivery.id)).filter(
                and_(
                    NotificationDelivery.created_at >= start_date,
                    NotificationDelivery.status == DeliveryStatus.DELIVERED
                )
            ).scalar() or 0

            # タイプ別統計
            type_stats = self.db.query(
                Notification.notification_type,
                func.count(Notification.id).label('count')
            ).filter(
                Notification.created_at >= start_date
            ).group_by(Notification.notification_type).all()

            # チャネル別統計
            channel_stats = self.db.query(
                Notification.channel,
                func.count(Notification.id).label('count')
            ).filter(
                Notification.created_at >= start_date
            ).group_by(Notification.channel).all()

            return NotificationStatisticsResponse(
                period_days=days,
                total_sent=total_sent,
                total_delivered=total_delivered,
                delivery_rate=(total_delivered / total_sent * 100) if total_sent > 0 else 0,
                by_type={stat.notification_type: stat.count for stat in type_stats},
                by_channel={stat.channel: stat.count for stat in channel_stats},
                daily_stats=self._get_daily_stats(start_date, end_date)
            )

        except Exception as e:
            logger.error(f"Error getting statistics: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="通知統計の取得中にエラーが発生しました"
            )

    def send_test_notification(self, user_id: UUID, channel: str, message: str):
        """テスト通知を送信する"""
        try:
            notification_data = NotificationCreateRequest(
                recipient_id=user_id,
                notification_type=NotificationType.SYSTEM,
                channel=channel,
                priority=NotificationPriority.LOW,
                title="テスト通知",
                message=message,
                data={"test": True}
            )

            self.send_notification(notification_data, user_id)
            
            logger.info(f"Test notification sent to user {user_id} via {channel}")

        except Exception as e:
            logger.error(f"Error sending test notification: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="テスト通知の送信中にエラーが発生しました"
            )

    def get_delivery_status(self, notification_id: UUID, user_id: UUID) -> Dict[str, Any]:
        """通知の配信状況を取得する"""
        try:
            notification = self._get_notification_by_id(notification_id, user_id)
            
            deliveries = self.db.query(NotificationDelivery).filter(
                NotificationDelivery.notification_id == notification_id
            ).all()

            delivery_details = []
            for delivery in deliveries:
                delivery_details.append({
                    "channel": delivery.channel,
                    "status": delivery.status.value,
                    "sent_at": delivery.sent_at.isoformat() if delivery.sent_at else None,
                    "delivered_at": delivery.delivered_at.isoformat() if delivery.delivered_at else None,
                    "error_message": delivery.error_message,
                    "retry_count": delivery.retry_count
                })

            return {
                "notification_id": notification_id,
                "overall_status": self._calculate_overall_status(deliveries),
                "deliveries": delivery_details,
                "created_at": notification.created_at.isoformat(),
                "expires_at": notification.expires_at.isoformat() if notification.expires_at else None
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting delivery status: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="配信状況の取得中にエラーが発生しました"
            )

    def process_webhook(self, channel: str, payload: Dict[str, Any]) -> bool:
        """Webhook通知を処理する"""
        try:
            # チャネル別のWebhook処理
            if channel == "slack":
                return self._process_slack_webhook(payload)
            elif channel == "teams":
                return self._process_teams_webhook(payload)
            elif channel == "email":
                return self._process_email_webhook(payload)
            else:
                logger.warning(f"Unknown webhook channel: {channel}")
                return False

        except Exception as e:
            logger.error(f"Error processing webhook for {channel}: {str(e)}")
            return False

    async def _deliver_notification(self, notification: Notification):
        """通知を実際に配信する（非同期処理）"""
        try:
            # 配信記録を作成
            delivery = NotificationDelivery(
                notification_id=notification.id,
                channel=notification.channel,
                status=DeliveryStatus.PENDING,
                sent_at=datetime.utcnow()
            )
            
            self.db.add(delivery)
            self.db.commit()

            # チャネル別配信処理
            success = False
            error_message = None

            try:
                if notification.channel == "email":
                    success = await self._send_email(notification)
                elif notification.channel == "sms":
                    success = await self._send_sms(notification)
                elif notification.channel == "push":
                    success = await self._send_push(notification)
                elif notification.channel == "slack":
                    success = await self._send_slack(notification)
                elif notification.channel == "teams":
                    success = await self._send_teams(notification)
                else:
                    success = True  # 内部通知のみ

            except Exception as e:
                success = False
                error_message = str(e)

            # 配信結果を更新
            delivery.status = DeliveryStatus.DELIVERED if success else DeliveryStatus.FAILED
            delivery.delivered_at = datetime.utcnow() if success else None
            delivery.error_message = error_message
            
            self.db.commit()

            logger.info(f"Notification delivery {delivery.status.value}: {notification.id}")

        except Exception as e:
            logger.error(f"Error in notification delivery: {str(e)}")

    async def _send_email(self, notification: Notification) -> bool:
        """メール通知を送信する"""
        # 実際の実装では、メール送信サービス（SendGrid、SES等）を使用
        logger.info(f"Sending email notification: {notification.id}")
        return True

    async def _send_sms(self, notification: Notification) -> bool:
        """SMS通知を送信する"""
        # 実際の実装では、SMS送信サービス（Twilio等）を使用
        logger.info(f"Sending SMS notification: {notification.id}")
        return True

    async def _send_push(self, notification: Notification) -> bool:
        """プッシュ通知を送信する"""
        # 実際の実装では、プッシュ通知サービス（FCM等）を使用
        logger.info(f"Sending push notification: {notification.id}")
        return True

    async def _send_slack(self, notification: Notification) -> bool:
        """Slack通知を送信する"""
        # 実際の実装では、Slack APIを使用
        logger.info(f"Sending Slack notification: {notification.id}")
        return True

    async def _send_teams(self, notification: Notification) -> bool:
        """Teams通知を送信する"""
        # 実際の実装では、Teams APIを使用
        logger.info(f"Sending Teams notification: {notification.id}")
        return True

    def _get_notification_by_id(self, notification_id: UUID, user_id: UUID) -> Notification:
        """IDで通知を取得する（権限チェック付き）"""
        notification = self.db.query(Notification).filter(
            and_(
                Notification.id == notification_id,
                Notification.recipient_id == user_id,
                Notification.deleted_at.is_(None)
            )
        ).first()

        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="指定された通知が見つかりません"
            )

        return notification

    def _build_notification_response(self, notification: Notification) -> NotificationResponse:
        """通知レスポンスを構築する"""
        return NotificationResponse(
            id=notification.id,
            recipient_id=notification.recipient_id,
            sender_id=notification.sender_id,
            notification_type=notification.notification_type,
            channel=notification.channel,
            priority=notification.priority,
            title=notification.title,
            message=notification.message,
            data=json.loads(notification.data) if notification.data else None,
            action_url=notification.action_url,
            is_read=notification.is_read,
            read_at=notification.read_at,
            expires_at=notification.expires_at,
            created_at=notification.created_at
        )

    def _get_notification_summary(self, user_id: UUID) -> Dict[str, Any]:
        """通知サマリーを取得する"""
        total = self.db.query(func.count(Notification.id)).filter(
            and_(
                Notification.recipient_id == user_id,
                Notification.deleted_at.is_(None)
            )
        ).scalar() or 0

        unread = self.db.query(func.count(Notification.id)).filter(
            and_(
                Notification.recipient_id == user_id,
                Notification.is_read == False,
                Notification.deleted_at.is_(None)
            )
        ).scalar() or 0

        today = datetime.now().date()
        today_count = self.db.query(func.count(Notification.id)).filter(
            and_(
                Notification.recipient_id == user_id,
                func.date(Notification.created_at) == today,
                Notification.deleted_at.is_(None)
            )
        ).scalar() or 0

        return {
            "total": total,
            "unread": unread,
            "today": today_count
        }

    def _get_daily_stats(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """日別統計を取得する"""
        daily_stats = []
        current_date = start_date.date()
        end_date_date = end_date.date()

        while current_date <= end_date_date:
            sent_count = self.db.query(func.count(Notification.id)).filter(
                func.date(Notification.created_at) == current_date
            ).scalar() or 0

            delivered_count = self.db.query(func.count(NotificationDelivery.id)).filter(
                and_(
                    func.date(NotificationDelivery.sent_at) == current_date,
                    NotificationDelivery.status == DeliveryStatus.DELIVERED
                )
            ).scalar() or 0

            daily_stats.append({
                "date": current_date.isoformat(),
                "sent": sent_count,
                "delivered": delivered_count
            })

            current_date += timedelta(days=1)

        return daily_stats

    def _calculate_overall_status(self, deliveries: List[NotificationDelivery]) -> str:
        """配信の全体ステータスを計算する"""
        if not deliveries:
            return "pending"

        statuses = [delivery.status for delivery in deliveries]
        
        if all(status == DeliveryStatus.DELIVERED for status in statuses):
            return "delivered"
        elif all(status == DeliveryStatus.FAILED for status in statuses):
            return "failed"
        elif any(status == DeliveryStatus.DELIVERED for status in statuses):
            return "partial"
        else:
            return "pending"

    def _process_slack_webhook(self, payload: Dict[str, Any]) -> bool:
        """Slack Webhookを処理する"""
        # Slack固有の処理
        logger.info(f"Processing Slack webhook: {payload}")
        return True

    def _process_teams_webhook(self, payload: Dict[str, Any]) -> bool:
        """Teams Webhookを処理する"""
        # Teams固有の処理
        logger.info(f"Processing Teams webhook: {payload}")
        return True

    def _process_email_webhook(self, payload: Dict[str, Any]) -> bool:
        """Email Webhookを処理する"""
        # Email固有の処理（配信状況通知等）
        logger.info(f"Processing Email webhook: {payload}")
        return True