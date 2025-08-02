#!/usr/bin/env python3
"""
ITSM リアルタイム監視システム強化
即座のエラー検出と修復発動を実現
"""

import json
import time
import threading
import os
import subprocess
import logging
from datetime import datetime, timedelta
from pathlib import Path
import signal
import sys

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - ITSM-Monitor - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(
            "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/itsm_monitor.log"
        ),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


class ITSMRealtimeMonitor:
    def __init__(self):
        self.base_path = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem")
        self.backend_path = self.base_path / "backend"
        self.coordination_path = self.base_path / "coordination"

        # 監視対象ファイル
        self.monitor_files = {
            "api_metrics": self.backend_path / "api_error_metrics.json",
            "realtime_state": self.coordination_path / "realtime_repair_state.json",
            "infinite_loop": self.coordination_path / "infinite_loop_state.json",
            "errors": self.coordination_path / "errors.json",
        }

        # 監視状態
        self.monitoring = False
        self.last_check = {}
        self.error_count = 0
        self.repair_triggered = 0

        # ファイル監視間隔 (秒)
        self.check_interval = 2

        # 修復エンジンパス
        self.repair_engine = (
            self.backend_path / "scripts" / "itsm_loop_repair_engine.py"
        )

        logger.info("ITSM リアルタイム監視システム初期化完了")

    def get_file_status(self, file_path):
        """ファイルの状態を取得"""
        try:
            if not file_path.exists():
                return None

            stat = file_path.stat()
            with open(file_path, "r") as f:
                content = json.load(f)

            return {
                "mtime": stat.st_mtime,
                "size": stat.st_size,
                "content": content,
                "timestamp": datetime.now().isoformat(),
            }
        except Exception as e:
            logger.error(f"ファイル状態取得エラー {file_path}: {e}")
            return None

    def detect_health_issues(self):
        """ヘルス問題を検出"""
        issues = []

        try:
            # API Metrics チェック
            api_status = self.get_file_status(self.monitor_files["api_metrics"])
            if api_status and api_status["content"].get("health_status") == "unhealthy":
                issues.append(
                    {
                        "type": "api_health_unhealthy",
                        "severity": "high",
                        "file": "api_error_metrics.json",
                        "details": "API health status is unhealthy",
                    }
                )

            # Errors.json チェック
            errors_status = self.get_file_status(self.monitor_files["errors"])
            if errors_status and errors_status["content"]:
                # エラーファイルに内容がある場合
                issues.append(
                    {
                        "type": "errors_detected",
                        "severity": "medium",
                        "file": "errors.json",
                        "details": f"Error content detected: {len(str(errors_status['content']))}",
                    }
                )

            # Loop状態の異常チェック
            loop_status = self.get_file_status(self.monitor_files["infinite_loop"])
            if loop_status:
                content = loop_status["content"]
                # 最新スキャンから5分以上経過している場合
                if "last_scan" in content:
                    last_scan = datetime.fromisoformat(content["last_scan"])
                    if datetime.now() - last_scan > timedelta(minutes=5):
                        issues.append(
                            {
                                "type": "loop_stale",
                                "severity": "medium",
                                "file": "infinite_loop_state.json",
                                "details": f"Last scan was {datetime.now() - last_scan} ago",
                            }
                        )

        except Exception as e:
            logger.error(f"ヘルス問題検出中にエラー: {e}")
            issues.append(
                {
                    "type": "detection_error",
                    "severity": "low",
                    "file": "monitor",
                    "details": str(e),
                }
            )

        return issues

    def trigger_repair_engine(self, issues):
        """修復エンジンを発動"""
        try:
            logger.info(f"修復エンジン発動: {len(issues)} 個の問題を検出")

            # 修復エンジンを非同期実行
            result = subprocess.Popen(
                ["/usr/bin/python3", str(self.repair_engine)],
                cwd=str(self.base_path),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            self.repair_triggered += 1

            # 修復実行ログ
            repair_log = {
                "timestamp": datetime.now().isoformat(),
                "issues_count": len(issues),
                "issues": issues,
                "repair_pid": result.pid,
                "trigger_count": self.repair_triggered,
            }

            # 修復ログをファイルに記録
            log_file = self.backend_path / "logs" / "repair_triggers.json"
            try:
                if log_file.exists():
                    with open(log_file, "r") as f:
                        logs = json.load(f)
                else:
                    logs = []

                logs.append(repair_log)
                # 最新100件のみ保持
                logs = logs[-100:]

                with open(log_file, "w") as f:
                    json.dump(logs, f, indent=2)

            except Exception as e:
                logger.error(f"修復ログ記録エラー: {e}")

            logger.info(f"修復エンジン発動完了 (PID: {result.pid})")
            return True

        except Exception as e:
            logger.error(f"修復エンジン発動エラー: {e}")
            return False

    def monitor_cycle(self):
        """単一の監視サイクル"""
        try:
            # ヘルス問題検出
            issues = self.detect_health_issues()

            if issues:
                self.error_count += 1
                logger.warning(
                    f"問題検出 ({len(issues)} 件): {[i['type'] for i in issues]}"
                )

                # 高重要度の問題がある場合は即座に修復発動
                high_severity_issues = [i for i in issues if i["severity"] == "high"]
                if high_severity_issues:
                    logger.info("高重要度問題検出 - 即座に修復エンジン発動")
                    self.trigger_repair_engine(issues)
                elif len(issues) >= 2:
                    # 複数の問題がある場合も修復発動
                    logger.info("複数問題検出 - 修復エンジン発動")
                    self.trigger_repair_engine(issues)
            else:
                # 正常状態
                if self.error_count > 0:
                    logger.info("システム正常状態に復旧")
                    self.error_count = 0

        except Exception as e:
            logger.error(f"監視サイクル中にエラー: {e}")

    def run_monitoring(self):
        """メイン監視ループ"""
        logger.info("=== ITSM リアルタイム監視開始 ===")
        self.monitoring = True

        try:
            while self.monitoring:
                self.monitor_cycle()
                time.sleep(self.check_interval)

        except KeyboardInterrupt:
            logger.info("監視が手動停止されました")
        except Exception as e:
            logger.error(f"監視中に致命的エラー: {e}")
        finally:
            self.monitoring = False
            logger.info("ITSM リアルタイム監視終了")

    def stop_monitoring(self):
        """監視停止"""
        self.monitoring = False
        logger.info("監視停止要求")

    def get_monitoring_stats(self):
        """監視統計取得"""
        return {
            "monitoring": self.monitoring,
            "error_count": self.error_count,
            "repair_triggered": self.repair_triggered,
            "check_interval": self.check_interval,
            "monitor_files": [str(f) for f in self.monitor_files.values()],
        }


class ITSMMonitoringService:
    """ITSM監視サービス（デーモン化対応）"""

    def __init__(self):
        self.monitor = ITSMRealtimeMonitor()
        self.running = False

    def signal_handler(self, signum, frame):
        """シグナルハンドラー"""
        logger.info(f"シグナル {signum} 受信 - 正常終了中...")
        self.stop()

    def start(self):
        """サービス開始"""
        # シグナルハンドラー設定
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)

        self.running = True
        logger.info("ITSM監視サービス開始")

        # 監視開始
        self.monitor.run_monitoring()

    def stop(self):
        """サービス停止"""
        self.running = False
        self.monitor.stop_monitoring()
        logger.info("ITSM監視サービス停止")


def main():
    """メイン実行関数"""
    service = ITSMMonitoringService()

    # ログディレクトリ作成
    os.makedirs(
        "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs", exist_ok=True
    )

    print("🔍 ITSM リアルタイム監視システム開始")
    print("Ctrl+C で停止")

    try:
        service.start()
    except Exception as e:
        logger.error(f"サービス開始エラー: {e}")
        print(f"エラー: {e}")


if __name__ == "__main__":
    main()
