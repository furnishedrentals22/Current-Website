#!/usr/bin/env python3
"""
Parking Backend Fixes Test
Testing the 3 specific changes requested:
1. Allow 1-day overlap between parking assignments
2. Tag info field on parking spots  
3. Verify existing endpoints still work
"""

import requests
import json
from datetime import date, timedelta

# Use the production URL from frontend/.env
BASE_URL = "https://listing-upgrades.preview.emergentagent.com"

class ParkingFixesTest:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_resources = {
            "properties": [],
            "units": [],
            "tenants": [],
            "parking_spots": [],
            "parking_assignments": []
        }
        
    def cleanup(self):
        """Clean up all created test resources"""
        print("\n🧹 Cleaning up test resources...")
        
        # Delete in reverse order of dependencies
        for assignment_id in self.created_resources["parking_assignments"]:
            try:
                self.session.delete(f"{BASE_URL}/api/parking-assignments/{assignment_id}")
                print(f"  ✅ Deleted parking assignment {assignment_id}")
            except Exception as e:
                print(f"  ⚠️ Failed to delete assignment {assignment_id}: {e}")
                
        for spot_id in self.created_resources["parking_spots"]:
            try:
                self.session.delete(f"{BASE_URL}/api/parking-spots/{spot_id}")
                print(f"  ✅ Deleted parking spot {spot_id}")
            except Exception as e:
                print(f"  ⚠️ Failed to delete spot {spot_id}: {e}")
                
        for tenant_id in self.created_resources["tenants"]:
            try:
                self.session.delete(f"{BASE_URL}/api/tenants/{tenant_id}")
                print(f"  ✅ Deleted tenant {tenant_id}")
            except Exception as e:
                print(f"  ⚠️ Failed to delete tenant {tenant_id}: {e}")
                
        for unit_id in self.created_resources["units"]:
            try:
                self.session.delete(f"{BASE_URL}/api/units/{unit_id}")
                print(f"  ✅ Deleted unit {unit_id}")
            except Exception as e:
                print(f"  ⚠️ Failed to delete unit {unit_id}: {e}")
                
        for property_id in self.created_resources["properties"]:
            try:
                self.session.delete(f"{BASE_URL}/api/properties/{property_id}")
                print(f"  ✅ Deleted property {property_id}")
            except Exception as e:
                print(f"  ⚠️ Failed to delete property {property_id}: {e}")

    def create_test_property(self):
        """Create a test property"""
        print("\n🏢 Creating test property...")
        payload = {
            "name": "TEST Parking Property",
            "address": "123 Test Parking St, Miami, FL",
            "owner_manager_name": "Test Manager",
            "owner_manager_phone": "555-0123",
            "owner_manager_email": "test@parking.com"
        }
        
        response = self.session.post(f"{BASE_URL}/api/properties", json=payload)
        if response.status_code != 200:
            raise Exception(f"Failed to create property: {response.status_code} - {response.text}")
            
        property_data = response.json()
        property_id = property_data["id"]
        self.created_resources["properties"].append(property_id)
        print(f"  ✅ Created property: {property_id}")
        return property_id

    def create_test_unit(self, property_id, suffix=""):
        """Create a test unit"""
        unit_suffix = f"-{suffix}" if suffix else ""
        print(f"\n🏠 Creating test unit{unit_suffix}...")
        today = date.today()
        payload = {
            "property_id": property_id,
            "unit_number": f"TEST-P1{unit_suffix}",
            "unit_size": "1BR",
            "base_rent": 1500.0,
            "availability_start_date": today.isoformat()
        }
        
        response = self.session.post(f"{BASE_URL}/api/units", json=payload)
        if response.status_code != 200:
            raise Exception(f"Failed to create unit: {response.status_code} - {response.text}")
            
        unit_data = response.json()
        unit_id = unit_data["id"]
        self.created_resources["units"].append(unit_id)
        print(f"  ✅ Created unit: {unit_id}")
        return unit_id

    def create_test_tenant(self, property_id, unit_id, name_suffix="A"):
        """Create a test tenant"""
        print(f"\n👤 Creating test tenant {name_suffix}...")
        today = date.today()
        payload = {
            "property_id": property_id,
            "unit_id": unit_id,
            "name": f"Test Tenant {name_suffix}",
            "move_in_date": today.isoformat(),
            "move_out_date": (today + timedelta(days=90)).isoformat(),
            "monthly_rent": 1500.0,
            "is_airbnb_vrbo": False
        }
        
        response = self.session.post(f"{BASE_URL}/api/tenants", json=payload)
        if response.status_code != 200:
            raise Exception(f"Failed to create tenant: {response.status_code} - {response.text}")
            
        tenant_data = response.json()
        tenant_id = tenant_data["id"]
        self.created_resources["tenants"].append(tenant_id)
        print(f"  ✅ Created tenant: {tenant_id} - {tenant_data['name']}")
        return tenant_id, tenant_data["name"]

    def test_tag_info_field(self):
        """Test #2: Tag info field on parking spots"""
        print("\n" + "="*60)
        print("🏷️  TEST #2: Tag info field on parking spots")
        print("="*60)
        
        # Create parking spot with tag info
        print("\n📍 Creating parking spot with tag info...")
        spot_payload = {
            "spot_type": "designated",
            "spot_number": "T1",
            "location": "Garage Level 1",
            "needs_tag": True,
            "tag_info": "Blue Tag #42",
            "notes": "Test spot with tag info"
        }
        
        response = self.session.post(f"{BASE_URL}/api/parking-spots", json=spot_payload)
        if response.status_code != 200:
            print(f"  ❌ Failed to create parking spot: {response.status_code} - {response.text}")
            return False
            
        spot_data = response.json()
        spot_id = spot_data["id"]
        self.created_resources["parking_spots"].append(spot_id)
        
        # Verify tag_info is returned
        if spot_data.get("tag_info") != "Blue Tag #42":
            print(f"  ❌ Tag info not returned correctly. Expected 'Blue Tag #42', got: {spot_data.get('tag_info')}")
            return False
        if spot_data.get("needs_tag") != True:
            print(f"  ❌ needs_tag not returned correctly. Expected True, got: {spot_data.get('needs_tag')}")
            return False
            
        print(f"  ✅ Created spot with tag_info: {spot_data['tag_info']}")
        
        # Test GET /api/parking/timeline includes tag_info
        print("\n📊 Testing timeline includes tag_info...")
        timeline_response = self.session.get(f"{BASE_URL}/api/parking/timeline")
        if timeline_response.status_code != 200:
            print(f"  ❌ Failed to get timeline: {timeline_response.status_code}")
            return False
            
        timeline_data = timeline_response.json()
        spot_in_timeline = None
        for spot in timeline_data.get("spots", []):
            if spot["id"] == spot_id:
                spot_in_timeline = spot
                break
                
        if not spot_in_timeline:
            print(f"  ❌ Spot not found in timeline")
            return False
            
        if spot_in_timeline.get("tag_info") != "Blue Tag #42":
            print(f"  ❌ Tag info not in timeline. Expected 'Blue Tag #42', got: {spot_in_timeline.get('tag_info')}")
            return False
            
        print(f"  ✅ Timeline includes tag_info: {spot_in_timeline['tag_info']}")
        
        # Test updating tag_info
        print("\n✏️ Testing tag_info update...")
        update_payload = {
            "spot_type": "designated",
            "spot_number": "T1",
            "location": "Garage Level 1",
            "needs_tag": True,
            "tag_info": "Red Tag #99",
            "notes": "Updated tag info"
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/parking-spots/{spot_id}", json=update_payload)
        if update_response.status_code != 200:
            print(f"  ❌ Failed to update spot: {update_response.status_code} - {update_response.text}")
            return False
            
        updated_data = update_response.json()
        if updated_data.get("tag_info") != "Red Tag #99":
            print(f"  ❌ Tag info not updated. Expected 'Red Tag #99', got: {updated_data.get('tag_info')}")
            return False
            
        print(f"  ✅ Updated tag_info: {updated_data['tag_info']}")
        
        return True

    def test_one_day_overlap(self):
        """Test #1: Allow 1-day overlap between parking assignments"""
        print("\n" + "="*60)
        print("📅 TEST #1: Allow 1-day overlap between parking assignments")
        print("="*60)
        
        # Create required resources - separate units for each tenant to avoid tenant overlap validation
        property_id = self.create_test_property()
        unit_a_id = self.create_test_unit(property_id, "A")
        unit_b_id = self.create_test_unit(property_id, "B")
        unit_c_id = self.create_test_unit(property_id, "C")
        tenant_a_id, tenant_a_name = self.create_test_tenant(property_id, unit_a_id, "A")
        tenant_b_id, tenant_b_name = self.create_test_tenant(property_id, unit_b_id, "B")
        tenant_c_id, tenant_c_name = self.create_test_tenant(property_id, unit_c_id, "C")
        
        # Create parking spot
        print("\n📍 Creating parking spot...")
        spot_payload = {
            "spot_type": "designated",
            "spot_number": "T1",
            "location": "Test Garage"
        }
        
        response = self.session.post(f"{BASE_URL}/api/parking-spots", json=spot_payload)
        if response.status_code != 200:
            print(f"  ❌ Failed to create parking spot: {response.status_code} - {response.text}")
            return False
            
        spot_data = response.json()
        spot_id = spot_data["id"]
        self.created_resources["parking_spots"].append(spot_id)
        print(f"  ✅ Created parking spot: {spot_id}")
        
        # Create Assignment A: 2026-03-01 to 2026-04-15
        print("\n📋 Creating Assignment A (2026-03-01 to 2026-04-15)...")
        assignment_a_payload = {
            "parking_spot_id": spot_id,
            "tenant_id": tenant_a_id,
            "tenant_name": tenant_a_name,
            "property_id": property_id,
            "unit_id": unit_a_id,
            "start_date": "2026-03-01",
            "end_date": "2026-04-15",
            "notes": "Assignment A",
            "is_active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/parking-assignments", json=assignment_a_payload)
        if response.status_code != 200:
            print(f"  ❌ Failed to create Assignment A: {response.status_code} - {response.text}")
            return False
            
        assignment_a_data = response.json()
        assignment_a_id = assignment_a_data["id"]
        self.created_resources["parking_assignments"].append(assignment_a_id)
        print(f"  ✅ Created Assignment A: {assignment_a_id}")
        
        # Create Assignment B: 2026-04-15 to 2026-06-01 (same day overlap - SHOULD succeed)
        print("\n📋 Creating Assignment B (2026-04-15 to 2026-06-01) - Same day overlap should succeed...")
        assignment_b_payload = {
            "parking_spot_id": spot_id,
            "tenant_id": tenant_b_id,
            "tenant_name": tenant_b_name,
            "property_id": property_id,
            "unit_id": unit_b_id,
            "start_date": "2026-04-15",
            "end_date": "2026-06-01",
            "notes": "Assignment B - Same day start",
            "is_active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/parking-assignments", json=assignment_b_payload)
        if response.status_code != 200:
            print(f"  ❌ Assignment B failed (should have succeeded): {response.status_code} - {response.text}")
            return False
            
        assignment_b_data = response.json()
        assignment_b_id = assignment_b_data["id"]
        self.created_resources["parking_assignments"].append(assignment_b_id)
        print(f"  ✅ Assignment B succeeded (correct): {assignment_b_id}")
        
        # Create Assignment C: 2026-04-10 to 2026-05-01 (true overlap - SHOULD fail)
        print("\n📋 Creating Assignment C (2026-04-10 to 2026-05-01) - True overlap should fail...")
        assignment_c_payload = {
            "parking_spot_id": spot_id,
            "tenant_id": tenant_c_id,
            "tenant_name": tenant_c_name,
            "property_id": property_id,
            "unit_id": unit_c_id,
            "start_date": "2026-04-10",
            "end_date": "2026-05-01",
            "notes": "Assignment C - Should fail",
            "is_active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/parking-assignments", json=assignment_c_payload)
        if response.status_code == 200:
            # If it succeeded, we need to clean it up and report failure
            assignment_c_data = response.json()
            self.created_resources["parking_assignments"].append(assignment_c_data["id"])
            print(f"  ❌ Assignment C succeeded (should have failed): {assignment_c_data['id']}")
            return False
        elif response.status_code == 409:
            print(f"  ✅ Assignment C correctly failed with conflict: {response.json().get('detail', 'No detail')}")
        else:
            print(f"  ❌ Assignment C failed with unexpected error: {response.status_code} - {response.text}")
            return False
            
        # Test PUT endpoint with same-day overlap
        print("\n✏️ Testing PUT endpoint allows same-day overlap...")
        update_payload = {
            "parking_spot_id": spot_id,
            "tenant_id": tenant_b_id,
            "tenant_name": tenant_b_name,
            "property_id": property_id,
            "unit_id": unit_b_id,
            "start_date": "2026-04-15",  # Same as Assignment A end date
            "end_date": "2026-07-01",    # Extended end date
            "notes": "Assignment B - Updated with same day overlap",
            "is_active": True
        }
        
        response = self.session.put(f"{BASE_URL}/api/parking-assignments/{assignment_b_id}", json=update_payload)
        if response.status_code != 200:
            print(f"  ❌ PUT update failed (should have succeeded): {response.status_code} - {response.text}")
            return False
            
        print(f"  ✅ PUT update with same-day overlap succeeded")
        
        return True

    def test_existing_endpoints(self):
        """Test #3: Verify existing endpoints still work"""
        print("\n" + "="*60)
        print("🔧 TEST #3: Verify existing endpoints still work")
        print("="*60)
        
        # Test GET /api/parking/timeline
        print("\n📊 Testing GET /api/parking/timeline...")
        response = self.session.get(f"{BASE_URL}/api/parking/timeline")
        if response.status_code != 200:
            print(f"  ❌ Timeline endpoint failed: {response.status_code}")
            return False
            
        timeline_data = response.json()
        required_fields = ["range_start", "range_end", "today", "spots"]
        for field in required_fields:
            if field not in timeline_data:
                print(f"  ❌ Timeline missing field: {field}")
                return False
                
        print(f"  ✅ Timeline endpoint working: {len(timeline_data['spots'])} spots")
        
        # Test GET /api/parking-spots
        print("\n📍 Testing GET /api/parking-spots...")
        response = self.session.get(f"{BASE_URL}/api/parking-spots")
        if response.status_code != 200:
            print(f"  ❌ Parking spots endpoint failed: {response.status_code}")
            return False
            
        spots_data = response.json()
        if not isinstance(spots_data, list):
            print(f"  ❌ Parking spots should return list, got: {type(spots_data)}")
            return False
            
        print(f"  ✅ Parking spots endpoint working: {len(spots_data)} spots")
        
        # Test DELETE endpoints if we have resources
        if self.created_resources["parking_assignments"]:
            print("\n🗑️ Testing DELETE parking assignment...")
            assignment_id = self.created_resources["parking_assignments"][0]
            response = self.session.delete(f"{BASE_URL}/api/parking-assignments/{assignment_id}")
            if response.status_code != 200:
                print(f"  ❌ Delete assignment failed: {response.status_code}")
                return False
            else:
                print(f"  ✅ Delete assignment working")
                self.created_resources["parking_assignments"].remove(assignment_id)
                
        if self.created_resources["parking_spots"]:
            print("\n🗑️ Testing DELETE parking spot...")
            spot_id = self.created_resources["parking_spots"][0]
            response = self.session.delete(f"{BASE_URL}/api/parking-spots/{spot_id}")
            if response.status_code != 200:
                print(f"  ❌ Delete spot failed: {response.status_code}")
                return False
            else:
                print(f"  ✅ Delete spot working")
                self.created_resources["parking_spots"].remove(spot_id)
        
        return True

    def run_all_tests(self):
        """Run all parking fix tests"""
        print("🚗 PARKING BACKEND FIXES TEST")
        print("="*60)
        print(f"Testing against: {BASE_URL}")
        
        try:
            # Test in order of dependencies
            test_results = {
                "tag_info": self.test_tag_info_field(),
                "one_day_overlap": self.test_one_day_overlap(),
                "existing_endpoints": self.test_existing_endpoints()
            }
            
            print("\n" + "="*60)
            print("📋 TEST RESULTS SUMMARY")
            print("="*60)
            
            all_passed = True
            for test_name, result in test_results.items():
                status = "✅ PASS" if result else "❌ FAIL"
                print(f"  {test_name.replace('_', ' ').title()}: {status}")
                if not result:
                    all_passed = False
                    
            if all_passed:
                print("\n🎉 ALL TESTS PASSED! Parking fixes are working correctly.")
            else:
                print("\n⚠️ SOME TESTS FAILED! Check the details above.")
                
            return all_passed
            
        except Exception as e:
            print(f"\n💥 Test execution failed: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            self.cleanup()

if __name__ == "__main__":
    tester = ParkingFixesTest()
    success = tester.run_all_tests()
    exit(0 if success else 1)