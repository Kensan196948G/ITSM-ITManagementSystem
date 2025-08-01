"""
Incident management page objects for E2E tests
"""
from playwright.sync_api import Page, Locator
from .base_page import AuthenticatedPage
from typing import Dict, Any


class IncidentListPage(AuthenticatedPage):
    """Incident list page object"""
    
    def __init__(self, page: Page, base_url: str):
        super().__init__(page, base_url)
        self.navigate_to("/incidents")
    
    def is_loaded(self) -> bool:
        """Check if incident list page is loaded"""
        try:
            self.page.wait_for_selector('[data-testid="incidents-table"]', timeout=5000)
            return True
        except:
            return False
    
    def create_new_incident(self) -> 'IncidentCreatePage':
        """Click create new incident button"""
        self.page.click('[data-testid="create-incident-button"]')
        return IncidentCreatePage(self.page, self.base_url)
    
    def search_incidents(self, search_term: str):
        """Search for incidents"""
        self.search_in_table('[data-testid="incident-search"]', search_term, '[data-testid="incidents-table"]')
    
    def filter_by_status(self, status: str):
        """Filter incidents by status"""
        self.page.click('[data-testid="status-filter"]')
        self.page.click(f'[data-testid="status-option-{status}"]')
        self.page.wait_for_load_state("networkidle")
    
    def filter_by_priority(self, priority: str):
        """Filter incidents by priority"""
        self.page.click('[data-testid="priority-filter"]')
        self.page.click(f'[data-testid="priority-option-{priority}"]')
        self.page.wait_for_load_state("networkidle")
    
    def get_incident_count(self) -> int:
        """Get number of incidents in the table"""
        return self.get_table_row_count('[data-testid="incidents-table"]')
    
    def click_incident(self, incident_id: str) -> 'IncidentDetailPage':
        """Click on specific incident to view details"""
        self.page.click(f'[data-testid="incident-row-{incident_id}"]')
        return IncidentDetailPage(self.page, self.base_url)
    
    def get_incident_data(self, row_index: int) -> Dict[str, str]:
        """Get incident data from table row"""
        table_selector = '[data-testid="incidents-table"]'
        return {
            "id": self.get_table_cell_text(table_selector, row_index, 0),
            "title": self.get_table_cell_text(table_selector, row_index, 1),
            "status": self.get_table_cell_text(table_selector, row_index, 2),
            "priority": self.get_table_cell_text(table_selector, row_index, 3),
            "assignee": self.get_table_cell_text(table_selector, row_index, 4),
            "created_at": self.get_table_cell_text(table_selector, row_index, 5)
        }


class IncidentCreatePage(AuthenticatedPage):
    """Incident creation page object"""
    
    def __init__(self, page: Page, base_url: str):
        super().__init__(page, base_url)
    
    def is_loaded(self) -> bool:
        """Check if incident create page is loaded"""
        try:
            self.page.wait_for_selector('[data-testid="incident-create-form"]', timeout=5000)
            return True
        except:
            return False
    
    def fill_incident_form(self, incident_data: Dict[str, Any]):
        """Fill incident creation form"""
        # Fill title
        self.page.fill('[data-testid="incident-title"]', incident_data["title"])
        
        # Fill description
        self.page.fill('[data-testid="incident-description"]', incident_data["description"])
        
        # Select priority
        self.page.select_option('[data-testid="incident-priority"]', incident_data["priority"])
        
        # Select category
        self.page.select_option('[data-testid="incident-category"]', incident_data["category"])
        
        # Fill additional fields if provided
        if "impact" in incident_data:
            self.page.select_option('[data-testid="incident-impact"]', incident_data["impact"])
        
        if "urgency" in incident_data:
            self.page.select_option('[data-testid="incident-urgency"]', incident_data["urgency"])
        
        if "assignee" in incident_data:
            self.page.select_option('[data-testid="incident-assignee"]', incident_data["assignee"])
    
    def attach_file(self, file_path: str):
        """Attach file to incident"""
        self.page.set_input_files('[data-testid="incident-attachment"]', file_path)
    
    def submit_incident(self) -> str:
        """Submit incident form and return incident ID"""
        self.page.click('[data-testid="submit-incident"]')
        
        # Wait for success notification
        notification = self.wait_for_notification("success")
        
        # Extract incident ID from notification or URL
        # This would depend on the actual implementation
        self.page.wait_for_url_pattern="*/incidents/*"
        current_url = self.get_current_url()
        incident_id = current_url.split("/")[-1]
        
        return incident_id
    
    def cancel_creation(self) -> IncidentListPage:
        """Cancel incident creation"""
        self.page.click('[data-testid="cancel-incident"]')
        return IncidentListPage(self.page, self.base_url)
    
    def validate_required_fields(self) -> Dict[str, bool]:
        """Check validation for required fields"""
        self.page.click('[data-testid="submit-incident"]')
        
        validation_errors = {}
        
        # Check for validation messages
        for field in ["title", "description", "priority", "category"]:
            error_selector = f'[data-testid="error-{field}"]'
            try:
                self.page.wait_for_selector(error_selector, timeout=1000)
                validation_errors[field] = True
            except:
                validation_errors[field] = False
        
        return validation_errors


class IncidentDetailPage(AuthenticatedPage):
    """Incident detail page object"""
    
    def __init__(self, page: Page, base_url: str):
        super().__init__(page, base_url)
    
    def is_loaded(self) -> bool:
        """Check if incident detail page is loaded"""
        try:
            self.page.wait_for_selector('[data-testid="incident-details"]', timeout=5000)
            return True
        except:
            return False
    
    def get_incident_id(self) -> str:
        """Get incident ID from page"""
        return self.page.locator('[data-testid="incident-id"]').text_content()
    
    def get_incident_status(self) -> str:
        """Get current incident status"""
        return self.page.locator('[data-testid="incident-status"]').text_content()
    
    def get_incident_priority(self) -> str:
        """Get incident priority"""
        return self.page.locator('[data-testid="incident-priority"]').text_content()
    
    def assign_incident(self, assignee: str):
        """Assign incident to user"""
        self.page.click('[data-testid="assign-button"]')
        modal = self.wait_for_modal("assign-incident")
        
        self.page.select_option('[data-testid="assignee-select"]', assignee)
        self.page.click('[data-testid="confirm-assign"]')
        
        self.wait_for_notification("success")
    
    def update_status(self, new_status: str):
        """Update incident status"""
        self.page.click('[data-testid="status-dropdown"]')
        self.page.click(f'[data-testid="status-{new_status}"]')
        
        # May require confirmation modal
        try:
            confirm_button = self.page.wait_for_selector('[data-testid="confirm-status-change"]', timeout=2000)
            confirm_button.click()
        except:
            pass  # No confirmation required
        
        self.wait_for_notification("success")
    
    def add_work_note(self, note_content: str, is_public: bool = False):
        """Add work note to incident"""
        self.page.click('[data-testid="add-work-note"]')
        
        self.page.fill('[data-testid="work-note-content"]', note_content)
        
        if is_public:
            self.page.check('[data-testid="work-note-public"]')
        
        self.page.click('[data-testid="save-work-note"]')
        self.wait_for_notification("success")
    
    def get_work_notes_count(self) -> int:
        """Get number of work notes"""
        notes = self.page.locator('[data-testid="work-note-item"]')
        return notes.count()
    
    def get_work_note_content(self, note_index: int) -> str:
        """Get content of specific work note"""
        note = self.page.locator('[data-testid="work-note-item"]').nth(note_index)
        return note.locator('[data-testid="note-content"]').text_content()
    
    def escalate_incident(self, escalation_level: str, reason: str):
        """Escalate incident"""
        self.page.click('[data-testid="escalate-button"]')
        modal = self.wait_for_modal("escalate-incident")
        
        self.page.select_option('[data-testid="escalation-level"]', escalation_level)
        self.page.fill('[data-testid="escalation-reason"]', reason)
        
        self.page.click('[data-testid="confirm-escalation"]')
        self.wait_for_notification("success")
    
    def resolve_incident(self, resolution_code: str, resolution_notes: str):
        """Resolve incident"""
        self.page.click('[data-testid="resolve-button"]')
        modal = self.wait_for_modal("resolve-incident")
        
        self.page.select_option('[data-testid="resolution-code"]', resolution_code)
        self.page.fill('[data-testid="resolution-notes"]', resolution_notes)
        
        self.page.click('[data-testid="confirm-resolution"]')
        self.wait_for_notification("success")
    
    def close_incident(self, closure_code: str, closure_notes: str):
        """Close incident"""
        self.page.click('[data-testid="close-button"]')
        modal = self.wait_for_modal("close-incident")
        
        self.page.select_option('[data-testid="closure-code"]', closure_code)
        self.page.fill('[data-testid="closure-notes"]', closure_notes)
        
        self.page.click('[data-testid="confirm-closure"]')
        self.wait_for_notification("success")
    
    def view_history(self) -> 'IncidentHistoryPage':
        """View incident history"""
        self.page.click('[data-testid="view-history"]')
        return IncidentHistoryPage(self.page, self.base_url)
    
    def edit_incident(self) -> 'IncidentEditPage':
        """Edit incident details"""
        self.page.click('[data-testid="edit-incident"]')
        return IncidentEditPage(self.page, self.base_url)


class IncidentHistoryPage(AuthenticatedPage):
    """Incident history page object"""
    
    def __init__(self, page: Page, base_url: str):
        super().__init__(page, base_url)
    
    def is_loaded(self) -> bool:
        """Check if incident history page is loaded"""
        try:
            self.page.wait_for_selector('[data-testid="incident-history"]', timeout=5000)
            return True
        except:
            return False
    
    def get_history_count(self) -> int:
        """Get number of history entries"""
        return self.get_table_row_count('[data-testid="history-table"]')
    
    def get_history_entry(self, index: int) -> Dict[str, str]:
        """Get specific history entry data"""
        table_selector = '[data-testid="history-table"]'
        return {
            "timestamp": self.get_table_cell_text(table_selector, index, 0),
            "action": self.get_table_cell_text(table_selector, index, 1),
            "user": self.get_table_cell_text(table_selector, index, 2),
            "details": self.get_table_cell_text(table_selector, index, 3)
        }
    
    def filter_by_action_type(self, action_type: str):
        """Filter history by action type"""
        self.page.select_option('[data-testid="action-filter"]', action_type)
        self.page.wait_for_load_state("networkidle")


class IncidentEditPage(AuthenticatedPage):
    """Incident edit page object"""
    
    def __init__(self, page: Page, base_url: str):
        super().__init__(page, base_url)
    
    def is_loaded(self) -> bool:
        """Check if incident edit page is loaded"""
        try:
            self.page.wait_for_selector('[data-testid="incident-edit-form"]', timeout=5000)
            return True
        except:
            return False
    
    def update_title(self, new_title: str):
        """Update incident title"""
        self.page.fill('[data-testid="incident-title"]', new_title)
    
    def update_description(self, new_description: str):
        """Update incident description"""
        self.page.fill('[data-testid="incident-description"]', new_description)
    
    def update_priority(self, new_priority: str):
        """Update incident priority"""
        self.page.select_option('[data-testid="incident-priority"]', new_priority)
    
    def save_changes(self) -> IncidentDetailPage:
        """Save changes and return to detail page"""
        self.page.click('[data-testid="save-changes"]')
        self.wait_for_notification("success")
        return IncidentDetailPage(self.page, self.base_url)
    
    def cancel_edit(self) -> IncidentDetailPage:
        """Cancel edit and return to detail page"""
        self.page.click('[data-testid="cancel-edit"]')
        return IncidentDetailPage(self.page, self.base_url)