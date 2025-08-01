"""
Base page object for ITSM E2E tests
"""
from playwright.sync_api import Page, Locator
from abc import ABC, abstractmethod
import time


class BasePage(ABC):
    """Base page object with common functionality"""
    
    def __init__(self, page: Page, base_url: str):
        self.page = page
        self.base_url = base_url
        self.timeout = 30000
    
    @abstractmethod
    def is_loaded(self) -> bool:
        """Check if the page is loaded"""
        pass
    
    def navigate_to(self, path: str = ""):
        """Navigate to a specific path"""
        url = f"{self.base_url}{path}"
        self.page.goto(url)
        self.wait_for_load()
    
    def wait_for_load(self):
        """Wait for page to load"""
        self.page.wait_for_load_state("networkidle")
        assert self.is_loaded(), f"Page {self.__class__.__name__} failed to load"
    
    def wait_for_element(self, selector: str, timeout: int = None) -> Locator:
        """Wait for element to be visible"""
        timeout = timeout or self.timeout
        return self.page.wait_for_selector(selector, timeout=timeout)
    
    def click_and_wait(self, selector: str, wait_for: str = None):
        """Click element and optionally wait for another element"""
        self.page.click(selector)
        if wait_for:
            self.wait_for_element(wait_for)
    
    def fill_and_wait(self, selector: str, value: str, wait_for: str = None):
        """Fill input and optionally wait for another element"""
        self.page.fill(selector, value)
        if wait_for:
            self.wait_for_element(wait_for)
    
    def select_option_and_wait(self, selector: str, value: str, wait_for: str = None):
        """Select option and optionally wait for another element"""
        self.page.select_option(selector, value)
        if wait_for:
            self.wait_for_element(wait_for)
    
    def wait_for_notification(self, message_type: str = "success") -> str:
        """Wait for notification message and return its text"""
        notification_selector = f'[data-testid="notification-{message_type}"]'
        notification = self.wait_for_element(notification_selector)
        return notification.text_content()
    
    def wait_for_modal(self, modal_id: str) -> Locator:
        """Wait for modal to appear"""
        modal_selector = f'[data-testid="modal-{modal_id}"]'
        return self.wait_for_element(modal_selector)
    
    def close_modal(self, modal_id: str):
        """Close modal by clicking close button"""
        close_button = f'[data-testid="modal-{modal_id}"] [data-testid="close-button"]'
        self.page.click(close_button)
        # Wait for modal to disappear
        self.page.wait_for_selector(f'[data-testid="modal-{modal_id}"]', state="detached")
    
    def get_table_row_count(self, table_selector: str) -> int:
        """Get number of rows in a table"""
        rows = self.page.locator(f"{table_selector} tbody tr")
        return rows.count()
    
    def get_table_cell_text(self, table_selector: str, row: int, column: int) -> str:
        """Get text from specific table cell (0-indexed)"""
        cell = self.page.locator(f"{table_selector} tbody tr").nth(row).locator("td").nth(column)
        return cell.text_content()
    
    def search_in_table(self, search_input_selector: str, search_term: str, table_selector: str):
        """Search in table and wait for results"""
        self.page.fill(search_input_selector, search_term)
        self.page.keyboard.press("Enter")
        # Wait for table to update
        time.sleep(1)  # Small delay for search to process
        self.page.wait_for_load_state("networkidle")
    
    def sort_table_by_column(self, table_selector: str, column_index: int):
        """Sort table by clicking column header"""
        header = self.page.locator(f"{table_selector} thead th").nth(column_index)
        header.click()
        self.page.wait_for_load_state("networkidle")
    
    def paginate_to_next(self, pagination_selector: str):
        """Go to next page in pagination"""
        next_button = f"{pagination_selector} [data-testid='next-page']"
        self.page.click(next_button)
        self.page.wait_for_load_state("networkidle")
    
    def paginate_to_previous(self, pagination_selector: str):
        """Go to previous page in pagination"""
        prev_button = f"{pagination_selector} [data-testid='prev-page']"
        self.page.click(prev_button)
        self.page.wait_for_load_state("networkidle")
    
    def get_current_url(self) -> str:
        """Get current page URL"""
        return self.page.url
    
    def take_screenshot(self, name: str):
        """Take screenshot for debugging"""
        self.page.screenshot(path=f"tests/reports/screenshots/{name}.png")


class AuthenticatedPage(BasePage):
    """Base class for pages that require authentication"""
    
    def __init__(self, page: Page, base_url: str):
        super().__init__(page, base_url)
        self.verify_authentication()
    
    def verify_authentication(self):
        """Verify user is authenticated"""
        # Check for user menu or logout button
        try:
            self.page.wait_for_selector('[data-testid="user-menu"]', timeout=5000)
        except:
            raise Exception("User is not authenticated")
    
    def logout(self):
        """Logout from the application"""
        self.page.click('[data-testid="user-menu"]')
        self.page.click('[data-testid="logout-button"]')
        self.page.wait_for_url(f"{self.base_url}/login")
    
    def navigate_to_menu(self, menu_item: str):
        """Navigate using main menu"""
        menu_selector = f'[data-testid="nav-{menu_item}"]'
        self.page.click(menu_selector)
        self.page.wait_for_load_state("networkidle")