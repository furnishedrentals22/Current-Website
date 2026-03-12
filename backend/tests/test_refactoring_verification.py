"""
Backend test for verifying refactoring: server.py split into modular routers.
Tests all endpoints that were requested for verification after the structural refactor.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCoreEndpointsAfterRefactor:
    """Verify all core API endpoints work correctly after modular refactoring"""

    # ─────────────────────────────────────────────
    # Properties Router
    # ─────────────────────────────────────────────
    def test_get_properties_returns_200(self):
        """GET /api/properties should return list of properties"""
        r = requests.get(f"{BASE_URL}/api/properties", timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_get_properties_returns_list(self):
        """GET /api/properties should return a JSON list"""
        r = requests.get(f"{BASE_URL}/api/properties", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"

    def test_get_properties_items_have_id(self):
        """Each property should have an 'id' field (not _id)"""
        r = requests.get(f"{BASE_URL}/api/properties", timeout=15)
        assert r.status_code == 200
        data = r.json()
        if len(data) > 0:
            assert 'id' in data[0], "Property missing 'id' field"
            assert '_id' not in data[0], "Property should not expose raw '_id'"

    # ─────────────────────────────────────────────
    # Tenants Router
    # ─────────────────────────────────────────────
    def test_get_tenants_returns_200(self):
        """GET /api/tenants should return list of tenants"""
        r = requests.get(f"{BASE_URL}/api/tenants", timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_get_tenants_returns_list(self):
        """GET /api/tenants should return a JSON list"""
        r = requests.get(f"{BASE_URL}/api/tenants", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"

    def test_get_tenants_items_have_id(self):
        """Each tenant should have an 'id' field (not _id)"""
        r = requests.get(f"{BASE_URL}/api/tenants", timeout=15)
        assert r.status_code == 200
        data = r.json()
        if len(data) > 0:
            assert 'id' in data[0], "Tenant missing 'id' field"
            assert '_id' not in data[0], "Tenant should not expose raw '_id'"

    def test_get_tenants_pending_moveouts_returns_200(self):
        """GET /api/tenants/pending-moveouts should return list"""
        r = requests.get(f"{BASE_URL}/api/tenants/pending-moveouts", timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert isinstance(data, list)

    # ─────────────────────────────────────────────
    # Notifications Router
    # ─────────────────────────────────────────────
    def test_get_notifications_returns_200(self):
        """GET /api/notifications should return list"""
        r = requests.get(f"{BASE_URL}/api/notifications", timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_get_notifications_returns_list(self):
        """GET /api/notifications should return a JSON list"""
        r = requests.get(f"{BASE_URL}/api/notifications", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"

    # ─────────────────────────────────────────────
    # Budgeting Router - Income
    # ─────────────────────────────────────────────
    def test_get_income_returns_200(self):
        """GET /api/income should return income data"""
        r = requests.get(f"{BASE_URL}/api/income", timeout=30)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_get_income_has_yearly_total(self):
        """GET /api/income should contain 'yearly_total' field"""
        r = requests.get(f"{BASE_URL}/api/income", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert 'yearly_total' in data, f"Missing 'yearly_total' in response: {list(data.keys())}"
        assert isinstance(data['yearly_total'], (int, float))

    def test_get_income_has_months(self):
        """GET /api/income response should have 12 months"""
        r = requests.get(f"{BASE_URL}/api/income", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert 'months' in data
        assert len(data['months']) == 12, f"Expected 12 months, got {len(data['months'])}"

    def test_get_income_with_year_param(self):
        """GET /api/income?year=2025 should work"""
        r = requests.get(f"{BASE_URL}/api/income?year=2025", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data.get('year') == 2025

    # ─────────────────────────────────────────────
    # Budgeting Router - Deposits
    # ─────────────────────────────────────────────
    def test_get_deposits_current_returns_200(self):
        """GET /api/deposits/current should return current deposits"""
        r = requests.get(f"{BASE_URL}/api/deposits/current", timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_get_deposits_current_has_deposits_key(self):
        """GET /api/deposits/current should have 'deposits' and 'total' keys"""
        r = requests.get(f"{BASE_URL}/api/deposits/current", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert 'deposits' in data, f"Missing 'deposits' key: {list(data.keys())}"
        assert 'total' in data, f"Missing 'total' key: {list(data.keys())}"
        assert isinstance(data['deposits'], list)

    def test_get_deposits_past_returns_200(self):
        """GET /api/deposits/past should return past deposits"""
        r = requests.get(f"{BASE_URL}/api/deposits/past", timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_get_deposits_past_has_deposits_key(self):
        """GET /api/deposits/past should have 'deposits' key"""
        r = requests.get(f"{BASE_URL}/api/deposits/past", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert 'deposits' in data, f"Missing 'deposits' key: {list(data.keys())}"

    # ─────────────────────────────────────────────
    # Budgeting Router - Rent Tracking
    # ─────────────────────────────────────────────
    def test_get_rent_tracking_returns_200(self):
        """GET /api/rent-tracking should return tracking data"""
        r = requests.get(f"{BASE_URL}/api/rent-tracking", timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_get_rent_tracking_has_tenants(self):
        """GET /api/rent-tracking should have 'tenants' key"""
        r = requests.get(f"{BASE_URL}/api/rent-tracking", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert 'tenants' in data, f"Missing 'tenants' key: {list(data.keys())}"
        assert isinstance(data['tenants'], list)

    # ─────────────────────────────────────────────
    # Calendar Router - Vacancy
    # ─────────────────────────────────────────────
    def test_get_vacancy_returns_200(self):
        """GET /api/vacancy should return vacancy data"""
        r = requests.get(f"{BASE_URL}/api/vacancy", timeout=30)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_get_vacancy_has_by_building(self):
        """GET /api/vacancy should have 'by_building' key"""
        r = requests.get(f"{BASE_URL}/api/vacancy", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert 'by_building' in data, f"Missing 'by_building' key: {list(data.keys())}"
        assert isinstance(data['by_building'], list)

    def test_get_vacancy_has_upcoming_vacancies(self):
        """GET /api/vacancy should have 'upcoming_vacancies' key"""
        r = requests.get(f"{BASE_URL}/api/vacancy", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert 'upcoming_vacancies' in data, f"Missing 'upcoming_vacancies' key: {list(data.keys())}"

    # ─────────────────────────────────────────────
    # Calendar Router - Timeline
    # ─────────────────────────────────────────────
    def test_get_calendar_timeline_returns_200(self):
        """GET /api/calendar/timeline should return calendar data"""
        r = requests.get(f"{BASE_URL}/api/calendar/timeline", timeout=30)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_get_calendar_timeline_has_properties(self):
        """GET /api/calendar/timeline should have 'properties' key"""
        r = requests.get(f"{BASE_URL}/api/calendar/timeline", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert 'properties' in data, f"Missing 'properties' key: {list(data.keys())}"
        assert isinstance(data['properties'], list)

    def test_get_calendar_timeline_has_range_dates(self):
        """GET /api/calendar/timeline should have range_start and range_end"""
        r = requests.get(f"{BASE_URL}/api/calendar/timeline", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert 'range_start' in data, "Missing 'range_start'"
        assert 'range_end' in data, "Missing 'range_end'"
        assert 'today' in data, "Missing 'today'"

    # ─────────────────────────────────────────────
    # Additional misc-charges endpoint
    # ─────────────────────────────────────────────
    def test_get_misc_charges_returns_200(self):
        """GET /api/misc-charges should return list"""
        r = requests.get(f"{BASE_URL}/api/misc-charges", timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert isinstance(data, list)

    # ─────────────────────────────────────────────
    # Units endpoint (via properties router)
    # ─────────────────────────────────────────────
    def test_get_units_returns_200(self):
        """GET /api/units should return list of units"""
        r = requests.get(f"{BASE_URL}/api/units", timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert isinstance(data, list)

    def test_get_landlord_deposits_returns_200(self):
        """GET /api/landlord-deposits should return data"""
        r = requests.get(f"{BASE_URL}/api/landlord-deposits", timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert 'properties' in data
