#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Property Management System
Tests all CRUD operations, data validation, and calculation endpoints
"""

import requests
import sys
from datetime import datetime, date, timedelta
import json

class PropertyManagementTester:
    def __init__(self, base_url="https://tenant-income-system.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {
            'properties': [],
            'units': [],
            'tenants': [],
            'leads': [],
            'notifications': []
        }

    def log(self, message, status="INFO"):
        """Log test results"""
        print(f"[{status}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
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
                self.log(f"✅ PASSED - {name} - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                self.log(f"❌ FAILED - {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                try:
                    error_detail = response.json()
                    self.log(f"   Error: {error_detail}")
                except:
                    self.log(f"   Response text: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log(f"❌ FAILED - {name} - Error: {str(e)}", "FAIL")
            return False, {}

    def test_properties(self):
        """Test Properties CRUD operations"""
        self.log("\n=== TESTING PROPERTIES ===")
        
        # Test listing empty properties
        success, data = self.run_test(
            "List properties (empty)", "GET", "properties", 200
        )
        if success and isinstance(data, list):
            self.log(f"   Found {len(data)} existing properties")

        # Test creating property
        property_data = {
            "name": "Test Property 1",
            "address": "123 Test St, Test City, TC 12345",
            "owner_manager_name": "John Manager",
            "owner_manager_phone": "555-0123",
            "owner_manager_email": "john@test.com",
            "available_parking": "2 spots",
            "pets_permitted": True,
            "pet_notes": "Small dogs only",
            "building_amenities": ["Pool", "Gym", "Laundry"],
            "additional_notes": "Test property for API testing"
        }
        
        success, response = self.run_test(
            "Create property", "POST", "properties", 200, property_data
        )
        if success and 'id' in response:
            property_id = response['id']
            self.created_ids['properties'].append(property_id)
            self.log(f"   Created property ID: {property_id}")
            
            # Test getting specific property
            self.run_test(
                "Get property by ID", "GET", f"properties/{property_id}", 200
            )
            
            # Test updating property
            updated_data = property_data.copy()
            updated_data['name'] = "Updated Test Property 1"
            updated_data['pets_permitted'] = False
            
            self.run_test(
                "Update property", "PUT", f"properties/{property_id}", 200, updated_data
            )
        
        # Test invalid property creation (missing required fields)
        invalid_data = {"name": ""}
        self.run_test(
            "Create property (invalid - empty name)", "POST", "properties", 422, invalid_data
        )

    def test_units(self):
        """Test Units CRUD operations"""
        self.log("\n=== TESTING UNITS ===")
        
        if not self.created_ids['properties']:
            self.log("❌ Cannot test units - no properties created", "FAIL")
            return
        
        property_id = self.created_ids['properties'][0]
        
        # Test listing units
        self.run_test(
            "List units", "GET", "units", 200
        )
        
        # Test creating unit
        today = date.today()
        unit_data = {
            "property_id": property_id,
            "unit_number": "101",
            "unit_size": "2/1",
            "unit_size_custom": "",
            "base_rent": 1500.0,
            "additional_monthly_costs": [
                {"name": "Parking", "amount": 50.0},
                {"name": "Pet Fee", "amount": 25.0}
            ],
            "availability_start_date": today.isoformat(),
            "close_date": None
        }
        
        success, response = self.run_test(
            "Create unit", "POST", "units", 200, unit_data
        )
        if success and 'id' in response:
            unit_id = response['id']
            self.created_ids['units'].append(unit_id)
            self.log(f"   Created unit ID: {unit_id}")
            
            # Test getting specific unit
            self.run_test(
                "Get unit by ID", "GET", f"units/{unit_id}", 200
            )
            
            # Create second unit for testing
            unit_data2 = unit_data.copy()
            unit_data2['unit_number'] = "102"
            unit_data2['unit_size'] = "1/1"
            unit_data2['base_rent'] = 1200.0
            
            success, response = self.run_test(
                "Create second unit", "POST", "units", 200, unit_data2
            )
            if success and 'id' in response:
                self.created_ids['units'].append(response['id'])
        
        # Test invalid unit creation
        invalid_unit = {"property_id": "invalid_id", "unit_number": "", "base_rent": -100}
        self.run_test(
            "Create unit (invalid property_id)", "POST", "units", 404, invalid_unit
        )

    def test_tenants(self):
        """Test Tenants CRUD operations with date validation"""
        self.log("\n=== TESTING TENANTS ===")
        
        if not self.created_ids['units']:
            self.log("❌ Cannot test tenants - no units created", "FAIL")
            return
        
        unit_id = self.created_ids['units'][0]
        property_id = self.created_ids['properties'][0]
        
        # Test creating long-term tenant
        today = date.today()
        move_in = today + timedelta(days=1)
        move_out = today + timedelta(days=365)
        
        longterm_tenant_data = {
            "property_id": property_id,
            "unit_id": unit_id,
            "name": "John Tenant",
            "phone": "555-0456",
            "email": "john.tenant@email.com",
            "move_in_date": move_in.isoformat(),
            "move_out_date": move_out.isoformat(),
            "is_airbnb_vrbo": False,
            "deposit_amount": 1500.0,
            "deposit_date": move_in.isoformat(),
            "monthly_rent": 1500.0,
            "partial_first_month": None,
            "partial_last_month": None,
            "pets": "1 small dog",
            "parking": "Space #1",
            "notes": "Test long-term tenant",
            "total_rent": None
        }
        
        success, response = self.run_test(
            "Create long-term tenant", "POST", "tenants", 200, longterm_tenant_data
        )
        if success and 'id' in response:
            tenant_id = response['id']
            self.created_ids['tenants'].append(tenant_id)
            self.log(f"   Created long-term tenant ID: {tenant_id}")
        
        # Test creating Airbnb/VRBO tenant (different unit)
        if len(self.created_ids['units']) > 1:
            unit_id2 = self.created_ids['units'][1]
            airbnb_move_in = today + timedelta(days=30)
            airbnb_move_out = today + timedelta(days=37)  # 7 nights
            
            airbnb_tenant_data = {
                "property_id": property_id,
                "unit_id": unit_id2,
                "name": "Sarah Airbnb",
                "phone": "555-0789",
                "email": "sarah@email.com",
                "move_in_date": airbnb_move_in.isoformat(),
                "move_out_date": airbnb_move_out.isoformat(),
                "is_airbnb_vrbo": True,
                "deposit_amount": None,
                "deposit_date": None,
                "monthly_rent": None,
                "partial_first_month": None,
                "partial_last_month": None,
                "pets": "",
                "parking": "",
                "notes": "Test Airbnb guest",
                "total_rent": 840.0  # 7 nights at $120/night
            }
            
            success, response = self.run_test(
                "Create Airbnb tenant", "POST", "tenants", 200, airbnb_tenant_data
            )
            if success and 'id' in response:
                self.created_ids['tenants'].append(response['id'])
                # Check if breakdown was calculated
                if 'total_nights' in response:
                    self.log(f"   Airbnb breakdown: {response['total_nights']} nights at ${response['rent_per_night']}/night")

        # Test date validation - overlapping dates
        if self.created_ids['tenants']:
            overlapping_tenant = longterm_tenant_data.copy()
            overlapping_tenant['name'] = "Overlapping Tenant"
            overlapping_tenant['move_in_date'] = (move_in + timedelta(days=30)).isoformat()
            overlapping_tenant['move_out_date'] = (move_out + timedelta(days=30)).isoformat()
            
            self.run_test(
                "Create tenant (overlapping dates)", "POST", "tenants", 400, overlapping_tenant
            )

    def test_leads(self):
        """Test Leads CRUD operations and stage management"""
        self.log("\n=== TESTING LEADS ===")
        
        # Test lead stages endpoint
        self.run_test(
            "Get lead stages", "GET", "lead-stages", 200
        )
        
        # Test creating lead
        today = date.today()
        lead_data = {
            "name": "Jane Prospect",
            "source": "Website",
            "phone": "555-0321",
            "email": "jane@prospect.com",
            "desired_start_date": (today + timedelta(days=60)).isoformat(),
            "desired_end_date": (today + timedelta(days=425)).isoformat(),
            "potential_unit_ids": self.created_ids['units'][:1] if self.created_ids['units'] else [],
            "pets": "1 cat",
            "parking_request": "1 space",
            "lead_strength": 3,
            "progress_stage": 1,
            "showing_date": None,
            "converted_to_tenant": False,
            "tenant_id": None
        }
        
        success, response = self.run_test(
            "Create lead", "POST", "leads", 200, lead_data
        )
        if success and 'id' in response:
            lead_id = response['id']
            self.created_ids['leads'].append(lead_id)
            self.log(f"   Created lead ID: {lead_id}")
            
            # Test advancing to stage 2 (should require showing_date)
            advanced_lead = lead_data.copy()
            advanced_lead['progress_stage'] = 2
            advanced_lead['showing_date'] = (today + timedelta(days=7)).isoformat() + "T14:00"
            
            self.run_test(
                "Advance lead to stage 2", "PUT", f"leads/{lead_id}", 200, advanced_lead
            )

    def test_notifications(self):
        """Test Notifications CRUD operations"""
        self.log("\n=== TESTING NOTIFICATIONS ===")
        
        # Test listing notifications
        self.run_test(
            "List notifications", "GET", "notifications", 200
        )
        
        if self.created_ids['leads']:
            lead_id = self.created_ids['leads'][0]
            
            # Test creating notification
            notification_data = {
                "lead_id": lead_id,
                "lead_name": "Jane Prospect",
                "stage_name": "Showing Set",
                "notification_date": (date.today() + timedelta(days=1)).isoformat(),
                "message": "Follow up on showing for Jane Prospect"
            }
            
            success, response = self.run_test(
                "Create notification", "POST", "notifications", 200, notification_data
            )
            if success and 'id' in response:
                notif_id = response['id']
                self.created_ids['notifications'].append(notif_id)
                
                # Test marking as read
                self.run_test(
                    "Mark notification as read", "PUT", f"notifications/{notif_id}/read", 200
                )
                
                # Test marking as unread
                self.run_test(
                    "Mark notification as unread", "PUT", f"notifications/{notif_id}/unread", 200
                )

    def test_calculations(self):
        """Test calculation endpoints (Income, Vacancy, Calendar)"""
        self.log("\n=== TESTING CALCULATION ENDPOINTS ===")
        
        current_year = datetime.now().year
        
        # Test income calculations
        success, income_data = self.run_test(
            "Get income data", "GET", "income", 200, params={"year": current_year}
        )
        if success:
            self.log(f"   Income data: Yearly total: ${income_data.get('yearly_total', 0)}")
        
        # Test vacancy calculations
        success, vacancy_data = self.run_test(
            "Get vacancy data", "GET", "vacancy", 200, params={"year": current_year}
        )
        if success:
            self.log(f"   Vacancy data: {len(vacancy_data.get('by_building', []))} buildings")
        
        # Test calendar data
        success, calendar_data = self.run_test(
            "Get calendar data", "GET", "calendar", 200, params={"year": current_year}
        )
        if success:
            self.log(f"   Calendar data: {len(calendar_data.get('properties', []))} properties")
        
        # Test available units
        today = date.today()
        start_date = today + timedelta(days=30)
        end_date = today + timedelta(days=37)
        
        success, available_units = self.run_test(
            "Get available units", "GET", "available-units", 200, 
            params={"start_date": start_date.isoformat(), "end_date": end_date.isoformat()}
        )
        if success:
            self.log(f"   Available units: {len(available_units)} units available")

    def test_dashboard(self):
        """Test dashboard summary endpoint"""
        self.log("\n=== TESTING DASHBOARD ===")
        
        success, dashboard_data = self.run_test(
            "Get dashboard summary", "GET", "dashboard", 200
        )
        if success:
            self.log(f"   Dashboard: {dashboard_data.get('properties_count', 0)} properties, "
                    f"{dashboard_data.get('units_count', 0)} units, "
                    f"{dashboard_data.get('tenants_count', 0)} tenants, "
                    f"{dashboard_data.get('leads_count', 0)} leads")

    def cleanup_test_data(self):
        """Clean up created test data"""
        self.log("\n=== CLEANING UP TEST DATA ===")
        
        # Delete in reverse order of dependencies
        for notif_id in self.created_ids['notifications']:
            self.run_test(f"Delete notification {notif_id}", "DELETE", f"notifications/{notif_id}", 200)
        
        for lead_id in self.created_ids['leads']:
            self.run_test(f"Delete lead {lead_id}", "DELETE", f"leads/{lead_id}", 200)
        
        for tenant_id in self.created_ids['tenants']:
            self.run_test(f"Delete tenant {tenant_id}", "DELETE", f"tenants/{tenant_id}", 200)
        
        for unit_id in self.created_ids['units']:
            self.run_test(f"Delete unit {unit_id}", "DELETE", f"units/{unit_id}", 200)
        
        for property_id in self.created_ids['properties']:
            self.run_test(f"Delete property {property_id}", "DELETE", f"properties/{property_id}", 200)

    def run_all_tests(self):
        """Run all test suites"""
        self.log("🚀 Starting Property Management System Backend API Tests")
        self.log(f"Base URL: {self.base_url}")
        self.log(f"API URL: {self.api_url}")
        
        try:
            # Run test suites in order
            self.test_properties()
            self.test_units()
            self.test_tenants()
            self.test_leads()
            self.test_notifications()
            self.test_calculations()
            self.test_dashboard()
            
        finally:
            # Always cleanup
            self.cleanup_test_data()
        
        # Print summary
        self.log(f"\n📊 Test Summary:")
        self.log(f"   Tests Run: {self.tests_run}")
        self.log(f"   Tests Passed: {self.tests_passed}")
        self.log(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        self.log(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "   Success Rate: 0%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution function"""
    tester = PropertyManagementTester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n🛑 Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Test execution failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())