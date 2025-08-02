#!/usr/bin/env python3
"""
包括的API監視システム実行スクリプト
"""

import asyncio
import logging
import signal
import sys
from pathlib import Path

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("comprehensive_monitoring.log"),
    ],
)

logger = logging.getLogger(__name__)

# パスを追加
sys.path.append(str(Path(__file__).parent))

from app.services.api_error_monitor import api_monitor


class ComprehensiveMonitoringSystem:
    """包括的監視システム"""

    def __init__(self):
        self.monitoring = False
        self.monitor_task = None

    async def start(self, interval: int = 60):
        """監視を開始"""
        logger.info("🚀 包括的API監視システムを開始します")

        self.monitoring = True

        # シグナルハンドラー設定
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        try:
            # 初回実行
            await self._run_initial_scan()

            # 継続監視開始
            self.monitor_task = asyncio.create_task(
                api_monitor.start_monitoring(interval)
            )

            # 監視ループ
            await self.monitor_task

        except asyncio.CancelledError:
            logger.info("監視がキャンセルされました")
        except Exception as e:
            logger.error(f"監視システムエラー: {e}")
        finally:
            await self._cleanup()

    async def _run_initial_scan(self):
        """初回スキャン実行"""
        logger.info("🔍 初回包括的スキャンを実行しています...")

        try:
            # 1. ヘルスチェック
            logger.info("💓 APIヘルスチェック実行中...")
            await api_monitor.perform_health_check()

            # 2. セキュリティスキャン
            logger.info("🔒 セキュリティスキャン実行中...")
            await api_monitor.security_scan()

            # 3. データベースヘルスチェック
            logger.info("💾 データベースヘルスチェック実行中...")
            await api_monitor.database_health_check()

            # 4. パフォーマンス監視
            logger.info("📊 パフォーマンス監視実行中...")
            await api_monitor.performance_monitoring()

            # 5. ドキュメント監視
            logger.info("📚 ドキュメント監視実行中...")
            await api_monitor.documentation_check()

            # 6. SSL証明書チェック
            logger.info("🔐 SSL証明書チェック実行中...")
            await api_monitor.ssl_certificate_check()

            # 7. ログ解析
            logger.info("📋 ログ解析実行中...")
            await api_monitor.analyze_logs()

            # 8. メトリクス更新
            logger.info("📈 メトリクス更新中...")
            await api_monitor.update_comprehensive_metrics()

            # 9. レポート生成
            logger.info("📊 包括的レポート生成中...")
            report = await api_monitor.generate_comprehensive_report()

            if report:
                logger.info("✅ 初回スキャン完了")
                self._print_scan_summary(report)
            else:
                logger.warning("⚠️ レポート生成に失敗しました")

        except Exception as e:
            logger.error(f"初回スキャンエラー: {e}")

    def _print_scan_summary(self, report: dict):
        """スキャン結果サマリーを表示"""
        summary = report.get("executive_summary", {})

        print("\n" + "=" * 60)
        print("📊 包括的監視システム - 初回スキャン結果")
        print("=" * 60)
        print(f"全体的な健全性: {summary.get('overall_health', 'unknown')}")
        print(f"クリティカル問題: {summary.get('critical_issues', 0)}件")
        print(f"セキュリティ脅威: {summary.get('security_threats', 0)}件")
        print(f"パフォーマンス問題: {summary.get('performance_issues', 0)}件")
        print(f"推奨事項: {summary.get('recommendations_count', 0)}件")

        # エラー分析
        error_analysis = report.get("error_analysis", {})
        print(f"\n📋 エラー分析:")
        print(f"  総エラー数: {error_analysis.get('total_errors', 0)}件")
        print(f"  修復済み: {error_analysis.get('fixed_errors', 0)}件")

        # セキュリティ分析
        security_analysis = report.get("security_analysis", {})
        print(f"\n🔒 セキュリティ分析:")
        print(f"  アラート総数: {security_analysis.get('total_alerts', 0)}件")
        print(f"  ブロック済みIP: {security_analysis.get('blocked_ips', 0)}個")
        print(f"  脅威レベル: {security_analysis.get('threat_level', 'unknown')}")

        # パフォーマンス分析
        performance_analysis = report.get("performance_analysis", {})
        print(f"\n⚡ パフォーマンス分析:")
        print(
            f"  平均レスポンス時間: {performance_analysis.get('avg_response_time', 0):.3f}秒"
        )
        print(
            f"  遅いエンドポイント: {len(performance_analysis.get('slow_endpoints', []))}個"
        )

        # データベース分析
        database_analysis = report.get("database_analysis", {})
        print(f"\n💾 データベース分析:")
        print(f"  ヘルス状態: {database_analysis.get('health_status', 'unknown')}")
        print(f"  サイズ: {database_analysis.get('size_mb', 0):.2f}MB")

        # 推奨事項
        recommendations = report.get("recommendations", [])
        if recommendations:
            print(f"\n💡 推奨事項:")
            for i, rec in enumerate(recommendations[:5], 1):
                print(f"  {i}. {rec}")

        print("=" * 60)
        print("継続監視を開始します...")
        print("=" * 60 + "\n")

    def _signal_handler(self, signum, frame):
        """シグナルハンドラー"""
        logger.info(f"シグナル {signum} を受信しました。監視を停止します...")
        self.monitoring = False

        if self.monitor_task and not self.monitor_task.done():
            self.monitor_task.cancel()

    async def _cleanup(self):
        """クリーンアップ"""
        logger.info("🧹 クリーンアップ中...")

        api_monitor.stop_monitoring()

        # 最終レポート生成
        try:
            logger.info("📊 最終レポートを生成中...")
            final_report = await api_monitor.generate_comprehensive_report()
            if final_report:
                logger.info("✅ 最終レポートを生成しました")
        except Exception as e:
            logger.error(f"最終レポート生成エラー: {e}")

        logger.info("🛑 包括的API監視システムを停止しました")


async def main():
    """メイン実行関数"""
    import argparse

    parser = argparse.ArgumentParser(description="包括的API監視システム")
    parser.add_argument(
        "--interval", type=int, default=60, help="監視間隔（秒）デフォルト: 60秒"
    )
    parser.add_argument(
        "--once", action="store_true", help="一回だけスキャンを実行して終了"
    )

    args = parser.parse_args()

    monitoring_system = ComprehensiveMonitoringSystem()

    if args.once:
        logger.info("🔍 ワンタイムスキャンモードで実行します")
        await monitoring_system._run_initial_scan()
        logger.info("✅ ワンタイムスキャンが完了しました")
    else:
        await monitoring_system.start(interval=args.interval)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n監視を停止しました")
    except Exception as e:
        logger.error(f"システムエラー: {e}")
        sys.exit(1)
