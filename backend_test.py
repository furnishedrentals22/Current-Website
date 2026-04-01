#!/usr/bin/env python3

import requests
import sys
from datetime import datetime, date, timedelta
import json

class LeaseTrackerAPITester:
    def __init__(self, base_url="https://rental-showcase-12.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{self.base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'properties': [],
            'units': [],
            'tenants': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_properties_with_building_id(self):
        """Test property creation and sorting by building_id"""
        print("\n=== Testing Properties with Building ID ===")
        
        # Create properties with different building_ids
        prop1_data = {
            "name": "Test Property 3",
            "address": "789 Test Ave",
            "owner_manager_name": "Manager C",
            "owner_manager_phone": "555-0003",
            "owner_manager_email": "managerc@test.com",
            "building_id": 3
        }
        
        prop2_data = {
            "name": "Test Property 1",
            "address": "123 Test St",
            "owner_manager_name": "Manager A", 
            "owner_manager_phone": "555-0001",
            "owner_manager_email": "managera@test.com",
            "building_id": 1
        }
        
        prop3_data = {
            "name": "Test Property No ID",
            "address": "456 Test Blvd",
            "owner_manager_name": "Manager B",
            "owner_manager_phone": "555-0002", 
            "owner_manager_email": "managerb@test.com"
            # No building_id
        }

        # Create properties (API returns 200 instead of 201)
        success1, prop1 = self.run_test("Create Property with building_id 3", "POST", "properties", 200, prop1_data)
        if success1 and 'id' in prop1:
            self.created_resources['properties'].append(prop1['id'])
        
        success2, prop2 = self.run_test("Create Property with building_id 1", "POST", "properties", 200, prop2_data)
        if success2 and 'id' in prop2:
            self.created_resources['properties'].append(prop2['id'])
            
        success3, prop3 = self.run_test("Create Property without building_id", "POST", "properties", 200, prop3_data)  
        if success3 and 'id' in prop3:
            self.created_resources['properties'].append(prop3['id'])

        # Test properties list is sorted by building_id
        success, properties = self.run_test("Get Properties (check sorting)", "GET", "properties", 200)
        if success:
            # Find our test properties
            test_props = [p for p in properties if p.get('name', '').startswith('Test Property')]
            if len(test_props) >= 2:
                # Check if properties with building_id come before those without
                building_ids = [p.get('building_id') for p in test_props]
                print(f"   Building IDs order: {building_ids}")
                
                # Properties should be sorted: building_id 1, 3, then None
                sorted_correctly = True
                has_id_props = [p for p in test_props if p.get('building_id') is not None]
                no_id_props = [p for p in test_props if p.get('building_id') is None]
                
                # Check building_id properties are sorted ascending
                if len(has_id_props) >= 2:
                    for i in range(1, len(has_id_props)):
                        if has_id_props[i-1]['building_id'] > has_id_props[i]['building_id']:
                            sorted_correctly = False
                            print(f"   ❌ Building ID sort order incorrect")
                            break
                
                if sorted_correctly:
                    print(f"   ✅ Properties sorted correctly by building_id")
                else:
                    print(f"   ❌ Properties NOT sorted correctly by building_id")
        
        return success1 and success2 and success3

    def test_tenant_deposit_return_fields(self):
        """Test tenant creation and update with deposit return fields"""
        print("\n=== Testing Tenant Deposit Return Fields ===")
        
        # First create a property and unit for the tenant
        prop_data = {
            "name": "Tenant Test Property",
            "address": "999 Tenant St",
            "owner_manager_name": "Test Manager",
            "owner_manager_phone": "555-0999",
            "owner_manager_email": "test@test.com"
        }
        
        success_prop, prop = self.run_test("Create Property for Tenant", "POST", "properties", 200, prop_data)
        if success_prop and 'id' in prop:
            self.created_resources['properties'].append(prop['id'])
        else:
            print("   ❌ Failed to create property for tenant test")
            return False
        
        unit_data = {
            "property_id": prop['id'],
            "unit_number": "101",
            "unit_size": "1/1", 
            "base_rent": 1200.0,
            "availability_start_date": "2024-01-01"
        }
        
        success_unit, unit = self.run_test("Create Unit for Tenant", "POST", "units", 200, unit_data)
        if success_unit and 'id' in unit:
            self.created_resources['units'].append(unit['id'])
        else:
            print("   ❌ Failed to create unit for tenant test") 
            return False

        # Create tenant with deposit return fields
        tenant_data = {
            "property_id": prop['id'],
            "unit_id": unit['id'],
            "name": "Test Tenant",
            "phone": "555-1234",
            "email": "tenant@test.com",
            "move_in_date": "2024-01-15",
            "move_out_date": "2024-12-15",
            "is_airbnb_vrbo": False,
            "deposit_amount": 1200.0,
            "deposit_date": "2024-01-10",
            "monthly_rent": 1200.0,
            "deposit_return_date": "2024-12-20",
            "deposit_return_amount": 1150.0,
            "deposit_return_method": "Check"
        }
        
        success, tenant = self.run_test("Create Tenant with Deposit Return Fields", "POST", "tenants", 200, tenant_data)
        if success and 'id' in tenant:
            self.created_resources['tenants'].append(tenant['id'])
            
            # Check that deposit return fields are saved
            expected_fields = ['deposit_return_date', 'deposit_return_amount', 'deposit_return_method']
            missing_fields = []
            
            for field in expected_fields:
                if field not in tenant or tenant[field] is None:
                    missing_fields.append(field)
            
            if not missing_fields:
                print(f"   ✅ All deposit return fields saved correctly")
                print(f"   - Deposit Return Date: {tenant.get('deposit_return_date')}")
                print(f"   - Deposit Return Amount: {tenant.get('deposit_return_amount')}")  
                print(f"   - Deposit Return Method: {tenant.get('deposit_return_method')}")
            else:
                print(f"   ❌ Missing deposit return fields: {missing_fields}")
                
            # Test updating tenant with new deposit return info
            update_data = tenant_data.copy()
            update_data['deposit_return_amount'] = 1100.0
            update_data['deposit_return_method'] = "Zelle"
            
            success_update, updated_tenant = self.run_test("Update Tenant Deposit Return Fields", "PUT", f"tenants/{tenant['id']}", 200, update_data)
            if success_update:
                if updated_tenant.get('deposit_return_amount') == 1100.0 and updated_tenant.get('deposit_return_method') == "Zelle":
                    print(f"   ✅ Deposit return fields updated correctly")
                else:
                    print(f"   ❌ Deposit return fields not updated correctly")
                    
        return success

    def test_calendar_timeline_sorting(self):
        """Test calendar timeline endpoint returns properties sorted by building_id"""
        print("\n=== Testing Calendar Timeline Sorting ===")
        
        success, timeline = self.run_test("Get Calendar Timeline", "GET", "calendar/timeline", 200)
        if success and 'properties' in timeline:
            properties = timeline['properties']
            if len(properties) > 1:
                # Check building_id sorting
                building_ids = [p.get('building_id') for p in properties]
                print(f"   Timeline properties building_ids: {building_ids}")
                
                # Verify properties with building_id come first, sorted ascending
                has_id_props = [p for p in properties if p.get('building_id') is not None]
                no_id_props = [p for p in properties if p.get('building_id') is None]
                
                sorted_correctly = True
                
                # Check building_id properties are sorted ascending
                if len(has_id_props) >= 2:
                    for i in range(1, len(has_id_props)):
                        if has_id_props[i-1]['building_id'] > has_id_props[i]['building_id']:
                            sorted_correctly = False
                            break
                
                # Check units within properties are sorted numerically  
                for prop in properties:
                    units = prop.get('units', [])
                    if len(units) > 1:
                        unit_numbers = [u.get('unit_number', '') for u in units]
                        print(f"   Property '{prop.get('property_name')}' unit numbers: {unit_numbers}")
                        
                        # Try to parse as integers and check sorting
                        try:
                            unit_ints = []
                            for num in unit_numbers:
                                try:
                                    unit_ints.append(int(num))
                                except ValueError:
                                    unit_ints.append(float('inf'))  # Non-numeric go to end
                            
                            if unit_ints == sorted(unit_ints):
                                print(f"   ✅ Units sorted numerically in property")
                            else:
                                print(f"   ❌ Units NOT sorted numerically in property")
                                sorted_correctly = False
                        except:
                            pass  # Skip if can't parse
                
                if sorted_correctly:
                    print(f"   ✅ Timeline properties and units sorted correctly")
                else:
                    print(f"   ❌ Timeline sorting incorrect")
                    
        return success

    def test_basic_endpoints(self):
        """Test basic CRUD operations still work"""
        print("\n=== Testing Basic CRUD Operations ===")
        
        # Test dashboard
        success1, _ = self.run_test("Dashboard", "GET", "dashboard", 200)
        
        # Test notifications 
        success2, _ = self.run_test("Notifications", "GET", "notifications", 200)
        
        # Test leads
        success3, _ = self.run_test("Leads", "GET", "leads", 200)
        
        return success1 and success2 and success3

    def cleanup_resources(self):
        """Clean up created test resources"""
        print("\n=== Cleaning Up Test Resources ===")
        
        # Delete tenants first (they depend on units)
        for tenant_id in self.created_resources['tenants']:
            self.run_test(f"Delete Tenant {tenant_id}", "DELETE", f"tenants/{tenant_id}", 200)
        
        # Delete units (they depend on properties)  
        for unit_id in self.created_resources['units']:
            self.run_test(f"Delete Unit {unit_id}", "DELETE", f"units/{unit_id}", 200)
        
        # Delete properties last
        for property_id in self.created_resources['properties']:
            self.run_test(f"Delete Property {property_id}", "DELETE", f"properties/{property_id}", 200)

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Lease Tracker API Tests")
        print(f"Testing against: {self.base_url}")
        
        try:
            # Test basic functionality first
            basic_ok = self.test_basic_endpoints()
            
            # Test new features
            props_ok = self.test_properties_with_building_id()
            tenants_ok = self.test_tenant_deposit_return_fields() 
            timeline_ok = self.test_calendar_timeline_sorting()
            
            return basic_ok and props_ok and tenants_ok and timeline_ok
            
        finally:
            # Always cleanup
            self.cleanup_resources()

def main():
    """Main test runner"""
    tester = LeaseTrackerAPITester()
    
    try:
        all_passed = tester.run_all_tests()
        
        # Print results
        print(f"\n📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
        
        if all_passed and tester.tests_passed == tester.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("💥 Some tests failed!")
            return 1
            
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted")
        return 130
    except Exception as e:
        print(f"\n💥 Test runner error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())