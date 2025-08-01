"""
Authentication API tests for ITSM system
"""
import pytest
import requests
from unittest.mock import Mock, patch
import json


@pytest.mark.api
@pytest.mark.auth
class TestAuthentication:
    """Authentication endpoint tests"""

    def test_oauth_token_request_success(self, test_config):
        """Test successful OAuth token request"""
        mock_response = {
            "access_token": "eyJhbGciOiJSUzI1NiIs...",
            "token_type": "Bearer",
            "expires_in": 3600,
            "refresh_token": "8xLOxBtZp8",
            "scope": "read write"
        }
        
        with patch('requests.post') as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = mock_response
            
            # Simulate token request
            auth_data = {
                "grant_type": "authorization_code",
                "code": "test_auth_code",
                "redirect_uri": "https://app.example.com/callback",
                "client_id": test_config["client_id"],
                "client_secret": test_config["client_secret"]
            }
            
            response = requests.post(
                f"{test_config['auth_url']}/token",
                data=auth_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            assert response.status_code == 200
            token_data = response.json()
            assert "access_token" in token_data
            assert token_data["token_type"] == "Bearer"
            assert token_data["expires_in"] == 3600

    def test_oauth_token_request_invalid_client(self, test_config):
        """Test OAuth token request with invalid client credentials"""
        mock_error_response = {
            "error": "invalid_client",
            "error_description": "Client authentication failed"
        }
        
        with patch('requests.post') as mock_post:
            mock_post.return_value.status_code = 401
            mock_post.return_value.json.return_value = mock_error_response
            
            auth_data = {
                "grant_type": "authorization_code",
                "code": "test_auth_code",
                "redirect_uri": "https://app.example.com/callback",
                "client_id": "invalid_client",
                "client_secret": "invalid_secret"
            }
            
            response = requests.post(
                f"{test_config['auth_url']}/token",
                data=auth_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            assert response.status_code == 401
            error_data = response.json()
            assert error_data["error"] == "invalid_client"

    def test_oauth_token_request_invalid_grant(self, test_config):
        """Test OAuth token request with invalid authorization code"""
        mock_error_response = {
            "error": "invalid_grant",
            "error_description": "The provided authorization grant is invalid"
        }
        
        with patch('requests.post') as mock_post:
            mock_post.return_value.status_code = 400
            mock_post.return_value.json.return_value = mock_error_response
            
            auth_data = {
                "grant_type": "authorization_code",
                "code": "invalid_code",
                "redirect_uri": "https://app.example.com/callback",
                "client_id": test_config["client_id"],
                "client_secret": test_config["client_secret"]
            }
            
            response = requests.post(
                f"{test_config['auth_url']}/token",
                data=auth_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            assert response.status_code == 400
            error_data = response.json()
            assert error_data["error"] == "invalid_grant"

    def test_refresh_token_success(self, test_config):
        """Test successful token refresh"""
        mock_response = {
            "access_token": "new_access_token",
            "token_type": "Bearer",
            "expires_in": 3600,
            "refresh_token": "new_refresh_token",
            "scope": "read write"
        }
        
        with patch('requests.post') as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = mock_response
            
            refresh_data = {
                "grant_type": "refresh_token",
                "refresh_token": "valid_refresh_token",
                "client_id": test_config["client_id"],
                "client_secret": test_config["client_secret"]
            }
            
            response = requests.post(
                f"{test_config['auth_url']}/token",
                data=refresh_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            assert response.status_code == 200
            token_data = response.json()
            assert token_data["access_token"] == "new_access_token"

    def test_api_request_with_valid_token(self, test_config, auth_token):
        """Test API request with valid Bearer token"""
        mock_response = {"data": [{"id": "INC000123", "title": "Test incident"}]}
        
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = mock_response
            
            headers = {
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(
                f"{test_config['base_url']}/incidents",
                headers=headers
            )
            
            assert response.status_code == 200
            assert "data" in response.json()

    def test_api_request_with_invalid_token(self, test_config):
        """Test API request with invalid Bearer token"""
        mock_error_response = {
            "error": {
                "code": "INVALID_TOKEN",
                "message": "The access token is invalid or expired"
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 401
            mock_get.return_value.json.return_value = mock_error_response
            
            headers = {
                "Authorization": "Bearer invalid_token",
                "Content-Type": "application/json"
            }
            
            response = requests.get(
                f"{test_config['base_url']}/incidents",
                headers=headers
            )
            
            assert response.status_code == 401
            error_data = response.json()
            assert error_data["error"]["code"] == "INVALID_TOKEN"

    def test_api_request_without_token(self, test_config):
        """Test API request without authentication token"""
        mock_error_response = {
            "error": {
                "code": "UNAUTHORIZED",
                "message": "Authentication required"
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 401
            mock_get.return_value.json.return_value = mock_error_response
            
            response = requests.get(f"{test_config['base_url']}/incidents")
            
            assert response.status_code == 401
            error_data = response.json()
            assert error_data["error"]["code"] == "UNAUTHORIZED"

    def test_token_expiration_handling(self, test_config):
        """Test handling of expired tokens"""
        mock_error_response = {
            "error": {
                "code": "TOKEN_EXPIRED",
                "message": "The access token has expired"
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_get.return_value.status_code = 401
            mock_get.return_value.json.return_value = mock_error_response
            
            headers = {
                "Authorization": "Bearer expired_token",
                "Content-Type": "application/json"
            }
            
            response = requests.get(
                f"{test_config['base_url']}/incidents",
                headers=headers
            )
            
            assert response.status_code == 401
            error_data = response.json()
            assert error_data["error"]["code"] == "TOKEN_EXPIRED"

    @pytest.mark.slow
    def test_rate_limiting_with_authentication(self, test_config, auth_token):
        """Test rate limiting behavior with valid authentication"""
        mock_response = Mock()
        mock_response.status_code = 429
        mock_response.headers = {
            "X-RateLimit-Limit": "1000",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": "1640995200"
        }
        mock_response.json.return_value = {
            "error": {
                "code": "RATE_LIMIT_EXCEEDED",
                "message": "Rate limit exceeded"
            }
        }
        
        with patch('requests.get', return_value=mock_response):
            headers = {
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(
                f"{test_config['base_url']}/incidents",
                headers=headers
            )
            
            assert response.status_code == 429
            assert "X-RateLimit-Limit" in response.headers
            assert response.headers["X-RateLimit-Remaining"] == "0"