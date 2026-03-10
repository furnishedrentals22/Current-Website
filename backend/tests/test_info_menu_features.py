"""
Test suite for HarborRent Property Management - Info Menu Features
Testing: Parking, Door Codes, Login Info, Marketing, Notifications, PIN Management, Team Members
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefixes for cleanup
TEST_PREFIX = "TEST_"

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="session")
def test_property(api_client):
    """Create a test property for use in other tests"""
    payload = {
        "name": f"{TEST_PREFIX}Property_InfoMenu",
        "address": "123 Test Street",
        "owner_manager_name": "Test Manager",
        "owner_manager_phone": "555-1234",
        "owner_manager_email": "test@example.com",
        "building_id": 99
    }
    response = api_client.post(f"{BASE_URL}/api/properties", json=payload)
    assert response.status_code == 200
    data = response.json()
    yield data
    # Cleanup
    try:
        api_client.delete(f"{BASE_URL}/api/properties/{data['id']}")
    except:
        pass

@pytest.fixture(scope="session")
def test_unit(api_client, test_property):
    """Create a test unit for use in other tests"""
    payload = {
        "property_id": test_property['id'],
        "unit_number": "TEST99",
        "unit_size": "2/2",
        "base_rent": 1500.00,
        "availability_start_date": "2025-01-01"
    }
    response = api_client.post(f"{BASE_URL}/api/units", json=payload)
    assert response.status_code == 200
    data = response.json()
    yield data
    # Cleanup
    try:
        api_client.delete(f"{BASE_URL}/api/units/{data['id']}")
    except:
        pass

@pytest.fixture(scope="session")
def test_tenant(api_client, test_property, test_unit):
    """Create a test tenant for use in other tests"""
    payload = {
        "property_id": test_property['id'],
        "unit_id": test_unit['id'],
        "name": f"{TEST_PREFIX}Tenant_InfoMenu",
        "phone": "555-9999",
        "email": "tenant@test.com",
        "move_in_date": "2025-06-01",
        "move_out_date": "2026-06-01",
        "monthly_rent": 1500.00
    }
    response = api_client.post(f"{BASE_URL}/api/tenants", json=payload)
    assert response.status_code == 200
    data = response.json()
    yield data
    # Cleanup
    try:
        api_client.delete(f"{BASE_URL}/api/tenants/{data['id']}")
    except:
        pass


class TestParkingSpots:
    """Tests for /api/parking-spots CRUD"""
    
    def test_list_parking_spots(self, api_client):
        """GET /api/parking-spots - should return list"""
        response = api_client.get(f"{BASE_URL}/api/parking-spots")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✓ List parking spots - 200 OK")
    
    def test_create_designated_parking_spot(self, api_client, test_property):
        """POST /api/parking-spots - create designated spot"""
        payload = {
            "spot_type": "designated",
            "spot_number": f"{TEST_PREFIX}A1",
            "location": "Garage Level 1",
            "cost": 100.00,
            "property_ids": [test_property['id']],
            "notes": "Near elevator"
        }
        response = api_client.post(f"{BASE_URL}/api/parking-spots", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data['spot_type'] == 'designated'
        assert data['spot_number'] == f"{TEST_PREFIX}A1"
        assert data['cost'] == 100.00
        assert 'id' in data
        print(f"✓ Create designated spot - ID: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/parking-spots/{data['id']}")
    
    def test_create_marlins_decal(self, api_client):
        """POST /api/parking-spots - create Marlins decal"""
        payload = {
            "spot_type": "marlins_decal",
            "decal_number": f"{TEST_PREFIX}DEC001",
            "decal_year": "2026",
            "notes": "Test decal"
        }
        response = api_client.post(f"{BASE_URL}/api/parking-spots", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data['spot_type'] == 'marlins_decal'
        assert data['decal_number'] == f"{TEST_PREFIX}DEC001"
        assert data['decal_year'] == "2026"
        print(f"✓ Create Marlins decal - ID: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/parking-spots/{data['id']}")
    
    def test_update_parking_spot(self, api_client, test_property):
        """PUT /api/parking-spots/{id} - update spot"""
        # Create
        payload = {"spot_type": "designated", "spot_number": f"{TEST_PREFIX}B2", "cost": 50.00, "property_ids": []}
        create_resp = api_client.post(f"{BASE_URL}/api/parking-spots", json=payload)
        spot_id = create_resp.json()['id']
        
        # Update
        payload['cost'] = 75.00
        payload['location'] = "Updated Location"
        update_resp = api_client.put(f"{BASE_URL}/api/parking-spots/{spot_id}", json=payload)
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data['cost'] == 75.00
        assert data['location'] == "Updated Location"
        print(f"✓ Update parking spot - cost updated to {data['cost']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/parking-spots/{spot_id}")
    
    def test_delete_parking_spot(self, api_client):
        """DELETE /api/parking-spots/{id} - delete spot"""
        # Create
        payload = {"spot_type": "designated", "spot_number": f"{TEST_PREFIX}DEL", "property_ids": []}
        create_resp = api_client.post(f"{BASE_URL}/api/parking-spots", json=payload)
        spot_id = create_resp.json()['id']
        
        # Delete
        delete_resp = api_client.delete(f"{BASE_URL}/api/parking-spots/{spot_id}")
        assert delete_resp.status_code == 200
        
        # Verify deleted
        get_resp = api_client.get(f"{BASE_URL}/api/parking-spots/{spot_id}")
        assert get_resp.status_code == 404
        print("✓ Delete parking spot - confirmed 404 after delete")


class TestParkingAssignments:
    """Tests for /api/parking-assignments CRUD"""
    
    def test_list_parking_assignments(self, api_client):
        """GET /api/parking-assignments - should return list"""
        response = api_client.get(f"{BASE_URL}/api/parking-assignments")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✓ List parking assignments - 200 OK")
    
    def test_create_parking_assignment(self, api_client, test_property, test_unit, test_tenant):
        """POST /api/parking-assignments - assign tenant to parking"""
        # Create parking spot first
        spot_payload = {"spot_type": "designated", "spot_number": f"{TEST_PREFIX}ASSIGN", "property_ids": [test_property['id']]}
        spot_resp = api_client.post(f"{BASE_URL}/api/parking-spots", json=spot_payload)
        spot_id = spot_resp.json()['id']
        
        # Create assignment
        today = datetime.now().date()
        payload = {
            "parking_spot_id": spot_id,
            "tenant_id": test_tenant['id'],
            "tenant_name": test_tenant['name'],
            "property_id": test_property['id'],
            "unit_id": test_unit['id'],
            "start_date": today.isoformat(),
            "end_date": (today + timedelta(days=365)).isoformat(),
            "is_active": True
        }
        response = api_client.post(f"{BASE_URL}/api/parking-assignments", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data['parking_spot_id'] == spot_id
        assert data['tenant_id'] == test_tenant['id']
        assert data['is_active'] == True
        print(f"✓ Create parking assignment - ID: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/parking-assignments/{data['id']}")
        api_client.delete(f"{BASE_URL}/api/parking-spots/{spot_id}")
    
    def test_parking_assignment_not_found(self, api_client):
        """POST /api/parking-assignments with invalid spot_id should fail"""
        payload = {
            "parking_spot_id": "000000000000000000000000",
            "tenant_id": "000000000000000000000000",
            "start_date": "2026-01-01",
            "end_date": "2026-12-31"
        }
        response = api_client.post(f"{BASE_URL}/api/parking-assignments", json=payload)
        assert response.status_code == 404
        print("✓ Parking assignment with invalid spot - 404 as expected")


class TestDoorCodes:
    """Tests for /api/door-codes CRUD"""
    
    def test_list_door_codes(self, api_client):
        """GET /api/door-codes - should return list"""
        response = api_client.get(f"{BASE_URL}/api/door-codes")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✓ List door codes - 200 OK")
    
    def test_create_door_code(self, api_client, test_property, test_unit):
        """POST /api/door-codes - set codes for unit"""
        payload = {
            "unit_id": test_unit['id'],
            "property_id": test_property['id'],
            "admin_code": "1234",
            "admin_code_note": "Master admin",
            "housekeeping_code": "5678",
            "guest_code": "9012",
            "backup_code_1": "1111",
            "backup_code_2": "2222"
        }
        response = api_client.post(f"{BASE_URL}/api/door-codes", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data['admin_code'] == "1234"
        assert data['housekeeping_code'] == "5678"
        assert data['guest_code'] == "9012"
        assert data['backup_code_1'] == "1111"
        assert data['backup_code_2'] == "2222"
        print(f"✓ Create door codes - ID: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/door-codes/{data['id']}")
    
    def test_update_door_code_upsert(self, api_client, test_property, test_unit):
        """POST /api/door-codes - upsert (create or update) on same unit"""
        # First create
        payload = {
            "unit_id": test_unit['id'],
            "property_id": test_property['id'],
            "guest_code": "1000"
        }
        resp1 = api_client.post(f"{BASE_URL}/api/door-codes", json=payload)
        assert resp1.status_code == 200
        code_id = resp1.json()['id']
        
        # Update same unit - should upsert
        payload['guest_code'] = "2000"
        resp2 = api_client.post(f"{BASE_URL}/api/door-codes", json=payload)
        assert resp2.status_code == 200
        data = resp2.json()
        assert data['guest_code'] == "2000"
        assert data['id'] == code_id  # Same ID - updated, not created new
        print(f"✓ Upsert door codes - guest_code updated to {data['guest_code']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/door-codes/{code_id}")


class TestLoginAccounts:
    """Tests for /api/login-accounts CRUD"""
    
    def test_list_login_accounts(self, api_client):
        """GET /api/login-accounts - should return list"""
        response = api_client.get(f"{BASE_URL}/api/login-accounts")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✓ List login accounts - 200 OK")
    
    def test_create_login_account_level_1(self, api_client):
        """POST /api/login-accounts - create low sensitivity account"""
        payload = {
            "account_name": f"{TEST_PREFIX}TestAccount_L1",
            "sensitivity_level": 1,
            "username": "testuser1",
            "password": "testpass123",
            "email": "test@example.com",
            "url": "https://example.com",
            "account_type": "Utility"
        }
        response = api_client.post(f"{BASE_URL}/api/login-accounts", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data['account_name'] == f"{TEST_PREFIX}TestAccount_L1"
        assert data['sensitivity_level'] == 1
        assert data['username'] == "testuser1"
        print(f"✓ Create login account (Level 1) - ID: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/login-accounts/{data['id']}")
    
    def test_create_login_account_level_2(self, api_client):
        """POST /api/login-accounts - create medium sensitivity account"""
        payload = {
            "account_name": f"{TEST_PREFIX}TestAccount_L2",
            "sensitivity_level": 2,
            "username": "mediumuser",
            "password": "mediumpass",
            "security_question_1": "First pet?",
            "security_answer_1": "Fluffy"
        }
        response = api_client.post(f"{BASE_URL}/api/login-accounts", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data['sensitivity_level'] == 2
        print(f"✓ Create login account (Level 2) - ID: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/login-accounts/{data['id']}")
    
    def test_create_login_account_level_3(self, api_client):
        """POST /api/login-accounts - create high sensitivity account"""
        payload = {
            "account_name": f"{TEST_PREFIX}TestAccount_L3",
            "sensitivity_level": 3,
            "username": "highuser",
            "password": "superSecure123!"
        }
        response = api_client.post(f"{BASE_URL}/api/login-accounts", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data['sensitivity_level'] == 3
        print(f"✓ Create login account (Level 3) - ID: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/login-accounts/{data['id']}")
    
    def test_update_login_account(self, api_client):
        """PUT /api/login-accounts/{id} - update account"""
        # Create
        payload = {"account_name": f"{TEST_PREFIX}UpdateTest", "sensitivity_level": 1}
        create_resp = api_client.post(f"{BASE_URL}/api/login-accounts", json=payload)
        acc_id = create_resp.json()['id']
        
        # Update
        payload['username'] = "updateduser"
        payload['password'] = "updatedpass"
        update_resp = api_client.put(f"{BASE_URL}/api/login-accounts/{acc_id}", json=payload)
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data['username'] == "updateduser"
        print(f"✓ Update login account - username: {data['username']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/login-accounts/{acc_id}")
    
    def test_delete_login_account(self, api_client):
        """DELETE /api/login-accounts/{id} - delete account"""
        # Create
        payload = {"account_name": f"{TEST_PREFIX}DeleteTest", "sensitivity_level": 1}
        create_resp = api_client.post(f"{BASE_URL}/api/login-accounts", json=payload)
        acc_id = create_resp.json()['id']
        
        # Delete
        delete_resp = api_client.delete(f"{BASE_URL}/api/login-accounts/{acc_id}")
        assert delete_resp.status_code == 200
        print("✓ Delete login account - success")


class TestMarketingLinks:
    """Tests for /api/marketing-links CRUD"""
    
    def test_list_marketing_links(self, api_client):
        """GET /api/marketing-links - should return list"""
        response = api_client.get(f"{BASE_URL}/api/marketing-links")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✓ List marketing links - 200 OK")
    
    def test_create_marketing_link(self, api_client, test_property, test_unit):
        """POST /api/marketing-links - add links for unit"""
        payload = {
            "unit_id": test_unit['id'],
            "property_id": test_property['id'],
            "airbnb_link": "https://airbnb.com/rooms/test123",
            "furnished_finder_link": "https://furnishedfinder.com/listing/test",
            "photos_link": "https://drive.google.com/test",
            "additional_links": [
                {"name": "VRBO", "url": "https://vrbo.com/test"}
            ]
        }
        response = api_client.post(f"{BASE_URL}/api/marketing-links", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data['airbnb_link'] == "https://airbnb.com/rooms/test123"
        assert data['furnished_finder_link'] == "https://furnishedfinder.com/listing/test"
        assert len(data['additional_links']) == 1
        print(f"✓ Create marketing links - ID: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/marketing-links/{data['id']}")
    
    def test_upsert_marketing_link(self, api_client, test_property, test_unit):
        """POST /api/marketing-links - upsert same unit"""
        # Create
        payload = {"unit_id": test_unit['id'], "property_id": test_property['id'], "airbnb_link": "https://old.link"}
        resp1 = api_client.post(f"{BASE_URL}/api/marketing-links", json=payload)
        link_id = resp1.json()['id']
        
        # Update
        payload['airbnb_link'] = "https://new.link"
        resp2 = api_client.post(f"{BASE_URL}/api/marketing-links", json=payload)
        assert resp2.status_code == 200
        data = resp2.json()
        assert data['airbnb_link'] == "https://new.link"
        assert data['id'] == link_id  # Same ID
        print(f"✓ Upsert marketing links - airbnb_link updated")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/marketing-links/{link_id}")


class TestPinManagement:
    """Tests for /api/pins/* endpoints"""
    
    def test_get_pin_status(self, api_client):
        """GET /api/pins/status - should return PIN status"""
        response = api_client.get(f"{BASE_URL}/api/pins/status")
        assert response.status_code == 200
        data = response.json()
        assert 'shared_pin_set' in data
        assert 'level_2_pin_set' in data
        assert 'level_3_pin_set' in data
        print(f"✓ PIN status - shared: {data['shared_pin_set']}, L2: {data['level_2_pin_set']}, L3: {data['level_3_pin_set']}")
    
    def test_set_shared_pin(self, api_client):
        """POST /api/pins/set - set shared PIN"""
        payload = {"pin": "9999", "pin_type": "shared"}
        response = api_client.post(f"{BASE_URL}/api/pins/set", json=payload)
        assert response.status_code == 200
        print("✓ Set shared PIN - success")
    
    def test_verify_shared_pin_valid(self, api_client):
        """POST /api/pins/verify - verify valid PIN"""
        # Set PIN first
        api_client.post(f"{BASE_URL}/api/pins/set", json={"pin": "8888", "pin_type": "shared"})
        
        # Verify correct PIN
        response = api_client.post(f"{BASE_URL}/api/pins/verify", json={"pin": "8888", "pin_type": "shared"})
        assert response.status_code == 200
        data = response.json()
        assert data['valid'] == True
        print("✓ Verify valid shared PIN - success")
    
    def test_verify_shared_pin_invalid(self, api_client):
        """POST /api/pins/verify - verify invalid PIN"""
        # Set PIN first
        api_client.post(f"{BASE_URL}/api/pins/set", json={"pin": "7777", "pin_type": "shared"})
        
        # Verify wrong PIN
        response = api_client.post(f"{BASE_URL}/api/pins/verify", json={"pin": "0000", "pin_type": "shared"})
        assert response.status_code == 200
        data = response.json()
        assert data['valid'] == False
        print("✓ Verify invalid PIN - correctly rejected")
    
    def test_set_level_2_pin(self, api_client):
        """POST /api/pins/set - set level_2 PIN"""
        payload = {"pin": "2222", "pin_type": "level_2"}
        response = api_client.post(f"{BASE_URL}/api/pins/set", json=payload)
        assert response.status_code == 200
        print("✓ Set level_2 PIN - success")
    
    def test_set_level_3_pin(self, api_client):
        """POST /api/pins/set - set level_3 PIN"""
        payload = {"pin": "3333", "pin_type": "level_3"}
        response = api_client.post(f"{BASE_URL}/api/pins/set", json=payload)
        assert response.status_code == 200
        print("✓ Set level_3 PIN - success")


class TestTeamMembers:
    """Tests for /api/team-members CRUD"""
    
    def test_list_team_members(self, api_client):
        """GET /api/team-members - should return list"""
        response = api_client.get(f"{BASE_URL}/api/team-members")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✓ List team members - 200 OK")
    
    def test_create_team_member(self, api_client):
        """POST /api/team-members - create team member"""
        payload = {
            "name": f"{TEST_PREFIX}John Doe",
            "role": "Property Manager",
            "phone": "555-1111",
            "email": "john@test.com"
        }
        response = api_client.post(f"{BASE_URL}/api/team-members", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data['name'] == f"{TEST_PREFIX}John Doe"
        assert data['role'] == "Property Manager"
        print(f"✓ Create team member - ID: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/team-members/{data['id']}")
    
    def test_update_team_member(self, api_client):
        """PUT /api/team-members/{id} - update member"""
        # Create
        payload = {"name": f"{TEST_PREFIX}Jane Smith"}
        create_resp = api_client.post(f"{BASE_URL}/api/team-members", json=payload)
        member_id = create_resp.json()['id']
        
        # Update
        payload['role'] = "Maintenance Lead"
        payload['phone'] = "555-9999"
        update_resp = api_client.put(f"{BASE_URL}/api/team-members/{member_id}", json=payload)
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data['role'] == "Maintenance Lead"
        print(f"✓ Update team member - role: {data['role']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/team-members/{member_id}")
    
    def test_delete_team_member(self, api_client):
        """DELETE /api/team-members/{id} - delete member"""
        # Create
        payload = {"name": f"{TEST_PREFIX}Delete Me"}
        create_resp = api_client.post(f"{BASE_URL}/api/team-members", json=payload)
        member_id = create_resp.json()['id']
        
        # Delete
        delete_resp = api_client.delete(f"{BASE_URL}/api/team-members/{member_id}")
        assert delete_resp.status_code == 200
        print("✓ Delete team member - success")


class TestNotifications:
    """Tests for /api/notifications CRUD with status management"""
    
    def test_list_notifications(self, api_client):
        """GET /api/notifications - should return list"""
        response = api_client.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List notifications - {len(data)} found")
    
    def test_filter_notifications_by_status(self, api_client):
        """GET /api/notifications?status=upcoming - filter by status"""
        response = api_client.get(f"{BASE_URL}/api/notifications?status=upcoming")
        assert response.status_code == 200
        data = response.json()
        # All returned should be upcoming
        for n in data:
            status = n.get('status') or ('done' if n.get('is_read') else 'upcoming')
            assert status == 'upcoming'
        print(f"✓ Filter notifications by status=upcoming - {len(data)} found")
    
    def test_create_manual_notification(self, api_client):
        """POST /api/notifications - create manual notification"""
        payload = {
            "name": f"{TEST_PREFIX}Manual Task",
            "reminder_date": "2026-03-15",
            "reminder_time": "10:00",
            "status": "upcoming",
            "notification_type": "manual",
            "notes": "Test notification notes"
        }
        response = api_client.post(f"{BASE_URL}/api/notifications", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data['name'] == f"{TEST_PREFIX}Manual Task"
        assert data['status'] == "upcoming"
        assert data['notification_type'] == "manual"
        print(f"✓ Create manual notification - ID: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/notifications/{data['id']}")
    
    def test_update_notification(self, api_client):
        """PUT /api/notifications/{id} - update notification"""
        # Create
        payload = {"name": f"{TEST_PREFIX}Update Test", "status": "upcoming"}
        create_resp = api_client.post(f"{BASE_URL}/api/notifications", json=payload)
        notif_id = create_resp.json()['id']
        
        # Update
        payload['name'] = f"{TEST_PREFIX}Updated Name"
        payload['notes'] = "Updated notes"
        update_resp = api_client.put(f"{BASE_URL}/api/notifications/{notif_id}", json=payload)
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data['name'] == f"{TEST_PREFIX}Updated Name"
        print(f"✓ Update notification - name: {data['name']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/notifications/{notif_id}")
    
    def test_update_notification_status(self, api_client):
        """PUT /api/notifications/{id}/status - change status"""
        # Create with upcoming
        payload = {"name": f"{TEST_PREFIX}Status Test", "status": "upcoming"}
        create_resp = api_client.post(f"{BASE_URL}/api/notifications", json=payload)
        notif_id = create_resp.json()['id']
        
        # Move to in_progress
        status_resp = api_client.put(f"{BASE_URL}/api/notifications/{notif_id}/status?status=in_progress")
        assert status_resp.status_code == 200
        print("✓ Update notification status to in_progress")
        
        # Move to done
        status_resp2 = api_client.put(f"{BASE_URL}/api/notifications/{notif_id}/status?status=done")
        assert status_resp2.status_code == 200
        print("✓ Update notification status to done")
        
        # Move to archived
        status_resp3 = api_client.put(f"{BASE_URL}/api/notifications/{notif_id}/status?status=archived")
        assert status_resp3.status_code == 200
        print("✓ Update notification status to archived")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/notifications/{notif_id}")
    
    def test_update_notification_status_invalid(self, api_client):
        """PUT /api/notifications/{id}/status - invalid status should fail"""
        # Create
        payload = {"name": f"{TEST_PREFIX}Invalid Status", "status": "upcoming"}
        create_resp = api_client.post(f"{BASE_URL}/api/notifications", json=payload)
        notif_id = create_resp.json()['id']
        
        # Try invalid status
        status_resp = api_client.put(f"{BASE_URL}/api/notifications/{notif_id}/status?status=invalid")
        assert status_resp.status_code == 400
        print("✓ Invalid status rejected with 400")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/notifications/{notif_id}")
    
    def test_delete_notification(self, api_client):
        """DELETE /api/notifications/{id} - delete notification"""
        # Create
        payload = {"name": f"{TEST_PREFIX}Delete Test", "status": "upcoming"}
        create_resp = api_client.post(f"{BASE_URL}/api/notifications", json=payload)
        notif_id = create_resp.json()['id']
        
        # Delete
        delete_resp = api_client.delete(f"{BASE_URL}/api/notifications/{notif_id}")
        assert delete_resp.status_code == 200
        
        # Verify deleted
        get_resp = api_client.get(f"{BASE_URL}/api/notifications")
        notif_ids = [n['id'] for n in get_resp.json()]
        assert notif_id not in notif_ids
        print("✓ Delete notification - confirmed deleted")


class TestExistingEndpointsStillWork:
    """Verify existing endpoints still work after new features added"""
    
    def test_dashboard(self, api_client):
        """GET /api/dashboard"""
        response = api_client.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert 'properties_count' in data
        assert 'units_count' in data
        assert 'tenants_count' in data
        print(f"✓ Dashboard - {data['properties_count']} properties, {data['units_count']} units")
    
    def test_properties(self, api_client):
        """GET /api/properties"""
        response = api_client.get(f"{BASE_URL}/api/properties")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Properties - {len(response.json())} found")
    
    def test_units(self, api_client):
        """GET /api/units"""
        response = api_client.get(f"{BASE_URL}/api/units")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Units - {len(response.json())} found")
    
    def test_tenants(self, api_client):
        """GET /api/tenants"""
        response = api_client.get(f"{BASE_URL}/api/tenants")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Tenants - {len(response.json())} found")
    
    def test_leads(self, api_client):
        """GET /api/leads"""
        response = api_client.get(f"{BASE_URL}/api/leads")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Leads - {len(response.json())} found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
