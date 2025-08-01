"""ブラウザコンソールエラー監視スケジューラー

継続的なコンソールエラー監視と自動修復ループを実装
- 定期実行スケジュール
- エラー検出時の自動通知
- CI/CD連携
- エージェント割り当て
"""

import asyncio
import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/logs/console_monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 設定定数
MONITOR_INTERVAL = 300  # 5分ごとに実行
ERROR_OUTPUT_FILE = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/errors.json"
MONITOR_SCRIPT = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/tests/e2e/test_console_error_monitor.py"
REPORTS_DIR = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/tests/reports"
MAX_RETRIES = 3
RETRY_DELAY = 60  # 秒


class ConsoleMonitorScheduler:
    """コンソールエラー監視スケジューラー"""
    
    def __init__(self):
        self.is_running = False
        self.last_error_count = 0
        self.consecutive_failures = 0
        self.session_start_time = datetime.now(timezone.utc)
        
        # 出力ディレクトリを作成
        os.makedirs(os.path.dirname(ERROR_OUTPUT_FILE), exist_ok=True)
        os.makedirs(REPORTS_DIR, exist_ok=True)
        os.makedirs('/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/logs', exist_ok=True)
    
    def run_console_monitor(self) -> Dict[str, Any]:
        """コンソールモニターを実行
        
        Returns:
            実行結果辞書
        """
        result = {
            "success": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "errors_detected": 0,
            "execution_time": 0,
            "error_message": None
        }
        
        start_time = time.time()
        
        try:
            logger.info("コンソールエラー監視を開始")
            
            # pytestでモニタースクリプトを実行
            cmd = [
                sys.executable, "-m", "pytest", 
                MONITOR_SCRIPT,
                "-v", 
                "--tb=short",
                "--json-report",
                f"--json-report-file={REPORTS_DIR}/console-monitor-report.json"
            ]
            
            # ワーキングディレクトリをITSMルートに設定
            working_dir = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem"
            
            # サブプロセスでテストを実行
            process = subprocess.run(
                cmd,
                cwd=working_dir,
                capture_output=True,
                text=True,
                timeout=180  # 3分タイムアウト
            )
            
            execution_time = time.time() - start_time
            result["execution_time"] = execution_time
            
            # 実行結果をログ出力
            logger.info(f"テスト実行結果: return_code={process.returncode}")
            logger.info(f"実行時間: {execution_time:.2f}秒")
            
            if process.stdout:
                logger.info(f"STDOUT: {process.stdout[:500]}")
            if process.stderr:
                logger.warning(f"STDERR: {process.stderr[:500]}")
            
            # エラーファイルから結果を読み取り
            errors_detected = self._check_error_file()
            result["errors_detected"] = errors_detected
            
            # 成功判定（テストが失敗してもエラー検出は成功とみなす）
            result["success"] = True
            self.consecutive_failures = 0
            
            logger.info(f"コンソールエラー監視完了: {errors_detected}個のエラー検出")
            
        except subprocess.TimeoutExpired:
            execution_time = time.time() - start_time
            result["execution_time"] = execution_time
            result["error_message"] = "Monitor execution timeout"
            self.consecutive_failures += 1
            logger.error("コンソールモニターがタイムアウトしました")
            
        except Exception as e:
            execution_time = time.time() - start_time
            result["execution_time"] = execution_time
            result["error_message"] = str(e)
            self.consecutive_failures += 1
            logger.error(f"コンソールモニター実行エラー: {e}")
        
        return result
    
    def _check_error_file(self) -> int:
        """エラーファイルの内容をチェック
        
        Returns:
            検出されたエラー数
        """
        try:
            if not os.path.exists(ERROR_OUTPUT_FILE):
                return 0
                
            with open(ERROR_OUTPUT_FILE, 'r', encoding='utf-8') as f:
                error_data = json.load(f)
                
            errors = error_data.get("errors", [])
            error_count = len(errors)
            
            # 新しいエラーがあるかチェック
            if error_count > self.last_error_count:
                new_errors = error_count - self.last_error_count
                logger.warning(f"新しいエラーを{new_errors}個検出")
                
                # 新しいエラーを通知
                self._notify_new_errors(errors[-new_errors:])
                
            self.last_error_count = error_count
            return error_count
            
        except Exception as e:
            logger.error(f"エラーファイルチェック失敗: {e}")
            return 0
    
    def _notify_new_errors(self, new_errors: List[Dict[str, Any]]) -> None:
        """新しいエラーを通知
        
        Args:
            new_errors: 新しいエラーのリスト
        """
        try:
            # エラーを種類別・エージェント別に集計
            error_summary = {}
            agent_assignments = {}
            
            for error in new_errors:
                error_type = error.get("type", "unknown")
                severity = error.get("severity", "medium")
                assign_to = error.get("assignTo", "ITSM-DevUI")
                
                # エラータイプ別集計
                if error_type not in error_summary:
                    error_summary[error_type] = {"high": 0, "medium": 0, "low": 0}
                error_summary[error_type][severity] += 1
                
                # エージェント別集計
                agent_assignments[assign_to] = agent_assignments.get(assign_to, 0) + 1
            
            # 通知メッセージを作成
            notification = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message": f"{len(new_errors)}個の新しいエラーを検出",
                "errorSummary": error_summary,
                "agentAssignments": agent_assignments,
                "errors": new_errors
            }
            
            # 通知ファイルに保存
            notification_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/error_notifications.json"
            
            # 既存の通知を読み込み
            notifications = []
            if os.path.exists(notification_file):
                try:
                    with open(notification_file, 'r', encoding='utf-8') as f:
                        notifications = json.load(f)
                except json.JSONDecodeError:
                    pass
            
            # 新しい通知を追加
            notifications.append(notification)
            
            # 最新100件のみ保持
            notifications = notifications[-100:]
            
            with open(notification_file, 'w', encoding='utf-8') as f:
                json.dump(notifications, f, indent=2, ensure_ascii=False)
                
            logger.info(f"エラー通知を保存: {notification_file}")
            
            # 重大エラーの場合は緊急通知
            critical_errors = [e for e in new_errors if e.get("severity") == "high"]
            if critical_errors:
                self._send_urgent_notification(critical_errors)
                
        except Exception as e:
            logger.error(f"エラー通知処理失敗: {e}")
    
    def _send_urgent_notification(self, critical_errors: List[Dict[str, Any]]) -> None:
        """緊急通知を送信
        
        Args:
            critical_errors: 重大エラーのリスト
        """
        try:
            urgent_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/urgent_errors.json"
            
            urgent_notification = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "level": "URGENT",
                "message": f"{len(critical_errors)}個の重大エラーを検出",
                "errors": critical_errors,
                "requiresImmediateAction": True
            }
            
            with open(urgent_file, 'w', encoding='utf-8') as f:
                json.dump(urgent_notification, f, indent=2, ensure_ascii=False)
            
            logger.error(f"緊急通知: {len(critical_errors)}個の重大エラーが発生")
            
        except Exception as e:
            logger.error(f"緊急通知送信失敗: {e}")
    
    def generate_monitoring_report(self) -> Dict[str, Any]:
        """監視レポートを生成
        
        Returns:
            監視レポート辞書
        """
        try:
            # エラーファイルからデータを読み取り
            error_data = {}
            if os.path.exists(ERROR_OUTPUT_FILE):
                with open(ERROR_OUTPUT_FILE, 'r', encoding='utf-8') as f:
                    error_data = json.load(f)
            
            # 監視統計を生成
            uptime = datetime.now(timezone.utc) - self.session_start_time
            
            report = {
                "monitoringSession": {
                    "startTime": self.session_start_time.isoformat(),
                    "uptime": str(uptime),
                    "consecutiveFailures": self.consecutive_failures,
                    "isHealthy": self.consecutive_failures < 3
                },
                "errorStatistics": error_data.get("summary", {}),
                "recentErrors": error_data.get("errors", [])[-10:],  # 最新10件
                "systemStatus": {
                    "webUIAccessible": self._check_webui_health(),
                    "lastMonitorRun": datetime.now(timezone.utc).isoformat(),
                    "totalErrorsDetected": len(error_data.get("errors", []))
                },
                "recommendations": self._generate_recommendations(error_data)
            }
            
            # レポートをファイルに保存
            report_file = f"{REPORTS_DIR}/console-monitoring-report-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            
            logger.info(f"監視レポート生成: {report_file}")
            return report
            
        except Exception as e:
            logger.error(f"監視レポート生成失敗: {e}")
            return {}
    
    def _check_webui_health(self) -> bool:
        """
WebUIのヘルスチェック
        
        Returns:
            WebUIがアクセス可能かどうか
        """
        try:
            import requests
            response = requests.get("http://192.168.3.135:3000", timeout=10)
            return response.status_code == 200
        except Exception:
            return False
    
    def _generate_recommendations(self, error_data: Dict[str, Any]) -> List[str]:
        """推奨事項を生成
        
        Args:
            error_data: エラーデータ
            
        Returns:
            推奨事項のリスト
        """
        recommendations = []
        errors = error_data.get("errors", [])
        
        if not errors:
            recommendations.append("エラーは検出されていません。システムは健全です。")
            return recommendations
        
        # エラータイプ別の推奨
        error_types = {}
        for error in errors:
            error_type = error.get("type", "unknown")
            error_types[error_type] = error_types.get(error_type, 0) + 1
        
        if error_types.get("javascript_error", 0) > 5:
            recommendations.append("JavaScriptエラーが多発しています。コードレビューを推奨します。")
        
        if error_types.get("network_error", 0) > 3:
            recommendations.append("ネットワークエラーが発生しています。APIサーバーの状態を確認してください。")
        
        if error_types.get("react_error", 0) > 2:
            recommendations.append("Reactエラーが発生しています。コンポーネントの状態管理を見直してください。")
        
        # 重大度別の推奨
        high_severity_count = len([e for e in errors if e.get("severity") == "high"])
        if high_severity_count > 0:
            recommendations.append(f"{high_severity_count}個の重大エラーがあります。優先的な対応が必要です。")
        
        return recommendations
    
    async def run_continuous_monitoring(self) -> None:
        """継続的な監視を実行"""
        self.is_running = True
        logger.info("継続的なコンソールエラー監視を開始")
        
        try:
            while self.is_running:
                # モニター実行
                result = self.run_console_monitor()
                
                # 連続失敗が多い場合は休止
                if self.consecutive_failures >= MAX_RETRIES:
                    logger.error(f"{MAX_RETRIES}回連続で失敗しました。{RETRY_DELAY}秒待機します。")
                    await asyncio.sleep(RETRY_DELAY)
                    self.consecutive_failures = 0  # リセット
                
                # 次の実行まで待機
                logger.info(f"次のモニター実行まで{MONITOR_INTERVAL}秒待機")
                await asyncio.sleep(MONITOR_INTERVAL)
                
        except KeyboardInterrupt:
            logger.info("ユーザーにより監視が中断されました")
        except Exception as e:
            logger.error(f"継続監視中にエラー: {e}")
        finally:
            self.is_running = False
            logger.info("継続的なコンソールエラー監視を終了")
    
    def stop_monitoring(self) -> None:
        """監視を停止"""
        self.is_running = False
        logger.info("監視停止が要求されました")


def main():
    """メイン関数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="ブラウザコンソールエラー監視スケジューラー")
    parser.add_argument("--once", action="store_true", help="一度だけ実行")
    parser.add_argument("--report", action="store_true", help="レポートを生成")
    parser.add_argument("--interval", type=int, default=MONITOR_INTERVAL, help="監視間隔（秒）")
    
    args = parser.parse_args()
    
    scheduler = ConsoleMonitorScheduler()
    
    if args.report:
        # レポート生成のみ
        report = scheduler.generate_monitoring_report()
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return
    
    if args.once:
        # 一度だけ実行
        result = scheduler.run_console_monitor()
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return
    
    # 継続監視
    global MONITOR_INTERVAL
    MONITOR_INTERVAL = args.interval
    
    try:
        asyncio.run(scheduler.run_continuous_monitoring())
    except KeyboardInterrupt:
        print("\n監視を終了します")


if __name__ == "__main__":
    main()