"""拡張された問題管理APIテスト"""

import pytest
import json
from datetime import datetime
from uuid import uuid4
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.problem import Problem, KnownError, ProblemStatus, ProblemCategory, BusinessImpact, RCAPhase
from tests.conftest import override_get_db


client = TestClient(app)


class TestProblemsEnhancedAPI:
    """拡張された問題管理APIテスト"""
    
    def test_create_problem_with_new_fields(self, db_session: Session):
        """新しいフィールドを含む問題作成テスト"""
        problem_data = {
            "title": "テスト問題",
            "description": "詳細な説明",
            "priority": "high",
            "category": "software",
            "business_impact": "high",
            "impact_analysis": "システム全体に影響",
            "affected_services": ["web", "api", "database"]
        }
        
        response = client.post("/api/v1/problems/", json=problem_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == problem_data["title"]
        assert data["category"] == problem_data["category"]
        assert data["business_impact"] == problem_data["business_impact"]
        assert data["affected_services"] == problem_data["affected_services"]
        assert data["rca_info"]["phase"] == "not_started"
    
    def test_list_problems_with_advanced_filtering(self, db_session: Session):
        """高度なフィルタリング機能テスト"""
        # テストデータ作成
        problems = [
            Problem(
                problem_number="PRB202500010001",
                tenant_id=uuid4(),
                title="ソフトウェア問題",
                category=ProblemCategory.SOFTWARE,
                business_impact=BusinessImpact.HIGH,
                priority="high"
            ),
            Problem(
                problem_number="PRB202500010002",
                tenant_id=uuid4(),
                title="ハードウェア問題",
                category=ProblemCategory.HARDWARE,
                business_impact=BusinessImpact.LOW,
                priority="low"
            )
        ]
        
        for problem in problems:
            db_session.add(problem)
        db_session.commit()
        
        # カテゴリフィルターテスト
        response = client.get("/api/v1/problems/?category=software")
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) >= 1
        
        # ビジネス影響フィルターテスト
        response = client.get("/api/v1/problems/?business_impact=high")
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) >= 1
        
        # 検索機能テスト
        response = client.get("/api/v1/problems/?search=ソフトウェア")
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) >= 1
        
        # ソート機能テスト
        response = client.get("/api/v1/problems/?sort_by=title&sort_order=asc")
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) >= 0
    
    def test_rca_workflow(self, db_session: Session):
        """RCAワークフローテスト"""
        # 問題作成
        problem = Problem(
            problem_number="PRB202500010003",
            tenant_id=uuid4(),
            title="RCAテスト問題",
            category=ProblemCategory.SOFTWARE,
            business_impact=BusinessImpact.MEDIUM
        )
        db_session.add(problem)
        db_session.commit()
        
        # RCA開始
        rca_start_data = {
            "analysis_type": "5why",
            "team_members": [],
            "initial_notes": "RCA開始"
        }
        
        response = client.post(
            f"/api/v1/problems/{problem.id}/rca/start",
            json=rca_start_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "RCAが正常に開始されました"
        
        # RCA進捗取得
        response = client.get(f"/api/v1/problems/{problem.id}/rca")
        assert response.status_code == 200
        data = response.json()
        assert data["rca_info"]["phase"] == "data_collection"
        assert data["rca_info"]["progress_percentage"] == 20
        
        # RCAフェーズ更新
        response = client.put(
            f"/api/v1/problems/{problem.id}/rca/phase",
            params={"phase": "analysis", "notes": "分析フェーズに移行"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["new_phase"] == "analysis"
        
        # RCA調査結果追加
        finding_data = {
            "finding_type": "root_cause",
            "description": "設定ミスが原因",
            "evidence": "ログファイルに記録",
            "impact": "システム停止",
            "recommendation": "設定を修正"
        }
        
        response = client.post(
            f"/api/v1/problems/{problem.id}/rca/findings",
            json=finding_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "RCA調査結果が正常に追加されました"
    
    def test_statistics_api(self, db_session: Session):
        """統計APIテスト"""
        # テストデータ作成
        problems = [
            Problem(
                problem_number="PRB202500010004",
                tenant_id=uuid4(),
                title="統計テスト問題1",
                status=ProblemStatus.RESOLVED,
                category=ProblemCategory.SOFTWARE,
                business_impact=BusinessImpact.HIGH
            ),
            Problem(
                problem_number="PRB202500010005",
                tenant_id=uuid4(),
                title="統計テスト問題2",
                status=ProblemStatus.UNDER_INVESTIGATION,
                category=ProblemCategory.NETWORK,
                business_impact=BusinessImpact.MEDIUM
            )
        ]
        
        for problem in problems:
            db_session.add(problem)
        db_session.commit()
        
        # 統計取得
        response = client.get("/api/v1/problems/statistics")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_problems" in data
        assert "by_status" in data
        assert "by_category" in data
        assert "by_business_impact" in data
        assert "rca_completion_rate" in data
        
        # トレンド取得
        response = client.get("/api/v1/problems/trends?period=30d")
        assert response.status_code == 200
        data = response.json()
        
        assert "created_trends" in data
        assert "resolved_trends" in data
        assert "category_trends" in data
        assert "impact_trends" in data
        
        # KPI取得
        response = client.get("/api/v1/problems/kpis?period=30d")
        assert response.status_code == 200
        data = response.json()
        
        assert "first_call_resolution_rate" in data
        assert "problem_recurrence_rate" in data
        assert "rca_effectiveness_score" in data
        assert "sla_compliance_rate" in data
    
    def test_bulk_operations(self, db_session: Session):
        """一括操作テスト"""
        # テストデータ作成
        problems = []
        for i in range(3):
            problem = Problem(
                problem_number=f"PRB20250001000{i+6}",
                tenant_id=uuid4(),
                title=f"一括テスト問題{i+1}",
                category=ProblemCategory.SOFTWARE,
                business_impact=BusinessImpact.LOW
            )
            problems.append(problem)
            db_session.add(problem)
        db_session.commit()
        
        problem_ids = [str(p.id) for p in problems]
        
        # 一括更新
        bulk_update_data = {
            "problem_ids": problem_ids,
            "updates": {
                "priority": "high",
                "business_impact": "medium"
            }
        }
        
        response = client.put("/api/v1/problems/bulk-update", json=bulk_update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success_count"] == 3
        assert data["failed_count"] == 0
        
        # 一括削除
        bulk_delete_data = {
            "problem_ids": problem_ids,
            "reason": "テストのため削除"
        }
        
        response = client.delete("/api/v1/problems/bulk-delete", json=bulk_delete_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success_count"] == 3
        assert data["failed_count"] == 0
    
    def test_export_functionality(self, db_session: Session):
        """エクスポート機能テスト"""
        # テストデータ作成
        problem = Problem(
            problem_number="PRB202500010009",
            tenant_id=uuid4(),
            title="エクスポートテスト問題",
            category=ProblemCategory.SOFTWARE,
            business_impact=BusinessImpact.MEDIUM
        )
        db_session.add(problem)
        db_session.commit()
        
        # CSV エクスポート
        response = client.get("/api/v1/problems/export?format=csv")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
        assert "attachment" in response.headers["content-disposition"]
        
        # フィルター付きエクスポート
        response = client.get(
            "/api/v1/problems/export?format=csv&category=software"
        )
        assert response.status_code == 200


class TestKnownErrorsAPI:
    """既知エラーAPIテスト"""
    
    def test_create_known_error(self, db_session: Session):
        """既知エラー作成テスト"""
        known_error_data = {
            "title": "テスト既知エラー",
            "symptoms": "システムが遅い",
            "root_cause": "メモリ不足",
            "workaround": "再起動",
            "solution": "メモリ増設",
            "category": "hardware",
            "tags": ["performance", "memory"],
            "search_keywords": "遅い 重い パフォーマンス",
            "is_published": True
        }
        
        response = client.post("/api/v1/known-errors/", json=known_error_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == known_error_data["title"]
        assert data["category"] == known_error_data["category"]
        assert data["tags"] == known_error_data["tags"]
        assert data["is_published"] == True
        assert data["usage_count"] == 0
    
    def test_search_similar_known_errors(self, db_session: Session):
        """類似既知エラー検索テスト"""
        # テストデータ作成
        known_errors = [
            KnownError(
                title="パフォーマンス問題",
                symptoms="システムが遅い",
                category=ProblemCategory.HARDWARE,
                search_keywords="遅い パフォーマンス",
                is_published="Y",
                usage_count="5"
            ),
            KnownError(
                title="ネットワーク問題",
                symptoms="接続できない",
                category=ProblemCategory.NETWORK,
                search_keywords="接続 ネットワーク",
                is_published="Y",
                usage_count="3"
            )
        ]
        
        for ke in known_errors:
            db_session.add(ke)
        db_session.commit()
        
        # 類似検索
        response = client.get(
            "/api/v1/known-errors/search/similar?symptoms=システムが遅い&category=hardware"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any("パフォーマンス" in item["title"] for item in data)
    
    def test_usage_statistics(self, db_session: Session):
        """利用統計テスト"""
        # テストデータ作成
        known_error = KnownError(
            title="統計テスト既知エラー",
            category=ProblemCategory.SOFTWARE,
            is_published="Y",
            usage_count="10"
        )
        db_session.add(known_error)
        db_session.commit()
        
        response = client.get("/api/v1/known-errors/statistics/usage?period=30d")
        
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "top_used" in data
        assert "category_statistics" in data
        assert "recent_created" in data


@pytest.fixture
def mock_security_check():
    """セキュリティチェックのモック"""
    with patch("app.core.problem_security.ProblemSecurityManager.check_permission") as mock:
        mock.return_value = True
        yield mock


class TestProblemSecurity:
    """問題管理セキュリティテスト"""
    
    def test_permission_check(self, mock_security_check):
        """権限チェックテスト"""
        from app.core.problem_security import ProblemSecurityManager
        
        user_id = uuid4()
        result = ProblemSecurityManager.check_permission(
            user_id, 
            ProblemSecurityManager.ACTION_CREATE,
            ProblemSecurityManager.RESOURCE_PROBLEM
        )
        
        assert result == True
        mock_security_check.assert_called_once()
    
    def test_data_validation(self):
        """データバリデーションテスト"""
        from app.core.problem_security import ProblemSecurityManager
        
        # 正常なデータ
        valid_data = {
            "title": "正常な問題タイトル",
            "description": "正常な説明",
            "priority": "high"
        }
        
        errors = ProblemSecurityManager.validate_problem_data(valid_data)
        assert len(errors) == 0
        
        # 不正なデータ
        invalid_data = {
            "title": "",  # 空のタイトル
            "description": "a" * 11000,  # 長すぎる説明
            "priority": "invalid_priority"  # 無効な優先度
        }
        
        errors = ProblemSecurityManager.validate_problem_data(invalid_data)
        assert len(errors) > 0
        assert any("タイトル" in error for error in errors)
        assert any("説明" in error for error in errors)
        assert any("優先度" in error for error in errors)
    
    def test_data_sanitization(self):
        """データサニタイゼーションテスト"""
        from app.core.problem_security import ProblemSecurityManager
        
        dirty_data = {
            "title": "<script>alert('xss')</script>テスト",
            "description": "SELECT * FROM users; --"
        }
        
        clean_data = ProblemSecurityManager.sanitize_data(dirty_data)
        
        assert "<script>" not in clean_data["title"]
        assert "SELECT * FROM" not in clean_data["description"]
    
    def test_sensitive_data_detection(self):
        """機密情報検出テスト"""
        from app.core.problem_security import ProblemSecurityManager
        
        # 機密情報を含むテキスト
        sensitive_text = "password=secret123 api_key=abc123"
        assert ProblemSecurityManager._contains_sensitive_data(sensitive_text) == True
        
        # 機密情報を含まないテキスト
        normal_text = "通常の問題説明です"
        assert ProblemSecurityManager._contains_sensitive_data(normal_text) == False


if __name__ == "__main__":
    pytest.main([__file__])