"""添付ファイル関連スキーマ"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field, validator


class AttachmentBase(BaseModel):
    """添付ファイルベーススキーマ"""
    resource_type: str = Field(..., description="リソースタイプ")
    resource_id: UUID = Field(..., description="リソースID")
    description: Optional[str] = Field(None, max_length=1000, description="説明")
    tags: Optional[str] = Field(None, max_length=500, description="タグ（カンマ区切り）")
    is_public: bool = Field(False, description="公開設定")
    access_level: str = Field("private", pattern="^(private|internal|public)$", description="アクセスレベル")


class AttachmentResponse(AttachmentBase):
    """添付ファイルレスポンススキーマ"""
    id: UUID = Field(..., description="添付ファイルID")
    original_filename: str = Field(..., description="元のファイル名")
    file_size: int = Field(..., description="ファイルサイズ（バイト）")
    content_type: Optional[str] = Field(None, description="MIMEタイプ")
    file_hash: Optional[str] = Field(None, description="ファイルハッシュ")
    is_deleted: bool = Field(..., description="削除済みフラグ")
    uploaded_by: UUID = Field(..., description="アップロード者ID")
    uploaded_at: datetime = Field(..., description="アップロード日時")
    download_url: str = Field(..., description="ダウンロードURL")
    preview_url: Optional[str] = Field(None, description="プレビューURL")
    
    # 追加情報（条件により含まれる）
    scan_result: Optional[Dict[str, Any]] = Field(None, description="スキャン結果")
    access_count: Optional[int] = Field(None, description="アクセス回数")
    last_accessed: Optional[datetime] = Field(None, description="最終アクセス日時")

    class Config:
        from_attributes = True


class AttachmentUploadResponse(BaseModel):
    """ファイルアップロードレスポンススキーマ"""
    uploaded_files: List[AttachmentResponse] = Field(..., description="アップロード成功ファイル")
    failed_files: List[Dict[str, str]] = Field(..., description="アップロード失敗ファイル")
    total_uploaded: int = Field(..., description="アップロード成功数")
    total_failed: int = Field(..., description="アップロード失敗数")
    total_size_bytes: int = Field(..., description="合計ファイルサイズ")


class AttachmentUpdateRequest(BaseModel):
    """添付ファイル更新リクエストスキーマ"""
    description: Optional[str] = Field(None, max_length=1000, description="説明")
    tags: Optional[str] = Field(None, max_length=500, description="タグ")
    is_public: Optional[bool] = Field(None, description="公開設定")
    access_level: Optional[str] = Field(None, pattern="^(private|internal|public)$", description="アクセスレベル")


class AttachmentSearchRequest(BaseModel):
    """添付ファイル検索リクエストスキーマ"""
    resource_types: Optional[List[str]] = Field(None, description="リソースタイプフィルター")
    content_types: Optional[List[str]] = Field(None, description="MIMEタイプフィルター")
    file_extensions: Optional[List[str]] = Field(None, description="拡張子フィルター")
    min_size: Optional[int] = Field(None, ge=0, description="最小ファイルサイズ")
    max_size: Optional[int] = Field(None, ge=0, description="最大ファイルサイズ")
    uploaded_from: Optional[datetime] = Field(None, description="アップロード日時（開始）")
    uploaded_to: Optional[datetime] = Field(None, description="アップロード日時（終了）")
    search_query: Optional[str] = Field(None, description="ファイル名・説明文検索")
    tags: Optional[List[str]] = Field(None, description="タグフィルター")
    uploaded_by: Optional[List[UUID]] = Field(None, description="アップロード者フィルター")
    scan_status: Optional[List[str]] = Field(None, description="スキャンステータスフィルター")
    include_deleted: bool = Field(False, description="削除済みファイルを含むか")


class AttachmentBulkActionRequest(BaseModel):
    """添付ファイル一括操作リクエストスキーマ"""
    attachment_ids: List[UUID] = Field(..., min_items=1, description="対象添付ファイルID一覧")
    action: str = Field(..., pattern="^(delete|restore|update_tags|change_access)$", description="実行アクション")
    parameters: Optional[Dict[str, Any]] = Field(None, description="アクション固有パラメータ")


class AttachmentScanResultResponse(BaseModel):
    """スキャン結果レスポンススキーマ"""
    attachment_id: UUID = Field(..., description="添付ファイルID")
    scan_status: str = Field(..., description="スキャンステータス")
    scan_engine: Optional[str] = Field(None, description="スキャンエンジン")
    engine_version: Optional[str] = Field(None, description="エンジンバージョン")
    scanned_at: Optional[datetime] = Field(None, description="スキャン実行日時")
    threats_found: int = Field(0, description="検出された脅威数")
    threat_names: Optional[List[str]] = Field(None, description="脅威名一覧")
    scan_details: Optional[Dict[str, Any]] = Field(None, description="詳細情報")


class AttachmentAccessLogResponse(BaseModel):
    """アクセスログレスポンススキーマ"""
    id: UUID = Field(..., description="ログID")
    attachment_id: UUID = Field(..., description="添付ファイルID")
    user_id: UUID = Field(..., description="ユーザーID")
    action_type: str = Field(..., description="アクション種別")
    client_ip: Optional[str] = Field(None, description="クライアントIP")
    user_agent: Optional[str] = Field(None, description="ユーザーエージェント")
    accessed_at: datetime = Field(..., description="アクセス日時")
    user_info: Optional[Dict[str, str]] = Field(None, description="ユーザー情報")


class AttachmentStatisticsResponse(BaseModel):
    """添付ファイル統計レスポンススキーマ"""
    total_files: int = Field(..., description="総ファイル数")
    total_size_bytes: int = Field(..., description="総サイズ（バイト）")
    total_size_mb: float = Field(..., description="総サイズ（MB）")
    by_resource_type: Dict[str, Dict[str, Any]] = Field(..., description="リソースタイプ別統計")
    by_content_type: Dict[str, Dict[str, Any]] = Field(..., description="コンテンツタイプ別統計")
    by_month: List[Dict[str, Any]] = Field(..., description="月別統計")
    storage_usage: Dict[str, Any] = Field(..., description="ストレージ使用量")
    scan_summary: Dict[str, int] = Field(..., description="スキャン結果サマリー")


class AttachmentVersionResponse(BaseModel):
    """添付ファイルバージョンレスポンススキーマ"""
    id: UUID = Field(..., description="バージョンID")
    attachment_id: UUID = Field(..., description="添付ファイルID")
    version_number: int = Field(..., description="バージョン番号")
    version_comment: Optional[str] = Field(None, description="バージョンコメント")
    file_size: int = Field(..., description="ファイルサイズ")
    file_hash: Optional[str] = Field(None, description="ファイルハッシュ")
    created_by: UUID = Field(..., description="作成者ID")
    created_at: datetime = Field(..., description="作成日時")
    is_current: bool = Field(..., description="現在のバージョンか")


class AttachmentQuotaResponse(BaseModel):
    """添付ファイル容量制限レスポンススキーマ"""
    user_id: Optional[UUID] = Field(None, description="ユーザーID（個人制限の場合）")
    tenant_id: Optional[UUID] = Field(None, description="テナントID（組織制限の場合）")
    quota_type: str = Field(..., description="制限タイプ")
    current_usage_bytes: int = Field(..., description="現在使用量（バイト）")
    quota_limit_bytes: int = Field(..., description="制限容量（バイト）")
    usage_percentage: float = Field(..., description="使用率（%）")
    files_count: int = Field(..., description="ファイル数")
    max_files_limit: Optional[int] = Field(None, description="最大ファイル数制限")
    is_over_quota: bool = Field(..., description="容量超過フラグ")
    warning_threshold: float = Field(80.0, description="警告閾値（%）")
    next_cleanup_date: Optional[datetime] = Field(None, description="次回クリーンアップ予定日")


class AttachmentCleanupRequest(BaseModel):
    """添付ファイルクリーンアップリクエストスキーマ"""
    cleanup_type: str = Field(..., pattern="^(orphaned|deleted|old_versions|large_files)$", description="クリーンアップ種別")
    dry_run: bool = Field(True, description="テスト実行フラグ")
    parameters: Optional[Dict[str, Any]] = Field(None, description="クリーンアップパラメータ")
    
    @validator('parameters')
    def validate_parameters(cls, v, values):
        """パラメータのバリデーション"""
        cleanup_type = values.get('cleanup_type')
        
        if cleanup_type == 'orphaned':
            # 孤立ファイルのクリーンアップ
            return v or {}
        elif cleanup_type == 'deleted':
            # 削除済みファイルのクリーンアップ
            if v and 'days_old' in v:
                if not isinstance(v['days_old'], int) or v['days_old'] < 1:
                    raise ValueError('days_old は1以上の整数である必要があります')
            return v or {'days_old': 30}
        elif cleanup_type == 'old_versions':
            # 古いバージョンのクリーンアップ
            if v and 'keep_versions' in v:
                if not isinstance(v['keep_versions'], int) or v['keep_versions'] < 1:
                    raise ValueError('keep_versions は1以上の整数である必要があります')
            return v or {'keep_versions': 5}
        elif cleanup_type == 'large_files':
            # 大容量ファイルのクリーンアップ
            if v and 'min_size_mb' in v:
                if not isinstance(v['min_size_mb'], (int, float)) or v['min_size_mb'] <= 0:
                    raise ValueError('min_size_mb は正の数値である必要があります')
            return v or {'min_size_mb': 100}
        
        return v or {}


class AttachmentCleanupResponse(BaseModel):
    """添付ファイルクリーンアップレスポンススキーマ"""
    cleanup_type: str = Field(..., description="クリーンアップ種別")
    dry_run: bool = Field(..., description="テスト実行フラグ")
    files_processed: int = Field(..., description="処理対象ファイル数")
    files_cleaned: int = Field(..., description="クリーンアップ実行ファイル数")
    bytes_freed: int = Field(..., description="解放されたバイト数")
    errors: List[str] = Field(..., description="エラーメッセージ")
    execution_time_seconds: float = Field(..., description="実行時間（秒）")
    cleanup_details: List[Dict[str, Any]] = Field(..., description="クリーンアップ詳細")