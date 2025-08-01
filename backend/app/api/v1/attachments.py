"""添付ファイル管理API"""

import os
import mimetypes
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.services.attachment_service import AttachmentService
from app.schemas.attachment import AttachmentResponse, AttachmentUploadResponse
from app.schemas.common import SuccessResponse, APIError
from app.api.v1.auth import get_current_user_id
from app.core.config import settings

router = APIRouter()


@router.post(
    "/upload/{resource_type}/{resource_id}",
    response_model=AttachmentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="ファイルアップロード",
    description="指定されたリソースにファイルを添付します",
    responses={
        201: {"description": "ファイルが正常にアップロードされました"},
        400: {"model": APIError, "description": "ファイルが不正です"},
        413: {"model": APIError, "description": "ファイルサイズが制限を超えています"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def upload_attachment(
    resource_type: str,
    resource_id: UUID,
    files: List[UploadFile] = File(..., description="アップロードするファイル（複数可）"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> AttachmentUploadResponse:
    """ファイルをアップロードする"""
    
    # リソースタイプの検証
    allowed_resource_types = ["incidents", "problems", "changes", "users"]
    if resource_type not in allowed_resource_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"サポートされていないリソースタイプです: {resource_type}"
        )
    
    # ファイル数制限チェック
    if len(files) > settings.MAX_FILES_PER_UPLOAD:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"一度にアップロードできるファイル数は{settings.MAX_FILES_PER_UPLOAD}個までです"
        )
    
    service = AttachmentService(db)
    return await service.upload_attachments(
        resource_type=resource_type,
        resource_id=resource_id,
        files=files,
        current_user_id=current_user_id
    )


@router.get(
    "/{resource_type}/{resource_id}",
    response_model=List[AttachmentResponse],
    summary="添付ファイル一覧取得",
    description="指定されたリソースの添付ファイル一覧を取得します",
    responses={
        200: {"description": "添付ファイル一覧を正常に取得しました"},
        404: {"model": APIError, "description": "指定されたリソースが見つかりません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def list_attachments(
    resource_type: str,
    resource_id: UUID,
    include_deleted: bool = Query(False, description="削除済みファイルを含むか"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> List[AttachmentResponse]:
    """添付ファイル一覧を取得する"""
    service = AttachmentService(db)
    return service.list_attachments(
        resource_type=resource_type,
        resource_id=resource_id,
        current_user_id=current_user_id,
        include_deleted=include_deleted
    )


@router.get(
    "/download/{attachment_id}",
    summary="ファイルダウンロード",
    description="指定された添付ファイルをダウンロードします",
    responses={
        200: {"description": "ファイルを正常にダウンロードしました", "content": {"application/octet-stream": {}}},
        404: {"model": APIError, "description": "指定されたファイルが見つかりません"},
        403: {"model": APIError, "description": "ファイルへのアクセス権限がありません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def download_attachment(
    attachment_id: UUID,
    inline: bool = Query(False, description="ブラウザでインライン表示するか"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> FileResponse:
    """添付ファイルをダウンロードする"""
    service = AttachmentService(db)
    attachment = service.get_attachment(attachment_id, current_user_id)
    
    # ファイルの存在確認
    if not os.path.exists(attachment.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ファイルが見つかりません"
        )
    
    # Content-Disposition設定
    disposition = "inline" if inline else "attachment"
    
    # MIMEタイプを推定
    media_type = attachment.content_type or mimetypes.guess_type(attachment.file_name)[0] or "application/octet-stream"
    
    return FileResponse(
        path=attachment.file_path,
        filename=attachment.file_name,
        media_type=media_type,
        headers={
            "Content-Disposition": f"{disposition}; filename*=UTF-8''{attachment.file_name}"
        }
    )


@router.get(
    "/info/{attachment_id}",
    response_model=AttachmentResponse,
    summary="添付ファイル情報取得",
    description="指定された添付ファイルの情報を取得します",
    responses={
        200: {"description": "添付ファイル情報を正常に取得しました"},
        404: {"model": APIError, "description": "指定されたファイルが見つかりません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def get_attachment_info(
    attachment_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> AttachmentResponse:
    """添付ファイル情報を取得する"""
    service = AttachmentService(db)
    return service.get_attachment_info(attachment_id, current_user_id)


@router.delete(
    "/{attachment_id}",
    response_model=SuccessResponse,
    summary="添付ファイル削除",
    description="指定された添付ファイルを削除します",
    responses={
        200: {"description": "添付ファイルが正常に削除されました"},
        404: {"model": APIError, "description": "指定されたファイルが見つかりません"},
        403: {"model": APIError, "description": "ファイルの削除権限がありません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def delete_attachment(
    attachment_id: UUID,
    permanent: bool = Query(False, description="物理削除するか（論理削除がデフォルト）"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> SuccessResponse:
    """添付ファイルを削除する"""
    service = AttachmentService(db)
    service.delete_attachment(attachment_id, current_user_id, permanent)
    
    action = "物理削除" if permanent else "論理削除"
    return SuccessResponse(
        message=f"添付ファイルが正常に{action}されました",
        data={"attachment_id": attachment_id, "permanent": permanent}
    )


@router.post(
    "/restore/{attachment_id}",
    response_model=SuccessResponse,
    summary="添付ファイル復元",
    description="論理削除された添付ファイルを復元します",
    responses={
        200: {"description": "添付ファイルが正常に復元されました"},
        404: {"model": APIError, "description": "指定されたファイルが見つかりません"},
        400: {"model": APIError, "description": "削除されていないファイルは復元できません"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def restore_attachment(
    attachment_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> SuccessResponse:
    """削除された添付ファイルを復元する"""
    service = AttachmentService(db)
    service.restore_attachment(attachment_id, current_user_id)
    
    return SuccessResponse(
        message="添付ファイルが正常に復元されました",
        data={"attachment_id": attachment_id}
    )


@router.get(
    "/preview/{attachment_id}",
    summary="ファイルプレビュー",
    description="指定された添付ファイルのプレビューを表示します（画像・PDF等）",
    responses={
        200: {"description": "プレビューを正常に表示しました"},
        404: {"model": APIError, "description": "指定されたファイルが見つかりません"},
        415: {"model": APIError, "description": "プレビューに対応していないファイル形式です"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def preview_attachment(
    attachment_id: UUID,
    size: Optional[str] = Query(None, pattern="^(thumbnail|small|medium|large)$", description="プレビューサイズ"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """添付ファイルのプレビューを表示する"""
    service = AttachmentService(db)
    return await service.generate_preview(attachment_id, current_user_id, size)


@router.get(
    "/scan/{attachment_id}",
    response_model=dict,
    summary="ウイルススキャン結果取得",
    description="指定された添付ファイルのウイルススキャン結果を取得します"
)
async def get_scan_result(
    attachment_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> dict:
    """ウイルススキャン結果を取得する"""
    service = AttachmentService(db)
    return service.get_scan_result(attachment_id, current_user_id)


@router.post(
    "/bulk-delete",
    response_model=SuccessResponse,
    summary="一括削除",
    description="複数の添付ファイルを一括削除します"
)
async def bulk_delete_attachments(
    attachment_ids: List[UUID],
    permanent: bool = Query(False, description="物理削除するか"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> SuccessResponse:
    """添付ファイルを一括削除する"""
    service = AttachmentService(db)
    deleted_count = service.bulk_delete_attachments(attachment_ids, current_user_id, permanent)
    
    action = "物理削除" if permanent else "論理削除"
    return SuccessResponse(
        message=f"{deleted_count}個の添付ファイルが正常に{action}されました",
        data={"deleted_count": deleted_count, "permanent": permanent}
    )


@router.get(
    "/storage/usage",
    response_model=dict,
    summary="ストレージ使用量取得",
    description="添付ファイルのストレージ使用量統計を取得します"
)
async def get_storage_usage(
    resource_type: Optional[str] = Query(None, description="リソースタイプ別の使用量"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> dict:
    """ストレージ使用量を取得する"""
    service = AttachmentService(db)
    return service.get_storage_usage(current_user_id, resource_type)