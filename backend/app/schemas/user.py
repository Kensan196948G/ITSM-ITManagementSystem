"""ユーザー関連スキーマ"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict

from app.models.user import UserRole
from app.schemas.common import PaginationMeta


class UserBase(BaseModel):
    """ユーザーベーススキーマ"""
    first_name: str = Field(..., min_length=1, max_length=50, description="名")
    last_name: str = Field(..., min_length=1, max_length=50, description="姓")
    email: EmailStr = Field(..., description="メールアドレス")
    phone: Optional[str] = Field(None, max_length=20, description="電話番号")
    department: str = Field(..., max_length=100, description="部署")
    location: Optional[str] = Field(None, max_length=100, description="勤務地")


class UserCreate(UserBase):
    """ユーザー作成スキーマ"""
    password: str = Field(..., min_length=8, max_length=128, description="パスワード")
    role: UserRole = Field(..., description="ユーザーロール")
    manager_id: Optional[UUID] = Field(None, description="上司ID")
    is_active: bool = Field(True, description="アクティブ状態")
    two_factor_enabled: bool = Field(False, description="二要素認証有効")
    password_expiry_days: Optional[int] = Field(None, gt=0, le=365, description="パスワード有効期限（日数）")

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """パスワードバリデーション"""
        if len(v) < 8:
            raise ValueError('パスワードは8文字以上である必要があります')
        
        has_upper = any(c.isupper() for c in v)
        has_lower = any(c.islower() for c in v)
        has_digit = any(c.isdigit() for c in v)
        has_special = any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v)
        
        if not (has_upper and has_lower and has_digit and has_special):
            raise ValueError('パスワードは大文字、小文字、数字、特殊文字を含む必要があります')
        
        return v


class UserUpdate(BaseModel):
    """ユーザー更新スキーマ"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=50, description="名")
    last_name: Optional[str] = Field(None, min_length=1, max_length=50, description="姓")
    email: Optional[EmailStr] = Field(None, description="メールアドレス")
    phone: Optional[str] = Field(None, max_length=20, description="電話番号")
    department: Optional[str] = Field(None, max_length=100, description="部署")
    location: Optional[str] = Field(None, max_length=100, description="勤務地")
    manager_id: Optional[UUID] = Field(None, description="上司ID")
    is_active: Optional[bool] = Field(None, description="アクティブ状態")
    two_factor_enabled: Optional[bool] = Field(None, description="二要素認証有効")
    password: Optional[str] = Field(None, min_length=8, max_length=128, description="パスワード")
    password_expiry_days: Optional[int] = Field(None, gt=0, le=365, description="パスワード有効期限（日数）")

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """パスワードバリデーション"""
        if v is None:
            return v
        
        if len(v) < 8:
            raise ValueError('パスワードは8文字以上である必要があります')
        
        has_upper = any(c.isupper() for c in v)
        has_lower = any(c.islower() for c in v)
        has_digit = any(c.isdigit() for c in v)
        has_special = any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v)
        
        if not (has_upper and has_lower and has_digit and has_special):
            raise ValueError('パスワードは大文字、小文字、数字、特殊文字を含む必要があります')
        
        return v


class UserRoleUpdate(BaseModel):
    """ユーザーロール更新スキーマ"""
    role: UserRole = Field(..., description="新しいユーザーロール")


class UserResponse(UserBase):
    """ユーザーレスポンススキーマ"""
    id: UUID = Field(..., description="ユーザーID")
    full_name: str = Field(..., description="フルネーム")
    role: UserRole = Field(..., description="ユーザーロール")
    manager_id: Optional[UUID] = Field(None, description="上司ID")
    is_active: bool = Field(..., description="アクティブ状態")
    two_factor_enabled: bool = Field(..., description="二要素認証有効")
    last_login_at: Optional[datetime] = Field(None, description="最終ログイン日時")
    password_changed_at: Optional[datetime] = Field(None, description="パスワード変更日時")
    password_expiry: Optional[datetime] = Field(None, description="パスワード有効期限")
    force_password_change: Optional[bool] = Field(None, description="パスワード変更強制")
    created_at: datetime = Field(..., description="作成日時")
    updated_at: datetime = Field(..., description="更新日時")
    
    # オプション項目（一覧表示時に含まれる場合がある）
    performance_stats: Optional[Dict[str, Any]] = Field(None, description="パフォーマンス統計")
    manager: Optional[Dict[str, str]] = Field(None, description="上司情報")

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    """ユーザー一覧レスポンススキーマ"""
    data: List[UserResponse] = Field(..., description="ユーザー一覧")
    meta: PaginationMeta = Field(..., description="ページネーション情報")
    summary: Dict[str, Any] = Field(..., description="サマリー情報")


class UserPermissionResponse(BaseModel):
    """ユーザー権限レスポンススキーマ"""
    user_id: UUID = Field(..., description="ユーザーID")
    role: UserRole = Field(..., description="ユーザーロール")
    permissions: List[Dict[str, Any]] = Field(..., description="ロール権限")
    effective_permissions: List[str] = Field(..., description="実効権限")
    data_scope: str = Field(..., description="データスコープ")
    last_updated: datetime = Field(..., description="最終更新日時")


class UserLoginRequest(BaseModel):
    """ユーザーログインリクエストスキーマ"""
    email: EmailStr = Field(..., description="メールアドレス")
    password: str = Field(..., min_length=1, description="パスワード")
    two_factor_code: Optional[str] = Field(None, min_length=6, max_length=6, description="二要素認証コード")


class UserLoginResponse(BaseModel):
    """ユーザーログインレスポンススキーマ"""
    access_token: str = Field(..., description="アクセストークン")
    refresh_token: str = Field(..., description="リフレッシュトークン")
    token_type: str = Field("bearer", description="トークンタイプ")
    expires_in: int = Field(..., description="有効期限（秒）")
    user: UserResponse = Field(..., description="ユーザー情報")


class PasswordChangeRequest(BaseModel):
    """パスワード変更リクエストスキーマ"""
    current_password: str = Field(..., min_length=1, description="現在のパスワード")
    new_password: str = Field(..., min_length=8, max_length=128, description="新しいパスワード")
    confirm_password: str = Field(..., min_length=8, max_length=128, description="新しいパスワード（確認）")

    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v, info):
        """パスワード確認バリデーション"""
        if info.data.get('new_password') and v != info.data.get('new_password'):
            raise ValueError('パスワードが一致しません')
        return v

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v):
        """新しいパスワードバリデーション"""
        if len(v) < 8:
            raise ValueError('パスワードは8文字以上である必要があります')
        
        has_upper = any(c.isupper() for c in v)
        has_lower = any(c.islower() for c in v)
        has_digit = any(c.isdigit() for c in v)
        has_special = any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v)
        
        if not (has_upper and has_lower and has_digit and has_special):
            raise ValueError('パスワードは大文字、小文字、数字、特殊文字を含む必要があります')
        
        return v


class TwoFactorSetupRequest(BaseModel):
    """二要素認証設定リクエストスキーマ"""
    password: str = Field(..., min_length=1, description="現在のパスワード")
    enable: bool = Field(..., description="二要素認証を有効にするか")


class TwoFactorSetupResponse(BaseModel):
    """二要素認証設定レスポンススキーマ"""
    qr_code_url: Optional[str] = Field(None, description="QRコードURL")
    secret_key: Optional[str] = Field(None, description="シークレットキー")
    backup_codes: Optional[List[str]] = Field(None, description="バックアップコード")
    enabled: bool = Field(..., description="有効状態")


class UserProfileResponse(BaseModel):
    """ユーザープロフィールレスポンススキーマ"""
    user: UserResponse = Field(..., description="ユーザー情報")
    preferences: Dict[str, Any] = Field(..., description="ユーザー設定")
    notifications: Dict[str, bool] = Field(..., description="通知設定")
    security: Dict[str, Any] = Field(..., description="セキュリティ設定")


class UserPreferencesUpdate(BaseModel):
    """ユーザー設定更新スキーマ"""
    theme: Optional[str] = Field(None, pattern="^(light|dark|auto)$", description="テーマ")
    language: Optional[str] = Field(None, max_length=10, description="言語設定")
    timezone: Optional[str] = Field(None, max_length=50, description="タイムゾーン")
    date_format: Optional[str] = Field(None, max_length=20, description="日付フォーマット")
    items_per_page: Optional[int] = Field(None, ge=10, le=100, description="1ページあたりの表示件数")


class NotificationSettings(BaseModel):
    """通知設定スキーマ"""
    email_notifications: bool = Field(True, description="メール通知")
    incident_assigned: bool = Field(True, description="インシデント割当通知")
    incident_updated: bool = Field(True, description="インシデント更新通知")
    incident_resolved: bool = Field(True, description="インシデント解決通知")
    sla_violations: bool = Field(True, description="SLA違反通知")
    system_maintenance: bool = Field(True, description="システムメンテナンス通知")


class UserTicketSummary(BaseModel):
    """ユーザーチケットサマリースキーマ"""
    total_assigned: int = Field(0, description="総担当チケット数")
    open_tickets: int = Field(0, description="未解決チケット数")
    in_progress_tickets: int = Field(0, description="進行中チケット数")
    resolved_today: int = Field(0, description="今日解決したチケット数")
    overdue_tickets: int = Field(0, description="期限超過チケット数")


class UserPerformanceMetrics(BaseModel):
    """ユーザーパフォーマンス指標スキーマ"""
    avg_resolution_time: Optional[float] = Field(None, description="平均解決時間（時間）")
    sla_compliance_rate: Optional[float] = Field(None, description="SLA遵守率（%）")
    tickets_resolved_last_30_days: int = Field(0, description="過去30日の解決チケット数")
    customer_satisfaction_score: Optional[float] = Field(None, description="顧客満足度スコア")
    first_contact_resolution_rate: Optional[float] = Field(None, description="初回解決率（%）")


class AssignedTicketInfo(BaseModel):
    """担当チケット情報スキーマ"""
    id: UUID
    incident_number: str
    title: str
    status: str
    priority: str
    created_at: datetime
    due_date: Optional[datetime]
    is_overdue: bool = False

    model_config = ConfigDict(from_attributes=True)


class UserDetailResponse(UserResponse):
    """ユーザー詳細レスポンススキーマ（詳細パネル用）"""
    # 基本情報は UserResponse から継承
    
    # 詳細統計情報
    ticket_summary: UserTicketSummary = Field(default_factory=UserTicketSummary)
    performance_metrics: UserPerformanceMetrics = Field(default_factory=UserPerformanceMetrics)
    
    # 担当チケット一覧
    assigned_tickets: List[AssignedTicketInfo] = Field(default_factory=list)
    
    # 最近の活動
    recent_activities: List[dict] = Field(default_factory=list)
    
    # チーム・部署情報
    team_info: Optional[dict] = Field(None, description="チーム情報")
    department_info: Optional[dict] = Field(None, description="部署情報")
    
    # 上司・部下情報
    manager_info: Optional[dict] = Field(None, description="上司情報")
    subordinates: List[dict] = Field(default_factory=list, description="部下一覧")
    
    # 設定・権限情報
    preferences: dict = Field(default_factory=dict, description="ユーザー設定")
    notification_settings: NotificationSettings = Field(default_factory=NotificationSettings)
    
    # カスタムフィールド
    custom_fields: dict = Field(default_factory=dict)
    
    # メタデータ
    metadata: dict = Field(default_factory=dict)


class UserActivityLog(BaseModel):
    """ユーザー活動ログスキーマ"""
    id: UUID
    user_id: UUID
    activity_type: str  # 'login', 'ticket_created', 'ticket_updated', 'ticket_resolved'
    description: str
    resource_type: Optional[str] = None  # 'incident', 'problem', 'change'
    resource_id: Optional[UUID] = None
    timestamp: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class UserActivityResponse(BaseModel):
    """ユーザー活動レスポンススキーマ"""
    user_id: UUID
    activities: List[UserActivityLog]
    total_count: int
    date_range: dict