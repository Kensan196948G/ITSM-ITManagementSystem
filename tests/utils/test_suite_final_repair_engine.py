#!/usr/bin/env python3
"""
Test Suite Final Repair Engine
ITSM準拠の最終自動修復システム - Test Suite特化版

フェーズ3: Test Suite完全修復のための最終API対応
- 5秒間隔でTest Suite状態を監視
- GitHub Actions Test Suiteワークフローの完全修復
- E2E/統合テスト環境の自動修復
- 包括的テストレポート統合修復
"""

import asyncio
import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import aiofiles
import aiohttp
import psutil
import requests
from dataclasses import dataclass, asdict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('tests/reports/test-suite-final-repair.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('TestSuiteFinalRepairEngine')

@dataclass
class TestSuiteHealthStatus:
    """Test Suite health status tracking"""
    timestamp: str
    overall_health: str
    github_actions_status: str
    playwright_status: str
    api_tests_status: str
    unit_tests_status: str
    e2e_tests_status: str
    load_tests_status: str
    security_tests_status: str
    coverage_percentage: float
    failed_test_count: int
    error_count: int
    warning_count: int
    repair_actions_taken: List[str]
    next_repair_time: str

@dataclass
class TestSuiteRepairAction:
    """Test Suite repair action definition"""
    action_id: str
    action_type: str
    priority: str
    target_component: str
    repair_command: str
    validation_command: str
    timeout_seconds: int
    max_retries: int
    dependencies: List[str]

class TestSuiteFinalRepairEngine:
    """Test Suite特化の最終修復エンジン"""
    
    def __init__(self):
        self.project_root = Path.cwd()
        self.reports_dir = self.project_root / "tests" / "reports"
        self.repair_state_file = self.reports_dir / "test-suite-repair-state.json"
        self.health_metrics_file = self.reports_dir / "test-suite-health-metrics.json"
        
        # Ensure directories exist
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        
        # Repair configuration
        self.repair_interval = 5  # seconds
        self.max_consecutive_failures = 10
        self.repair_timeout = 300  # 5 minutes per repair
        
        # Initialize repair actions
        self.repair_actions = self._initialize_repair_actions()
        
        # Track repair state
        self.current_repair_cycle = 0
        self.consecutive_failures = 0
        self.last_successful_repair = None
        self.repair_history = []
        
        logger.info("🔧 Test Suite Final Repair Engine initialized")
    
    def _initialize_repair_actions(self) -> List[TestSuiteRepairAction]:
        """Initialize comprehensive test suite repair actions"""
        return [
            # GitHub Actions Repair
            TestSuiteRepairAction(
                action_id="github_actions_test_suite_repair",
                action_type="workflow_repair",
                priority="critical",
                target_component="github_actions",
                repair_command="gh workflow run test-suite.yml --ref main",
                validation_command="gh run list --workflow=test-suite.yml --limit=1 --json status",
                timeout_seconds=1800,  # 30 minutes for full test suite
                max_retries=3,
                dependencies=[]
            ),
            
            # Playwright E2E Environment Repair
            TestSuiteRepairAction(
                action_id="playwright_environment_repair",
                action_type="environment_setup",
                priority="high",
                target_component="playwright",
                repair_command="npx playwright install chromium && npx playwright install-deps",
                validation_command="npx playwright --version",
                timeout_seconds=300,
                max_retries=2,
                dependencies=[]
            ),
            
            # Test Database Repair
            TestSuiteRepairAction(
                action_id="test_database_repair",
                action_type="database_repair",
                priority="high",
                target_component="test_db",
                repair_command="cd backend && python init_sqlite_db.py",
                validation_command="ls -la backend/test_async.db",
                timeout_seconds=60,
                max_retries=3,
                dependencies=[]
            ),
            
            # API Test Environment Repair
            TestSuiteRepairAction(
                action_id="api_test_environment_repair",
                action_type="service_repair",
                priority="high",
                target_component="api_tests",
                repair_command="cd backend && python start_server.py &",
                validation_command="curl -s http://localhost:8000/health",
                timeout_seconds=120,
                max_retries=2,
                dependencies=["test_database_repair"]
            ),
            
            # Frontend Test Environment Repair
            TestSuiteRepairAction(
                action_id="frontend_test_environment_repair",
                action_type="service_repair",
                priority="medium",
                target_component="frontend_tests",
                repair_command="cd frontend && npm run build && npm run preview &",
                validation_command="curl -s http://localhost:3000",
                timeout_seconds=180,
                max_retries=2,
                dependencies=[]
            ),
            
            # Test Reports Consolidation Repair
            TestSuiteRepairAction(
                action_id="test_reports_consolidation_repair",
                action_type="report_repair",
                priority="medium",
                target_component="test_reports",
                repair_command="python tests/utils/generate_consolidated_report.py --input-dir tests/reports --output-dir tests/reports/consolidated",
                validation_command="ls -la tests/reports/consolidated/summary.json",
                timeout_seconds=60,
                max_retries=2,
                dependencies=[]
            ),
            
            # Coverage Analysis Repair
            TestSuiteRepairAction(
                action_id="coverage_analysis_repair",
                action_type="analysis_repair",
                priority="low",
                target_component="coverage",
                repair_command="pytest --cov=backend/app --cov-report=json:tests/reports/coverage.json backend/tests/unit/",
                validation_command="cat tests/reports/coverage.json | jq '.totals.percent_covered'",
                timeout_seconds=300,
                max_retries=2,
                dependencies=["test_database_repair"]
            ),
            
            # Security Test Repair
            TestSuiteRepairAction(
                action_id="security_test_repair",
                action_type="security_repair",
                priority="high",
                target_component="security_tests",
                repair_command="bandit -r backend/app/ -f json -o tests/reports/bandit-report.json",
                validation_command="ls -la tests/reports/bandit-report.json",
                timeout_seconds=120,
                max_retries=2,
                dependencies=[]
            ),
            
            # Load Test Environment Repair
            TestSuiteRepairAction(
                action_id="load_test_environment_repair",
                action_type="performance_repair",
                priority="medium",
                target_component="load_tests",
                repair_command="pip install -r requirements-test.txt",
                validation_command="python -c 'import pytest_benchmark; print(\"OK\")'",
                timeout_seconds=180,
                max_retries=2,
                dependencies=[]
            ),
            
            # Final Validation and Cleanup
            TestSuiteRepairAction(
                action_id="final_validation_cleanup",
                action_type="validation",
                priority="low",
                target_component="cleanup",
                repair_command="python tests/utils/test_health_check.py",
                validation_command="echo 'Validation complete'",
                timeout_seconds=60,
                max_retries=1,
                dependencies=["test_reports_consolidation_repair"]
            )
        ]
    
    async def check_test_suite_health(self) -> TestSuiteHealthStatus:
        """Comprehensive test suite health check"""
        timestamp = datetime.now().isoformat()
        
        # Check GitHub Actions status
        github_status = await self._check_github_actions_status()
        
        # Check Playwright status
        playwright_status = await self._check_playwright_status()
        
        # Check API tests status
        api_tests_status = await self._check_api_tests_status()
        
        # Check unit tests status
        unit_tests_status = await self._check_unit_tests_status()
        
        # Check E2E tests status
        e2e_tests_status = await self._check_e2e_tests_status()
        
        # Check load tests status
        load_tests_status = await self._check_load_tests_status()
        
        # Check security tests status
        security_tests_status = await self._check_security_tests_status()
        
        # Calculate coverage
        coverage_percentage = await self._calculate_coverage_percentage()
        
        # Count errors and warnings
        error_count, warning_count = await self._count_test_issues()
        
        # Count failed tests
        failed_test_count = await self._count_failed_tests()
        
        # Determine overall health
        overall_health = self._determine_overall_health(
            github_status, playwright_status, api_tests_status,
            unit_tests_status, e2e_tests_status, load_tests_status,
            security_tests_status, failed_test_count, error_count
        )
        
        # Calculate next repair time
        next_repair_time = (datetime.now() + timedelta(seconds=self.repair_interval)).isoformat()
        
        return TestSuiteHealthStatus(
            timestamp=timestamp,
            overall_health=overall_health,
            github_actions_status=github_status,
            playwright_status=playwright_status,
            api_tests_status=api_tests_status,
            unit_tests_status=unit_tests_status,
            e2e_tests_status=e2e_tests_status,
            load_tests_status=load_tests_status,
            security_tests_status=security_tests_status,
            coverage_percentage=coverage_percentage,
            failed_test_count=failed_test_count,
            error_count=error_count,
            warning_count=warning_count,
            repair_actions_taken=[],
            next_repair_time=next_repair_time
        )
    
    async def _check_github_actions_status(self) -> str:
        """Check GitHub Actions workflow status"""
        try:
            result = subprocess.run(
                ["gh", "run", "list", "--workflow=test-suite.yml", "--limit=1", "--json", "status,conclusion"],
                capture_output=True, text=True, timeout=30
            )
            
            if result.returncode == 0 and result.stdout.strip():
                runs = json.loads(result.stdout)
                if runs and len(runs) > 0:
                    latest_run = runs[0]
                    status = latest_run.get('status', 'unknown')
                    conclusion = latest_run.get('conclusion', 'unknown')
                    
                    if status == 'completed' and conclusion == 'success':
                        return 'healthy'
                    elif status == 'in_progress':
                        return 'running'
                    else:
                        return 'unhealthy'
            
            return 'unknown'
            
        except Exception as e:
            logger.error(f"Failed to check GitHub Actions status: {e}")
            return 'error'
    
    async def _check_playwright_status(self) -> str:
        """Check Playwright environment status"""
        try:
            result = subprocess.run(
                ["npx", "playwright", "--version"],
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode == 0 and "Version" in result.stdout:
                # Check if browsers are installed
                browser_check = subprocess.run(
                    ["npx", "playwright", "install", "--dry-run"],
                    capture_output=True, text=True, timeout=10
                )
                
                if "0 to install" in browser_check.stdout:
                    return 'healthy'
                else:
                    return 'needs_setup'
            
            return 'unhealthy'
            
        except Exception as e:
            logger.error(f"Failed to check Playwright status: {e}")
            return 'error'
    
    async def _check_api_tests_status(self) -> str:
        """Check API tests environment status"""
        try:
            # Check if backend server is running
            response = requests.get('http://localhost:8000/health', timeout=5)
            if response.status_code == 200:
                return 'healthy'
            else:
                return 'unhealthy'
                
        except requests.exceptions.RequestException:
            return 'down'
        except Exception as e:
            logger.error(f"Failed to check API tests status: {e}")
            return 'error'
    
    async def _check_unit_tests_status(self) -> str:
        """Check unit tests status"""
        try:
            # Check if test files exist and are accessible
            unit_tests_dir = self.project_root / "backend" / "tests" / "unit"
            if unit_tests_dir.exists() and list(unit_tests_dir.glob("test_*.py")):
                return 'healthy'
            else:
                return 'missing_tests'
                
        except Exception as e:
            logger.error(f"Failed to check unit tests status: {e}")
            return 'error'
    
    async def _check_e2e_tests_status(self) -> str:
        """Check E2E tests status"""
        try:
            # Check E2E test files and Playwright config
            e2e_tests_dir = self.project_root / "tests" / "e2e"
            playwright_config = self.project_root / "playwright.config.ts"
            
            if e2e_tests_dir.exists() and playwright_config.exists():
                if list(e2e_tests_dir.glob("*.spec.ts")):
                    return 'healthy'
                else:
                    return 'missing_tests'
            else:
                return 'missing_config'
                
        except Exception as e:
            logger.error(f"Failed to check E2E tests status: {e}")
            return 'error'
    
    async def _check_load_tests_status(self) -> str:
        """Check load tests status"""
        try:
            load_tests_dir = self.project_root / "tests" / "load"
            if load_tests_dir.exists() and list(load_tests_dir.glob("test_*.py")):
                return 'healthy'
            else:
                return 'missing_tests'
                
        except Exception as e:
            logger.error(f"Failed to check load tests status: {e}")
            return 'error'
    
    async def _check_security_tests_status(self) -> str:
        """Check security tests status"""
        try:
            # Check if security tools are available
            bandit_check = subprocess.run(
                ["bandit", "--version"],
                capture_output=True, text=True, timeout=10
            )
            
            safety_check = subprocess.run(
                ["safety", "--version"],
                capture_output=True, text=True, timeout=10
            )
            
            if bandit_check.returncode == 0 and safety_check.returncode == 0:
                return 'healthy'
            else:
                return 'missing_tools'
                
        except Exception as e:
            logger.error(f"Failed to check security tests status: {e}")
            return 'error'
    
    async def _calculate_coverage_percentage(self) -> float:
        """Calculate test coverage percentage"""
        try:
            coverage_file = self.reports_dir / "coverage.json"
            if coverage_file.exists():
                async with aiofiles.open(coverage_file, 'r') as f:
                    content = await f.read()
                    coverage_data = json.loads(content)
                    return float(coverage_data.get('totals', {}).get('percent_covered', 0.0))
            
            return 0.0
            
        except Exception as e:
            logger.error(f"Failed to calculate coverage percentage: {e}")
            return 0.0
    
    async def _count_test_issues(self) -> Tuple[int, int]:
        """Count test errors and warnings"""
        error_count = 0
        warning_count = 0
        
        try:
            # Count from various test report files
            report_files = list(self.reports_dir.glob("*-report.json"))
            
            for report_file in report_files:
                try:
                    async with aiofiles.open(report_file, 'r') as f:
                        content = await f.read()
                        report_data = json.loads(content)
                        
                        if 'summary' in report_data:
                            error_count += report_data['summary'].get('failed', 0)
                            warning_count += report_data['summary'].get('warnings', 0)
                            
                except Exception as e:
                    logger.debug(f"Could not parse report file {report_file}: {e}")
                    
        except Exception as e:
            logger.error(f"Failed to count test issues: {e}")
        
        return error_count, warning_count
    
    async def _count_failed_tests(self) -> int:
        """Count total failed tests across all test suites"""
        failed_count = 0
        
        try:
            # Check various test report files for failed tests
            report_patterns = [
                "*-report.json",
                "junit-*.xml",
                "test-results-*.json"
            ]
            
            for pattern in report_patterns:
                for report_file in self.reports_dir.glob(pattern):
                    try:
                        if report_file.suffix == '.json':
                            async with aiofiles.open(report_file, 'r') as f:
                                content = await f.read()
                                report_data = json.loads(content)
                                
                                if 'summary' in report_data:
                                    failed_count += report_data['summary'].get('failed', 0)
                                    
                    except Exception as e:
                        logger.debug(f"Could not parse report file {report_file}: {e}")
                        
        except Exception as e:
            logger.error(f"Failed to count failed tests: {e}")
        
        return failed_count
    
    def _determine_overall_health(self, *statuses) -> str:
        """Determine overall test suite health based on component statuses"""
        status_list = [status for status in statuses if isinstance(status, str)]
        failed_test_count = statuses[-2] if len(statuses) > 2 else 0
        error_count = statuses[-1] if len(statuses) > 1 else 0
        
        # Critical failure conditions
        if 'error' in status_list or error_count > 10:
            return 'critical'
        
        # Unhealthy conditions
        if 'unhealthy' in status_list or failed_test_count > 5:
            return 'unhealthy'
        
        # Warning conditions
        if 'down' in status_list or 'missing_tests' in status_list or failed_test_count > 0:
            return 'warning'
        
        # Running conditions
        if 'running' in status_list:
            return 'running'
        
        # Healthy condition
        if all(status in ['healthy', 'running'] for status in status_list):
            return 'healthy'
        
        return 'unknown'
    
    async def execute_repair_action(self, action: TestSuiteRepairAction) -> Dict:
        """Execute a specific repair action"""
        logger.info(f"🔧 Executing repair action: {action.action_id}")
        
        start_time = datetime.now()
        repair_result = {
            'action_id': action.action_id,
            'start_time': start_time.isoformat(),
            'success': False,
            'output': '',
            'error': '',
            'duration_seconds': 0,
            'retries_used': 0
        }
        
        for attempt in range(action.max_retries):
            try:
                # Execute repair command
                logger.info(f"🔧 Attempt {attempt + 1}/{action.max_retries}: {action.repair_command}")
                
                process = await asyncio.create_subprocess_shell(
                    action.repair_command,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=self.project_root
                )
                
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=action.timeout_seconds
                )
                
                repair_result['output'] = stdout.decode() if stdout else ''
                repair_result['error'] = stderr.decode() if stderr else ''
                repair_result['retries_used'] = attempt + 1
                
                # Validate repair success
                if action.validation_command:
                    validation_process = await asyncio.create_subprocess_shell(
                        action.validation_command,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                        cwd=self.project_root
                    )
                    
                    val_stdout, val_stderr = await asyncio.wait_for(
                        validation_process.communicate(),
                        timeout=30
                    )
                    
                    if validation_process.returncode == 0:
                        repair_result['success'] = True
                        logger.info(f"✅ Repair action {action.action_id} succeeded")
                        break
                    else:
                        logger.warning(f"⚠️ Validation failed for {action.action_id}: {val_stderr.decode()}")
                else:
                    # No validation command, assume success if repair command succeeded
                    if process.returncode == 0:
                        repair_result['success'] = True
                        logger.info(f"✅ Repair action {action.action_id} succeeded")
                        break
                
            except asyncio.TimeoutError:
                logger.error(f"❌ Repair action {action.action_id} timed out")
                repair_result['error'] = f"Timeout after {action.timeout_seconds} seconds"
                
            except Exception as e:
                logger.error(f"❌ Repair action {action.action_id} failed: {e}")
                repair_result['error'] = str(e)
                
            # Wait before retry
            if attempt < action.max_retries - 1:
                await asyncio.sleep(10)
        
        end_time = datetime.now()
        repair_result['duration_seconds'] = (end_time - start_time).total_seconds()
        
        return repair_result
    
    async def run_repair_cycle(self) -> Dict:
        """Run a complete test suite repair cycle"""
        cycle_start = datetime.now()
        self.current_repair_cycle += 1
        
        logger.info(f"🚀 Starting test suite repair cycle #{self.current_repair_cycle}")
        
        # Check current health status
        health_status = await self.check_test_suite_health()
        
        cycle_result = {
            'cycle_number': self.current_repair_cycle,
            'start_time': cycle_start.isoformat(),
            'health_before': asdict(health_status),
            'repair_actions_executed': [],
            'repair_actions_successful': 0,
            'repair_actions_failed': 0,
            'overall_success': False,
            'duration_seconds': 0
        }
        
        # Determine which repairs are needed
        repairs_needed = self._determine_needed_repairs(health_status)
        
        if not repairs_needed:
            logger.info("✅ No repairs needed - all systems healthy")
            cycle_result['overall_success'] = True
        else:
            logger.info(f"🔧 {len(repairs_needed)} repair actions needed")
            
            # Execute repairs in dependency order
            for repair_action in repairs_needed:
                repair_result = await self.execute_repair_action(repair_action)
                cycle_result['repair_actions_executed'].append(repair_result)
                
                if repair_result['success']:
                    cycle_result['repair_actions_successful'] += 1
                    health_status.repair_actions_taken.append(repair_action.action_id)
                else:
                    cycle_result['repair_actions_failed'] += 1
                
                # Brief pause between repairs
                await asyncio.sleep(2)
        
        # Check health after repairs
        health_after = await self.check_test_suite_health()
        cycle_result['health_after'] = asdict(health_after)
        
        # Determine overall cycle success
        cycle_result['overall_success'] = (
            health_after.overall_health in ['healthy', 'warning'] and
            cycle_result['repair_actions_failed'] == 0
        )
        
        # Update repair tracking
        if cycle_result['overall_success']:
            self.consecutive_failures = 0
            self.last_successful_repair = cycle_start
        else:
            self.consecutive_failures += 1
        
        cycle_end = datetime.now()
        cycle_result['duration_seconds'] = (cycle_end - cycle_start).total_seconds()
        
        # Save repair state
        await self._save_repair_state(cycle_result, health_after)
        
        logger.info(f"🏁 Repair cycle #{self.current_repair_cycle} completed in {cycle_result['duration_seconds']:.2f}s")
        
        return cycle_result
    
    def _determine_needed_repairs(self, health_status: TestSuiteHealthStatus) -> List[TestSuiteRepairAction]:
        """Determine which repair actions are needed based on health status"""
        needed_repairs = []
        
        # Map health statuses to repair actions
        repair_mapping = {
            'github_actions_status': ['github_actions_test_suite_repair'],
            'playwright_status': ['playwright_environment_repair'],
            'api_tests_status': ['api_test_environment_repair', 'test_database_repair'],
            'unit_tests_status': ['test_database_repair'],
            'e2e_tests_status': ['playwright_environment_repair', 'frontend_test_environment_repair'],
            'load_tests_status': ['load_test_environment_repair'],
            'security_tests_status': ['security_test_repair']
        }
        
        # Check each component health
        for component, action_ids in repair_mapping.items():
            component_status = getattr(health_status, component, 'unknown')
            
            if component_status in ['unhealthy', 'down', 'error', 'missing_tests', 'missing_config', 'needs_setup']:
                for action_id in action_ids:
                    action = next((a for a in self.repair_actions if a.action_id == action_id), None)
                    if action and action not in needed_repairs:
                        needed_repairs.append(action)
        
        # Always include report consolidation if there are any issues
        if health_status.failed_test_count > 0 or health_status.error_count > 0:
            consolidation_action = next((a for a in self.repair_actions if a.action_id == "test_reports_consolidation_repair"), None)
            if consolidation_action and consolidation_action not in needed_repairs:
                needed_repairs.append(consolidation_action)
        
        # Sort by priority and dependencies
        priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        needed_repairs.sort(key=lambda x: priority_order.get(x.priority, 999))
        
        return needed_repairs
    
    async def _save_repair_state(self, cycle_result: Dict, health_status: TestSuiteHealthStatus):
        """Save current repair state and health metrics"""
        try:
            # Save repair state
            repair_state = {
                'current_cycle': self.current_repair_cycle,
                'consecutive_failures': self.consecutive_failures,
                'last_successful_repair': self.last_successful_repair.isoformat() if self.last_successful_repair else None,
                'last_cycle_result': cycle_result,
                'repair_history': self.repair_history[-50:]  # Keep last 50 cycles
            }
            
            async with aiofiles.open(self.repair_state_file, 'w') as f:
                await f.write(json.dumps(repair_state, indent=2))
            
            # Save health metrics
            async with aiofiles.open(self.health_metrics_file, 'w') as f:
                await f.write(json.dumps(asdict(health_status), indent=2))
            
            # Add to repair history
            self.repair_history.append({
                'cycle': self.current_repair_cycle,
                'timestamp': cycle_result['start_time'],
                'success': cycle_result['overall_success'],
                'repairs_executed': len(cycle_result['repair_actions_executed']),
                'health_score': self._calculate_health_score(health_status)
            })
            
        except Exception as e:
            logger.error(f"Failed to save repair state: {e}")
    
    def _calculate_health_score(self, health_status: TestSuiteHealthStatus) -> float:
        """Calculate overall health score (0-100)"""
        try:
            # Base score from overall health
            health_scores = {
                'healthy': 100,
                'warning': 75,
                'running': 60,
                'unhealthy': 25,
                'critical': 0,
                'unknown': 50
            }
            
            base_score = health_scores.get(health_status.overall_health, 50)
            
            # Adjust for coverage
            coverage_bonus = min(health_status.coverage_percentage * 0.3, 30)
            
            # Penalties for failures
            failure_penalty = min(health_status.failed_test_count * 5, 50)
            error_penalty = min(health_status.error_count * 3, 30)
            
            final_score = max(0, base_score + coverage_bonus - failure_penalty - error_penalty)
            return round(final_score, 2)
            
        except Exception:
            return 50.0
    
    async def run_continuous_repair_loop(self):
        """Run continuous test suite repair loop"""
        logger.info("🚀 Starting continuous Test Suite repair loop")
        
        try:
            while True:
                # Check if we should continue
                if self.consecutive_failures >= self.max_consecutive_failures:
                    logger.error(f"❌ Stopping repair loop after {self.consecutive_failures} consecutive failures")
                    break
                
                # Run repair cycle
                cycle_result = await self.run_repair_cycle()
                
                # Log cycle summary
                health_score = self._calculate_health_score(
                    TestSuiteHealthStatus(**cycle_result['health_after'])
                )
                
                logger.info(f"📊 Cycle #{self.current_repair_cycle} Summary:")
                logger.info(f"   Health Score: {health_score}/100")
                logger.info(f"   Repairs: {cycle_result['repair_actions_successful']} successful, {cycle_result['repair_actions_failed']} failed")
                logger.info(f"   Overall Success: {'✅' if cycle_result['overall_success'] else '❌'}")
                
                # Wait for next cycle
                logger.info(f"⏰ Waiting {self.repair_interval} seconds for next repair cycle...")
                await asyncio.sleep(self.repair_interval)
                
        except KeyboardInterrupt:
            logger.info("🛑 Repair loop stopped by user")
        except Exception as e:
            logger.error(f"💥 Repair loop failed: {e}")
        finally:
            logger.info("🏁 Test Suite repair loop ended")

async def main():
    """Main entry point for Test Suite Final Repair Engine"""
    print("🔧 ITSM Test Suite Final Repair Engine - Phase 3")
    print("=" * 60)
    
    engine = TestSuiteFinalRepairEngine()
    
    # Run single repair cycle or continuous loop
    if len(sys.argv) > 1 and sys.argv[1] == "--single":
        print("🔄 Running single repair cycle...")
        result = await engine.run_repair_cycle()
        print(f"✅ Single cycle completed: {'Success' if result['overall_success'] else 'Failed'}")
    else:
        print("🔄 Starting continuous repair loop...")
        await engine.run_continuous_repair_loop()

if __name__ == "__main__":
    asyncio.run(main())