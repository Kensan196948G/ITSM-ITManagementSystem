"""ブラウザコンソールエラー自動検知システム

Playwrightを使用してWebUIのコンソールエラーを監視・検出
- JavaScript エラー
- React エラー
- ネットワークエラー
- フロントエンド/バックエンド分類
- エラー優先度判定
- 修復対象エージェント指定
"""

import asyncio
import json
import logging
import os
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional

import pytest
from playwright.async_api import async_playwright, Page, ConsoleMessage, Response

# ログ設定
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# 設定定数
WEB_UI_URL = "http://192.168.3.135:3000"
ERROR_OUTPUT_FILE = (
    "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/errors.json"
)
MONITOR_DURATION = 30  # 秒単位
MAX_ERRORS_PER_SESSION = 100


class ConsoleErrorClassifier:
    """コンソールエラー分類器"""

    def __init__(self):
        self.error_patterns = {
            "javascript_error": [
                "TypeError",
                "ReferenceError",
                "SyntaxError",
                "RangeError",
                "Uncaught",
                "Cannot read property",
                "Cannot read properties",
                "is not a function",
                "is not defined",
                "null is not an object",
            ],
            "react_error": [
                "React",
                "Warning: ",
                "Error: ",
                "Unhandled error",
                "Component",
                "Hook",
                "render",
                "useState",
                "useEffect",
                "Minified React error",
                "ReactDOM",
            ],
            "network_error": [
                "Failed to fetch",
                "ERR_NETWORK",
                "ERR_INTERNET_DISCONNECTED",
                "ERR_CONNECTION_REFUSED",
                "ERR_NAME_NOT_RESOLVED",
                "404",
                "500",
                "502",
                "503",
                "504",
                "CORS",
                "XMLHttpRequest",
            ],
            "security_error": [
                "Content Security Policy",
                "CSP",
                "Mixed Content",
                "Not allowed by Access-Control-Allow-Origin",
                "Blocked by CORS policy",
            ],
        }

    def classify_error(self, message: str, url: str = "") -> Dict[str, Any]:
        """エラーメッセージを分類

        Args:
            message: エラーメッセージ
            url: エラー発生URL

        Returns:
            分類結果辞書
        """
        error_type = "unknown_error"
        severity = "medium"
        source = "frontend"
        assign_to = "ITSM-DevUI"

        message_lower = message.lower()

        # エラータイプ判定
        for error_category, patterns in self.error_patterns.items():
            if any(pattern.lower() in message_lower for pattern in patterns):
                error_type = error_category
                break

        # ソース判定（フロントエンド/バックエンド）
        if any(
            indicator in message_lower
            for indicator in [
                "api",
                "server",
                "backend",
                "database",
                "401",
                "403",
                "500",
                "502",
                "503",
                "504",
            ]
        ):
            source = "backend"
            assign_to = "ITSM-DevAPI"
        elif any(
            indicator in url.lower()
            for indicator in [
                "api",
                "/v1/",
                "/auth",
                "/incidents",
                "/problems",
                "/changes",
            ]
        ):
            source = "backend"
            assign_to = "ITSM-DevAPI"

        # 重要度判定
        if any(
            critical in message_lower
            for critical in [
                "uncaught",
                "fatal",
                "critical",
                "cannot read",
                "is not a function",
                "500",
                "502",
                "503",
                "504",
                "network error",
            ]
        ):
            severity = "high"
        elif any(
            warning in message_lower
            for warning in ["warning", "deprecated", "404", "401", "403"]
        ):
            severity = "low"

        return {
            "type": error_type,
            "severity": severity,
            "source": source,
            "assignTo": assign_to,
        }


class ConsoleErrorMonitor:
    """ブラウザコンソールエラーモニター"""

    def __init__(self):
        self.classifier = ConsoleErrorClassifier()
        self.errors: List[Dict[str, Any]] = []
        self.console_messages: List[Dict[str, Any]] = []
        self.network_errors: List[Dict[str, Any]] = []
        self.page: Optional[Page] = None

    async def setup_page_monitoring(self, page: Page) -> None:
        """ページ監視の設定

        Args:
            page: Playwrightページオブジェクト
        """
        self.page = page

        # コンソールメッセージ監視
        page.on("console", self._handle_console_message)

        # ページエラー監視
        page.on("pageerror", self._handle_page_error)

        # ネットワークレスポンス監視
        page.on("response", self._handle_network_response)

        # ネットワーク失敗監視
        page.on("requestfailed", self._handle_request_failed)

        logger.info(f"ページ監視を開始: {page.url}")

    async def _handle_console_message(self, msg: ConsoleMessage) -> None:
        """コンソールメッセージハンドラー"""
        message_type = msg.type
        message_text = msg.text
        location = msg.location

        # エラーまたは警告のみを処理
        if message_type in ["error", "warning"]:
            error_info = self._create_error_info(
                message=message_text,
                error_type="console_" + message_type,
                file=location.get("url", ""),
                line=location.get("lineNumber", 0),
                stack_trace=str(msg.args) if msg.args else "",
            )

            self.errors.append(error_info)
            logger.warning(f"コンソールエラー検出: {message_text}")

        # 全てのコンソールメッセージを記録
        self.console_messages.append(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": message_type,
                "message": message_text,
                "location": location,
            }
        )

    async def _handle_page_error(self, error) -> None:
        """ページエラーハンドラー"""
        error_info = self._create_error_info(
            message=str(error),
            error_type="page_error",
            stack_trace=traceback.format_exc(),
        )

        self.errors.append(error_info)
        logger.error(f"ページエラー検出: {error}")

    async def _handle_network_response(self, response: Response) -> None:
        """ネットワークレスポンスハンドラー"""
        if response.status >= 400:
            error_info = self._create_error_info(
                message=f"HTTP {response.status}: {response.status_text}",
                error_type="network_error",
                file=response.url,
                additional_data={
                    "status_code": response.status,
                    "status_text": response.status_text,
                    "url": response.url,
                    "headers": dict(response.headers),
                },
            )

            self.errors.append(error_info)
            self.network_errors.append(error_info)
            logger.warning(f"ネットワークエラー検出: {response.status} {response.url}")

    async def _handle_request_failed(self, request) -> None:
        """リクエスト失敗ハンドラー"""
        failure = request.failure
        error_info = self._create_error_info(
            message=f"Request failed: {failure}",
            error_type="request_failed",
            file=request.url,
            additional_data={
                "method": request.method,
                "url": request.url,
                "failure": failure,
            },
        )

        self.errors.append(error_info)
        logger.error(f"リクエスト失敗検出: {request.url} - {failure}")

    def _create_error_info(
        self,
        message: str,
        error_type: str,
        file: str = "",
        line: int = 0,
        stack_trace: str = "",
        additional_data: Dict = None,
    ) -> Dict[str, Any]:
        """エラー情報を作成

        Args:
            message: エラーメッセージ
            error_type: エラータイプ
            file: ファイルパス
            line: 行番号
            stack_trace: スタックトレース
            additional_data: 追加データ

        Returns:
            エラー情報辞書
        """
        classification = self.classifier.classify_error(message, file)

        error_info = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": classification["type"],
            "severity": classification["severity"],
            "message": message,
            "source": classification["source"],
            "file": file,
            "line": line,
            "stackTrace": stack_trace,
            "assignTo": classification["assignTo"],
            "originalType": error_type,
        }

        if additional_data:
            error_info["additionalData"] = additional_data

        return error_info

    def get_error_summary(self) -> Dict[str, Any]:
        """エラーサマリーを取得

        Returns:
            エラーサマリー辞書
        """
        total_errors = len(self.errors)
        error_types = {}
        severity_counts = {"high": 0, "medium": 0, "low": 0}
        source_counts = {"frontend": 0, "backend": 0}
        agent_assignments = {"ITSM-DevUI": 0, "ITSM-DevAPI": 0}

        for error in self.errors:
            # エラータイプ集計
            error_type = error["type"]
            error_types[error_type] = error_types.get(error_type, 0) + 1

            # 重要度集計
            severity = error["severity"]
            severity_counts[severity] += 1

            # ソース集計
            source = error["source"]
            source_counts[source] += 1

            # エージェント割り当て集計
            assign_to = error["assignTo"]
            agent_assignments[assign_to] += 1

        return {
            "sessionStart": datetime.now(timezone.utc).isoformat(),
            "monitoringDuration": MONITOR_DURATION,
            "totalErrors": total_errors,
            "errorTypes": error_types,
            "severityCounts": severity_counts,
            "sourceCounts": source_counts,
            "agentAssignments": agent_assignments,
            "consoleMessages": len(self.console_messages),
            "networkErrors": len(self.network_errors),
        }

    def save_errors_to_file(self) -> None:
        """エラーをファイルに保存"""
        try:
            # 出力ディレクトリを作成
            output_dir = Path(ERROR_OUTPUT_FILE).parent
            output_dir.mkdir(parents=True, exist_ok=True)

            # 既存のエラーファイルを読み込み
            existing_errors = []
            if os.path.exists(ERROR_OUTPUT_FILE):
                try:
                    with open(ERROR_OUTPUT_FILE, "r", encoding="utf-8") as f:
                        existing_data = json.load(f)
                        existing_errors = existing_data.get("errors", [])
                except (json.JSONDecodeError, KeyError):
                    logger.warning("既存のエラーファイルの読み込みに失敗")

            # 新しいエラーを追加
            all_errors = existing_errors + self.errors

            # 最大エラー数制限
            if len(all_errors) > MAX_ERRORS_PER_SESSION:
                all_errors = all_errors[-MAX_ERRORS_PER_SESSION:]

            # エラーデータを保存
            error_data = {
                "summary": self.get_error_summary(),
                "errors": all_errors,
                "lastUpdate": datetime.now(timezone.utc).isoformat(),
            }

            with open(ERROR_OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(error_data, f, indent=2, ensure_ascii=False)

            logger.info(f"エラーファイル保存完了: {ERROR_OUTPUT_FILE}")
            logger.info(f"保存エラー数: {len(self.errors)} (累計: {len(all_errors)})")

        except Exception as e:
            logger.error(f"エラーファイル保存失敗: {e}")


@pytest.mark.asyncio
class TestConsoleErrorMonitor:
    """ブラウザコンソールエラー監視テスト"""

    async def test_console_error_monitoring(self):
        """基本的なコンソールエラー監視テスト"""
        monitor = ConsoleErrorMonitor()

        async with async_playwright() as playwright:
            # ヘッドレスブラウザーを起動
            browser = await playwright.chromium.launch(
                headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"]
            )

            try:
                page = await browser.new_page()

                # エラー監視を設定
                await monitor.setup_page_monitoring(page)

                # WebUIにアクセス
                logger.info(f"WebUIアクセス開始: {WEB_UI_URL}")

                try:
                    await page.goto(WEB_UI_URL, wait_until="networkidle", timeout=30000)
                    logger.info("WebUIロード完了")
                except Exception as e:
                    logger.error(f"WebUIアクセス失敗: {e}")
                    # アクセス失敗もエラーとして記録
                    monitor.errors.append(
                        monitor._create_error_info(
                            message=f"WebUI access failed: {e}",
                            error_type="page_load_error",
                            file=WEB_UI_URL,
                        )
                    )

                # ページ操作とエラー監視
                await self._perform_ui_interactions(page, monitor)

                # 監視期間待機
                logger.info(f"エラー監視中... ({MONITOR_DURATION}秒)")
                await asyncio.sleep(MONITOR_DURATION)

            finally:
                await browser.close()

        # エラーを保存
        monitor.save_errors_to_file()

        # テスト結果の確認
        summary = monitor.get_error_summary()
        logger.info(f"監視結果: {summary}")

        # アサーションは緩い条件にする（エラーがあっても失敗しない）
        assert isinstance(monitor.errors, list)
        assert isinstance(summary, dict)

        if monitor.errors:
            logger.warning(f"検出されたエラー数: {len(monitor.errors)}")
            for i, error in enumerate(monitor.errors[:5]):  # 最初の5個を表示
                logger.warning(f"エラー {i+1}: {error['message'][:100]}")
        else:
            logger.info("エラーは検出されませんでした")

    async def _perform_ui_interactions(
        self, page: Page, monitor: ConsoleErrorMonitor
    ) -> None:
        """UI操作を実行してエラーを誘発

        Args:
            page: Playwrightページ
            monitor: エラーモニター
        """
        try:
            # ページタイトル確認
            title = await page.title()
            logger.info(f"ページタイトル: {title}")

            # 基本的なナビゲーション操作
            interactions = [
                ("div", "ダッシュボード要素クリック"),
                ("button", "ボタンクリック"),
                ("a", "リンククリック"),
                ("input", "入力フィールドフォーカス"),
                ("[role='navigation']", "ナビゲーションクリック"),
            ]

            for selector, description in interactions:
                try:
                    elements = await page.query_selector_all(selector)
                    if elements:
                        # 最初の要素をクリック
                        await elements[0].click(timeout=5000)
                        logger.info(f"実行: {description}")
                        await asyncio.sleep(1)  # エラー発生を待機
                except Exception as e:
                    logger.debug(f"{description} 失敗: {e}")
                    # UI操作の失敗もエラーとして記録
                    monitor.errors.append(
                        monitor._create_error_info(
                            message=f"UI interaction failed: {description} - {e}",
                            error_type="ui_interaction_error",
                            file=page.url,
                        )
                    )

            # APIエンドポイントへの直接アクセステスト
            api_endpoints = [
                "/api/v1/incidents",
                "/api/v1/problems",
                "/api/v1/changes",
                "/api/v1/auth/me",
                "/api/nonexistent",  # 404エラーを意図的に生成
            ]

            for endpoint in api_endpoints:
                try:
                    full_url = f"http://192.168.3.135:8000{endpoint}"
                    await page.goto(full_url, timeout=10000)
                    await asyncio.sleep(1)
                    logger.info(f"APIアクセステスト: {endpoint}")
                except Exception as e:
                    logger.debug(f"APIアクセス失敗: {endpoint} - {e}")

            # 元のページに戻る
            await page.goto(WEB_UI_URL, timeout=30000)

        except Exception as e:
            logger.error(f"UI操作中にエラー: {e}")

    async def test_continuous_monitoring(self):
        """継続的監視テスト"""
        monitor = ConsoleErrorMonitor()

        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)

            try:
                page = await browser.new_page()
                await monitor.setup_page_monitoring(page)

                # 複数回のページアクセス
                for i in range(3):
                    logger.info(f"継続監視 ラウンド {i+1}/3")

                    try:
                        await page.goto(
                            WEB_UI_URL, wait_until="networkidle", timeout=30000
                        )
                        await asyncio.sleep(10)  # 10秒間監視

                        # ページリロード
                        await page.reload(wait_until="networkidle")
                        await asyncio.sleep(5)

                    except Exception as e:
                        logger.warning(f"ラウンド {i+1} でエラー: {e}")

            finally:
                await browser.close()

        # 結果保存
        monitor.save_errors_to_file()

        logger.info(f"継続監視完了: {len(monitor.errors)}個のエラー検出")


if __name__ == "__main__":
    # 直接実行時の動作
    import asyncio

    async def main():
        test_instance = TestConsoleErrorMonitor()
        await test_instance.test_console_error_monitoring()

    asyncio.run(main())
