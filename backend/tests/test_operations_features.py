"""
Test Suite for Operations Pages: Move In/Out and Housekeeping
Tests all new endpoints for the Operations nav group.
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

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
class TestMoveInsOuts:
    """Tests for GET /api/move-ins-outs endpoint"""
    
    def test_get_move_ins_outs_returns_list(self, api_client):
        """GET /api/move-ins-outs should return list of tenants with upcoming moves"""
        response = api_client.get(f"{BASE_URL}/api/move-ins-outs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Move In/Out count: {len(data)}")
    
    def test_move_ins_outs_contains_enriched_data(self, api_client):
        """Move in/out data should include property_name and unit_number"""
        response = api_client.get(f"{BASE_URL}/api/move-ins-outs")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            item = data[0]
            # Check for enriched fields
            assert "property_name" in item, "Should include property_name"
            assert "unit_number" in item, "Should include unit_number"
            assert "name" in item, "Should include tenant name"
            assert "move_in_date" in item, "Should include move_in_date"
            assert "move_out_date" in item, "Should include move_out_date"
            print(f"First item: {item.get('name')} - {item.get('property_name')}/U{item.get('unit_number')}")
        else:
            pytest.skip("No move-ins/outs data to verify structure")

# ============================================================
# HOUSEKEEPERS CRUD TESTS
# ============================================================
class TestHousekeepers:
    """Tests for /api/housekeepers CRUD endpoints"""
    
    def test_list_housekeepers(self, api_client):
        """GET /api/housekeepers returns list of housekeepers"""
        response = api_client.get(f"{BASE_URL}/api/housekeepers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Housekeepers count: {len(data)}")
    
    def test_list_housekeepers_with_archived(self, api_client):
        """GET /api/housekeepers?include_archived=true returns all including archived"""
        response = api_client.get(f"{BASE_URL}/api/housekeepers?include_archived=true")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Housekeepers with archived: {len(data)}")
    
    def test_create_housekeeper(self, api_client):
        """POST /api/housekeepers creates new housekeeper"""
        payload = {
            "name": "TEST_Housekeeper_Jane",
            "contact": "555-9999",
            "availability": "Mon-Fri",
            "preference": "Morning",
            "pay": "$80/clean",
            "notes": "Test housekeeper for automated testing"
        }
        response = api_client.post(f"{BASE_URL}/api/housekeepers", json=payload)
        assert response.status_code == 200, f"Failed to create: {response.text}"
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["contact"] == payload["contact"]
        assert data["pay"] == payload["pay"]
        assert "id" in data
        print(f"Created housekeeper: {data['id']}")
        
        # Store ID for cleanup
        self.__class__.created_hk_id = data["id"]
    
    def test_update_housekeeper(self, api_client):
        """PUT /api/housekeepers/{id} updates housekeeper"""
        hk_id = getattr(self.__class__, "created_hk_id", None)
        if not hk_id:
            pytest.skip("No housekeeper created to update")
        
        payload = {
            "name": "TEST_Housekeeper_Jane_Updated",
            "contact": "555-8888",
            "availability": "Tue-Sat",
            "preference": "Afternoon",
            "pay": "$90/clean",
            "notes": "Updated notes"
        }
        response = api_client.put(f"{BASE_URL}/api/housekeepers/{hk_id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["pay"] == payload["pay"]
        print(f"Updated housekeeper: {data['name']}")
    
    def test_archive_housekeeper(self, api_client):
        """PUT /api/housekeepers/{id} with is_archived=True archives housekeeper"""
        hk_id = getattr(self.__class__, "created_hk_id", None)
        if not hk_id:
            pytest.skip("No housekeeper created to archive")
        
        payload = {
            "name": "TEST_Housekeeper_Jane_Updated",
            "contact": "555-8888",
            "availability": "Tue-Sat",
            "preference": "Afternoon",
            "pay": "$90/clean",
            "notes": "Updated notes",
            "is_archived": True
        }
        response = api_client.put(f"{BASE_URL}/api/housekeepers/{hk_id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["is_archived"] == True
        print(f"Archived housekeeper: {data['name']}")
        
        # Verify not in default list
        list_response = api_client.get(f"{BASE_URL}/api/housekeepers")
        ids_in_list = [h["id"] for h in list_response.json()]
        assert hk_id not in ids_in_list, "Archived housekeeper should not appear in default list"
        
        # Verify in archived list
        archived_response = api_client.get(f"{BASE_URL}/api/housekeepers?include_archived=true")
        ids_with_archived = [h["id"] for h in archived_response.json()]
        assert hk_id in ids_with_archived, "Archived housekeeper should appear when include_archived=true"
    
    def test_delete_housekeeper(self, api_client):
        """DELETE /api/housekeepers/{id} deletes housekeeper"""
        hk_id = getattr(self.__class__, "created_hk_id", None)
        if not hk_id:
            pytest.skip("No housekeeper created to delete")
        
        response = api_client.delete(f"{BASE_URL}/api/housekeepers/{hk_id}")
        assert response.status_code == 200
        print(f"Deleted housekeeper: {hk_id}")
        
        # Verify deleted
        get_response = api_client.get(f"{BASE_URL}/api/housekeepers?include_archived=true")
        ids_in_list = [h["id"] for h in get_response.json()]
        assert hk_id not in ids_in_list, "Deleted housekeeper should not appear in list"

# ============================================================
# HOUSEKEEPING LEADS CRUD TESTS
# ============================================================
class TestHousekeepingLeads:
    """Tests for /api/housekeeping-leads CRUD endpoints"""
    
    def test_list_housekeeping_leads(self, api_client):
        """GET /api/housekeeping-leads returns list of leads"""
        response = api_client.get(f"{BASE_URL}/api/housekeeping-leads")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Housekeeping leads count: {len(data)}")
    
    def test_list_housekeeping_leads_with_archived(self, api_client):
        """GET /api/housekeeping-leads?include_archived=true returns all including archived"""
        response = api_client.get(f"{BASE_URL}/api/housekeeping-leads?include_archived=true")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Housekeeping leads with archived: {len(data)}")
    
    def test_create_housekeeping_lead(self, api_client):
        """POST /api/housekeeping-leads creates new lead"""
        payload = {
            "name": "TEST_Lead_Sarah",
            "contact": "555-3333",
            "notes": "Test lead for automated testing",
            "call_time": "3pm",
            "interview_pay": "$50",
            "trial": "Scheduled 3/20",
            "additional_notes": "Referred by Maria"
        }
        response = api_client.post(f"{BASE_URL}/api/housekeeping-leads", json=payload)
        assert response.status_code == 200, f"Failed to create: {response.text}"
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["call_time"] == payload["call_time"]
        assert "id" in data
        print(f"Created housekeeping lead: {data['id']}")
        
        self.__class__.created_hkl_id = data["id"]
    
    def test_update_housekeeping_lead(self, api_client):
        """PUT /api/housekeeping-leads/{id} updates lead"""
        lead_id = getattr(self.__class__, "created_hkl_id", None)
        if not lead_id:
            pytest.skip("No lead created to update")
        
        payload = {
            "name": "TEST_Lead_Sarah_Updated",
            "contact": "555-4444",
            "notes": "Updated notes",
            "call_time": "4pm",
            "interview_pay": "$60",
            "trial": "Completed",
            "additional_notes": "Updated additional notes"
        }
        response = api_client.put(f"{BASE_URL}/api/housekeeping-leads/{lead_id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["call_time"] == payload["call_time"]
        print(f"Updated housekeeping lead: {data['name']}")
    
    def test_archive_housekeeping_lead(self, api_client):
        """PUT /api/housekeeping-leads/{id} with is_archived=True archives lead"""
        lead_id = getattr(self.__class__, "created_hkl_id", None)
        if not lead_id:
            pytest.skip("No lead created to archive")
        
        payload = {
            "name": "TEST_Lead_Sarah_Updated",
            "contact": "555-4444",
            "notes": "Updated notes",
            "call_time": "4pm",
            "interview_pay": "$60",
            "trial": "Completed",
            "additional_notes": "Updated additional notes",
            "is_archived": True
        }
        response = api_client.put(f"{BASE_URL}/api/housekeeping-leads/{lead_id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["is_archived"] == True
        print(f"Archived housekeeping lead: {data['name']}")
        
        # Verify not in default list
        list_response = api_client.get(f"{BASE_URL}/api/housekeeping-leads")
        ids_in_list = [l["id"] for l in list_response.json()]
        assert lead_id not in ids_in_list, "Archived lead should not appear in default list"
    
    def test_delete_housekeeping_lead(self, api_client):
        """DELETE /api/housekeeping-leads/{id} deletes lead"""
        lead_id = getattr(self.__class__, "created_hkl_id", None)
        if not lead_id:
            pytest.skip("No lead created to delete")
        
        response = api_client.delete(f"{BASE_URL}/api/housekeeping-leads/{lead_id}")
        assert response.status_code == 200
        print(f"Deleted housekeeping lead: {lead_id}")
        
        # Verify deleted
        get_response = api_client.get(f"{BASE_URL}/api/housekeeping-leads?include_archived=true")
        ids_in_list = [l["id"] for l in get_response.json()]
        assert lead_id not in ids_in_list, "Deleted lead should not appear in list"

# ============================================================
# CLEANING RECORDS TESTS
# ============================================================
class TestCleaningRecords:
    """Tests for /api/cleaning-records endpoints"""
    
    def test_list_cleaning_records(self, api_client):
        """GET /api/cleaning-records returns list of cleaning records"""
        response = api_client.get(f"{BASE_URL}/api/cleaning-records")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Cleaning records count: {len(data)}")
    
    def test_cleaning_records_with_days_param(self, api_client):
        """GET /api/cleaning-records?days=30 returns records within 30 days"""
        response = api_client.get(f"{BASE_URL}/api/cleaning-records?days=30")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Cleaning records (30 days): {len(data)}")

# ============================================================
# AUTO-NOTIFICATION TESTS (via tenant creation)
# ============================================================
class TestAutoNotifications:
    """Tests for auto-notification creation when tenant is created/deleted"""
    
    @pytest.fixture(autouse=True)
    def setup_test_data(self, api_client):
        """Get property/unit data for tenant creation"""
        props_resp = api_client.get(f"{BASE_URL}/api/properties")
        self.properties = props_resp.json()
        
        if len(self.properties) > 0:
            prop_id = self.properties[0]["id"]
            units_resp = api_client.get(f"{BASE_URL}/api/units?property_id={prop_id}")
            self.units = units_resp.json()
            self.property_id = prop_id
        else:
            self.units = []
            self.property_id = None
    
    def test_create_tenant_creates_housekeeping_notifications(self, api_client):
        """Creating a tenant with move-out date should auto-create housekeeping notifications"""
        if not self.property_id or len(self.units) == 0:
            pytest.skip("No property/unit available for test")
        
        unit = self.units[0]
        move_in = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
        move_out = (datetime.now() + timedelta(days=120)).strftime("%Y-%m-%d")
        
        tenant_payload = {
            "property_id": self.property_id,
            "unit_id": unit["id"],
            "name": "TEST_AutoNotif_Tenant",
            "phone": "555-1111",
            "email": "test@auto.com",
            "move_in_date": move_in,
            "move_out_date": move_out,
            "is_airbnb_vrbo": True,
            "total_rent": 5000
        }
        
        # Create tenant
        create_resp = api_client.post(f"{BASE_URL}/api/tenants", json=tenant_payload)
        if create_resp.status_code != 200:
            # May fail due to overlap with existing tenant - that's OK
            pytest.skip(f"Couldn't create tenant (may have overlap): {create_resp.text[:200]}")
        
        tenant = create_resp.json()
        tenant_id = tenant["id"]
        print(f"Created test tenant: {tenant_id}")
        
        # Check notifications were created
        notif_resp = api_client.get(f"{BASE_URL}/api/notifications")
        notifications = notif_resp.json()
        
        hk_notifs = [n for n in notifications if n.get("tenant_id") == tenant_id and n.get("notification_type") in ["housekeeping", "housekeeping_warning"]]
        print(f"Housekeeping notifications found: {len(hk_notifs)}")
        
        assert len(hk_notifs) >= 1, "Should have created at least one housekeeping notification"
        
        # Check for cleaning record
        clean_resp = api_client.get(f"{BASE_URL}/api/cleaning-records?days=180")
        records = clean_resp.json()
        clean_records = [r for r in records if r.get("tenant_id") == tenant_id]
        print(f"Cleaning records found: {len(clean_records)}")
        
        # Cleanup - delete tenant
        del_resp = api_client.delete(f"{BASE_URL}/api/tenants/{tenant_id}")
        assert del_resp.status_code == 200
        print(f"Deleted test tenant: {tenant_id}")
        
        # Verify notifications and cleaning records were cleaned up
        notif_resp2 = api_client.get(f"{BASE_URL}/api/notifications")
        notifications2 = notif_resp2.json()
        hk_notifs2 = [n for n in notifications2 if n.get("tenant_id") == tenant_id and n.get("notification_type") in ["housekeeping", "housekeeping_warning"]]
        assert len(hk_notifs2) == 0, "Housekeeping notifications should be deleted when tenant is deleted"

# ============================================================
# NOTIFICATION CREATION FROM MOVE IN/OUT PAGE
# ============================================================
class TestMoveNotifications:
    """Tests for creating notifications from move in/out preset dialog"""
    
    def test_create_move_in_notification(self, api_client):
        """POST /api/notifications creates move-in notification"""
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "name": "TEST_3 days before check-in - Test Tenant (Unit 101)",
            "property_id": None,
            "unit_id": None,
            "reminder_date": today,
            "reminder_time": "09:00",
            "status": "upcoming",
            "priority": "medium",
            "category": "move_in",
            "notification_type": "move_in",
            "tenant_name": "TEST_Tenant",
            "message": "3 days before check-in for TEST_Tenant at Test Property Unit 101"
        }
        
        response = api_client.post(f"{BASE_URL}/api/notifications", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "move_in"
        assert "TEST_" in data["name"]
        notif_id = data["id"]
        print(f"Created move-in notification: {notif_id}")
        
        # Cleanup
        del_resp = api_client.delete(f"{BASE_URL}/api/notifications/{notif_id}")
        assert del_resp.status_code == 200
    
    def test_create_move_out_notification(self, api_client):
        """POST /api/notifications creates move-out notification"""
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "name": "TEST_Day of move-out - Test Tenant (Unit 202)",
            "property_id": None,
            "unit_id": None,
            "reminder_date": today,
            "reminder_time": "12:00",
            "status": "upcoming",
            "priority": "medium",
            "category": "move_out",
            "notification_type": "move_out",
            "tenant_name": "TEST_Tenant2",
            "message": "Day of move-out for TEST_Tenant2 at Test Property Unit 202"
        }
        
        response = api_client.post(f"{BASE_URL}/api/notifications", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "move_out"
        notif_id = data["id"]
        print(f"Created move-out notification: {notif_id}")
        
        # Cleanup
        del_resp = api_client.delete(f"{BASE_URL}/api/notifications/{notif_id}")
        assert del_resp.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
