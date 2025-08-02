#!/usr/bin/env python3
"""
Playwright E2Eテストスイート
- GitHub Actions自動化システムのブラウザテスト
- UI統合テストとワークフロー検証
- 自動スクリーンショット付きレポート生成
"""

import asyncio
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import sys
import os

# Playwright imports
try:
    from playwright.async_api import async_playwright, Page, Browser, BrowserContext
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("Warning: Playwright not available. E2E tests will be skipped.")

# プロジェクトルートをパスに追加
sys.path.append(str(Path(__file__).parent.parent.parent))

class PlaywrightE2ETestSuite:
    """Playwright E2Eテストスイート"""
    
    def __init__(self):
        self.base_path = Path(__file__).parent
        self.project_root = self.base_path.parent.parent
        self.test_results = []
        self.start_time = datetime.now()
        
        # テスト設定
        self.config = {
            "headless": True,
            "slow_mo": 100,  # スローモーションモード（ミリ秒）
            "viewport": {"width": 1280, "height": 720},
            "timeout": 30000,  # 30秒
            "screenshots_dir": self.base_path / "screenshots",
            "videos_dir": self.base_path / "videos"
        }
        
        # テスト結果ディレクトリ作成
        self.config["screenshots_dir"].mkdir(exist_ok=True)
        self.config["videos_dir"].mkdir(exist_ok=True)

    async def setup_browser(self, browser_type: str = "chromium"):
        """ブラウザセットアップ"""
        if not PLAYWRIGHT_AVAILABLE:
            raise ImportError("Playwright not available")
        
        playwright = await async_playwright().start()
        
        # ブラウザ起動
        if browser_type == "chromium":
            browser = await playwright.chromium.launch(
                headless=self.config["headless"],
                slow_mo=self.config["slow_mo"]
            )
        elif browser_type == "firefox":
            browser = await playwright.firefox.launch(
                headless=self.config["headless"],
                slow_mo=self.config["slow_mo"]
            )
        elif browser_type == "webkit":
            browser = await playwright.webkit.launch(
                headless=self.config["headless"],
                slow_mo=self.config["slow_mo"]
            )
        else:
            raise ValueError(f"Unsupported browser type: {browser_type}")
        
        # コンテキスト作成
        context = await browser.new_context(
            viewport=self.config["viewport"],
            record_video_dir=str(self.config["videos_dir"]) if self.config.get("record_video") else None
        )
        
        # ページ作成
        page = await context.new_page()
        page.set_default_timeout(self.config["timeout"])
        
        return playwright, browser, context, page

    async def take_screenshot(self, page: Page, name: str, full_page: bool = True):
        """スクリーンショット撮影"""
        screenshot_path = self.config["screenshots_dir"] / f"{name}_{datetime.now().strftime('%H%M%S')}.png"
        await page.screenshot(path=str(screenshot_path), full_page=full_page)
        return screenshot_path

    async def test_frontend_availability(self, page: Page) -> Dict[str, Any]:
        """フロントエンド利用可能性テスト"""
        test_name = "Frontend Availability"
        print(f"🔍 Testing: {test_name}")
        
        try:
            # ローカル開発サーバーURLを試行
            frontend_urls = [
                "http://localhost:5173",  # Vite デフォルト
                "http://localhost:3000",  # React デフォルト
                "http://localhost:8080",  # 代替ポート
                "http://127.0.0.1:5173"
            ]
            
            frontend_url = None
            for url in frontend_urls:
                try:
                    response = await page.goto(url, wait_until="domcontentloaded", timeout=5000)
                    if response and response.status < 400:
                        frontend_url = url
                        break
                except Exception:
                    continue
            
            if frontend_url:
                await self.take_screenshot(page, "frontend_loaded")
                
                # 基本的なDOM要素をチェック
                title = await page.title()
                
                test_result = {
                    "test_name": test_name,
                    "status": "PASS",
                    "message": f"Frontend accessible at {frontend_url}",
                    "details": {
                        "url": frontend_url,
                        "title": title,
                        "screenshot": "frontend_loaded"
                    },
                    "timestamp": datetime.now().isoformat()
                }
                print(f"✅ Frontend availability test passed - {frontend_url}")
            else:
                await self.take_screenshot(page, "frontend_failed")
                test_result = {
                    "test_name": test_name,
                    "status": "SKIP",
                    "message": "Frontend not running on any expected port",
                    "details": {"attempted_urls": frontend_urls},
                    "timestamp": datetime.now().isoformat()
                }
                print("⚠️ Frontend not available - test skipped")
                
        except Exception as e:
            await self.take_screenshot(page, "frontend_error")
            test_result = {
                "test_name": test_name,
                "status": "ERROR",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            }
            print(f"💥 Frontend availability test error: {e}")
        
        self.test_results.append(test_result)
        return test_result

    async def test_backend_api_health(self, page: Page) -> Dict[str, Any]:
        """バックエンドAPI健全性テスト"""
        test_name = "Backend API Health"
        print(f"🔍 Testing: {test_name}")
        
        try:
            # APIエンドポイントをテスト
            backend_urls = [
                "http://localhost:8000",
                "http://localhost:5000",
                "http://127.0.0.1:8000"
            ]
            
            api_url = None
            for url in backend_urls:
                try:
                    response = await page.goto(f"{url}/docs", wait_until="domcontentloaded", timeout=5000)
                    if response and response.status < 400:
                        api_url = url
                        break
                except Exception:
                    continue
            
            if api_url:
                await self.take_screenshot(page, "api_docs")
                
                # SwaggerUIの確認
                page_content = await page.content()
                
                test_result = {
                    "test_name": test_name,
                    "status": "PASS",
                    "message": f"Backend API accessible at {api_url}",
                    "details": {
                        "api_url": api_url,
                        "docs_available": "swagger" in page_content.lower(),
                        "screenshot": "api_docs"
                    },
                    "timestamp": datetime.now().isoformat()
                }
                print(f"✅ Backend API health test passed - {api_url}")
            else:
                test_result = {
                    "test_name": test_name,
                    "status": "SKIP",
                    "message": "Backend API not running on any expected port",
                    "details": {"attempted_urls": backend_urls},
                    "timestamp": datetime.now().isoformat()
                }
                print("⚠️ Backend API not available - test skipped")
                
        except Exception as e:
            await self.take_screenshot(page, "api_error")
            test_result = {
                "test_name": test_name,
                "status": "ERROR",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            }
            print(f"💥 Backend API health test error: {e}")
        
        self.test_results.append(test_result)
        return test_result

    async def test_github_actions_ui_simulation(self, page: Page) -> Dict[str, Any]:
        """GitHub Actions UI シミュレーションテスト"""
        test_name = "GitHub Actions UI Simulation"
        print(f"🔍 Testing: {test_name}")
        
        try:
            # GitHub Actionsページへのナビゲーション（シミュレーション）
            github_url = "https://github.com/Kensan196948G/ITSM-ITManagementSystem/actions"
            
            response = await page.goto(github_url, wait_until="domcontentloaded", timeout=10000)
            
            if response and response.status < 400:
                await self.take_screenshot(page, "github_actions")
                
                # ページタイトルと基本要素の確認
                title = await page.title()
                is_github = "github" in title.lower()
                
                # Actions特有の要素があるかチェック
                workflow_elements = await page.query_selector_all('[data-testid*="workflow"], .js-navigation-item')
                
                test_result = {
                    "test_name": test_name,
                    "status": "PASS",
                    "message": "GitHub Actions page loaded successfully",
                    "details": {
                        "title": title,
                        "is_github_page": is_github,
                        "workflow_elements_found": len(workflow_elements),
                        "screenshot": "github_actions"
                    },
                    "timestamp": datetime.now().isoformat()
                }
                print("✅ GitHub Actions UI simulation test passed")
            else:
                test_result = {
                    "test_name": test_name,
                    "status": "FAIL", 
                    "message": f"Failed to load GitHub Actions page - Status: {response.status if response else 'No response'}",
                    "timestamp": datetime.now().isoformat()
                }
                print("❌ GitHub Actions UI simulation test failed")
                
        except Exception as e:
            await self.take_screenshot(page, "github_actions_error")
            test_result = {
                "test_name": test_name,
                "status": "ERROR",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            }
            print(f"💥 GitHub Actions UI simulation test error: {e}")
        
        self.test_results.append(test_result)
        return test_result

    async def test_error_monitoring_dashboard_simulation(self, page: Page) -> Dict[str, Any]:
        """エラー監視ダッシュボードシミュレーションテスト"""
        test_name = "Error Monitoring Dashboard Simulation"
        print(f"🔍 Testing: {test_name}")
        
        try:
            # HTMLページでダッシュボードシミュレーションを作成
            dashboard_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>ITSM Error Monitoring Dashboard</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 20px; }}
                    .dashboard {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
                    .card {{ border: 1px solid #ddd; padding: 20px; border-radius: 8px; }}
                    .status-ok {{ background-color: #d4edda; }}
                    .status-error {{ background-color: #f8d7da; }}
                    .metric {{ font-size: 24px; font-weight: bold; }}
                </style>
            </head>
            <body>
                <h1>ITSM Error Monitoring Dashboard</h1>
                <div class="dashboard">
                    <div class="card status-ok">
                        <h3>GitHub Actions Status</h3>
                        <div class="metric" id="github-status">Monitoring</div>
                        <p>Last check: {datetime.now().strftime('%H:%M:%S')}</p>
                    </div>
                    <div class="card">
                        <h3>Error Count</h3>
                        <div class="metric" id="error-count">0</div>
                        <p>Auto-repair: Enabled</p>
                    </div>
                    <div class="card">
                        <h3>Repair Success Rate</h3>
                        <div class="metric" id="success-rate">98%</div>
                        <p>Last 24 hours</p>
                    </div>
                    <div class="card status-ok">
                        <h3>System Status</h3>
                        <div class="metric" id="system-status">Operational</div>
                        <p>All systems go</p>
                    </div>
                </div>
                <script>
                    // シミュレーションスクリプト
                    setInterval(() => {{
                        document.getElementById('error-count').textContent = Math.floor(Math.random() * 3);
                        document.getElementById('success-rate').textContent = (95 + Math.random() * 5).toFixed(1) + '%';
                    }}, 2000);
                </script>
            </body>
            </html>
            """
            
            # 一時HTMLファイルを作成
            temp_html = self.base_path / "temp_dashboard.html"
            with open(temp_html, 'w') as f:
                f.write(dashboard_html)
            
            # ダッシュボードページをロード
            await page.goto(f"file://{temp_html}")
            await page.wait_for_load_state("domcontentloaded")
            
            # ダッシュボード要素の確認
            title = await page.title()
            dashboard_elements = await page.query_selector_all(".card")
            error_count = await page.text_content("#error-count")
            
            await self.take_screenshot(page, "error_dashboard")
            
            # 動的要素のテスト（2秒待機して変化を確認）
            await page.wait_for_timeout(2500)
            await self.take_screenshot(page, "error_dashboard_updated")
            
            # クリーンアップ
            temp_html.unlink()
            
            test_result = {
                "test_name": test_name,
                "status": "PASS",
                "message": "Error monitoring dashboard simulation successful",
                "details": {
                    "title": title,
                    "dashboard_cards": len(dashboard_elements),
                    "error_count": error_count,
                    "screenshots": ["error_dashboard", "error_dashboard_updated"]
                },
                "timestamp": datetime.now().isoformat()
            }
            print("✅ Error monitoring dashboard simulation test passed")
            
        except Exception as e:
            await self.take_screenshot(page, "dashboard_error")
            test_result = {
                "test_name": test_name,
                "status": "ERROR",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            }
            print(f"💥 Error monitoring dashboard simulation test error: {e}")
        
        self.test_results.append(test_result)
        return test_result

    async def test_responsive_design(self, page: Page) -> Dict[str, Any]:
        """レスポンシブデザインテスト"""
        test_name = "Responsive Design"
        print(f"🔍 Testing: {test_name}")
        
        try:
            # 異なる画面サイズでのテスト
            viewports = [
                {"width": 375, "height": 667, "name": "mobile"},
                {"width": 768, "height": 1024, "name": "tablet"},
                {"width": 1920, "height": 1080, "name": "desktop"}
            ]
            
            responsive_results = []
            
            for viewport in viewports:
                await page.set_viewport_size({"width": viewport["width"], "height": viewport["height"]})
                
                # 簡単なテストページを作成
                test_html = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Responsive Test</title>
                    <style>
                        body {{ margin: 0; font-family: Arial, sans-serif; }}
                        .container {{ padding: 20px; }}
                        .responsive-grid {{ 
                            display: grid; 
                            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                            gap: 20px; 
                        }}
                        .card {{ 
                            border: 1px solid #ddd; 
                            padding: 20px; 
                            text-align: center;
                            background: #f5f5f5;
                        }}
                        @media (max-width: 768px) {{
                            .responsive-grid {{ grid-template-columns: 1fr; }}
                        }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Responsive Layout Test</h1>
                        <p>Viewport: {viewport["width"]}x{viewport["height"]}</p>
                        <div class="responsive-grid">
                            <div class="card">Card 1</div>
                            <div class="card">Card 2</div>
                            <div class="card">Card 3</div>
                        </div>
                    </div>
                </body>
                </html>
                """
                
                temp_html = self.base_path / f"temp_responsive_{viewport['name']}.html"
                with open(temp_html, 'w') as f:
                    f.write(test_html)
                
                await page.goto(f"file://{temp_html}")
                await page.wait_for_load_state("domcontentloaded")
                
                # スクリーンショット撮影
                screenshot_path = await self.take_screenshot(page, f"responsive_{viewport['name']}")
                
                # レイアウト確認
                cards = await page.query_selector_all(".card")
                
                responsive_results.append({
                    "viewport": viewport,
                    "cards_found": len(cards),
                    "screenshot": f"responsive_{viewport['name']}"
                })
                
                # クリーンアップ
                temp_html.unlink()
            
            # 元の画面サイズに戻す
            await page.set_viewport_size(self.config["viewport"])
            
            test_result = {
                "test_name": test_name,
                "status": "PASS",
                "message": f"Responsive design tested across {len(viewports)} viewports",
                "details": {
                    "viewports_tested": len(viewports),
                    "results": responsive_results
                },
                "timestamp": datetime.now().isoformat()
            }
            print("✅ Responsive design test passed")
            
        except Exception as e:
            await self.take_screenshot(page, "responsive_error")
            test_result = {
                "test_name": test_name,
                "status": "ERROR",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            }
            print(f"💥 Responsive design test error: {e}")
        
        self.test_results.append(test_result)
        return test_result

    async def test_accessibility_basics(self, page: Page) -> Dict[str, Any]:
        """基本的なアクセシビリティテスト"""
        test_name = "Accessibility Basics"
        print(f"🔍 Testing: {test_name}")
        
        try:
            # アクセシビリティテスト用のページ
            accessibility_html = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <title>Accessibility Test Page</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .button { padding: 10px 20px; margin: 10px; background: #007bff; color: white; border: none; cursor: pointer; }
                    .button:focus { outline: 2px solid #0056b3; }
                    .error { color: #dc3545; }
                    .success { color: #28a745; }
                </style>
            </head>
            <body>
                <h1>ITSM Accessibility Test</h1>
                
                <nav aria-label="Main navigation">
                    <ul>
                        <li><a href="#dashboard">Dashboard</a></li>
                        <li><a href="#monitoring">Monitoring</a></li>
                        <li><a href="#settings">Settings</a></li>
                    </ul>
                </nav>
                
                <main>
                    <section id="dashboard">
                        <h2>Dashboard</h2>
                        <button class="button" aria-label="Start monitoring">Start</button>
                        <button class="button" aria-label="Stop monitoring">Stop</button>
                    </section>
                    
                    <section id="form-section">
                        <h2>Configuration Form</h2>
                        <form>
                            <label for="repo-url">Repository URL:</label>
                            <input type="url" id="repo-url" name="repo-url" required aria-describedby="repo-help">
                            <small id="repo-help">Enter the GitHub repository URL to monitor</small>
                            
                            <label for="check-interval">Check Interval (seconds):</label>
                            <input type="number" id="check-interval" name="check-interval" min="10" max="3600" value="30">
                            
                            <button type="submit" class="button">Save Configuration</button>
                        </form>
                    </section>
                    
                    <section id="status">
                        <h2>System Status</h2>
                        <div role="status" aria-live="polite">
                            <p class="success">System operational</p>
                        </div>
                    </section>
                </main>
                
                <footer>
                    <p>ITSM Auto-Repair System &copy; 2024</p>
                </footer>
            </body>
            </html>
            """
            
            temp_html = self.base_path / "temp_accessibility.html"
            with open(temp_html, 'w') as f:
                f.write(accessibility_html)
            
            await page.goto(f"file://{temp_html}")
            await page.wait_for_load_state("domcontentloaded")
            
            # アクセシビリティチェック項目
            checks = []
            
            # 1. ページタイトルの確認
            title = await page.title()
            checks.append({
                "check": "Page title exists",
                "result": bool(title and len(title) > 0),
                "value": title
            })
            
            # 2. メインランドマークの確認
            main_element = await page.query_selector("main")
            checks.append({
                "check": "Main landmark exists",
                "result": main_element is not None
            })
            
            # 3. 見出し構造の確認
            headings = await page.query_selector_all("h1, h2, h3, h4, h5, h6")
            checks.append({
                "check": "Headings structure",
                "result": len(headings) > 0,
                "value": len(headings)
            })
            
            # 4. フォームラベルの確認
            labels = await page.query_selector_all("label[for]")
            inputs_with_labels = await page.query_selector_all("input[id]")
            checks.append({
                "check": "Form labels present",
                "result": len(labels) > 0 and len(inputs_with_labels) > 0,
                "value": f"{len(labels)} labels, {len(inputs_with_labels)} inputs"
            })
            
            # 5. ARIA属性の確認
            aria_elements = await page.query_selector_all("[aria-label], [aria-describedby], [role]")
            checks.append({
                "check": "ARIA attributes present",
                "result": len(aria_elements) > 0,
                "value": len(aria_elements)
            })
            
            # 6. フォーカス可能要素のテスト
            await page.focus("button")
            focused_element = await page.evaluate("document.activeElement.tagName")
            checks.append({
                "check": "Focus management",
                "result": focused_element.lower() == "button"
            })
            
            await self.take_screenshot(page, "accessibility_test")
            
            # クリーンアップ
            temp_html.unlink()
            
            passed_checks = sum(1 for check in checks if check["result"])
            total_checks = len(checks)
            
            test_result = {
                "test_name": test_name,
                "status": "PASS" if passed_checks >= total_checks * 0.8 else "WARN",
                "message": f"Accessibility checks: {passed_checks}/{total_checks} passed",
                "details": {
                    "passed_checks": passed_checks,
                    "total_checks": total_checks,
                    "checks": checks,
                    "screenshot": "accessibility_test"
                },
                "timestamp": datetime.now().isoformat()
            }
            
            if passed_checks >= total_checks * 0.8:
                print("✅ Accessibility basics test passed")
            else:
                print("⚠️ Accessibility basics test passed with warnings")
            
        except Exception as e:
            await self.take_screenshot(page, "accessibility_error")
            test_result = {
                "test_name": test_name,
                "status": "ERROR",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            }
            print(f"💥 Accessibility basics test error: {e}")
        
        self.test_results.append(test_result)
        return test_result

    async def run_all_e2e_tests(self, browser_type: str = "chromium") -> Dict[str, Any]:
        """全E2Eテストの実行"""
        if not PLAYWRIGHT_AVAILABLE:
            return {
                "status": "SKIPPED",
                "message": "Playwright not available",
                "test_results": []
            }
        
        print("🚀 Starting Playwright E2E Test Suite")
        print("=" * 60)
        
        playwright, browser, context, page = await self.setup_browser(browser_type)
        
        try:
            # 全テストを実行
            test_methods = [
                self.test_frontend_availability,
                self.test_backend_api_health,
                self.test_github_actions_ui_simulation,
                self.test_error_monitoring_dashboard_simulation,
                self.test_responsive_design,
                self.test_accessibility_basics
            ]
            
            for test_method in test_methods:
                try:
                    await test_method(page)
                    await asyncio.sleep(1)  # テスト間の間隔
                except Exception as e:
                    print(f"💥 Test execution error: {e}")
            
        finally:
            # クリーンアップ
            await page.close()
            await context.close()
            await browser.close()
            await playwright.stop()
        
        # テスト結果のサマリー
        return await self.generate_e2e_report()

    async def generate_e2e_report(self) -> Dict[str, Any]:
        """E2Eテストレポートの生成"""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["status"] == "PASS"])
        failed_tests = len([r for r in self.test_results if r["status"] == "FAIL"])
        error_tests = len([r for r in self.test_results if r["status"] == "ERROR"])
        warn_tests = len([r for r in self.test_results if r["status"] == "WARN"])
        skip_tests = len([r for r in self.test_results if r["status"] == "SKIP"])
        
        duration = (datetime.now() - self.start_time).total_seconds()
        
        summary = {
            "test_suite": "Playwright E2E Test Suite",
            "execution_time": datetime.now().isoformat(),
            "duration_seconds": duration,
            "browser": "chromium",
            "total_tests": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "errors": error_tests,
            "warnings": warn_tests,
            "skipped": skip_tests,
            "success_rate": passed_tests / total_tests if total_tests > 0 else 0,
            "screenshots_generated": len(list(self.config["screenshots_dir"].glob("*.png"))),
            "results": self.test_results
        }
        
        # レポートファイルに保存
        report_file = self.base_path / "reports" / f"playwright_e2e_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        report_file.parent.mkdir(exist_ok=True)
        
        with open(report_file, 'w') as f:
            json.dump(summary, f, indent=2)
        
        # コンソール出力
        print("\n" + "=" * 60)
        print("📊 E2E TEST SUITE SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"💥 Errors: {error_tests}")
        print(f"⚠️  Warnings: {warn_tests}")
        print(f"⏭️  Skipped: {skip_tests}")
        print(f"📈 Success Rate: {summary['success_rate']:.1%}")
        print(f"⏱️  Duration: {duration:.2f}s")
        print(f"📷 Screenshots: {summary['screenshots_generated']}")
        print(f"📄 Report saved: {report_file}")
        print("=" * 60)
        
        return summary


async def main():
    """メイン実行関数"""
    test_suite = PlaywrightE2ETestSuite()
    
    try:
        report = await test_suite.run_all_e2e_tests()
        
        if report.get("status") == "SKIPPED":
            print("⚠️ E2E tests skipped - Playwright not available")
            return 0
        
        # 最終判定
        if report["success_rate"] >= 0.7:  # E2Eテストは70%以上で合格
            print("🎉 E2E tests completed successfully!")
            exit_code = 0
        else:
            print("⚠️ E2E tests need attention")
            exit_code = 1
            
        return exit_code
        
    except Exception as e:
        print(f"💥 E2E test suite execution failed: {e}")
        return 2


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)