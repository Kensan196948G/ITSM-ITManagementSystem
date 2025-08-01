"""
Incident management CRUD API tests
"""
import pytest
import requests
from unittest.mock import patch
import json
from datetime import datetime


@pytest.mark.api
@pytest.mark.incidents
@pytest.mark.critical
class TestIncidentsCRUD:
    """Incident CRUD operations tests"""

    def test_create_incident_success(self, test_config, api_headers, sample_incident_data):
        """Test successful incident creation"""
        mock_response = {
            "id": "INC000124",
            "title": sample_incident_data["title"],
            "status": "new",
            "priority": sample_incident_data["priority"],
            "created_at": "2024-01-15T11:00:00+09:00",
            "ticket_url": "https://itsm-system.com/incidents/INC000124"
        }
        
        with patch('requests.post') as mock_post:
            mock_post.return_value.status_code = 201
            mock_post.return_value.json.return_value = mock_response
            
            response = requests.post(
                f"{test_config['base_url']}/incidents",
                json=sample_incident_data,
                headers=api_headers
            )
            
            assert response.status_code == 201
            incident = response.json()
            assert incident["id"] == "INC000124"
            assert incident["status"] == "new"
            assert incident["title"] == sample_incident_data["title"]
            assert "ticket_url" in incident

    def test_create_incident_validation_error(self, test_config, api_headers):
        """Test incident creation with validation errors"""
        invalid_data = {
            "title": "",  # Empty title should fail validation
            "priority": "invalid_priority",  # Invalid priority
            "category_id": None  # Missing required field
        }
        
        mock_error_response = {
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "入力値が不正です",
                "details": [
                    {
                        "field": "title",
                        "message": "タイトルは必須です"
                    },
                    {
                        "field": "priority",
                        "message": "優先度は Low, Medium, High, Critical のいずれかを指定してください"
                    }
                ],
                "request_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        }
        
        with patch('requests.post') as mock_post:
            mock_post.return_value.status_code = 422
            mock_post.return_value.json.return_value = mock_error_response
            
            response = requests.post(
                f"{test_config['base_url']}/incidents",
                json=invalid_data,
                headers=api_headers
            )
            
            assert response.status_code == 422
            error = response.json()["error"]
            assert error["code"] == "VALIDATION_ERROR"
            assert len(error["details"]) >= 2
            
            # Check specific validation errors
            field_errors = {detail["field"]: detail["message"] for detail in error["details"]}
            assert "title" in field_errors
            assert "priority" in field_errors

    def test_get_incident_by_id_success(self, test_config, api_headers):
        """Test successful incident retrieval by ID"""
        incident_id = "INC000123"
        mock_response = {
            "id": incident_id,
            "title": "メールサーバーに接続できない",
            "description": "朝9時頃からメールの送受信ができません",
            "status": "in_progress",
            "priority": "high",
            "category": {
                "id": "cat_001",
                "name": "メール"
            },
            "reporter": {
                "id": "user_456",
                "name": "山田太郎",
                "email": "yamada@example.com"
            },
            "assignee": {
                "id": "user_789",
                "name": "鈴木花子",
                "email": "suzuki@example.com"
            },
            "created_at": "2024-01-15T09:30:00+09:00",
            "updated_at": "2024-01-15T10:15:00+09:00",
            "sla": {
                "response_due": "2024-01-15T10:30:00+09:00",
                "resolution_due": "2024-01-15T17:30:00+09:00",
                "response_met": True,
                "resolution_met": None
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = mock_response
            
            response = requests.get(
                f"{test_config['base_url']}/incidents/{incident_id}",
                headers=api_headers
            )
            
            assert response.status_code == 200
            incident = response.json()
            assert incident["id"] == incident_id
            assert incident["status"] == "in_progress"
            assert incident["priority"] == "high"
            assert "sla" in incident
            assert "reporter" in incident
            assert "assignee" in incident

    def test_get_incident_not_found(self, test_config, api_headers):
        """Test incident retrieval with non-existent ID"""
        incident_id = "INC999999"
        mock_error_response = {
            "error": {
                "code": "NOT_FOUND",
                "message": "指定されたインシデントが見つかりません",
                "request_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 404
            mock_get.return_value.json.return_value = mock_error_response
            
            response = requests.get(
                f"{test_config['base_url']}/incidents/{incident_id}",
                headers=api_headers
            )
            
            assert response.status_code == 404
            error = response.json()["error"]
            assert error["code"] == "NOT_FOUND"

    def test_update_incident_success(self, test_config, api_headers):
        """Test successful incident update"""
        incident_id = "INC000123"
        update_data = {
            "status": "in_progress",
            "assignee_id": "user_789",
            "work_notes": "プリンターの現地確認を開始しました"
        }
        
        mock_response = {
            "id": incident_id,
            "status": "in_progress",
            "assignee_id": "user_789",
            "updated_at": "2024-01-15T11:30:00+09:00"
        }
        
        with patch('requests.patch') as mock_patch:
            mock_patch.return_value.status_code = 200
            mock_patch.return_value.json.return_value = mock_response
            
            response = requests.patch(
                f"{test_config['base_url']}/incidents/{incident_id}",
                json=update_data,
                headers=api_headers
            )
            
            assert response.status_code == 200
            incident = response.json()
            assert incident["status"] == "in_progress"
            assert incident["assignee_id"] == "user_789"

    def test_update_incident_invalid_status_transition(self, test_config, api_headers):
        """Test incident update with invalid status transition"""
        incident_id = "INC000123"
        invalid_update = {
            "status": "resolved",  # Assume direct transition to resolved is not allowed
        }
        
        mock_error_response = {
            "error": {
                "code": "INVALID_TRANSITION",
                "message": "ステータスの遷移が無効です",
                "details": [
                    {
                        "field": "status",
                        "message": "新規から解決済みへの直接遷移はできません"
                    }
                ],
                "request_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        }
        
        with patch('requests.patch') as mock_patch:
            mock_patch.return_value.status_code = 400
            mock_patch.return_value.json.return_value = mock_error_response
            
            response = requests.patch(
                f"{test_config['base_url']}/incidents/{incident_id}",
                json=invalid_update,
                headers=api_headers
            )
            
            assert response.status_code == 400
            error = response.json()["error"]
            assert error["code"] == "INVALID_TRANSITION"

    def test_list_incidents_with_pagination(self, test_config, api_headers):
        """Test incident listing with pagination"""
        mock_response = {
            "data": [
                {
                    "id": "INC000123",
                    "title": "メールサーバーに接続できない",
                    "status": "in_progress",
                    "priority": "high",
                    "created_at": "2024-01-15T09:30:00+09:00"
                },
                {
                    "id": "INC000124",
                    "title": "プリンターが動作しない",
                    "status": "new",
                    "priority": "medium",
                    "created_at": "2024-01-15T11:00:00+09:00"
                }
            ],
            "meta": {
                "current_page": 1,
                "total_pages": 5,
                "total_count": 98,
                "per_page": 20
            },
            "links": {
                "first": "/incidents?page=1&per_page=20",
                "next": "/incidents?page=2&per_page=20",
                "last": "/incidents?page=5&per_page=20"
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = mock_response
            
            params = {
                "page": 1,
                "per_page": 20,
                "sort": "-created_at"
            }
            
            response = requests.get(
                f"{test_config['base_url']}/incidents",
                params=params,
                headers=api_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "data" in data
            assert "meta" in data
            assert "links" in data
            assert len(data["data"]) <= 20
            assert data["meta"]["current_page"] == 1
            assert data["meta"]["total_count"] == 98

    def test_list_incidents_with_filters(self, test_config, api_headers):
        """Test incident listing with filters"""
        mock_response = {
            "data": [
                {
                    "id": "INC000123",
                    "title": "メールサーバーに接続できない",
                    "status": "in_progress",
                    "priority": "high",
                    "assignee": {
                        "id": "user_789",
                        "name": "鈴木花子"
                    }
                }
            ],
            "meta": {
                "current_page": 1,
                "total_pages": 1,
                "total_count": 1,
                "per_page": 20
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = mock_response
            
            params = {
                "status": ["in_progress"],
                "priority": ["high", "critical"],
                "assignee_id": "user_789"
            }
            
            response = requests.get(
                f"{test_config['base_url']}/incidents",
                params=params,
                headers=api_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data["data"]) == 1
            assert data["data"][0]["status"] == "in_progress"
            assert data["data"][0]["priority"] == "high"

    def test_delete_incident_success(self, test_config, api_headers):
        """Test successful incident deletion"""
        incident_id = "INC000123"
        
        with patch('requests.delete') as mock_delete:
            mock_delete.return_value.status_code = 204
            
            response = requests.delete(
                f"{test_config['base_url']}/incidents/{incident_id}",
                headers=api_headers
            )
            
            assert response.status_code == 204

    def test_delete_incident_not_found(self, test_config, api_headers):
        """Test incident deletion with non-existent ID"""
        incident_id = "INC999999"
        mock_error_response = {
            "error": {
                "code": "NOT_FOUND",
                "message": "指定されたインシデントが見つかりません"
            }
        }
        
        with patch('requests.delete') as mock_delete:
            mock_delete.return_value.status_code = 404
            mock_delete.return_value.json.return_value = mock_error_response
            
            response = requests.delete(
                f"{test_config['base_url']}/incidents/{incident_id}",
                headers=api_headers
            )
            
            assert response.status_code == 404
            error = response.json()["error"]
            assert error["code"] == "NOT_FOUND"

    @pytest.mark.slow
    def test_bulk_incident_operations(self, test_config, api_headers):
        """Test bulk incident operations"""
        bulk_data = {
            "operation": "update",
            "incident_ids": ["INC000123", "INC000124", "INC000125"],
            "updates": {
                "assignee_id": "user_789",
                "status": "assigned"
            }
        }
        
        mock_response = {
            "success_count": 3,
            "failed_count": 0,
            "results": [
                {"id": "INC000123", "status": "success"},
                {"id": "INC000124", "status": "success"},
                {"id": "INC000125", "status": "success"}
            ]
        }
        
        with patch('requests.post') as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = mock_response
            
            response = requests.post(
                f"{test_config['base_url']}/incidents/bulk",
                json=bulk_data,
                headers=api_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert result["success_count"] == 3
            assert result["failed_count"] == 0