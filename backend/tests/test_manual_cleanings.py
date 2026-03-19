"""
Test suite for Manual Cleanings CRUD operations
Tests the new manual cleaning feature endpoints at /api/manual-cleanings
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestManualCleaningsCRUD:
    """Manual Cleanings CRUD API tests"""
    
    created_mc_ids = []  # Track created manual cleanings for cleanup
    
    @pytest.fixture(autouse=True)
    def setup_cleanup(self):
        """Cleanup test data after each test class"""
        yield
        # Cleanup any created manual cleanings
        for mc_id in TestManualCleaningsCRUD.created_mc_ids:
            try:
                requests.delete(f"{BASE_URL}/api/manual-cleanings/{mc_id}")
            except:
                pass
        TestManualCleaningsCRUD.created_mc_ids = []

    def test_list_manual_cleanings_empty(self):
        """Test GET /api/manual-cleanings returns a list (initially may be empty)"""
        response = requests.get(f"{BASE_URL}/api/manual-cleanings")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Manual cleanings count: {len(data)}")
    
    def test_get_units_for_testing(self):
        """Get available units to use in manual cleaning tests"""
        response = requests.get(f"{BASE_URL}/api/units")
        assert response.status_code == 200
        units = response.json()
        assert len(units) > 0, "No units available for testing"
        # Store first unit for use in other tests
        self.unit_id = units[0]["id"]
        self.unit_number = units[0]["unit_number"]
        print(f"Using unit {self.unit_number} (id: {self.unit_id}) for tests")
        return units[0]
    
    def test_create_manual_cleaning_success(self):
        """Test POST /api/manual-cleanings creates a manual cleaning"""
        # Get a unit first
        units_response = requests.get(f"{BASE_URL}/api/units")
        units = units_response.json()
        unit = units[0]
        
        payload = {
            "unit_id": unit["id"],
            "unit_label": unit["unit_number"],
            "tenant_name": "TEST_Deep Clean",
            "check_out_date": "2026-01-30",
            "next_check_in_date": "2026-01-31",
            "check_out_time": "11:00",
            "check_in_time": "15:00",
            "cleaning_time": "12:00",
            "assigned_cleaner_id": None,
            "assigned_cleaner_name": "",
            "assigned_maintenance_id": None,
            "assigned_maintenance_name": "",
            "maintenance_note": "",
            "notes": "Test manual cleaning created by automated test",
            "confirmed": False
        }
        
        response = requests.post(f"{BASE_URL}/api/manual-cleanings", json=payload)
        assert response.status_code == 200, f"Failed to create: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response missing 'id'"
        assert data["unit_id"] == unit["id"]
        assert data["unit_label"] == unit["unit_number"]
        assert data["tenant_name"] == "TEST_Deep Clean"
        assert data["check_out_date"] == "2026-01-30"
        assert data["notes"] == "Test manual cleaning created by automated test"
        assert data.get("is_manual") == True, "is_manual flag should be True"
        
        # Track for cleanup
        TestManualCleaningsCRUD.created_mc_ids.append(data["id"])
        print(f"Created manual cleaning with id: {data['id']}")
        return data
    
    def test_create_manual_cleaning_minimal(self):
        """Test creating manual cleaning with minimal required fields"""
        units_response = requests.get(f"{BASE_URL}/api/units")
        units = units_response.json()
        unit = units[0]
        
        # Minimal payload - only required fields
        payload = {
            "unit_id": unit["id"],
            "check_out_date": "2026-02-15"
        }
        
        response = requests.post(f"{BASE_URL}/api/manual-cleanings", json=payload)
        assert response.status_code == 200, f"Failed with minimal payload: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["unit_id"] == unit["id"]
        assert data["check_out_date"] == "2026-02-15"
        
        TestManualCleaningsCRUD.created_mc_ids.append(data["id"])
        print(f"Created minimal manual cleaning with id: {data['id']}")
        return data
    
    def test_get_manual_cleaning_after_create(self):
        """Test that created manual cleaning appears in GET /api/manual-cleanings list"""
        # Create a manual cleaning first
        units_response = requests.get(f"{BASE_URL}/api/units")
        units = units_response.json()
        unit = units[0]
        
        payload = {
            "unit_id": unit["id"],
            "unit_label": unit["unit_number"],
            "tenant_name": "TEST_Verify Persistence",
            "check_out_date": "2026-03-01"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/manual-cleanings", json=payload)
        created = create_response.json()
        TestManualCleaningsCRUD.created_mc_ids.append(created["id"])
        
        # GET the list and verify our created cleaning is there
        list_response = requests.get(f"{BASE_URL}/api/manual-cleanings")
        assert list_response.status_code == 200
        
        cleanings = list_response.json()
        found = [c for c in cleanings if c["id"] == created["id"]]
        assert len(found) == 1, "Created manual cleaning not found in list"
        assert found[0]["tenant_name"] == "TEST_Verify Persistence"
        print(f"Verified manual cleaning {created['id']} persisted and returned in list")
    
    def test_update_manual_cleaning_success(self):
        """Test PUT /api/manual-cleanings/{id} updates a manual cleaning"""
        # Create first
        units_response = requests.get(f"{BASE_URL}/api/units")
        units = units_response.json()
        unit = units[0]
        
        create_payload = {
            "unit_id": unit["id"],
            "unit_label": unit["unit_number"],
            "tenant_name": "TEST_Original Name",
            "check_out_date": "2026-03-10",
            "notes": "Original notes"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/manual-cleanings", json=create_payload)
        created = create_response.json()
        mc_id = created["id"]
        TestManualCleaningsCRUD.created_mc_ids.append(mc_id)
        
        # Update
        update_payload = {
            "unit_id": unit["id"],
            "unit_label": unit["unit_number"],
            "tenant_name": "TEST_Updated Name",
            "check_out_date": "2026-03-15",
            "next_check_in_date": "2026-03-16",
            "cleaning_time": "14:00",
            "notes": "Updated notes",
            "confirmed": True
        }
        
        update_response = requests.put(f"{BASE_URL}/api/manual-cleanings/{mc_id}", json=update_payload)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        updated = update_response.json()
        assert updated["tenant_name"] == "TEST_Updated Name"
        assert updated["check_out_date"] == "2026-03-15"
        assert updated["next_check_in_date"] == "2026-03-16"
        assert updated["cleaning_time"] == "14:00"
        assert updated["notes"] == "Updated notes"
        assert updated["confirmed"] == True
        print(f"Successfully updated manual cleaning {mc_id}")
        
        # Verify with GET
        list_response = requests.get(f"{BASE_URL}/api/manual-cleanings")
        cleanings = list_response.json()
        found = [c for c in cleanings if c["id"] == mc_id]
        assert len(found) == 1
        assert found[0]["tenant_name"] == "TEST_Updated Name"
        assert found[0]["confirmed"] == True
        print("Verified update persisted in database")
    
    def test_update_manual_cleaning_change_unit(self):
        """Test updating a manual cleaning to change the unit"""
        units_response = requests.get(f"{BASE_URL}/api/units")
        units = units_response.json()
        if len(units) < 2:
            pytest.skip("Need at least 2 units to test unit change")
        
        unit1, unit2 = units[0], units[1]
        
        # Create with unit1
        create_payload = {
            "unit_id": unit1["id"],
            "unit_label": unit1["unit_number"],
            "tenant_name": "TEST_Change Unit",
            "check_out_date": "2026-04-01"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/manual-cleanings", json=create_payload)
        created = create_response.json()
        mc_id = created["id"]
        TestManualCleaningsCRUD.created_mc_ids.append(mc_id)
        
        # Update to unit2
        update_payload = {
            "unit_id": unit2["id"],
            "unit_label": unit2["unit_number"],
            "tenant_name": "TEST_Change Unit",
            "check_out_date": "2026-04-01"
        }
        
        update_response = requests.put(f"{BASE_URL}/api/manual-cleanings/{mc_id}", json=update_payload)
        assert update_response.status_code == 200
        
        updated = update_response.json()
        assert updated["unit_id"] == unit2["id"]
        assert updated["unit_label"] == unit2["unit_number"]
        print(f"Successfully changed unit from {unit1['unit_number']} to {unit2['unit_number']}")
    
    def test_delete_manual_cleaning_success(self):
        """Test DELETE /api/manual-cleanings/{id} removes a manual cleaning"""
        # Create first
        units_response = requests.get(f"{BASE_URL}/api/units")
        units = units_response.json()
        unit = units[0]
        
        create_payload = {
            "unit_id": unit["id"],
            "tenant_name": "TEST_To Be Deleted",
            "check_out_date": "2026-05-01"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/manual-cleanings", json=create_payload)
        created = create_response.json()
        mc_id = created["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/manual-cleanings/{mc_id}")
        assert delete_response.status_code == 200
        assert delete_response.json().get("message") == "Manual cleaning deleted"
        print(f"Deleted manual cleaning {mc_id}")
        
        # Verify it's gone
        list_response = requests.get(f"{BASE_URL}/api/manual-cleanings")
        cleanings = list_response.json()
        found = [c for c in cleanings if c["id"] == mc_id]
        assert len(found) == 0, "Deleted manual cleaning should not appear in list"
        print("Verified deletion - manual cleaning no longer in list")
    
    def test_delete_manual_cleaning_not_found(self):
        """Test DELETE /api/manual-cleanings/{id} returns 404 for non-existent id"""
        fake_id = "000000000000000000000000"  # Valid ObjectId format but doesn't exist
        response = requests.delete(f"{BASE_URL}/api/manual-cleanings/{fake_id}")
        assert response.status_code == 404
        print("Correctly returned 404 for non-existent manual cleaning")
    
    def test_update_manual_cleaning_not_found(self):
        """Test PUT /api/manual-cleanings/{id} returns 404 for non-existent id"""
        fake_id = "000000000000000000000000"
        payload = {
            "unit_id": "some_unit_id",
            "check_out_date": "2026-01-01"
        }
        response = requests.put(f"{BASE_URL}/api/manual-cleanings/{fake_id}", json=payload)
        assert response.status_code == 404
        print("Correctly returned 404 for updating non-existent manual cleaning")
    
    def test_regular_cleanings_not_affected_by_manual_delete(self):
        """Verify deleting manual cleanings doesn't affect regular cleaning records"""
        # Get initial regular cleanings count
        regular_before = requests.get(f"{BASE_URL}/api/cleaning-records").json()
        regular_count_before = len(regular_before)
        
        # Create a manual cleaning
        units_response = requests.get(f"{BASE_URL}/api/units")
        unit = units_response.json()[0]
        
        create_payload = {
            "unit_id": unit["id"],
            "tenant_name": "TEST_No Impact On Regular",
            "check_out_date": "2026-06-01"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/manual-cleanings", json=create_payload)
        mc_id = create_response.json()["id"]
        
        # Delete the manual cleaning
        requests.delete(f"{BASE_URL}/api/manual-cleanings/{mc_id}")
        
        # Verify regular cleanings unaffected
        regular_after = requests.get(f"{BASE_URL}/api/cleaning-records").json()
        regular_count_after = len(regular_after)
        
        assert regular_count_after == regular_count_before, "Deleting manual cleaning affected regular cleaning records!"
        print(f"Verified: Regular cleaning records unchanged ({regular_count_before} -> {regular_count_after})")


class TestManualCleaningsEdgeCases:
    """Edge case tests for manual cleanings"""
    
    created_mc_ids = []
    
    @pytest.fixture(autouse=True)
    def cleanup(self):
        yield
        for mc_id in TestManualCleaningsEdgeCases.created_mc_ids:
            try:
                requests.delete(f"{BASE_URL}/api/manual-cleanings/{mc_id}")
            except:
                pass
        TestManualCleaningsEdgeCases.created_mc_ids = []
    
    def test_create_with_cleaner_and_maintenance(self):
        """Test creating manual cleaning with cleaner and maintenance assigned"""
        units_response = requests.get(f"{BASE_URL}/api/units")
        unit = units_response.json()[0]
        
        # Get housekeepers if available
        hk_response = requests.get(f"{BASE_URL}/api/housekeepers")
        housekeepers = hk_response.json()
        
        # Get maintenance personnel if available
        maint_response = requests.get(f"{BASE_URL}/api/maintenance-personnel")
        maintenance = maint_response.json()
        
        payload = {
            "unit_id": unit["id"],
            "unit_label": unit["unit_number"],
            "tenant_name": "TEST_With Assignments",
            "check_out_date": "2026-07-01",
            "assigned_cleaner_id": housekeepers[0]["id"] if housekeepers else None,
            "assigned_cleaner_name": housekeepers[0]["name"] if housekeepers else "Custom Cleaner",
            "assigned_maintenance_id": maintenance[0]["id"] if maintenance else None,
            "assigned_maintenance_name": maintenance[0]["name"] if maintenance else "Custom Maint",
            "maintenance_note": "Check AC unit"
        }
        
        response = requests.post(f"{BASE_URL}/api/manual-cleanings", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        TestManualCleaningsEdgeCases.created_mc_ids.append(data["id"])
        
        if housekeepers:
            assert data["assigned_cleaner_id"] == housekeepers[0]["id"]
            assert data["assigned_cleaner_name"] == housekeepers[0]["name"]
        
        assert data["maintenance_note"] == "Check AC unit"
        print("Created manual cleaning with cleaner and maintenance assignments")
    
    def test_sorting_by_check_out_date(self):
        """Test that manual cleanings are returned sorted by check_out_date"""
        units_response = requests.get(f"{BASE_URL}/api/units")
        unit = units_response.json()[0]
        
        # Create cleanings with different dates (in non-chronological order)
        dates = ["2026-08-15", "2026-08-01", "2026-08-30"]
        
        for date in dates:
            payload = {
                "unit_id": unit["id"],
                "tenant_name": f"TEST_Sort_{date}",
                "check_out_date": date
            }
            response = requests.post(f"{BASE_URL}/api/manual-cleanings", json=payload)
            TestManualCleaningsEdgeCases.created_mc_ids.append(response.json()["id"])
        
        # Get all and verify sorting
        list_response = requests.get(f"{BASE_URL}/api/manual-cleanings")
        cleanings = list_response.json()
        
        # Filter to our test cleanings
        test_cleanings = [c for c in cleanings if c.get("tenant_name", "").startswith("TEST_Sort_")]
        
        if len(test_cleanings) >= 2:
            for i in range(len(test_cleanings) - 1):
                assert test_cleanings[i]["check_out_date"] <= test_cleanings[i+1]["check_out_date"], \
                    "Manual cleanings should be sorted by check_out_date"
        
        print("Verified manual cleanings are sorted by check_out_date")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
