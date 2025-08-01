#!/usr/bin/env python3
"""
包括的エラー検知・監視システム
Playwright MCPと統合したフロントエンド・バックエンドエラー継続監視
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import requests
import sys
import traceback
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import subprocess
import os

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/error_monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class ErrorInfo:
    """エラー情報クラス"""
    timestamp: str
    type: str
    level: str
    message: str
    stack_trace: Optional[str]
    source: str
    url: Optional[str]
    line_number: Optional[int]
    column_number: Optional[int]
    user_agent: Optional[str]
    page_title: Optional[str]

@dataclass
class SystemStatus:
    """システム状態クラス"""
    timestamp: str
    frontend_errors: int
    backend_errors: int
    api_errors: int
    console_errors: int
    network_errors: int
    total_errors: int
    pages_checked: int
    api_endpoints_checked: int
    last_check_duration: float
    status: str  # "healthy", "errors_detected", "critical"

class ComprehensiveErrorMonitor:
    """包括的エラー検知・監視システム"""
    
    def __init__(self):
        self.base_path = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination")
        self.errors_file = self.base_path / "errors.json"
        self.status_file = self.base_path / "error_status.json"
        self.fixes_file = self.base_path / "fixes.json"
        
        # 監視対象URL
        self.frontend_base_url = "http://192.168.3.135:3000"
        self.backend_base_url = "http://192.168.3.135:8081"
        
        # 監視対象ページ
        self.frontend_pages = [
            "/",
            "/incidents",
            "/problems", 
            "/changes",
            "/cmdb",
            "/reports",
            "/analytics",
            "/settings",
            "/login",
            "/dashboard"
        ]
        
        # 監視対象APIエンドポイント
        self.api_endpoints = [
            "/api/health",
            "/api/incidents",
            "/api/problems",
            "/api/changes", 
            "/api/cmdb/cis",
            "/api/users",
            "/api/categories",
            "/api/reports"
        ]
        
        # エラー収集
        self.errors: List[ErrorInfo] = []
        self.consecutive_clean_checks = 0
        self.required_clean_checks = 3
        
        # システム状態
        self.system_status = SystemStatus(
            timestamp=datetime.now().isoformat(),
            frontend_errors=0,
            backend_errors=0,
            api_errors=0,
            console_errors=0,
            network_errors=0,
            total_errors=0,
            pages_checked=0,
            api_endpoints_checked=0,
            last_check_duration=0.0,
            status="initializing"
        )

    async def initialize_playwright(self):
        """Playwright初期化"""
        try:
            # PlaywrightとChromiumをインストール
            logger.info("Playwrightを初期化中...")
            
            # pip installを実行
            subprocess.run([sys.executable, "-m", "pip", "install", "playwright"], check=True)
            subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=True)
            
            logger.info("Playwright初期化完了")
            return True
        except Exception as e:
            logger.error(f"Playwright初期化エラー: {e}")
            return False

    async def check_frontend_with_playwright(self) -> List[ErrorInfo]:
        """Playwrightでフロントエンドのコンソールエラーをチェック"""
        errors = []
        
        try:
            from playwright.async_api import async_playwright
            
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=True,
                    args=["--no-sandbox", "--disable-dev-shm-usage"]
                )
                
                context = await browser.new_context(
                    viewport={"width": 1920, "height": 1080}
                )
                
                page = await context.new_page()
                
                # コンソールメッセージをキャプチャ
                console_messages = []
                page_errors = []
                
                def handle_console(msg):
                    if msg.type in ['error', 'warning']:
                        console_messages.append({
                            'type': msg.type,
                            'text': msg.text,
                            'location': msg.location
                        })
                
                def handle_page_error(error):
                    page_errors.append(str(error))
                
                page.on("console", handle_console)
                page.on("pageerror", handle_page_error)
                
                # 各ページをチェック
                for page_path in self.frontend_pages:
                    try:
                        url = f"{self.frontend_base_url}{page_path}"
                        logger.info(f"チェック中: {url}")
                        
                        # ページに移動
                        await page.goto(url, wait_until="networkidle", timeout=30000)
                        
                        # ページタイトルを取得
                        page_title = await page.title()
                        
                        # JavaScriptエラーをチェック
                        js_errors = await page.evaluate("""
                            () => {
                                const errors = [];
                                // React開発者ツールエラーをチェック
                                if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                                    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
                                    if (hook.rendererInterfaces) {
                                        for (const id in hook.rendererInterfaces) {
                                            const renderer = hook.rendererInterfaces[id];
                                            if (renderer.findFiberByHostInstance) {
                                                // React Fiberエラーをチェック
                                            }
                                        }
                                    }
                                }
                                
                                // グローバルエラーをチェック
                                if (window.jsErrors) {
                                    errors.push(...window.jsErrors);
                                }
                                
                                return errors;
                            }
                        """)
                        
                        # コンソールメッセージを処理
                        for msg in console_messages:
                            if msg['type'] == 'error':
                                errors.append(ErrorInfo(
                                    timestamp=datetime.now().isoformat(),
                                    type="console_error",
                                    level="error",
                                    message=msg['text'],
                                    stack_trace=None,
                                    source="frontend",
                                    url=url,
                                    line_number=msg['location'].get('lineNumber') if msg['location'] else None,
                                    column_number=msg['location'].get('columnNumber') if msg['location'] else None,
                                    user_agent=await page.evaluate("navigator.userAgent"),
                                    page_title=page_title
                                ))
                        
                        # ページエラーを処理
                        for error in page_errors:
                            errors.append(ErrorInfo(
                                timestamp=datetime.now().isoformat(),
                                type="page_error",
                                level="error",
                                message=str(error),
                                stack_trace=None,
                                source="frontend",
                                url=url,
                                line_number=None,
                                column_number=None,
                                user_agent=await page.evaluate("navigator.userAgent"),
                                page_title=page_title
                            ))
                        
                        # JSエラーを処理
                        for js_error in js_errors:
                            errors.append(ErrorInfo(
                                timestamp=datetime.now().isoformat(),
                                type="javascript_error",
                                level="error",
                                message=str(js_error),
                                stack_trace=None,
                                source="frontend",
                                url=url,
                                line_number=None,
                                column_number=None,
                                user_agent=await page.evaluate("navigator.userAgent"),
                                page_title=page_title
                            ))
                        
                        # リストをクリア
                        console_messages.clear()
                        page_errors.clear()
                        
                        self.system_status.pages_checked += 1
                        
                        # 短い待機
                        await asyncio.sleep(1)
                        
                    except Exception as e:
                        logger.error(f"ページチェックエラー {url}: {e}")
                        errors.append(ErrorInfo(
                            timestamp=datetime.now().isoformat(),
                            type="navigation_error",
                            level="error",
                            message=f"ページアクセスエラー: {str(e)}",
                            stack_trace=traceback.format_exc(),
                            source="frontend",
                            url=url,
                            line_number=None,
                            column_number=None,
                            user_agent=None,
                            page_title=None
                        ))
                
                await browser.close()
                
        except ImportError:
            logger.warning("Playwrightがインストールされていません。pip install playwrightを実行してください。")
            return []
        except Exception as e:
            logger.error(f"Playwrightエラーチェック失敗: {e}")
            errors.append(ErrorInfo(
                timestamp=datetime.now().isoformat(),
                type="playwright_error",
                level="error",
                message=f"Playwrightエラー: {str(e)}",
                stack_trace=traceback.format_exc(),
                source="monitor",
                url=None,
                line_number=None,
                column_number=None,
                user_agent=None,
                page_title=None
            ))
        
        return errors

    def check_api_endpoints(self) -> List[ErrorInfo]:
        """APIエンドポイントをチェック"""
        errors = []
        
        for endpoint in self.api_endpoints:
            try:
                url = f"{self.backend_base_url}{endpoint}"
                logger.info(f"APIチェック中: {url}")
                
                response = requests.get(url, timeout=10)
                
                if response.status_code >= 400:
                    errors.append(ErrorInfo(
                        timestamp=datetime.now().isoformat(),
                        type="api_error",
                        level="error" if response.status_code >= 500 else "warning",
                        message=f"APIエラー: HTTP {response.status_code} - {response.text}",
                        stack_trace=None,
                        source="backend",
                        url=url,
                        line_number=None,
                        column_number=None,
                        user_agent=None,
                        page_title=None
                    ))
                
                # レスポンス内容をチェック
                try:
                    data = response.json()
                    if isinstance(data, dict) and data.get('error'):
                        errors.append(ErrorInfo(
                            timestamp=datetime.now().isoformat(),
                            type="api_response_error",
                            level="error",
                            message=f"APIレスポンスエラー: {data['error']}",
                            stack_trace=None,
                            source="backend",
                            url=url,
                            line_number=None,
                            column_number=None,
                            user_agent=None,
                            page_title=None
                        ))
                except:
                    pass  # JSONでない場合は無視
                
                self.system_status.api_endpoints_checked += 1
                
            except requests.RequestException as e:
                logger.error(f"APIエラー {url}: {e}")
                errors.append(ErrorInfo(
                    timestamp=datetime.now().isoformat(),
                    type="network_error",
                    level="error",
                    message=f"ネットワークエラー: {str(e)}",
                    stack_trace=traceback.format_exc(),
                    source="backend",
                    url=url,
                    line_number=None,
                    column_number=None,
                    user_agent=None,
                    page_title=None
                ))
            except Exception as e:
                logger.error(f"予期しないAPIエラー {url}: {e}")
                errors.append(ErrorInfo(
                    timestamp=datetime.now().isoformat(),
                    type="unexpected_error",
                    level="error",
                    message=f"予期しないエラー: {str(e)}",
                    stack_trace=traceback.format_exc(),
                    source="backend",
                    url=url,
                    line_number=None,
                    column_number=None,
                    user_agent=None,
                    page_title=None
                ))
        
        return errors

    def check_build_errors(self) -> List[ErrorInfo]:
        """ビルドエラーをチェック"""
        errors = []
        
        try:
            # フロントエンドのビルドチェック
            frontend_path = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/frontend"
            if os.path.exists(frontend_path):
                result = subprocess.run(
                    ["npm", "run", "build", "--if-present"],
                    cwd=frontend_path,
                    capture_output=True,
                    text=True,
                    timeout=120
                )
                
                if result.returncode != 0:
                    errors.append(ErrorInfo(
                        timestamp=datetime.now().isoformat(),
                        type="build_error",
                        level="error",
                        message=f"フロントエンドビルドエラー: {result.stderr}",
                        stack_trace=None,
                        source="build",
                        url=None,
                        line_number=None,
                        column_number=None,
                        user_agent=None,
                        page_title=None
                    ))
                
                # TypeScriptエラーをチェック
                if "error TS" in result.stderr:
                    errors.append(ErrorInfo(
                        timestamp=datetime.now().isoformat(),
                        type="typescript_error",
                        level="error",
                        message=f"TypeScriptエラー: {result.stderr}",
                        stack_trace=None,
                        source="build",
                        url=None,
                        line_number=None,
                        column_number=None,
                        user_agent=None,
                        page_title=None
                    ))
        
        except Exception as e:
            logger.error(f"ビルドチェックエラー: {e}")
            errors.append(ErrorInfo(
                timestamp=datetime.now().isoformat(),
                type="build_check_error",
                level="error",
                message=f"ビルドチェックエラー: {str(e)}",
                stack_trace=traceback.format_exc(),
                source="monitor",
                url=None,
                line_number=None,
                column_number=None,
                user_agent=None,
                page_title=None
            ))
        
        return errors

    async def run_comprehensive_check(self) -> Tuple[List[ErrorInfo], SystemStatus]:
        """包括的エラーチェックを実行"""
        start_time = time.time()
        all_errors = []
        
        logger.info("包括的エラーチェック開始")
        
        # システム状態をリセット
        self.system_status.pages_checked = 0
        self.system_status.api_endpoints_checked = 0
        
        try:
            # 並行してチェックを実行
            with ThreadPoolExecutor(max_workers=3) as executor:
                # フロントエンドチェック（Playwright）
                frontend_future = executor.submit(asyncio.run, self.check_frontend_with_playwright())
                
                # APIチェック
                api_future = executor.submit(self.check_api_endpoints)
                
                # ビルドチェック
                build_future = executor.submit(self.check_build_errors)
                
                # 結果を収集
                frontend_errors = frontend_future.result()
                api_errors = api_future.result()
                build_errors = build_future.result()
                
                all_errors.extend(frontend_errors)
                all_errors.extend(api_errors)
                all_errors.extend(build_errors)
        
        except Exception as e:
            logger.error(f"包括的チェック実行エラー: {e}")
            all_errors.append(ErrorInfo(
                timestamp=datetime.now().isoformat(),
                type="monitor_error",
                level="error",
                message=f"監視システムエラー: {str(e)}",
                stack_trace=traceback.format_exc(),
                source="monitor",
                url=None,
                line_number=None,
                column_number=None,
                user_agent=None,
                page_title=None
            ))
        
        # エラーを分類
        frontend_errors_count = len([e for e in all_errors if e.source == "frontend"])
        backend_errors_count = len([e for e in all_errors if e.source == "backend"])
        api_errors_count = len([e for e in all_errors if e.type.startswith("api")])
        console_errors_count = len([e for e in all_errors if e.type == "console_error"])
        network_errors_count = len([e for e in all_errors if e.type == "network_error"])
        
        # システム状態を更新
        self.system_status.timestamp = datetime.now().isoformat()
        self.system_status.frontend_errors = frontend_errors_count
        self.system_status.backend_errors = backend_errors_count
        self.system_status.api_errors = api_errors_count
        self.system_status.console_errors = console_errors_count
        self.system_status.network_errors = network_errors_count
        self.system_status.total_errors = len(all_errors)
        self.system_status.last_check_duration = time.time() - start_time
        
        # ステータスを決定
        if len(all_errors) == 0:
            self.system_status.status = "healthy"
            self.consecutive_clean_checks += 1
        elif len(all_errors) < 5:
            self.system_status.status = "errors_detected"
            self.consecutive_clean_checks = 0
        else:
            self.system_status.status = "critical"
            self.consecutive_clean_checks = 0
        
        logger.info(f"チェック完了: {len(all_errors)}個のエラーを検出")
        
        return all_errors, self.system_status

    def save_error_data(self, errors: List[ErrorInfo], status: SystemStatus):
        """エラーデータを保存"""
        try:
            # エラー情報を保存
            error_data = {
                "timestamp": datetime.now().isoformat(),
                "errors": [asdict(error) for error in errors],
                "total_count": len(errors),
                "frontend_errors": [asdict(e) for e in errors if e.source == "frontend"],
                "backend_errors": [asdict(e) for e in errors if e.source == "backend"],
                "api_errors": [asdict(e) for e in errors if e.type.startswith("api")],
                "console_errors": [asdict(e) for e in errors if e.type == "console_error"],
                "network_errors": [asdict(e) for e in errors if e.type == "network_error"]
            }
            
            with open(self.errors_file, 'w', encoding='utf-8') as f:
                json.dump(error_data, f, ensure_ascii=False, indent=2)
            
            # ステータス情報を保存
            status_data = asdict(status)
            status_data["consecutive_clean_checks"] = self.consecutive_clean_checks
            status_data["required_clean_checks"] = self.required_clean_checks
            status_data["completion_status"] = "completed" if self.consecutive_clean_checks >= self.required_clean_checks else "in_progress"
            
            with open(self.status_file, 'w', encoding='utf-8') as f:
                json.dump(status_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"エラーデータ保存完了: {len(errors)}個のエラー")
            
        except Exception as e:
            logger.error(f"エラーデータ保存失敗: {e}")

    def generate_repair_instructions(self, errors: List[ErrorInfo]) -> Dict[str, Any]:
        """修復指示を生成"""
        instructions = {
            "timestamp": datetime.now().isoformat(),
            "total_errors": len(errors),
            "instructions": [],
            "priority_actions": [],
            "agent_tasks": {
                "ITSM-DevUI": [],
                "ITSM-DevAPI": [],
                "ITSM-Manager": []
            }
        }
        
        # エラーを分析して修復指示を生成
        for error in errors:
            instruction = {
                "error_id": f"{error.type}_{hash(error.message)}",
                "error_type": error.type,
                "priority": "high" if error.level == "error" else "medium",
                "description": error.message,
                "suggested_fix": self.get_suggested_fix(error),
                "assigned_agent": self.get_assigned_agent(error),
                "timestamp": error.timestamp
            }
            
            instructions["instructions"].append(instruction)
            
            # 優先度の高いアクションを抽出
            if error.level == "error":
                instructions["priority_actions"].append(instruction)
            
            # エージェントタスクに追加
            agent = instruction["assigned_agent"]
            if agent in instructions["agent_tasks"]:
                instructions["agent_tasks"][agent].append(instruction)
        
        # 修復指示を保存
        try:
            with open(self.fixes_file, 'w', encoding='utf-8') as f:
                json.dump(instructions, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"修復指示保存失敗: {e}")
        
        return instructions

    def get_suggested_fix(self, error: ErrorInfo) -> str:
        """エラーに対する修復提案を生成"""
        if error.type == "console_error":
            return f"コンソールエラーを修正: {error.message[:100]}..."
        elif error.type == "api_error":
            return f"APIエンドポイントを修正: {error.url}"
        elif error.type == "network_error":
            return f"ネットワーク接続を確認: {error.url}"
        elif error.type == "typescript_error":
            return f"TypeScriptエラーを修正: {error.message[:100]}..."
        elif error.type == "build_error":
            return f"ビルドエラーを修正: 依存関係とコンパイル設定を確認"
        else:
            return f"エラーを調査・修正: {error.message[:100]}..."

    def get_assigned_agent(self, error: ErrorInfo) -> str:
        """エラーを担当するエージェントを決定"""
        if error.source == "frontend" or error.type in ["console_error", "javascript_error", "page_error"]:
            return "ITSM-DevUI"
        elif error.source == "backend" or error.type in ["api_error", "network_error"]:
            return "ITSM-DevAPI"
        else:
            return "ITSM-Manager"

    async def continuous_monitoring_loop(self):
        """継続監視ループ"""
        logger.info("継続監視ループ開始")
        
        # Playwrightを初期化
        if not await self.initialize_playwright():
            logger.error("Playwright初期化に失敗しました")
            return
        
        check_interval = 60  # 60秒間隔
        
        while True:
            try:
                logger.info(f"監視チェック開始 (連続クリーン: {self.consecutive_clean_checks}/{self.required_clean_checks})")
                
                # 包括的チェックを実行
                errors, status = await self.run_comprehensive_check()
                
                # データを保存
                self.save_error_data(errors, status)
                
                # 修復指示を生成
                if errors:
                    repair_instructions = self.generate_repair_instructions(errors)
                    logger.info(f"修復指示を生成: {len(repair_instructions['instructions'])}件")
                
                # 完了判定
                if self.consecutive_clean_checks >= self.required_clean_checks:
                    logger.info("🎉 エラーゼロ達成！継続監視を完了します。")
                    break
                
                # ステータスを出力
                logger.info(f"現在のステータス: {status.status}")
                logger.info(f"総エラー数: {status.total_errors}")
                logger.info(f"フロントエンドエラー: {status.frontend_errors}")
                logger.info(f"バックエンドエラー: {status.backend_errors}")
                logger.info(f"APIエラー: {status.api_errors}")
                logger.info(f"コンソールエラー: {status.console_errors}")
                
                # 待機
                logger.info(f"{check_interval}秒後に次のチェックを実行...")
                await asyncio.sleep(check_interval)
                
            except KeyboardInterrupt:
                logger.info("監視ループを中断しました")
                break
            except Exception as e:
                logger.error(f"監視ループエラー: {e}")
                await asyncio.sleep(check_interval)

    async def run_single_check(self):
        """単発チェックを実行"""
        logger.info("単発エラーチェック開始")
        
        # Playwrightを初期化
        if not await self.initialize_playwright():
            logger.error("Playwright初期化に失敗しました")
            return
        
        errors, status = await self.run_comprehensive_check()
        self.save_error_data(errors, status)
        
        if errors:
            repair_instructions = self.generate_repair_instructions(errors)
            logger.info(f"修復指示を生成: {len(repair_instructions['instructions'])}件")
        
        logger.info("単発チェック完了")
        return errors, status

async def main():
    """メイン実行関数"""
    monitor = ComprehensiveErrorMonitor()
    
    if len(sys.argv) > 1 and sys.argv[1] == "--single":
        # 単発チェック
        await monitor.run_single_check()
    else:
        # 継続監視ループ
        await monitor.continuous_monitoring_loop()

if __name__ == "__main__":
    asyncio.run(main())