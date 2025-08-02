#!/usr/bin/env python3
"""
APIエラー監視・修復システム 自動起動スクリプト
"""

import asyncio
import logging
import sys
import signal
import subprocess
import time
import os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("logs/monitoring.log"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


class MonitoringService:
    """監視サービス"""

    def __init__(self):
        self.backend_path = Path(
            "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend"
        )
        self.server_process = None
        self.monitoring_task = None
        self.running = False

    async def start_api_server(self):
        """APIサーバーを起動"""
        logger.info("🚀 APIサーバーを起動中...")

        try:
            # サーバー起動
            cmd = [sys.executable, "start_server.py"]
            self.server_process = subprocess.Popen(
                cmd,
                cwd=str(self.backend_path),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            # 起動確認のため少し待機
            await asyncio.sleep(5)

            if self.server_process.poll() is None:
                logger.info("✅ APIサーバーが起動しました")
                return True
            else:
                stdout, stderr = self.server_process.communicate()
                logger.error(f"❌ APIサーバー起動失敗: {stderr}")
                return False

        except Exception as e:
            logger.error(f"❌ APIサーバー起動エラー: {e}")
            return False

    async def start_error_monitoring(self):
        """エラー監視を開始"""
        logger.info("🔍 エラー監視を開始中...")

        try:
            # パスを追加してapi_error_monitorをインポート
            sys.path.append(str(self.backend_path))
            from app.services.api_error_monitor import api_monitor

            # 監視開始
            self.monitoring_task = asyncio.create_task(
                api_monitor.start_monitoring(interval=30)
            )

            logger.info("✅ エラー監視が開始されました")
            return True

        except Exception as e:
            logger.error(f"❌ エラー監視開始エラー: {e}")
            return False

    async def check_api_health(self):
        """API健全性を定期チェック"""
        import aiohttp

        while self.running:
            try:
                async with aiohttp.ClientSession(
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as session:
                    async with session.get(
                        "http://192.168.3.135:8000/health"
                    ) as response:
                        if response.status == 200:
                            logger.debug("✅ API health check passed")
                        else:
                            logger.warning(
                                f"⚠️ API health check failed: {response.status}"
                            )
                            await self.restart_api_if_needed()
            except Exception as e:
                logger.warning(f"⚠️ API health check error: {e}")
                await self.restart_api_if_needed()

            await asyncio.sleep(60)  # 1分間隔でチェック

    async def restart_api_if_needed(self):
        """必要に応じてAPIサーバーを再起動"""
        if self.server_process and self.server_process.poll() is not None:
            logger.warning("🔄 APIサーバーが停止しています。再起動を試行...")
            await self.start_api_server()

    async def start_all_services(self):
        """全サービスを開始"""
        self.running = True

        # APIサーバー起動
        server_started = await self.start_api_server()
        if not server_started:
            logger.error("❌ APIサーバーの起動に失敗しました")
            return False

        # エラー監視開始
        monitoring_started = await self.start_error_monitoring()
        if not monitoring_started:
            logger.error("❌ エラー監視の開始に失敗しました")
            return False

        # ヘルスチェック開始
        health_check_task = asyncio.create_task(self.check_api_health())

        logger.info("🎉 全サービスが起動しました")

        try:
            # 監視タスクが終了するまで待機
            await self.monitoring_task
        except asyncio.CancelledError:
            logger.info("🛑 監視タスクがキャンセルされました")
        finally:
            health_check_task.cancel()
            await self.cleanup()

        return True

    async def cleanup(self):
        """リソースクリーンアップ"""
        logger.info("🧹 リソースをクリーンアップ中...")

        # 監視停止
        if self.monitoring_task:
            self.monitoring_task.cancel()

        # APIサーバー停止
        if self.server_process:
            self.server_process.terminate()
            try:
                self.server_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.server_process.kill()
                self.server_process.wait()

        self.running = False
        logger.info("✅ クリーンアップ完了")

    def signal_handler(self, signum, frame):
        """シグナルハンドラー"""
        logger.info(f"🛑 シグナル {signum} を受信しました。終了処理を開始...")
        self.running = False

        # 監視タスクをキャンセル
        if self.monitoring_task:
            self.monitoring_task.cancel()


async def main():
    """メイン実行関数"""
    # ログディレクトリ作成
    logs_dir = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs")
    logs_dir.mkdir(exist_ok=True)

    # 監視サービス開始
    service = MonitoringService()

    # シグナルハンドラー設定
    signal.signal(signal.SIGINT, service.signal_handler)
    signal.signal(signal.SIGTERM, service.signal_handler)

    try:
        logger.info("🚀 監視・修復システムを開始します")
        success = await service.start_all_services()

        if success:
            logger.info("✅ システム正常終了")
        else:
            logger.error("❌ システム異常終了")
            sys.exit(1)

    except KeyboardInterrupt:
        logger.info("🛑 Ctrl+C で終了要求を受信")
    except Exception as e:
        logger.error(f"❌ 予期しないエラー: {e}")
        sys.exit(1)
    finally:
        await service.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
