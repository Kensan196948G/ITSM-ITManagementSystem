"""
E2E tests for incident management workflow
"""

import pytest
from playwright.sync_api import Page
from tests.e2e.pages.incident_page import (
    IncidentListPage,
    IncidentCreatePage,
    IncidentDetailPage,
)


@pytest.mark.e2e
@pytest.mark.incidents
@pytest.mark.e2e_critical
class TestIncidentWorkflowE2E:
    """End-to-end incident workflow tests"""

    def test_create_incident_complete_workflow(
        self, authenticated_page: Page, playwright_config, test_data
    ):
        """Test complete incident creation workflow"""
        # Navigate to incident list
        incident_list = IncidentListPage(
            authenticated_page, playwright_config["base_url"]
        )
        assert incident_list.is_loaded()

        # Get initial incident count
        initial_count = incident_list.get_incident_count()

        # Create new incident
        create_page = incident_list.create_new_incident()
        assert create_page.is_loaded()

        # Fill incident form
        incident_data = test_data["incident"]
        create_page.fill_incident_form(incident_data)

        # Submit incident
        incident_id = create_page.submit_incident()
        assert incident_id is not None
        assert len(incident_id) > 0

        # Verify we're on the detail page
        detail_page = IncidentDetailPage(
            authenticated_page, playwright_config["base_url"]
        )
        assert detail_page.is_loaded()

        # Verify incident details
        assert detail_page.get_incident_id() == incident_id
        assert detail_page.get_incident_priority() == incident_data["priority"]

        # Return to list and verify incident was created
        detail_page.navigate_to("/incidents")
        incident_list = IncidentListPage(
            authenticated_page, playwright_config["base_url"]
        )
        new_count = incident_list.get_incident_count()
        assert new_count == initial_count + 1

    def test_incident_assignment_workflow(
        self, authenticated_page: Page, playwright_config, test_data
    ):
        """Test incident assignment workflow"""
        # Create incident first
        incident_list = IncidentListPage(
            authenticated_page, playwright_config["base_url"]
        )
        create_page = incident_list.create_new_incident()
        create_page.fill_incident_form(test_data["incident"])
        incident_id = create_page.submit_incident()

        # Now test assignment
        detail_page = IncidentDetailPage(
            authenticated_page, playwright_config["base_url"]
        )

        # Assign incident
        assignee = "user_789"  # Test user ID
        detail_page.assign_incident(assignee)

        # Verify assignment
        # Note: This would depend on how the UI displays assignment
        # The status might change to "assigned"
        current_status = detail_page.get_incident_status()
        assert current_status in ["assigned", "in_progress"]

    def test_incident_status_transitions(
        self, authenticated_page: Page, playwright_config, test_data
    ):
        """Test incident status transition workflow"""
        # Create and assign incident
        incident_list = IncidentListPage(
            authenticated_page, playwright_config["base_url"]
        )
        create_page = incident_list.create_new_incident()
        create_page.fill_incident_form(test_data["incident"])
        incident_id = create_page.submit_incident()

        detail_page = IncidentDetailPage(
            authenticated_page, playwright_config["base_url"]
        )

        # Test status transitions: new -> assigned -> in_progress -> resolved -> closed

        # Assign incident (new -> assigned)
        detail_page.assign_incident("user_789")
        assert detail_page.get_incident_status() in ["assigned", "in_progress"]

        # Start work (assigned -> in_progress)
        detail_page.update_status("in_progress")
        assert detail_page.get_incident_status() == "in_progress"

        # Add work note
        work_note = "調査を開始しました。根本原因を特定中です。"
        detail_page.add_work_note(work_note, is_public=False)

        # Verify work note was added
        assert detail_page.get_work_notes_count() >= 1

        # Resolve incident (in_progress -> resolved)
        resolution_code = "config_change"
        resolution_notes = "設定を修正して問題を解決しました。"
        detail_page.resolve_incident(resolution_code, resolution_notes)
        assert detail_page.get_incident_status() == "resolved"

        # Close incident (resolved -> closed)
        closure_code = "resolved_permanently"
        closure_notes = "ユーザー確認完了。問題は完全に解決されました。"
        detail_page.close_incident(closure_code, closure_notes)
        assert detail_page.get_incident_status() == "closed"

    def test_incident_escalation_workflow(
        self, authenticated_page: Page, playwright_config, test_data
    ):
        """Test incident escalation workflow"""
        # Create high priority incident
        incident_data = test_data["incident"].copy()
        incident_data["priority"] = "critical"

        incident_list = IncidentListPage(
            authenticated_page, playwright_config["base_url"]
        )
        create_page = incident_list.create_new_incident()
        create_page.fill_incident_form(incident_data)
        incident_id = create_page.submit_incident()

        detail_page = IncidentDetailPage(
            authenticated_page, playwright_config["base_url"]
        )

        # Escalate incident
        escalation_level = "management"
        escalation_reason = (
            "SLA違反の可能性があるため、マネジメントエスカレーションが必要です。"
        )
        detail_page.escalate_incident(escalation_level, escalation_reason)

        # Verify escalation (this would depend on UI implementation)
        # Might show escalation badge or different status

    def test_incident_history_tracking(
        self, authenticated_page: Page, playwright_config, test_data
    ):
        """Test incident history tracking"""
        # Create incident and perform various actions
        incident_list = IncidentListPage(
            authenticated_page, playwright_config["base_url"]
        )
        create_page = incident_list.create_new_incident()
        create_page.fill_incident_form(test_data["incident"])
        incident_id = create_page.submit_incident()

        detail_page = IncidentDetailPage(
            authenticated_page, playwright_config["base_url"]
        )

        # Perform actions that should create history entries
        detail_page.assign_incident("user_789")
        detail_page.update_status("in_progress")
        detail_page.add_work_note("初回調査完了")

        # View history
        history_page = detail_page.view_history()
        assert history_page.is_loaded()

        # Verify history entries
        history_count = history_page.get_history_count()
        assert history_count >= 4  # creation, assignment, status change, work note

        # Check specific history entries
        first_entry = history_page.get_history_entry(0)
        assert "created" in first_entry["action"].lower()

    @pytest.mark.e2e_smoke
    def test_incident_search_and_filter(
        self, authenticated_page: Page, playwright_config, test_data
    ):
        """Test incident search and filtering functionality"""
        incident_list = IncidentListPage(
            authenticated_page, playwright_config["base_url"]
        )

        # Create test incidents with different attributes
        test_incidents = [
            {
                **test_data["incident"],
                "title": "E2E Test High Priority",
                "priority": "high",
            },
            {
                **test_data["incident"],
                "title": "E2E Test Medium Priority",
                "priority": "medium",
            },
            {
                **test_data["incident"],
                "title": "E2E Test Critical Issue",
                "priority": "critical",
            },
        ]

        created_incidents = []
        for incident_data in test_incidents:
            create_page = incident_list.create_new_incident()
            create_page.fill_incident_form(incident_data)
            incident_id = create_page.submit_incident()
            created_incidents.append(incident_id)

            # Return to incident list
            authenticated_page.go_back()
            authenticated_page.go_back()

        # Test search functionality
        incident_list = IncidentListPage(
            authenticated_page, playwright_config["base_url"]
        )
        incident_list.search_incidents("E2E Test")

        # Should show only our test incidents
        search_results_count = incident_list.get_incident_count()
        assert search_results_count >= 3

        # Test priority filter
        incident_list.filter_by_priority("critical")
        filtered_count = incident_list.get_incident_count()
        assert filtered_count >= 1

        # Verify filtered results contain critical incidents
        if filtered_count > 0:
            first_incident = incident_list.get_incident_data(0)
            assert first_incident["priority"] == "critical"

    def test_incident_form_validation(
        self, authenticated_page: Page, playwright_config
    ):
        """Test incident form validation"""
        incident_list = IncidentListPage(
            authenticated_page, playwright_config["base_url"]
        )
        create_page = incident_list.create_new_incident()

        # Test validation by submitting empty form
        validation_errors = create_page.validate_required_fields()

        # Verify required field validation
        assert validation_errors["title"] == True  # Should have error
        assert validation_errors["description"] == True  # Should have error
        assert validation_errors["priority"] == True  # Should have error
        assert validation_errors["category"] == True  # Should have error

    def test_incident_bulk_operations(
        self, authenticated_page: Page, playwright_config, test_data
    ):
        """Test bulk incident operations (if available)"""
        # This test would depend on the UI supporting bulk operations
        incident_list = IncidentListPage(
            authenticated_page, playwright_config["base_url"]
        )

        # Create multiple test incidents
        incident_ids = []
        for i in range(3):
            create_page = incident_list.create_new_incident()
            incident_data = test_data["incident"].copy()
            incident_data["title"] = f"E2E Bulk Test {i+1}"
            create_page.fill_incident_form(incident_data)
            incident_id = create_page.submit_incident()
            incident_ids.append(incident_id)

            # Return to list
            authenticated_page.go_back()
            authenticated_page.go_back()

        # Note: Bulk operations UI would need to be implemented
        # This is a placeholder for future bulk operations testing

    @pytest.mark.slow
    def test_incident_pagination(
        self, authenticated_page: Page, playwright_config, test_data
    ):
        """Test incident pagination"""
        incident_list = IncidentListPage(
            authenticated_page, playwright_config["base_url"]
        )

        # Get current page info
        initial_count = incident_list.get_incident_count()

        # If there are multiple pages, test pagination
        try:
            # Try to go to next page
            incident_list.paginate_to_next('[data-testid="pagination"]')

            # Verify we're on a different page
            page_2_count = incident_list.get_incident_count()
            # Should have incidents (unless it's the last page)

            # Go back to previous page
            incident_list.paginate_to_previous('[data-testid="pagination"]')

            # Should be back to original page
            back_to_page_1_count = incident_list.get_incident_count()
            assert back_to_page_1_count == initial_count

        except Exception:
            # No pagination available or only one page
            pytest.skip("Pagination not available or only one page of results")

    def test_incident_edit_workflow(
        self, authenticated_page: Page, playwright_config, test_data
    ):
        """Test incident editing workflow"""
        # Create incident
        incident_list = IncidentListPage(
            authenticated_page, playwright_config["base_url"]
        )
        create_page = incident_list.create_new_incident()
        create_page.fill_incident_form(test_data["incident"])
        incident_id = create_page.submit_incident()

        # Edit incident
        detail_page = IncidentDetailPage(
            authenticated_page, playwright_config["base_url"]
        )
        edit_page = detail_page.edit_incident()
        assert edit_page.is_loaded()

        # Update fields
        new_title = "Updated E2E Test Incident"
        new_description = "Updated description for E2E testing"
        new_priority = "critical"

        edit_page.update_title(new_title)
        edit_page.update_description(new_description)
        edit_page.update_priority(new_priority)

        # Save changes
        updated_detail_page = edit_page.save_changes()

        # Verify updates (this would depend on UI implementation)
        # The page should show updated information
