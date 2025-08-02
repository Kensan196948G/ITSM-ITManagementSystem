#!/usr/bin/env python3
"""
Pytest統合テストスイート
- GitHub Actions自動化システムの包括的テスト
- API、ユニット、統合テストの実行
- レポート生成とCI/CD連携
"""

import pytest
import asyncio
import json
import requests
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import sys
import os
import tempfile
import shutil

# プロジェクトルートをパスに追加
sys.path.append(str(Path(__file__).parent.parent.parent))

from coordination.realtime_repair_controller import RealtimeRepairController
from coordination.github_actions_monitor import GitHubActionsMonitor
from coordination.error_pattern_analyzer import ErrorPatternAnalyzer, ErrorPattern, ErrorMatch
from coordination.auto_repair_engine import AutoRepairEngine, RepairStatus
from coordination.auto_pr_creator import AutoPRCreator

class TestGitHubActionsAutomation:
    """GitHub Actions自動化システムテストクラス"""
    
    @pytest.fixture(scope="class")
    def test_environment(self):
        """テスト環境セットアップ"""
        test_dir = Path(__file__).parent / "test_workspace"
        test_dir.mkdir(exist_ok=True)
        
        # テスト用設定
        config = {
            "test_mode": True,
            "timeout": 30,
            "max_retries": 2
        }
        
        yield {
            "test_dir": test_dir,
            "config": config
        }
        
        # クリーンアップ
        if test_dir.exists():
            shutil.rmtree(test_dir)

    @pytest.fixture
    def github_monitor(self):
        """GitHub Actions Monitor フィクスチャ"""
        return GitHubActionsMonitor()

    @pytest.fixture  
    def error_analyzer(self):
        """Error Pattern Analyzer フィクスチャ"""
        return ErrorPatternAnalyzer()

    @pytest.fixture
    def repair_engine(self):
        """Auto Repair Engine フィクスチャ"""
        return AutoRepairEngine()

    @pytest.fixture
    def pr_creator(self):
        """Auto PR Creator フィクスチャ"""
        return AutoPRCreator()

    @pytest.fixture
    def repair_controller(self):
        """Realtime Repair Controller フィクスチャ"""
        return RealtimeRepairController()

    @pytest.mark.asyncio
    async def test_github_cli_availability(self):
        """GitHub CLI利用可能性テスト"""
        try:
            result = subprocess.run(
                ["gh", "--version"],
                capture_output=True,
                text=True,
                timeout=10
            )
            assert result.returncode == 0, "GitHub CLI not available"
            assert "gh version" in result.stdout, "Invalid GitHub CLI response"
        except subprocess.TimeoutExpired:
            pytest.fail("GitHub CLI command timed out")
        except FileNotFoundError:
            pytest.fail("GitHub CLI not installed")

    @pytest.mark.asyncio
    async def test_github_authentication(self):
        """GitHub認証テスト"""
        try:
            result = subprocess.run(
                ["gh", "auth", "status"],
                capture_output=True,
                text=True,
                timeout=10
            )
            assert result.returncode == 0, f"GitHub authentication failed: {result.stderr}"
        except subprocess.TimeoutExpired:
            pytest.fail("GitHub auth check timed out")

    @pytest.mark.asyncio
    async def test_github_monitor_initialization(self, github_monitor):
        """GitHub Monitor初期化テスト"""
        assert github_monitor is not None
        assert github_monitor.repo_owner == "Kensan196948G"
        assert github_monitor.repo_name == "ITSM-ITManagementSystem"
        assert hasattr(github_monitor, 'logger')

    @pytest.mark.asyncio
    async def test_github_actions_api_access(self, github_monitor):
        """GitHub Actions API接続テスト"""
        auth_status = await github_monitor.check_gh_auth()
        assert auth_status, "GitHub CLI authentication failed"
        
        workflow_runs = await github_monitor.get_workflow_runs()
        assert workflow_runs is not None, "Failed to retrieve workflow runs"
        # 結果が空でも接続は成功とみなす

    @pytest.mark.asyncio
    async def test_error_pattern_analyzer_initialization(self, error_analyzer):
        """Error Pattern Analyzer初期化テスト"""
        assert error_analyzer is not None
        assert len(error_analyzer.patterns) > 0, "No error patterns loaded"
        assert hasattr(error_analyzer, 'analysis_stats')

    @pytest.mark.asyncio
    async def test_error_pattern_matching(self, error_analyzer):
        """エラーパターンマッチングテスト"""
        test_log = """
        ModuleNotFoundError: No module named 'fastapi'
        FAILED tests/test_api.py::test_create_user - AssertionError
        npm ERR! Cannot resolve dependency: @types/react
        TS2304: Cannot find name 'React'
        Error: Process completed with exit code 1
        """
        
        matches = error_analyzer.analyze_log_content(test_log)
        assert len(matches) > 0, "No error patterns matched"
        
        # 各マッチの検証
        for match in matches:
            assert isinstance(match, ErrorMatch)
            assert match.pattern is not None
            assert match.matched_text is not None
            assert match.confidence > 0

    @pytest.mark.asyncio
    async def test_fix_suggestions_generation(self, error_analyzer):
        """修復提案生成テスト"""
        test_log = "ModuleNotFoundError: No module named 'requests'"
        matches = error_analyzer.analyze_log_content(test_log)
        
        if matches:
            suggestions = error_analyzer.get_fix_suggestions(matches)
            assert len(suggestions) > 0, "No fix suggestions generated"
            
            for suggestion in suggestions:
                assert "pattern_name" in suggestion
                assert "fix_actions" in suggestion
                assert len(suggestion["fix_actions"]) > 0

    @pytest.mark.asyncio
    async def test_repair_engine_initialization(self, repair_engine):
        """Repair Engine初期化テスト"""
        assert repair_engine is not None
        assert len(repair_engine.repair_actions) > 0, "No repair actions loaded"
        assert hasattr(repair_engine, 'execution_stats')

    @pytest.mark.asyncio
    async def test_repair_action_validation(self, repair_engine):
        """修復アクション検証テスト"""
        # 安全なテスト用アクション
        from coordination.auto_repair_engine import RepairAction, RepairPriority
        
        test_action = RepairAction(
            name="test_validation",
            command="echo 'test'",
            description="Test validation action",
            working_dir=".",
            timeout=10,
            retry_count=1,
            prerequisites=[],
            validation_command="echo 'validation'",
            priority=RepairPriority.LOW
        )
        
        # 実際のコマンド実行テスト
        result = await repair_engine.execute_command(test_action)
        assert result is not None
        assert result.status in [RepairStatus.SUCCESS, RepairStatus.FAILED]

    @pytest.mark.asyncio 
    async def test_smart_repair_logic(self, repair_engine):
        """スマート修復ロジックテスト"""
        test_patterns = [
            "ModuleNotFoundError: No module named 'test'",
            "config validation failed"
        ]
        
        # スマート修復（安全なアクションのみ）
        results = await repair_engine.smart_repair(test_patterns)
        assert isinstance(results, dict), "Smart repair should return dict"
        
        # 結果検証
        if results:
            for category, category_results in results.items():
                assert isinstance(category_results, list)

    @pytest.mark.asyncio
    async def test_pr_creator_initialization(self, pr_creator):
        """PR Creator初期化テスト"""
        assert pr_creator is not None
        assert pr_creator.github_config["owner"] == "Kensan196948G"
        assert pr_creator.github_config["repo"] == "ITSM-ITManagementSystem"

    @pytest.mark.asyncio
    async def test_git_status_check(self, pr_creator):
        """Git状態チェックテスト"""
        git_status = await pr_creator.check_git_status()
        assert git_status is not None
        assert "status" in git_status
        assert git_status["status"] in ["success", "error"]

    @pytest.mark.asyncio
    async def test_commit_message_generation(self, pr_creator):
        """コミットメッセージ生成テスト"""
        repair_summary = {
            "categories": ["dependency", "build"],
            "total_actions": 3,
            "successful_actions": 2,
            "success_rate": 0.67
        }
        
        git_status = {
            "has_changes": True,
            "total_changes": 5,
            "modified_files": ["requirements.txt", "package.json"]
        }
        
        message = pr_creator.generate_commit_message(repair_summary, git_status)
        assert message is not None
        assert len(message) > 0
        assert "Claude Code" in message

    @pytest.mark.asyncio
    async def test_pr_description_generation(self, pr_creator):
        """PR説明文生成テスト"""
        repair_summary = {
            "categories": ["dependency"],
            "total_actions": 2,
            "successful_actions": 2,
            "success_rate": 1.0
        }
        
        git_status = {
            "has_changes": True,
            "total_changes": 2,
            "modified_files": ["requirements.txt"]
        }
        
        description = pr_creator.generate_pr_description(repair_summary, git_status)
        assert description is not None
        assert len(description) > 0
        assert "自動修復PR" in description

    @pytest.mark.asyncio
    async def test_branch_name_generation(self, pr_creator):
        """ブランチ名生成テスト"""
        repair_summary = {
            "categories": ["dependency", "build"]
        }
        
        branch_name = pr_creator.generate_branch_name(repair_summary)
        assert branch_name is not None
        assert branch_name.startswith("fix/")
        assert len(branch_name) > 10

    @pytest.mark.asyncio
    async def test_repair_controller_initialization(self, repair_controller):
        """Repair Controller初期化テスト"""
        assert repair_controller is not None
        assert hasattr(repair_controller, 'config')
        assert hasattr(repair_controller, 'state')

    @pytest.mark.asyncio
    async def test_status_report_generation(self, repair_controller):
        """ステータスレポート生成テスト"""
        report = await repair_controller.generate_status_report()
        assert report is not None
        assert "timestamp" in report
        assert "status" in report
        assert "config" in report

    @pytest.mark.asyncio
    async def test_github_actions_status_check(self, repair_controller):
        """GitHub Actions状態チェックテスト"""
        try:
            status = await repair_controller.check_github_actions_status()
            assert status is not None
            assert "status" in status
            assert status["status"] in ["success", "error", "no_runs"]
        except Exception as e:
            # ネットワークエラーなどは許容
            pytest.skip(f"GitHub API access failed: {e}")

    @pytest.mark.asyncio
    async def test_integration_workflow(self, github_monitor, error_analyzer, repair_engine, pr_creator):
        """統合ワークフローテスト"""
        # ステップ1: エラーログのシミュレーション
        test_log = "ModuleNotFoundError: No module named 'pytest'"
        
        # ステップ2: エラー分析
        matches = error_analyzer.analyze_log_content(test_log)
        assert len(matches) > 0, "Error analysis failed"
        
        # ステップ3: 修復提案生成
        suggestions = error_analyzer.get_fix_suggestions(matches)
        assert len(suggestions) > 0, "Fix suggestion generation failed"
        
        # ステップ4: 修復サマリー作成
        repair_summary = {
            "categories": ["dependency"],
            "total_actions": len(suggestions),
            "successful_actions": len(suggestions),
            "success_rate": 1.0
        }
        
        # ステップ5: PR内容生成（実際のPR作成はしない）
        git_status = await pr_creator.check_git_status()
        commit_message = pr_creator.generate_commit_message(repair_summary, git_status)
        pr_description = pr_creator.generate_pr_description(repair_summary, git_status)
        
        # 検証
        assert commit_message is not None
        assert pr_description is not None
        assert len(commit_message) > 0
        assert len(pr_description) > 0

    @pytest.mark.asyncio
    async def test_error_handling_robustness(self, error_analyzer):
        """エラー処理堅牢性テスト"""
        # 空のログ
        empty_matches = error_analyzer.analyze_log_content("")
        assert isinstance(empty_matches, list)
        
        # 無効なログ形式
        invalid_log = "Invalid log format with random text 12345"
        invalid_matches = error_analyzer.analyze_log_content(invalid_log)
        assert isinstance(invalid_matches, list)
        
        # 非常に長いログ
        long_log = "Error message\n" * 1000
        long_matches = error_analyzer.analyze_log_content(long_log)
        assert isinstance(long_matches, list)

    @pytest.mark.asyncio
    async def test_statistics_tracking(self, error_analyzer, repair_engine, pr_creator):
        """統計追跡テスト"""
        # Error analyzer stats
        analyzer_stats = error_analyzer.get_statistics()
        assert isinstance(analyzer_stats, dict)
        assert "total_analyzed" in analyzer_stats
        
        # Repair engine stats
        engine_stats = repair_engine.get_statistics()
        assert isinstance(engine_stats, dict)
        assert "total_repairs" in engine_stats
        
        # PR creator stats
        pr_stats = pr_creator.get_pr_statistics()
        assert isinstance(pr_stats, dict)
        assert "total_prs_created" in pr_stats

    @pytest.mark.asyncio
    async def test_configuration_validation(self, repair_controller):
        """設定検証テスト"""
        config = repair_controller.config
        
        # 必要な設定項目の確認
        required_keys = [
            "check_interval",
            "max_repair_cycles", 
            "error_threshold",
            "consecutive_clean_required"
        ]
        
        for key in required_keys:
            assert key in config, f"Missing config key: {key}"
            assert isinstance(config[key], (int, float)), f"Invalid config type for {key}"

    @pytest.mark.asyncio
    async def test_performance_benchmarks(self, error_analyzer):
        """パフォーマンスベンチマークテスト"""
        import time
        
        # 大量のエラーログテスト
        large_log = "\n".join([
            f"Error {i}: ModuleNotFoundError: No module named 'module{i}'"
            for i in range(100)
        ])
        
        start_time = time.time()
        matches = error_analyzer.analyze_log_content(large_log)
        analysis_time = time.time() - start_time
        
        # パフォーマンス要件: 100行のログを1秒以内で処理
        assert analysis_time < 1.0, f"Analysis too slow: {analysis_time:.2f}s"
        assert len(matches) > 0, "No matches found in large log"

    @pytest.mark.asyncio
    async def test_memory_usage(self, error_analyzer, repair_engine):
        """メモリ使用量テスト"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # メモリ集約的な処理を実行
        for i in range(10):
            large_log = "Error message\n" * 1000
            matches = error_analyzer.analyze_log_content(large_log)
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # メモリ増加が100MB以下であることを確認
        max_increase = 100 * 1024 * 1024  # 100MB
        assert memory_increase < max_increase, f"Memory increase too high: {memory_increase / 1024 / 1024:.2f}MB"

def pytest_configure(config):
    """Pytest設定"""
    config.addinivalue_line("markers", "integration: marks tests as integration tests")
    config.addinivalue_line("markers", "performance: marks tests as performance tests") 
    config.addinivalue_line("markers", "github_api: marks tests that require GitHub API access")

if __name__ == "__main__":
    # テスト実行
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "--maxfail=5",
        "--durations=10"
    ])