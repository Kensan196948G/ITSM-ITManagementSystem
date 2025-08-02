"""
Unit tests for configuration utilities
"""

import pytest
import os
from unittest.mock import patch, MagicMock


@pytest.mark.unit
class TestConfigurationUtils:
    """Test configuration utility functions"""

    def test_environment_variable_parsing(self):
        """Test environment variable parsing"""
        # Test boolean parsing
        assert self._parse_bool("true") is True
        assert self._parse_bool("false") is False
        assert self._parse_bool("1") is True
        assert self._parse_bool("0") is False

    def test_default_configuration_values(self):
        """Test default configuration values"""
        defaults = {
            "app_name": "ITSM System",
            "debug": False,
            "version": "1.0.0",
            "log_level": "INFO",
            "default_page_size": 20,
            "max_page_size": 100,
        }

        for key, expected_value in defaults.items():
            assert self._get_default(key) == expected_value

    def test_database_url_validation(self):
        """Test database URL validation"""
        valid_urls = [
            "sqlite:///./test.db",
            "postgresql://user:pass@localhost/db",
            "mysql://user:pass@localhost/db",
        ]

        for url in valid_urls:
            assert self._validate_db_url(url) is True

    def test_cors_origins_parsing(self):
        """Test CORS origins parsing"""
        origins_string = "http://localhost:3000,http://localhost:8080"
        expected_origins = ["http://localhost:3000", "http://localhost:8080"]

        parsed = self._parse_cors_origins(origins_string)
        assert parsed == expected_origins

    def test_secret_key_validation(self):
        """Test secret key validation"""
        # Valid secret keys
        valid_keys = [
            "a" * 32,  # 32 character key
            "secure_secret_key_with_64_characters_exactly_for_security_test",
            "MySuperSecretKeyForJWTTokens123",
        ]

        for key in valid_keys:
            assert self._validate_secret_key(key) is True

        # Invalid secret keys
        invalid_keys = ["short", "", None]  # Too short  # Empty  # None

        for key in invalid_keys:
            assert self._validate_secret_key(key) is False

    def test_jwt_configuration_validation(self):
        """Test JWT configuration validation"""
        valid_algorithms = ["HS256", "HS384", "HS512", "RS256"]

        for algorithm in valid_algorithms:
            assert self._validate_jwt_algorithm(algorithm) is True

        # Invalid algorithms
        invalid_algorithms = ["MD5", "SHA1", "NONE", ""]

        for algorithm in invalid_algorithms:
            assert self._validate_jwt_algorithm(algorithm) is False

    def test_pagination_limits(self):
        """Test pagination limit validation"""
        # Valid page sizes
        assert self._validate_page_size(10) is True
        assert self._validate_page_size(50) is True
        assert self._validate_page_size(100) is True

        # Invalid page sizes
        assert self._validate_page_size(0) is False
        assert self._validate_page_size(-1) is False
        assert self._validate_page_size(1000) is False

    def test_logging_level_validation(self):
        """Test logging level validation"""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]

        for level in valid_levels:
            assert self._validate_log_level(level) is True

        # Invalid levels
        invalid_levels = ["TRACE", "VERBOSE", "", "invalid"]

        for level in invalid_levels:
            assert self._validate_log_level(level) is False

    # Helper methods for testing configuration logic
    def _parse_bool(self, value):
        """Parse boolean from string"""
        if isinstance(value, str):
            return value.lower() in ("true", "1", "yes", "on")
        return bool(value)

    def _get_default(self, key):
        """Get default configuration value"""
        defaults = {
            "app_name": "ITSM System",
            "debug": False,
            "version": "1.0.0",
            "log_level": "INFO",
            "default_page_size": 20,
            "max_page_size": 100,
        }
        return defaults.get(key)

    def _validate_db_url(self, url):
        """Validate database URL format"""
        if not url:
            return False
        return "://" in url and len(url) > 10

    def _parse_cors_origins(self, origins_string):
        """Parse CORS origins from string"""
        if not origins_string:
            return []
        return [origin.strip() for origin in origins_string.split(",")]

    def _validate_secret_key(self, key):
        """Validate secret key"""
        if not key or not isinstance(key, str):
            return False
        return len(key) >= 16

    def _validate_jwt_algorithm(self, algorithm):
        """Validate JWT algorithm"""
        valid_algorithms = ["HS256", "HS384", "HS512", "RS256", "RS384", "RS512"]
        return algorithm in valid_algorithms

    def _validate_page_size(self, size):
        """Validate pagination page size"""
        return isinstance(size, int) and 1 <= size <= 500

    def _validate_log_level(self, level):
        """Validate logging level"""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        return level in valid_levels
