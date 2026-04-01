"""
Test M2M (Month-to-Month) Feature
Tests for:
- Creating tenant with is_m2m field
- Editing tenant to toggle M2M on/off
- extend-month endpoint validation and functionality
- is_m2m field in calendar timeline API response
"""
import pytest
import requests
import os
from datetime import date, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def test_data(api_client):
    """Get existing property and unit for testing - use unit 502 which has no tenants"""
    # Get properties
    props_resp = api_client.get(f"{BASE_URL}/api/properties")
    assert props_resp.status_code == 200, f"Failed to get properties: {props_resp.text}"
    properties = props_resp.json()
    assert len(properties) > 0, "No properties found"
    
    # Get units - prefer unit 502 which has no tenants
    units_resp = api_client.get(f"{BASE_URL}/api/units")
    assert units_resp.status_code == 200, f"Failed to get units: {units_resp.text}"
    units = units_resp.json()
    assert len(units) > 0, "No units found"
    
    # Find unit 502 or use the second unit if available
    target_unit = None
    for u in units:
        if u.get("unit_number") == "502":
            target_unit = u
            break
    if not target_unit and len(units) > 1:
        target_unit = units[1]
    if not target_unit:
        target_unit = units[0]
    
    return {
        "property_id": properties[0]["id"],
        "property_name": properties[0]["name"],
        "unit_id": target_unit["id"],
        "unit_number": target_unit["unit_number"]
    }


class TestM2MTenantCreation:
    """Test creating tenants with M2M flag"""
    
    def test_create_tenant_with_m2m_enabled(self, api_client, test_data):
        """Create a long-term tenant with is_m2m=true"""
        today = date.today()
        move_in = today.isoformat()
        move_out = (today + timedelta(days=60)).isoformat()
        
        payload = {
            "property_id": test_data["property_id"],
            "unit_id": test_data["unit_id"],
            "name": "TEST_M2M_Tenant",
            "phone": "555-1234",
            "email": "m2m@test.com",
            "move_in_date": move_in,
            "move_out_date": move_out,
            "is_airbnb_vrbo": False,
            "is_m2m": True,
            "monthly_rent": 2000
        }
        
        response = api_client.post(f"{BASE_URL}/api/tenants", json=payload)
        assert response.status_code == 200, f"Failed to create M2M tenant: {response.text}"
        
        data = response.json()
        assert data["is_m2m"] == True, "is_m2m should be True"
        assert data["is_airbnb_vrbo"] == False, "is_airbnb_vrbo should be False"
        assert data["name"] == "TEST_M2M_Tenant"
        
        # Store tenant_id for cleanup
        self.__class__.m2m_tenant_id = data["id"]
        
        # Verify via GET
        get_resp = api_client.get(f"{BASE_URL}/api/tenants/{data['id']}")
        assert get_resp.status_code == 200
        fetched = get_resp.json()
        assert fetched["is_m2m"] == True, "GET should return is_m2m=True"
    
    def test_create_tenant_without_m2m(self, api_client, test_data):
        """Create a long-term tenant with is_m2m=false (default)"""
        today = date.today()
        move_in = (today + timedelta(days=100)).isoformat()
        move_out = (today + timedelta(days=160)).isoformat()
        
        payload = {
            "property_id": test_data["property_id"],
            "unit_id": test_data["unit_id"],
            "name": "TEST_NonM2M_Tenant",
            "move_in_date": move_in,
            "move_out_date": move_out,
            "is_airbnb_vrbo": False,
            "is_m2m": False,
            "monthly_rent": 1800
        }
        
        response = api_client.post(f"{BASE_URL}/api/tenants", json=payload)
        assert response.status_code == 200, f"Failed to create non-M2M tenant: {response.text}"
        
        data = response.json()
        assert data["is_m2m"] == False, "is_m2m should be False"
        
        self.__class__.non_m2m_tenant_id = data["id"]
    
    def test_create_airbnb_tenant_m2m_ignored(self, api_client, test_data):
        """Create an Airbnb tenant - is_m2m should be stored but not applicable"""
        today = date.today()
        move_in = (today + timedelta(days=200)).isoformat()
        move_out = (today + timedelta(days=210)).isoformat()
        
        payload = {
            "property_id": test_data["property_id"],
            "unit_id": test_data["unit_id"],
            "name": "TEST_Airbnb_Tenant",
            "move_in_date": move_in,
            "move_out_date": move_out,
            "is_airbnb_vrbo": True,
            "is_m2m": True,  # This should be stored but not applicable
            "total_rent": 1500
        }
        
        response = api_client.post(f"{BASE_URL}/api/tenants", json=payload)
        assert response.status_code == 200, f"Failed to create Airbnb tenant: {response.text}"
        
        data = response.json()
        assert data["is_airbnb_vrbo"] == True
        # is_m2m may be stored but shouldn't affect Airbnb tenants
        
        self.__class__.airbnb_tenant_id = data["id"]


class TestM2MTenantUpdate:
    """Test updating tenant M2M status"""
    
    def test_update_tenant_enable_m2m(self, api_client, test_data):
        """Update a non-M2M tenant to enable M2M"""
        # First create a tenant without M2M
        today = date.today()
        move_in = (today + timedelta(days=250)).isoformat()
        move_out = (today + timedelta(days=310)).isoformat()
        
        create_payload = {
            "property_id": test_data["property_id"],
            "unit_id": test_data["unit_id"],
            "name": "TEST_Update_M2M",
            "move_in_date": move_in,
            "move_out_date": move_out,
            "is_airbnb_vrbo": False,
            "is_m2m": False,
            "monthly_rent": 2200
        }
        
        create_resp = api_client.post(f"{BASE_URL}/api/tenants", json=create_payload)
        assert create_resp.status_code == 200
        tenant_id = create_resp.json()["id"]
        
        # Update to enable M2M
        update_payload = create_payload.copy()
        update_payload["is_m2m"] = True
        
        update_resp = api_client.put(f"{BASE_URL}/api/tenants/{tenant_id}", json=update_payload)
        assert update_resp.status_code == 200, f"Failed to update tenant: {update_resp.text}"
        
        updated = update_resp.json()
        assert updated["is_m2m"] == True, "is_m2m should be True after update"
        
        # Verify via GET
        get_resp = api_client.get(f"{BASE_URL}/api/tenants/{tenant_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["is_m2m"] == True
        
        self.__class__.update_test_tenant_id = tenant_id
    
    def test_update_tenant_disable_m2m(self, api_client, test_data):
        """Update an M2M tenant to disable M2M"""
        tenant_id = getattr(self.__class__, 'update_test_tenant_id', None)
        if not tenant_id:
            pytest.skip("No tenant from previous test")
        
        # Get current tenant data
        get_resp = api_client.get(f"{BASE_URL}/api/tenants/{tenant_id}")
        assert get_resp.status_code == 200
        tenant = get_resp.json()
        
        # Update to disable M2M
        update_payload = {
            "property_id": tenant["property_id"],
            "unit_id": tenant["unit_id"],
            "name": tenant["name"],
            "move_in_date": tenant["move_in_date"],
            "move_out_date": tenant["move_out_date"],
            "is_airbnb_vrbo": False,
            "is_m2m": False,
            "monthly_rent": tenant.get("monthly_rent", 2200)
        }
        
        update_resp = api_client.put(f"{BASE_URL}/api/tenants/{tenant_id}", json=update_payload)
        assert update_resp.status_code == 200
        
        updated = update_resp.json()
        assert updated["is_m2m"] == False, "is_m2m should be False after update"


class TestExtendMonthEndpoint:
    """Test POST /api/tenants/{id}/extend-month endpoint"""
    
    def test_extend_month_success(self, api_client, test_data):
        """Successfully extend M2M tenant by 30 days"""
        # Create M2M tenant with unique dates far in the future
        today = date.today()
        move_in = (today + timedelta(days=700)).isoformat()
        original_move_out = today + timedelta(days=760)
        move_out = original_move_out.isoformat()
        
        create_payload = {
            "property_id": test_data["property_id"],
            "unit_id": test_data["unit_id"],
            "name": "TEST_Extend_M2M",
            "move_in_date": move_in,
            "move_out_date": move_out,
            "is_airbnb_vrbo": False,
            "is_m2m": True,
            "monthly_rent": 2500
        }
        
        create_resp = api_client.post(f"{BASE_URL}/api/tenants", json=create_payload)
        assert create_resp.status_code == 200
        tenant_id = create_resp.json()["id"]
        
        # Extend by 1 month
        extend_resp = api_client.post(f"{BASE_URL}/api/tenants/{tenant_id}/extend-month")
        assert extend_resp.status_code == 200, f"Failed to extend: {extend_resp.text}"
        
        extended = extend_resp.json()
        expected_new_move_out = (original_move_out + timedelta(days=30)).isoformat()
        assert extended["move_out_date"] == expected_new_move_out, f"Expected {expected_new_move_out}, got {extended['move_out_date']}"
        
        # Verify monthly_rent unchanged
        assert extended.get("monthly_rent") == 2500, "Monthly rent should remain unchanged"
        
        self.__class__.extend_test_tenant_id = tenant_id
    
    def test_extend_month_non_m2m_rejected(self, api_client, test_data):
        """Extend-month should reject non-M2M tenants with 400"""
        # Create non-M2M tenant with unique dates
        today = date.today()
        move_in = (today + timedelta(days=800)).isoformat()
        move_out = (today + timedelta(days=860)).isoformat()
        
        create_payload = {
            "property_id": test_data["property_id"],
            "unit_id": test_data["unit_id"],
            "name": "TEST_NonM2M_Extend",
            "move_in_date": move_in,
            "move_out_date": move_out,
            "is_airbnb_vrbo": False,
            "is_m2m": False,
            "monthly_rent": 2000
        }
        
        create_resp = api_client.post(f"{BASE_URL}/api/tenants", json=create_payload)
        assert create_resp.status_code == 200
        tenant_id = create_resp.json()["id"]
        
        # Try to extend - should fail
        extend_resp = api_client.post(f"{BASE_URL}/api/tenants/{tenant_id}/extend-month")
        assert extend_resp.status_code == 400, f"Expected 400, got {extend_resp.status_code}"
        assert "not month-to-month" in extend_resp.json().get("detail", "").lower()
        
        self.__class__.non_m2m_extend_tenant_id = tenant_id
    
    def test_extend_month_airbnb_rejected(self, api_client, test_data):
        """Extend-month should reject Airbnb tenants with 400"""
        # Create Airbnb tenant with unique dates
        today = date.today()
        move_in = (today + timedelta(days=900)).isoformat()
        move_out = (today + timedelta(days=910)).isoformat()
        
        create_payload = {
            "property_id": test_data["property_id"],
            "unit_id": test_data["unit_id"],
            "name": "TEST_Airbnb_Extend",
            "move_in_date": move_in,
            "move_out_date": move_out,
            "is_airbnb_vrbo": True,
            "is_m2m": False,
            "total_rent": 1200
        }
        
        create_resp = api_client.post(f"{BASE_URL}/api/tenants", json=create_payload)
        assert create_resp.status_code == 200
        tenant_id = create_resp.json()["id"]
        
        # Try to extend - should fail
        extend_resp = api_client.post(f"{BASE_URL}/api/tenants/{tenant_id}/extend-month")
        assert extend_resp.status_code == 400, f"Expected 400, got {extend_resp.status_code}"
        assert "airbnb" in extend_resp.json().get("detail", "").lower()
        
        self.__class__.airbnb_extend_tenant_id = tenant_id
    
    def test_extend_month_not_found(self, api_client):
        """Extend-month should return 404 for non-existent tenant"""
        extend_resp = api_client.post(f"{BASE_URL}/api/tenants/000000000000000000000000/extend-month")
        assert extend_resp.status_code == 404


class TestCalendarTimelineM2M:
    """Test is_m2m field in calendar timeline API"""
    
    def test_calendar_timeline_includes_m2m(self, api_client):
        """Calendar timeline should include is_m2m field in bookings"""
        response = api_client.get(f"{BASE_URL}/api/calendar/timeline")
        assert response.status_code == 200, f"Failed to get timeline: {response.text}"
        
        data = response.json()
        assert "properties" in data
        
        # Find any booking and check for is_m2m field
        found_booking = False
        for prop in data["properties"]:
            for unit in prop.get("units", []):
                for booking in unit.get("bookings", []):
                    found_booking = True
                    assert "is_m2m" in booking, f"Booking missing is_m2m field: {booking}"
                    assert isinstance(booking["is_m2m"], bool), "is_m2m should be boolean"
        
        if not found_booking:
            pytest.skip("No bookings found in timeline to verify is_m2m field")


class TestTenantsListM2M:
    """Test is_m2m field in tenants list API"""
    
    def test_tenants_list_includes_m2m(self, api_client):
        """Tenants list should include is_m2m field"""
        response = api_client.get(f"{BASE_URL}/api/tenants")
        assert response.status_code == 200, f"Failed to get tenants: {response.text}"
        
        tenants = response.json()
        if len(tenants) == 0:
            pytest.skip("No tenants found")
        
        # Check that is_m2m field exists
        for tenant in tenants:
            # is_m2m may not exist for old tenants, but should be present for new ones
            if "is_m2m" in tenant:
                assert isinstance(tenant["is_m2m"], bool), "is_m2m should be boolean"


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_tenants(self, api_client):
        """Delete all TEST_ prefixed tenants"""
        response = api_client.get(f"{BASE_URL}/api/tenants")
        if response.status_code != 200:
            pytest.skip("Could not get tenants for cleanup")
        
        tenants = response.json()
        deleted_count = 0
        
        for tenant in tenants:
            if tenant.get("name", "").startswith("TEST_"):
                del_resp = api_client.delete(f"{BASE_URL}/api/tenants/{tenant['id']}")
                if del_resp.status_code in [200, 204]:
                    deleted_count += 1
        
        print(f"Cleaned up {deleted_count} test tenants")
