#!/usr/bin/env python3
"""
修復後動作確認システム
TypeScript コンパイル、ビルド、テスト実行による修復結果検証
"""

import os
import json
import subprocess
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

class FrontendTestRunner:
    def __init__(self, 
                 frontend_path: str = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/frontend",
                 coordination_path: str = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination"):
        self.frontend_path = Path(frontend_path)
        self.coordination_path = Path(coordination_path)
        self.setup_logging()

    def setup_logging(self):
        """ログ設定"""
        log_file = self.coordination_path / "frontend-repair" / "test_runner.log"
        log_file.parent.mkdir(exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def run_typescript_check(self) -> Dict[str, Any]:
        """TypeScript型チェックを実行"""
        self.logger.info("Running TypeScript type check")
        
        result = {
            'test_name': 'typescript_check',
            'success': False,
            'duration': 0,
            'output': '',
            'errors': [],
            'timestamp': datetime.now().isoformat()
        }
        
        start_time = time.time()
        
        try:
            process = subprocess.run(
                ["npx", "tsc", "--noEmit"],
                cwd=self.frontend_path,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            result['duration'] = time.time() - start_time
            result['output'] = process.stdout + process.stderr
            result['return_code'] = process.returncode
            
            if process.returncode == 0:
                result['success'] = True
                self.logger.info("TypeScript check passed")
            else:
                result['errors'] = self._parse_typescript_errors(result['output'])
                self.logger.warning(f"TypeScript check failed with {len(result['errors'])} errors")
                
        except subprocess.TimeoutExpired:
            result['duration'] = time.time() - start_time
            result['output'] = "TypeScript check timed out"
            result['errors'] = ["Timeout error"]
            self.logger.error("TypeScript check timed out")
        except Exception as e:
            result['duration'] = time.time() - start_time
            result['output'] = str(e)
            result['errors'] = [str(e)]
            self.logger.error(f"TypeScript check failed: {e}")
            
        return result

    def run_eslint_check(self) -> Dict[str, Any]:
        """ESLint チェックを実行"""
        self.logger.info("Running ESLint check")
        
        result = {
            'test_name': 'eslint_check',
            'success': False,
            'duration': 0,
            'output': '',
            'errors': [],
            'warnings': [],
            'timestamp': datetime.now().isoformat()
        }
        
        start_time = time.time()
        
        try:
            process = subprocess.run(
                ["npx", "eslint", "src/", "--ext", "ts,tsx", "--format", "json"],
                cwd=self.frontend_path,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            result['duration'] = time.time() - start_time
            result['return_code'] = process.returncode
            
            if process.stdout:
                eslint_results = json.loads(process.stdout)
                errors, warnings = self._parse_eslint_results(eslint_results)
                result['errors'] = errors
                result['warnings'] = warnings
                result['output'] = f"Errors: {len(errors)}, Warnings: {len(warnings)}"
                
                # エラーがなければ成功
                result['success'] = len(errors) == 0
                
                if result['success']:
                    self.logger.info(f"ESLint check passed (Warnings: {len(warnings)})")
                else:
                    self.logger.warning(f"ESLint check failed with {len(errors)} errors")
            else:
                result['success'] = process.returncode == 0
                result['output'] = process.stderr
                
        except subprocess.TimeoutExpired:
            result['duration'] = time.time() - start_time
            result['output'] = "ESLint check timed out"
            result['errors'] = ["Timeout error"]
            self.logger.error("ESLint check timed out")
        except Exception as e:
            result['duration'] = time.time() - start_time
            result['output'] = str(e)
            result['errors'] = [str(e)]
            self.logger.error(f"ESLint check failed: {e}")
            
        return result

    def run_build_test(self) -> Dict[str, Any]:
        """ビルドテストを実行"""
        self.logger.info("Running build test")
        
        result = {
            'test_name': 'build_test',
            'success': False,
            'duration': 0,
            'output': '',
            'errors': [],
            'build_size': 0,
            'timestamp': datetime.now().isoformat()
        }
        
        start_time = time.time()
        
        try:
            process = subprocess.run(
                ["npm", "run", "build"],
                cwd=self.frontend_path,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            result['duration'] = time.time() - start_time
            result['output'] = process.stdout + process.stderr
            result['return_code'] = process.returncode
            
            if process.returncode == 0:
                result['success'] = True
                result['build_size'] = self._get_build_size()
                self.logger.info(f"Build test passed (Size: {result['build_size']} bytes)")
            else:
                result['errors'] = self._parse_build_errors(result['output'])
                self.logger.warning(f"Build test failed with {len(result['errors'])} errors")
                
        except subprocess.TimeoutExpired:
            result['duration'] = time.time() - start_time
            result['output'] = "Build test timed out"
            result['errors'] = ["Timeout error"]
            self.logger.error("Build test timed out")
        except Exception as e:
            result['duration'] = time.time() - start_time
            result['output'] = str(e)
            result['errors'] = [str(e)]
            self.logger.error(f"Build test failed: {e}")
            
        return result

    def run_unit_tests(self) -> Dict[str, Any]:
        """ユニットテストを実行"""
        self.logger.info("Running unit tests")
        
        result = {
            'test_name': 'unit_tests',
            'success': False,
            'duration': 0,
            'output': '',
            'tests_run': 0,
            'tests_passed': 0,
            'tests_failed': 0,
            'coverage': {},
            'timestamp': datetime.now().isoformat()
        }
        
        start_time = time.time()
        
        try:
            process = subprocess.run(
                ["npm", "run", "test", "--", "--run", "--reporter=json"],
                cwd=self.frontend_path,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            result['duration'] = time.time() - start_time
            result['output'] = process.stdout + process.stderr
            result['return_code'] = process.returncode
            
            # テスト結果をパース
            test_stats = self._parse_test_results(result['output'])
            result.update(test_stats)
            
            result['success'] = process.returncode == 0 and result['tests_failed'] == 0
            
            if result['success']:
                self.logger.info(f"Unit tests passed ({result['tests_passed']}/{result['tests_run']})")
            else:
                self.logger.warning(f"Unit tests failed ({result['tests_failed']} failures)")
                
        except subprocess.TimeoutExpired:
            result['duration'] = time.time() - start_time
            result['output'] = "Unit tests timed out"
            self.logger.error("Unit tests timed out")
        except Exception as e:
            result['duration'] = time.time() - start_time
            result['output'] = str(e)
            self.logger.error(f"Unit tests failed: {e}")
            
        return result

    def run_lint_fix(self) -> Dict[str, Any]:
        """ESLint 自動修復を実行"""
        self.logger.info("Running ESLint auto-fix")
        
        result = {
            'test_name': 'lint_fix',
            'success': False,
            'duration': 0,
            'output': '',
            'files_fixed': 0,
            'timestamp': datetime.now().isoformat()
        }
        
        start_time = time.time()
        
        try:
            process = subprocess.run(
                ["npx", "eslint", "src/", "--ext", "ts,tsx", "--fix"],
                cwd=self.frontend_path,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            result['duration'] = time.time() - start_time
            result['output'] = process.stdout + process.stderr
            result['return_code'] = process.returncode
            result['success'] = True  # --fixは通常成功する
            
            # 修復されたファイル数を推定
            if "fixed" in result['output'].lower():
                result['files_fixed'] = result['output'].lower().count("fixed")
            
            self.logger.info(f"ESLint auto-fix completed (Fixed: {result['files_fixed']} issues)")
                
        except subprocess.TimeoutExpired:
            result['duration'] = time.time() - start_time
            result['output'] = "ESLint auto-fix timed out"
            self.logger.error("ESLint auto-fix timed out")
        except Exception as e:
            result['duration'] = time.time() - start_time
            result['output'] = str(e)
            self.logger.error(f"ESLint auto-fix failed: {e}")
            
        return result

    def run_comprehensive_test(self) -> Dict[str, Any]:
        """包括的テストを実行"""
        self.logger.info("Running comprehensive validation tests")
        
        comprehensive_result = {
            'timestamp': datetime.now().isoformat(),
            'overall_success': False,
            'total_duration': 0,
            'tests': []
        }
        
        start_time = time.time()
        
        # 各テストを順次実行
        tests = [
            self.run_lint_fix,          # 最初にlint修復
            self.run_typescript_check,   # TypeScript型チェック
            self.run_eslint_check,      # ESLintチェック
            self.run_build_test,        # ビルドテスト
            self.run_unit_tests         # ユニットテスト
        ]
        
        all_success = True
        
        for test_func in tests:
            test_result = test_func()
            comprehensive_result['tests'].append(test_result)
            
            if not test_result['success'] and test_result['test_name'] != 'lint_fix':
                all_success = False
        
        comprehensive_result['total_duration'] = time.time() - start_time
        comprehensive_result['overall_success'] = all_success
        
        # サマリー情報を生成
        comprehensive_result['summary'] = self._generate_test_summary(comprehensive_result['tests'])
        
        if all_success:
            self.logger.info("All validation tests passed!")
        else:
            self.logger.warning("Some validation tests failed")
            
        return comprehensive_result

    def _parse_typescript_errors(self, output: str) -> List[str]:
        """TypeScriptエラーをパース"""
        errors = []
        for line in output.split('\n'):
            if 'error TS' in line:
                errors.append(line.strip())
        return errors

    def _parse_eslint_results(self, eslint_results: List[Dict]) -> tuple:
        """ESLint結果をパース"""
        errors = []
        warnings = []
        
        for file_result in eslint_results:
            for message in file_result.get('messages', []):
                message_text = f"{file_result['filePath']}:{message.get('line', 0)} - {message.get('message', '')}"
                
                if message.get('severity', 1) == 2:
                    errors.append(message_text)
                else:
                    warnings.append(message_text)
                    
        return errors, warnings

    def _parse_build_errors(self, output: str) -> List[str]:
        """ビルドエラーをパース"""
        errors = []
        lines = output.split('\n')
        
        for line in lines:
            if 'ERROR' in line.upper() or 'FAILED' in line.upper():
                errors.append(line.strip())
                
        return errors

    def _parse_test_results(self, output: str) -> Dict[str, Any]:
        """テスト結果をパース"""
        result = {
            'tests_run': 0,
            'tests_passed': 0,
            'tests_failed': 0,
            'coverage': {}
        }
        
        # Vitest結果をパース（基本的な実装）
        lines = output.split('\n')
        for line in lines:
            if 'Test Files' in line:
                # テストファイル数を抽出
                import re
                match = re.search(r'(\d+)\s+passed', line)
                if match:
                    result['tests_passed'] = int(match.group(1))
                    
                match = re.search(r'(\d+)\s+failed', line)
                if match:
                    result['tests_failed'] = int(match.group(1))
                    
                result['tests_run'] = result['tests_passed'] + result['tests_failed']
                
        return result

    def _get_build_size(self) -> int:
        """ビルドサイズを取得"""
        dist_path = self.frontend_path / "dist"
        if dist_path.exists():
            total_size = 0
            for file_path in dist_path.rglob("*"):
                if file_path.is_file():
                    total_size += file_path.stat().st_size
            return total_size
        return 0

    def _generate_test_summary(self, tests: List[Dict[str, Any]]) -> Dict[str, Any]:
        """テストサマリーを生成"""
        summary = {
            'total_tests': len(tests),
            'passed': 0,
            'failed': 0,
            'total_duration': 0,
            'categories': {}
        }
        
        for test in tests:
            if test['success']:
                summary['passed'] += 1
            else:
                summary['failed'] += 1
                
            summary['total_duration'] += test.get('duration', 0)
            
            # カテゴリ別統計
            test_name = test['test_name']
            summary['categories'][test_name] = {
                'success': test['success'],
                'duration': test.get('duration', 0)
            }
        
        return summary

    def validate_fix(self, fix_result: Dict[str, Any]) -> Dict[str, Any]:
        """修復結果を検証"""
        self.logger.info("Validating fix results")
        
        validation_result = {
            'fix_validation': fix_result,
            'pre_validation': self.run_comprehensive_test(),
            'validation_success': False,
            'timestamp': datetime.now().isoformat()
        }
        
        # 修復が成功し、かつテストがパスした場合に成功
        fix_successful = fix_result.get('successful_fixes', 0) > 0
        tests_passed = validation_result['pre_validation']['overall_success']
        
        validation_result['validation_success'] = fix_successful and tests_passed
        
        if validation_result['validation_success']:
            self.logger.info("Fix validation successful!")
        else:
            self.logger.warning("Fix validation failed")
            
        return validation_result

if __name__ == "__main__":
    test_runner = FrontendTestRunner()
    
    # 包括的テストを実行
    result = test_runner.run_comprehensive_test()
    print(json.dumps(result, indent=2, ensure_ascii=False))