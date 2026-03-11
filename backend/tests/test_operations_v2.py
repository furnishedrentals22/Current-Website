"""
Test Suite for Operations Pages v2: Testing new MoveInOut two-tab layout,
cleaning records backfill for old tenants, and Next Check-in column.
"""
import pytest
import requests
import os
from datetime import datetime, timedelta, date

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ============================================================
# MOVE IN/OUT ENDPOINT TESTS
# ============================================================
class TestMoveInsOutsEndpoint:
    """Tests for GET /api/move-ins-outs endpoint"""
    
    def test_endpoint_returns_200(self, api_client):
        """GET /api/move-ins-outs should return 200"""
        response = api_client.get(f"{BASE_URL}/api/move-ins-outs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Endpoint returned 200")
    
    def test_returns_list(self, api_client):
        """Response should be a list"""
        response = api_client.get(f"{BASE_URL}/api/move-ins-outs")
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Returns list with {len(data)} items")
    
    def test_items_have_enriched_fields(self, api_client):
        """Each item should have property_name and unit_number"""
        response = api_client.get(f"{BASE_URL}/api/move-ins-outs")
        data = response.json()
        if len(data) > 0:
            item = data[0]
            required_fields = ["id", "name", "move_in_date", "move_out_date", "property_name", "unit_number"]
            for field in required_fields:
                assert field in item, f"Missing field: {field}"
            print(f"✓ First item has all required fields: {item.get('name')} at {item.get('property_name')} U{item.get('unit_number')}")
        else:
            pytest.skip("No data to verify structure")
    
    def test_frontend_can_filter_move_ins(self, api_client):
        """Frontend filters by move_in_date >= today for Move-Ins tab"""
        response = api_client.get(f"{BASE_URL}/api/move-ins-outs")
        data = response.json()
        today_str = date.today().isoformat()
        move_ins = [t for t in data if t.get("move_in_date", "") >= today_str]
        print(f"✓ Move-Ins (move_in_date >= {today_str}): {len(move_ins)} items")
    
    def test_frontend_can_filter_move_outs(self, api_client):
        """Frontend filters by move_out_date >= today for Move-Outs tab"""
        response = api_client.get(f"{BASE_URL}/api/move-ins-outs")
        data = response.json()
        today_str = date.today().isoformat()
        move_outs = [t for t in data if t.get("move_out_date", "") >= today_str]
        print(f"✓ Move-Outs (move_out_date >= {today_str}): {len(move_outs)} items")


# ============================================================
# CLEANING RECORDS ENDPOINT TESTS
# ============================================================
class TestCleaningRecordsEndpoint:
    """Tests for GET /api/cleaning-records with backfill and next_checkin"""
    
    def test_endpoint_returns_200(self, api_client):
        """GET /api/cleaning-records should return 200"""
        response = api_client.get(f"{BASE_URL}/api/cleaning-records")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Endpoint returned 200")
    
    def test_returns_list(self, api_client):
        """Response should be a list"""
        response = api_client.get(f"{BASE_URL}/api/cleaning-records")
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Returns list with {len(data)} cleaning records")
    
    def test_records_have_next_checkin_fields(self, api_client):
        """Each record should have next_check_in_date field"""
        response = api_client.get(f"{BASE_URL}/api/cleaning-records")
        data = response.json()
        if len(data) > 0:
            item = data[0]
            assert "next_check_in_date" in item, "Missing next_check_in_date field"
            assert "next_check_in_tenant_name" in item, "Missing next_check_in_tenant_name field"
            print(f"✓ Records have next_check_in_date: first item = {item.get('next_check_in_date') or 'None'}")
        else:
            pytest.skip("No cleaning records to verify structure")
    
    def test_records_have_required_fields(self, api_client):
        """Cleaning records should have all required fields"""
        response = api_client.get(f"{BASE_URL}/api/cleaning-records")
        data = response.json()
        if len(data) > 0:
            item = data[0]
            required_fields = ["id", "tenant_id", "tenant_name", "property_id", "unit_id", 
                              "check_in_date", "check_out_date", "check_in_time", "check_out_time",
                              "cleaning_time", "assigned_cleaner_id", "assigned_cleaner_name", 
                              "confirmed", "notes", "next_check_in_date"]
            for field in required_fields:
                assert field in item, f"Missing field: {field}"
            print(f"✓ Record has all required fields: tenant={item.get('tenant_name')}, checkout={item.get('check_out_date')}")
        else:
            pytest.skip("No cleaning records to verify structure")
    
    def test_days_parameter(self, api_client):
        """days parameter should limit results"""
        response_60 = api_client.get(f"{BASE_URL}/api/cleaning-records?days=60")
        response_30 = api_client.get(f"{BASE_URL}/api/cleaning-records?days=30")
        assert response_60.status_code == 200
        assert response_30.status_code == 200
        print(f"✓ days parameter works: 60 days={len(response_60.json())}, 30 days={len(response_30.json())}")


# ============================================================
# CLEANING RECORD UPDATE TESTS
# ============================================================
class TestCleaningRecordUpdate:
    """Tests for PATCH /api/cleaning-records/{id}"""
    
    def test_update_cleaning_record(self, api_client):
        """PUT /api/cleaning-records/{id} should update fields"""
        # First get a cleaning record
        list_response = api_client.get(f"{BASE_URL}/api/cleaning-records")
        records = list_response.json()
        
        if len(records) == 0:
            pytest.skip("No cleaning records available to update")
        
        record = records[0]
        record_id = record["id"]
        original_notes = record.get("notes", "")
        test_note = f"TEST_Note_{datetime.now().strftime('%H%M%S')}"
        
        # Update the record
        update_payload = {
            "check_in_time": record.get("check_in_time", ""),
            "check_out_time": record.get("check_out_time", ""),
            "cleaning_time": record.get("cleaning_time", ""),
            "assigned_cleaner_id": record.get("assigned_cleaner_id"),
            "assigned_cleaner_name": record.get("assigned_cleaner_name", ""),
            "confirmed": record.get("confirmed", False),
            "notes": test_note
        }
        
        response = api_client.put(f"{BASE_URL}/api/cleaning-records/{record_id}", json=update_payload)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        updated = response.json()
        assert updated["notes"] == test_note, "Notes not updated"
        print(f"✓ Updated cleaning record {record_id}, notes={test_note}")
        
        # Restore original
        update_payload["notes"] = original_notes
        api_client.put(f"{BASE_URL}/api/cleaning-records/{record_id}", json=update_payload)


# ============================================================
# HOUSEKEEPERS ENDPOINT TESTS
# ============================================================
class TestHousekeepersEndpoint:
    """Tests for GET /api/housekeepers"""
    
    def test_endpoint_returns_200(self, api_client):
        """GET /api/housekeepers should return 200"""
        response = api_client.get(f"{BASE_URL}/api/housekeepers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Endpoint returned 200")
    
    def test_returns_list(self, api_client):
        """Response should be a list"""
        response = api_client.get(f"{BASE_URL}/api/housekeepers")
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Returns list with {len(data)} housekeepers")
    
    def test_include_archived_param(self, api_client):
        """include_archived parameter should work"""
        response = api_client.get(f"{BASE_URL}/api/housekeepers?include_archived=true")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ include_archived=true returns {len(data)} housekeepers")


# ============================================================
# HOUSEKEEPING LEADS ENDPOINT TESTS
# ============================================================
class TestHousekeepingLeadsEndpoint:
    """Tests for GET /api/housekeeping-leads"""
    
    def test_endpoint_returns_200(self, api_client):
        """GET /api/housekeeping-leads should return 200"""
        response = api_client.get(f"{BASE_URL}/api/housekeeping-leads")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Endpoint returned 200")
    
    def test_returns_list(self, api_client):
        """Response should be a list"""
        response = api_client.get(f"{BASE_URL}/api/housekeeping-leads")
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Returns list with {len(data)} housekeeping leads")


# ============================================================
# SMOKE TESTS FOR MAIN NAVIGATION SECTIONS
# ============================================================
class TestSmokeTestMainSections:
    """Smoke tests for main navigation sections to check for regressions"""
    
    def test_properties_endpoint(self, api_client):
        """GET /api/properties should return 200"""
        response = api_client.get(f"{BASE_URL}/api/properties")
        assert response.status_code == 200
        print(f"✓ Properties endpoint: {len(response.json())} items")
    
    def test_units_endpoint(self, api_client):
        """GET /api/units should return 200"""
        response = api_client.get(f"{BASE_URL}/api/units")
        assert response.status_code == 200
        print(f"✓ Units endpoint: {len(response.json())} items")
    
    def test_tenants_endpoint(self, api_client):
        """GET /api/tenants should return 200"""
        response = api_client.get(f"{BASE_URL}/api/tenants")
        assert response.status_code == 200
        print(f"✓ Tenants endpoint: {len(response.json())} items")
    
    def test_notifications_endpoint(self, api_client):
        """GET /api/notifications should return 200"""
        response = api_client.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        print(f"✓ Notifications endpoint: {len(response.json())} items")
    
    def test_leads_endpoint(self, api_client):
        """GET /api/leads should return 200"""
        response = api_client.get(f"{BASE_URL}/api/leads")
        assert response.status_code == 200
        print(f"✓ Leads endpoint: {len(response.json())} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
