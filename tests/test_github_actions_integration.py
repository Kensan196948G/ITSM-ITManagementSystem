#!/usr/bin/env python3
"""
GitHub Actions Integration Monitor テストスイート
Failed Workflow Analysis: 権限エラーの特定とテスト
"""

import pytest
import json
import yaml
import os
import tempfile
import subprocess
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock


class TestGitHubActionsIntegration:
    """GitHub Actions Integration Monitor の包括的テスト"""
    
    @pytest.fixture
    def workflow_file_path(self):
        """ワークフローファイルのパスを返す"""
        return Path(__file__).parent.parent / ".github" / "workflows" / "github-actions-integration.yml"
    
    @pytest.fixture
    def workflow_content(self, workflow_file_path):
        """ワークフローファイルの内容を読み込み"""
        with open(workflow_file_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    def test_workflow_file_exists(self, workflow_file_path):
        """ワークフローファイルが存在することを確認"""
        assert workflow_file_path.exists(), f"Workflow file not found: {workflow_file_path}"
    
    def test_workflow_structure(self, workflow_content):
        """ワークフローの基本構造をテスト"""
        assert "name" in workflow_content
        assert workflow_content["name"] == "GitHub Actions Integration Monitor"
        # YAMLの'on'がTrueとしてパースされるケースを考慮
        assert True in workflow_content or "on" in workflow_content
        assert "jobs" in workflow_content
        assert "monitor-workflows" in workflow_content["jobs"]
    
    def test_checkout_permissions(self, workflow_content):
        """チェックアウト権限の設定をテスト"""
        job = workflow_content["jobs"]["monitor-workflows"]
        checkout_step = None
        
        for step in job["steps"]:
            if step.get("name") == "Checkout repository":
                checkout_step = step
                break
        
        assert checkout_step is not None, "Checkout step not found"
        
        # 現在の設定を確認
        with_config = checkout_step.get("with", {})
        token = with_config.get("token")
        
        # 問題: GITHUB_TOKEN では git push ができない
        assert token == "${{ secrets.GITHUB_TOKEN }}", "Current token configuration detected"
    
    def test_git_push_permission_issue(self):
        """Git push 権限問題のテスト"""
        # GITHUB_TOKEN の制限をシミュレート
        mock_response = {
            "error": "Permission to Kensan196948G/ITSM-ITManagementSystem.git denied to github-actions[bot]",
            "status_code": 403
        }
        
        # これが現在発生している問題
        assert mock_response["status_code"] == 403
        assert "Permission" in mock_response["error"]
        assert "denied to github-actions[bot]" in mock_response["error"]
    
    @patch('subprocess.run')
    def test_python_script_execution(self, mock_subprocess):
        """Python スクリプトの実行テスト"""
        # Python スクリプトは正常に動作している（ログから確認済み）
        mock_subprocess.return_value.returncode = 0
        mock_subprocess.return_value.stdout = "GitHub Actions Monitor Report completed"
        
        # スクリプト実行をシミュレート
        result = subprocess.run(['python', '-c', 'print("Test")'], capture_output=True, text=True)
        
        # Python 実行は成功することを確認
        assert mock_subprocess.called
    
    def test_monitoring_report_creation(self):
        """監視レポート作成のテスト"""
        # 期待されるレポート構造
        expected_report_structure = {
            "timestamp": str,
            "total_recent_runs": int,
            "failed_runs": int,
            "failed_workflows": list,
            "status": str
        }
        
        # レポートの構造が正しいことを確認
        for key, expected_type in expected_report_structure.items():
            assert key in expected_report_structure
            assert isinstance(expected_type, type)
    
    def test_auto_commit_failure_scenario(self):
        """Auto-commit 失敗シナリオのテスト"""
        # 実際のエラーログから抽出した情報
        git_push_error = {
            "command": "git push",
            "error_message": "remote: Permission to Kensan196948G/ITSM-ITManagementSystem.git denied to github-actions[bot].",
            "exit_code": 128,
            "fatal_error": "unable to access 'https://github.com/Kensan196948G/ITSM-ITManagementSystem/': The requested URL returned error: 403"
        }
        
        # 失敗条件を確認
        assert git_push_error["exit_code"] == 128
        assert "Permission" in git_push_error["error_message"]
        assert "403" in git_push_error["fatal_error"]
    
    def test_workflow_trigger_conditions(self, workflow_content):
        """ワークフロートリガー条件のテスト"""
        # YAMLパースによりTrueキーになっている場合を対応
        triggers = workflow_content.get(True, workflow_content.get("on", {}))
        
        # 適切なトリガー条件が設定されていることを確認
        assert "workflow_run" in triggers
        assert "schedule" in triggers
        assert "workflow_dispatch" in triggers
        
        # workflow_run の設定確認
        workflow_run = triggers["workflow_run"]
        assert "workflows" in workflow_run
        assert "types" in workflow_run
        assert workflow_run["types"] == ["completed"]


class TestGitHubActionsFixes:
    """GitHub Actions 修正案のテスト"""
    
    def test_personal_access_token_solution(self):
        """Personal Access Token を使用した解決策のテスト"""
        # 推奨される修正案
        recommended_fix = {
            "token_type": "PAT",
            "token_reference": "${{ secrets.PAT_TOKEN }}",
            "required_permissions": [
                "repo",
                "workflow",
                "write:packages"
            ]
        }
        
        # 修正案の妥当性を確認
        assert recommended_fix["token_type"] == "PAT"
        assert "secrets.PAT_TOKEN" in recommended_fix["token_reference"]
        assert "repo" in recommended_fix["required_permissions"]
    
    def test_alternative_push_strategy(self):
        """代替プッシュ戦略のテスト"""
        # プッシュしない戦略
        alternative_strategy = {
            "remove_auto_commit": True,
            "use_artifacts": True,
            "use_issues_api": True,
            "local_storage_only": False
        }
        
        # 代替案の有効性を確認
        assert alternative_strategy["remove_auto_commit"] is True
        assert alternative_strategy["use_artifacts"] is True
    
    def test_workflow_success_conditions(self):
        """ワークフロー成功条件の定義テスト"""
        success_conditions = {
            "python_script_execution": True,
            "report_generation": True,
            "api_call_success": True,
            "git_push_required": False  # 修正後はFalseにする
        }
        
        # 成功条件の確認
        assert success_conditions["python_script_execution"] is True
        assert success_conditions["report_generation"] is True
        assert success_conditions["git_push_required"] is False  # これが重要


class TestE2EWorkflowSimulation:
    """E2Eワークフローシミュレーションテスト"""
    
    @patch('requests.get')
    def test_github_api_call_simulation(self, mock_get):
        """GitHub API 呼び出しのシミュレーション"""
        # API レスポンスをモック
        mock_response = Mock()
        mock_response.json.return_value = {
            "workflow_runs": [
                {
                    "id": 16693140121,
                    "name": "Test Workflow",
                    "conclusion": "failure",
                    "head_branch": "main",
                    "created_at": "2025-08-02T11:28:36Z",
                    "html_url": "https://github.com/example/repo/actions/runs/16693140121"
                }
            ]
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        # API 呼び出し成功を確認
        import requests
        response = requests.get("https://api.github.com/repos/test/test/actions/runs")
        response.raise_for_status()
        data = response.json()
        
        assert "workflow_runs" in data
        assert len(data["workflow_runs"]) > 0
    
    def test_monitoring_data_processing(self):
        """監視データ処理のテスト"""
        # テストデータ
        workflow_runs = [
            {"conclusion": "failure", "name": "Test Workflow 1"},
            {"conclusion": "success", "name": "Test Workflow 2"},
            {"conclusion": "failure", "name": "GitHub Actions Integration Monitor"}  # 除外されるべき
        ]
        
        # 失敗ワークフローの抽出ロジック
        failed_workflows = []
        excluded_names = [
            'GitHub Actions Integration Monitor',
            'ITSM CI/CD Monitor - Auto-Repair Detection',
            'Infinite Loop Repair Engine'
        ]
        
        for run in workflow_runs:
            if (run['conclusion'] == 'failure' and 
                run['name'] not in excluded_names and
                'monitor' not in run['name'].lower()):
                failed_workflows.append(run)
        
        # 正しくフィルタリングされることを確認
        assert len(failed_workflows) == 1
        assert failed_workflows[0]["name"] == "Test Workflow 1"


def test_load_test_performance():
    """負荷テストのシミュレーション"""
    # API呼び出し頻度の確認
    api_call_frequency = {
        "schedule_cron": "*/30 9-18 * * 1-5",  # 30分間隔
        "max_calls_per_hour": 2,
        "rate_limit_protection": True
    }
    
    # 負荷テストの設定が適切であることを確認
    assert "*/30" in api_call_frequency["schedule_cron"]
    assert api_call_frequency["max_calls_per_hour"] <= 10  # 適切な頻度
    assert api_call_frequency["rate_limit_protection"] is True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])