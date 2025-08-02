"""パフォーマンス最適化初期化スクリプト"""

import logging
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.core.cache import init_cache
from app.core.performance import init_performance_optimizations

logger = logging.getLogger(__name__)


def initialize_performance_system():
    """パフォーマンス最適化システムの初期化"""

    logger.info("🚀 パフォーマンス最適化システムを初期化中...")

    try:
        # 1. キャッシュシステムの初期化
        logger.info("📦 キャッシュシステムを初期化中...")
        init_cache()

        # 2. データベース最適化の初期化
        logger.info("🗄️ データベース最適化を初期化中...")
        db = next(get_db())
        try:
            init_performance_optimizations(db)
        finally:
            db.close()

        # 3. パフォーマンス監視の設定
        logger.info("📊 パフォーマンス監視を設定中...")
        _configure_logging()

        logger.info("✅ パフォーマンス最適化システムの初期化が完了しました")

        return True

    except Exception as e:
        logger.error(f"❌ パフォーマンス最適化システムの初期化に失敗: {e}")
        return False


def _configure_logging():
    """ログ設定の最適化"""

    # パフォーマンス専用ロガーの設定
    perf_logger = logging.getLogger("performance")
    perf_logger.setLevel(logging.INFO)

    # ハンドラーが既に存在する場合は追加しない
    if not perf_logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        perf_logger.addHandler(handler)

    # SQLクエリロギングの設定（開発環境のみ）
    import os

    if os.getenv("ENVIRONMENT") == "development":
        sql_logger = logging.getLogger("sqlalchemy.engine")
        sql_logger.setLevel(logging.INFO)


if __name__ == "__main__":
    # スタンドアロン実行時の初期化
    initialize_performance_system()
