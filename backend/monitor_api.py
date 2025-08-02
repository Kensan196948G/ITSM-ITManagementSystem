#!/usr/bin/env python3
"""
APIエラー監視・修復システム CLI
"""

import asyncio
import click
import json
import sys
import os
from datetime import datetime
from pathlib import Path

# パスを追加してapp.servicesをインポート可能にする
sys.path.append(str(Path(__file__).parent))

from app.services.api_error_monitor import api_monitor, ErrorSeverity, ErrorCategory


@click.group()
def cli():
    """APIエラー監視・修復システム"""
    pass


@cli.command()
@click.option("--interval", "-i", default=30, help="監視間隔（秒）")
@click.option("--duration", "-d", default=0, help="監視継続時間（秒、0で無限）")
def monitor(interval: int, duration: int):
    """継続監視を開始"""
    click.echo(f"🔍 APIエラー監視を開始します（間隔: {interval}秒）")

    async def run_monitoring():
        if duration > 0:
            click.echo(f"⏰ {duration}秒間監視します")
            monitoring_task = asyncio.create_task(
                api_monitor.start_monitoring(interval)
            )
            await asyncio.sleep(duration)
            api_monitor.stop_monitoring()
            monitoring_task.cancel()
            click.echo("✅ 監視が完了しました")
        else:
            await api_monitor.start_monitoring(interval)

    try:
        asyncio.run(run_monitoring())
    except KeyboardInterrupt:
        click.echo("\n🛑 監視を停止しました")


@cli.command()
def health():
    """APIヘルスチェック実行"""
    click.echo("🏥 APIヘルスチェックを実行中...")

    async def run_health_check():
        results = await api_monitor.perform_health_check()

        click.echo("\n📊 ヘルスチェック結果:")
        for result in results:
            status = "✅ Healthy" if result.is_healthy else "❌ Unhealthy"
            click.echo(f"  {result.endpoint}: {status} ({result.response_time:.3f}s)")
            if result.error_message:
                click.echo(f"    エラー: {result.error_message}")

    asyncio.run(run_health_check())


@cli.command()
def logs():
    """ログ解析とエラー抽出"""
    click.echo("📋 ログファイルを解析中...")

    async def run_log_analysis():
        initial_error_count = len(api_monitor.errors)
        await api_monitor.analyze_logs()
        new_errors = len(api_monitor.errors) - initial_error_count

        click.echo(f"✅ ログ解析完了: {new_errors}件の新しいエラーを検出")

        if new_errors > 0:
            click.echo("\n🔍 最新のエラー:")
            for error in api_monitor.errors[-min(5, new_errors) :]:
                severity_emoji = {
                    ErrorSeverity.LOW: "🟢",
                    ErrorSeverity.MEDIUM: "🟡",
                    ErrorSeverity.HIGH: "🟠",
                    ErrorSeverity.CRITICAL: "🔴",
                }
                click.echo(
                    f"  {severity_emoji[error.severity]} {error.error_type} - {error.endpoint}"
                )

    asyncio.run(run_log_analysis())


@cli.command()
def fix():
    """エラー修復を実行"""
    click.echo("🔧 エラー修復を実行中...")

    async def run_fixes():
        unfixed_errors = [e for e in api_monitor.errors if not e.fix_attempted]
        if not unfixed_errors:
            click.echo("✅ 修復が必要なエラーはありません")
            return

        click.echo(f"🔧 {len(unfixed_errors)}件のエラー修復を試行します")
        await api_monitor.attempt_error_fixes()

        # 結果表示
        successful_fixes = [
            e for e in api_monitor.errors if e.fix_attempted and e.fix_successful
        ]
        failed_fixes = [
            e for e in api_monitor.errors if e.fix_attempted and not e.fix_successful
        ]

        click.echo(f"\n📊 修復結果:")
        click.echo(f"  ✅ 成功: {len(successful_fixes)}件")
        click.echo(f"  ❌ 失敗: {len(failed_fixes)}件")

        if successful_fixes:
            click.echo("\n✅ 修復成功:")
            for error in successful_fixes[-5:]:  # 最新5件
                click.echo(f"  • {error.error_type}: {error.fix_description}")

        if failed_fixes:
            click.echo("\n❌ 修復失敗:")
            for error in failed_fixes[-5:]:  # 最新5件
                click.echo(f"  • {error.error_type}: {error.fix_description}")

    asyncio.run(run_fixes())


@cli.command()
def status():
    """監視状況を表示"""
    status = api_monitor.get_status()

    click.echo("📊 監視ステータス:")
    click.echo(f"  監視中: {'✅ Yes' if status['monitoring'] else '❌ No'}")
    click.echo(f"  総エラー数: {status['total_errors']}")
    click.echo(f"  直近1時間のエラー: {status['recent_errors']}")

    if status["last_health_check"]:
        health_status = "✅ Healthy" if status["is_healthy"] else "❌ Unhealthy"
        click.echo(f"  最新ヘルスチェック: {health_status}")
        click.echo(f"  チェック時刻: {status['last_health_check']}")


@cli.command()
def report():
    """エラーレポートを生成"""
    click.echo("📊 エラーレポートを生成中...")

    async def generate_report():
        report = await api_monitor.generate_error_report()

        if not report:
            click.echo("❌ レポート生成に失敗しました")
            return

        click.echo("\n📋 エラーレポート:")
        click.echo(f"  生成時刻: {report['generated_at']}")
        click.echo(f"  解析期間: {report['analysis_period']}")

        summary = report["summary"]
        click.echo(f"\n📊 サマリー:")
        click.echo(f"  総エラー数: {summary['total_errors']}")
        click.echo(f"  重大エラー: {summary['critical_errors']}")
        click.echo(f"  修復済み: {summary['fixed_errors']}")
        click.echo(f"  ユニークエラー: {summary['unique_error_types']}")

        if report["recommendations"]:
            click.echo(f"\n💡 推奨事項:")
            for rec in report["recommendations"]:
                click.echo(f"  {rec}")

        click.echo(f"\n💾 詳細レポート: backend/api_error_report.json")

    asyncio.run(generate_report())


@cli.command()
@click.option(
    "--category",
    type=click.Choice([cat.value for cat in ErrorCategory]),
    help="エラーカテゴリでフィルタ",
)
@click.option(
    "--severity",
    type=click.Choice([sev.value for sev in ErrorSeverity]),
    help="重要度でフィルタ",
)
@click.option("--limit", default=10, help="表示件数")
def errors(category: str, severity: str, limit: int):
    """エラー一覧を表示"""
    errors = api_monitor.errors

    # フィルタリング
    if category:
        errors = [e for e in errors if e.category.value == category]
    if severity:
        errors = [e for e in errors if e.severity.value == severity]

    # 最新順でソート
    errors = sorted(errors, key=lambda x: x.timestamp, reverse=True)[:limit]

    if not errors:
        click.echo("エラーが見つかりませんでした")
        return

    click.echo(f"🔍 エラー一覧（最新{len(errors)}件）:")

    for i, error in enumerate(errors, 1):
        severity_emoji = {
            ErrorSeverity.LOW: "🟢",
            ErrorSeverity.MEDIUM: "🟡",
            ErrorSeverity.HIGH: "🟠",
            ErrorSeverity.CRITICAL: "🔴",
        }

        fix_status = (
            "✅" if error.fix_successful else "❌" if error.fix_attempted else "⏳"
        )

        click.echo(
            f"\n{i}. {severity_emoji[error.severity]} {error.error_type} {fix_status}"
        )
        click.echo(f"   時刻: {error.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        click.echo(f"   カテゴリ: {error.category.value}")
        click.echo(f"   エンドポイント: {error.endpoint}")
        click.echo(f"   メッセージ: {error.message[:100]}...")

        if error.fix_attempted:
            click.echo(f"   修復: {error.fix_description}")


@cli.command()
def reset():
    """エラー履歴をリセット"""
    if click.confirm("エラー履歴をリセットしますか？"):
        api_monitor.errors.clear()
        api_monitor.health_history.clear()
        click.echo("✅ エラー履歴をリセットしました")


@cli.command()
def start_server():
    """APIサーバーを起動"""
    click.echo("🚀 APIサーバーを起動中...")

    backend_path = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend")
    start_script = backend_path / "start_server.py"

    if start_script.exists():
        os.system(f"cd {backend_path} && python start_server.py &")
        click.echo("✅ APIサーバーの起動を要求しました")
    else:
        click.echo("❌ 起動スクリプトが見つかりません")


if __name__ == "__main__":
    cli()
