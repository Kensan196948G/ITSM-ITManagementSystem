#!/usr/bin/env python3
"""
無限ループエラー監視・修復自動化システム
ITSM WebUIとAPIの完全自動エラー検知・修復システム
"""

import asyncio
import json
import time
import logging
import subprocess
import signal
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import aiohttp
import psutil

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("infinite-error-monitor.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


class InfiniteErrorMonitor:
    """無限ループエラー監視・修復システム"""

    def __init__(self):
        self.is_running = True
        self.config = {
            "frontend_url": "http://192.168.3.135:3000",
            "admin_url": "http://192.168.3.135:3000/admin",
            "backend_url": "http://192.168.3.135:8000",
            "api_docs_url": "http://192.168.3.135:8000/docs",
            "health_url": "http://192.168.3.135:8000/health",
            "monitor_interval": 60,  # 60秒間隔
            "max_consecutive_errors": 5,
            "restart_threshold": 10,
        }
        self.error_count = 0
        self.consecutive_errors = 0
        self.last_health_check = None
        self.stats = {
            "total_checks": 0,
            "total_errors_found": 0,
            "total_errors_fixed": 0,
            "frontend_errors": 0,
            "backend_errors": 0,
            "start_time": datetime.now(),
            "last_error_time": None,
        }

        # プロセス管理
        self.frontend_process = None
        self.backend_process = None

        # シグナルハンドラー設定
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)

    def signal_handler(self, signum, frame):
        """シグナルハンドラー - 正常終了"""
        logger.info(f"シグナル {signum} を受信。正常終了を開始...")
        self.is_running = False
        self.cleanup()
        sys.exit(0)

    def cleanup(self):
        """リソースのクリーンアップ"""
        logger.info("リソースをクリーンアップしています...")
        self.generate_final_report()

    async def check_url_health(
        self, url: str, timeout: int = 10
    ) -> Tuple[bool, str, Optional[Dict]]:
        """URLの健全性チェック"""
        try:
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as session:
                start_time = time.time()
                async with session.get(url) as response:
                    response_time = time.time() - start_time

                    if response.status == 200:
                        return (
                            True,
                            "OK",
                            {
                                "status_code": response.status,
                                "response_time": response_time,
                                "content_type": response.headers.get(
                                    "content-type", "unknown"
                                ),
                            },
                        )
                    else:
                        return (
                            False,
                            f"HTTP {response.status}",
                            {
                                "status_code": response.status,
                                "response_time": response_time,
                            },
                        )
        except asyncio.TimeoutError:
            return False, "Timeout", None
        except aiohttp.ClientError as e:
            return False, f"Connection Error: {str(e)}", None
        except Exception as e:
            return False, f"Unknown Error: {str(e)}", None

    async def run_playwright_check(self) -> Tuple[bool, List[str]]:
        """Playwrightによるフロントエンドエラーチェック"""
        try:
            logger.info("Playwrightフロントエンドエラーチェックを実行中...")

            # フロントエンド監視スクリプト実行
            process = await asyncio.create_subprocess_exec(
                "bash",
                "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/frontend/run-comprehensive-webui-monitor.sh",
                "--once",
                cwd="/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/frontend",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                logger.info("✅ フロントエンドエラーチェック完了")
                return True, []
            else:
                error_msg = stderr.decode() if stderr else "Unknown error"
                logger.error(f"❌ フロントエンドエラーチェック失敗: {error_msg}")
                return False, [error_msg]

        except Exception as e:
            logger.error(f"Playwrightチェック実行エラー: {str(e)}")
            return False, [str(e)]

    async def run_backend_check(self) -> Tuple[bool, List[str]]:
        """バックエンドAPIエラーチェック"""
        try:
            logger.info("バックエンドAPIエラーチェックを実行中...")

            # バックエンド監視スクリプト実行
            process = await asyncio.create_subprocess_exec(
                "python3",
                "monitor_api.py",
                "health",
                cwd="/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                logger.info("✅ バックエンドAPIエラーチェック完了")
                return True, []
            else:
                error_msg = stderr.decode() if stderr else "Unknown error"
                logger.error(f"❌ バックエンドAPIエラーチェック失敗: {error_msg}")
                return False, [error_msg]

        except Exception as e:
            logger.error(f"バックエンドチェック実行エラー: {str(e)}")
            return False, [str(e)]

    async def auto_fix_errors(
        self, frontend_errors: List[str], backend_errors: List[str]
    ) -> bool:
        """エラーの自動修復"""
        fix_success = True

        # フロントエンドエラー修復
        if frontend_errors:
            logger.info("🔧 フロントエンドエラーの自動修復を開始...")
            try:
                process = await asyncio.create_subprocess_exec(
                    "bash",
                    "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/frontend/run-comprehensive-webui-monitor.sh",
                    "--fix",
                    cwd="/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/frontend",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )

                await process.communicate()
                if process.returncode == 0:
                    logger.info("✅ フロントエンドエラー修復完了")
                    self.stats["total_errors_fixed"] += len(frontend_errors)
                else:
                    logger.error("❌ フロントエンドエラー修復失敗")
                    fix_success = False

            except Exception as e:
                logger.error(f"フロントエンドエラー修復エラー: {str(e)}")
                fix_success = False

        # バックエンドエラー修復
        if backend_errors:
            logger.info("🔧 バックエンドエラーの自動修復を開始...")
            try:
                process = await asyncio.create_subprocess_exec(
                    "python3",
                    "monitor_api.py",
                    "fix-errors",
                    cwd="/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )

                await process.communicate()
                if process.returncode == 0:
                    logger.info("✅ バックエンドエラー修復完了")
                    self.stats["total_errors_fixed"] += len(backend_errors)
                else:
                    logger.error("❌ バックエンドエラー修復失敗")
                    fix_success = False

            except Exception as e:
                logger.error(f"バックエンドエラー修復エラー: {str(e)}")
                fix_success = False

        return fix_success

    async def restart_services_if_needed(self):
        """必要に応じてサービスの再起動"""
        if self.consecutive_errors >= self.config["restart_threshold"]:
            logger.warning("🔄 連続エラーが閾値を超過。サービスを再起動します...")

            try:
                # フロントエンド再起動
                logger.info("フロントエンドサービスを再起動中...")
                restart_process = await asyncio.create_subprocess_exec(
                    "bash",
                    "-c",
                    "cd /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/frontend && npm start",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )

                # バックエンド再起動
                logger.info("バックエンドサービスを再起動中...")
                restart_process = await asyncio.create_subprocess_exec(
                    "bash",
                    "-c",
                    "cd /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )

                # 再起動後の待機
                await asyncio.sleep(30)
                self.consecutive_errors = 0
                logger.info("✅ サービス再起動完了")

            except Exception as e:
                logger.error(f"サービス再起動エラー: {str(e)}")

    def generate_status_report(self) -> Dict:
        """ステータスレポート生成"""
        uptime = datetime.now() - self.stats["start_time"]
        error_rate = (
            self.stats["total_errors_found"] / max(self.stats["total_checks"], 1)
        ) * 100
        fix_rate = (
            self.stats["total_errors_fixed"] / max(self.stats["total_errors_found"], 1)
        ) * 100

        return {
            "monitor_status": "running" if self.is_running else "stopped",
            "uptime_hours": uptime.total_seconds() / 3600,
            "total_checks": self.stats["total_checks"],
            "total_errors_found": self.stats["total_errors_found"],
            "total_errors_fixed": self.stats["total_errors_fixed"],
            "error_rate_percent": round(error_rate, 2),
            "fix_success_rate_percent": round(fix_rate, 2),
            "consecutive_errors": self.consecutive_errors,
            "last_check_time": (
                self.last_health_check.isoformat() if self.last_health_check else None
            ),
            "last_error_time": (
                self.stats["last_error_time"].isoformat()
                if self.stats["last_error_time"]
                else None
            ),
            "system_health": (
                "good"
                if self.consecutive_errors < 3
                else "warning" if self.consecutive_errors < 7 else "critical"
            ),
        }

    def generate_final_report(self):
        """最終レポート生成"""
        report = self.generate_status_report()
        report_file = f"infinite-monitor-final-report-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        logger.info(f"📊 最終レポートを生成しました: {report_file}")

        # サマリー表示
        uptime = datetime.now() - self.stats["start_time"]
        logger.info("=" * 60)
        logger.info("🎯 無限エラー監視システム 最終サマリー")
        logger.info("=" * 60)
        logger.info(f"📅 稼働時間: {uptime}")
        logger.info(f"🔍 総チェック回数: {self.stats['total_checks']:,}")
        logger.info(f"🚨 発見エラー数: {self.stats['total_errors_found']:,}")
        logger.info(f"🔧 修復エラー数: {self.stats['total_errors_fixed']:,}")
        logger.info(
            f"📈 修復成功率: {(self.stats['total_errors_fixed'] / max(self.stats['total_errors_found'], 1)) * 100:.1f}%"
        )
        logger.info("=" * 60)

    async def monitor_cycle(self):
        """監視サイクル実行"""
        self.stats["total_checks"] += 1
        self.last_health_check = datetime.now()

        logger.info(f"🔍 監視サイクル #{self.stats['total_checks']} 開始")

        # URL健全性チェック
        urls_to_check = [
            ("フロントエンド", self.config["frontend_url"]),
            ("管理者ダッシュボード", self.config["admin_url"]),
            ("バックエンドAPI", self.config["backend_url"]),
            ("APIドキュメント", self.config["api_docs_url"]),
            ("ヘルスチェック", self.config["health_url"]),
        ]

        url_errors = []
        for name, url in urls_to_check:
            is_healthy, message, details = await self.check_url_health(url)
            if not is_healthy:
                url_errors.append(f"{name} ({url}): {message}")
                logger.warning(f"⚠️ {name} エラー: {message}")
            else:
                response_time = details.get("response_time", 0) if details else 0
                logger.info(f"✅ {name} OK ({response_time:.2f}s)")

        # 詳細エラーチェック
        frontend_success, frontend_errors = await self.run_playwright_check()
        backend_success, backend_errors = await self.run_backend_check()

        # エラー集約
        all_errors = url_errors + frontend_errors + backend_errors
        has_errors = len(all_errors) > 0

        if has_errors:
            self.stats["total_errors_found"] += len(all_errors)
            self.stats["last_error_time"] = datetime.now()
            self.consecutive_errors += 1

            if frontend_errors:
                self.stats["frontend_errors"] += len(frontend_errors)
            if backend_errors:
                self.stats["backend_errors"] += len(backend_errors)

            logger.error(f"❌ {len(all_errors)}個のエラーを検出しました")
            for error in all_errors:
                logger.error(f"  - {error}")

            # 自動修復実行
            fix_success = await self.auto_fix_errors(frontend_errors, backend_errors)

            if fix_success:
                logger.info("✅ エラー修復が完了しました")
                self.consecutive_errors = max(0, self.consecutive_errors - 1)
            else:
                logger.error("❌ エラー修復に失敗しました")

                # 連続エラーが多い場合はサービス再起動
                await self.restart_services_if_needed()
        else:
            logger.info("✅ エラーは検出されませんでした")
            self.consecutive_errors = 0

        # ステータスレポート
        if self.stats["total_checks"] % 10 == 0:  # 10回に1回詳細レポート
            report = self.generate_status_report()
            logger.info("📊 ステータスレポート:")
            logger.info(f"  - システム健全性: {report['system_health']}")
            logger.info(f"  - 稼働時間: {report['uptime_hours']:.1f}時間")
            logger.info(f"  - エラー率: {report['error_rate_percent']}%")
            logger.info(f"  - 修復成功率: {report['fix_success_rate_percent']}%")

    async def run(self):
        """メイン実行ループ"""
        logger.info("🚀 無限エラー監視・修復システムを開始します")
        logger.info("=" * 60)
        logger.info("📍 監視対象URL:")
        for key, url in self.config.items():
            if key.endswith("_url"):
                logger.info(f"  - {key}: {url}")
        logger.info(f"⏱️ 監視間隔: {self.config['monitor_interval']}秒")
        logger.info("=" * 60)

        while self.is_running:
            try:
                await self.monitor_cycle()

                # 次の監視まで待機
                if self.is_running:
                    logger.info(f"⏳ {self.config['monitor_interval']}秒待機中...")
                    await asyncio.sleep(self.config["monitor_interval"])

            except KeyboardInterrupt:
                logger.info("🛑 キーボード割り込みを受信。監視を停止します...")
                break
            except Exception as e:
                logger.error(f"🚨 監視サイクルでエラーが発生: {str(e)}")
                self.consecutive_errors += 1
                await asyncio.sleep(10)  # エラー後は短い間隔で再試行

        logger.info("🏁 無限エラー監視システムを終了します")


async def main():
    """メイン実行関数"""
    monitor = InfiniteErrorMonitor()
    try:
        await monitor.run()
    except KeyboardInterrupt:
        logger.info("プログラムが中断されました")
    finally:
        monitor.cleanup()


if __name__ == "__main__":
    # 依存関係チェック
    try:
        import aiohttp
        import psutil
    except ImportError as e:
        logger.error(f"必要なパッケージがインストールされていません: {e}")
        logger.info("以下のコマンドで依存関係をインストールしてください:")
        logger.info("pip install aiohttp psutil")
        sys.exit(1)

    # イベントループで実行
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("プログラムが正常に終了しました")
