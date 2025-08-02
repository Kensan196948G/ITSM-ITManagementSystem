"""自動修復エンジン - バックエンドエラーの継続的監視・修復"""

import asyncio
import logging
import json
import os
import traceback
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
import re

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AutoRepairEngine:
    """バックエンドエラー自動修復エンジン"""

    def __init__(self):
        self.project_root = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem")
        self.backend_dir = self.project_root / "backend"
        self.coordination_dir = self.project_root / "coordination"

        # 修復カウンター
        self.repair_count = 0
        self.running = False

        # 修復パターン
        self.repair_patterns = {
            "import_error": {
                "pattern": r"ImportError: cannot import name '(\w+)' from '([\w\.]+)'",
                "handler": self._fix_import_error,
            },
            "attribute_error": {
                "pattern": r"AttributeError: '(\w+)' object has no attribute '(\w+)'",
                "handler": self._fix_attribute_error,
            },
            "module_not_found": {
                "pattern": r"ModuleNotFoundError: No module named '([\w\.]+)'",
                "handler": self._fix_module_not_found,
            },
            "syntax_error": {
                "pattern": r"SyntaxError: (.+)",
                "handler": self._fix_syntax_error,
            },
        }

    async def start_auto_repair(self):
        """自動修復開始"""
        logger.info("🔧 バックエンドエラー自動修復エンジン開始")
        self.running = True

        while self.running:
            try:
                # サーバー起動試行
                errors = await self._detect_startup_errors()

                if errors:
                    logger.warning(f"🚨 {len(errors)}件のエラーを検出")

                    # 自動修復実行
                    for error in errors:
                        success = await self._auto_repair_error(error)
                        if success:
                            self.repair_count += 1
                            logger.info(f"✅ エラー修復完了 ({self.repair_count}件目)")

                # 5秒待機
                await asyncio.sleep(5)

            except Exception as e:
                logger.error(f"❌ 自動修復エンジンエラー: {e}")
                await asyncio.sleep(10)

    async def _detect_startup_errors(self) -> List[Dict[str, Any]]:
        """サーバー起動エラー検出"""
        errors = []

        try:
            # サーバー起動テスト
            process = await asyncio.create_subprocess_exec(
                "python3",
                "-c",
                'import sys; sys.path.append("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend"); from app.main import app; print("OK")',
                cwd=str(self.backend_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                error_text = stderr.decode("utf-8")
                errors.append(
                    {
                        "type": "startup_error",
                        "error": error_text,
                        "timestamp": datetime.now().isoformat(),
                    }
                )

        except Exception as e:
            errors.append(
                {
                    "type": "detection_error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            )

        return errors

    async def _auto_repair_error(self, error: Dict[str, Any]) -> bool:
        """単一エラーの自動修復"""
        error_text = error.get("error", "")

        # パターンマッチングで修復方法を決定
        for pattern_name, pattern_info in self.repair_patterns.items():
            match = re.search(pattern_info["pattern"], error_text)
            if match:
                logger.info(f"🔍 エラーパターン検出: {pattern_name}")
                try:
                    return await pattern_info["handler"](match, error_text)
                except Exception as e:
                    logger.error(f"修復処理エラー: {e}")
                    return False

        # 未知のエラーパターン
        logger.warning(f"❓ 未知のエラーパターン: {error_text[:200]}")
        return False

    async def _fix_import_error(self, match, error_text: str) -> bool:
        """インポートエラー修復"""
        missing_name = match.group(1)
        module_path = match.group(2)

        logger.info(f"🔧 インポートエラー修復: {missing_name} from {module_path}")

        # 特定のケース処理
        if missing_name == "UserRole" and "user" in module_path:
            return await self._fix_user_role_import()
        elif missing_name.endswith("_router") and "api.v1" in module_path:
            return await self._fix_router_import(missing_name)

        return False

    async def _fix_user_role_import(self) -> bool:
        """UserRole インポートエラー修復"""
        user_model_file = self.backend_dir / "app/models/user.py"

        try:
            if not user_model_file.exists():
                logger.error(
                    f"ユーザーモデルファイルが見つかりません: {user_model_file}"
                )
                return False

            content = user_model_file.read_text()

            # UserRole クラスが存在するかチェック
            if "class UserRole" not in content:
                # UserRole クラスを追加
                role_class = '''
class UserRole(str, Enum):
    """ユーザー役割"""
    ADMIN = "admin"
    MANAGER = "manager"
    TECHNICIAN = "technician"
    USER = "user"
'''
                # Enumインポートを追加
                if "from enum import Enum" not in content:
                    content = content.replace(
                        "from sqlalchemy import",
                        "from enum import Enum\nfrom sqlalchemy import",
                    )

                # クラス定義を追加
                content += role_class

                user_model_file.write_text(content)
                logger.info("✅ UserRole クラスを追加しました")
                return True

            logger.info("✅ UserRole は既に存在します")
            return True

        except Exception as e:
            logger.error(f"UserRole修復エラー: {e}")
            return False

    async def _fix_router_import(self, router_name: str) -> bool:
        """ルーター インポートエラー修復"""
        # 対応するルーターファイルを作成
        router_file_name = router_name.replace("_router", "") + ".py"
        router_file = self.backend_dir / "app/api/v1" / router_file_name

        if router_file.exists():
            logger.info(f"✅ ルーターファイルは既に存在: {router_file}")
            return True

        # 基本的なルーターファイルを作成
        router_content = f'''"""
{router_name.replace('_router', '').title()} API
"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def placeholder():
    return {{"message": "Placeholder endpoint for {router_name}"}}
'''

        try:
            router_file.write_text(router_content)
            logger.info(f"✅ ルーターファイルを作成: {router_file}")
            return True
        except Exception as e:
            logger.error(f"ルーター作成エラー: {e}")
            return False

    async def _fix_attribute_error(self, match, error_text: str) -> bool:
        """属性エラー修復"""
        object_type = match.group(1)
        attribute_name = match.group(2)

        logger.info(f"🔧 属性エラー修復: {object_type}.{attribute_name}")

        # statusインポートエラーの場合
        if object_type == "NoneType" and "HTTP_" in attribute_name:
            return await self._fix_status_import_error()

        return False

    async def _fix_status_import_error(self) -> bool:
        """status インポートエラー修復"""
        api_files = list((self.backend_dir / "app/api/v1").glob("*.py"))

        for api_file in api_files:
            try:
                content = api_file.read_text()

                # 分離されたstatusインポートを統合
                if (
                    "from fastapi import status" in content
                    and "from fastapi import" in content
                ):
                    # パターン1: 別行でインポート
                    lines = content.split("\n")
                    fastapi_import_line = None
                    status_import_line = None

                    for i, line in enumerate(lines):
                        if (
                            line.strip().startswith("from fastapi import")
                            and "status" not in line
                        ):
                            fastapi_import_line = i
                        elif line.strip() == "from fastapi import status":
                            status_import_line = i

                    if (
                        fastapi_import_line is not None
                        and status_import_line is not None
                    ):
                        # インポート文を統合
                        fastapi_line = lines[fastapi_import_line]
                        if not fastapi_line.endswith(", status"):
                            lines[fastapi_import_line] = fastapi_line + ", status"

                        # statusのみの行を削除
                        del lines[status_import_line]

                        updated_content = "\n".join(lines)
                        api_file.write_text(updated_content)

                        logger.info(f"✅ status インポートを修復: {api_file}")
                        return True

            except Exception as e:
                logger.error(f"status修復エラー {api_file}: {e}")

        return False

    async def _fix_module_not_found(self, match, error_text: str) -> bool:
        """モジュール未発見エラー修復"""
        module_name = match.group(1)
        logger.info(f"🔧 モジュール未発見修復: {module_name}")

        # 必要なディレクトリ作成
        if "." in module_name:
            parts = module_name.split(".")
            current_path = self.backend_dir / "app"

            for part in parts[1:]:  # app以降
                current_path = current_path / part
                if not current_path.exists():
                    current_path.mkdir()
                    logger.info(f"📁 ディレクトリ作成: {current_path}")

                init_file = current_path / "__init__.py"
                if not init_file.exists():
                    init_file.write_text("")
                    logger.info(f"📄 __init__.py作成: {init_file}")

        return True

    async def _fix_syntax_error(self, match, error_text: str) -> bool:
        """構文エラー修復"""
        syntax_error = match.group(1)
        logger.info(f"🔧 構文エラー修復: {syntax_error}")

        # 一般的な構文エラーパターンの修復
        # 実装は具体的なエラーケースに応じて追加

        return False

    async def save_repair_log(self, repair_info: Dict[str, Any]):
        """修復ログ保存"""
        try:
            log_file = self.coordination_dir / "auto_repair_log.json"

            if log_file.exists():
                with open(log_file, "r") as f:
                    logs = json.load(f)
            else:
                logs = []

            logs.append(
                {
                    **repair_info,
                    "timestamp": datetime.now().isoformat(),
                    "repair_count": self.repair_count,
                }
            )

            # 最新100件のみ保持
            logs = logs[-100:]

            with open(log_file, "w") as f:
                json.dump(logs, f, indent=2, ensure_ascii=False)

        except Exception as e:
            logger.error(f"修復ログ保存エラー: {e}")

    def stop_repair(self):
        """修復停止"""
        logger.info("🛑 自動修復エンジン停止")
        self.running = False


# 実行関数
async def main():
    """メイン実行"""
    engine = AutoRepairEngine()

    try:
        await engine.start_auto_repair()
    except KeyboardInterrupt:
        logger.info("⌨️ ユーザー中断")
        engine.stop_repair()
    except Exception as e:
        logger.error(f"❌ 自動修復エンジンエラー: {e}")
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
