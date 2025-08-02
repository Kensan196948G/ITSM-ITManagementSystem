"""
Test cases for Incident API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient


class TestIncidentAPI:
    """Test cases for incident management API"""

    @pytest.mark.api
    def test_get_incidents_list(self, client: TestClient):
        """Test retrieving list of incidents"""
        response = client.get("/api/v1/incidents/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.api
    def test_create_incident(self, client: TestClient, incident_data: dict):
        """Test creating a new incident"""
        response = client.post("/api/v1/incidents/", json=incident_data)
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == incident_data["title"]
        assert data["description"] == incident_data["description"]
        assert data["priority"] == incident_data["priority"]
        assert "id" in data
        assert "created_at" in data

    @pytest.mark.api
    def test_get_incident_by_id(self, client: TestClient, incident_data: dict):
        """Test retrieving a specific incident by ID"""
        # Create incident first
        create_response = client.post("/api/v1/incidents/", json=incident_data)
        incident_id = create_response.json()["id"]

        # Get incident by ID
        response = client.get(f"/api/v1/incidents/{incident_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == incident_id
        assert data["title"] == incident_data["title"]

    @pytest.mark.api
    def test_update_incident(self, client: TestClient, incident_data: dict):
        """Test updating an existing incident"""
        # Create incident first
        create_response = client.post("/api/v1/incidents/", json=incident_data)
        incident_id = create_response.json()["id"]

        # Update incident
        update_data = {"title": "Updated Incident Title", "status": "in_progress"}
        response = client.put(f"/api/v1/incidents/{incident_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["status"] == update_data["status"]

    @pytest.mark.api
    def test_delete_incident(self, client: TestClient, incident_data: dict):
        """Test deleting an incident"""
        # Create incident first
        create_response = client.post("/api/v1/incidents/", json=incident_data)
        incident_id = create_response.json()["id"]

        # Delete incident
        response = client.delete(f"/api/v1/incidents/{incident_id}")
        assert response.status_code == 204

        # Verify incident is deleted
        get_response = client.get(f"/api/v1/incidents/{incident_id}")
        assert get_response.status_code == 404

    @pytest.mark.api
    def test_filter_incidents_by_status(self, client: TestClient):
        """Test filtering incidents by status"""
        response = client.get("/api/v1/incidents/?status=open")
        assert response.status_code == 200
        data = response.json()
        for incident in data:
            assert incident["status"] == "open"

    @pytest.mark.api
    def test_filter_incidents_by_priority(self, client: TestClient):
        """Test filtering incidents by priority"""
        response = client.get("/api/v1/incidents/?priority=high")
        assert response.status_code == 200
        data = response.json()
        for incident in data:
            assert incident["priority"] == "high"

    @pytest.mark.api
    def test_search_incidents(self, client: TestClient):
        """Test searching incidents by keyword"""
        response = client.get("/api/v1/incidents/?search=server")
        assert response.status_code == 200
        data = response.json()
        # Results should contain search term in title or description
        for incident in data:
            assert (
                "server" in incident["title"].lower()
                or "server" in incident["description"].lower()
            )

    @pytest.mark.api
    def test_assign_incident(self, client: TestClient, incident_data: dict, test_user):
        """Test assigning incident to a user"""
        # Create incident first
        create_response = client.post("/api/v1/incidents/", json=incident_data)
        incident_id = create_response.json()["id"]

        # Assign incident
        assign_data = {"assignee_id": test_user.id}
        response = client.patch(
            f"/api/v1/incidents/{incident_id}/assign", json=assign_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["assignee_id"] == test_user.id

    @pytest.mark.api
    def test_incident_validation_errors(self, client: TestClient):
        """Test validation errors for incident creation"""
        # Test missing required fields
        response = client.post("/api/v1/incidents/", json={})
        assert response.status_code == 422

        # Test invalid priority
        invalid_data = {
            "title": "Test",
            "description": "Test",
            "priority": "invalid_priority",
        }
        response = client.post("/api/v1/incidents/", json=invalid_data)
        assert response.status_code == 422

    @pytest.mark.api
    @pytest.mark.auth
    def test_incident_access_requires_auth(self, client: TestClient):
        """Test that incident endpoints require authentication"""
        # Remove auth headers
        client.headers.clear()

        response = client.get("/api/v1/incidents/")
        assert response.status_code == 401

    @pytest.mark.api
    @pytest.mark.auth
    def test_incident_crud_with_auth(
        self, client: TestClient, auth_headers: dict, incident_data: dict
    ):
        """Test incident CRUD operations with authentication"""
        # Set auth headers
        client.headers.update(auth_headers)

        # Test authenticated access
        response = client.get("/api/v1/incidents/")
        assert response.status_code == 200

        # Test authenticated creation
        response = client.post("/api/v1/incidents/", json=incident_data)
        assert response.status_code == 201


class TestIncidentAPIAsync:
    """Async test cases for incident API"""

    @pytest.mark.asyncio
    @pytest.mark.api
    async def test_async_get_incidents(self, async_client: AsyncClient):
        """Test async retrieval of incidents"""
        response = await async_client.get("/api/v1/incidents/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    @pytest.mark.api
    async def test_async_create_incident(
        self, async_client: AsyncClient, incident_data: dict
    ):
        """Test async incident creation"""
        response = await async_client.post("/api/v1/incidents/", json=incident_data)
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == incident_data["title"]
        assert "id" in data
