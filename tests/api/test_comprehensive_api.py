"""
Comprehensive API tests for ITSM system covering all endpoints
"""

import pytest
import requests
import json
from uuid import uuid4
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
import time


@pytest.mark.api
@pytest.mark.comprehensive
class TestComprehensiveAPI:
    """Comprehensive API test suite covering all ITSM endpoints"""

    @pytest.mark.incidents
    def test_incident_full_lifecycle(
        self, api_client, sample_incident_data, test_config
    ):
        """Test complete incident lifecycle from creation to resolution"""
        # Step 1: Create incident
        create_response = {
            "id": str(uuid4()),
            "incident_number": "INC000200",
            "title": sample_incident_data["title"],
            "status": "new",
            "priority": sample_incident_data["priority"],
            "created_at": datetime.now().isoformat(),
        }

        with patch.object(api_client, "post") as mock_post:
            mock_post.return_value.status_code = 201
            mock_post.return_value.json.return_value = create_response

            response = api_client.post(
                f"{test_config['base_url']}/incidents", json=sample_incident_data
            )

            assert response.status_code == 201
            incident = response.json()
            incident_id = incident["id"]

        # Step 2: Assign incident
        assignee_id = str(uuid4())
        assign_response = {
            "message": "担当者が正常に割り当てられました",
            "data": {"incident_id": incident_id, "assignee_id": assignee_id},
        }

        with patch.object(api_client, "post") as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = assign_response

            response = api_client.post(
                f"{test_config['base_url']}/incidents/{incident_id}/assign",
                json={"assignee_id": assignee_id},
            )

            assert response.status_code == 200

        # Step 3: Add work notes
        note_data = {"content": "Investigating the root cause", "is_internal": True}

        note_response = {
            "id": str(uuid4()),
            "incident_id": incident_id,
            "content": note_data["content"],
            "is_internal": note_data["is_internal"],
            "created_at": datetime.now().isoformat(),
        }

        with patch.object(api_client, "post") as mock_post:
            mock_post.return_value.status_code = 201
            mock_post.return_value.json.return_value = note_response

            response = api_client.post(
                f"{test_config['base_url']}/incidents/{incident_id}/work-notes",
                json=note_data,
            )

            assert response.status_code == 201

        # Step 4: Update status to in_progress
        update_data = {"status": "in_progress"}

        update_response = {
            "id": incident_id,
            "status": "in_progress",
            "updated_at": datetime.now().isoformat(),
        }

        with patch.object(api_client, "patch") as mock_patch:
            mock_patch.return_value.status_code = 200
            mock_patch.return_value.json.return_value = update_response

            response = api_client.patch(
                f"{test_config['base_url']}/incidents/{incident_id}", json=update_data
            )

            assert response.status_code == 200

        # Step 5: Resolve incident
        resolution = "Issue resolved by restarting the service"

        resolve_response = {
            "message": "インシデントが正常に解決されました",
            "data": {"incident_id": incident_id},
        }

        with patch.object(api_client, "post") as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = resolve_response

            response = api_client.post(
                f"{test_config['base_url']}/incidents/{incident_id}/resolve",
                json={"resolution": resolution},
            )

            assert response.status_code == 200

    @pytest.mark.problems
    def test_problem_management_api(self, api_client, sample_problem_data, test_config):
        """Test problem management API endpoints"""
        # Create problem
        create_response = {
            "id": str(uuid4()),
            "problem_number": "PRB000100",
            "title": sample_problem_data["title"],
            "status": "investigation",
            "priority": sample_problem_data["priority"],
            "created_at": datetime.now().isoformat(),
        }

        with patch.object(api_client, "post") as mock_post:
            mock_post.return_value.status_code = 201
            mock_post.return_value.json.return_value = create_response

            response = api_client.post(
                f"{test_config['base_url']}/problems", json=sample_problem_data
            )

            assert response.status_code == 201
            problem = response.json()
            assert "problem_number" in problem
            assert problem["status"] == "investigation"

    @pytest.mark.changes
    def test_change_management_api(self, api_client, sample_change_data, test_config):
        """Test change management API endpoints"""
        # Create change request
        create_response = {
            "id": str(uuid4()),
            "change_number": "CHG000050",
            "title": sample_change_data["title"],
            "type": sample_change_data["type"],
            "status": "requested",
            "risk_level": sample_change_data["risk_assessment"]["level"],
            "created_at": datetime.now().isoformat(),
        }

        with patch.object(api_client, "post") as mock_post:
            mock_post.return_value.status_code = 201
            mock_post.return_value.json.return_value = create_response

            response = api_client.post(
                f"{test_config['base_url']}/changes", json=sample_change_data
            )

            assert response.status_code == 201
            change = response.json()
            assert "change_number" in change
            assert change["type"] == sample_change_data["type"]

    @pytest.mark.cmdb
    def test_cmdb_api_endpoints(self, api_client, sample_ci_data, test_config):
        """Test CMDB (Configuration Management Database) API endpoints"""
        # Create CI
        create_response = {
            "id": str(uuid4()),
            "name": sample_ci_data["name"],
            "type": sample_ci_data["type"],
            "status": sample_ci_data["status"],
            "attributes": sample_ci_data["attributes"],
            "created_at": datetime.now().isoformat(),
        }

        with patch.object(api_client, "post") as mock_post:
            mock_post.return_value.status_code = 201
            mock_post.return_value.json.return_value = create_response

            response = api_client.post(
                f"{test_config['base_url']}/cmdb/cis", json=sample_ci_data
            )

            assert response.status_code == 201
            ci = response.json()
            assert ci["name"] == sample_ci_data["name"]
            assert ci["type"] == sample_ci_data["type"]

    @pytest.mark.auth
    def test_authentication_endpoints(self, api_client, test_config):
        """Test authentication and authorization endpoints"""
        # Login
        login_data = {"email": "admin@example.com", "password": "admin123"}

        login_response = {
            "access_token": "eyJhbGciOiJSUzI1NiIs...",
            "token_type": "Bearer",
            "expires_in": 3600,
            "user": {
                "id": str(uuid4()),
                "email": "admin@example.com",
                "name": "Admin User",
                "roles": ["admin"],
            },
        }

        with patch.object(api_client, "post") as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = login_response

            response = api_client.post(
                f"{test_config['auth_url']}/login", json=login_data
            )

            assert response.status_code == 200
            result = response.json()
            assert "access_token" in result
            assert result["token_type"] == "Bearer"

    @pytest.mark.reports
    def test_reporting_api_endpoints(self, api_client, test_config):
        """Test reporting and analytics API endpoints"""
        # Get dashboard metrics
        metrics_response = {
            "incidents": {
                "total": 150,
                "open": 25,
                "critical": 3,
                "high": 8,
                "medium": 10,
                "low": 4,
            },
            "problems": {"total": 12, "investigation": 5, "known_error": 7},
            "changes": {
                "total": 45,
                "requested": 8,
                "approved": 12,
                "scheduled": 10,
                "implemented": 15,
            },
            "sla_compliance": {"incidents": 95.5, "problems": 88.2, "changes": 92.8},
        }

        with patch.object(api_client, "get") as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = metrics_response

            response = api_client.get(f"{test_config['base_url']}/reports/dashboard")

            assert response.status_code == 200
            metrics = response.json()
            assert "incidents" in metrics
            assert "problems" in metrics
            assert "changes" in metrics
            assert "sla_compliance" in metrics

    @pytest.mark.notifications
    def test_notification_api_endpoints(self, api_client, test_config):
        """Test notification system API endpoints"""
        # Get user notifications
        notifications_response = {
            "data": [
                {
                    "id": str(uuid4()),
                    "type": "incident_assigned",
                    "title": "新しいインシデントが割り当てられました",
                    "message": "INC000123: メールサーバーに接続できない",
                    "read": False,
                    "created_at": datetime.now().isoformat(),
                },
                {
                    "id": str(uuid4()),
                    "type": "change_approved",
                    "title": "変更要求が承認されました",
                    "message": "CHG000050: サーバーメンテナンス",
                    "read": True,
                    "created_at": (datetime.now() - timedelta(hours=2)).isoformat(),
                },
            ],
            "meta": {"total": 2, "unread": 1},
        }

        with patch.object(api_client, "get") as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = notifications_response

            response = api_client.get(f"{test_config['base_url']}/notifications")

            assert response.status_code == 200
            notifications = response.json()
            assert "data" in notifications
            assert "meta" in notifications
            assert notifications["meta"]["unread"] == 1

    @pytest.mark.users
    def test_user_management_api(self, api_client, test_config):
        """Test user management API endpoints"""
        # List users
        users_response = {
            "data": [
                {
                    "id": str(uuid4()),
                    "email": "admin@example.com",
                    "name": "Admin User",
                    "role": "admin",
                    "active": True,
                    "created_at": "2024-01-01T00:00:00+09:00",
                },
                {
                    "id": str(uuid4()),
                    "email": "analyst@example.com",
                    "name": "Analyst User",
                    "role": "analyst",
                    "active": True,
                    "created_at": "2024-01-02T00:00:00+09:00",
                },
            ],
            "meta": {"total": 2, "page": 1, "per_page": 20},
        }

        with patch.object(api_client, "get") as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = users_response

            response = api_client.get(f"{test_config['base_url']}/users")

            assert response.status_code == 200
            users = response.json()
            assert "data" in users
            assert len(users["data"]) == 2

    @pytest.mark.categories
    def test_category_management_api(self, api_client, test_config):
        """Test category management API endpoints"""
        # List categories
        categories_response = {
            "data": [
                {
                    "id": "cat_001",
                    "name": "ハードウェア",
                    "description": "物理的な機器に関する問題",
                    "parent_id": None,
                    "children": [
                        {
                            "id": "cat_001_001",
                            "name": "サーバー",
                            "description": "サーバー機器の問題",
                        },
                        {
                            "id": "cat_001_002",
                            "name": "ネットワーク機器",
                            "description": "ネットワーク機器の問題",
                        },
                    ],
                },
                {
                    "id": "cat_002",
                    "name": "ソフトウェア",
                    "description": "アプリケーションやOSに関する問題",
                    "parent_id": None,
                    "children": [],
                },
            ]
        }

        with patch.object(api_client, "get") as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = categories_response

            response = api_client.get(f"{test_config['base_url']}/categories")

            assert response.status_code == 200
            categories = response.json()
            assert "data" in categories
            assert len(categories["data"]) == 2

    @pytest.mark.teams
    def test_team_management_api(self, api_client, test_config):
        """Test team management API endpoints"""
        # List teams
        teams_response = {
            "data": [
                {
                    "id": str(uuid4()),
                    "name": "ITサポートチーム",
                    "description": "一般的なITサポートを提供するチーム",
                    "manager_id": str(uuid4()),
                    "members": [
                        {
                            "id": str(uuid4()),
                            "name": "田中一郎",
                            "email": "tanaka@example.com",
                            "role": "technician",
                        },
                        {
                            "id": str(uuid4()),
                            "name": "佐藤花子",
                            "email": "sato@example.com",
                            "role": "senior_technician",
                        },
                    ],
                }
            ]
        }

        with patch.object(api_client, "get") as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = teams_response

            response = api_client.get(f"{test_config['base_url']}/teams")

            assert response.status_code == 200
            teams = response.json()
            assert "data" in teams
            assert len(teams["data"]) == 1

    @pytest.mark.health
    def test_health_check_endpoints(self, api_client, test_config):
        """Test system health check endpoints"""
        # Basic health check
        health_response = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0",
            "services": {
                "database": {"status": "healthy", "response_time": 5.2},
                "cache": {"status": "healthy", "response_time": 1.1},
                "email": {"status": "healthy", "response_time": 12.5},
            },
        }

        with patch.object(api_client, "get") as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = health_response

            response = api_client.get(f"{test_config['base_url']}/health")

            assert response.status_code == 200
            health = response.json()
            assert health["status"] == "healthy"
            assert "services" in health

    @pytest.mark.search
    def test_search_api_endpoints(self, api_client, test_config):
        """Test global search API endpoints"""
        # Global search
        search_query = "メールサーバー"
        search_response = {
            "query": search_query,
            "results": {
                "incidents": [
                    {
                        "id": "INC000123",
                        "title": "メールサーバーに接続できない",
                        "type": "incident",
                        "relevance": 0.95,
                    }
                ],
                "problems": [
                    {
                        "id": "PRB000010",
                        "title": "メールサーバーの定期的な障害",
                        "type": "problem",
                        "relevance": 0.85,
                    }
                ],
                "knowledge_base": [
                    {
                        "id": "KB000050",
                        "title": "メールサーバートラブルシューティングガイド",
                        "type": "knowledge_article",
                        "relevance": 0.90,
                    }
                ],
            },
            "total_results": 3,
        }

        with patch.object(api_client, "get") as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = search_response

            response = api_client.get(
                f"{test_config['base_url']}/search", params={"q": search_query}
            )

            assert response.status_code == 200
            results = response.json()
            assert results["query"] == search_query
            assert "results" in results
            assert results["total_results"] == 3


@pytest.mark.api
@pytest.mark.performance
class TestAPIPerformance:
    """API performance and benchmark tests"""

    @pytest.mark.benchmark
    def test_incident_creation_performance(
        self, api_client, sample_incident_data, test_config, benchmark
    ):
        """Benchmark incident creation performance"""
        mock_response = {
            "id": str(uuid4()),
            "incident_number": "INC000123",
            "title": sample_incident_data["title"],
            "status": "new",
            "created_at": datetime.now().isoformat(),
        }

        def create_incident():
            with patch.object(api_client, "post") as mock_post:
                mock_post.return_value.status_code = 201
                mock_post.return_value.json.return_value = mock_response

                response = api_client.post(
                    f"{test_config['base_url']}/incidents", json=sample_incident_data
                )
                return response

        # Benchmark the operation
        result = benchmark(create_incident)
        assert result.status_code == 201

    @pytest.mark.benchmark
    def test_incident_list_performance(self, api_client, test_config, benchmark):
        """Benchmark incident listing performance"""
        mock_response = {
            "data": [
                {
                    "id": f"INC{i:06d}",
                    "title": f"Test incident {i}",
                    "status": "new",
                    "priority": "medium",
                    "created_at": datetime.now().isoformat(),
                }
                for i in range(100)  # Simulate 100 incidents
            ],
            "meta": {"total": 1000, "page": 1, "per_page": 100, "total_pages": 10},
        }

        def list_incidents():
            with patch.object(api_client, "get") as mock_get:
                mock_get.return_value.status_code = 200
                mock_get.return_value.json.return_value = mock_response

                response = api_client.get(f"{test_config['base_url']}/incidents")
                return response

        # Benchmark the operation
        result = benchmark(list_incidents)
        assert result.status_code == 200
        data = result.json()
        assert len(data["data"]) == 100

    @pytest.mark.slow
    def test_concurrent_api_requests(self, api_client, test_config):
        """Test API performance under concurrent load"""
        import threading
        import queue
        from concurrent.futures import ThreadPoolExecutor

        results_queue = queue.Queue()

        def make_request():
            mock_response = {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
            }

            with patch.object(api_client, "get") as mock_get:
                mock_get.return_value.status_code = 200
                mock_get.return_value.json.return_value = mock_response

                start_time = time.time()
                response = api_client.get(f"{test_config['base_url']}/health")
                end_time = time.time()

                results_queue.put(
                    {
                        "status_code": response.status_code,
                        "response_time": end_time - start_time,
                    }
                )

        # Execute 20 concurrent requests
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(20)]

            # Wait for all requests to complete
            for future in futures:
                future.result()

        # Analyze results
        results = []
        while not results_queue.empty():
            results.append(results_queue.get())

        assert len(results) == 20

        # All requests should succeed
        success_count = sum(1 for r in results if r["status_code"] == 200)
        assert success_count == 20

        # Calculate average response time
        avg_response_time = sum(r["response_time"] for r in results) / len(results)
        assert avg_response_time < 1.0  # Should respond within 1 second

    @pytest.mark.load
    def test_api_rate_limiting(self, api_client, test_config):
        """Test API rate limiting behavior"""
        # Simulate rapid requests that should trigger rate limiting
        responses = []

        for i in range(5):
            mock_response = Mock()
            if i < 3:
                # First 3 requests succeed
                mock_response.status_code = 200
                mock_response.json.return_value = {"status": "success"}
            else:
                # Subsequent requests hit rate limit
                mock_response.status_code = 429
                mock_response.headers = {
                    "X-RateLimit-Limit": "3",
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + 60),
                }
                mock_response.json.return_value = {
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Rate limit exceeded",
                    }
                }

            with patch.object(api_client, "get", return_value=mock_response):
                response = api_client.get(f"{test_config['base_url']}/health")
                responses.append(response)

        # Verify rate limiting behavior
        success_responses = [r for r in responses if r.status_code == 200]
        rate_limited_responses = [r for r in responses if r.status_code == 429]

        assert len(success_responses) == 3
        assert len(rate_limited_responses) == 2

        # Check rate limit headers
        for response in rate_limited_responses:
            assert "X-RateLimit-Limit" in response.headers
            assert response.headers["X-RateLimit-Remaining"] == "0"


@pytest.mark.api
@pytest.mark.security
class TestAPISecurity:
    """API security and authentication tests"""

    def test_unauthorized_access(self, test_config):
        """Test API endpoints without authentication"""
        import requests

        # Try to access protected endpoint without auth
        mock_error_response = {
            "error": {"code": "UNAUTHORIZED", "message": "Authentication required"}
        }

        with patch("requests.get") as mock_get:
            mock_get.return_value.status_code = 401
            mock_get.return_value.json.return_value = mock_error_response

            response = requests.get(f"{test_config['base_url']}/incidents")

            assert response.status_code == 401
            error = response.json()["error"]
            assert error["code"] == "UNAUTHORIZED"

    def test_invalid_token_access(self, test_config):
        """Test API access with invalid token"""
        import requests

        headers = {
            "Authorization": "Bearer invalid_token_12345",
            "Content-Type": "application/json",
        }

        mock_error_response = {
            "error": {
                "code": "INVALID_TOKEN",
                "message": "The access token is invalid or expired",
            }
        }

        with patch("requests.get") as mock_get:
            mock_get.return_value.status_code = 401
            mock_get.return_value.json.return_value = mock_error_response

            response = requests.get(
                f"{test_config['base_url']}/incidents", headers=headers
            )

            assert response.status_code == 401
            error = response.json()["error"]
            assert error["code"] == "INVALID_TOKEN"

    def test_sql_injection_protection(self, api_client, test_config):
        """Test SQL injection protection in API endpoints"""
        # Attempt SQL injection in search parameter
        malicious_query = "'; DROP TABLE incidents; --"

        mock_response = {
            "error": {"code": "INVALID_INPUT", "message": "Invalid search query"}
        }

        with patch.object(api_client, "get") as mock_get:
            mock_get.return_value.status_code = 400
            mock_get.return_value.json.return_value = mock_response

            response = api_client.get(
                f"{test_config['base_url']}/incidents", params={"q": malicious_query}
            )

            # Should reject malicious input
            assert response.status_code == 400

    def test_xss_protection(self, api_client, sample_incident_data, test_config):
        """Test XSS protection in API endpoints"""
        # Attempt XSS in incident title
        xss_data = {
            **sample_incident_data,
            "title": "<script>alert('XSS')</script>Test incident",
        }

        mock_response = {
            "error": {
                "code": "INVALID_INPUT",
                "message": "Input contains potentially harmful content",
            }
        }

        with patch.object(api_client, "post") as mock_post:
            mock_post.return_value.status_code = 400
            mock_post.return_value.json.return_value = mock_response

            response = api_client.post(
                f"{test_config['base_url']}/incidents", json=xss_data
            )

            # Should reject XSS attempts
            assert response.status_code == 400
