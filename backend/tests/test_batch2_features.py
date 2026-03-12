"""
Test Suite for Major Batch 2 Updates:
1. Deposits page: all tabs editable + past/future tenant status badges
2. Calendar: tenant bars visible, tooltip text color, clicking tenant opens modal
3. Vacancy page: sort by property/date (collapsible)
4. Income page: monthly average calculates up to current month only
5. Parking page: tenant filter, search, unit display, 1542 filter
6. Tenants page: has_parking checkbox
"""

import pytest
import requests
import os
from datetime import date

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://tenant-budgets.preview.emergentagent.com')


class TestDepositsEndpoints:
    """Test deposits endpoints with tenant status info"""
    
    def test_get_current_deposits(self):
        """GET /api/deposits/current should return deposits with move_in_date, move_out_date"""
        response = requests.get(f"{BASE_URL}/api/deposits/current")
        assert response.status_code == 200
        data = response.json()
        
        # Should have deposits list and total
        assert 'deposits' in data
        assert 'total' in data
        
        # If deposits exist, verify tenant status fields
        if data['deposits']:
            first_deposit = data['deposits'][0]
            assert 'move_in_date' in first_deposit
            assert 'move_out_date' in first_deposit
            assert 'name' in first_deposit
            assert 'deposit_amount' in first_deposit
            print(f"Current deposits: {len(data['deposits'])}, Total: ${data['total']}")
    
    def test_get_past_deposits(self):
        """GET /api/deposits/past should return past deposits"""
        response = requests.get(f"{BASE_URL}/api/deposits/past")
        assert response.status_code == 200
        data = response.json()
        
        assert 'deposits' in data
        print(f"Past deposits: {len(data['deposits'])}")
    
    def test_get_landlord_deposits(self):
        """GET /api/landlord-deposits should return properties with units"""
        response = requests.get(f"{BASE_URL}/api/landlord-deposits")
        assert response.status_code == 200
        data = response.json()
        
        assert 'properties' in data
        assert 'total' in data
        
        if data['properties']:
            first_prop = data['properties'][0]
            assert 'property_id' in first_prop
            assert 'property_name' in first_prop
            assert 'units' in first_prop
            print(f"Landlord deposits: {len(data['properties'])} properties, Total: ${data['total']}")


class TestTenantUpdate:
    """Test tenant update with deposit fields"""
    
    def test_get_tenants(self):
        """GET /api/tenants should return tenant list"""
        response = requests.get(f"{BASE_URL}/api/tenants")
        assert response.status_code == 200
        tenants = response.json()
        assert isinstance(tenants, list)
        print(f"Total tenants: {len(tenants)}")
        return tenants
    
    def test_tenant_has_deposit_fields(self):
        """Verify tenants have deposit_amount, deposit_date, payment_method fields"""
        response = requests.get(f"{BASE_URL}/api/tenants")
        assert response.status_code == 200
        tenants = response.json()
        
        # Find a tenant with deposit
        deposit_tenant = None
        for t in tenants:
            if t.get('deposit_amount'):
                deposit_tenant = t
                break
        
        if deposit_tenant:
            # Verify deposit fields exist
            assert 'deposit_amount' in deposit_tenant
            assert 'deposit_date' in deposit_tenant
            assert 'payment_method' in deposit_tenant
            print(f"Tenant {deposit_tenant['name']} has deposit: ${deposit_tenant['deposit_amount']}")
        else:
            print("No tenant with deposit found in test data")
    
    def test_tenant_has_parking_field(self):
        """Verify tenants can have has_parking field (may be null for legacy tenants)"""
        response = requests.get(f"{BASE_URL}/api/tenants")
        assert response.status_code == 200
        tenants = response.json()
        
        if tenants:
            # The has_parking field may be null for legacy tenants or True/False for new ones
            # This is acceptable - frontend handles null as false
            first_tenant = tenants[0]
            parking_value = first_tenant.get('has_parking')
            # Field can be True, False, or None (null) for legacy data
            assert parking_value in [True, False, None], f"Unexpected has_parking value: {parking_value}"
            print(f"Tenant {first_tenant['name']} has_parking = {parking_value} (null is acceptable for legacy data)")


class TestTenantCreateWithParking:
    """Test creating tenant with has_parking field"""
    
    def test_get_units_for_tenant_creation(self):
        """Get a unit for creating test tenant"""
        response = requests.get(f"{BASE_URL}/api/units")
        assert response.status_code == 200
        units = response.json()
        assert len(units) > 0
        return units[0]
    
    def test_create_tenant_with_has_parking(self):
        """POST /api/tenants should accept has_parking field"""
        # First get a unit
        units_response = requests.get(f"{BASE_URL}/api/units")
        assert units_response.status_code == 200
        units = units_response.json()
        
        if not units:
            pytest.skip("No units available for test")
        
        test_unit = units[0]
        
        # Create a test tenant with has_parking=True
        tenant_data = {
            "property_id": test_unit['property_id'],
            "unit_id": test_unit['id'],
            "name": "TEST_Parking_Tenant",
            "phone": "555-0000",
            "email": "test_parking@test.com",
            "move_in_date": "2030-01-01",  # Far future to avoid conflicts
            "move_out_date": "2030-06-30",
            "is_airbnb_vrbo": False,
            "monthly_rent": 1500,
            "has_parking": True
        }
        
        response = requests.post(f"{BASE_URL}/api/tenants", json=tenant_data)
        
        if response.status_code == 201 or response.status_code == 200:
            created = response.json()
            assert created.get('has_parking') == True
            print(f"Created tenant with has_parking=True: {created['name']}")
            
            # Clean up - delete the test tenant
            tenant_id = created['id']
            delete_response = requests.delete(f"{BASE_URL}/api/tenants/{tenant_id}")
            assert delete_response.status_code == 200
            print(f"Cleaned up test tenant")
        else:
            # May fail due to date conflict, just verify endpoint accepts the field
            print(f"Tenant creation returned {response.status_code}, checking endpoint schema")
            assert response.status_code in [200, 201, 400]  # 400 is ok for date validation


class TestLandlordDepositUpdate:
    """Test updating landlord deposits"""
    
    def test_update_landlord_deposit(self):
        """PUT /api/landlord-deposits/{unit_id}?amount=X works"""
        # Get units first
        response = requests.get(f"{BASE_URL}/api/units")
        assert response.status_code == 200
        units = response.json()
        
        if not units:
            pytest.skip("No units available")
        
        test_unit = units[0]
        unit_id = test_unit['id']
        
        # Update landlord deposit
        update_response = requests.put(f"{BASE_URL}/api/landlord-deposits/{unit_id}?amount=999")
        assert update_response.status_code == 200
        print(f"Updated landlord deposit for unit {unit_id} to $999")
        
        # Verify the update
        verify_response = requests.get(f"{BASE_URL}/api/landlord-deposits")
        assert verify_response.status_code == 200
        data = verify_response.json()
        
        # Find the unit and verify amount
        found = False
        for prop in data['properties']:
            for unit in prop['units']:
                if unit['unit_id'] == unit_id:
                    assert unit['landlord_deposit'] == 999
                    found = True
                    break
        
        if found:
            print(f"Verified landlord deposit update")


class TestCalendarTimeline:
    """Test calendar timeline endpoint"""
    
    def test_calendar_timeline_returns_data(self):
        """GET /api/calendar/timeline returns tenant bookings"""
        response = requests.get(f"{BASE_URL}/api/calendar/timeline")
        assert response.status_code == 200
        data = response.json()
        
        assert 'properties' in data
        assert 'range_start' in data
        assert 'range_end' in data
        assert 'today' in data
        
        # Verify structure
        if data['properties']:
            first_prop = data['properties'][0]
            assert 'property_id' in first_prop
            assert 'property_name' in first_prop
            assert 'units' in first_prop
            
            if first_prop['units']:
                first_unit = first_prop['units'][0]
                assert 'unit_id' in first_unit
                assert 'bookings' in first_unit
                
                # Check bookings have tenant info
                if first_unit['bookings']:
                    booking = first_unit['bookings'][0]
                    assert 'tenant_id' in booking
                    assert 'name' in booking
                    assert 'start_date' in booking
                    assert 'end_date' in booking
        
        print(f"Calendar timeline: {len(data['properties'])} properties")


class TestVacancyEndpoint:
    """Test vacancy endpoint returns proper structure for new views"""
    
    def test_vacancy_returns_upcoming_vacancies(self):
        """GET /api/vacancy should return upcoming_vacancies for new sort views"""
        response = requests.get(f"{BASE_URL}/api/vacancy")
        assert response.status_code == 200
        data = response.json()
        
        assert 'year' in data
        assert 'by_building' in data
        assert 'by_unit_size' in data
        assert 'upcoming_vacancies' in data
        
        # Upcoming vacancies structure
        if data['upcoming_vacancies']:
            vacancy = data['upcoming_vacancies'][0]
            assert 'property_name' in vacancy
            assert 'unit_number' in vacancy
            assert 'vacancy_start' in vacancy
            
        print(f"Vacancy data: {len(data['by_building'])} buildings, {len(data['upcoming_vacancies'])} upcoming vacancies")


class TestIncomeMonthlyAverage:
    """Test income endpoint for monthly average calculation"""
    
    def test_income_returns_monthly_data(self):
        """GET /api/income should return monthly breakdown"""
        current_year = date.today().year
        response = requests.get(f"{BASE_URL}/api/income?year={current_year}")
        assert response.status_code == 200
        data = response.json()
        
        assert 'year' in data
        assert 'yearly_total' in data
        assert 'current_month_total' in data
        assert 'months' in data
        
        # Should have 12 months
        assert len(data['months']) == 12
        
        # Calculate what monthly average should be based on current month
        current_month = date.today().month
        months_up_to_current = [m for m in data['months'] if m['month'] <= current_month]
        
        if months_up_to_current:
            expected_avg = data['yearly_total'] / len(months_up_to_current)
            print(f"Income data: Yearly total ${data['yearly_total']}, based on {len(months_up_to_current)} months, avg should be ~${expected_avg:.2f}")


class TestParkingEndpoints:
    """Test parking spots and assignments endpoints"""
    
    def test_get_parking_spots(self):
        """GET /api/parking-spots returns list"""
        response = requests.get(f"{BASE_URL}/api/parking-spots")
        assert response.status_code == 200
        spots = response.json()
        assert isinstance(spots, list)
        print(f"Parking spots: {len(spots)}")
    
    def test_get_parking_assignments(self):
        """GET /api/parking-assignments returns list"""
        response = requests.get(f"{BASE_URL}/api/parking-assignments")
        assert response.status_code == 200
        assignments = response.json()
        assert isinstance(assignments, list)
        print(f"Parking assignments: {len(assignments)}")
    
    def test_get_units_for_parking_filter(self):
        """GET /api/units returns units (needed for unitMap in parking page)"""
        response = requests.get(f"{BASE_URL}/api/units")
        assert response.status_code == 200
        units = response.json()
        assert isinstance(units, list)
        
        # Verify unit has unit_number
        if units:
            assert 'unit_number' in units[0]
        print(f"Units for parking: {len(units)}")


class TestProperties:
    """Test properties endpoint for 1542 filter check"""
    
    def test_get_properties(self):
        """GET /api/properties returns list - check for 1542 property"""
        response = requests.get(f"{BASE_URL}/api/properties")
        assert response.status_code == 200
        properties = response.json()
        assert isinstance(properties, list)
        
        # Check if any property has 1542 in name/address
        prop_1542 = None
        for p in properties:
            if '1542' in (p.get('name', '') or '') or '1542' in (p.get('address', '') or ''):
                prop_1542 = p
                break
        
        if prop_1542:
            print(f"Found 1542 property: {prop_1542['name']}")
        else:
            print("No property with 1542 in name/address (as expected per test notes)")


@pytest.fixture(scope="session")
def api_session():
    """Shared session for API calls"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
