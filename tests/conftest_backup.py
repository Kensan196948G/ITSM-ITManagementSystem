"""
pytest configuration and fixtures for ITSM system testing
"""

import json
import os
import pytest
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, Generator
from faker import Faker
from unittest.mock import Mock

# Configuration
TEST_CONFIG = {
    "base_url": os.getenv("ITSM_BASE_URL", "http://localhost:8000/api/v1"),
    "auth_url": os.getenv("ITSM_AUTH_URL", "http://localhost:8000/auth"),
    "test_user": os.getenv("ITSM_TEST_USER", "test@example.com"),
    "test_password": os.getenv("ITSM_TEST_PASSWORD", "test_password"),
    "client_id": os.getenv("ITSM_CLIENT_ID", "test_client"),
    "client_secret": os.getenv("ITSM_CLIENT_SECRET", "test_secret"),
    "timeout": int(os.getenv("ITSM_TIMEOUT", "30")),
}

fake = Faker("ja_JP")


@pytest.fixture(scope="session")
def test_config() -> Dict[str, Any]:
    """Test configuration fixture"""
    return TEST_CONFIG


@pytest.fixture(scope="session")
def faker_instance() -> Faker:
    """Faker instance for test data generation"""
    return fake


@pytest.fixture(scope="session")
def auth_token(test_config) -> str:
    """
    Authenticate and return access token for API testing
    In production, this would make actual auth requests
    """
    # Mock implementation for testing
    return "mock_jwt_token_for_testing"


@pytest.fixture(scope="session")
def api_headers(auth_token) -> Dict[str, str]:
    """Common API headers for requests"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Request-ID": fake.uuid4(),
    }


@pytest.fixture(scope="session")
def api_client(test_config, api_headers):
    """HTTP client for API testing"""
    session = requests.Session()
    session.headers.update(api_headers)
    session.timeout = test_config["timeout"]
    return session


@pytest.fixture
def sample_incident_data(faker_instance) -> Dict[str, Any]:
    """Generate sample incident data for testing"""
    return {
        "title": faker_instance.sentence(nb_words=6),
        "description": faker_instance.text(max_nb_chars=200),
        "category_id": faker_instance.random_element(
            elements=["cat_001", "cat_002", "cat_003"]
        ),
        "priority": faker_instance.random_element(
            elements=["low", "medium", "high", "critical"]
        ),
        "impact": faker_instance.random_element(
            elements=["user", "department", "company"]
        ),
        "affected_ci_ids": [
            faker_instance.uuid4()
            for _ in range(faker_instance.random_int(min=1, max=3))
        ],
    }


@pytest.fixture
def sample_problem_data(faker_instance) -> Dict[str, Any]:
    """Generate sample problem data for testing"""
    return {
        "title": faker_instance.sentence(nb_words=8),
        "description": faker_instance.text(max_nb_chars=300),
        "related_incident_ids": [
            f"INC{faker_instance.random_int(min=100000, max=999999)}" for _ in range(3)
        ],
        "impact_analysis": faker_instance.text(max_nb_chars=150),
        "priority": faker_instance.random_element(
            elements=["low", "medium", "high", "critical"]
        ),
    }


@pytest.fixture
def sample_change_data(faker_instance) -> Dict[str, Any]:
    """Generate sample change request data for testing"""
    start_time = faker_instance.future_datetime(end_date="+30d")
    return {
        "title": faker_instance.sentence(nb_words=6),
        "type": faker_instance.random_element(
            elements=["normal", "emergency", "standard"]
        ),
        "description": faker_instance.text(max_nb_chars=200),
        "justification": faker_instance.text(max_nb_chars=100),
        "risk_assessment": {
            "level": faker_instance.random_element(elements=["low", "medium", "high"]),
            "impact": faker_instance.text(max_nb_chars=100),
            "likelihood": faker_instance.random_element(
                elements=["low", "medium", "high"]
            ),
        },
        "implementation_plan": faker_instance.text(max_nb_chars=200),
        "rollback_plan": faker_instance.text(max_nb_chars=150),
        "scheduled_start": start_time.isoformat(),
        "scheduled_end": (start_time + timedelta(hours=2)).isoformat(),
        "affected_ci_ids": [faker_instance.uuid4()],
        "approvers": [faker_instance.uuid4() for _ in range(2)],
    }


@pytest.fixture
def sample_ci_data(faker_instance) -> Dict[str, Any]:
    """Generate sample CI data for testing"""
    return {
        "name": f"{faker_instance.word()}-{faker_instance.random_element(elements=['server', 'workstation', 'network'])}-{faker_instance.random_int(min=1, max=99):02d}",
        "type": faker_instance.random_element(
            elements=["server", "workstation", "network_device", "application"]
        ),
        "attributes": {
            "manufacturer": faker_instance.random_element(
                elements=["Dell", "HP", "Cisco", "IBM"]
            ),
            "model": faker_instance.word(),
            "serial_number": faker_instance.bothify(text="???###"),
            "location": f"DC{faker_instance.random_int(min=1, max=3)}-Rack{faker_instance.random_int(min=1, max=20):02d}-U{faker_instance.random_int(min=1, max=42):02d}",
        },
        "status": faker_instance.random_element(
            elements=["active", "inactive", "maintenance"]
        ),
        "owner_id": faker_instance.uuid4(),
    }


@pytest.fixture
def mock_response():
    """Mock HTTP response for testing"""
    mock = Mock()
    mock.status_code = 200
    mock.json.return_value = {"status": "success"}
    mock.headers = {"Content-Type": "application/json"}
    return mock


@pytest.fixture(autouse=True)
def cleanup_test_data():
    """Cleanup test data after each test"""
    yield
    # Placeholder for cleanup logic
    # In production, this would clean up test data from the system


@pytest.fixture(scope="session")
def test_report_data():
    """Initialize test report data collection"""
    return {
        "start_time": datetime.now(),
        "test_results": [],
        "coverage": {},
        "performance": {},
    }


def pytest_runtest_makereport(item, call):
    """Collect test result data for reporting"""
    if call.when == "call":
        test_result = {
            "test_name": item.name,
            "outcome": call.excinfo is None,
            "duration": call.duration,
            "timestamp": datetime.now().isoformat(),
            "markers": [marker.name for marker in item.iter_markers()],
        }

        if hasattr(item.session, "test_report_data"):
            item.session.test_report_data["test_results"].append(test_result)


def pytest_sessionstart(session):
    """Initialize session-level test data"""
    session.test_report_data = {
        "start_time": datetime.now(),
        "test_results": [],
        "coverage": {},
        "performance": {},
    }


def pytest_sessionfinish(session, exitstatus):
    """Generate final test report"""
    if hasattr(session, "test_report_data"):
        end_time = datetime.now()
        session.test_report_data["end_time"] = end_time
        session.test_report_data["duration"] = (
            end_time - session.test_report_data["start_time"]
        ).total_seconds()
        session.test_report_data["exit_status"] = exitstatus

        # Save test results to JSON file
        os.makedirs("tests/reports", exist_ok=True)
        with open("tests/reports/session_report.json", "w") as f:
            json.dump(session.test_report_data, f, indent=2, default=str)


# Playwright fixtures for E2E testing
@pytest.fixture(scope="session")
def playwright_config():
    """Playwright configuration for E2E tests"""
    # Force localhost for testing environment
    base_url = "http://localhost:3000"
    print(f"DEBUG: Using base_url: {base_url}")
    return {
        "headless": os.getenv("HEADLESS", "true").lower() == "true",
        "base_url": base_url,
        "timeout": int(os.getenv("PLAYWRIGHT_TIMEOUT", "30000")),
        "viewport": {"width": 1920, "height": 1080},
        "user_agent": "ITSM-Test-Agent/1.0",
    }


# Performance testing fixtures
@pytest.fixture
def benchmark_config():
    """Configuration for performance benchmarks"""
    return {
        "rounds": int(os.getenv("BENCHMARK_ROUNDS", "5")),
        "warmup_rounds": int(os.getenv("BENCHMARK_WARMUP", "1")),
        "timeout": int(os.getenv("BENCHMARK_TIMEOUT", "60")),
    }
