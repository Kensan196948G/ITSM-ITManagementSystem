#!/usr/bin/env python3
"""
全URLエンドポイント検証システム
ITSM WebUIとAPIの全エンドポイントをテストしてエラーを検出
"""

import asyncio
import aiohttp
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import argparse

# ログ設定
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class EndpointTester:
    """エンドポイントテスタークラス"""

    def __init__(self, base_ip: str = "192.168.3.135"):
        self.base_ip = base_ip
        self.endpoints = {
            "frontend": {
                "base_url": f"http://{base_ip}:3000",
                "paths": [
                    "/",
                    "/admin",
                    "/login",
                    "/dashboard",
                    "/tickets",
                    "/users",
                    "/settings",
                    "/static/js/main.js",
                    "/static/css/main.css",
                    "/manifest.json",
                ],
            },
            "backend": {
                "base_url": f"http://{base_ip}:8000",
                "paths": [
                    "/",
                    "/health",
                    "/docs",
                    "/openapi.json",
                    "/api/v1/auth/login",
                    "/api/v1/auth/me",
                    "/api/v1/tickets",
                    "/api/v1/users",
                    "/api/v1/incidents",
                    "/api/v1/monitoring/health",
                    "/api/v1/monitoring/error-monitor/status",
                    "/api/v1/custom-fields",
                    "/api/v1/detail-panel/ticket/1",
                    "/api/v1/detail-panel/user/1",
                ],
            },
        }
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "errors": [],
            "details": {},
        }

    async def test_endpoint(
        self, service: str, base_url: str, path: str, timeout: int = 10
    ) -> Dict:
        """個別エンドポイントのテスト"""
        url = f"{base_url}{path}"
        test_result = {
            "service": service,
            "url": url,
            "path": path,
            "status": "unknown",
            "status_code": None,
            "response_time": None,
            "content_type": None,
            "content_length": None,
            "error_message": None,
            "timestamp": datetime.now().isoformat(),
        }

        try:
            start_time = time.time()

            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as session:
                async with session.get(url) as response:
                    response_time = time.time() - start_time

                    test_result.update(
                        {
                            "status_code": response.status,
                            "response_time": round(response_time, 3),
                            "content_type": response.headers.get(
                                "content-type", "unknown"
                            ),
                            "content_length": response.headers.get(
                                "content-length", "unknown"
                            ),
                        }
                    )

                    # ステータスコード判定
                    if response.status < 400:
                        test_result["status"] = "success"
                        self.results["passed"] += 1
                        logger.info(
                            f"✅ {url} - {response.status} ({response_time:.3f}s)"
                        )
                    elif response.status < 500:
                        test_result["status"] = "warning"
                        test_result["error_message"] = (
                            f"Client error: {response.status}"
                        )
                        self.results["failed"] += 1
                        logger.warning(
                            f"⚠️ {url} - {response.status} ({response_time:.3f}s)"
                        )
                    else:
                        test_result["status"] = "error"
                        test_result["error_message"] = (
                            f"Server error: {response.status}"
                        )
                        self.results["failed"] += 1
                        logger.error(
                            f"❌ {url} - {response.status} ({response_time:.3f}s)"
                        )

                    # 特定のエンドポイントに対する追加チェック
                    if path == "/health" and response.status == 200:
                        try:
                            health_data = await response.json()
                            if health_data.get("status") == "healthy":
                                logger.info("  💚 ヘルスチェック: システム正常")
                            else:
                                logger.warning(f"  ⚠️ ヘルスチェック: {health_data}")
                        except:
                            pass

                    elif path == "/docs" and response.status == 200:
                        logger.info("  📚 API ドキュメント: アクセス可能")

                    elif (
                        path == "/" and service == "frontend" and response.status == 200
                    ):
                        logger.info("  🌐 WebUI: 正常表示")

        except asyncio.TimeoutError:
            test_result.update(
                {
                    "status": "timeout",
                    "error_message": f"Timeout after {timeout}s",
                    "response_time": timeout,
                }
            )
            self.results["failed"] += 1
            logger.error(f"⏰ {url} - Timeout")

        except aiohttp.ClientError as e:
            test_result.update(
                {
                    "status": "connection_error",
                    "error_message": f"Connection error: {str(e)}",
                }
            )
            self.results["failed"] += 1
            logger.error(f"🔌 {url} - Connection Error: {str(e)}")

        except Exception as e:
            test_result.update(
                {"status": "unknown_error", "error_message": f"Unknown error: {str(e)}"}
            )
            self.results["failed"] += 1
            logger.error(f"❓ {url} - Unknown Error: {str(e)}")

        self.results["total_tests"] += 1

        # エラーの場合は詳細をエラーリストに追加
        if test_result["status"] in [
            "error",
            "timeout",
            "connection_error",
            "unknown_error",
        ]:
            self.results["errors"].append(
                {
                    "url": url,
                    "status": test_result["status"],
                    "error_message": test_result["error_message"],
                    "timestamp": test_result["timestamp"],
                }
            )

        return test_result

    async def test_service(self, service_name: str, service_config: Dict) -> List[Dict]:
        """サービス全体のテスト"""
        logger.info(f"🔍 {service_name.upper()} サービステスト開始")
        logger.info(f"   ベースURL: {service_config['base_url']}")

        base_url = service_config["base_url"]
        paths = service_config["paths"]

        tasks = []
        for path in paths:
            task = self.test_endpoint(service_name, base_url, path)
            tasks.append(task)

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 例外処理
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"テスト実行エラー ({paths[i]}): {str(result)}")
                processed_results.append(
                    {
                        "service": service_name,
                        "path": paths[i],
                        "status": "test_error",
                        "error_message": str(result),
                    }
                )
            else:
                processed_results.append(result)

        return processed_results

    async def run_all_tests(self) -> Dict:
        """すべてのテスト実行"""
        logger.info("🚀 全エンドポイント検証を開始します")
        logger.info("=" * 60)

        all_results = {}

        for service_name, service_config in self.endpoints.items():
            service_results = await self.test_service(service_name, service_config)
            all_results[service_name] = service_results

            # サービス別サマリー
            service_passed = sum(
                1 for r in service_results if r.get("status") == "success"
            )
            service_total = len(service_results)
            service_failed = service_total - service_passed

            logger.info(
                f"📊 {service_name.upper()} サマリー: {service_passed}/{service_total} 成功, {service_failed} 失敗"
            )
            logger.info("-" * 40)

        self.results["details"] = all_results
        self.results["success_rate"] = (
            self.results["passed"] / max(self.results["total_tests"], 1)
        ) * 100

        return self.results

    def generate_report(self, output_file: str = None) -> str:
        """レポート生成"""
        if not output_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"endpoint-test-report-{timestamp}.json"

        # 詳細レポート作成
        report = {
            "summary": {
                "timestamp": self.results["timestamp"],
                "total_tests": self.results["total_tests"],
                "passed": self.results["passed"],
                "failed": self.results["failed"],
                "success_rate": round(self.results["success_rate"], 2),
                "test_duration": "completed",
            },
            "errors": self.results["errors"],
            "detailed_results": self.results["details"],
            "recommendations": self.generate_recommendations(),
        }

        # JSONファイルに保存
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        # HTMLレポート生成
        html_file = output_file.replace(".json", ".html")
        self.generate_html_report(report, html_file)

        return output_file

    def generate_recommendations(self) -> List[str]:
        """推奨事項生成"""
        recommendations = []

        if self.results["failed"] > 0:
            recommendations.append(
                "❌ エラーが検出されました。詳細を確認して修復してください。"
            )

        if self.results["success_rate"] < 80:
            recommendations.append(
                "⚠️ 成功率が80%未満です。システムの安定性を確認してください。"
            )

        if (
            len([e for e in self.results["errors"] if "timeout" in e.get("status", "")])
            > 0
        ):
            recommendations.append(
                "⏰ タイムアウトエラーが発生しています。サーバーパフォーマンスを確認してください。"
            )

        if (
            len(
                [
                    e
                    for e in self.results["errors"]
                    if "connection_error" in e.get("status", "")
                ]
            )
            > 0
        ):
            recommendations.append(
                "🔌 接続エラーが発生しています。ネットワーク設定を確認してください。"
            )

        if self.results["success_rate"] == 100:
            recommendations.append("✅ すべてのエンドポイントが正常です！")

        return recommendations

    def generate_html_report(self, report: Dict, html_file: str):
        """HTMLレポート生成"""
        html_content = f"""
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ITSM エンドポイントテストレポート</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        h1 {{ color: #2c3e50; text-align: center; }}
        h2 {{ color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; }}
        .summary {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }}
        .metric {{ background: #ecf0f1; padding: 20px; border-radius: 8px; text-align: center; }}
        .metric h3 {{ margin: 0; color: #2c3e50; }}
        .metric .value {{ font-size: 2em; font-weight: bold; margin: 10px 0; }}
        .success {{ color: #27ae60; }}
        .warning {{ color: #f39c12; }}
        .error {{ color: #e74c3c; }}
        .status-success {{ background-color: #d5f4e6; color: #27ae60; padding: 4px 8px; border-radius: 4px; }}
        .status-warning {{ background-color: #fdeaa7; color: #f39c12; padding: 4px 8px; border-radius: 4px; }}
        .status-error {{ background-color: #fab1a0; color: #e74c3c; padding: 4px 8px; border-radius: 4px; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
        th {{ background-color: #34495e; color: white; }}
        tr:hover {{ background-color: #f5f5f5; }}
        .recommendations {{ background: #e8f6f3; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .recommendations ul {{ margin: 0; padding-left: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 ITSM エンドポイントテストレポート</h1>
        
        <div class="summary">
            <div class="metric">
                <h3>総テスト数</h3>
                <div class="value">{report['summary']['total_tests']}</div>
            </div>
            <div class="metric">
                <h3>成功</h3>
                <div class="value success">{report['summary']['passed']}</div>
            </div>
            <div class="metric">
                <h3>失敗</h3>
                <div class="value error">{report['summary']['failed']}</div>
            </div>
            <div class="metric">
                <h3>成功率</h3>
                <div class="value {'success' if report['summary']['success_rate'] >= 90 else 'warning' if report['summary']['success_rate'] >= 70 else 'error'}">{report['summary']['success_rate']}%</div>
            </div>
        </div>
        
        <h2>📊 テスト結果詳細</h2>
        <table>
            <thead>
                <tr>
                    <th>サービス</th>
                    <th>URL</th>
                    <th>ステータス</th>
                    <th>レスポンス時間</th>
                    <th>ステータスコード</th>
                    <th>コンテンツタイプ</th>
                </tr>
            </thead>
            <tbody>
"""

        for service_name, service_results in report["detailed_results"].items():
            for result in service_results:
                status_class = (
                    "status-success"
                    if result.get("status") == "success"
                    else (
                        "status-warning"
                        if result.get("status") == "warning"
                        else "status-error"
                    )
                )
                html_content += f"""
                <tr>
                    <td>{service_name.upper()}</td>
                    <td>{result.get('url', 'N/A')}</td>
                    <td><span class="{status_class}">{result.get('status', 'unknown')}</span></td>
                    <td>{result.get('response_time', 'N/A')}s</td>
                    <td>{result.get('status_code', 'N/A')}</td>
                    <td>{result.get('content_type', 'N/A')}</td>
                </tr>
                """

        html_content += """
            </tbody>
        </table>
        
        <h2>⚠️ エラー詳細</h2>
        """

        if report["errors"]:
            html_content += "<table><thead><tr><th>URL</th><th>エラー種別</th><th>エラーメッセージ</th><th>時刻</th></tr></thead><tbody>"
            for error in report["errors"]:
                html_content += f"""
                <tr>
                    <td>{error['url']}</td>
                    <td><span class="status-error">{error['status']}</span></td>
                    <td>{error['error_message']}</td>
                    <td>{error['timestamp']}</td>
                </tr>
                """
            html_content += "</tbody></table>"
        else:
            html_content += "<p class='success'>✅ エラーはありませんでした。</p>"

        html_content += f"""
        <div class="recommendations">
            <h2>💡 推奨事項</h2>
            <ul>
        """

        for recommendation in report["recommendations"]:
            html_content += f"<li>{recommendation}</li>"

        html_content += (
            """
            </ul>
        </div>
        
        <p style="text-align: center; color: #7f8c8d; margin-top: 40px;">
            レポート生成時刻: """
            + report["summary"]["timestamp"]
            + """
        </p>
    </div>
</body>
</html>
        """
        )

        with open(html_file, "w", encoding="utf-8") as f:
            f.write(html_content)

        logger.info(f"📄 HTMLレポートを生成しました: {html_file}")


async def main():
    """メイン実行関数"""
    parser = argparse.ArgumentParser(description="ITSM エンドポイント検証システム")
    parser.add_argument(
        "--ip",
        default="192.168.3.135",
        help="テスト対象IPアドレス (デフォルト: 192.168.3.135)",
    )
    parser.add_argument("--output", help="出力ファイル名 (デフォルト: 自動生成)")
    parser.add_argument("--verbose", "-v", action="store_true", help="詳細出力")

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # テスト実行
    tester = EndpointTester(base_ip=args.ip)

    logger.info(f"🎯 テスト対象IP: {args.ip}")
    logger.info("🔧 テスト設定:")
    logger.info(f"   フロントエンド: http://{args.ip}:3000")
    logger.info(f"   バックエンド: http://{args.ip}:8000")
    logger.info("")

    start_time = time.time()
    results = await tester.run_all_tests()
    end_time = time.time()

    test_duration = end_time - start_time

    # 結果サマリー表示
    logger.info("=" * 60)
    logger.info("🎉 全エンドポイント検証完了")
    logger.info("=" * 60)
    logger.info(f"📊 テスト結果サマリー:")
    logger.info(f"   • 総テスト数: {results['total_tests']}")
    logger.info(f"   • 成功: {results['passed']}")
    logger.info(f"   • 失敗: {results['failed']}")
    logger.info(f"   • 成功率: {results['success_rate']:.1f}%")
    logger.info(f"   • 実行時間: {test_duration:.2f}秒")
    logger.info("")

    # レポート生成
    report_file = tester.generate_report(args.output)
    logger.info(f"📄 詳細レポート: {report_file}")
    logger.info(f"🌐 HTMLレポート: {report_file.replace('.json', '.html')}")

    # 推奨事項表示
    recommendations = tester.generate_recommendations()
    if recommendations:
        logger.info("💡 推奨事項:")
        for rec in recommendations:
            logger.info(f"   {rec}")

    # 終了コード設定
    if results["failed"] > 0:
        logger.warning("⚠️ エラーが検出されました。詳細はレポートを確認してください。")
        return 1
    else:
        logger.info("✅ すべてのエンドポイントが正常です！")
        return 0


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        exit(exit_code)
    except KeyboardInterrupt:
        logger.info("❌ テストが中断されました")
        exit(1)
    except Exception as e:
        logger.error(f"🚨 予期しないエラー: {str(e)}")
        exit(1)
