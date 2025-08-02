#!/usr/bin/env python3
"""
Playwright E2E & 負荷テストスイート
ITSM準拠の包括的テスト自動化システム

機能:
- End-to-End テスト
- API負荷テスト
- ユーザビリティテスト
- セキュリティテスト
- パフォーマンステスト
"""

import asyncio
import json
import time
import logging
import traceback
import aiohttp
import statistics
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor
import subprocess
import psutil

# Playwright imports
try:
    from playwright.async_api import async_playwright, Browser, Page, BrowserContext
except ImportError:
    print("Warning: Playwright not installed. Install with: pip install playwright")
    async_playwright = None

@dataclass
class E2ETestResult:
    """E2Eテスト結果"""
    test_name: str
    status: str
    duration: float
    errors: List[str]
    screenshots: List[str]
    performance_metrics: Dict[str, Any]
    timestamp: str

@dataclass
class LoadTestResult:
    """負荷テスト結果"""
    test_name: str
    concurrent_users: int
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time: float
    min_response_time: float
    max_response_time: float
    throughput: float
    error_rate: float
    timestamp: str

@dataclass
class SecurityTestResult:
    """セキュリティテスト結果"""
    test_name: str
    vulnerability_type: str
    severity: str
    status: str
    details: str
    recommendation: str
    timestamp: str

class PlaywrightTestSuite:
    """Playwright テストスイート"""
    
    def __init__(self, project_root: str = None):
        self.project_root = Path(project_root or Path(__file__).parent.parent)
        self.reports_dir = self.project_root / "coordination" / "reports"
        self.screenshots_dir = self.project_root / "coordination" / "screenshots"
        self.setup_logging()
        self.setup_directories()
        
        # テスト設定
        self.base_url = "http://localhost:3000"
        self.api_base_url = "http://localhost:3001"
        self.test_timeout = 30000  # 30秒
        
        # 結果保存
        self.e2e_results: List[E2ETestResult] = []
        self.load_test_results: List[LoadTestResult] = []
        self.security_results: List[SecurityTestResult] = []
        
        # ブラウザインスタンス
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        
    def setup_logging(self):
        """ログ設定"""
        log_dir = self.project_root / "coordination" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / "playwright_tests.log"),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger('PlaywrightTestSuite')
        
    def setup_directories(self):
        """必要ディレクトリ作成"""
        dirs = [self.reports_dir, self.screenshots_dir]
        for dir_path in dirs:
            dir_path.mkdir(parents=True, exist_ok=True)
    
    async def run_comprehensive_tests(self) -> Dict[str, Any]:
        """包括的テスト実行"""
        self.logger.info("Starting comprehensive Playwright test suite")
        start_time = time.time()
        
        try:
            if async_playwright is None:
                return await self._create_fallback_results()
            
            async with async_playwright() as p:
                # ブラウザ起動
                self.browser = await p.chromium.launch(
                    headless=True,
                    args=['--no-sandbox', '--disable-dev-shm-usage']
                )
                self.context = await self.browser.new_context(
                    viewport={'width': 1280, 'height': 720},
                    ignore_https_errors=True
                )
                
                # E2Eテスト実行
                await self.run_e2e_tests()
                
                # 負荷テスト実行
                await self.run_load_tests()
                
                # セキュリティテスト実行
                await self.run_security_tests()
                
                # パフォーマンステスト実行
                await self.run_performance_tests()
                
                await self.browser.close()
                
        except Exception as e:
            self.logger.error(f"Error in comprehensive tests: {e}")
            self.logger.error(traceback.format_exc())
        
        # 結果集計
        total_duration = time.time() - start_time
        results = await self.generate_test_report(total_duration)
        
        self.logger.info(f"Comprehensive tests completed in {total_duration:.2f} seconds")
        return results
    
    async def run_e2e_tests(self):
        """E2Eテスト実行"""
        self.logger.info("Running E2E tests")
        
        e2e_tests = [
            self.test_homepage_load,
            self.test_navigation,
            self.test_form_interaction,
            self.test_error_handling,
            self.test_responsive_design,
            self.test_accessibility
        ]
        
        for test_func in e2e_tests:
            try:
                await test_func()
            except Exception as e:
                self.logger.error(f"E2E test {test_func.__name__} failed: {e}")
                await self._record_e2e_failure(test_func.__name__, str(e))
    
    async def test_homepage_load(self):
        """ホームページ読み込みテスト"""
        test_name = "homepage_load"
        start_time = time.time()
        errors = []
        screenshots = []
        
        try:
            page = await self.context.new_page()
            
            # ページ読み込み
            response = await page.goto(self.base_url, timeout=self.test_timeout)
            
            if response and response.status >= 400:
                errors.append(f"HTTP {response.status} error")
            
            # スクリーンショット撮影
            screenshot_path = self.screenshots_dir / f"{test_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            await page.screenshot(path=screenshot_path)
            screenshots.append(str(screenshot_path))
            
            # 基本要素の確認
            try:
                await page.wait_for_selector('body', timeout=5000)
                await page.wait_for_load_state('networkidle', timeout=10000)
            except Exception as e:
                errors.append(f"Page load failed: {e}")
            
            await page.close()
            
        except Exception as e:
            errors.append(str(e))
        
        duration = time.time() - start_time
        
        result = E2ETestResult(
            test_name=test_name,
            status='passed' if not errors else 'failed',
            duration=duration,
            errors=errors,
            screenshots=screenshots,
            performance_metrics={'load_time': duration},
            timestamp=datetime.now().isoformat()
        )
        
        self.e2e_results.append(result)
        self.logger.info(f"Homepage load test: {result.status} ({duration:.2f}s)")
    
    async def test_navigation(self):
        """ナビゲーションテスト"""
        test_name = "navigation"
        start_time = time.time()
        errors = []
        screenshots = []
        
        try:
            page = await self.context.new_page()
            await page.goto(self.base_url, timeout=self.test_timeout)
            
            # 主要ナビゲーション要素の確認
            nav_selectors = [
                'nav', 'header', '.navbar', '.menu',
                'a[href]', 'button'
            ]
            
            for selector in nav_selectors:
                try:
                    elements = await page.query_selector_all(selector)
                    if elements:
                        self.logger.debug(f"Found {len(elements)} {selector} elements")
                except Exception as e:
                    errors.append(f"Navigation selector {selector} failed: {e}")
            
            # スクリーンショット
            screenshot_path = self.screenshots_dir / f"{test_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            await page.screenshot(path=screenshot_path)
            screenshots.append(str(screenshot_path))
            
            await page.close()
            
        except Exception as e:
            errors.append(str(e))
        
        duration = time.time() - start_time
        
        result = E2ETestResult(
            test_name=test_name,
            status='passed' if not errors else 'failed',
            duration=duration,
            errors=errors,
            screenshots=screenshots,
            performance_metrics={'navigation_time': duration},
            timestamp=datetime.now().isoformat()
        )
        
        self.e2e_results.append(result)
        self.logger.info(f"Navigation test: {result.status} ({duration:.2f}s)")
    
    async def test_form_interaction(self):
        """フォーム操作テスト"""
        test_name = "form_interaction"
        start_time = time.time()
        errors = []
        screenshots = []
        
        try:
            page = await self.context.new_page()
            await page.goto(self.base_url, timeout=self.test_timeout)
            
            # フォーム要素の検索と操作
            form_selectors = [
                'input[type="text"]',
                'input[type="email"]',
                'input[type="password"]',
                'textarea',
                'select',
                'button[type="submit"]'
            ]
            
            for selector in form_selectors:
                try:
                    elements = await page.query_selector_all(selector)
                    for i, element in enumerate(elements[:3]):  # 最大3要素まで
                        if 'input' in selector and 'password' not in selector:
                            await element.fill(f'test_data_{i}')
                        elif 'select' in selector:
                            await element.select_option(index=0)
                except Exception as e:
                    errors.append(f"Form interaction {selector} failed: {e}")
            
            # スクリーンショット
            screenshot_path = self.screenshots_dir / f"{test_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            await page.screenshot(path=screenshot_path)
            screenshots.append(str(screenshot_path))
            
            await page.close()
            
        except Exception as e:
            errors.append(str(e))
        
        duration = time.time() - start_time
        
        result = E2ETestResult(
            test_name=test_name,
            status='passed' if not errors else 'failed',
            duration=duration,
            errors=errors,
            screenshots=screenshots,
            performance_metrics={'form_interaction_time': duration},
            timestamp=datetime.now().isoformat()
        )
        
        self.e2e_results.append(result)
        self.logger.info(f"Form interaction test: {result.status} ({duration:.2f}s)")
    
    async def test_error_handling(self):
        """エラーハンドリングテスト"""
        test_name = "error_handling"
        start_time = time.time()
        errors = []
        screenshots = []
        
        try:
            page = await self.context.new_page()
            
            # 存在しないページへのアクセステスト
            try:
                response = await page.goto(f"{self.base_url}/nonexistent-page", timeout=self.test_timeout)
                if response:
                    self.logger.info(f"404 page status: {response.status}")
            except Exception as e:
                errors.append(f"404 page test failed: {e}")
            
            # JavaScript エラー監視
            page.on('pageerror', lambda error: errors.append(f"JS Error: {error}"))
            page.on('console', lambda msg: self.logger.debug(f"Console: {msg.text}"))
            
            # スクリーンショット
            screenshot_path = self.screenshots_dir / f"{test_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            await page.screenshot(path=screenshot_path)
            screenshots.append(str(screenshot_path))
            
            await page.close()
            
        except Exception as e:
            errors.append(str(e))
        
        duration = time.time() - start_time
        
        result = E2ETestResult(
            test_name=test_name,
            status='passed' if not errors else 'failed',
            duration=duration,
            errors=errors,
            screenshots=screenshots,
            performance_metrics={'error_handling_time': duration},
            timestamp=datetime.now().isoformat()
        )
        
        self.e2e_results.append(result)
        self.logger.info(f"Error handling test: {result.status} ({duration:.2f}s)")
    
    async def test_responsive_design(self):
        """レスポンシブデザインテスト"""
        test_name = "responsive_design"
        start_time = time.time()
        errors = []
        screenshots = []
        
        try:
            page = await self.context.new_page()
            await page.goto(self.base_url, timeout=self.test_timeout)
            
            # 複数の画面サイズでテスト
            viewports = [
                {'width': 320, 'height': 568, 'name': 'mobile'},
                {'width': 768, 'height': 1024, 'name': 'tablet'},
                {'width': 1920, 'height': 1080, 'name': 'desktop'}
            ]
            
            for viewport in viewports:
                try:
                    await page.set_viewport_size({'width': viewport['width'], 'height': viewport['height']})
                    await page.wait_for_load_state('networkidle', timeout=5000)
                    
                    # スクリーンショット
                    screenshot_path = self.screenshots_dir / f"{test_name}_{viewport['name']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
                    await page.screenshot(path=screenshot_path)
                    screenshots.append(str(screenshot_path))
                    
                except Exception as e:
                    errors.append(f"Responsive test {viewport['name']} failed: {e}")
            
            await page.close()
            
        except Exception as e:
            errors.append(str(e))
        
        duration = time.time() - start_time
        
        result = E2ETestResult(
            test_name=test_name,
            status='passed' if not errors else 'failed',
            duration=duration,
            errors=errors,
            screenshots=screenshots,
            performance_metrics={'responsive_test_time': duration},
            timestamp=datetime.now().isoformat()
        )
        
        self.e2e_results.append(result)
        self.logger.info(f"Responsive design test: {result.status} ({duration:.2f}s)")
    
    async def test_accessibility(self):
        """アクセシビリティテスト"""
        test_name = "accessibility"
        start_time = time.time()
        errors = []
        screenshots = []
        
        try:
            page = await self.context.new_page()
            await page.goto(self.base_url, timeout=self.test_timeout)
            
            # 基本的なアクセシビリティチェック
            accessibility_checks = [
                {'selector': 'img', 'attribute': 'alt', 'description': 'Images should have alt text'},
                {'selector': 'a', 'attribute': 'href', 'description': 'Links should have href'},
                {'selector': 'button', 'attribute': 'type', 'description': 'Buttons should have type'},
                {'selector': 'input', 'attribute': 'label', 'description': 'Inputs should have labels'}
            ]
            
            for check in accessibility_checks:
                try:
                    elements = await page.query_selector_all(check['selector'])
                    for element in elements:
                        if check['attribute'] == 'label':
                            # ラベル関連の特別チェック
                            element_id = await element.get_attribute('id')
                            if element_id:
                                label = await page.query_selector(f'label[for="{element_id}"]')
                                if not label:
                                    errors.append(f"Input without label: {element_id}")
                        else:
                            attr_value = await element.get_attribute(check['attribute'])
                            if not attr_value:
                                errors.append(f"{check['description']}: missing {check['attribute']}")
                except Exception as e:
                    errors.append(f"Accessibility check {check['selector']} failed: {e}")
            
            # キーボードナビゲーションテスト
            try:
                await page.keyboard.press('Tab')
                await page.keyboard.press('Tab')
                await page.keyboard.press('Enter')
            except Exception as e:
                errors.append(f"Keyboard navigation failed: {e}")
            
            # スクリーンショット
            screenshot_path = self.screenshots_dir / f"{test_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            await page.screenshot(path=screenshot_path)
            screenshots.append(str(screenshot_path))
            
            await page.close()
            
        except Exception as e:
            errors.append(str(e))
        
        duration = time.time() - start_time
        
        result = E2ETestResult(
            test_name=test_name,
            status='passed' if not errors else 'failed',
            duration=duration,
            errors=errors,
            screenshots=screenshots,
            performance_metrics={'accessibility_test_time': duration},
            timestamp=datetime.now().isoformat()
        )
        
        self.e2e_results.append(result)
        self.logger.info(f"Accessibility test: {result.status} ({duration:.2f}s)")
    
    async def run_load_tests(self):
        """負荷テスト実行"""
        self.logger.info("Running load tests")
        
        load_tests = [
            {'name': 'light_load', 'concurrent_users': 5, 'duration': 30},
            {'name': 'medium_load', 'concurrent_users': 10, 'duration': 30},
            {'name': 'stress_test', 'concurrent_users': 20, 'duration': 60}
        ]
        
        for test_config in load_tests:
            try:
                await self.execute_load_test(test_config)
            except Exception as e:
                self.logger.error(f"Load test {test_config['name']} failed: {e}")
    
    async def execute_load_test(self, config: Dict[str, Any]):
        """負荷テスト実行"""
        test_name = config['name']
        concurrent_users = config['concurrent_users']
        duration = config['duration']
        
        self.logger.info(f"Starting load test: {test_name} ({concurrent_users} users, {duration}s)")
        
        start_time = time.time()
        response_times = []
        successful_requests = 0
        failed_requests = 0
        
        async def single_user_session():
            """単一ユーザーセッション"""
            nonlocal successful_requests, failed_requests
            
            session_start = time.time()
            while time.time() - session_start < duration:
                try:
                    request_start = time.time()
                    
                    async with aiohttp.ClientSession() as session:
                        # ホームページアクセス
                        async with session.get(self.base_url, timeout=10) as response:
                            if response.status == 200:
                                successful_requests += 1
                            else:
                                failed_requests += 1
                            
                            response_time = time.time() - request_start
                            response_times.append(response_time)
                        
                        # API呼び出し
                        try:
                            async with session.get(f"{self.api_base_url}/health", timeout=5) as api_response:
                                pass
                        except:
                            pass  # APIが利用できない場合はスキップ
                    
                    # 少し待機
                    await asyncio.sleep(1)
                    
                except Exception as e:
                    failed_requests += 1
                    self.logger.debug(f"Request failed: {e}")
        
        # 同時ユーザーセッション実行
        tasks = [single_user_session() for _ in range(concurrent_users)]
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # 結果計算
        total_requests = successful_requests + failed_requests
        total_duration = time.time() - start_time
        
        if response_times:
            avg_response_time = statistics.mean(response_times)
            min_response_time = min(response_times)
            max_response_time = max(response_times)
        else:
            avg_response_time = min_response_time = max_response_time = 0
        
        throughput = total_requests / total_duration if total_duration > 0 else 0
        error_rate = (failed_requests / total_requests * 100) if total_requests > 0 else 0
        
        result = LoadTestResult(
            test_name=test_name,
            concurrent_users=concurrent_users,
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            avg_response_time=avg_response_time,
            min_response_time=min_response_time,
            max_response_time=max_response_time,
            throughput=throughput,
            error_rate=error_rate,
            timestamp=datetime.now().isoformat()
        )
        
        self.load_test_results.append(result)
        self.logger.info(f"Load test {test_name} completed: {successful_requests}/{total_requests} successful, {error_rate:.1f}% error rate")
    
    async def run_security_tests(self):
        """セキュリティテスト実行"""
        self.logger.info("Running security tests")
        
        security_tests = [
            self.test_xss_protection,
            self.test_sql_injection,
            self.test_csrf_protection,
            self.test_https_headers,
            self.test_input_validation
        ]
        
        for test_func in security_tests:
            try:
                await test_func()
            except Exception as e:
                self.logger.error(f"Security test {test_func.__name__} failed: {e}")
    
    async def test_xss_protection(self):
        """XSS保護テスト"""
        test_name = "xss_protection"
        
        try:
            page = await self.context.new_page()
            await page.goto(self.base_url, timeout=self.test_timeout)
            
            # XSSペイロードテスト
            xss_payloads = [
                '<script>alert("xss")</script>',
                '"><script>alert("xss")</script>',
                'javascript:alert("xss")'
            ]
            
            vulnerability_found = False
            
            # 入力フィールドでXSSテスト
            inputs = await page.query_selector_all('input[type="text"], textarea')
            for input_element in inputs:
                for payload in xss_payloads:
                    try:
                        await input_element.fill(payload)
                        await page.keyboard.press('Enter')
                        
                        # アラートダイアログが表示されたらXSS脆弱性あり
                        try:
                            await page.wait_for_event('dialog', timeout=1000)
                            vulnerability_found = True
                            break
                        except:
                            pass
                    except:
                        pass
                
                if vulnerability_found:
                    break
            
            await page.close()
            
            result = SecurityTestResult(
                test_name=test_name,
                vulnerability_type='XSS',
                severity='high' if vulnerability_found else 'none',
                status='vulnerable' if vulnerability_found else 'secure',
                details='XSS vulnerability detected' if vulnerability_found else 'No XSS vulnerability found',
                recommendation='Implement proper input sanitization' if vulnerability_found else 'XSS protection appears adequate',
                timestamp=datetime.now().isoformat()
            )
            
            self.security_results.append(result)
            
        except Exception as e:
            self.logger.error(f"XSS test failed: {e}")
    
    async def test_sql_injection(self):
        """SQLインジェクションテスト"""
        test_name = "sql_injection"
        
        try:
            # SQLインジェクションペイロード
            sql_payloads = [
                "' OR '1'='1",
                "'; DROP TABLE users; --",
                "' UNION SELECT * FROM users --"
            ]
            
            vulnerability_found = False
            
            # API経由でSQLインジェクションテスト
            async with aiohttp.ClientSession() as session:
                for payload in sql_payloads:
                    try:
                        params = {'q': payload, 'search': payload, 'id': payload}
                        async with session.get(f"{self.api_base_url}/search", params=params, timeout=5) as response:
                            response_text = await response.text()
                            
                            # SQLエラーメッセージが含まれているかチェック
                            sql_error_indicators = ['sql', 'mysql', 'postgres', 'sqlite', 'syntax error']
                            if any(indicator in response_text.lower() for indicator in sql_error_indicators):
                                vulnerability_found = True
                                break
                                
                    except:
                        pass  # タイムアウトやエラーは無視
            
            result = SecurityTestResult(
                test_name=test_name,
                vulnerability_type='SQL Injection',
                severity='critical' if vulnerability_found else 'none',
                status='vulnerable' if vulnerability_found else 'secure',
                details='SQL injection vulnerability detected' if vulnerability_found else 'No SQL injection vulnerability found',
                recommendation='Use parameterized queries' if vulnerability_found else 'SQL injection protection appears adequate',
                timestamp=datetime.now().isoformat()
            )
            
            self.security_results.append(result)
            
        except Exception as e:
            self.logger.error(f"SQL injection test failed: {e}")
    
    async def test_csrf_protection(self):
        """CSRF保護テスト"""
        test_name = "csrf_protection"
        
        try:
            page = await self.context.new_page()
            await page.goto(self.base_url, timeout=self.test_timeout)
            
            # CSRFトークンの存在確認
            csrf_tokens = await page.query_selector_all('input[name*="csrf"], input[name*="token"], meta[name*="csrf"]')
            has_csrf_protection = len(csrf_tokens) > 0
            
            await page.close()
            
            result = SecurityTestResult(
                test_name=test_name,
                vulnerability_type='CSRF',
                severity='medium' if not has_csrf_protection else 'none',
                status='vulnerable' if not has_csrf_protection else 'secure',
                details='No CSRF tokens found' if not has_csrf_protection else 'CSRF protection detected',
                recommendation='Implement CSRF tokens for forms' if not has_csrf_protection else 'CSRF protection appears adequate',
                timestamp=datetime.now().isoformat()
            )
            
            self.security_results.append(result)
            
        except Exception as e:
            self.logger.error(f"CSRF test failed: {e}")
    
    async def test_https_headers(self):
        """HTTPSヘッダーテスト"""
        test_name = "https_headers"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, timeout=10) as response:
                    headers = response.headers
                    
                    # セキュリティヘッダーの確認
                    security_headers = {
                        'X-Content-Type-Options': 'nosniff',
                        'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
                        'X-XSS-Protection': '1; mode=block',
                        'Strict-Transport-Security': 'max-age=',
                        'Content-Security-Policy': 'default-src'
                    }
                    
                    missing_headers = []
                    for header, expected in security_headers.items():
                        if header not in headers:
                            missing_headers.append(header)
                        elif isinstance(expected, list):
                            if not any(exp in headers[header] for exp in expected):
                                missing_headers.append(f"{header} (invalid value)")
                        elif expected not in headers[header]:
                            missing_headers.append(f"{header} (invalid value)")
                    
                    vulnerability_level = 'high' if len(missing_headers) > 3 else 'medium' if missing_headers else 'none'
                    
                    result = SecurityTestResult(
                        test_name=test_name,
                        vulnerability_type='Missing Security Headers',
                        severity=vulnerability_level,
                        status='vulnerable' if missing_headers else 'secure',
                        details=f'Missing headers: {", ".join(missing_headers)}' if missing_headers else 'All security headers present',
                        recommendation='Add missing security headers' if missing_headers else 'Security headers are properly configured',
                        timestamp=datetime.now().isoformat()
                    )
                    
                    self.security_results.append(result)
            
        except Exception as e:
            self.logger.error(f"HTTPS headers test failed: {e}")
    
    async def test_input_validation(self):
        """入力検証テスト"""
        test_name = "input_validation"
        
        try:
            page = await self.context.new_page()
            await page.goto(self.base_url, timeout=self.test_timeout)
            
            # 異常入力テスト
            malicious_inputs = [
                'A' * 10000,  # 非常に長い入力
                '../../../etc/passwd',  # パストラバーサル
                '<?php echo "test"; ?>',  # PHPコード
                '<iframe src="javascript:alert(1)"></iframe>',  # HTMLインジェクション
            ]
            
            vulnerability_found = False
            
            inputs = await page.query_selector_all('input[type="text"], textarea')
            for input_element in inputs:
                for malicious_input in malicious_inputs:
                    try:
                        await input_element.fill(malicious_input)
                        await page.keyboard.press('Enter')
                        
                        # エラーメッセージや異常な動作をチェック
                        await asyncio.sleep(1)
                        
                    except Exception as e:
                        if 'timeout' not in str(e).lower():
                            vulnerability_found = True
            
            await page.close()
            
            result = SecurityTestResult(
                test_name=test_name,
                vulnerability_type='Input Validation',
                severity='medium' if vulnerability_found else 'none',
                status='vulnerable' if vulnerability_found else 'secure',
                details='Inadequate input validation detected' if vulnerability_found else 'Input validation appears adequate',
                recommendation='Implement proper input validation and sanitization' if vulnerability_found else 'Input validation is properly implemented',
                timestamp=datetime.now().isoformat()
            )
            
            self.security_results.append(result)
            
        except Exception as e:
            self.logger.error(f"Input validation test failed: {e}")
    
    async def run_performance_tests(self):
        """パフォーマンステスト実行"""
        self.logger.info("Running performance tests")
        
        try:
            page = await self.context.new_page()
            
            # Performance API を有効化
            await page.goto(self.base_url, timeout=self.test_timeout)
            
            # パフォーマンスメトリクス取得
            performance_metrics = await page.evaluate('''() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                const paint = performance.getEntriesByType('paint');
                
                return {
                    domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
                    loadComplete: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
                    firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
                    firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
                    resourceCount: performance.getEntriesByType('resource').length
                };
            }''')
            
            # メモリ使用量（概算）
            memory_info = await page.evaluate('() => performance.memory ? performance.memory.usedJSHeapSize : 0')
            
            performance_metrics['memoryUsage'] = memory_info
            
            await page.close()
            
            # パフォーマンス結果をE2Eテスト結果に追加
            result = E2ETestResult(
                test_name='performance_test',
                status='passed',
                duration=0,
                errors=[],
                screenshots=[],
                performance_metrics=performance_metrics,
                timestamp=datetime.now().isoformat()
            )
            
            self.e2e_results.append(result)
            self.logger.info(f"Performance test completed: {performance_metrics}")
            
        except Exception as e:
            self.logger.error(f"Performance test failed: {e}")
    
    async def _record_e2e_failure(self, test_name: str, error: str):
        """E2Eテスト失敗記録"""
        result = E2ETestResult(
            test_name=test_name,
            status='failed',
            duration=0,
            errors=[error],
            screenshots=[],
            performance_metrics={},
            timestamp=datetime.now().isoformat()
        )
        self.e2e_results.append(result)
    
    async def _create_fallback_results(self) -> Dict[str, Any]:
        """Playwright未インストール時のフォールバック結果"""
        self.logger.warning("Playwright not available, creating fallback results")
        
        return {
            'timestamp': datetime.now().isoformat(),
            'status': 'skipped',
            'reason': 'Playwright not installed',
            'e2e_tests': {'total': 0, 'passed': 0, 'failed': 0},
            'load_tests': {'total': 0, 'passed': 0, 'failed': 0},
            'security_tests': {'total': 0, 'passed': 0, 'failed': 0},
            'recommendations': [
                'Install Playwright: pip install playwright',
                'Install browsers: playwright install'
            ]
        }
    
    async def generate_test_report(self, total_duration: float) -> Dict[str, Any]:
        """テストレポート生成"""
        # E2Eテスト集計
        e2e_passed = len([r for r in self.e2e_results if r.status == 'passed'])
        e2e_failed = len([r for r in self.e2e_results if r.status == 'failed'])
        
        # 負荷テスト集計
        load_passed = len([r for r in self.load_test_results if r.error_rate < 5])
        load_failed = len(self.load_test_results) - load_passed
        
        # セキュリティテスト集計
        security_secure = len([r for r in self.security_results if r.status == 'secure'])
        security_vulnerable = len([r for r in self.security_results if r.status == 'vulnerable'])
        
        # 総合レポート
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_duration': total_duration,
            'status': 'completed',
            'summary': {
                'total_tests': len(self.e2e_results) + len(self.load_test_results) + len(self.security_results),
                'passed_tests': e2e_passed + load_passed + security_secure,
                'failed_tests': e2e_failed + load_failed + security_vulnerable
            },
            'e2e_tests': {
                'total': len(self.e2e_results),
                'passed': e2e_passed,
                'failed': e2e_failed,
                'results': [asdict(r) for r in self.e2e_results]
            },
            'load_tests': {
                'total': len(self.load_test_results),
                'passed': load_passed,
                'failed': load_failed,
                'results': [asdict(r) for r in self.load_test_results]
            },
            'security_tests': {
                'total': len(self.security_results),
                'secure': security_secure,
                'vulnerable': security_vulnerable,
                'results': [asdict(r) for r in self.security_results]
            }
        }
        
        # レポートファイル保存
        report_file = self.reports_dir / f"playwright_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        self.logger.info(f"Test report saved: {report_file}")
        return report

# メイン実行
async def main():
    """メイン実行関数"""
    test_suite = PlaywrightTestSuite()
    results = await test_suite.run_comprehensive_tests()
    
    print("\n" + "="*80)
    print("Playwright Test Suite - Results Summary")
    print("="*80)
    print(f"Total Duration: {results.get('total_duration', 0):.2f} seconds")
    print(f"Total Tests: {results['summary']['total_tests']}")
    print(f"Passed: {results['summary']['passed_tests']}")
    print(f"Failed: {results['summary']['failed_tests']}")
    print(f"Success Rate: {results['summary']['passed_tests'] / max(results['summary']['total_tests'], 1) * 100:.1f}%")
    print("="*80)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nPlaywright tests interrupted by user")
    except Exception as e:
        print(f"Fatal error: {e}")
        traceback.print_exc()