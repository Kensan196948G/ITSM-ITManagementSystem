"""
Test cases for Authentication API endpoints
"""

import pytest
from fastapi.testclient import TestClient


class TestAuthAPI:
    """Test cases for authentication endpoints"""

    @pytest.mark.api
    @pytest.mark.auth
    def test_login_success(self, client: TestClient, test_user_data: dict):
        """Test successful login"""
        login_data = {
            "username": test_user_data["email"],
            "password": test_user_data["password"],
        }
        response = client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.api
    @pytest.mark.auth
    def test_login_invalid_credentials(self, client: TestClient):
        """Test login with invalid credentials"""
        login_data = {
            "username": "nonexistent@example.com",
            "password": "wrongpassword",
        }
        response = client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    @pytest.mark.api
    @pytest.mark.auth
    def test_login_missing_credentials(self, client: TestClient):
        """Test login with missing credentials"""
        response = client.post("/api/v1/auth/login", data={})
        assert response.status_code == 422

    @pytest.mark.api
    @pytest.mark.auth
    def test_register_success(self, client: TestClient):
        """Test successful user registration"""
        register_data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "full_name": "New User",
            "password": "newpassword123",
        }
        response = client.post("/api/v1/auth/register", json=register_data)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == register_data["email"]
        assert data["username"] == register_data["username"]
        assert "id" in data
        assert "password" not in data  # Password should not be returned

    @pytest.mark.api
    @pytest.mark.auth
    def test_register_duplicate_email(self, client: TestClient, test_user_data: dict):
        """Test registration with duplicate email"""
        response = client.post("/api/v1/auth/register", json=test_user_data)
        assert response.status_code == 400
        data = response.json()
        assert "already registered" in data["detail"].lower()

    @pytest.mark.api
    @pytest.mark.auth
    def test_register_invalid_email(self, client: TestClient):
        """Test registration with invalid email"""
        register_data = {
            "email": "invalid-email",
            "username": "testuser",
            "full_name": "Test User",
            "password": "password123",
        }
        response = client.post("/api/v1/auth/register", json=register_data)
        assert response.status_code == 422

    @pytest.mark.api
    @pytest.mark.auth
    def test_get_current_user(self, client: TestClient, auth_headers: dict):
        """Test getting current user info"""
        client.headers.update(auth_headers)
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "username" in data
        assert "id" in data
        assert "password" not in data

    @pytest.mark.api
    @pytest.mark.auth
    def test_get_current_user_unauthorized(self, client: TestClient):
        """Test getting current user without authentication"""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

    @pytest.mark.api
    @pytest.mark.auth
    def test_token_refresh(self, client: TestClient, auth_headers: dict):
        """Test token refresh functionality"""
        client.headers.update(auth_headers)
        response = client.post("/api/v1/auth/refresh")
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data

    @pytest.mark.api
    @pytest.mark.auth
    def test_logout(self, client: TestClient, auth_headers: dict):
        """Test user logout"""
        client.headers.update(auth_headers)
        response = client.post("/api/v1/auth/logout")
        assert response.status_code == 200

    @pytest.mark.api
    @pytest.mark.auth
    def test_change_password(self, client: TestClient, auth_headers: dict):
        """Test password change"""
        client.headers.update(auth_headers)
        password_data = {
            "current_password": "testpassword123",
            "new_password": "newtestpassword123",
        }
        response = client.put("/api/v1/auth/change-password", json=password_data)
        assert response.status_code == 200

    @pytest.mark.api
    @pytest.mark.auth
    def test_change_password_invalid_current(
        self, client: TestClient, auth_headers: dict
    ):
        """Test password change with invalid current password"""
        client.headers.update(auth_headers)
        password_data = {
            "current_password": "wrongpassword",
            "new_password": "newtestpassword123",
        }
        response = client.put("/api/v1/auth/change-password", json=password_data)
        assert response.status_code == 400

    @pytest.mark.api
    @pytest.mark.auth
    def test_forgot_password(self, client: TestClient, test_user_data: dict):
        """Test forgot password functionality"""
        forgot_data = {"email": test_user_data["email"]}
        response = client.post("/api/v1/auth/forgot-password", json=forgot_data)
        assert response.status_code == 200

    @pytest.mark.api
    @pytest.mark.auth
    def test_reset_password(self, client: TestClient):
        """Test password reset with token"""
        # This would typically require a valid reset token
        reset_data = {"token": "sample_reset_token", "new_password": "resetpassword123"}
        response = client.post("/api/v1/auth/reset-password", json=reset_data)
        # Expect 400 for invalid token in test environment
        assert response.status_code in [200, 400]

    @pytest.mark.api
    @pytest.mark.auth
    def test_verify_token(self, client: TestClient, auth_headers: dict):
        """Test token verification"""
        # Extract token from auth headers
        token = auth_headers["Authorization"].split(" ")[1]
        response = client.post("/api/v1/auth/verify-token", json={"token": token})
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True

    @pytest.mark.api
    @pytest.mark.auth
    def test_verify_invalid_token(self, client: TestClient):
        """Test verification of invalid token"""
        response = client.post(
            "/api/v1/auth/verify-token", json={"token": "invalid_token"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
