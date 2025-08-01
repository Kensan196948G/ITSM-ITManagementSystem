#!/usr/bin/env python3
"""ITSM バックエンドサーバー起動スクリプト"""

import sys
import os
import logging
import uvicorn

# プロジェクトルートをPythonパスに追加
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.db.init_db import init_db


def setup_logging():
    """ログ設定"""
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )


def initialize_database():
    """データベース初期化"""
    try:
        print("データベースを初期化しています...")
        init_db()
        print("✅ データベース初期化完了")
    except Exception as e:
        print(f"❌ データベース初期化エラー: {str(e)}")
        sys.exit(1)


def main():
    """メイン処理"""
    print(f"🚀 {settings.PROJECT_NAME} v{settings.PROJECT_VERSION} を起動します")
    print(f"🌍 環境: {settings.ENVIRONMENT}")
    
    setup_logging()
    
    # データベース初期化
    initialize_database()
    
    # サーバー設定
    host = "0.0.0.0"
    port = 8000
    reload = settings.ENVIRONMENT == "development"
    
    print(f"📡 サーバー起動中... http://{host}:{port}")
    print(f"📚 API文書: http://{host}:{port}{settings.API_V1_STR}/docs")
    print(f"🔄 リロード: {'有効' if reload else '無効'}")
    
    # Uvicornサーバー起動
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True
    )


if __name__ == "__main__":
    main()