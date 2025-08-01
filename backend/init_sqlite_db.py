#!/usr/bin/env python3
"""SQLiteデータベース初期化スクリプト"""

import sys
import os
import logging

# プロジェクトルートをPythonパスに追加
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.init_db import init_db

def setup_logging():
    """ログ設定"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('init_db.log')
        ]
    )


def main():
    """メイン処理"""
    print("ITSM SQLiteデータベースの初期化を開始します...")
    
    setup_logging()
    logger = logging.getLogger(__name__)
    
    try:
        # データベース初期化
        init_db()
        
        print("✅ データベースの初期化が完了しました!")
        print("📁 データベースファイル: itsm.db")
        print("📄 ログファイル: init_db.log")
        
        logger.info("データベース初期化が正常に完了しました")
        
    except Exception as e:
        print(f"❌ データベース初期化でエラーが発生しました: {str(e)}")
        logger.error(f"データベース初期化エラー: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()