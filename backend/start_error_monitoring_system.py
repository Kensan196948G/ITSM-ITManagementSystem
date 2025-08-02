#!/usr/bin/env python3
"""
MCP Playwright エラー検知・修復システム起動スクリプト
"""

import asyncio
import argparse
import logging
import signal
import sys
from pathlib import Path

# プロジェクトルートをパスに追加
sys.path.insert(0, str(Path(__file__).parent))

from app.services.infinite_auto_repair_system import InfiniteAutoRepairSystem


def setup_logging(log_level: str = "INFO", log_file: str = None):
    """ログ設定"""
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    handlers = [logging.StreamHandler(sys.stdout)]

    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(logging.FileHandler(log_file))

    logging.basicConfig(
        level=getattr(logging, log_level.upper()), format=log_format, handlers=handlers
    )


def signal_handler(signum, frame):
    """シグナルハンドラー"""
    print(f"\nReceived signal {signum}. Shutting down gracefully...")
    sys.exit(0)


async def main():
    """メイン実行関数"""
    parser = argparse.ArgumentParser(
        description="ITSM Error Monitoring and Auto-Repair System"
    )
    parser.add_argument(
        "--base-url",
        default="http://192.168.3.135:8000",
        help="Base URL for API monitoring",
    )
    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        default="INFO",
        help="Log level",
    )
    parser.add_argument(
        "--log-file", default="logs/error_monitoring_system.log", help="Log file path"
    )
    parser.add_argument("--config-file", help="Configuration file path")
    parser.add_argument("--daemon", action="store_true", help="Run as daemon")

    args = parser.parse_args()

    # ログ設定
    setup_logging(args.log_level, args.log_file)
    logger = logging.getLogger(__name__)

    # シグナルハンドラー設定
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    logger.info("Starting ITSM Error Monitoring and Auto-Repair System")
    logger.info(f"Base URL: {args.base_url}")
    logger.info(f"Log Level: {args.log_level}")

    try:
        # システム初期化
        system = InfiniteAutoRepairSystem(base_url=args.base_url)
        await system.initialize()

        logger.info("System initialized successfully")

        # 無限ループ開始
        await system.start_infinite_loop()

    except KeyboardInterrupt:
        logger.info("Shutdown requested by user")
    except Exception as e:
        logger.error(f"System error: {e}", exc_info=True)
        return 1
    finally:
        try:
            await system.shutdown()
            logger.info("System shutdown completed")
        except:
            pass

    return 0


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\nShutdown requested. Exiting...")
        sys.exit(0)
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)
