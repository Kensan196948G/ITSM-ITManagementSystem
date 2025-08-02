"""
Basic test cases to verify test setup
"""

import pytest


class TestBasicSetup:
    """Basic tests to verify test infrastructure"""

    def test_basic_assertion(self):
        """Test basic assertion works"""
        assert True

    def test_basic_calculation(self):
        """Test basic calculation"""
        result = 2 + 2
        assert result == 4

    def test_string_operations(self):
        """Test string operations"""
        text = "Hello World"
        assert "Hello" in text
        assert text.upper() == "HELLO WORLD"

    def test_list_operations(self):
        """Test list operations"""
        items = [1, 2, 3, 4, 5]
        assert len(items) == 5
        assert 3 in items
        assert items[0] == 1

    def test_dictionary_operations(self):
        """Test dictionary operations"""
        data = {"name": "Test", "value": 123}
        assert data["name"] == "Test"
        assert data.get("value") == 123
        assert "name" in data

    @pytest.mark.parametrize("input,expected", [(1, 2), (2, 4), (3, 6), (4, 8)])
    def test_parametrized(self, input, expected):
        """Test parametrized test case"""
        result = input * 2
        assert result == expected

    def test_exception_handling(self):
        """Test exception handling"""
        with pytest.raises(ZeroDivisionError):
            _ = 1 / 0

    def test_fixtures_work(self, test_user_data):
        """Test that fixtures are working"""
        assert test_user_data is not None
        assert "email" in test_user_data
        assert "username" in test_user_data

    @pytest.mark.asyncio
    async def test_async_basic(self):
        """Test async functionality"""

        async def async_add(a, b):
            return a + b

        result = await async_add(2, 3)
        assert result == 5
