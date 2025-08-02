"""
Test cases for IncidentService
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime
from sqlalchemy.orm import Session

from app.services.incident_service import IncidentService
from app.models.incident import Incident
from app.schemas.incident import IncidentCreate, IncidentUpdate


class TestIncidentService:
    """Test cases for incident service layer"""

    @pytest.fixture
    def service(self, db_session: Session):
        """Create incident service instance"""
        return IncidentService(db_session)

    @pytest.mark.unit
    def test_create_incident(self, service: IncidentService, incident_data: dict):
        """Test creating a new incident"""
        incident_create = IncidentCreate(**incident_data)
        incident = service.create_incident(incident_create)

        assert incident.title == incident_data["title"]
        assert incident.description == incident_data["description"]
        assert incident.priority == incident_data["priority"]
        assert incident.status == incident_data["status"]
        assert incident.id is not None
        assert incident.created_at is not None

    @pytest.mark.unit
    def test_get_incident_by_id(self, service: IncidentService, incident_data: dict):
        """Test retrieving incident by ID"""
        # Create incident first
        incident_create = IncidentCreate(**incident_data)
        created_incident = service.create_incident(incident_create)

        # Retrieve by ID
        retrieved_incident = service.get_incident(created_incident.id)
        assert retrieved_incident is not None
        assert retrieved_incident.id == created_incident.id
        assert retrieved_incident.title == incident_data["title"]

    @pytest.mark.unit
    def test_get_nonexistent_incident(self, service: IncidentService):
        """Test retrieving non-existent incident"""
        incident = service.get_incident(99999)
        assert incident is None

    @pytest.mark.unit
    def test_update_incident(self, service: IncidentService, incident_data: dict):
        """Test updating an existing incident"""
        # Create incident first
        incident_create = IncidentCreate(**incident_data)
        incident = service.create_incident(incident_create)

        # Update incident
        update_data = IncidentUpdate(title="Updated Title", status="in_progress")
        updated_incident = service.update_incident(incident.id, update_data)

        assert updated_incident.title == "Updated Title"
        assert updated_incident.status == "in_progress"
        assert updated_incident.updated_at is not None

    @pytest.mark.unit
    def test_delete_incident(self, service: IncidentService, incident_data: dict):
        """Test deleting an incident"""
        # Create incident first
        incident_create = IncidentCreate(**incident_data)
        incident = service.create_incident(incident_create)

        # Delete incident
        result = service.delete_incident(incident.id)
        assert result is True

        # Verify deletion
        deleted_incident = service.get_incident(incident.id)
        assert deleted_incident is None

    @pytest.mark.unit
    def test_get_incidents_list(self, service: IncidentService):
        """Test retrieving list of incidents"""
        incidents = service.get_incidents()
        assert isinstance(incidents, list)

    @pytest.mark.unit
    def test_get_incidents_with_filters(
        self, service: IncidentService, incident_data: dict
    ):
        """Test retrieving incidents with filters"""
        # Create test incidents
        incident_create = IncidentCreate(**incident_data)
        service.create_incident(incident_create)

        # Test status filter
        incidents = service.get_incidents(status="open")
        assert all(incident.status == "open" for incident in incidents)

        # Test priority filter
        incidents = service.get_incidents(priority="high")
        assert all(incident.priority == "high" for incident in incidents)

    @pytest.mark.unit
    def test_get_incidents_with_pagination(self, service: IncidentService):
        """Test retrieving incidents with pagination"""
        incidents = service.get_incidents(skip=0, limit=10)
        assert len(incidents) <= 10

    @pytest.mark.unit
    def test_search_incidents(self, service: IncidentService, incident_data: dict):
        """Test searching incidents by keyword"""
        # Create test incident
        incident_create = IncidentCreate(**incident_data)
        service.create_incident(incident_create)

        # Search by title keyword
        incidents = service.search_incidents("Test")
        assert len(incidents) > 0
        assert any("Test" in incident.title for incident in incidents)

    @pytest.mark.unit
    def test_assign_incident(
        self, service: IncidentService, incident_data: dict, test_user
    ):
        """Test assigning incident to a user"""
        # Create incident
        incident_create = IncidentCreate(**incident_data)
        incident = service.create_incident(incident_create)

        # Assign incident
        assigned_incident = service.assign_incident(incident.id, test_user.id)
        assert assigned_incident.assignee_id == test_user.id

    @pytest.mark.unit
    def test_get_incidents_by_assignee(
        self, service: IncidentService, incident_data: dict, test_user
    ):
        """Test retrieving incidents by assignee"""
        # Create and assign incident
        incident_create = IncidentCreate(**incident_data)
        incident = service.create_incident(incident_create)
        service.assign_incident(incident.id, test_user.id)

        # Get incidents by assignee
        incidents = service.get_incidents_by_assignee(test_user.id)
        assert len(incidents) > 0
        assert all(incident.assignee_id == test_user.id for incident in incidents)

    @pytest.mark.unit
    def test_get_incident_statistics(self, service: IncidentService):
        """Test retrieving incident statistics"""
        stats = service.get_incident_statistics()
        assert "total" in stats
        assert "open" in stats
        assert "closed" in stats
        assert "in_progress" in stats
        assert isinstance(stats["total"], int)

    @pytest.mark.unit
    def test_escalate_incident(self, service: IncidentService, incident_data: dict):
        """Test escalating an incident"""
        # Create incident with low priority
        incident_data["priority"] = "low"
        incident_create = IncidentCreate(**incident_data)
        incident = service.create_incident(incident_create)

        # Escalate incident
        escalated_incident = service.escalate_incident(incident.id)
        assert escalated_incident.priority in ["medium", "high", "critical"]

    @pytest.mark.unit
    def test_close_incident(self, service: IncidentService, incident_data: dict):
        """Test closing an incident"""
        # Create incident
        incident_create = IncidentCreate(**incident_data)
        incident = service.create_incident(incident_create)

        # Close incident
        closed_incident = service.close_incident(incident.id, "Resolved by user")
        assert closed_incident.status == "closed"
        assert closed_incident.resolution is not None
        assert closed_incident.closed_at is not None

    @pytest.mark.unit
    @patch("app.services.notification_service.NotificationService")
    def test_create_incident_sends_notification(
        self, mock_notification, service: IncidentService, incident_data: dict
    ):
        """Test that creating incident sends notification"""
        incident_create = IncidentCreate(**incident_data)
        service.create_incident(incident_create)

        # Verify notification was sent
        mock_notification.return_value.send_incident_notification.assert_called_once()

    @pytest.mark.unit
    def test_validate_incident_data(self, service: IncidentService):
        """Test incident data validation"""
        # Test with invalid data
        with pytest.raises(ValueError):
            invalid_data = IncidentCreate(
                title="",  # Empty title should be invalid
                description="Test",
                priority="invalid_priority",
            )
            service.create_incident(invalid_data)

    @pytest.mark.unit
    def test_incident_audit_trail(self, service: IncidentService, incident_data: dict):
        """Test that incident changes are audited"""
        # Create incident
        incident_create = IncidentCreate(**incident_data)
        incident = service.create_incident(incident_create)

        # Update incident
        update_data = IncidentUpdate(status="in_progress")
        service.update_incident(incident.id, update_data)

        # Check audit trail
        audit_logs = service.get_incident_audit_trail(incident.id)
        assert len(audit_logs) >= 2  # Create and update events
        assert any(log.action == "created" for log in audit_logs)
        assert any(log.action == "updated" for log in audit_logs)
