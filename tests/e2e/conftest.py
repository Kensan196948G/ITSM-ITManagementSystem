"""
Playwright E2E test configuration and fixtures
"""
import pytest
import os
from playwright.sync_api import Playwright, Browser, BrowserContext, Page
from typing import Generator


@pytest.fixture(scope="session")
def playwright_setup() -> Generator[Playwright, None, None]:
    """Setup Playwright for the session"""
    from playwright.sync_api import sync_playwright
    
    with sync_playwright() as p:
        yield p


@pytest.fixture(scope="session")
def browser(playwright_setup: Playwright, playwright_config) -> Generator[Browser, None, None]:
    """Launch browser for the session"""
    browser = playwright_setup.chromium.launch(
        headless=playwright_config["headless"],
        args=["--no-sandbox", "--disable-dev-shm-usage"]
    )
    yield browser
    browser.close()


@pytest.fixture
def context(browser: Browser, playwright_config) -> Generator[BrowserContext, None, None]:
    """Create a new browser context for each test"""
    context = browser.new_context(
        viewport=playwright_config["viewport"],
        user_agent=playwright_config["user_agent"],
        # Record video for failed tests
        record_video_dir="tests/reports/videos/" if os.getenv("RECORD_VIDEO") == "true" else None,
        record_video_size={"width": 1920, "height": 1080}
    )
    yield context
    context.close()


@pytest.fixture
def page(context: BrowserContext) -> Generator[Page, None, None]:
    """Create a new page for each test"""
    page = context.new_page()
    
    # Set default timeout
    page.set_default_timeout(30000)
    
    # Add console log capturing
    page.on("console", lambda msg: print(f"Console [{msg.type}]: {msg.text}"))
    
    # Add error capturing
    page.on("pageerror", lambda err: print(f"Page Error: {err}"))
    
    yield page
    page.close()


@pytest.fixture
def authenticated_page(page: Page, playwright_config) -> Page:
    """Login and return authenticated page"""
    # Navigate to login page
    page.goto(f"{playwright_config['base_url']}/login")
    
    # Fill login form
    page.fill('[data-testid="email-input"]', "test@example.com")
    page.fill('[data-testid="password-input"]', "test_password")
    
    # Submit login
    page.click('[data-testid="login-button"]')
    
    # Wait for navigation to dashboard
    page.wait_for_url(f"{playwright_config['base_url']}/dashboard")
    
    return page


@pytest.fixture
def test_data():
    """Test data for E2E tests"""
    return {
        "incident": {
            "title": "E2E Test Incident - メールサーバー障害",
            "description": "E2Eテスト用のインシデントです。メールサーバーに接続できません。",
            "priority": "high",
            "category": "メール"
        },
        "problem": {
            "title": "E2E Test Problem - 定期的なサーバー停止",
            "description": "E2Eテスト用の問題です。サーバーが定期的に停止します。",
            "priority": "medium"
        },
        "change": {
            "title": "E2E Test Change - システムアップデート",
            "description": "E2Eテスト用の変更要求です。システムアップデートを実施します。",
            "type": "normal",
            "risk_level": "medium"
        }
    }


@pytest.fixture(autouse=True)
def cleanup_test_data_e2e(request):
    """Cleanup test data created during E2E tests"""
    created_items = []
    
    def add_cleanup_item(item_type, item_id):
        created_items.append((item_type, item_id))
    
    request.node.add_cleanup_item = add_cleanup_item
    
    yield
    
    # Cleanup logic would go here
    # In a real implementation, this would clean up test data from the system
    for item_type, item_id in created_items:
        print(f"Cleaning up {item_type}: {item_id}")


def pytest_configure(config):
    """Configure pytest for E2E tests"""
    # Create video directory if needed
    if os.getenv("RECORD_VIDEO") == "true":
        os.makedirs("tests/reports/videos", exist_ok=True)
    
    # Add custom markers
    config.addinivalue_line("markers", "e2e_smoke: E2E smoke tests")
    config.addinivalue_line("markers", "e2e_critical: Critical E2E functionality")
    config.addinivalue_line("markers", "e2e_regression: E2E regression tests")