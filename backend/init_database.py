#!/usr/bin/env python3
"""データベース初期化スクリプト"""

import asyncio
import sys
from pathlib import Path

# プロジェクトルートをパスに追加
sys.path.append(str(Path(__file__).parent))

from app.core.config import settings
from app.db.base import Base, engine, async_engine
from app.models import *  # すべてのモデルをインポート


def create_tables():
    """テーブルを作成する"""
    print("Creating database tables...")

    try:
        # 同期版でテーブル作成
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully!")

    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        sys.exit(1)


async def create_tables_async():
    """非同期でテーブルを作成する"""
    print("Creating database tables (async)...")

    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created successfully (async)!")

    except Exception as e:
        print(f"❌ Error creating tables (async): {e}")
        sys.exit(1)


def main():
    """メイン関数"""
    print(f"Database URL: {settings.DATABASE_URL}")
    print(f"Async Database URL: {settings.ASYNC_DATABASE_URL}")

    # 同期版でテーブル作成
    create_tables()

    # 非同期版でもテーブル作成
    # asyncio.run(create_tables_async())


if __name__ == "__main__":
    main()
