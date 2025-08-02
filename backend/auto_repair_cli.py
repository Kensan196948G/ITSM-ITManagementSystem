#!/usr/bin/env python3
"""
自動修復システム CLI
コマンドラインから自動修復システムを実行・管理
"""

import asyncio
import argparse
import json
import logging
import signal
import sys
from pathlib import Path
from datetime import datetime

# プロジェクトのルートパスを追加
sys.path.insert(0, str(Path(__file__).parent))

from app.services.auto_repair import AutoRepairSystem
from app.services.api_repair import APISpecAnalyzer, APIRepairer, APITestRunner
from app.services.repair_reporter import RepairReporter


class AutoRepairCLI:
    """自動修復システム CLI"""

    def __init__(self):
        self.project_root = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem"
        self.repair_system = AutoRepairSystem(self.project_root)
        self.reporter = RepairReporter(self.project_root)
        self.api_analyzer = APISpecAnalyzer(f"{self.project_root}/backend")
        self.api_repairer = APIRepairer(f"{self.project_root}/backend")
        self.api_test_runner = APITestRunner(f"{self.project_root}/backend")

        self.logger = logging.getLogger(__name__)
        self.monitoring_task = None

        # シグナルハンドラー設定
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """シグナルハンドラー（Ctrl+C対応）"""
        print(f"\n受信したシグナル: {signum}")
        if self.monitoring_task:
            self.monitoring_task.cancel()
        self.repair_system.stop_monitoring()
        print("自動修復システムを終了します...")
        sys.exit(0)

    async def run_once(self, args):
        """1回の修復サイクルを実行"""
        print("🔧 自動修復システム - 1回実行モード")
        print(f"プロジェクトルート: {self.project_root}")

        try:
            result = await self.repair_system.run_once()

            print("\n📊 実行結果:")
            print(f"  検出エラー数: {result['errors_detected']}")
            print(f"  修復試行数: {result['fixes_attempted']}")
            print(f"  修復成功数: {result['fixes_successful']}")

            if result["test_results"]["success"]:
                print("  APIテスト: ✅ 成功")
            else:
                print("  APIテスト: ❌ 失敗")

            # 詳細結果の保存
            if args.output:
                output_path = Path(args.output)
                with open(output_path, "w", encoding="utf-8") as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)
                print(f"詳細結果を保存: {output_path}")

            return result

        except Exception as e:
            self.logger.error(f"修復実行エラー: {e}")
            print(f"❌ エラーが発生しました: {e}")
            return None

    async def start_monitoring(self, args):
        """継続監視を開始"""
        print("🔍 自動修復システム - 継続監視モード")
        print(f"監視間隔: {args.interval}秒")
        print(f"プロジェクトルート: {self.project_root}")
        print("Ctrl+C で停止します\n")

        # 監視間隔を設定
        self.repair_system.monitoring_interval = args.interval

        try:
            self.monitoring_task = asyncio.create_task(
                self.repair_system.start_monitoring()
            )
            await self.monitoring_task
        except asyncio.CancelledError:
            print("監視タスクがキャンセルされました")
        except Exception as e:
            self.logger.error(f"監視実行エラー: {e}")
            print(f"❌ 監視中にエラーが発生しました: {e}")

    async def test_api(self, args):
        """API テストを実行"""
        print("🧪 API テスト実行")

        try:
            test_results = await self.api_test_runner.run_comprehensive_tests()

            print("\n📊 テスト結果:")
            print(
                f"  ヘルスチェック: {'✅' if test_results['health_check']['success'] else '❌'}"
            )

            for endpoint_result in test_results["api_endpoints"]:
                status = "✅" if endpoint_result["success"] else "❌"
                print(
                    f"  {endpoint_result['method']} {endpoint_result['endpoint']}: {status}"
                )

            print(
                f"  負荷テスト: {'✅' if test_results['load_test']['success'] else '❌'}"
            )
            print(
                f"  バリデーションテスト: {'✅' if test_results['validation_test']['success'] else '❌'}"
            )

            if args.output:
                output_path = Path(args.output)
                with open(output_path, "w", encoding="utf-8") as f:
                    json.dump(test_results, f, indent=2, ensure_ascii=False)
                print(f"テスト結果を保存: {output_path}")

            return test_results

        except Exception as e:
            self.logger.error(f"APIテスト実行エラー: {e}")
            print(f"❌ APIテストでエラーが発生しました: {e}")
            return None

    async def generate_report(self, args):
        """修復レポートを生成"""
        print("📋 修復レポート生成")

        try:
            result = await self.reporter.generate_comprehensive_report()

            print("\n📊 レポート生成完了:")
            print(f"  HTML: {result['html_path']}")
            print(f"  JSON: {result['json_path']}")
            print(f"  Markdown: {result['markdown_path']}")

            # ダッシュボードデータも生成
            if args.dashboard:
                dashboard = await self.reporter.generate_summary_dashboard()
                dashboard_path = (
                    Path(self.project_root) / "tests" / "reports" / "dashboard.json"
                )
                with open(dashboard_path, "w", encoding="utf-8") as f:
                    json.dump(dashboard, f, indent=2, ensure_ascii=False)
                print(f"  ダッシュボード: {dashboard_path}")

            return result

        except Exception as e:
            self.logger.error(f"レポート生成エラー: {e}")
            print(f"❌ レポート生成でエラーが発生しました: {e}")
            return None

    async def analyze_openapi(self, args):
        """OpenAPI 仕様を分析"""
        print("🔍 OpenAPI 仕様分析")

        try:
            spec = await self.api_analyzer.analyze_openapi_spec()

            if spec:
                print("\n📊 分析結果:")
                print(f"  API タイトル: {spec.get('info', {}).get('title', 'N/A')}")
                print(f"  API バージョン: {spec.get('info', {}).get('version', 'N/A')}")
                print(f"  エンドポイント数: {len(spec.get('paths', {}))}")

                # エンドポイント一覧表示
                for path, methods in spec.get("paths", {}).items():
                    method_list = ", ".join(methods.keys())
                    print(f"    {path}: {method_list}")

                if args.output:
                    output_path = Path(args.output)
                    with open(output_path, "w", encoding="utf-8") as f:
                        json.dump(spec, f, indent=2, ensure_ascii=False)
                    print(f"OpenAPI仕様を保存: {output_path}")
            else:
                print("❌ OpenAPI仕様の取得に失敗しました")

            return spec

        except Exception as e:
            self.logger.error(f"OpenAPI分析エラー: {e}")
            print(f"❌ OpenAPI分析でエラーが発生しました: {e}")
            return None

    async def status(self, args):
        """システム状態を表示"""
        print("📊 自動修復システム状態")

        try:
            # エラーファイルの確認
            errors_file = Path(self.project_root) / "coordination" / "errors.json"
            fixes_file = Path(self.project_root) / "coordination" / "fixes.json"

            errors_data = {}
            fixes_data = {}

            if errors_file.exists():
                with open(errors_file, "r", encoding="utf-8") as f:
                    errors_data = json.load(f)

            if fixes_file.exists():
                with open(fixes_file, "r", encoding="utf-8") as f:
                    fixes_data = json.load(f)

            print(f"\n🔍 エラー状態:")
            print(f"  総エラー数: {errors_data.get('error_count', 0)}")
            print(f"  最終チェック: {errors_data.get('last_check', 'N/A')}")

            print(f"\n🔧 修復状態:")
            print(f"  総修復数: {fixes_data.get('total_fixes', 0)}")
            print(f"  成功率: {fixes_data.get('success_rate', 0):.1f}%")
            print(f"  最終修復: {fixes_data.get('last_fix', 'N/A')}")

            # ファイル存在確認
            print(f"\n📁 ファイル状態:")
            print(f"  errors.json: {'✅' if errors_file.exists() else '❌'}")
            print(f"  fixes.json: {'✅' if fixes_file.exists() else '❌'}")

            # ダッシュボードデータ生成
            dashboard = await self.reporter.generate_summary_dashboard()
            system_health = dashboard["system_health"]["status"]
            health_emoji = {"healthy": "✅", "warning": "⚠️", "critical": "❌"}

            print(
                f"\n🏥 システムヘルス: {health_emoji.get(system_health, '❓')} {system_health.upper()}"
            )

            if dashboard["alerts"]:
                print(f"\n🚨 アラート:")
                for alert in dashboard["alerts"]:
                    level_emoji = {"critical": "🔴", "warning": "🟡", "info": "🔵"}
                    print(
                        f"  {level_emoji.get(alert['level'], '⚪')} {alert['message']}"
                    )

        except Exception as e:
            self.logger.error(f"状態確認エラー: {e}")
            print(f"❌ 状態確認でエラーが発生しました: {e}")

    def setup_logging(self, level):
        """ログ設定"""
        log_level = getattr(logging, level.upper(), logging.INFO)
        logging.basicConfig(
            level=log_level,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            handlers=[
                logging.StreamHandler(sys.stdout),
                logging.FileHandler(
                    Path(self.project_root) / "backend" / "logs" / "auto_repair.log",
                    encoding="utf-8",
                ),
            ],
        )


def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(
        description="ITSM Backend Auto-Repair System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用例:
  %(prog)s run-once                    # 1回だけ修復を実行
  %(prog)s monitor --interval 60       # 60秒間隔で継続監視
  %(prog)s test-api                    # API テストを実行
  %(prog)s report --dashboard          # レポート生成（ダッシュボード付き）
  %(prog)s status                      # システム状態を表示
  %(prog)s analyze-openapi             # OpenAPI 仕様を分析
        """,
    )

    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default="INFO",
        help="ログレベル (default: INFO)",
    )

    subparsers = parser.add_subparsers(dest="command", help="利用可能なコマンド")

    # run-once コマンド
    run_once_parser = subparsers.add_parser("run-once", help="1回の修復サイクルを実行")
    run_once_parser.add_argument("--output", "-o", help="結果をJSONファイルに保存")

    # monitor コマンド
    monitor_parser = subparsers.add_parser("monitor", help="継続監視を開始")
    monitor_parser.add_argument(
        "--interval", "-i", type=int, default=30, help="監視間隔（秒） (default: 30)"
    )

    # test-api コマンド
    test_api_parser = subparsers.add_parser("test-api", help="API テストを実行")
    test_api_parser.add_argument(
        "--output", "-o", help="テスト結果をJSONファイルに保存"
    )

    # report コマンド
    report_parser = subparsers.add_parser("report", help="修復レポートを生成")
    report_parser.add_argument(
        "--dashboard", action="store_true", help="ダッシュボードデータも生成"
    )

    # analyze-openapi コマンド
    analyze_parser = subparsers.add_parser("analyze-openapi", help="OpenAPI 仕様を分析")
    analyze_parser.add_argument(
        "--output", "-o", help="OpenAPI仕様をJSONファイルに保存"
    )

    # status コマンド
    subparsers.add_parser("status", help="システム状態を表示")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # CLI インスタンス作成
    cli = AutoRepairCLI()
    cli.setup_logging(args.log_level)

    # コマンド実行
    try:
        if args.command == "run-once":
            asyncio.run(cli.run_once(args))
        elif args.command == "monitor":
            asyncio.run(cli.start_monitoring(args))
        elif args.command == "test-api":
            asyncio.run(cli.test_api(args))
        elif args.command == "report":
            asyncio.run(cli.generate_report(args))
        elif args.command == "analyze-openapi":
            asyncio.run(cli.analyze_openapi(args))
        elif args.command == "status":
            asyncio.run(cli.status(args))
        else:
            print(f"❌ 不明なコマンド: {args.command}")
            parser.print_help()

    except KeyboardInterrupt:
        print("\n\n👋 ユーザーによって中断されました")
    except Exception as e:
        print(f"\n❌ 予期しないエラーが発生しました: {e}")
        logging.error(f"Unexpected error: {e}", exc_info=True)


if __name__ == "__main__":
    main()
