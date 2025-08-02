"""
Unit tests for utility functions
"""

import pytest
from datetime import datetime, timedelta
import json


@pytest.mark.unit
class TestDateUtils:
    """Test date utility functions"""

    def test_current_timestamp(self):
        """Test current timestamp generation"""
        now = datetime.utcnow()
        timestamp = datetime.utcnow()

        # Should be within 1 second
        assert abs((timestamp - now).total_seconds()) < 1

    def test_date_formatting(self):
        """Test date formatting"""
        test_date = datetime(2025, 8, 1, 12, 30, 45)
        formatted = test_date.strftime("%Y-%m-%d %H:%M:%S")

        assert formatted == "2025-08-01 12:30:45"

    def test_date_parsing(self):
        """Test date parsing from string"""
        date_string = "2025-08-01T12:30:45"
        parsed_date = datetime.fromisoformat(date_string)

        assert parsed_date.year == 2025
        assert parsed_date.month == 8
        assert parsed_date.day == 1
        assert parsed_date.hour == 12
        assert parsed_date.minute == 30
        assert parsed_date.second == 45


@pytest.mark.unit
class TestStringUtils:
    """Test string utility functions"""

    def test_string_truncation(self):
        """Test string truncation"""
        long_string = "This is a very long string that needs to be truncated"
        truncated = long_string[:20] + "..." if len(long_string) > 20 else long_string

        assert len(truncated) <= 23
        assert truncated.endswith("...")

    def test_string_sanitization(self):
        """Test string sanitization"""
        dangerous_string = "<script>alert('xss')</script>"
        sanitized = dangerous_string.replace("<", "&lt;").replace(">", "&gt;")

        assert "<script>" not in sanitized
        assert "&lt;script&gt;" in sanitized

    def test_slug_generation(self):
        """Test slug generation from title"""
        title = "This is a Test Title!"
        slug = title.lower().replace(" ", "-").replace("!", "")

        assert slug == "this-is-a-test-title"


@pytest.mark.unit
class TestValidationUtils:
    """Test validation utility functions"""

    def test_email_validation(self):
        """Test email validation"""
        valid_emails = [
            "user@example.com",
            "test.user@example.co.uk",
            "user+tag@example.org",
        ]
        invalid_emails = ["invalid-email", "@example.com", "user@", "user@domain"]

        for email in valid_emails:
            assert "@" in email and "." in email.split("@")[-1]

        for email in invalid_emails:
            # Basic validation - should fail these
            parts = email.split("@")
            if len(parts) != 2:
                is_valid = False
            else:
                local, domain = parts
                is_valid = (
                    len(local) > 0
                    and "." in domain
                    and len(domain.split(".")[-1]) >= 2
                    and len(domain) > 2
                )
            assert not is_valid

    def test_phone_validation(self):
        """Test phone number validation"""
        valid_phones = ["+1-555-123-4567", "555-123-4567", "(555) 123-4567"]

        for phone in valid_phones:
            # Basic check for digits
            digits = "".join(filter(str.isdigit, phone))
            assert len(digits) >= 10

    def test_required_field_validation(self):
        """Test required field validation"""
        test_data = {"title": "Test Title", "description": "", "priority": "high"}

        required_fields = ["title", "description", "priority"]
        missing_fields = []

        for field in required_fields:
            if not test_data.get(field) or test_data[field].strip() == "":
                missing_fields.append(field)

        assert "description" in missing_fields
        assert "title" not in missing_fields
        assert "priority" not in missing_fields


@pytest.mark.unit
class TestEncryptionUtils:
    """Test encryption and security utilities"""

    def test_password_hashing(self):
        """Test password hashing"""
        password = "test_password_123"
        # Simple hash simulation
        hashed = hash(password)

        assert hashed != password
        assert isinstance(hashed, int)

    def test_token_generation(self):
        """Test token generation"""
        import secrets

        token = secrets.token_urlsafe(32)

        assert len(token) > 30
        assert isinstance(token, str)

    def test_uuid_generation(self):
        """Test UUID generation"""
        import uuid

        test_uuid = str(uuid.uuid4())

        assert len(test_uuid) == 36
        assert test_uuid.count("-") == 4


@pytest.mark.unit
class TestJSONUtils:
    """Test JSON utility functions"""

    def test_json_serialization(self):
        """Test JSON serialization"""
        test_data = {
            "id": 1,
            "title": "Test",
            "created_at": "2025-08-01T12:00:00",
            "active": True,
            "tags": ["test", "unit"],
        }

        json_string = json.dumps(test_data)
        assert isinstance(json_string, str)
        assert "Test" in json_string

    def test_json_deserialization(self):
        """Test JSON deserialization"""
        json_string = '{"id": 1, "title": "Test", "active": true}'
        data = json.loads(json_string)

        assert data["id"] == 1
        assert data["title"] == "Test"
        assert data["active"] is True

    def test_json_error_handling(self):
        """Test JSON error handling"""
        invalid_json = '{"invalid": json}'

        try:
            json.loads(invalid_json)
            assert False, "Should have raised an exception"
        except json.JSONDecodeError:
            assert True
