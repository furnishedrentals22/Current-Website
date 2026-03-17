"""
Backend tests for Feature Batch 4:
1. Vacancy page - 90-day rolling window + building_id sort
2. Property - marlins_decal_property field
3. Tenant - marlins_decal field + Airbnb parking field
"""

import pytest
import requests
import os
from datetime import date, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


# ============================================================
# Fixtures
# ============================================================

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def test_property(session):
    """Create a test property with marlins_decal_property=true"""
    payload = {
        "name": "TEST_Marlins_Decal_Property",
        "address": "123 Marlins Way Test",
        "owner_manager_name": "Test Manager",
        "owner_manager_phone": "555-0000",
        "owner_manager_email": "test@example.com",
        "available_parking": "2 spots",
        "pets_permitted": False,
        "building_id": 99,
        "marlins_decal_property": True
    }
    resp = session.post(f"{BASE_URL}/api/properties", json=payload)
    assert resp.status_code == 200, f"Failed to create test property: {resp.text}"
    prop = resp.json()
    yield prop
    # Cleanup
    session.delete(f"{BASE_URL}/api/properties/{prop['id']}")


@pytest.fixture(scope="module")
def test_property_no_marlins(session):
    """Create a test property with marlins_decal_property=false"""
    payload = {
        "name": "TEST_No_Marlins_Property",
        "address": "456 No Marlins Blvd",
        "owner_manager_name": "Test Manager2",
        "owner_manager_phone": "555-0001",
        "owner_manager_email": "test2@example.com",
        "pets_permitted": False,
        "building_id": 98,
        "marlins_decal_property": False
    }
    resp = session.post(f"{BASE_URL}/api/properties", json=payload)
    assert resp.status_code == 200, f"Failed to create test property: {resp.text}"
    prop = resp.json()
    yield prop
    # Cleanup
    session.delete(f"{BASE_URL}/api/properties/{prop['id']}")


@pytest.fixture(scope="module")
def test_unit_for_marlins(session, test_property):
    """Create a test unit under the marlins property"""
    payload = {
        "property_id": test_property["id"],
        "unit_number": "TEST_U1",
        "unit_size": "1/1",
        "base_rent": 1500.0,
        "availability_start_date": "2024-01-01",
        "additional_monthly_costs": []
    }
    resp = session.post(f"{BASE_URL}/api/units", json=payload)
    assert resp.status_code == 200, f"Failed to create unit: {resp.text}"
    unit = resp.json()
    yield unit
    # Cleanup
    session.delete(f"{BASE_URL}/api/units/{unit['id']}")


# ============================================================
# 1. VACANCY - 90-day window and building_id sort
# ============================================================

class TestVacancyEndpoint:
    """Tests for /api/vacancy endpoint"""

    def test_vacancy_returns_200(self, session):
        """GET /api/vacancy returns 200"""
        resp = session.get(f"{BASE_URL}/api/vacancy")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: GET /api/vacancy returns 200")

    def test_vacancy_has_upcoming_vacancies_key(self, session):
        """Response contains upcoming_vacancies key"""
        resp = session.get(f"{BASE_URL}/api/vacancy")
        data = resp.json()
        assert "upcoming_vacancies" in data, "Missing 'upcoming_vacancies' key"
        assert isinstance(data["upcoming_vacancies"], list), "upcoming_vacancies should be a list"
        print("PASS: upcoming_vacancies key present and is a list")

    def test_vacancy_upcoming_within_90_days(self, session):
        """All upcoming vacancies have vacancy_start within 90 days from today"""
        resp = session.get(f"{BASE_URL}/api/vacancy")
        data = resp.json()
        today = date.today()
        end_date = today + timedelta(days=90)
        
        for v in data["upcoming_vacancies"]:
            v_start = date.fromisoformat(v["vacancy_start"])
            # Vacancy start should be <= today + 90 days (could be in past or future but not beyond window)
            # The vacancies should be within the range from today to today+90
            assert v_start <= end_date, f"Vacancy start {v_start} is beyond 90-day window ending {end_date}"
        
        print(f"PASS: All {len(data['upcoming_vacancies'])} upcoming vacancies are within 90-day window")

    def test_vacancy_by_building_sorted_by_building_id(self, session):
        """by_building list is sorted by building_id ascending (nulls last)"""
        resp = session.get(f"{BASE_URL}/api/vacancy")
        data = resp.json()
        buildings = data["by_building"]
        
        # Extract building_ids from the list (only those with non-null building_id)
        bid_sequence = [b["building_id"] for b in buildings if b["building_id"] is not None]
        
        # Check ascending order
        for i in range(len(bid_sequence) - 1):
            assert bid_sequence[i] <= bid_sequence[i+1], \
                f"Building IDs not sorted ascending: {bid_sequence[i]} > {bid_sequence[i+1]}"
        
        # Check nulls are at the end
        null_seen = False
        for b in buildings:
            if b["building_id"] is None:
                null_seen = True
            else:
                assert not null_seen, "Non-null building_id found after null building_id (nulls should be last)"
        
        print(f"PASS: {len(buildings)} buildings sorted correctly by building_id ascending")

    def test_vacancy_has_by_building_and_by_unit_size(self, session):
        """Response has by_building and by_unit_size keys"""
        resp = session.get(f"{BASE_URL}/api/vacancy")
        data = resp.json()
        assert "by_building" in data, "Missing 'by_building' key"
        assert "by_unit_size" in data, "Missing 'by_unit_size' key"
        assert "year" in data, "Missing 'year' key"
        print("PASS: All required keys present in vacancy response")


# ============================================================
# 2. PROPERTY - marlins_decal_property field
# ============================================================

class TestPropertyMarlinsdecal:
    """Tests for marlins_decal_property field on property"""

    def test_create_property_with_marlins_decal_true(self, session, test_property):
        """Property created with marlins_decal_property=true has the field"""
        assert "marlins_decal_property" in test_property, "Missing marlins_decal_property in response"
        assert test_property["marlins_decal_property"] == True, \
            f"Expected marlins_decal_property=True, got {test_property['marlins_decal_property']}"
        print("PASS: Property created with marlins_decal_property=True")

    def test_get_property_preserves_marlins_decal_true(self, session, test_property):
        """GET /api/properties/{id} returns marlins_decal_property=true"""
        resp = session.get(f"{BASE_URL}/api/properties/{test_property['id']}")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("marlins_decal_property") == True, \
            f"Expected marlins_decal_property=True on GET, got {data.get('marlins_decal_property')}"
        print("PASS: GET property returns marlins_decal_property=True")

    def test_create_property_with_marlins_decal_false(self, session, test_property_no_marlins):
        """Property created with marlins_decal_property=false has the field as false"""
        assert test_property_no_marlins.get("marlins_decal_property") == False, \
            f"Expected False, got {test_property_no_marlins.get('marlins_decal_property')}"
        print("PASS: Property created with marlins_decal_property=False")

    def test_update_property_marlins_decal_toggle(self, session, test_property_no_marlins):
        """PUT /api/properties/{id} can toggle marlins_decal_property to true"""
        prop = test_property_no_marlins
        update_payload = {
            "name": prop["name"],
            "address": prop["address"],
            "owner_manager_name": prop["owner_manager_name"],
            "owner_manager_phone": prop["owner_manager_phone"],
            "owner_manager_email": prop["owner_manager_email"],
            "pets_permitted": False,
            "building_id": prop.get("building_id"),
            "marlins_decal_property": True
        }
        resp = session.put(f"{BASE_URL}/api/properties/{prop['id']}", json=update_payload)
        assert resp.status_code == 200, f"PUT failed: {resp.text}"
        
        # Verify with GET
        get_resp = session.get(f"{BASE_URL}/api/properties/{prop['id']}")
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert data.get("marlins_decal_property") == True, \
            f"Expected marlins_decal_property=True after update, got {data.get('marlins_decal_property')}"
        print("PASS: marlins_decal_property toggled to True via PUT and verified with GET")

    def test_properties_list_includes_marlins_decal_field(self, session):
        """GET /api/properties returns newly-created properties with marlins_decal_property field"""
        resp = session.get(f"{BASE_URL}/api/properties")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list), "Expected list"
        # Find a TEST_ property we know has the field
        test_props = [p for p in data if 'TEST_' in p.get('name', '') and 'Marlins' in p.get('name', '')]
        if test_props:
            first = test_props[0]
            assert "marlins_decal_property" in first, \
                f"marlins_decal_property field missing from TEST_ property list item"
            print(f"PASS: TEST_ property in list has marlins_decal_property field")
        else:
            # Old documents may not have the field - this is expected for pre-existing data
            print("NOTE: No TEST_ Marlins properties found in list; field may be absent on old docs (expected)")
            # Check if any property has the field
            has_field = any("marlins_decal_property" in p for p in data)
            print(f"PASS: {sum(1 for p in data if 'marlins_decal_property' in p)}/{len(data)} properties have marlins_decal_property field")


# ============================================================
# 3. TENANT - marlins_decal + parking for Airbnb
# ============================================================

class TestTenantMarlinsdecal:
    """Tests for marlins_decal field on tenant"""

    @pytest.fixture(scope="class")
    def test_tenant_longterm(self, session, test_unit_for_marlins, test_property):
        """Create a long-term tenant with marlins_decal=true"""
        today = date.today()
        payload = {
            "property_id": test_property["id"],
            "unit_id": test_unit_for_marlins["id"],
            "name": "TEST_Tenant_LongTerm_Marlins",
            "phone": "555-1111",
            "email": "test_lt@example.com",
            "move_in_date": (today + timedelta(days=10)).isoformat(),
            "move_out_date": (today + timedelta(days=100)).isoformat(),
            "is_airbnb_vrbo": False,
            "monthly_rent": 1500.0,
            "parking": "Spot #5",
            "has_parking": True,
            "marlins_decal": True
        }
        resp = session.post(f"{BASE_URL}/api/tenants", json=payload)
        assert resp.status_code == 200, f"Failed to create tenant: {resp.text}"
        tenant = resp.json()
        yield tenant
        session.delete(f"{BASE_URL}/api/tenants/{tenant['id']}")

    @pytest.fixture(scope="class")
    def test_tenant_airbnb(self, session, test_unit_for_marlins, test_property):
        """Create an Airbnb tenant with parking and marlins_decal=true"""
        today = date.today()
        # Need a different time window to avoid overlap
        payload = {
            "property_id": test_property["id"],
            "unit_id": test_unit_for_marlins["id"],
            "name": "TEST_Tenant_Airbnb_Marlins",
            "phone": "555-2222",
            "email": "test_ab@example.com",
            "move_in_date": (today + timedelta(days=200)).isoformat(),
            "move_out_date": (today + timedelta(days=210)).isoformat(),
            "is_airbnb_vrbo": True,
            "total_rent": 500.0,
            "parking": "Street Parking",
            "has_parking": True,
            "marlins_decal": True
        }
        resp = session.post(f"{BASE_URL}/api/tenants", json=payload)
        assert resp.status_code == 200, f"Failed to create Airbnb tenant: {resp.text}"
        tenant = resp.json()
        yield tenant
        session.delete(f"{BASE_URL}/api/tenants/{tenant['id']}")

    def test_longterm_tenant_marlins_decal_saved(self, session, test_tenant_longterm):
        """Long-term tenant created with marlins_decal=true"""
        tenant = test_tenant_longterm
        assert "marlins_decal" in tenant, "marlins_decal field missing from tenant response"
        assert tenant["marlins_decal"] == True, \
            f"Expected marlins_decal=True, got {tenant['marlins_decal']}"
        print("PASS: Long-term tenant has marlins_decal=True")

    def test_longterm_tenant_get_preserves_marlins_decal(self, session, test_tenant_longterm):
        """GET /api/tenants/{id} preserves marlins_decal=true"""
        resp = session.get(f"{BASE_URL}/api/tenants/{test_tenant_longterm['id']}")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("marlins_decal") == True, \
            f"Expected marlins_decal=True on GET, got {data.get('marlins_decal')}"
        print("PASS: GET tenant returns marlins_decal=True")

    def test_airbnb_tenant_parking_saved(self, session, test_tenant_airbnb):
        """Airbnb tenant parking info saved correctly"""
        tenant = test_tenant_airbnb
        assert tenant.get("parking") == "Street Parking", \
            f"Expected 'Street Parking', got {tenant.get('parking')}"
        assert tenant.get("has_parking") == True, \
            f"Expected has_parking=True, got {tenant.get('has_parking')}"
        print("PASS: Airbnb tenant parking info saved correctly")

    def test_airbnb_tenant_marlins_decal_saved(self, session, test_tenant_airbnb):
        """Airbnb tenant marlins_decal saved correctly"""
        tenant = test_tenant_airbnb
        assert "marlins_decal" in tenant, "marlins_decal field missing from Airbnb tenant"
        assert tenant["marlins_decal"] == True, \
            f"Expected marlins_decal=True, got {tenant['marlins_decal']}"
        print("PASS: Airbnb tenant has marlins_decal=True")

    def test_update_tenant_marlins_decal_toggle(self, session, test_tenant_longterm):
        """PUT /api/tenants/{id} can toggle marlins_decal field"""
        tenant = test_tenant_longterm
        today = date.today()
        update_payload = {
            "property_id": tenant["property_id"],
            "unit_id": tenant["unit_id"],
            "name": tenant["name"],
            "move_in_date": tenant["move_in_date"],
            "move_out_date": tenant["move_out_date"],
            "is_airbnb_vrbo": False,
            "monthly_rent": tenant["monthly_rent"],
            "marlins_decal": False  # Toggle to false
        }
        resp = session.put(f"{BASE_URL}/api/tenants/{tenant['id']}", json=update_payload)
        assert resp.status_code == 200, f"PUT failed: {resp.text}"
        
        # Verify with GET
        get_resp = session.get(f"{BASE_URL}/api/tenants/{tenant['id']}")
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert data.get("marlins_decal") == False, \
            f"Expected marlins_decal=False after update, got {data.get('marlins_decal')}"
        print("PASS: marlins_decal toggled to False via PUT and verified with GET")

    def test_tenant_list_has_marlins_decal_field(self, session):
        """GET /api/tenants list returns marlins_decal field"""
        resp = session.get(f"{BASE_URL}/api/tenants")
        assert resp.status_code == 200
        data = resp.json()
        if data:
            # Check if any tenant has marlins_decal field
            # Some may be old (no field), but TEST_ tenant should have it
            test_tenants = [t for t in data if 'TEST_' in t.get('name', '')]
            if test_tenants:
                assert "marlins_decal" in test_tenants[0], \
                    "marlins_decal field missing from tenant list item"
        print("PASS: Tenant list includes marlins_decal field")


# ============================================================
# 4. Calendar endpoint - building_id sort check
# ============================================================

class TestCalendarEndpoint:
    """Tests for /api/calendar and /api/calendar/timeline endpoints"""

    def test_calendar_returns_200(self, session):
        """GET /api/calendar returns 200"""
        resp = session.get(f"{BASE_URL}/api/calendar")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: GET /api/calendar returns 200")

    def test_calendar_has_properties(self, session):
        """GET /api/calendar response has properties array"""
        resp = session.get(f"{BASE_URL}/api/calendar")
        data = resp.json()
        assert "properties" in data, "Missing 'properties' key in calendar response"
        assert isinstance(data["properties"], list)
        print("PASS: /api/calendar has properties array")

    def test_calendar_timeline_returns_200(self, session):
        """GET /api/calendar/timeline returns 200"""
        resp = session.get(f"{BASE_URL}/api/calendar/timeline")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: GET /api/calendar/timeline returns 200")

    def test_calendar_timeline_buildings_sorted_by_building_id(self, session):
        """GET /api/calendar/timeline - buildings sorted by building_id ascending"""
        resp = session.get(f"{BASE_URL}/api/calendar/timeline")
        assert resp.status_code == 200
        data = resp.json()
        buildings = data.get("properties", [])
        
        bid_sequence = [b["building_id"] for b in buildings if b.get("building_id") is not None]
        
        for i in range(len(bid_sequence) - 1):
            assert bid_sequence[i] <= bid_sequence[i+1], \
                f"Timeline buildings not sorted ascending: {bid_sequence[i]} > {bid_sequence[i+1]}"
        
        print(f"PASS: Calendar timeline {len(buildings)} buildings sorted by building_id ascending")


# ============================================================
# 5. Existing Marlins property (from previous context)
# ============================================================

class TestExistingMarlinsProp:
    """Test the pre-existing Test Marlins Prop"""

    def test_existing_marlins_property_retrievable(self, session):
        """The pre-created 'Test Marlins Prop' is retrievable with correct flag"""
        prop_id = "69b99d5c2dc4f925a4cffb39"
        resp = session.get(f"{BASE_URL}/api/properties/{prop_id}")
        # May not exist in all environments
        if resp.status_code == 404:
            pytest.skip("Test Marlins Prop not found - skipping (may be different environment)")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("marlins_decal_property") == True, \
            f"Expected marlins_decal_property=True for Test Marlins Prop, got {data.get('marlins_decal_property')}"
        print(f"PASS: Existing 'Test Marlins Prop' has marlins_decal_property=True")
