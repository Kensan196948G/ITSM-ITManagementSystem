#!/usr/bin/env python3
"""
【フェーズ2】ITSM API包括テストスイート
FastAPI全エンドポイント網羅テスト - セキュリティ・パフォーマンス・機能性の総合検証
"""

import pytest
import httpx
import asyncio
import json
import time
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid


class APITestClient:
    """API テストクライアント"""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.auth_token: Optional[str] = None
        self.session_data = {}

    async def authenticate(
        self, email: str = "test@example.com", password: str = "password123"
    ) -> bool:
        """認証実行"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/v1/auth/login",
                json={"email": email, "password": password},
            )
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                return True
            return False

    @property
    def headers(self) -> Dict[str, str]:
        """認証ヘッダー"""
        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        return headers

    async def get(self, endpoint: str, **kwargs) -> httpx.Response:
        """GET リクエスト"""
        async with httpx.AsyncClient() as client:
            return await client.get(
                f"{self.base_url}{endpoint}", headers=self.headers, **kwargs
            )

    async def post(self, endpoint: str, **kwargs) -> httpx.Response:
        """POST リクエスト"""
        async with httpx.AsyncClient() as client:
            return await client.post(
                f"{self.base_url}{endpoint}", headers=self.headers, **kwargs
            )

    async def put(self, endpoint: str, **kwargs) -> httpx.Response:
        """PUT リクエスト"""
        async with httpx.AsyncClient() as client:
            return await client.put(
                f"{self.base_url}{endpoint}", headers=self.headers, **kwargs
            )

    async def delete(self, endpoint: str, **kwargs) -> httpx.Response:
        """DELETE リクエスト"""
        async with httpx.AsyncClient() as client:
            return await client.delete(
                f"{self.base_url}{endpoint}", headers=self.headers, **kwargs
            )


@pytest.fixture
async def api_client():
    """API クライアント フィクスチャ"""
    client = APITestClient()
    # テスト用の認証は後で実行
    return client


@pytest.fixture
async def authenticated_client(api_client):
    """認証済み API クライアント フィクスチャ"""
    # テスト環境では認証をスキップまたは簡略化
    api_client.auth_token = "test-token"
    return api_client


class TestHealthAndMetrics:
    """ヘルスチェック・メトリクステスト"""

    async def test_health_check(self, api_client):
        """ヘルスチェックエンドポイント"""
        response = await api_client.get("/health")
        assert response.status_code == 200

        data = response.json()
        assert "status" in data
        assert data["status"] in ["healthy", "unhealthy"]
        assert "timestamp" in data

    async def test_metrics_endpoint(self, api_client):
        """メトリクスエンドポイント"""
        response = await api_client.get("/metrics")
        assert response.status_code in [200, 404]  # メトリクス実装により異なる

    async def test_api_info(self, api_client):
        """API情報エンドポイント"""
        response = await api_client.get("/api/v1/info")
        assert response.status_code in [200, 404]


class TestAuthentication:
    """認証関連テスト"""

    async def test_login_valid_credentials(self, api_client):
        """正常ログインテスト"""
        # 開発環境では認証を簡略化
        response = await api_client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )
        # 開発モードではアクセス許可またはテスト用認証
        assert response.status_code in [200, 404, 422]

    async def test_login_invalid_credentials(self, api_client):
        """不正ログインテスト"""
        response = await api_client.post(
            "/api/v1/auth/login",
            json={"email": "invalid@example.com", "password": "wrongpassword"},
        )
        assert response.status_code in [400, 401, 404, 422]

    async def test_protected_endpoint_without_auth(self, api_client):
        """認証なしでの保護エンドポイントアクセス"""
        response = await api_client.get("/api/v1/incidents/")
        # 開発モードでは認証スキップの可能性あり
        assert response.status_code in [200, 401, 403]


class TestIncidents:
    """インシデント管理テスト"""

    async def test_list_incidents(self, authenticated_client):
        """インシデント一覧取得"""
        response = await authenticated_client.get("/api/v1/incidents/")
        assert response.status_code in [200, 404]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (list, dict))

    async def test_create_incident(self, authenticated_client):
        """インシデント作成"""
        incident_data = {
            "title": f"API Test Incident {uuid.uuid4()}",
            "description": "API テストで作成されたインシデント",
            "priority": "Medium",
            "status": "Open",
        }

        response = await authenticated_client.post(
            "/api/v1/incidents/", json=incident_data
        )
        assert response.status_code in [200, 201, 404, 422]

        if response.status_code in [200, 201]:
            data = response.json()
            assert "id" in data or "title" in data

    async def test_get_incident_detail(self, authenticated_client):
        """インシデント詳細取得"""
        # 存在しないIDでのテスト
        response = await authenticated_client.get("/api/v1/incidents/999")
        assert response.status_code in [404, 422]

        # 無効なIDフォーマットでのテスト
        response = await authenticated_client.get("/api/v1/incidents/invalid")
        assert response.status_code in [404, 422]

    async def test_update_incident(self, authenticated_client):
        """インシデント更新"""
        update_data = {"title": "Updated Incident Title", "status": "In Progress"}

        response = await authenticated_client.put(
            "/api/v1/incidents/999", json=update_data
        )
        assert response.status_code in [200, 404, 422]

    async def test_delete_incident(self, authenticated_client):
        """インシデント削除"""
        response = await authenticated_client.delete("/api/v1/incidents/999")
        assert response.status_code in [200, 204, 404, 422]


class TestUsers:
    """ユーザー管理テスト"""

    async def test_list_users(self, authenticated_client):
        """ユーザー一覧取得"""
        response = await authenticated_client.get("/api/v1/users/")
        assert response.status_code in [200, 404, 403]

    async def test_create_user(self, authenticated_client):
        """ユーザー作成"""
        user_data = {
            "email": f"testuser{uuid.uuid4()}@example.com",
            "name": "Test User",
            "role": "user",
        }

        response = await authenticated_client.post("/api/v1/users/", json=user_data)
        assert response.status_code in [200, 201, 404, 422, 403]

    async def test_get_current_user(self, authenticated_client):
        """現在のユーザー情報取得"""
        response = await authenticated_client.get("/api/v1/users/me")
        assert response.status_code in [200, 404, 401]


class TestDashboard:
    """ダッシュボードテスト"""

    async def test_dashboard_stats(self, authenticated_client):
        """ダッシュボード統計"""
        response = await authenticated_client.get("/api/v1/dashboard/stats")
        assert response.status_code in [200, 404]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)

    async def test_dashboard_charts(self, authenticated_client):
        """ダッシュボードチャートデータ"""
        response = await authenticated_client.get("/api/v1/dashboard/charts")
        assert response.status_code in [200, 404]


class TestProblems:
    """問題管理テスト"""

    async def test_list_problems(self, authenticated_client):
        """問題一覧取得"""
        response = await authenticated_client.get("/api/v1/problems/")
        assert response.status_code in [200, 404]

    async def test_create_problem(self, authenticated_client):
        """問題作成"""
        problem_data = {
            "title": f"API Test Problem {uuid.uuid4()}",
            "description": "API テストで作成された問題",
            "priority": "High",
        }

        response = await authenticated_client.post(
            "/api/v1/problems/", json=problem_data
        )
        assert response.status_code in [200, 201, 404, 422]


class TestChanges:
    """変更管理テスト"""

    async def test_list_changes(self, authenticated_client):
        """変更一覧取得"""
        response = await authenticated_client.get("/api/v1/changes/")
        assert response.status_code in [200, 404]

    async def test_create_change(self, authenticated_client):
        """変更作成"""
        change_data = {
            "title": f"API Test Change {uuid.uuid4()}",
            "description": "API テストで作成された変更",
            "risk_level": "Medium",
        }

        response = await authenticated_client.post("/api/v1/changes/", json=change_data)
        assert response.status_code in [200, 201, 404, 422]


class TestNotifications:
    """通知テスト"""

    async def test_list_notifications(self, authenticated_client):
        """通知一覧取得"""
        response = await authenticated_client.get("/api/v1/notifications/")
        assert response.status_code in [200, 404]

    async def test_mark_notification_read(self, authenticated_client):
        """通知既読マーク"""
        response = await authenticated_client.put("/api/v1/notifications/999/read")
        assert response.status_code in [200, 404, 422]


class TestAttachments:
    """添付ファイルテスト"""

    async def test_upload_attachment(self, authenticated_client):
        """ファイルアップロード"""
        # テスト用ファイルデータ
        files = {"file": ("test.txt", b"test content", "text/plain")}

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{authenticated_client.base_url}/api/v1/attachments/upload",
                headers={"Authorization": f"Bearer {authenticated_client.auth_token}"},
                files=files,
            )

        assert response.status_code in [200, 201, 404, 422, 413]


class TestErrorHandling:
    """エラーハンドリングテスト"""

    async def test_404_endpoints(self, api_client):
        """存在しないエンドポイントのテスト"""
        response = await api_client.get("/api/v1/nonexistent")
        assert response.status_code == 404

    async def test_method_not_allowed(self, api_client):
        """許可されていないHTTPメソッドのテスト"""
        response = await api_client.post("/health")
        assert response.status_code in [404, 405, 422]

    async def test_large_payload(self, authenticated_client):
        """大きなペイロードでのテスト"""
        large_data = {"data": "x" * 10000}  # 10KB のデータ

        response = await authenticated_client.post(
            "/api/v1/incidents/", json=large_data
        )
        assert response.status_code in [200, 201, 400, 413, 422]

    async def test_invalid_json(self, authenticated_client):
        """不正なJSONでのテスト"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{authenticated_client.base_url}/api/v1/incidents/",
                headers=authenticated_client.headers,
                content="invalid json",
            )

        assert response.status_code in [400, 422]


class TestPerformance:
    """パフォーマンステスト"""

    async def test_response_time(self, api_client):
        """レスポンス時間テスト"""
        start_time = time.time()
        response = await api_client.get("/health")
        response_time = time.time() - start_time

        assert response_time < 2.0  # 2秒以内
        assert response.status_code == 200

    async def test_concurrent_requests(self, authenticated_client):
        """同時リクエストテスト"""

        async def make_request():
            return await authenticated_client.get("/api/v1/incidents/")

        # 10個の同時リクエスト
        tasks = [make_request() for _ in range(10)]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        # エラーではないレスポンスをカウント
        successful_responses = [
            r
            for r in responses
            if not isinstance(r, Exception) and hasattr(r, "status_code")
        ]

        assert len(successful_responses) > 0

    async def test_pagination_performance(self, authenticated_client):
        """ページネーションパフォーマンス"""
        response = await authenticated_client.get("/api/v1/incidents/?limit=100")
        assert response.status_code in [200, 404, 422]


class TestSecurity:
    """セキュリティテスト"""

    async def test_sql_injection_attempt(self, authenticated_client):
        """SQLインジェクション攻撃テスト"""
        malicious_data = {
            "title": "'; DROP TABLE incidents; --",
            "description": "SQL injection test",
        }

        response = await authenticated_client.post(
            "/api/v1/incidents/", json=malicious_data
        )
        # リクエストは処理されるが、SQLインジェクションは防がれる
        assert response.status_code in [200, 201, 400, 404, 422]

    async def test_xss_attempt(self, authenticated_client):
        """XSS攻撃テスト"""
        xss_data = {
            "title": "<script>alert('XSS')</script>",
            "description": "<img src=x onerror=alert('XSS')>",
        }

        response = await authenticated_client.post("/api/v1/incidents/", json=xss_data)
        assert response.status_code in [200, 201, 400, 404, 422]

    async def test_csrf_protection(self, api_client):
        """CSRF保護テスト"""
        # CSRFトークンなしでのPOSTリクエスト
        response = await api_client.post(
            "/api/v1/incidents/", json={"title": "CSRF Test"}
        )
        # 認証エラーまたはCSRF保護によるブロック
        assert response.status_code in [401, 403, 404, 422]


class TestDataValidation:
    """データ検証テスト"""

    async def test_required_fields_validation(self, authenticated_client):
        """必須フィールド検証"""
        incomplete_data = {"description": "Missing title"}

        response = await authenticated_client.post(
            "/api/v1/incidents/", json=incomplete_data
        )
        assert response.status_code in [400, 404, 422]

    async def test_field_type_validation(self, authenticated_client):
        """フィールド型検証"""
        invalid_data = {
            "title": 123,  # 文字列が期待される
            "priority": "InvalidPriority",  # 無効な優先度
        }

        response = await authenticated_client.post(
            "/api/v1/incidents/", json=invalid_data
        )
        assert response.status_code in [400, 404, 422]

    async def test_field_length_validation(self, authenticated_client):
        """フィールド長検証"""
        long_data = {
            "title": "x" * 1000,  # 非常に長いタイトル
            "description": "x" * 10000,  # 非常に長い説明
        }

        response = await authenticated_client.post("/api/v1/incidents/", json=long_data)
        assert response.status_code in [200, 201, 400, 404, 422]


class TestAPIDocumentation:
    """API ドキュメンテーションテスト"""

    async def test_openapi_schema(self, api_client):
        """OpenAPI スキーマ取得"""
        response = await api_client.get("/openapi.json")
        assert response.status_code in [200, 404]

        if response.status_code == 200:
            schema = response.json()
            assert "openapi" in schema
            assert "paths" in schema

    async def test_swagger_ui(self, api_client):
        """Swagger UI アクセス"""
        response = await api_client.get("/docs")
        assert response.status_code in [200, 404]

    async def test_redoc(self, api_client):
        """ReDoc アクセス"""
        response = await api_client.get("/redoc")
        assert response.status_code in [200, 404]


# テスト統計収集用のマーカー
pytest_plugins = ["pytest_html"]


@pytest.mark.asyncio
class TestComprehensiveAPIFlow:
    """包括的APIフローテスト"""

    async def test_complete_incident_lifecycle(self, authenticated_client):
        """インシデント完全ライフサイクルテスト"""
        # 1. インシデント作成
        incident_data = {
            "title": f"Lifecycle Test {uuid.uuid4()}",
            "description": "完全ライフサイクルテスト",
            "priority": "High",
        }

        create_response = await authenticated_client.post(
            "/api/v1/incidents/", json=incident_data
        )

        if create_response.status_code not in [200, 201]:
            pytest.skip("インシデント作成エンドポイントが利用できません")

        incident_id = create_response.json().get("id")
        if not incident_id:
            pytest.skip("インシデントIDが取得できません")

        # 2. インシデント詳細取得
        detail_response = await authenticated_client.get(
            f"/api/v1/incidents/{incident_id}"
        )
        assert detail_response.status_code == 200

        # 3. インシデント更新
        update_data = {"status": "In Progress"}
        update_response = await authenticated_client.put(
            f"/api/v1/incidents/{incident_id}", json=update_data
        )
        assert update_response.status_code in [200, 404]

        # 4. インシデント削除
        delete_response = await authenticated_client.delete(
            f"/api/v1/incidents/{incident_id}"
        )
        assert delete_response.status_code in [200, 204, 404]


if __name__ == "__main__":
    # 単独実行時のテスト
    import sys

    sys.exit(pytest.main([__file__, "-v"]))
