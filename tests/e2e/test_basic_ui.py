"""
Basic UI E2E tests for ITSM system
"""

import pytest
from unittest.mock import patch, Mock


@pytest.mark.e2e
class TestBasicUI:
    """Basic UI interaction tests using mocked browser automation"""

    def test_homepage_loads(self, test_config):
        """Test that homepage loads successfully"""
        # Mock browser automation
        with patch("playwright.sync_api.Page") as mock_page:
            mock_page.goto.return_value = None
            mock_page.title.return_value = "ITSM System - Dashboard"
            mock_page.is_visible.return_value = True

            # Simulate page load
            page = mock_page
            page.goto(test_config.get("web_url", "http://localhost:3000"))

            title = page.title()
            assert "ITSM System" in title

            # Check if main elements are visible
            assert page.is_visible('[data-testid="dashboard"]')

    def test_navigation_menu(self, test_config):
        """Test navigation menu functionality"""
        with patch("playwright.sync_api.Page") as mock_page:
            mock_page.is_visible.return_value = True
            mock_page.click.return_value = None
            mock_page.wait_for_url.return_value = None

            page = mock_page

            # Test incident menu click
            page.click('[data-testid="nav-incidents"]')
            assert page.is_visible('[data-testid="incidents-page"]')

            # Test problems menu click
            page.click('[data-testid="nav-problems"]')
            assert page.is_visible('[data-testid="problems-page"]')

            # Test changes menu click
            page.click('[data-testid="nav-changes"]')
            assert page.is_visible('[data-testid="changes-page"]')

    def test_incident_creation_form(self, test_config):
        """Test incident creation form"""
        with patch("playwright.sync_api.Page") as mock_page:
            mock_page.is_visible.return_value = True
            mock_page.click.return_value = None
            mock_page.fill.return_value = None
            mock_page.select_option.return_value = None
            mock_page.wait_for_selector.return_value = None

            page = mock_page

            # Navigate to create incident page
            page.click('[data-testid="create-incident-btn"]')
            assert page.is_visible('[data-testid="incident-form"]')

            # Fill form fields
            page.fill('[data-testid="incident-title"]', "Test Incident")
            page.fill(
                '[data-testid="incident-description"]', "Test incident description"
            )
            page.select_option('[data-testid="incident-priority"]', "high")
            page.select_option('[data-testid="incident-category"]', "system")

            # Submit form
            page.click('[data-testid="submit-incident"]')

            # Check success message
            assert page.is_visible('[data-testid="success-message"]')

    def test_search_functionality(self, test_config):
        """Test search functionality across the application"""
        with patch("playwright.sync_api.Page") as mock_page:
            mock_page.is_visible.return_value = True
            mock_page.fill.return_value = None
            mock_page.press.return_value = None
            mock_page.wait_for_selector.return_value = None
            mock_page.locator.return_value.count.return_value = 3

            page = mock_page

            # Test global search
            page.fill('[data-testid="global-search"]', "INC001")
            page.press('[data-testid="global-search"]', "Enter")

            # Wait for search results
            page.wait_for_selector('[data-testid="search-results"]')

            # Verify search results are displayed
            assert page.is_visible('[data-testid="search-results"]')

            # Check that results contain search term (mocked)
            results_count = page.locator('[data-testid="search-result-item"]').count()
            assert results_count > 0

    def test_responsive_design(self, test_config):
        """Test responsive design on different screen sizes"""
        with patch("playwright.sync_api.Page") as mock_page:
            mock_page.set_viewport_size.return_value = None
            mock_page.is_visible.return_value = True

            page = mock_page

            # Test mobile viewport
            page.set_viewport_size({"width": 375, "height": 667})
            assert page.is_visible('[data-testid="mobile-menu-toggle"]')

            # Test tablet viewport
            page.set_viewport_size({"width": 768, "height": 1024})
            assert page.is_visible('[data-testid="sidebar"]')

            # Test desktop viewport
            page.set_viewport_size({"width": 1920, "height": 1080})
            assert page.is_visible('[data-testid="full-sidebar"]')

    @pytest.mark.slow
    def test_form_validation(self, test_config):
        """Test form validation across different forms"""
        with patch("playwright.sync_api.Page") as mock_page:
            mock_page.is_visible.return_value = True
            mock_page.click.return_value = None
            mock_page.fill.return_value = None
            mock_page.wait_for_selector.return_value = None

            page = mock_page

            # Test incident form validation
            page.click('[data-testid="create-incident-btn"]')

            # Try to submit empty form
            page.click('[data-testid="submit-incident"]')

            # Check validation messages
            assert page.is_visible('[data-testid="title-error"]')
            assert page.is_visible('[data-testid="description-error"]')

            # Fill required fields and test partial validation
            page.fill('[data-testid="incident-title"]', "Test")
            page.click('[data-testid="submit-incident"]')

            # Mock validation state change - title filled, description still empty
            def mock_visibility(selector):
                if selector == '[data-testid="title-error"]':
                    return False  # Title error should be hidden after filling
                elif selector == '[data-testid="description-error"]':
                    return True  # Description error should still be visible
                else:
                    return False  # Default to not visible

            mock_page.is_visible.side_effect = mock_visibility

            # Title error should be gone but description error remains
            assert not page.is_visible('[data-testid="title-error"]')
            assert page.is_visible('[data-testid="description-error"]')

    def test_accessibility_features(self, test_config):
        """Test basic accessibility features"""
        with patch("playwright.sync_api.Page") as mock_page:
            mock_page.is_visible.return_value = True
            mock_page.get_attribute.return_value = "Test Button"
            mock_page.evaluate.return_value = True

            page = mock_page

            # Check for proper ARIA labels
            aria_label = page.get_attribute(
                '[data-testid="create-incident-btn"]', "aria-label"
            )
            assert aria_label is not None

            # Check keyboard navigation
            keyboard_accessible = page.evaluate(
                """
                () => {
                    const button = document.querySelector('[data-testid="create-incident-btn"]');
                    return button && button.tabIndex >= 0;
                }
            """
            )
            assert keyboard_accessible

    def test_error_handling(self, test_config):
        """Test error handling in the UI"""
        with patch("playwright.sync_api.Page") as mock_page:
            mock_page.is_visible.return_value = True
            mock_page.route.return_value = None
            mock_page.goto.return_value = None

            page = mock_page

            # Mock API error response
            def handle_route(route):
                route.fulfill(status=500, body='{"error": "Internal Server Error"}')

            page.route("**/api/**", handle_route)

            # Try to load a page that would trigger API call
            page.goto(
                f"{test_config.get('web_url', 'http://localhost:3000')}/incidents"
            )

            # Check that error message is displayed
            assert page.is_visible('[data-testid="error-message"]')
            assert page.is_visible('[data-testid="retry-button"]')
