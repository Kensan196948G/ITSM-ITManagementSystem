"""
Enhanced test configuration and fixtures for ITSM system testing
"""
import pytest
import sys
import os
from pathlib import Path
from typing import Dict, Any
from datetime import datetime, timedelta
import json
from unittest.mock import Mock, patch
from faker import Faker

# Set environment variables BEFORE importing any backend modules
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_itsm.db")
os.environ.setdefault("ASYNC_DATABASE_URL", "sqlite+aiosqlite:///./test_itsm.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-purposes-only")
os.environ.setdefault("ENCRYPTION_KEY", "test-encryption-key-32-chars-long")
os.environ.setdefault("ENVIRONMENT", "testing")
os.environ.setdefault("LOG_LEVEL", "INFO")

# Add backend to Python path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

try:
    from fastapi.testclient import TestClient
    from backend.app.main import app
except ImportError:
    # Fallback if imports fail
    app = None
    TestClient = None

@pytest.fixture(scope="session")
def faker_instance():
    """Faker instance for generating test data"""
    return Faker()

@pytest.fixture
def test_config():
    """Basic test configuration"""
    return {
        "api_base_url": "http://127.0.0.1:8000",
        "auth_url": "http://127.0.0.1:8000/api/v1/auth",
        "timeout": 30,
        "test_database_url": "sqlite:///./test.db",
        "client_id": "test-client-id",
        "client_secret": "test-client-secret",
        "debug": True
    }

@pytest.fixture
def api_headers():
    """Common API headers for testing"""
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "ITSM-Test-Client/1.0"
    }

@pytest.fixture
def client():
    """FastAPI test client with proper app loading"""
    if app is None or TestClient is None:
        pytest.skip("FastAPI app or TestClient not available")
    
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def mock_client():
    """Mock client for testing without actual FastAPI app"""
    mock = Mock()
    mock.get.return_value.status_code = 200
    mock.get.return_value.json.return_value = {"status": "success"}
    mock.post.return_value.status_code = 201
    mock.post.return_value.json.return_value = {"status": "created"}
    mock.put.return_value.status_code = 200
    mock.put.return_value.json.return_value = {"status": "updated"}
    mock.delete.return_value.status_code = 204
    return mock

@pytest.fixture
def sample_incident_data(faker_instance) -> Dict[str, Any]:
    """Generate sample incident data for testing"""
    return {
        "title": faker_instance.sentence(nb_words=6),
        "description": faker_instance.text(max_nb_chars=200),
        "priority": faker_instance.random_element(elements=["low", "medium", "high", "critical"]),
        "category": faker_instance.random_element(elements=["hardware", "software", "network", "security"]),
        "reported_by": faker_instance.uuid4(),
        "assigned_to": faker_instance.uuid4(),
        "status": "open"
    }

@pytest.fixture
def sample_user_data(faker_instance) -> Dict[str, Any]:
    """Generate sample user data for testing"""
    return {
        "username": faker_instance.user_name(),
        "email": faker_instance.email(),
        "full_name": faker_instance.name(),
        "department": faker_instance.random_element(elements=["IT", "HR", "Finance", "Operations"]),
        "role": faker_instance.random_element(elements=["user", "technician", "admin"])
    }

@pytest.fixture
def sample_problem_data(faker_instance) -> Dict[str, Any]:
    """Generate sample problem data for testing"""
    return {
        "title": faker_instance.sentence(nb_words=8),
        "description": faker_instance.text(max_nb_chars=300),
        "related_incident_ids": [f"INC{faker_instance.random_int(min=100000, max=999999)}" for _ in range(3)],
        "impact_analysis": faker_instance.text(max_nb_chars=150),
        "priority": faker_instance.random_element(elements=["low", "medium", "high", "critical"]),
    }

@pytest.fixture
def sample_change_data(faker_instance) -> Dict[str, Any]:
    """Generate sample change request data for testing"""
    start_time = faker_instance.future_datetime(end_date="+30d")
    return {
        "title": faker_instance.sentence(nb_words=6),
        "type": faker_instance.random_element(elements=["normal", "emergency", "standard"]),
        "description": faker_instance.text(max_nb_chars=200),
        "justification": faker_instance.text(max_nb_chars=100),
        "risk_assessment": {
            "level": faker_instance.random_element(elements=["low", "medium", "high"]),
            "impact": faker_instance.text(max_nb_chars=100),
            "likelihood": faker_instance.random_element(elements=["low", "medium", "high"])
        },
        "implementation_plan": faker_instance.text(max_nb_chars=200),
        "rollback_plan": faker_instance.text(max_nb_chars=150),
        "scheduled_start": start_time.isoformat(),
        "scheduled_end": (start_time + timedelta(hours=2)).isoformat(),
        "affected_ci_ids": [faker_instance.uuid4()],
        "approvers": [faker_instance.uuid4() for _ in range(2)]
    }

@pytest.fixture
def sample_ci_data(faker_instance) -> Dict[str, Any]:
    """Generate sample CI data for testing"""
    return {
        "name": f"{faker_instance.word()}-{faker_instance.random_element(elements=['server', 'workstation', 'network'])}-{faker_instance.random_int(min=1, max=99):02d}",
        "type": faker_instance.random_element(elements=["server", "workstation", "network_device", "application"]),
        "attributes": {
            "manufacturer": faker_instance.random_element(elements=["Dell", "HP", "Cisco", "IBM"]),
            "model": faker_instance.word(),
            "serial_number": faker_instance.bothify(text="???###"),
            "location": f"DC{faker_instance.random_int(min=1, max=3)}-Rack{faker_instance.random_int(min=1, max=20):02d}-U{faker_instance.random_int(min=1, max=42):02d}"
        },
        "status": faker_instance.random_element(elements=["active", "inactive", "maintenance"]),
        "owner_id": faker_instance.uuid4()
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
def clean_test_environment():
    """Clean test environment before and after each test"""
    # Setup before test
    yield
    # Cleanup after test (if needed)
    pass

# Test marking helpers
def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line("markers", "integration: marks tests as integration tests")
    config.addinivalue_line("markers", "unit: marks tests as unit tests")
    config.addinivalue_line("markers", "slow: marks tests as slow running")
    config.addinivalue_line("markers", "auth: marks tests related to authentication")
    config.addinivalue_line("markers", "api: marks tests for API endpoints")
    config.addinivalue_line("markers", "critical: marks tests as critical functionality")
    config.addinivalue_line("markers", "incidents: marks tests for incident management")
    config.addinivalue_line("markers", "benchmark: marks tests for performance benchmarking")