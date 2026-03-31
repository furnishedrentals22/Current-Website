"""
Parking API Tests - Testing CRUD operations for parking spots and assignments
"""
import pytest
import requests
import os
from datetime import date, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestParkingSpots:
    """Test parking spots CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_spot_ids = []
        yield
        # Cleanup created spots
        for spot_id in self.created_spot_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/parking-spots/{spot_id}")
            except:
                pass
    
    def test_get_parking_spots_empty_or_list(self):
        """GET /api/parking-spots should return list"""
        response = self.session.get(f"{BASE_URL}/api/parking-spots")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/parking-spots: {len(data)} spots found")
    
    def test_create_designated_spot(self):
        """POST /api/parking-spots - Create designated spot with needs_tag"""
        payload = {
            "spot_type": "designated",
            "spot_number": "TEST_A1",
            "location": "Garage Level 1",
            "needs_tag": True,
            "notes": "Test designated spot"
        }
        response = self.session.post(f"{BASE_URL}/api/parking-spots", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["spot_type"] == "designated"
        assert data["spot_number"] == "TEST_A1"
        assert data["location"] == "Garage Level 1"
        assert data["needs_tag"] == True
        assert "id" in data
        
        self.created_spot_ids.append(data["id"])
        print(f"Created designated spot: {data['id']}")
        
        # Verify with GET
        get_response = self.session.get(f"{BASE_URL}/api/parking-spots/{data['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["spot_number"] == "TEST_A1"
        assert fetched["needs_tag"] == True
    
    def test_create_marlins_decal_spot(self):
        """POST /api/parking-spots - Create marlins/city decal spot"""
        payload = {
            "spot_type": "marlins_decal",
            "decal_number": "TEST_D123",
            "decal_year": "2026",
            "notes": "Test decal spot"
        }
        response = self.session.post(f"{BASE_URL}/api/parking-spots", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["spot_type"] == "marlins_decal"
        assert data["decal_number"] == "TEST_D123"
        assert data["decal_year"] == "2026"
        assert "id" in data
        
        self.created_spot_ids.append(data["id"])
        print(f"Created marlins decal spot: {data['id']}")
    
    def test_update_parking_spot(self):
        """PUT /api/parking-spots/:id - Update spot"""
        # Create first
        create_payload = {
            "spot_type": "designated",
            "spot_number": "TEST_B1",
            "location": "Street",
            "needs_tag": False
        }
        create_response = self.session.post(f"{BASE_URL}/api/parking-spots", json=create_payload)
        assert create_response.status_code == 200
        spot_id = create_response.json()["id"]
        self.created_spot_ids.append(spot_id)
        
        # Update
        update_payload = {
            "spot_type": "designated",
            "spot_number": "TEST_B1_UPDATED",
            "location": "Garage Level 2",
            "needs_tag": True
        }
        update_response = self.session.put(f"{BASE_URL}/api/parking-spots/{spot_id}", json=update_payload)
        assert update_response.status_code == 200
        
        updated = update_response.json()
        assert updated["spot_number"] == "TEST_B1_UPDATED"
        assert updated["location"] == "Garage Level 2"
        assert updated["needs_tag"] == True
        print(f"Updated spot {spot_id}")
    
    def test_delete_parking_spot(self):
        """DELETE /api/parking-spots/:id - Delete spot"""
        # Create first
        create_payload = {
            "spot_type": "designated",
            "spot_number": "TEST_DELETE",
            "location": "Test"
        }
        create_response = self.session.post(f"{BASE_URL}/api/parking-spots", json=create_payload)
        assert create_response.status_code == 200
        spot_id = create_response.json()["id"]
        
        # Delete
        delete_response = self.session.delete(f"{BASE_URL}/api/parking-spots/{spot_id}")
        assert delete_response.status_code == 200
        
        # Verify deleted
        get_response = self.session.get(f"{BASE_URL}/api/parking-spots/{spot_id}")
        assert get_response.status_code == 404
        print(f"Deleted spot {spot_id}")


class TestParkingTimeline:
    """Test parking timeline endpoint"""
    
    def test_get_parking_timeline(self):
        """GET /api/parking/timeline - Returns timeline data"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/parking/timeline")
        assert response.status_code == 200
        
        data = response.json()
        assert "range_start" in data
        assert "range_end" in data
        assert "today" in data
        assert "spots" in data
        assert isinstance(data["spots"], list)
        
        print(f"Timeline: {data['range_start']} to {data['range_end']}, {len(data['spots'])} spots")
        
        # Verify spot structure if spots exist
        if data["spots"]:
            spot = data["spots"][0]
            assert "id" in spot
            assert "spot_type" in spot
            assert "label" in spot
            assert "assignments" in spot
            print(f"First spot: {spot['label']}, {len(spot['assignments'])} assignments")


class TestParkingAssignments:
    """Test parking assignments CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data - create a spot and get a tenant"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_assignment_ids = []
        self.created_spot_id = None
        
        # Create a test spot
        spot_payload = {
            "spot_type": "designated",
            "spot_number": "TEST_ASSIGN_SPOT",
            "location": "Test Location"
        }
        spot_response = self.session.post(f"{BASE_URL}/api/parking-spots", json=spot_payload)
        if spot_response.status_code == 200:
            self.created_spot_id = spot_response.json()["id"]
        
        # Get existing tenants
        tenants_response = self.session.get(f"{BASE_URL}/api/tenants")
        self.tenants = tenants_response.json() if tenants_response.status_code == 200 else []
        
        yield
        
        # Cleanup
        for assign_id in self.created_assignment_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/parking-assignments/{assign_id}")
            except:
                pass
        if self.created_spot_id:
            try:
                self.session.delete(f"{BASE_URL}/api/parking-spots/{self.created_spot_id}")
            except:
                pass
    
    def test_get_parking_assignments(self):
        """GET /api/parking-assignments - Returns list"""
        response = self.session.get(f"{BASE_URL}/api/parking-assignments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/parking-assignments: {len(data)} assignments found")
    
    def test_create_parking_assignment(self):
        """POST /api/parking-assignments - Create assignment"""
        if not self.created_spot_id:
            pytest.skip("No spot created for assignment test")
        if not self.tenants:
            pytest.skip("No tenants available for assignment test")
        
        tenant = self.tenants[0]
        today = date.today()
        
        payload = {
            "parking_spot_id": self.created_spot_id,
            "tenant_id": tenant["id"],
            "tenant_name": tenant.get("name", "Test Tenant"),
            "property_id": tenant.get("property_id"),
            "unit_id": tenant.get("unit_id"),
            "start_date": today.isoformat(),
            "end_date": (today + timedelta(days=30)).isoformat(),
            "notes": "Test assignment",
            "is_active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/parking-assignments", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["parking_spot_id"] == self.created_spot_id
        assert data["tenant_id"] == tenant["id"]
        assert "id" in data
        
        self.created_assignment_ids.append(data["id"])
        print(f"Created assignment: {data['id']}")
        
        # Verify assignment appears in timeline
        timeline_response = self.session.get(f"{BASE_URL}/api/parking/timeline")
        assert timeline_response.status_code == 200
        timeline = timeline_response.json()
        
        spot_in_timeline = next((s for s in timeline["spots"] if s["id"] == self.created_spot_id), None)
        assert spot_in_timeline is not None
        assert len(spot_in_timeline["assignments"]) > 0
        print(f"Assignment visible in timeline for spot {self.created_spot_id}")
    
    def test_get_assignments_by_tenant_id(self):
        """GET /api/parking-assignments?tenant_id=xxx - Filter by tenant"""
        if not self.created_spot_id or not self.tenants:
            pytest.skip("No spot or tenants for test")
        
        tenant = self.tenants[0]
        today = date.today()
        
        # Create assignment
        payload = {
            "parking_spot_id": self.created_spot_id,
            "tenant_id": tenant["id"],
            "tenant_name": tenant.get("name", "Test"),
            "start_date": today.isoformat(),
            "end_date": (today + timedelta(days=30)).isoformat(),
            "is_active": True
        }
        create_response = self.session.post(f"{BASE_URL}/api/parking-assignments", json=payload)
        if create_response.status_code == 200:
            self.created_assignment_ids.append(create_response.json()["id"])
        
        # Get by tenant_id
        response = self.session.get(f"{BASE_URL}/api/parking-assignments", params={"tenant_id": tenant["id"]})
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # All returned assignments should be for this tenant
        for assignment in data:
            assert assignment["tenant_id"] == tenant["id"]
        
        print(f"Found {len(data)} assignments for tenant {tenant['id']}")
    
    def test_update_parking_assignment(self):
        """PUT /api/parking-assignments/:id - Update assignment"""
        if not self.created_spot_id or not self.tenants:
            pytest.skip("No spot or tenants for test")
        
        tenant = self.tenants[0]
        today = date.today()
        
        # Create
        create_payload = {
            "parking_spot_id": self.created_spot_id,
            "tenant_id": tenant["id"],
            "tenant_name": tenant.get("name", "Test"),
            "start_date": today.isoformat(),
            "end_date": (today + timedelta(days=30)).isoformat(),
            "notes": "Original note",
            "is_active": True
        }
        create_response = self.session.post(f"{BASE_URL}/api/parking-assignments", json=create_payload)
        assert create_response.status_code == 200
        assignment_id = create_response.json()["id"]
        self.created_assignment_ids.append(assignment_id)
        
        # Update
        update_payload = {
            "parking_spot_id": self.created_spot_id,
            "tenant_id": tenant["id"],
            "tenant_name": tenant.get("name", "Test"),
            "start_date": today.isoformat(),
            "end_date": (today + timedelta(days=60)).isoformat(),
            "notes": "Updated note",
            "is_active": True
        }
        update_response = self.session.put(f"{BASE_URL}/api/parking-assignments/{assignment_id}", json=update_payload)
        assert update_response.status_code == 200
        
        updated = update_response.json()
        assert updated["notes"] == "Updated note"
        assert updated["end_date"] == (today + timedelta(days=60)).isoformat()
        print(f"Updated assignment {assignment_id}")
    
    def test_delete_parking_assignment(self):
        """DELETE /api/parking-assignments/:id - Delete assignment"""
        if not self.created_spot_id or not self.tenants:
            pytest.skip("No spot or tenants for test")
        
        tenant = self.tenants[0]
        today = date.today()
        
        # Create
        create_payload = {
            "parking_spot_id": self.created_spot_id,
            "tenant_id": tenant["id"],
            "tenant_name": tenant.get("name", "Test"),
            "start_date": today.isoformat(),
            "end_date": (today + timedelta(days=30)).isoformat(),
            "is_active": True
        }
        create_response = self.session.post(f"{BASE_URL}/api/parking-assignments", json=create_payload)
        assert create_response.status_code == 200
        assignment_id = create_response.json()["id"]
        
        # Delete
        delete_response = self.session.delete(f"{BASE_URL}/api/parking-assignments/{assignment_id}")
        assert delete_response.status_code == 200
        
        # Verify deleted - should not appear in list for this spot
        list_response = self.session.get(f"{BASE_URL}/api/parking-assignments", params={"parking_spot_id": self.created_spot_id})
        assert list_response.status_code == 200
        assignments = list_response.json()
        assert not any(a["id"] == assignment_id for a in assignments)
        print(f"Deleted assignment {assignment_id}")


class TestTenantFormNoHasParking:
    """Verify has_parking field behavior in tenant API"""
    
    def test_tenant_schema_accepts_has_parking_but_not_required(self):
        """Tenant API should still accept has_parking for backward compatibility"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Get properties and units first
        props_response = session.get(f"{BASE_URL}/api/properties")
        units_response = session.get(f"{BASE_URL}/api/units")
        
        if props_response.status_code != 200 or units_response.status_code != 200:
            pytest.skip("Cannot get properties/units")
        
        props = props_response.json()
        units = units_response.json()
        
        if not props or not units:
            pytest.skip("No properties or units available")
        
        # Create tenant without has_parking field
        today = date.today()
        payload = {
            "property_id": props[0]["id"],
            "unit_id": units[0]["id"],
            "name": "TEST_NoHasParking",
            "move_in_date": today.isoformat(),
            "move_out_date": (today + timedelta(days=30)).isoformat(),
            "monthly_rent": 1000,
            "is_airbnb_vrbo": False
        }
        
        response = session.post(f"{BASE_URL}/api/tenants", json=payload)
        assert response.status_code == 200
        
        tenant_id = response.json()["id"]
        print(f"Created tenant without has_parking: {tenant_id}")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/tenants/{tenant_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
