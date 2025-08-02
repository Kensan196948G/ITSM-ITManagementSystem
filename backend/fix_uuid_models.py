#!/usr/bin/env python3
"""
SQLite対応のためのUUID型修正スクリプト
全てのモデルファイルでUUID型をSQLite対応にする
"""

import os
import re


def fix_uuid_imports_and_usage(file_path):
    """ファイル内のUUID関連のimportと使用法を修正"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        original_content = content

        # すでに修正済みかチェック
        if "from app.models.common import UUID" in content:
            print(f"Already fixed: {file_path}")
            return

        # UUID importを修正
        content = re.sub(
            r"from sqlalchemy import (.*)UUID(.*)",
            lambda m: f"from sqlalchemy import {m.group(1).replace('UUID, ', '').replace(', UUID', '').replace('UUID', '').strip().rstrip(',')}{m.group(2)}",
            content,
        )

        # uuid importとcommon UUID importを追加
        if "import uuid" not in content:
            content = re.sub(
                r"(from app\.db\.base import Base)",
                r"import uuid\n\nfrom app.db.base import Base\nfrom app.models.common import UUID",
                content,
            )
        elif "from app.models.common import UUID" not in content:
            content = re.sub(
                r"(from app\.db\.base import Base)",
                r"\1\nfrom app.models.common import UUID",
                content,
            )

        # UUID使用法を修正
        content = re.sub(
            r"Column\(UUID\(as_uuid=True\)(.*?)server_default=func\.gen_random_uuid\(\)",
            r"Column(UUID()\1default=uuid.uuid4",
            content,
        )

        # 残りのUUID(as_uuid=True)をUUID()に修正
        content = re.sub(r"UUID\(as_uuid=True\)", "UUID()", content)

        # server_default=func.gen_random_uuid()をdefault=uuid.uuid4に修正
        content = re.sub(
            r"server_default=func\.gen_random_uuid\(\)", "default=uuid.uuid4", content
        )

        if content != original_content:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"Fixed: {file_path}")
        else:
            print(f"No changes needed: {file_path}")

    except Exception as e:
        print(f"Error fixing {file_path}: {e}")


def main():
    """メイン処理"""
    models_dir = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/app/models"

    # 修正対象のファイル一覧
    model_files = ["change.py", "problem.py"]

    for filename in model_files:
        file_path = os.path.join(models_dir, filename)
        if os.path.exists(file_path):
            fix_uuid_imports_and_usage(file_path)
        else:
            print(f"File not found: {file_path}")

    print("UUID修正完了")


if __name__ == "__main__":
    main()
