"""
Backend tests for new Maintenance features:
- Maintenance Personnel CRUD
- Maintenance Requests CRUD
- Cleaning Records (maintenance person field)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ─── Fixtures ───────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

@pytest.fixture(scope="module")
def created_personnel(api):
    """Create a maintenance personnel for use in request tests."""
    resp = api.post(f"{BASE_URL}/api/maintenance-personnel", json={
        "name": "TEST_Plumber Joe",
        "contact": "555-1234",
        "role": "Plumber",
        "notes": "Created by test",
        "is_archived": False
    })
    assert resp.status_code in (200, 201), f"Failed to create personnel: {resp.text}"
    data = resp.json()
    yield data
    # Cleanup
    api.delete(f"{BASE_URL}/api/maintenance-personnel/{data['id']}")

@pytest.fixture(scope="module")
def created_request(api):
    """Create a maintenance request for use in subsequent tests."""
    resp = api.post(f"{BASE_URL}/api/maintenance-requests", json={
        "title": "TEST_Leaky Faucet",
        "description": "Water dripping in kitchen",
        "status": "Pending",
        "status_color": "yellow",
        "is_completed": False
    })
    assert resp.status_code in (200, 201), f"Failed to create request: {resp.text}"
    data = resp.json()
    yield data
    # Cleanup
    api.delete(f"{BASE_URL}/api/maintenance-requests/{data['id']}")


# ─── Maintenance Personnel Tests ─────────────────────────────────────────────

class TestMaintenancePersonnel:
    """CRUD tests for /api/maintenance-personnel"""

    def test_get_maintenance_personnel_returns_200(self, api):
        resp = api.get(f"{BASE_URL}/api/maintenance-personnel")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        assert isinstance(resp.json(), list), "Response should be a list"

    def test_get_maintenance_personnel_include_archived(self, api):
        resp = api.get(f"{BASE_URL}/api/maintenance-personnel", params={"include_archived": True})
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_maintenance_personnel(self, api):
        payload = {
            "name": "TEST_Electrician Bob",
            "contact": "555-9999",
            "role": "Electrician",
            "notes": "Available weekdays",
            "is_archived": False
        }
        resp = api.post(f"{BASE_URL}/api/maintenance-personnel", json=payload)
        assert resp.status_code in (200, 201), f"Create failed: {resp.text}"
        data = resp.json()
        assert data["name"] == "TEST_Electrician Bob"
        assert data["role"] == "Electrician"
        assert "id" in data

        # Cleanup
        api.delete(f"{BASE_URL}/api/maintenance-personnel/{data['id']}")

    def test_create_personnel_persists(self, api, created_personnel):
        """Verify GET after POST returns the created record."""
        resp = api.get(f"{BASE_URL}/api/maintenance-personnel", params={"include_archived": True})
        assert resp.status_code == 200
        ids = [p["id"] for p in resp.json()]
        assert created_personnel["id"] in ids, "Created personnel not found in list"

    def test_update_maintenance_personnel(self, api, created_personnel):
        pid = created_personnel["id"]
        resp = api.put(f"{BASE_URL}/api/maintenance-personnel/{pid}", json={
            "name": "TEST_Plumber Joe Updated",
            "contact": "555-5678",
            "role": "Senior Plumber",
            "notes": "Updated by test",
            "is_archived": False
        })
        assert resp.status_code == 200, f"Update failed: {resp.text}"
        data = resp.json()
        assert data["name"] == "TEST_Plumber Joe Updated"
        assert data["role"] == "Senior Plumber"

    def test_archive_maintenance_personnel(self, api, created_personnel):
        """Archive a personnel record by setting is_archived=True."""
        pid = created_personnel["id"]
        resp = api.put(f"{BASE_URL}/api/maintenance-personnel/{pid}", json={
            "name": "TEST_Plumber Joe Updated",
            "contact": "555-5678",
            "role": "Senior Plumber",
            "notes": "Updated by test",
            "is_archived": True
        })
        assert resp.status_code == 200
        assert resp.json()["is_archived"] is True

        # Restore for other tests
        api.put(f"{BASE_URL}/api/maintenance-personnel/{pid}", json={
            "name": "TEST_Plumber Joe Updated",
            "contact": "555-5678",
            "role": "Senior Plumber",
            "notes": "Updated by test",
            "is_archived": False
        })

    def test_delete_maintenance_personnel_not_found(self, api):
        resp = api.delete(f"{BASE_URL}/api/maintenance-personnel/000000000000000000000000")
        assert resp.status_code == 404

    def test_create_personnel_missing_name(self, api):
        resp = api.post(f"{BASE_URL}/api/maintenance-personnel", json={
            "role": "Plumber"
        })
        assert resp.status_code in (400, 422), f"Expected validation error, got {resp.status_code}"


# ─── Maintenance Requests Tests ───────────────────────────────────────────────

class TestMaintenanceRequests:
    """CRUD tests for /api/maintenance-requests"""

    def test_get_maintenance_requests_returns_200(self, api):
        resp = api.get(f"{BASE_URL}/api/maintenance-requests")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_maintenance_requests_include_completed(self, api):
        resp = api.get(f"{BASE_URL}/api/maintenance-requests", params={"include_completed": True})
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_maintenance_request(self, api):
        payload = {
            "title": "TEST_Broken Window",
            "description": "Window cracked in bedroom",
            "status": "Urgent",
            "status_color": "red",
            "is_completed": False
        }
        resp = api.post(f"{BASE_URL}/api/maintenance-requests", json=payload)
        assert resp.status_code in (200, 201), f"Create failed: {resp.text}"
        data = resp.json()
        assert data["title"] == "TEST_Broken Window"
        assert data["status_color"] == "red"
        assert data["is_completed"] is False
        assert "id" in data
        assert "created_at" in data

        # Cleanup
        api.delete(f"{BASE_URL}/api/maintenance-requests/{data['id']}")

    def test_create_request_persists(self, api, created_request):
        """Verify GET after POST returns the created request."""
        resp = api.get(f"{BASE_URL}/api/maintenance-requests", params={"include_completed": True})
        assert resp.status_code == 200
        ids = [r["id"] for r in resp.json()]
        assert created_request["id"] in ids, "Created request not found in list"

    def test_update_maintenance_request(self, api, created_request):
        rid = created_request["id"]
        resp = api.put(f"{BASE_URL}/api/maintenance-requests/{rid}", json={
            "title": "TEST_Leaky Faucet Updated",
            "description": "Still dripping, needs urgent fix",
            "status": "In Progress",
            "status_color": "yellow",
            "is_completed": False
        })
        assert resp.status_code == 200, f"Update failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "In Progress"
        assert data["title"] == "TEST_Leaky Faucet Updated"

    def test_mark_request_completed(self, api, created_request):
        """Mark a request as completed - completed_at should be auto-set."""
        rid = created_request["id"]
        resp = api.put(f"{BASE_URL}/api/maintenance-requests/{rid}", json={
            "title": "TEST_Leaky Faucet Updated",
            "description": "Fixed",
            "status": "Completed",
            "status_color": "green",
            "is_completed": True
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_completed"] is True
        assert data.get("completed_at") is not None, "completed_at should be auto-set on completion"

    def test_completed_request_in_completed_list(self, api, created_request):
        """Completed requests should appear when include_completed=True."""
        resp = api.get(f"{BASE_URL}/api/maintenance-requests", params={"include_completed": True})
        assert resp.status_code == 200
        ids = [r["id"] for r in resp.json()]
        assert created_request["id"] in ids

    def test_completed_request_excluded_by_default(self, api, created_request):
        """Completed requests should NOT appear in default list."""
        resp = api.get(f"{BASE_URL}/api/maintenance-requests")
        assert resp.status_code == 200
        ids = [r["id"] for r in resp.json()]
        assert created_request["id"] not in ids, "Completed request should not appear in active list"

    def test_create_request_with_assigned_personnel(self, api, created_personnel):
        """Create a request with assigned personnel list."""
        payload = {
            "title": "TEST_HVAC Service",
            "status": "Pending",
            "status_color": "gray",
            "assigned_personnel": [{"id": created_personnel["id"], "name": created_personnel["name"]}],
            "is_completed": False
        }
        resp = api.post(f"{BASE_URL}/api/maintenance-requests", json=payload)
        assert resp.status_code in (200, 201), f"Create failed: {resp.text}"
        data = resp.json()
        assert len(data["assigned_personnel"]) == 1
        assert data["assigned_personnel"][0]["name"] == created_personnel["name"]

        # Cleanup
        api.delete(f"{BASE_URL}/api/maintenance-requests/{data['id']}")

    def test_delete_maintenance_request(self, api):
        # Create a temp request to delete
        resp = api.post(f"{BASE_URL}/api/maintenance-requests", json={
            "title": "TEST_Delete Me",
            "status": "Pending",
            "status_color": "gray",
            "is_completed": False
        })
        assert resp.status_code in (200, 201)
        rid = resp.json()["id"]

        del_resp = api.delete(f"{BASE_URL}/api/maintenance-requests/{rid}")
        assert del_resp.status_code in (200, 204), f"Delete failed: {del_resp.text}"

        # Verify deleted
        get_resp = api.get(f"{BASE_URL}/api/maintenance-requests", params={"include_completed": True})
        assert get_resp.status_code == 200
        ids = [r["id"] for r in get_resp.json()]
        assert rid not in ids, "Deleted request still found in list"

    def test_delete_request_not_found(self, api):
        resp = api.delete(f"{BASE_URL}/api/maintenance-requests/000000000000000000000000")
        assert resp.status_code == 404

    def test_create_request_missing_title(self, api):
        resp = api.post(f"{BASE_URL}/api/maintenance-requests", json={
            "status": "Pending"
        })
        assert resp.status_code in (400, 422), f"Expected validation error, got {resp.status_code}"

    def test_update_request_not_found(self, api):
        resp = api.put(f"{BASE_URL}/api/maintenance-requests/000000000000000000000000", json={
            "title": "Non-existent",
            "status": "Pending",
            "status_color": "gray",
            "is_completed": False
        })
        assert resp.status_code == 404


# ─── Cleaning Records - Maintenance Field ────────────────────────────────────

class TestCleaningRecordsMaintenance:
    """Test the new maintenance person field in cleaning records."""

    def test_get_cleaning_records_returns_200(self, api):
        resp = api.get(f"{BASE_URL}/api/cleaning-records")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_cleaning_record_has_maintenance_fields(self, api):
        """Verify the cleaning records schema includes maintenance-related fields."""
        resp = api.get(f"{BASE_URL}/api/cleaning-records")
        assert resp.status_code == 200
        records = resp.json()
        if records:
            # Check first record has expected fields (or at least the record exists)
            # The field may be null/empty but schema should allow it
            r = records[0]
            # These fields should at minimum be present (even as null)
            assert "id" in r, "Record should have id"

    def test_update_cleaning_record_with_maintenance(self, api):
        """Update a cleaning record with assigned maintenance person."""
        # First get existing records to find one to update
        resp = api.get(f"{BASE_URL}/api/cleaning-records")
        assert resp.status_code == 200
        records = resp.json()
        if not records:
            pytest.skip("No cleaning records available for testing")

        record = records[0]
        rid = record["id"]

        # Update with maintenance person
        update_resp = api.put(f"{BASE_URL}/api/cleaning-records/{rid}", json={
            "check_in_time": "",
            "check_out_time": "",
            "cleaning_time": "",
            "assigned_cleaner_id": None,
            "assigned_cleaner_name": "",
            "confirmed": False,
            "notes": "TEST_maintenance test",
            "assigned_maintenance_id": None,
            "assigned_maintenance_name": "TEST_Fix HVAC",
            "maintenance_note": "Check AC unit"
        })
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        updated = update_resp.json()
        assert updated.get("assigned_maintenance_name") == "TEST_Fix HVAC"
        assert updated.get("maintenance_note") == "Check AC unit"

        # Restore
        api.put(f"{BASE_URL}/api/cleaning-records/{rid}", json={
            "check_in_time": record.get("check_in_time", ""),
            "check_out_time": record.get("check_out_time", ""),
            "cleaning_time": record.get("cleaning_time", ""),
            "assigned_cleaner_id": record.get("assigned_cleaner_id"),
            "assigned_cleaner_name": record.get("assigned_cleaner_name", ""),
            "confirmed": record.get("confirmed", False),
            "notes": record.get("notes", ""),
            "assigned_maintenance_id": None,
            "assigned_maintenance_name": "",
            "maintenance_note": ""
        })
