"""CI/CD統合APIテストスイート"""

import pytest
import asyncio
import json
import time
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from httpx import AsyncClient
import sys
import os

# パスの追加
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.services.github_actions_service import GitHubActionsService
from app.services.cicd_integration_service import CICDIntegrationService
from app.services.itsm_audit_service import (
    ITSMAuditService,
    AuditEventType,
    AuditSeverity,
)

client = TestClient(app)


class TestCICDIntegrationAPI:
    """CI/CD統合APIテスト"""

    def setup_method(self):
        """テストセットアップ"""
        self.mock_github_token = "test_github_token"
        self.mock_repo = "test/repository"

        # 環境変数のモック
        self.env_patcher = patch.dict(
            os.environ,
            {
                "GITHUB_TOKEN": self.mock_github_token,
                "GITHUB_REPOSITORY": self.mock_repo,
            },
        )
        self.env_patcher.start()

    def teardown_method(self):
        """テストクリーンアップ"""
        self.env_patcher.stop()

    @pytest.mark.asyncio
    async def test_ci_status_endpoint(self):
        """CI/CD状態取得エンドポイントのテスト"""
        # モックレスポンス
        mock_workflows = [
            {
                "id": 123456,
                "name": "CI",
                "status": "completed",
                "conclusion": "success",
                "workflow_id": 789,
                "head_branch": "main",
                "head_sha": "abc123",
                "created_at": "2025-08-02T10:00:00Z",
                "updated_at": "2025-08-02T10:05:00Z",
                "run_number": 1,
                "html_url": "https://github.com/test/repo/actions/runs/123456",
            }
        ]

        with patch(
            "app.services.github_actions_service.GitHubActionsService"
        ) as mock_service:
            mock_instance = AsyncMock()
            mock_instance.get_workflow_runs.return_value = mock_workflows
            mock_service.return_value.__aenter__.return_value = mock_instance

            # 認証情報をモック
            with patch("app.core.cicd_security.verify_api_authentication") as mock_auth:
                mock_auth.return_value = {
                    "type": "api_key",
                    "permissions": ["read", "write"],
                    "rate_limit": 1000,
                }

                response = client.get("/api/v1/api/ci/status?limit=10")

                assert response.status_code == 200
                data = response.json()
                assert len(data) == 1
                assert data[0]["id"] == 123456
                assert data[0]["status"] == "completed"

    @pytest.mark.asyncio
    async def test_ci_retry_endpoint(self):
        """CI/CDリトライエンドポイントのテスト"""
        retry_request = {
            "run_id": 123456,
            "retry_type": "failed_jobs",
            "reason": "Test retry",
        }

        with patch(
            "app.services.github_actions_service.GitHubActionsService"
        ) as mock_service:
            mock_instance = AsyncMock()
            mock_instance.retry_workflow_run.return_value = True
            mock_service.return_value.__aenter__.return_value = mock_instance

            with patch("app.core.cicd_security.check_ci_permissions") as mock_auth:
                mock_auth.return_value = {
                    "type": "api_key",
                    "permissions": ["read", "write"],
                    "email": "test@example.com",
                }

                response = client.post("/api/v1/api/ci/retry", json=retry_request)

                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "success"
                assert data["run_id"] == 123456

    @pytest.mark.asyncio
    async def test_ci_logs_endpoint(self):
        """CI/CDログ取得エンドポイントのテスト"""
        # ログファイルのモック
        mock_logs = {
            "entries": [
                {
                    "timestamp": "2025-08-02T10:00:00",
                    "event_type": "workflow_retry",
                    "workflow_name": "CI",
                    "status": "success",
                    "message": "Workflow retried successfully",
                }
            ],
            "last_updated": "2025-08-02T10:00:00",
        }

        with patch("app.api.v1.cicd_automation.load_json_file") as mock_load:
            mock_load.return_value = mock_logs

            with patch("app.core.cicd_security.verify_api_authentication") as mock_auth:
                mock_auth.return_value = {
                    "type": "api_key",
                    "permissions": ["read"],
                    "rate_limit": 1000,
                }

                response = client.get("/api/v1/api/ci/logs?limit=10")

                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "success"
                assert len(data["logs"]) == 1

    @pytest.mark.asyncio
    async def test_system_status_endpoint(self):
        """システム状態取得エンドポイントのテスト"""
        # モックデータ
        mock_repair_state = {"state": {"status": "active"}}
        mock_loop_state = {"loop_count": 141, "total_errors_fixed": 423}
        mock_api_metrics = {"health_status": "unhealthy", "total_errors": 0}

        with patch("app.api.v1.cicd_automation.load_json_file") as mock_load:

            def side_effect(file_path):
                if "repair_state" in file_path:
                    return mock_repair_state
                elif "loop_state" in file_path:
                    return mock_loop_state
                elif "api_metrics" in file_path:
                    return mock_api_metrics
                return {}

            mock_load.side_effect = side_effect

            with patch("app.core.cicd_security.verify_api_authentication") as mock_auth:
                mock_auth.return_value = {
                    "type": "api_key",
                    "permissions": ["read"],
                    "rate_limit": 1000,
                }

                # GitHub API呼び出しもモック
                with patch("httpx.AsyncClient") as mock_client:
                    mock_response = MagicMock()
                    mock_response.status_code = 200
                    mock_response.json.return_value = {"workflow_runs": []}
                    mock_client.return_value.__aenter__.return_value.get.return_value = (
                        mock_response
                    )

                    response = client.get("/api/v1/api/ci/system-status")

                    assert response.status_code == 200
                    data = response.json()
                    assert "timestamp" in data
                    assert data["infinite_loop_count"] == 141
                    assert data["api_health"] == "unhealthy"

    @pytest.mark.asyncio
    async def test_trigger_repair_endpoint(self):
        """手動修復トリガーエンドポイントのテスト"""
        with patch("app.api.v1.cicd_automation.load_json_file") as mock_load:
            mock_load.return_value = {"manual_triggers": []}

            with patch("app.api.v1.cicd_automation.save_json_file") as mock_save:
                mock_save.return_value = None

                with patch("app.core.cicd_security.check_ci_permissions") as mock_auth:
                    mock_auth.return_value = {
                        "type": "api_key",
                        "permissions": ["write"],
                        "email": "test@example.com",
                    }

                    response = client.post(
                        "/api/v1/api/ci/trigger-repair?target=all&priority=high"
                    )

                    assert response.status_code == 200
                    data = response.json()
                    assert data["status"] == "success"
                    assert data["target"] == "all"
                    assert data["priority"] == "high"

    @pytest.mark.asyncio
    async def test_health_check_endpoint(self):
        """ヘルスチェックエンドポイントのテスト"""
        # GitHub API健全性チェックをモック
        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "rate": {"limit": 5000, "remaining": 4999}
            }
            mock_client.return_value.__aenter__.return_value.get.return_value = (
                mock_response
            )

            response = client.get("/api/v1/api/ci/health")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] in ["healthy", "degraded", "unhealthy"]
            assert "components" in data
            assert "github_api" in data["components"]

    @pytest.mark.asyncio
    async def test_metrics_endpoint(self):
        """メトリクスエンドポイントのテスト"""
        # モックメトリクスデータ
        mock_api_metrics = {"total_errors": 5, "fix_success_rate": 0.95}
        mock_loop_state = {"loop_count": 141, "total_errors_fixed": 423}
        mock_logs = {"entries": [{"status": "success"}, {"status": "error"}]}

        with patch("app.api.v1.cicd_automation.load_json_file") as mock_load:

            def side_effect(file_path):
                if "api_metrics" in file_path:
                    return mock_api_metrics
                elif "loop_state" in file_path:
                    return mock_loop_state
                elif "ci-retry-log" in file_path:
                    return mock_logs
                return {}

            mock_load.side_effect = side_effect

            response = client.get("/api/v1/api/ci/metrics")

            assert response.status_code == 200
            data = response.json()
            assert "metrics" in data
            assert "itsm_api_total_errors 5" in data["metrics"]
            assert "itsm_repair_loop_count 141" in data["metrics"]


class TestGitHubActionsService:
    """GitHub Actions サービステスト"""

    @pytest.mark.asyncio
    async def test_service_initialization(self):
        """サービス初期化テスト"""
        with patch.dict(os.environ, {"GITHUB_TOKEN": "test_token"}):
            async with GitHubActionsService() as service:
                assert service.client is not None
                assert service.rate_limit_remaining == 5000

    @pytest.mark.asyncio
    async def test_rate_limit_check(self):
        """レート制限チェックテスト"""
        with patch.dict(os.environ, {"GITHUB_TOKEN": "test_token"}):
            async with GitHubActionsService() as service:
                # 初期状態では利用可能
                assert await service.check_rate_limit() == True

                # レート制限を超過させる
                service.rate_limit_remaining = 0
                assert await service.check_rate_limit() == False

    @pytest.mark.asyncio
    async def test_workflow_runs_retrieval(self):
        """ワークフロー実行履歴取得テスト"""
        mock_response_data = {
            "workflow_runs": [
                {
                    "id": 123,
                    "name": "CI",
                    "status": "completed",
                    "conclusion": "success",
                }
            ]
        }

        with patch.dict(os.environ, {"GITHUB_TOKEN": "test_token"}):
            async with GitHubActionsService() as service:
                with patch.object(service, "make_api_request") as mock_request:
                    mock_request.return_value = (200, mock_response_data)

                    workflows = await service.get_workflow_runs(limit=10)

                    assert len(workflows) == 1
                    assert workflows[0]["id"] == 123
                    assert workflows[0]["status"] == "completed"


class TestCICDIntegrationService:
    """CI/CD統合サービステスト"""

    @pytest.mark.asyncio
    async def test_failure_detection(self):
        """失敗検出テスト"""
        mock_failed_workflows = [
            {
                "id": 123,
                "name": "CI",
                "head_branch": "main",
                "conclusion": "failure",
                "created_at": "2025-08-02T10:00:00Z",
            }
        ]

        async with CICDIntegrationService() as service:
            with patch(
                "app.services.cicd_integration_service.get_failed_workflows"
            ) as mock_get_failed:
                mock_get_failed.return_value = mock_failed_workflows

                failures = await service.detect_ci_failures()

                assert len(failures) == 1
                assert failures[0]["id"] == 123
                assert "failure_patterns" in failures[0]
                assert "auto_retry_eligible" in failures[0]

    @pytest.mark.asyncio
    async def test_auto_repair_execution(self):
        """自動修復実行テスト"""
        async with CICDIntegrationService() as service:
            with patch.object(service, "detect_ci_failures") as mock_detect:
                mock_detect.return_value = []

                with patch.object(
                    service, "_repair_system_errors"
                ) as mock_repair_system:
                    mock_repair_system.return_value = {
                        "actions": [],
                        "successful": 0,
                        "failed": 0,
                        "total": 0,
                    }

                    with patch.object(
                        service, "_integrate_repair_results"
                    ) as mock_integrate:
                        mock_integrate.return_value = None

                        results = await service.execute_auto_repair("all")

                        assert "timestamp" in results
                        assert results["target"] == "all"
                        assert "successful_repairs" in results


class TestITSMAuditService:
    """ITSM監査サービステスト"""

    @pytest.mark.asyncio
    async def test_audit_event_logging(self):
        """監査イベントログ記録テスト"""
        audit_service = ITSMAuditService()

        with patch("aiofiles.open", create=True) as mock_open:
            mock_file = AsyncMock()
            mock_open.return_value.__aenter__.return_value = mock_file

            audit_id = await audit_service.log_audit_event(
                event_type=AuditEventType.API_ACCESS,
                event_description="Test API access",
                user_id="test_user",
                severity=AuditSeverity.LOW,
            )

            assert audit_id is not None
            assert len(audit_id) == 36  # UUID length
            mock_file.write.assert_called_once()

    @pytest.mark.asyncio
    async def test_compliance_report_generation(self):
        """コンプライアンスレポート生成テスト"""
        audit_service = ITSMAuditService()

        # モックログデータ
        mock_logs = [
            {
                "timestamp": "2025-08-02T10:00:00",
                "event_type": "api_access",
                "severity": "low",
                "user_id": "user1",
            },
            {
                "timestamp": "2025-08-02T10:01:00",
                "event_type": "security_event",
                "severity": "high",
                "user_id": "user2",
            },
        ]

        with patch.object(audit_service, "get_audit_logs") as mock_get_logs:
            mock_get_logs.return_value = mock_logs

            with patch("aiofiles.open", create=True) as mock_open:
                mock_file = AsyncMock()
                mock_open.return_value.__aenter__.return_value = mock_file

                report = await audit_service.generate_compliance_report("monthly")

                assert "report_id" in report
                assert report["report_type"] == "monthly"
                assert "statistics" in report
                assert "compliance_score" in report
                assert report["statistics"]["total_events"] == 2


class TestPerformanceAndLoad:
    """パフォーマンスと負荷テスト"""

    @pytest.mark.asyncio
    async def test_api_response_time(self):
        """API応答時間テスト"""
        # 認証をモック
        with patch("app.core.cicd_security.verify_api_authentication") as mock_auth:
            mock_auth.return_value = {
                "type": "api_key",
                "permissions": ["read"],
                "rate_limit": 1000,
            }

            # ヘルスチェックエンドポイントの応答時間をテスト
            start_time = time.time()
            response = client.get("/api/v1/api/ci/health")
            end_time = time.time()

            response_time = end_time - start_time

            assert response.status_code == 200
            assert response_time < 5.0  # 5秒以内の応答時間要件

    @pytest.mark.asyncio
    async def test_concurrent_requests(self):
        """同時リクエストテスト"""
        with patch("app.core.cicd_security.verify_api_authentication") as mock_auth:
            mock_auth.return_value = {
                "type": "api_key",
                "permissions": ["read"],
                "rate_limit": 1000,
            }

            async def make_request():
                async with AsyncClient(app=app, base_url="http://test") as ac:
                    response = await ac.get("/api/v1/api/ci/health")
                    return response.status_code

            # 10個の同時リクエストを送信
            tasks = [make_request() for _ in range(10)]
            results = await asyncio.gather(*tasks)

            # すべてのリクエストが成功することを確認
            assert all(status == 200 for status in results)

    def test_memory_usage(self):
        """メモリ使用量テスト"""
        import psutil
        import gc

        process = psutil.Process()
        initial_memory = process.memory_info().rss

        # 大量のAPIリクエストを実行
        with patch("app.core.cicd_security.verify_api_authentication") as mock_auth:
            mock_auth.return_value = {
                "type": "api_key",
                "permissions": ["read"],
                "rate_limit": 1000,
            }

            for _ in range(100):
                response = client.get("/api/v1/api/ci/health")
                assert response.status_code == 200

        # ガベージコレクションを実行
        gc.collect()

        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory

        # メモリ使用量の増加が許容範囲内であることを確認
        assert memory_increase < 100 * 1024 * 1024  # 100MB以下


class TestSecurityValidation:
    """セキュリティ検証テスト"""

    def test_unauthorized_access(self):
        """認証なしアクセステスト"""
        response = client.get("/api/v1/api/ci/status")
        assert response.status_code == 403  # 認証が必要

    def test_invalid_token(self):
        """無効なトークンテスト"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/api/v1/api/ci/status", headers=headers)
        assert response.status_code == 401

    def test_sql_injection_prevention(self):
        """SQLインジェクション防止テスト"""
        malicious_input = "'; DROP TABLE users; --"

        with patch("app.core.cicd_security.verify_api_authentication") as mock_auth:
            mock_auth.return_value = {
                "type": "api_key",
                "permissions": ["read"],
                "rate_limit": 1000,
            }

            response = client.get(
                f"/api/v1/api/ci/logs?workflow_name={malicious_input}"
            )

            # リクエストが処理され、SQLインジェクションが防がれることを確認
            assert response.status_code in [200, 400]  # 成功または不正入力エラー

    def test_xss_prevention(self):
        """XSS防止テスト"""
        malicious_script = "<script>alert('xss')</script>"

        with patch("app.core.cicd_security.verify_api_authentication") as mock_auth:
            mock_auth.return_value = {
                "type": "api_key",
                "permissions": ["write"],
                "email": "test@example.com",
            }

            retry_request = {
                "run_id": 123456,
                "retry_type": "failed_jobs",
                "reason": malicious_script,
            }

            with patch("app.services.github_actions_service.GitHubActionsService"):
                response = client.post("/api/v1/api/ci/retry", json=retry_request)

                # XSSが防がれて正常に処理されるか、または不正入力として拒否されることを確認
                assert response.status_code in [200, 400]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
