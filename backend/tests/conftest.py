"""
ITSM Backend Test Configuration
pytest fixtures and test setup for FastAPI backend
"""

import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator, Generator
from fastapi import FastAPI
try:
    from fastapi.testclient import TestClient
except ImportError:
    from starlette.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

# Import real application components
import os
from unittest.mock import Mock

# Create a minimal test FastAPI app
import sys
sys.path.insert(0, '/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend')

# Import real application
try:
    from app.main import app
    print(f"✅ Successfully imported real FastAPI app. Routes: {len(app.routes)}")
except ImportError as e:
    print(f"❌ Failed to import real app: {e}")
    from fastapi import FastAPI
    app = FastAPI(title="Fallback Test ITSM API")

# Import real dependencies
try:
    from app.core.config import settings
    from app.db.base import Base
    from app.core.security import create_access_token
    from app.models.user import User
    from app.api.deps import get_db
    print("✅ Successfully imported real dependencies")
except ImportError as e:
    print(f"⚠️ Some real dependencies not available: {e}")
    # Fallback to mocks only if real imports fail
    settings = Mock()
    Base = Mock()
    create_access_token = Mock(return_value="test_access_token")
    User = Mock()
    get_db = Mock(return_value=None)

print(f"App type: {type(app)}")
print(f"App has dependency_overrides: {hasattr(app, 'dependency_overrides')}")

# Test Database Configuration
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Async Test Database Configuration
ASYNC_SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///./test_async.db"
async_engine = create_async_engine(ASYNC_SQLALCHEMY_DATABASE_URL)
AsyncTestingSessionLocal = sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
def db_session():
    """Create a test database session."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
    Base.metadata.drop_all(bind=engine)


@pytest_asyncio.fixture
async def async_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create an async test database session."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncTestingSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
    
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
def client(db_session) -> Generator[TestClient, None, None]:
    """Create a test client for the FastAPI app."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    # Override database dependency if get_db is available
    if hasattr(app, 'dependency_overrides') and get_db:
        app.dependency_overrides[get_db] = override_get_db
    
    # Fix TestClient initialization for newer versions
    test_client = TestClient(app)
    try:
        yield test_client
    finally:
        if hasattr(test_client, 'close'):
            test_client.close()
    
    # Clear overrides
    if hasattr(app, 'dependency_overrides'):
        app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def async_client(async_db_session) -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client."""
    def override_get_db():
        try:
            yield async_db_session
        finally:
            pass
    
    # Override database dependency if get_db is available
    if hasattr(app, 'dependency_overrides') and get_db:
        app.dependency_overrides[get_db] = override_get_db
    
    # Fix AsyncClient initialization for newer versions
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
    
    # Clear overrides
    if hasattr(app, 'dependency_overrides'):
        app.dependency_overrides.clear()


@pytest.fixture
def test_user_data():
    """Test user data fixture."""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "full_name": "Test User",
        "password": "testpassword123"
    }


@pytest.fixture
def test_user(db_session, test_user_data):
    """Create a test user in the database."""
    from passlib.context import CryptContext
    from app.models.user import UserRole
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed_password = pwd_context.hash(test_user_data["password"])
    
    user = User(
        email=test_user_data["email"],
        first_name="Test",
        last_name="User",
        hashed_password=hashed_password,
        role=UserRole.USER,
        department="IT",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers for test user."""
    access_token = create_access_token(subject=test_user.email)
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def admin_user_data():
    """Admin user data fixture."""
    return {
        "email": "admin@example.com",
        "username": "admin",
        "full_name": "Admin User",
        "password": "adminpassword123",
        "is_superuser": True
    }


@pytest.fixture
def admin_user(db_session, admin_user_data):
    """Create an admin user in the database."""
    # Mock admin user creation for testing
    admin = Mock()
    admin.id = 2
    admin.email = admin_user_data["email"]
    admin.username = admin_user_data["username"]
    admin.full_name = admin_user_data["full_name"]
    admin.is_superuser = True
    return admin


@pytest.fixture
def admin_headers(admin_user):
    """Create authentication headers for admin user."""
    access_token = create_access_token(subject=admin_user.email)
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def incident_data():
    """Sample incident data fixture."""
    return {
        "title": "Test Incident",
        "description": "This is a test incident",
        "priority": "high",
        "status": "open",
        "category": "technical",
        "impact": "major",
        "urgency": "high"
    }


@pytest.fixture
def problem_data():
    """Sample problem data fixture."""
    return {
        "title": "Test Problem",
        "description": "This is a test problem",
        "status": "investigating",
        "category": "technical",
        "impact": "major",
        "root_cause": "Unknown"
    }


@pytest.fixture
def change_data():
    """Sample change data fixture."""
    return {
        "title": "Test Change",
        "description": "This is a test change",
        "status": "planned",
        "category": "standard",
        "risk_level": "low",
        "implementation_date": "2024-12-01T10:00:00"
    }


@pytest.fixture
def ci_data():
    """Sample configuration item data fixture."""
    return {
        "name": "Test Server",
        "type": "server",
        "status": "operational",
        "environment": "production",
        "owner": "IT Team",
        "location": "Data Center 1"
    }


# Mock fixtures for external services
@pytest.fixture
def mock_email_service(mocker):
    """Mock email service."""
    return mocker.patch('app.services.email_service.EmailService')


@pytest.fixture
def mock_notification_service(mocker):
    """Mock notification service."""
    return mocker.patch('app.services.notification_service.NotificationService')


@pytest.fixture
def mock_redis(mocker):
    """Mock Redis connection."""
    mock_redis = Mock()
    mock_redis.ping.return_value = True
    mock_redis.get.return_value = None
    mock_redis.set.return_value = True
    mock_redis.delete.return_value = True
    return mock_redis


# Performance test fixtures
@pytest.fixture
def benchmark_config():
    """Benchmark configuration for performance tests."""
    return {
        "min_rounds": 5,
        "max_time": 1.0,
        "warmup": True
    }


# API test helpers
@pytest.fixture
def api_headers():
    """Standard API headers."""
    return {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }


# Clean up fixtures
@pytest.fixture(autouse=True)
def cleanup_files():
    """Clean up test files after each test."""
    yield
    # Clean up any test files if needed
    import os
    import glob
    
    test_files = glob.glob("./test*.db*")
    for file in test_files:
        try:
            os.remove(file)
        except OSError:
            pass


# Marker configuration
pytestmark = pytest.mark.asyncio