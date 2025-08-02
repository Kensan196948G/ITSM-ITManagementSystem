#!/usr/bin/env python3
"""
ITSM Test Suite - 10回繰り返し無限ループ自動化システム
5秒間隔でテスト実行・修復・push/pull・検証の完全自動化

統合機能:
- pytest + Playwright E2E/API/負荷テスト
- GitHub Actions統合
- 無限ループ修復エンジン
- リアルタイム監視システム
- ITSM準拠セキュリティ・例外処理・ログ記録
"""

import asyncio
import json
import time
import logging
import traceback
import sys
import signal
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import subprocess
import psutil
import threading

# プロジェクトルートをPythonPathに追加
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# テストモジュールインポート
try:
    from tests.test_loop_repair_engine import LoopRepairEngine
    from tests.test_playwright_e2e import PlaywrightTestSuite
except ImportError as e:
    print(f"Warning: Failed to import test modules: {e}")
    LoopRepairEngine = None
    PlaywrightTestSuite = None

@dataclass
class IterationResult:
    """イテレーション結果"""
    iteration: int
    start_time: str
    end_time: str
    duration: float
    total_tests: int
    passed_tests: int
    failed_tests: int
    errors_detected: int
    errors_fixed: int
    git_operations: Dict[str, Any]
    status: str
    details: Dict[str, Any]

class ITSMTestAutomationSuite:
    """ITSM Test Automation Suite - 10回繰り返し無限ループシステム"""
    
    def __init__(self, project_root: str = None):
        self.project_root = Path(project_root or Path(__file__).parent.parent)
        self.coordination_path = self.project_root / "coordination"
        self.setup_logging()
        self.setup_directories()
        
        # システム設定
        self.loop_interval = 5  # 5秒間隔
        self.max_iterations = 10  # 10回繰り返し
        self.current_iteration = 0
        self.total_errors_fixed = 0
        self.total_tests_run = 0
        
        # 実行状態
        self.running = False
        self.shutdown_requested = False
        
        # 結果保存
        self.iteration_results: List[IterationResult] = []
        
        # テストエンジン
        self.loop_repair_engine = None
        self.playwright_suite = None
        
        # シグナルハンドラー設定
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
    def setup_logging(self):
        """ITSM準拠ログ設定"""
        log_dir = self.coordination_path / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # メインログ
        main_handler = logging.FileHandler(log_dir / "itsm_automation.log")
        main_handler.setFormatter(
            logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        )
        
        # コンソールログ
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(
            logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        )
        
        # ログガー設定
        self.logger = logging.getLogger('ITSMTestAutomation')
        self.logger.setLevel(logging.INFO)
        self.logger.addHandler(main_handler)
        self.logger.addHandler(console_handler)
        
    def setup_directories(self):
        """必要ディレクトリ作成"""
        dirs = [
            self.coordination_path / "logs",
            self.coordination_path / "reports",
            self.coordination_path / "metrics",
            self.coordination_path / "backups"
        ]
        
        for dir_path in dirs:
            dir_path.mkdir(parents=True, exist_ok=True)
    
    def _signal_handler(self, signum, frame):
        """シグナルハンドラー"""
        self.logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        self.shutdown_requested = True
        self.running = False
    
    async def run_automation_suite(self) -> Dict[str, Any]:
        """自動化スイートメイン実行"""
        self.logger.info("=" * 80)
        self.logger.info("ITSM Test Automation Suite - Starting 10 iterations")
        self.logger.info("=" * 80)
        
        start_time = time.time()
        self.running = True
        
        try:
            # テストエンジン初期化
            await self._initialize_test_engines()
            
            # 10回繰り返しループ
            while self.running and self.current_iteration < self.max_iterations and not self.shutdown_requested:
                self.current_iteration += 1
                
                self.logger.info(f"\n{'='*20} ITERATION {self.current_iteration}/{self.max_iterations} {'='*20}")
                
                iteration_result = await self._execute_iteration()
                self.iteration_results.append(iteration_result)
                
                # 状態保存
                await self._save_automation_state()
                
                # 進捗報告
                await self._report_progress()
                
                # エラーが完全になくなった場合の処理
                if iteration_result.errors_detected == 0:
                    self.logger.info("✅ No errors detected - System is healthy!")
                    await self._handle_clean_iteration()
                else:
                    self.logger.warning(f"⚠️ {iteration_result.errors_detected} errors detected and {iteration_result.errors_fixed} fixed")
                
                # 次のイテレーション前の待機（5秒間隔）
                if self.current_iteration < self.max_iterations and not self.shutdown_requested:
                    self.logger.info(f"Waiting {self.loop_interval} seconds for next iteration...")
                    await asyncio.sleep(self.loop_interval)
                
        except Exception as e:
            self.logger.error(f"Fatal error in automation suite: {e}")
            self.logger.error(traceback.format_exc())
        finally:
            self.running = False
            
        # 最終レポート生成
        total_duration = time.time() - start_time
        final_report = await self._generate_final_report(total_duration)
        
        self.logger.info("=" * 80)
        self.logger.info("ITSM Test Automation Suite - Completed")
        self.logger.info("=" * 80)
        
        return final_report
    
    async def _initialize_test_engines(self):
        """テストエンジン初期化"""
        try:
            if LoopRepairEngine:
                self.loop_repair_engine = LoopRepairEngine(str(self.project_root))
                self.logger.info("✅ Loop Repair Engine initialized")
            else:
                self.logger.warning("⚠️ Loop Repair Engine not available")
            
            if PlaywrightTestSuite:
                self.playwright_suite = PlaywrightTestSuite(str(self.project_root))
                self.logger.info("✅ Playwright Test Suite initialized")
            else:
                self.logger.warning("⚠️ Playwright Test Suite not available")
                
        except Exception as e:
            self.logger.error(f"Failed to initialize test engines: {e}")
    
    async def _execute_iteration(self) -> IterationResult:
        """単一イテレーション実行"""
        iteration_start_time = time.time()
        start_timestamp = datetime.now().isoformat()
        
        self.logger.info(f"Starting iteration {self.current_iteration}...")
        
        # 結果初期化
        total_tests = 0
        passed_tests = 0
        failed_tests = 0
        errors_detected = 0
        errors_fixed = 0
        git_operations = {}
        status = "running"
        details = {}
        
        try:
            # 1. エラー検知・修復（Loop Repair Engine）
            if self.loop_repair_engine:
                repair_result = await self._run_loop_repair()
                errors_detected += repair_result.get('errors_detected', 0)
                errors_fixed += repair_result.get('errors_fixed', 0)
                details['loop_repair'] = repair_result
            
            # 2. 包括的テスト実行（Playwright + API + 負荷テスト）
            test_result = await self._run_comprehensive_tests()
            total_tests += test_result.get('total_tests', 0)
            passed_tests += test_result.get('passed_tests', 0)
            failed_tests += test_result.get('failed_tests', 0)
            details['comprehensive_tests'] = test_result
            
            # 3. Git操作（commit, push, pull）
            git_result = await self._execute_git_operations()
            git_operations = git_result
            details['git_operations'] = git_result
            
            # 4. 検証実行
            verification_result = await self._verify_iteration()
            details['verification'] = verification_result
            
            # ステータス決定
            if failed_tests == 0 and errors_detected == 0:
                status = "success"
            elif errors_fixed > 0:
                status = "partial_success"
            else:
                status = "failure"
                
        except Exception as e:
            self.logger.error(f"Error in iteration {self.current_iteration}: {e}")
            status = "error"
            details['error'] = str(e)
        
        # 結果作成
        iteration_duration = time.time() - iteration_start_time
        end_timestamp = datetime.now().isoformat()
        
        result = IterationResult(
            iteration=self.current_iteration,
            start_time=start_timestamp,
            end_time=end_timestamp,
            duration=iteration_duration,
            total_tests=total_tests,
            passed_tests=passed_tests,
            failed_tests=failed_tests,
            errors_detected=errors_detected,
            errors_fixed=errors_fixed,
            git_operations=git_operations,
            status=status,
            details=details
        )
        
        # 累計更新
        self.total_errors_fixed += errors_fixed
        self.total_tests_run += total_tests
        
        self.logger.info(f"Iteration {self.current_iteration} completed: {status} ({iteration_duration:.2f}s)")
        return result
    
    async def _run_loop_repair(self) -> Dict[str, Any]:
        """Loop Repair Engine 実行"""
        try:
            if not self.loop_repair_engine:
                return {'errors_detected': 0, 'errors_fixed': 0, 'status': 'skipped'}
            
            self.logger.info("Running Loop Repair Engine...")
            
            # エラー検知
            errors = await self.loop_repair_engine.detect_errors()
            errors_detected = len(errors)
            
            # 修復実行
            errors_fixed = 0
            if errors:
                repair_success = await self.loop_repair_engine.execute_repairs(errors)
                if repair_success:
                    errors_fixed = len(errors)
            
            return {
                'errors_detected': errors_detected,
                'errors_fixed': errors_fixed,
                'status': 'completed',
                'details': errors
            }
            
        except Exception as e:
            self.logger.error(f"Loop repair failed: {e}")
            return {
                'errors_detected': 0,
                'errors_fixed': 0,
                'status': 'error',
                'error': str(e)
            }
    
    async def _run_comprehensive_tests(self) -> Dict[str, Any]:
        """包括的テスト実行"""
        try:
            self.logger.info("Running comprehensive tests...")
            
            total_tests = 0
            passed_tests = 0
            failed_tests = 0
            test_results = {}
            
            # pytest実行
            pytest_result = await self._run_pytest()
            test_results['pytest'] = pytest_result
            total_tests += pytest_result.get('total', 0)
            passed_tests += pytest_result.get('passed', 0)
            failed_tests += pytest_result.get('failed', 0)
            
            # Playwright テスト実行
            if self.playwright_suite:
                playwright_result = await self.playwright_suite.run_comprehensive_tests()
                test_results['playwright'] = playwright_result
                
                # Playwright結果を統合
                summary = playwright_result.get('summary', {})
                total_tests += summary.get('total_tests', 0)
                passed_tests += summary.get('passed_tests', 0)
                failed_tests += summary.get('failed_tests', 0)
            
            # API負荷テスト
            load_test_result = await self._run_api_load_tests()
            test_results['load_tests'] = load_test_result
            total_tests += load_test_result.get('total', 0)
            passed_tests += load_test_result.get('passed', 0)
            failed_tests += load_test_result.get('failed', 0)
            
            return {
                'total_tests': total_tests,
                'passed_tests': passed_tests,
                'failed_tests': failed_tests,
                'status': 'passed' if failed_tests == 0 else 'failed',
                'results': test_results
            }
            
        except Exception as e:
            self.logger.error(f"Comprehensive tests failed: {e}")
            return {
                'total_tests': 0,
                'passed_tests': 0,
                'failed_tests': 1,
                'status': 'error',
                'error': str(e)
            }
    
    async def _run_pytest(self) -> Dict[str, Any]:
        """pytest実行"""
        try:
            cmd = [
                sys.executable, "-m", "pytest", 
                str(self.project_root / "tests"),
                "-v", "--tb=short", 
                "--json-report", "--json-report-file=pytest_report.json"
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=self.project_root,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            # 結果解析
            total = 0
            passed = 0
            failed = 0
            
            # pytest出力から結果抽出（簡易版）
            output = stdout.decode() + stderr.decode()
            if "passed" in output:
                import re
                passed_match = re.search(r'(\d+) passed', output)
                if passed_match:
                    passed = int(passed_match.group(1))
                    total += passed
                
                failed_match = re.search(r'(\d+) failed', output)
                if failed_match:
                    failed = int(failed_match.group(1))
                    total += failed
            
            return {
                'total': total,
                'passed': passed,
                'failed': failed,
                'return_code': process.returncode,
                'output': output[:1000]  # 最初の1000文字のみ
            }
            
        except Exception as e:
            self.logger.error(f"pytest execution failed: {e}")
            return {'total': 0, 'passed': 0, 'failed': 1, 'error': str(e)}
    
    async def _run_api_load_tests(self) -> Dict[str, Any]:
        """API負荷テスト実行"""
        try:
            import aiohttp
            
            # 負荷テスト設定
            test_configs = [
                {'name': 'light_load', 'concurrent_users': 3, 'requests': 10},
                {'name': 'medium_load', 'concurrent_users': 5, 'requests': 20}
            ]
            
            total = len(test_configs)
            passed = 0
            failed = 0
            results = []
            
            for config in test_configs:
                try:
                    result = await self._execute_load_test(config)
                    results.append(result)
                    
                    if result.get('success', False):
                        passed += 1
                    else:
                        failed += 1
                        
                except Exception as e:
                    failed += 1
                    results.append({'config': config, 'error': str(e)})
            
            return {
                'total': total,
                'passed': passed,
                'failed': failed,
                'results': results
            }
            
        except Exception as e:
            return {'total': 0, 'passed': 0, 'failed': 1, 'error': str(e)}
    
    async def _execute_load_test(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """単一負荷テスト実行"""
        try:
            import aiohttp
            
            concurrent_users = config['concurrent_users']
            total_requests = config['requests']
            base_url = "http://localhost:3000"
            
            successful_requests = 0
            failed_requests = 0
            response_times = []
            
            async def single_request():
                nonlocal successful_requests, failed_requests
                
                try:
                    start_time = time.time()
                    async with aiohttp.ClientSession() as session:
                        async with session.get(base_url, timeout=10) as response:
                            response_time = time.time() - start_time
                            response_times.append(response_time)
                            
                            if response.status == 200:
                                successful_requests += 1
                            else:
                                failed_requests += 1
                except:
                    failed_requests += 1
            
            # 並行リクエスト実行
            tasks = [single_request() for _ in range(total_requests)]
            await asyncio.gather(*tasks, return_exceptions=True)
            
            # 結果計算
            total_reqs = successful_requests + failed_requests
            success_rate = (successful_requests / total_reqs * 100) if total_reqs > 0 else 0
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            
            return {
                'config': config,
                'total_requests': total_reqs,
                'successful_requests': successful_requests,
                'failed_requests': failed_requests,
                'success_rate': success_rate,
                'avg_response_time': avg_response_time,
                'success': success_rate > 50  # 50%以上成功で成功とみなす
            }
            
        except Exception as e:
            return {'config': config, 'error': str(e), 'success': False}
    
    async def _execute_git_operations(self) -> Dict[str, Any]:
        """Git操作実行"""
        try:
            operations = {}
            
            # Git status確認
            process = await asyncio.create_subprocess_exec(
                'git', 'status', '--porcelain',
                cwd=self.project_root,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            operations['status_check'] = {'return_code': process.returncode}
            
            changes_detected = bool(stdout.strip())
            operations['changes_detected'] = changes_detected
            
            if changes_detected:
                # add
                process = await asyncio.create_subprocess_exec(
                    'git', 'add', '.',
                    cwd=self.project_root
                )
                await process.communicate()
                operations['add'] = {'return_code': process.returncode}
                
                # commit
                commit_message = f"ITSM自動修復: イテレーション {self.current_iteration} ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})"
                process = await asyncio.create_subprocess_exec(
                    'git', 'commit', '-m', commit_message,
                    cwd=self.project_root,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await process.communicate()
                operations['commit'] = {
                    'return_code': process.returncode,
                    'message': commit_message
                }
                
                # push
                process = await asyncio.create_subprocess_exec(
                    'git', 'push', 'origin', 'main',
                    cwd=self.project_root,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await process.communicate()
                operations['push'] = {
                    'return_code': process.returncode,
                    'output': stdout.decode()[:500]
                }
            
            # pull（常に実行）
            process = await asyncio.create_subprocess_exec(
                'git', 'pull', 'origin', 'main',
                cwd=self.project_root,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            operations['pull'] = {
                'return_code': process.returncode,
                'output': stdout.decode()[:500]
            }
            
            operations['success'] = all(
                op.get('return_code', 0) == 0 
                for op in operations.values() 
                if isinstance(op, dict) and 'return_code' in op
            )
            
            return operations
            
        except Exception as e:
            self.logger.error(f"Git operations failed: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _verify_iteration(self) -> Dict[str, Any]:
        """イテレーション検証"""
        try:
            verification_results = {}
            
            # システムヘルス確認
            memory = psutil.virtual_memory()
            cpu = psutil.cpu_percent(interval=1)
            
            verification_results['system_health'] = {
                'memory_percent': memory.percent,
                'cpu_percent': cpu,
                'healthy': memory.percent < 90 and cpu < 95
            }
            
            # プロセス確認
            verification_results['processes'] = {
                'python_processes': len([p for p in psutil.process_iter() if 'python' in p.name().lower()]),
                'system_load': psutil.getloadavg()[0] if hasattr(psutil, 'getloadavg') else 0
            }
            
            # ファイルシステム確認
            verification_results['filesystem'] = {
                'project_root_exists': self.project_root.exists(),
                'coordination_dir_exists': self.coordination_path.exists(),
                'logs_dir_exists': (self.coordination_path / "logs").exists()
            }
            
            # 全体検証
            verification_results['overall_healthy'] = all([
                verification_results['system_health']['healthy'],
                verification_results['filesystem']['project_root_exists'],
                verification_results['filesystem']['coordination_dir_exists']
            ])
            
            return verification_results
            
        except Exception as e:
            return {'error': str(e), 'overall_healthy': False}
    
    async def _handle_clean_iteration(self):
        """エラーなしイテレーション処理"""
        self.logger.info("🎉 Clean iteration detected - No errors found!")
        
        # クリーンイテレーション記録
        clean_state = {
            'timestamp': datetime.now().isoformat(),
            'iteration': self.current_iteration,
            'status': 'clean',
            'message': 'No errors detected - System is healthy'
        }
        
        clean_file = self.coordination_path / "clean_iterations.jsonl"
        with open(clean_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(clean_state) + '\n')
    
    async def _save_automation_state(self):
        """自動化状態保存"""
        try:
            state = {
                'timestamp': datetime.now().isoformat(),
                'current_iteration': self.current_iteration,
                'max_iterations': self.max_iterations,
                'total_errors_fixed': self.total_errors_fixed,
                'total_tests_run': self.total_tests_run,
                'running': self.running,
                'shutdown_requested': self.shutdown_requested
            }
            
            state_file = self.coordination_path / "automation_state.json"
            with open(state_file, 'w', encoding='utf-8') as f:
                json.dump(state, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Failed to save automation state: {e}")
    
    async def _report_progress(self):
        """進捗報告"""
        if not self.iteration_results:
            return
        
        latest_result = self.iteration_results[-1]
        total_iterations = len(self.iteration_results)
        
        # 成功率計算
        successful_iterations = len([r for r in self.iteration_results if r.status == "success"])
        success_rate = (successful_iterations / total_iterations * 100) if total_iterations > 0 else 0
        
        # 進捗報告
        self.logger.info(f"\n{'='*60}")
        self.logger.info(f"PROGRESS REPORT - Iteration {self.current_iteration}/{self.max_iterations}")
        self.logger.info(f"{'='*60}")
        self.logger.info(f"Status: {latest_result.status}")
        self.logger.info(f"Duration: {latest_result.duration:.2f}s")
        self.logger.info(f"Tests: {latest_result.total_tests} total, {latest_result.passed_tests} passed, {latest_result.failed_tests} failed")
        self.logger.info(f"Errors: {latest_result.errors_detected} detected, {latest_result.errors_fixed} fixed")
        self.logger.info(f"Success Rate: {success_rate:.1f}% ({successful_iterations}/{total_iterations})")
        self.logger.info(f"Total Errors Fixed: {self.total_errors_fixed}")
        self.logger.info(f"Total Tests Run: {self.total_tests_run}")
        self.logger.info(f"{'='*60}\n")
    
    async def _generate_final_report(self, total_duration: float) -> Dict[str, Any]:
        """最終レポート生成"""
        try:
            # 統計計算
            total_iterations = len(self.iteration_results)
            successful_iterations = len([r for r in self.iteration_results if r.status == "success"])
            failed_iterations = len([r for r in self.iteration_results if r.status in ["failure", "error"]])
            partial_success_iterations = len([r for r in self.iteration_results if r.status == "partial_success"])
            
            total_tests = sum(r.total_tests for r in self.iteration_results)
            total_passed = sum(r.passed_tests for r in self.iteration_results)
            total_failed = sum(r.failed_tests for r in self.iteration_results)
            
            total_errors_detected = sum(r.errors_detected for r in self.iteration_results)
            total_errors_fixed = sum(r.errors_fixed for r in self.iteration_results)
            
            # 平均計算
            avg_duration = sum(r.duration for r in self.iteration_results) / total_iterations if total_iterations > 0 else 0
            
            # 最終レポート
            report = {
                'timestamp': datetime.now().isoformat(),
                'execution_summary': {
                    'total_duration': total_duration,
                    'average_iteration_duration': avg_duration,
                    'max_iterations': self.max_iterations,
                    'completed_iterations': total_iterations,
                    'shutdown_requested': self.shutdown_requested
                },
                'iteration_summary': {
                    'successful_iterations': successful_iterations,
                    'failed_iterations': failed_iterations,
                    'partial_success_iterations': partial_success_iterations,
                    'success_rate': (successful_iterations / total_iterations * 100) if total_iterations > 0 else 0
                },
                'test_summary': {
                    'total_tests': total_tests,
                    'total_passed': total_passed,
                    'total_failed': total_failed,
                    'test_success_rate': (total_passed / total_tests * 100) if total_tests > 0 else 0
                },
                'error_summary': {
                    'total_errors_detected': total_errors_detected,
                    'total_errors_fixed': total_errors_fixed,
                    'fix_success_rate': (total_errors_fixed / total_errors_detected * 100) if total_errors_detected > 0 else 0
                },
                'detailed_results': [asdict(r) for r in self.iteration_results],
                'system_info': {
                    'platform': psutil.uname()._asdict(),
                    'cpu_count': psutil.cpu_count(),
                    'memory_total': psutil.virtual_memory().total,
                    'project_root': str(self.project_root)
                }
            }
            
            # レポートファイル保存
            report_file = self.coordination_path / "reports" / f"itsm_automation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            
            # コンソール出力
            print("\n" + "="*80)
            print("ITSM Test Automation Suite - Final Report")
            print("="*80)
            print(f"Total Duration: {total_duration:.2f} seconds")
            print(f"Iterations: {total_iterations}/{self.max_iterations}")
            print(f"Success Rate: {report['iteration_summary']['success_rate']:.1f}%")
            print(f"Tests: {total_tests} total, {total_passed} passed, {total_failed} failed")
            print(f"Errors: {total_errors_detected} detected, {total_errors_fixed} fixed")
            print(f"Report saved: {report_file}")
            print("="*80)
            
            self.logger.info(f"Final report generated: {report_file}")
            return report
            
        except Exception as e:
            self.logger.error(f"Failed to generate final report: {e}")
            return {'error': str(e), 'timestamp': datetime.now().isoformat()}

# メイン実行
async def main():
    """メイン実行関数"""
    try:
        automation_suite = ITSMTestAutomationSuite()
        await automation_suite.run_automation_suite()
    except Exception as e:
        print(f"Fatal error in main: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    try:
        # Python 3.7+ のためのイベントループ設定
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nITSM Test Automation Suite interrupted by user")
        print("Graceful shutdown completed.")
    except Exception as e:
        print(f"Fatal error: {e}")
        traceback.print_exc()
        sys.exit(1)