"""ユーザー管理サービス"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from uuid import UUID
import secrets
import string
import logging

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func
from fastapi import HTTPException, status
from passlib.context import CryptContext

from app.models.user import User, UserRole
from app.models.incident import Incident, IncidentStatus
from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse, UserListResponse,
    UserRoleUpdate, UserPermissionResponse
)
from app.schemas.common import PaginationMeta, PaginationLinks

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserService:
    """ユーザー管理サービスクラス"""

    def __init__(self, db: Session):
        self.db = db

    def create_user(self, user_data: UserCreate, current_user_id: UUID) -> UserResponse:
        """ユーザーを作成する"""
        try:
            # メールアドレスの重複チェック
            existing_user = self.db.query(User).filter(
                and_(
                    User.email == user_data.email,
                    User.deleted_at.is_(None)
                )
            ).first()
            
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="指定されたメールアドレスは既に使用されています"
                )
            
            # パスワードハッシュ化
            hashed_password = pwd_context.hash(user_data.password)
            
            # ユーザーを作成
            db_user = User(
                tenant_id=self._get_user_tenant_id(current_user_id),
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                email=user_data.email,
                phone=user_data.phone,
                department=user_data.department,
                role=user_data.role,
                manager_id=user_data.manager_id,
                location=user_data.location,
                is_active=user_data.is_active,
                two_factor_enabled=user_data.two_factor_enabled,
                password_hash=hashed_password,
                created_by=current_user_id,
                updated_by=current_user_id
            )
            
            # パスワード有効期限設定
            if user_data.password_expiry_days:
                db_user.password_expiry = datetime.utcnow() + timedelta(days=user_data.password_expiry_days)
            
            self.db.add(db_user)
            self.db.commit()
            self.db.refresh(db_user)
            
            logger.info(f"User created: {user_data.email} by user {current_user_id}")
            
            return self._build_user_response(db_user)
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating user: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ユーザーの作成中にエラーが発生しました"
            )

    def get_user(self, user_id: UUID, current_user_id: UUID) -> UserResponse:
        """ユーザーを取得する"""
        user = self._get_user_by_id(user_id, current_user_id)
        return self._build_user_response(user)

    def update_user(self, user_id: UUID, user_data: UserUpdate, current_user_id: UUID) -> UserResponse:
        """ユーザー情報を更新する"""
        try:
            user = self._get_user_by_id(user_id, current_user_id)
            
            # メールアドレス変更時の重複チェック
            if user_data.email and user_data.email != user.email:
                existing_user = self.db.query(User).filter(
                    and_(
                        User.email == user_data.email,
                        User.id != user_id,
                        User.deleted_at.is_(None)
                    )
                ).first()
                
                if existing_user:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="指定されたメールアドレスは既に使用されています"
                    )
            
            # フィールドを更新
            update_data = user_data.model_dump(exclude_unset=True, exclude={"password"})
            for field, value in update_data.items():
                if hasattr(user, field) and value is not None:
                    setattr(user, field, value)
            
            # パスワード更新
            if user_data.password:
                user.password_hash = pwd_context.hash(user_data.password)
                user.password_changed_at = datetime.utcnow()
                if user_data.password_expiry_days:
                    user.password_expiry = datetime.utcnow() + timedelta(days=user_data.password_expiry_days)
            
            user.updated_by = current_user_id
            user.updated_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(user)
            
            logger.info(f"User updated: {user.email} by user {current_user_id}")
            
            return self._build_user_response(user)
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating user {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ユーザーの更新中にエラーが発生しました"
            )

    def list_users(
        self,
        current_user_id: UUID,
        page: int = 1,
        per_page: int = 20,
        role: Optional[List[str]] = None,
        department: Optional[str] = None,
        is_active: Optional[bool] = None,
        location: Optional[str] = None,
        q: Optional[str] = None,
        sort: Optional[str] = None
    ) -> UserListResponse:
        """ユーザー一覧を取得する"""
        try:
            # ベースクエリ
            query = self.db.query(User).filter(
                and_(
                    User.tenant_id == self._get_user_tenant_id(current_user_id),
                    User.deleted_at.is_(None)
                )
            )
            
            # フィルター適用
            if role:
                query = query.filter(User.role.in_(role))
            
            if department:
                query = query.filter(User.department == department)
            
            if is_active is not None:
                query = query.filter(User.is_active == is_active)
            
            if location:
                query = query.filter(User.location == location)
            
            # 検索
            if q:
                search_term = f"%{q}%"
                query = query.filter(
                    or_(
                        User.first_name.ilike(search_term),
                        User.last_name.ilike(search_term),
                        User.email.ilike(search_term),
                        func.concat(User.first_name, ' ', User.last_name).ilike(search_term)
                    )
                )
            
            # ソート
            if sort:
                if sort.startswith("-"):
                    field = sort[1:]
                    if hasattr(User, field):
                        query = query.order_by(desc(getattr(User, field)))
                else:
                    if hasattr(User, sort):
                        query = query.order_by(asc(getattr(User, sort)))
            else:
                query = query.order_by(asc(User.last_name), asc(User.first_name))
            
            # 総件数を取得
            total_count = query.count()
            
            # ページネーション
            offset = (page - 1) * per_page
            users = query.offset(offset).limit(per_page).all()
            
            # レスポンス構築
            user_list = []
            for user in users:
                # パフォーマンス統計を追加
                performance_stats = self._get_user_basic_stats(user.id)
                user_response = self._build_user_response(user)
                user_response.performance_stats = performance_stats
                user_list.append(user_response)
            
            # メタ情報
            total_pages = (total_count + per_page - 1) // per_page
            meta = PaginationMeta(
                current_page=page,
                total_pages=total_pages,
                total_count=total_count,
                per_page=per_page
            )
            
            return UserListResponse(
                data=user_list,
                meta=meta,
                summary={
                    "total_users": total_count,
                    "active_users": self.db.query(func.count(User.id)).filter(
                        and_(
                            User.tenant_id == self._get_user_tenant_id(current_user_id),
                            User.is_active == True,
                            User.deleted_at.is_(None)
                        )
                    ).scalar() or 0,
                    "inactive_users": self.db.query(func.count(User.id)).filter(
                        and_(
                            User.tenant_id == self._get_user_tenant_id(current_user_id),
                            User.is_active == False,
                            User.deleted_at.is_(None)
                        )
                    ).scalar() or 0
                }
            )
            
        except Exception as e:
            logger.error(f"Error listing users: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ユーザー一覧の取得中にエラーが発生しました"
            )

    def delete_user(self, user_id: UUID, current_user_id: UUID):
        """ユーザーを削除する（論理削除）"""
        try:
            user = self._get_user_by_id(user_id, current_user_id)
            
            # 自分自身は削除できない
            if user_id == current_user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="自分自身を削除することはできません"
                )
            
            # 論理削除
            user.deleted_at = datetime.utcnow()
            user.is_active = False
            user.updated_by = current_user_id
            
            self.db.commit()
            
            logger.info(f"User deleted: {user.email} by user {current_user_id}")
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting user {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ユーザーの削除中にエラーが発生しました"
            )

    def activate_user(self, user_id: UUID, current_user_id: UUID):
        """ユーザーをアクティベートする"""
        try:
            user = self._get_user_by_id(user_id, current_user_id)
            
            user.is_active = True
            user.updated_by = current_user_id
            user.updated_at = datetime.utcnow()
            
            self.db.commit()
            
            logger.info(f"User activated: {user.email} by user {current_user_id}")
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error activating user {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ユーザーのアクティベート中にエラーが発生しました"
            )

    def deactivate_user(self, user_id: UUID, current_user_id: UUID):
        """ユーザーを無効化する"""
        try:
            user = self._get_user_by_id(user_id, current_user_id)
            
            # 自分自身は無効化できない
            if user_id == current_user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="自分自身を無効化することはできません"
                )
            
            user.is_active = False
            user.updated_by = current_user_id
            user.updated_at = datetime.utcnow()
            
            self.db.commit()
            
            logger.info(f"User deactivated: {user.email} by user {current_user_id}")
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deactivating user {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ユーザーの無効化中にエラーが発生しました"
            )

    def update_user_role(self, user_id: UUID, role_data: UserRoleUpdate, current_user_id: UUID) -> UserResponse:
        """ユーザーのロールを変更する"""
        try:
            user = self._get_user_by_id(user_id, current_user_id)
            
            # 自分自身のロールは変更できない（権限昇格防止）
            if user_id == current_user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="自分自身のロールを変更することはできません"
                )
            
            user.role = role_data.role
            user.updated_by = current_user_id
            user.updated_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(user)
            
            logger.info(f"User role updated: {user.email} to {role_data.role} by user {current_user_id}")
            
            return self._build_user_response(user)
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating user role {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ユーザーロールの変更中にエラーが発生しました"
            )

    def get_user_permissions(self, user_id: UUID, current_user_id: UUID) -> UserPermissionResponse:
        """ユーザーの権限情報を取得する"""
        try:
            user = self._get_user_by_id(user_id, current_user_id)
            
            # ロールベースの権限を取得
            permissions = self._get_role_permissions(user.role)
            
            return UserPermissionResponse(
                user_id=user.id,
                role=user.role,
                permissions=permissions,
                effective_permissions=self._calculate_effective_permissions(user),
                data_scope=self._get_data_scope(user),
                last_updated=user.updated_at
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting user permissions {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ユーザー権限の取得中にエラーが発生しました"
            )

    def reset_user_password(self, user_id: UUID, current_user_id: UUID) -> str:
        """ユーザーのパスワードをリセットする"""
        try:
            user = self._get_user_by_id(user_id, current_user_id)
            
            # 一時パスワード生成
            temporary_password = self._generate_temporary_password()
            
            # パスワード更新
            user.password_hash = pwd_context.hash(temporary_password)
            user.password_changed_at = datetime.utcnow()
            user.password_expiry = datetime.utcnow() + timedelta(hours=24)  # 24時間で失効
            user.force_password_change = True
            user.updated_by = current_user_id
            user.updated_at = datetime.utcnow()
            
            self.db.commit()
            
            logger.info(f"Password reset for user: {user.email} by user {current_user_id}")
            
            return temporary_password
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error resetting password for user {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="パスワードリセット中にエラーが発生しました"
            )

    def get_user_performance(self, user_id: UUID, current_user_id: UUID, days: int) -> Dict[str, Any]:
        """ユーザーのパフォーマンス統計を取得する"""
        try:
            user = self._get_user_by_id(user_id, current_user_id)
            
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # インシデント統計
            assigned_count = self.db.query(func.count(Incident.id)).filter(
                and_(
                    Incident.assignee_id == user_id,
                    Incident.created_at >= start_date,
                    Incident.deleted_at.is_(None)
                )
            ).scalar() or 0
            
            resolved_count = self.db.query(func.count(Incident.id)).filter(
                and_(
                    Incident.assignee_id == user_id,
                    Incident.status == IncidentStatus.RESOLVED,
                    Incident.resolved_at >= start_date,
                    Incident.deleted_at.is_(None)
                )
            ).scalar() or 0
            
            # 平均解決時間
            avg_resolution_query = self.db.query(
                func.avg(
                    func.extract('epoch', Incident.resolved_at - Incident.created_at) / 3600
                )
            ).filter(
                and_(
                    Incident.assignee_id == user_id,
                    Incident.status == IncidentStatus.RESOLVED,
                    Incident.resolved_at >= start_date,
                    Incident.resolved_at.is_not(None),
                    Incident.deleted_at.is_(None)
                )
            )
            
            avg_resolution_time = avg_resolution_query.scalar() or 0
            
            # SLA遵守率
            sla_compliant = self.db.query(func.count(Incident.id)).filter(
                and_(
                    Incident.assignee_id == user_id,
                    Incident.status == IncidentStatus.RESOLVED,
                    Incident.resolved_at >= start_date,
                    Incident.resolved_at <= Incident.resolution_due_at,
                    Incident.deleted_at.is_(None)
                )
            ).scalar() or 0
            
            sla_compliance_rate = (sla_compliant / resolved_count * 100) if resolved_count > 0 else 100
            
            return {
                "user_id": user_id,
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "days": days
                },
                "incident_stats": {
                    "assigned_count": assigned_count,
                    "resolved_count": resolved_count,
                    "resolution_rate": (resolved_count / assigned_count * 100) if assigned_count > 0 else 0,
                    "avg_resolution_time_hours": round(avg_resolution_time, 2)
                },
                "sla_performance": {
                    "compliance_rate": round(sla_compliance_rate, 2),
                    "compliant_count": sla_compliant,
                    "total_resolved": resolved_count
                },
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting user performance {user_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ユーザーパフォーマンスの取得中にエラーが発生しました"
            )

    def get_available_roles(self) -> List[Dict[str, Any]]:
        """利用可能なロール一覧を取得する"""
        roles = []
        for role in UserRole:
            roles.append({
                "value": role.value,
                "label": self._get_role_label(role),
                "description": self._get_role_description(role),
                "permissions": self._get_role_permissions(role)
            })
        
        return roles

    def get_departments(self) -> List[Dict[str, Any]]:
        """部署一覧を取得する"""
        # 実際の実装では、部署マスタテーブルから取得
        departments = [
            {"value": "it", "label": "IT部門"},
            {"value": "finance", "label": "財務部門"},
            {"value": "hr", "label": "人事部門"},
            {"value": "sales", "label": "営業部門"},
            {"value": "marketing", "label": "マーケティング部門"},
            {"value": "operations", "label": "運用部門"}
        ]
        
        return departments

    def _get_user_by_id(self, user_id: UUID, current_user_id: UUID) -> User:
        """IDでユーザーを取得する（権限チェック付き）"""
        user = self.db.query(User).filter(
            and_(
                User.id == user_id,
                User.tenant_id == self._get_user_tenant_id(current_user_id),
                User.deleted_at.is_(None)
            )
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="指定されたユーザーが見つかりません"
            )
        
        return user

    def _get_user_tenant_id(self, user_id: UUID) -> UUID:
        """ユーザーのテナントIDを取得する（仮実装）"""
        # 実際の実装では、ユーザーテーブルから取得
        return UUID("12345678-1234-1234-1234-123456789012")

    def _build_user_response(self, user: User) -> UserResponse:
        """ユーザーレスポンスを構築する"""
        return UserResponse(
            id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            full_name=f"{user.first_name} {user.last_name}",
            email=user.email,
            phone=user.phone,
            department=user.department,
            role=user.role,
            manager_id=user.manager_id,
            location=user.location,
            is_active=user.is_active,
            two_factor_enabled=user.two_factor_enabled,
            last_login_at=user.last_login_at,
            password_changed_at=user.password_changed_at,
            password_expiry=user.password_expiry,
            force_password_change=user.force_password_change,
            created_at=user.created_at,
            updated_at=user.updated_at
        )

    def _get_user_basic_stats(self, user_id: UUID) -> Dict[str, Any]:
        """ユーザーの基本統計を取得する"""
        assigned_tickets = self.db.query(func.count(Incident.id)).filter(
            and_(
                Incident.assignee_id == user_id,
                Incident.deleted_at.is_(None)
            )
        ).scalar() or 0
        
        resolved_tickets = self.db.query(func.count(Incident.id)).filter(
            and_(
                Incident.assignee_id == user_id,
                Incident.status == IncidentStatus.RESOLVED,
                Incident.deleted_at.is_(None)
            )
        ).scalar() or 0
        
        return {
            "assigned_tickets": assigned_tickets,
            "resolved_tickets": resolved_tickets,
            "resolution_rate": (resolved_tickets / assigned_tickets * 100) if assigned_tickets > 0 else 0
        }

    def _get_role_permissions(self, role: UserRole) -> List[Dict[str, Any]]:
        """ロールの権限を取得する"""
        role_permissions = {
            UserRole.ADMIN: [
                {"resource": "*", "actions": ["*"]},
            ],
            UserRole.MANAGER: [
                {"resource": "incidents", "actions": ["create", "read", "update", "delete"]},
                {"resource": "users", "actions": ["read", "update"], "conditions": {"department": "own"}},
                {"resource": "reports", "actions": ["read"]},
                {"resource": "dashboard", "actions": ["read"]},
            ],
            UserRole.OPERATOR: [
                {"resource": "incidents", "actions": ["create", "read", "update"]},
                {"resource": "users", "actions": ["read"], "conditions": {"own_only": True}},
                {"resource": "dashboard", "actions": ["read"]},
            ],
            UserRole.VIEWER: [
                {"resource": "incidents", "actions": ["read"]},
                {"resource": "reports", "actions": ["read"]},
                {"resource": "dashboard", "actions": ["read"]},
            ]
        }
        
        return role_permissions.get(role, [])

    def _calculate_effective_permissions(self, user: User) -> List[str]:
        """ユーザーの実効権限を計算する"""
        # 簡単な実装例
        permissions = []
        role_perms = self._get_role_permissions(user.role)
        
        for perm in role_perms:
            resource = perm["resource"]
            actions = perm["actions"]
            
            if resource == "*" and "*" in actions:
                permissions.append("*")
                break
            
            for action in actions:
                permissions.append(f"{resource}:{action}")
        
        return permissions

    def _get_data_scope(self, user: User) -> str:
        """ユーザーのデータスコープを取得する"""
        scope_mapping = {
            UserRole.ADMIN: "all",
            UserRole.MANAGER: "department",
            UserRole.OPERATOR: "own",
            UserRole.VIEWER: "limited"
        }
        
        return scope_mapping.get(user.role, "own")

    def _generate_temporary_password(self) -> str:
        """一時パスワードを生成する"""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(12))

    def _get_role_label(self, role: UserRole) -> str:
        """ロールのラベルを取得する"""
        labels = {
            UserRole.ADMIN: "システム管理者",
            UserRole.MANAGER: "マネージャー",
            UserRole.OPERATOR: "オペレーター",
            UserRole.VIEWER: "閲覧者"
        }
        return labels.get(role, role.value)

    def _get_role_description(self, role: UserRole) -> str:
        """ロールの説明を取得する"""
        descriptions = {
            UserRole.ADMIN: "システム全体の管理権限を持ちます",
            UserRole.MANAGER: "チーム管理とレポート閲覧権限を持ちます",
            UserRole.OPERATOR: "インシデント対応の基本権限を持ちます",
            UserRole.VIEWER: "情報の閲覧権限のみ持ちます"
        }
        return descriptions.get(role, "")