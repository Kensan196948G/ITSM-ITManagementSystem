"""
Incident history and workflow API tests
"""
import pytest
import requests
from unittest.mock import patch
from datetime import datetime, timedelta


@pytest.mark.api
@pytest.mark.incidents
class TestIncidentHistory:
    """Incident history and workflow tests"""

    def test_get_incident_history_success(self, test_config, api_headers):
        """Test successful incident history retrieval"""
        incident_id = "INC000123"
        mock_response = {
            "data": [
                {
                    "id": "hist_001",
                    "action": "created",
                    "from": None,
                    "to": "new",
                    "user": {
                        "id": "user_456",
                        "name": "山田太郎"
                    },
                    "timestamp": "2024-01-15T09:30:00+09:00",
                    "details": {
                        "title": "メールサーバーに接続できない",
                        "priority": "high"
                    }
                },
                {
                    "id": "hist_002",
                    "action": "status_changed",
                    "from": "new",
                    "to": "assigned",
                    "user": {
                        "id": "user_123",
                        "name": "システム管理者"
                    },
                    "timestamp": "2024-01-15T09:35:00+09:00",
                    "details": {
                        "assignee_id": "user_789",
                        "assignee_name": "鈴木花子"
                    }
                },
                {
                    "id": "hist_003",
                    "action": "work_note_added",
                    "from": None,
                    "to": None,
                    "user": {
                        "id": "user_789",
                        "name": "鈴木花子"
                    },
                    "timestamp": "2024-01-15T10:15:00+09:00",
                    "details": {
                        "note": "調査開始。メールサーバーのログを確認中。"
                    }
                }
            ],
            "meta": {
                "total_count": 3,
                "current_page": 1,
                "total_pages": 1
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = mock_response
            
            response = requests.get(
                f"{test_config['base_url']}/incidents/{incident_id}/history",
                headers=api_headers
            )
            
            assert response.status_code == 200
            history = response.json()
            assert "data" in history
            assert len(history["data"]) == 3
            
            # Verify chronological order
            timestamps = [item["timestamp"] for item in history["data"]]
            assert timestamps == sorted(timestamps)
            
            # Verify action types
            actions = [item["action"] for item in history["data"]]
            assert "created" in actions
            assert "status_changed" in actions
            assert "work_note_added" in actions

    def test_get_incident_history_with_filters(self, test_config, api_headers):
        """Test incident history with action type filters"""
        incident_id = "INC000123"
        mock_response = {
            "data": [
                {
                    "id": "hist_002",
                    "action": "status_changed",
                    "from": "new",
                    "to": "assigned",
                    "user": {
                        "id": "user_123",
                        "name": "システム管理者"
                    },
                    "timestamp": "2024-01-15T09:35:00+09:00"
                }
            ],
            "meta": {
                "total_count": 1,
                "current_page": 1,
                "total_pages": 1
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = mock_response
            
            params = {
                "action_types": ["status_changed"],
                "date_from": "2024-01-15T00:00:00+09:00",
                "date_to": "2024-01-15T23:59:59+09:00"
            }
            
            response = requests.get(
                f"{test_config['base_url']}/incidents/{incident_id}/history",
                params=params,
                headers=api_headers
            )
            
            assert response.status_code == 200
            history = response.json()
            assert len(history["data"]) == 1
            assert history["data"][0]["action"] == "status_changed"

    def test_add_work_note_success(self, test_config, api_headers):
        """Test successful work note addition"""
        incident_id = "INC000123"
        note_data = {
            "content": "ネットワーク設定を確認。問題を特定しました。",
            "is_public": False,
            "notify_assignee": True
        }
        
        mock_response = {
            "id": "note_001",
            "content": note_data["content"],
            "author": {
                "id": "user_789",
                "name": "鈴木花子"
            },
            "is_public": False,
            "created_at": "2024-01-15T14:30:00+09:00"
        }
        
        with patch('requests.post') as mock_post:
            mock_post.return_value.status_code = 201
            mock_post.return_value.json.return_value = mock_response
            
            response = requests.post(
                f"{test_config['base_url']}/incidents/{incident_id}/work-notes",
                json=note_data,
                headers=api_headers
            )
            
            assert response.status_code == 201
            note = response.json()
            assert note["content"] == note_data["content"]
            assert note["is_public"] == False
            assert "author" in note

    def test_add_work_note_validation_error(self, test_config, api_headers):
        """Test work note addition with validation error"""
        incident_id = "INC000123"
        invalid_note_data = {
            "content": "",  # Empty content should fail
            "is_public": "invalid_boolean"  # Invalid boolean
        }
        
        mock_error_response = {
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "入力値が不正です",
                "details": [
                    {
                        "field": "content",
                        "message": "作業ノートの内容は必須です"
                    },
                    {
                        "field": "is_public",
                        "message": "is_publicはboolean値である必要があります"
                    }
                ]
            }
        }
        
        with patch('requests.post') as mock_post:
            mock_post.return_value.status_code = 422
            mock_post.return_value.json.return_value = mock_error_response
            
            response = requests.post(
                f"{test_config['base_url']}/incidents/{incident_id}/work-notes",
                json=invalid_note_data,
                headers=api_headers
            )
            
            assert response.status_code == 422
            error = response.json()["error"]
            assert error["code"] == "VALIDATION_ERROR"
            assert len(error["details"]) == 2

    def test_get_work_notes_list(self, test_config, api_headers):
        """Test retrieval of work notes list"""
        incident_id = "INC000123"
        mock_response = {
            "data": [
                {
                    "id": "note_001",
                    "content": "初回調査開始",
                    "author": {
                        "id": "user_789",
                        "name": "鈴木花子"
                    },
                    "is_public": False,
                    "created_at": "2024-01-15T10:15:00+09:00"
                },
                {
                    "id": "note_002",
                    "content": "原因を特定しました",
                    "author": {
                        "id": "user_789",
                        "name": "鈴木花子"
                    },
                    "is_public": True,
                    "created_at": "2024-01-15T14:30:00+09:00"
                }
            ],
            "meta": {
                "total_count": 2,
                "current_page": 1,
                "total_pages": 1
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = mock_response
            
            response = requests.get(
                f"{test_config['base_url']}/incidents/{incident_id}/work-notes",
                headers=api_headers
            )
            
            assert response.status_code == 200
            notes = response.json()
            assert len(notes["data"]) == 2
            assert notes["data"][0]["is_public"] == False
            assert notes["data"][1]["is_public"] == True

    def test_incident_assignment_workflow(self, test_config, api_headers):
        """Test incident assignment workflow"""
        incident_id = "INC000123"
        assignment_data = {
            "assignee_id": "user_789",
            "assignment_group": "L2_Support",
            "escalation_reason": "Requires database expertise"
        }
        
        mock_response = {
            "id": incident_id,
            "status": "assigned",
            "assignee": {
                "id": "user_789",
                "name": "鈴木花子",
                "group": "L2_Support"
            },
            "assigned_at": "2024-01-15T15:00:00+09:00",
            "sla": {
                "response_due": "2024-01-15T16:00:00+09:00",
                "resolution_due": "2024-01-16T15:00:00+09:00"
            }
        }
        
        with patch('requests.post') as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = mock_response
            
            response = requests.post(
                f"{test_config['base_url']}/incidents/{incident_id}/assign",
                json=assignment_data,
                headers=api_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert result["status"] == "assigned"
            assert result["assignee"]["id"] == "user_789"
            assert "sla" in result

    def test_incident_escalation_workflow(self, test_config, api_headers):
        """Test incident escalation workflow"""
        incident_id = "INC000123"
        escalation_data = {
            "escalation_level": "management",
            "reason": "SLA breach imminent",
            "notify_manager": True,
            "escalation_note": "高優先度インシデントのSLA違反の可能性"
        }
        
        mock_response = {
            "id": incident_id,
            "escalation_level": "management",
            "escalated_at": "2024-01-15T16:00:00+09:00",
            "escalated_to": {
                "id": "user_100",
                "name": "管理者",
                "role": "incident_manager"
            },
            "notifications_sent": ["email", "sms", "slack"]
        }
        
        with patch('requests.post') as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = mock_response
            
            response = requests.post(
                f"{test_config['base_url']}/incidents/{incident_id}/escalate",
                json=escalation_data,
                headers=api_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert result["escalation_level"] == "management"
            assert "escalated_to" in result
            assert "notifications_sent" in result

    def test_incident_resolution_workflow(self, test_config, api_headers):
        """Test incident resolution workflow"""
        incident_id = "INC000123"
        resolution_data = {
            "resolution_code": "config_change",
            "resolution_notes": "メールサーバーの設定を修正しました。サービスが復旧しています。",
            "verification_required": True,
            "close_related_incidents": False
        }
        
        mock_response = {
            "id": incident_id,
            "status": "resolved",
            "resolution": {
                "code": "config_change",
                "notes": resolution_data["resolution_notes"],
                "resolved_by": {
                    "id": "user_789",
                    "name": "鈴木花子"
                },
                "resolved_at": "2024-01-15T17:00:00+09:00"
            },
            "sla": {
                "response_met": True,
                "resolution_met": True,
                "resolution_time_minutes": 450
            }
        }
        
        with patch('requests.post') as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = mock_response
            
            response = requests.post(
                f"{test_config['base_url']}/incidents/{incident_id}/resolve",
                json=resolution_data,
                headers=api_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert result["status"] == "resolved"
            assert result["resolution"]["code"] == "config_change"
            assert result["sla"]["resolution_met"] == True

    def test_incident_closure_workflow(self, test_config, api_headers):
        """Test incident closure workflow"""
        incident_id = "INC000123"
        closure_data = {
            "closure_code": "resolved_permanently",
            "closure_notes": "ユーザー確認完了。問題は完全に解決されました。",
            "satisfaction_survey": {
                "rating": 4,
                "feedback": "迅速な対応ありがとうございました"
            }
        }
        
        mock_response = {
            "id": incident_id,
            "status": "closed",
            "closure": {
                "code": "resolved_permanently",
                "notes": closure_data["closure_notes"],
                "closed_by": {
                    "id": "user_456",
                    "name": "山田太郎"
                },
                "closed_at": "2024-01-16T09:00:00+09:00"
            },
            "final_sla": {
                "response_met": True,
                "resolution_met": True,
                "total_time_minutes": 1410,
                "satisfaction_score": 4
            }
        }
        
        with patch('requests.post') as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = mock_response
            
            response = requests.post(
                f"{test_config['base_url']}/incidents/{incident_id}/close",
                json=closure_data,
                headers=api_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert result["status"] == "closed"
            assert result["closure"]["code"] == "resolved_permanently"
            assert result["final_sla"]["satisfaction_score"] == 4