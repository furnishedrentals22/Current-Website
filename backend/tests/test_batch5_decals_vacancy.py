"""
Batch 5 Backend Tests:
1. Vacancy bug fix - bounded gap when future tenant is outside 90-day window
2. Marlins Decals CRUD (GET list with enrichment, POST create, DELETE + clear tenant assignment)
3. Tenant marlins_decal_id field integration
"""

import pytest
import requests
import os
from datetime import date, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

MARLINS_PROP_ID = "69b99d5c2dc4f925a4cffb39"

# ============================================================
# FIXTURES
# ============================================================

@pytest.fixture(scope="module")
def api():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def test_property(api):
    """Create a TEST property for vacancy tests, clean up after module."""
    payload = {
        "name": "TEST_Vacancy_Prop_Batch5",
        "address": "999 TEST Vacancy St",
        "owner_manager_name": "Test Owner",
        "owner_manager_phone": "555-0001",
        "owner_manager_email": "test@test.com",
        "marlins_decal_property": False
    }
    resp = api.post(f"{BASE_URL}/api/properties", json=payload)
    assert resp.status_code == 200
    prop = resp.json()
    yield prop
    # Cleanup
    api.delete(f"{BASE_URL}/api/properties/{prop['id']}")


@pytest.fixture(scope="module")
def test_unit(api, test_property):
    """Create a TEST unit for vacancy tests."""
    today = date.today()
    avail_start = (today - timedelta(days=365)).isoformat()
    payload = {
        "property_id": test_property["id"],
        "unit_number": "TEST-VAC-1",
        "unit_size": "1/1",
        "base_rent": 1500.0,
        "availability_start_date": avail_start
    }
    resp = api.post(f"{BASE_URL}/api/units", json=payload)
    assert resp.status_code == 200
    unit = resp.json()
    yield unit
    # Cleanup
    api.delete(f"{BASE_URL}/api/units/{unit['id']}")


@pytest.fixture(scope="module")
def vacancy_test_tenants(api, test_unit):
    """Create Tenant A (move_out within 90 days) + Tenant B (move_in > 90 days) for vacancy test."""
    today = date.today()
    # Tenant A: currently in unit, moves out in ~45 days (within 90-day window)
    tenant_a_in = (today - timedelta(days=30)).isoformat()
    tenant_a_out = (today + timedelta(days=45)).isoformat()
    # Tenant B: starts ~120 days from now (OUTSIDE 90-day window)
    tenant_b_in = (today + timedelta(days=120)).isoformat()
    tenant_b_out = (today + timedelta(days=200)).isoformat()

    a_payload = {
        "property_id": test_unit["property_id"],
        "unit_id": test_unit["id"],
        "name": "TEST_TenantA_Vacancy",
        "move_in_date": tenant_a_in,
        "move_out_date": tenant_a_out,
        "is_airbnb_vrbo": False,
        "monthly_rent": 1500.0
    }
    resp_a = api.post(f"{BASE_URL}/api/tenants", json=a_payload)
    assert resp_a.status_code == 200, f"Create tenant A failed: {resp_a.text}"
    tenant_a = resp_a.json()

    b_payload = {
        "property_id": test_unit["property_id"],
        "unit_id": test_unit["id"],
        "name": "TEST_TenantB_Vacancy",
        "move_in_date": tenant_b_in,
        "move_out_date": tenant_b_out,
        "is_airbnb_vrbo": False,
        "monthly_rent": 1500.0
    }
    resp_b = api.post(f"{BASE_URL}/api/tenants", json=b_payload)
    assert resp_b.status_code == 200, f"Create tenant B failed: {resp_b.text}"
    tenant_b = resp_b.json()

    yield {"tenant_a": tenant_a, "tenant_b": tenant_b,
           "a_out": tenant_a_out, "b_in": tenant_b_in}

    # Cleanup
    api.delete(f"{BASE_URL}/api/tenants/{tenant_a['id']}")
    api.delete(f"{BASE_URL}/api/tenants/{tenant_b['id']}")


# ============================================================
# VACANCY BUG FIX TESTS
# ============================================================

class TestVacancyBugFix:
    """Tests for the vacancy bug fix: future tenant outside 90-day window"""

    def test_vacancy_endpoint_returns_200(self, api):
        resp = api.get(f"{BASE_URL}/api/vacancy")
        assert resp.status_code == 200, f"Vacancy endpoint failed: {resp.text}"

    def test_vacancy_has_upcoming_vacancies(self, api):
        resp = api.get(f"{BASE_URL}/api/vacancy")
        data = resp.json()
        assert "upcoming_vacancies" in data
        assert isinstance(data["upcoming_vacancies"], list)

    def test_vacancy_bounded_gap_not_forward(self, api, vacancy_test_tenants):
        """Core test: vacancy between Tenant A (out within 90d) and Tenant B (in after 90d)
        should show 'Vacant X to Y' NOT 'Vacant from X forward'."""
        today = date.today()
        tenant_a_out = vacancy_test_tenants["a_out"]
        tenant_b_in = vacancy_test_tenants["b_in"]
        unit_id = vacancy_test_tenants["tenant_a"]["unit_id"]

        resp = api.get(f"{BASE_URL}/api/vacancy")
        assert resp.status_code == 200

        data = resp.json()
        upcoming = data["upcoming_vacancies"]

        # Find our specific unit's vacancy
        unit_vacancies = [v for v in upcoming if v.get("unit_id") == unit_id]
        assert len(unit_vacancies) > 0, f"No vacancy found for test unit {unit_id}. All vacancies: {[v['unit_id'] for v in upcoming]}"

        # Check the vacancy for the gap between A and B
        gap_vacancies = [v for v in unit_vacancies if v.get("vacancy_start") == tenant_a_out]
        assert len(gap_vacancies) > 0, f"No vacancy with vacancy_start={tenant_a_out}. Unit vacancies: {unit_vacancies}"

        v = gap_vacancies[0]
        # CRITICAL: Should be bounded (has_future_tenant=True and vacancy_end set)
        assert v.get("has_future_tenant") is True, f"has_future_tenant should be True but got {v.get('has_future_tenant')}. Full vacancy: {v}"
        assert "vacancy_end" in v, f"vacancy_end missing from vacancy. Full vacancy: {v}"
        assert v.get("vacancy_end") == tenant_b_in, f"Expected vacancy_end={tenant_b_in} but got {v.get('vacancy_end')}"

        # Message should say "Vacant X to Y" not "Vacant from X forward"
        msg = v.get("message", "")
        assert "forward" not in msg.lower(), f"BUG: Message says '{msg}' instead of bounded range"
        assert tenant_b_in in msg, f"Message '{msg}' should contain future tenant start date {tenant_b_in}"
        print(f"✓ Vacancy message: {msg}")

    def test_vacancy_forward_message_for_no_future_tenant(self, api, test_unit, api_alias=None):
        """Unit with only one tenant (no future tenant) should show 'Vacant from X forward'."""
        today = date.today()
        # Create a unit with only one tenant (no future tenant)
        sess = requests.Session()
        sess.headers.update({"Content-Type": "application/json"})

        avail_start = (today - timedelta(days=365)).isoformat()
        unit_payload = {
            "property_id": test_unit["property_id"],
            "unit_number": "TEST-VAC-2",
            "unit_size": "1/1",
            "base_rent": 1500.0,
            "availability_start_date": avail_start
        }
        unit_resp = sess.post(f"{BASE_URL}/api/units", json=unit_payload)
        assert unit_resp.status_code == 200
        unit2 = unit_resp.json()
        unit2_id = unit2["id"]

        tenant_in = (today - timedelta(days=15)).isoformat()
        tenant_out = (today + timedelta(days=30)).isoformat()
        t_payload = {
            "property_id": test_unit["property_id"],
            "unit_id": unit2_id,
            "name": "TEST_SingleTenant_NoFuture",
            "move_in_date": tenant_in,
            "move_out_date": tenant_out,
            "is_airbnb_vrbo": False,
            "monthly_rent": 1500.0
        }
        t_resp = sess.post(f"{BASE_URL}/api/tenants", json=t_payload)
        assert t_resp.status_code == 200
        tenant = t_resp.json()

        try:
            resp = sess.get(f"{BASE_URL}/api/vacancy")
            data = resp.json()
            upcoming = data["upcoming_vacancies"]
            unit2_vac = [v for v in upcoming if v.get("unit_id") == unit2_id and v.get("vacancy_start") == tenant_out]
            if unit2_vac:
                v = unit2_vac[0]
                assert v.get("has_future_tenant") is False
                assert "forward" in v.get("message", "").lower()
                print(f"✓ No-future-tenant vacancy: {v.get('message')}")
        finally:
            sess.delete(f"{BASE_URL}/api/tenants/{tenant['id']}")
            sess.delete(f"{BASE_URL}/api/units/{unit2_id}")


# ============================================================
# MARLINS DECALS TESTS
# ============================================================

class TestMarlinsDecalsAPI:
    """Tests for /api/marlins-decals endpoints."""

    def test_get_marlins_decals_returns_200(self, api):
        resp = api.get(f"{BASE_URL}/api/marlins-decals")
        assert resp.status_code == 200

    def test_get_marlins_decals_returns_list(self, api):
        resp = api.get(f"{BASE_URL}/api/marlins-decals")
        data = resp.json()
        assert isinstance(data, list)

    def test_get_marlins_decals_with_property_filter(self, api):
        """GET /api/marlins-decals?property_id=... returns filtered results."""
        resp = api.get(f"{BASE_URL}/api/marlins-decals", params={"property_id": MARLINS_PROP_ID})
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        # All returned decals should belong to the filtered property
        for d in data:
            assert d["property_id"] == MARLINS_PROP_ID

    def test_get_marlins_decals_has_d001(self, api):
        """Pre-seeded D-001 should exist for property 69b99d5c2dc4f925a4cffb39."""
        resp = api.get(f"{BASE_URL}/api/marlins-decals", params={"property_id": MARLINS_PROP_ID})
        data = resp.json()
        decal_numbers = [d["decal_number"] for d in data]
        assert "D-001" in decal_numbers, f"D-001 not found in decals: {decal_numbers}"
        print(f"✓ D-001 present. All decals: {decal_numbers}")

    def test_get_marlins_decals_has_assigned_tenant_field(self, api):
        """Each decal should have an 'assigned_tenant' field (possibly None)."""
        resp = api.get(f"{BASE_URL}/api/marlins-decals")
        data = resp.json()
        if data:
            for d in data:
                assert "assigned_tenant" in d, f"Decal {d.get('decal_number')} missing assigned_tenant field"
            print(f"✓ All {len(data)} decals have assigned_tenant field")

    def test_post_marlins_decal_creates_decal(self, api):
        """POST /api/marlins-decals creates a new decal."""
        payload = {"property_id": MARLINS_PROP_ID, "decal_number": "TEST-D-999", "notes": "test decal"}
        resp = api.post(f"{BASE_URL}/api/marlins-decals", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["decal_number"] == "TEST-D-999"
        assert data["property_id"] == MARLINS_PROP_ID
        assert "id" in data
        assert data.get("assigned_tenant") is None
        print(f"✓ Created decal id={data['id']}, number={data['decal_number']}")

        # Cleanup
        api.delete(f"{BASE_URL}/api/marlins-decals/{data['id']}")

    def test_post_marlins_decal_persists_in_get(self, api):
        """After POST, the decal appears in GET list."""
        payload = {"property_id": MARLINS_PROP_ID, "decal_number": "TEST-D-888"}
        create_resp = api.post(f"{BASE_URL}/api/marlins-decals", json=payload)
        assert create_resp.status_code == 200
        decal_id = create_resp.json()["id"]

        try:
            get_resp = api.get(f"{BASE_URL}/api/marlins-decals", params={"property_id": MARLINS_PROP_ID})
            data = get_resp.json()
            ids = [d["id"] for d in data]
            assert decal_id in ids, f"Created decal {decal_id} not found in GET response"
            print(f"✓ Created decal {decal_id} persists in GET list")
        finally:
            api.delete(f"{BASE_URL}/api/marlins-decals/{decal_id}")

    def test_delete_marlins_decal(self, api):
        """DELETE /api/marlins-decals/{id} removes the decal."""
        payload = {"property_id": MARLINS_PROP_ID, "decal_number": "TEST-D-777"}
        create_resp = api.post(f"{BASE_URL}/api/marlins-decals", json=payload)
        assert create_resp.status_code == 200
        decal_id = create_resp.json()["id"]

        del_resp = api.delete(f"{BASE_URL}/api/marlins-decals/{decal_id}")
        assert del_resp.status_code == 200
        data = del_resp.json()
        assert data.get("message") == "Decal deleted"
        print(f"✓ Decal {decal_id} deleted successfully")

    def test_delete_nonexistent_decal_returns_404(self, api):
        """DELETE /api/marlins-decals/{fake_id} returns 404."""
        fake_id = "000000000000000000000000"
        resp = api.delete(f"{BASE_URL}/api/marlins-decals/{fake_id}")
        assert resp.status_code == 404

    def test_delete_decal_clears_tenant_assignment(self, api):
        """DELETE /api/marlins-decals/{id} clears marlins_decal_id on tenant."""
        today = date.today()

        # First create a decal
        decal_payload = {"property_id": MARLINS_PROP_ID, "decal_number": "TEST-D-666"}
        decal_resp = api.post(f"{BASE_URL}/api/marlins-decals", json=decal_payload)
        assert decal_resp.status_code == 200
        decal = decal_resp.json()
        decal_id = decal["id"]

        # Create a unit under the MARLINS property (since it may have no units)
        unit_resp = api.post(f"{BASE_URL}/api/units", json={
            "property_id": MARLINS_PROP_ID,
            "unit_number": "TEST-M-1",
            "unit_size": "1/1",
            "base_rent": 1500.0,
            "availability_start_date": (today - timedelta(days=365)).isoformat()
        })
        assert unit_resp.status_code == 200
        unit = unit_resp.json()
        created_unit = True

        # Get existing tenants for this unit to avoid overlap
        existing_tenants_resp = api.get(f"{BASE_URL}/api/tenants", params={"unit_id": unit["id"]})
        existing = existing_tenants_resp.json()

        # Find a date range that doesn't overlap
        future_start = (today + timedelta(days=400)).isoformat()
        future_end = (today + timedelta(days=500)).isoformat()

        # Create a tenant with this decal
        t_payload = {
            "property_id": MARLINS_PROP_ID,
            "unit_id": unit["id"],
            "name": "TEST_Tenant_DecalDelete",
            "move_in_date": future_start,
            "move_out_date": future_end,
            "is_airbnb_vrbo": False,
            "monthly_rent": 1500.0,
            "marlins_decal_id": decal_id
        }
        t_resp = api.post(f"{BASE_URL}/api/tenants", json=t_payload)
        assert t_resp.status_code == 200, f"Create tenant failed: {t_resp.text}"
        tenant = t_resp.json()
        assert tenant.get("marlins_decal_id") == decal_id

        # Verify the decal shows as assigned
        decals_resp = api.get(f"{BASE_URL}/api/marlins-decals", params={"property_id": MARLINS_PROP_ID})
        decals = decals_resp.json()
        our_decal = next((d for d in decals if d["id"] == decal_id), None)
        assert our_decal is not None
        assert our_decal.get("assigned_tenant") is not None, "Decal should show assigned_tenant"
        assert our_decal["assigned_tenant"]["id"] == tenant["id"]
        print(f"✓ Decal shows assigned_tenant: {our_decal['assigned_tenant']}")

        # Delete the decal
        del_resp = api.delete(f"{BASE_URL}/api/marlins-decals/{decal_id}")
        assert del_resp.status_code == 200

        # Verify tenant's marlins_decal_id was cleared
        t_get = api.get(f"{BASE_URL}/api/tenants/{tenant['id']}")
        assert t_get.status_code == 200
        t_data = t_get.json()
        assert t_data.get("marlins_decal_id") is None, f"Expected marlins_decal_id=None but got {t_data.get('marlins_decal_id')}"
        print(f"✓ Tenant's marlins_decal_id cleared after decal deletion")

        # Cleanup tenant and unit
        api.delete(f"{BASE_URL}/api/tenants/{tenant['id']}")
        api.delete(f"{BASE_URL}/api/units/{unit['id']}")


# ============================================================
# TENANT DECAL ID INTEGRATION
# ============================================================

class TestTenantMarlinsDealId:
    """Tests for tenant marlins_decal_id field integration."""

    def _get_or_create_unit(self, api, offset=0):
        """Helper: create a temp unit on Marlins property."""
        today = date.today()
        unit_resp = api.post(f"{BASE_URL}/api/units", json={
            "property_id": MARLINS_PROP_ID,
            "unit_number": f"TEST-MI-{offset}",
            "unit_size": "1/1",
            "base_rent": 1500.0,
            "availability_start_date": (today - timedelta(days=365)).isoformat()
        })
        assert unit_resp.status_code == 200
        return unit_resp.json()

    def test_tenant_create_with_decal_id(self, api):
        """Creating a tenant with marlins_decal_id saves and returns the field."""
        today = date.today()
        unit = self._get_or_create_unit(api, offset=1)

        future_start = (today + timedelta(days=450)).isoformat()
        future_end = (today + timedelta(days=550)).isoformat()

        payload = {
            "property_id": MARLINS_PROP_ID,
            "unit_id": unit["id"],
            "name": "TEST_Tenant_WithDecal",
            "move_in_date": future_start,
            "move_out_date": future_end,
            "is_airbnb_vrbo": False,
            "monthly_rent": 1500.0,
            "marlins_decal_id": "some_fake_decal_id"
        }
        resp = api.post(f"{BASE_URL}/api/tenants", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("marlins_decal_id") == "some_fake_decal_id"
        print(f"✓ Tenant created with marlins_decal_id={data['marlins_decal_id']}")

        # GET to verify persistence
        get_resp = api.get(f"{BASE_URL}/api/tenants/{data['id']}")
        assert get_resp.status_code == 200
        fetched = get_resp.json()
        assert fetched.get("marlins_decal_id") == "some_fake_decal_id"
        print(f"✓ marlins_decal_id persists in GET: {fetched['marlins_decal_id']}")

        # Cleanup tenant and unit
        api.delete(f"{BASE_URL}/api/tenants/{data['id']}")
        api.delete(f"{BASE_URL}/api/units/{unit['id']}")

    def test_tenant_update_decal_id(self, api):
        """Updating a tenant's marlins_decal_id works."""
        today = date.today()
        unit = self._get_or_create_unit(api, offset=2)

        future_start = (today + timedelta(days=600)).isoformat()
        future_end = (today + timedelta(days=700)).isoformat()

        payload = {
            "property_id": MARLINS_PROP_ID,
            "unit_id": unit["id"],
            "name": "TEST_Tenant_UpdateDecal",
            "move_in_date": future_start,
            "move_out_date": future_end,
            "is_airbnb_vrbo": False,
            "monthly_rent": 1500.0,
            "marlins_decal_id": None
        }
        create_resp = api.post(f"{BASE_URL}/api/tenants", json=payload)
        assert create_resp.status_code == 200
        tenant = create_resp.json()
        tenant_id = tenant["id"]
        assert tenant.get("marlins_decal_id") is None

        # Update with a decal id
        update_payload = {**payload, "marlins_decal_id": "decal-test-abc"}
        update_resp = api.put(f"{BASE_URL}/api/tenants/{tenant_id}", json=update_payload)
        assert update_resp.status_code == 200
        updated = update_resp.json()
        assert updated.get("marlins_decal_id") == "decal-test-abc"
        print(f"✓ Updated marlins_decal_id to: {updated['marlins_decal_id']}")

        # Clear the decal (set to None)
        clear_payload = {**payload, "marlins_decal_id": None}
        clear_resp = api.put(f"{BASE_URL}/api/tenants/{tenant_id}", json=clear_payload)
        assert clear_resp.status_code == 200
        cleared = clear_resp.json()
        assert cleared.get("marlins_decal_id") is None
        print(f"✓ Cleared marlins_decal_id: {cleared.get('marlins_decal_id')}")

        # Cleanup
        api.delete(f"{BASE_URL}/api/tenants/{tenant_id}")
        api.delete(f"{BASE_URL}/api/units/{unit['id']}")

    def test_get_marlins_decals_shows_assigned_tenant_enrichment(self, api):
        """GET /api/marlins-decals shows enriched assigned_tenant for a real decal assignment."""
        today = date.today()

        # Create decal
        decal_resp = api.post(f"{BASE_URL}/api/marlins-decals",
                              json={"property_id": MARLINS_PROP_ID, "decal_number": "TEST-ENRICH-D"})
        assert decal_resp.status_code == 200
        decal = decal_resp.json()
        decal_id = decal["id"]

        # Create a unit
        unit = self._get_or_create_unit(api, offset=3)

        future_start = (today + timedelta(days=750)).isoformat()
        future_end = (today + timedelta(days=850)).isoformat()

        # Create tenant with this decal
        t_resp = api.post(f"{BASE_URL}/api/tenants", json={
            "property_id": MARLINS_PROP_ID,
            "unit_id": unit["id"],
            "name": "TEST_Enrich_Tenant",
            "move_in_date": future_start,
            "move_out_date": future_end,
            "is_airbnb_vrbo": False,
            "monthly_rent": 1500.0,
            "marlins_decal_id": decal_id
        })
        assert t_resp.status_code == 200
        tenant = t_resp.json()

        try:
            # GET decals - should show enriched assigned_tenant
            get_resp = api.get(f"{BASE_URL}/api/marlins-decals", params={"property_id": MARLINS_PROP_ID})
            decals = get_resp.json()
            our_decal = next((d for d in decals if d["id"] == decal_id), None)
            assert our_decal is not None
            assert our_decal.get("assigned_tenant") is not None, "assigned_tenant should be populated"
            at = our_decal["assigned_tenant"]
            assert at["id"] == tenant["id"]
            assert at["name"] == "TEST_Enrich_Tenant"
            assert "unit_id" in at
            print(f"✓ GET enrichment works: {at}")
        finally:
            api.delete(f"{BASE_URL}/api/tenants/{tenant['id']}")
            api.delete(f"{BASE_URL}/api/marlins-decals/{decal_id}")
            api.delete(f"{BASE_URL}/api/units/{unit['id']}")
