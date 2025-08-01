"""添付ファイル管理サービス"""

import os
import hashlib
import mimetypes
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
import aiofiles
import magic
from PIL import Image
import io

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models.attachment import Attachment, AttachmentScanResult
from app.schemas.attachment import AttachmentResponse, AttachmentUploadResponse
from app.core.config import settings

logger = logging.getLogger(__name__)


class AttachmentService:
    """添付ファイル管理サービスクラス"""

    def __init__(self, db: Session):
        self.db = db
        self.allowed_extensions = {
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.txt', '.csv', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff',
            '.zip', '.7z', '.tar', '.gz', '.rar'
        }
        self.max_file_size = settings.MAX_FILE_SIZE  # バイト単位
        self.storage_path = settings.ATTACHMENT_STORAGE_PATH

    async def upload_attachments(
        self,
        resource_type: str,
        resource_id: UUID,
        files: List[UploadFile],
        current_user_id: UUID
    ) -> AttachmentUploadResponse:
        """複数ファイルをアップロードする"""
        try:
            uploaded_files = []
            failed_files = []
            total_size = 0

            # 既存ファイル数チェック
            existing_count = self.db.query(func.count(Attachment.id)).filter(
                and_(
                    Attachment.resource_type == resource_type,
                    Attachment.resource_id == resource_id,
                    Attachment.deleted_at.is_(None)
                )
            ).scalar() or 0

            if existing_count + len(files) > settings.MAX_ATTACHMENTS_PER_RESOURCE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"リソースあたりの添付ファイル数制限（{settings.MAX_ATTACHMENTS_PER_RESOURCE}個）を超えています"
                )

            for file in files:
                try:
                    # ファイル検証
                    validation_result = await self._validate_file(file)
                    if not validation_result["valid"]:
                        failed_files.append({
                            "filename": file.filename,
                            "error": validation_result["error"]
                        })
                        continue

                    # ファイルサイズチェック
                    file_size = await self._get_file_size(file)
                    total_size += file_size

                    if total_size > settings.MAX_TOTAL_UPLOAD_SIZE:
                        failed_files.append({
                            "filename": file.filename,
                            "error": "合計ファイルサイズが制限を超えています"
                        })
                        continue

                    # ファイル保存
                    attachment = await self._save_file(
                        file=file,
                        resource_type=resource_type,
                        resource_id=resource_id,
                        file_size=file_size,
                        current_user_id=current_user_id
                    )

                    # ウイルススキャン（非同期で実行）
                    await self._schedule_virus_scan(attachment.id)

                    uploaded_files.append(self._build_attachment_response(attachment))

                except Exception as e:
                    logger.error(f"Error uploading file {file.filename}: {str(e)}")
                    failed_files.append({
                        "filename": file.filename,
                        "error": str(e)
                    })

            return AttachmentUploadResponse(
                uploaded_files=uploaded_files,
                failed_files=failed_files,
                total_uploaded=len(uploaded_files),
                total_failed=len(failed_files),
                total_size_bytes=sum(f.file_size for f in uploaded_files)
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in upload_attachments: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ファイルアップロード中にエラーが発生しました"
            )

    def list_attachments(
        self,
        resource_type: str,
        resource_id: UUID,
        current_user_id: UUID,
        include_deleted: bool = False
    ) -> List[AttachmentResponse]:
        """添付ファイル一覧を取得する"""
        try:
            # リソースアクセス権限チェック
            self._check_resource_access(resource_type, resource_id, current_user_id)

            query = self.db.query(Attachment).filter(
                and_(
                    Attachment.resource_type == resource_type,
                    Attachment.resource_id == resource_id
                )
            )

            if not include_deleted:
                query = query.filter(Attachment.deleted_at.is_(None))

            attachments = query.order_by(Attachment.created_at.desc()).all()

            return [self._build_attachment_response(attachment) for attachment in attachments]

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error listing attachments: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="添付ファイル一覧の取得中にエラーが発生しました"
            )

    def get_attachment(self, attachment_id: UUID, current_user_id: UUID) -> Attachment:
        """添付ファイルを取得する"""
        attachment = self.db.query(Attachment).filter(
            Attachment.id == attachment_id
        ).first()

        if not attachment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="指定された添付ファイルが見つかりません"
            )

        # アクセス権限チェック
        self._check_resource_access(
            attachment.resource_type,
            attachment.resource_id,
            current_user_id
        )

        return attachment

    def get_attachment_info(self, attachment_id: UUID, current_user_id: UUID) -> AttachmentResponse:
        """添付ファイル情報を取得する"""
        attachment = self.get_attachment(attachment_id, current_user_id)
        return self._build_attachment_response(attachment)

    def delete_attachment(self, attachment_id: UUID, current_user_id: UUID, permanent: bool = False):
        """添付ファイルを削除する"""
        try:
            attachment = self.get_attachment(attachment_id, current_user_id)

            # 削除権限チェック
            if attachment.uploaded_by != current_user_id and not self._is_admin(current_user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="ファイル削除権限がありません"
                )

            if permanent:
                # 物理削除
                if os.path.exists(attachment.file_path):
                    os.remove(attachment.file_path)
                self.db.delete(attachment)
            else:
                # 論理削除
                attachment.deleted_at = datetime.utcnow()
                attachment.deleted_by = current_user_id

            self.db.commit()

            action = "物理削除" if permanent else "論理削除"
            logger.info(f"Attachment {action}: {attachment_id} by user {current_user_id}")

        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting attachment {attachment_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="添付ファイルの削除中にエラーが発生しました"
            )

    def restore_attachment(self, attachment_id: UUID, current_user_id: UUID):
        """削除された添付ファイルを復元する"""
        try:
            attachment = self.db.query(Attachment).filter(
                Attachment.id == attachment_id
            ).first()

            if not attachment:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="指定された添付ファイルが見つかりません"
                )

            if not attachment.deleted_at:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="削除されていないファイルは復元できません"
                )

            # 復元権限チェック
            if attachment.uploaded_by != current_user_id and not self._is_admin(current_user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="ファイル復元権限がありません"
                )

            attachment.deleted_at = None
            attachment.deleted_by = None
            self.db.commit()

            logger.info(f"Attachment restored: {attachment_id} by user {current_user_id}")

        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error restoring attachment {attachment_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="添付ファイルの復元中にエラーが発生しました"
            )

    async def generate_preview(self, attachment_id: UUID, current_user_id: UUID, size: Optional[str] = None):
        """ファイルプレビューを生成する"""
        try:
            attachment = self.get_attachment(attachment_id, current_user_id)

            # プレビュー対応チェック
            if not self._is_previewable(attachment.content_type):
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail="プレビューに対応していないファイル形式です"
                )

            preview_path = await self._generate_preview_file(attachment, size)

            return preview_path

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error generating preview for attachment {attachment_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="プレビュー生成中にエラーが発生しました"
            )

    def get_scan_result(self, attachment_id: UUID, current_user_id: UUID) -> dict:
        """ウイルススキャン結果を取得する"""
        try:
            attachment = self.get_attachment(attachment_id, current_user_id)

            scan_result = self.db.query(AttachmentScanResult).filter(
                AttachmentScanResult.attachment_id == attachment_id
            ).first()

            if not scan_result:
                return {
                    "attachment_id": attachment_id,
                    "status": "pending",
                    "message": "スキャン待機中です"
                }

            return {
                "attachment_id": attachment_id,
                "status": scan_result.scan_status,
                "engine": scan_result.scan_engine,
                "scanned_at": scan_result.scanned_at.isoformat() if scan_result.scanned_at else None,
                "threats_found": scan_result.threats_found,
                "details": scan_result.scan_details
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting scan result for attachment {attachment_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="スキャン結果の取得中にエラーが発生しました"
            )

    def bulk_delete_attachments(self, attachment_ids: List[UUID], current_user_id: UUID, permanent: bool = False) -> int:
        """添付ファイルを一括削除する"""
        try:
            deleted_count = 0

            for attachment_id in attachment_ids:
                try:
                    self.delete_attachment(attachment_id, current_user_id, permanent)
                    deleted_count += 1
                except HTTPException as e:
                    logger.warning(f"Failed to delete attachment {attachment_id}: {e.detail}")
                    continue

            return deleted_count

        except Exception as e:
            logger.error(f"Error in bulk delete: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="一括削除中にエラーが発生しました"
            )

    def get_storage_usage(self, current_user_id: UUID, resource_type: Optional[str] = None) -> dict:
        """ストレージ使用量を取得する"""
        try:
            base_query = self.db.query(
                func.count(Attachment.id).label('file_count'),
                func.sum(Attachment.file_size).label('total_size')
            ).filter(
                Attachment.deleted_at.is_(None)
            )

            if resource_type:
                base_query = base_query.filter(Attachment.resource_type == resource_type)

            result = base_query.first()

            # タイプ別統計
            type_stats = self.db.query(
                Attachment.resource_type,
                func.count(Attachment.id).label('count'),
                func.sum(Attachment.file_size).label('size')
            ).filter(
                Attachment.deleted_at.is_(None)
            ).group_by(Attachment.resource_type).all()

            type_breakdown = {}
            for stat in type_stats:
                type_breakdown[stat.resource_type] = {
                    "file_count": stat.count,
                    "total_size_bytes": stat.size or 0
                }

            return {
                "total_files": result.file_count or 0,
                "total_size_bytes": result.total_size or 0,
                "total_size_mb": round((result.total_size or 0) / (1024 * 1024), 2),
                "by_resource_type": type_breakdown,
                "storage_limit_bytes": settings.MAX_STORAGE_PER_TENANT,
                "storage_usage_percent": round(
                    ((result.total_size or 0) / settings.MAX_STORAGE_PER_TENANT) * 100, 2
                ) if settings.MAX_STORAGE_PER_TENANT > 0 else 0
            }

        except Exception as e:
            logger.error(f"Error getting storage usage: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ストレージ使用量の取得中にエラーが発生しました"
            )

    async def _validate_file(self, file: UploadFile) -> dict:
        """ファイルバリデーション"""
        # ファイル名チェック
        if not file.filename:
            return {"valid": False, "error": "ファイル名が指定されていません"}

        # 拡張子チェック
        file_ext = os.path.splitext(file.filename.lower())[1]
        if file_ext not in self.allowed_extensions:
            return {"valid": False, "error": f"許可されていないファイル形式です: {file_ext}"}

        # ファイルサイズチェック
        file_size = await self._get_file_size(file)
        if file_size > self.max_file_size:
            return {"valid": False, "error": f"ファイルサイズが制限（{self.max_file_size / (1024*1024):.1f}MB）を超えています"}

        # MIMEタイプチェック
        content = await file.read(1024)  # 先頭1KBを読んで判定
        await file.seek(0)  # ファイルポインタをリセット

        try:
            detected_type = magic.from_buffer(content, mime=True)
            if not self._is_allowed_mime_type(detected_type):
                return {"valid": False, "error": f"許可されていないファイル形式です: {detected_type}"}
        except Exception as e:
            logger.warning(f"MIME type detection failed: {e}")

        return {"valid": True, "error": None}

    async def _get_file_size(self, file: UploadFile) -> int:
        """ファイルサイズを取得する"""
        await file.seek(0, 2)  # ファイル末尾に移動
        size = await file.tell()
        await file.seek(0)  # ファイル先頭に戻す
        return size

    async def _save_file(
        self,
        file: UploadFile,
        resource_type: str,
        resource_id: UUID,
        file_size: int,
        current_user_id: UUID
    ) -> Attachment:
        """ファイルを保存する"""
        # ユニークファイル名生成
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"

        # 保存パス構築
        date_path = datetime.now().strftime("%Y/%m/%d")
        storage_dir = os.path.join(self.storage_path, resource_type, date_path)
        os.makedirs(storage_dir, exist_ok=True)

        file_path = os.path.join(storage_dir, unique_filename)

        # ファイル保存
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)

        # ハッシュ計算
        file_hash = hashlib.sha256(content).hexdigest()

        # MIME タイプ推定
        content_type = file.content_type or mimetypes.guess_type(file.filename)[0]

        # データベース保存
        attachment = Attachment(
            resource_type=resource_type,
            resource_id=resource_id,
            original_filename=file.filename,
            stored_filename=unique_filename,
            file_path=file_path,
            file_size=file_size,
            content_type=content_type,
            file_hash=file_hash,
            uploaded_by=current_user_id
        )

        self.db.add(attachment)
        self.db.commit()
        self.db.refresh(attachment)

        return attachment

    async def _schedule_virus_scan(self, attachment_id: UUID):
        """ウイルススキャンをスケジュールする（非同期処理）"""
        # 実際の実装では、タスクキューに追加
        # ここでは簡単な実装例
        try:
            scan_result = AttachmentScanResult(
                attachment_id=attachment_id,
                scan_status="clean",
                scan_engine="mock_scanner",
                scanned_at=datetime.utcnow(),
                threats_found=0,
                scan_details={"message": "No threats detected"}
            )

            self.db.add(scan_result)
            self.db.commit()

        except Exception as e:
            logger.error(f"Error scheduling virus scan for attachment {attachment_id}: {str(e)}")

    def _check_resource_access(self, resource_type: str, resource_id: UUID, user_id: UUID):
        """リソースへのアクセス権限をチェックする"""
        # 実際の実装では、リソースタイプに応じて権限チェック
        # 簡略化のため、ここでは常に許可
        pass

    def _is_admin(self, user_id: UUID) -> bool:
        """ユーザーが管理者かチェックする"""
        # 実際の実装では、ユーザーテーブルからロールを確認
        return False  # 簡略化

    def _is_allowed_mime_type(self, mime_type: str) -> bool:
        """許可されたMIMEタイプかチェックする"""
        allowed_types = {
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/bmp',
            'image/tiff',
            'application/zip',
            'application/x-7z-compressed',
            'application/x-tar',
            'application/gzip',
            'application/x-rar-compressed'
        }
        return mime_type in allowed_types

    def _is_previewable(self, content_type: str) -> bool:
        """プレビュー可能なファイルタイプかチェックする"""
        previewable_types = {
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/bmp',
            'application/pdf',
            'text/plain',
            'text/csv'
        }
        return content_type in previewable_types

    async def _generate_preview_file(self, attachment: Attachment, size: Optional[str] = None) -> str:
        """プレビューファイルを生成する"""
        # 画像ファイルの場合はサムネイル生成
        if attachment.content_type.startswith('image/'):
            return await self._generate_image_thumbnail(attachment, size)

        # PDFの場合は1ページ目をサムネイル化
        elif attachment.content_type == 'application/pdf':
            return await self._generate_pdf_thumbnail(attachment, size)

        # テキストファイルの場合は先頭部分を返す
        elif attachment.content_type.startswith('text/'):
            return await self._generate_text_preview(attachment)

        else:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="プレビューに対応していないファイル形式です"
            )

    async def _generate_image_thumbnail(self, attachment: Attachment, size: Optional[str] = None) -> str:
        """画像サムネイルを生成する"""
        size_mapping = {
            "thumbnail": (150, 150),
            "small": (300, 300),
            "medium": (600, 600),
            "large": (1200, 1200)
        }

        target_size = size_mapping.get(size, (300, 300))

        try:
            with Image.open(attachment.file_path) as img:
                # サムネイル生成
                img.thumbnail(target_size, Image.Resampling.LANCZOS)

                # プレビューファイル保存
                preview_dir = os.path.join(os.path.dirname(attachment.file_path), "previews")
                os.makedirs(preview_dir, exist_ok=True)

                preview_filename = f"{os.path.splitext(attachment.stored_filename)[0]}_preview_{size or 'medium'}.jpg"
                preview_path = os.path.join(preview_dir, preview_filename)

                # JPEG形式で保存
                rgb_img = img.convert('RGB')
                rgb_img.save(preview_path, 'JPEG', quality=85, optimize=True)

                return preview_path

        except Exception as e:
            logger.error(f"Error generating image thumbnail: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="サムネイル生成中にエラーが発生しました"
            )

    async def _generate_pdf_thumbnail(self, attachment: Attachment, size: Optional[str] = None) -> str:
        """PDF サムネイルを生成する"""
        # PDF->画像変換は pdf2image などのライブラリを使用
        # ここでは簡単な実装例
        try:
            # 実際の実装では pdf2image を使用
            # from pdf2image import convert_from_path
            # images = convert_from_path(attachment.file_path, first_page=1, last_page=1)
            # if images:
            #     return await self._save_pdf_thumbnail(images[0], attachment, size)

            # デモ用の実装
            return attachment.file_path

        except Exception as e:
            logger.error(f"Error generating PDF thumbnail: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="PDFサムネイル生成中にエラーが発生しました"
            )

    async def _generate_text_preview(self, attachment: Attachment) -> str:
        """テキストプレビューを生成する"""
        try:
            with open(attachment.file_path, 'r', encoding='utf-8') as f:
                preview_text = f.read(1000)  # 先頭1000文字

            # プレビューファイル保存
            preview_dir = os.path.join(os.path.dirname(attachment.file_path), "previews")
            os.makedirs(preview_dir, exist_ok=True)

            preview_filename = f"{os.path.splitext(attachment.stored_filename)[0]}_preview.txt"
            preview_path = os.path.join(preview_dir, preview_filename)

            with open(preview_path, 'w', encoding='utf-8') as f:
                f.write(preview_text)

            return preview_path

        except Exception as e:
            logger.error(f"Error generating text preview: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="テキストプレビュー生成中にエラーが発生しました"
            )

    def _build_attachment_response(self, attachment: Attachment) -> AttachmentResponse:
        """添付ファイルレスポンスを構築する"""
        return AttachmentResponse(
            id=attachment.id,
            resource_type=attachment.resource_type,
            resource_id=attachment.resource_id,
            original_filename=attachment.original_filename,
            file_size=attachment.file_size,
            content_type=attachment.content_type,
            file_hash=attachment.file_hash,
            is_deleted=attachment.deleted_at is not None,
            uploaded_by=attachment.uploaded_by,
            uploaded_at=attachment.created_at,
            download_url=f"/api/v1/attachments/download/{attachment.id}",
            preview_url=f"/api/v1/attachments/preview/{attachment.id}" if self._is_previewable(attachment.content_type) else None
        )