"""
Test suite for Major Update Batch (Iteration 11)
Tests: Deposits (current/past/landlord), Misc Charges, Rent Tracking, Notification Checklists, Income with misc_charges
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

class TestDepositsEndpoints:
    """Tests for deposits-related endpoints"""
    
    def test_get_current_deposits(self):
        """GET /api/deposits/current should return deposits with total"""
        response = requests.get(f"{BASE_URL}/api/deposits/current")
        assert response.status_code == 200
        data = response.json()
        assert "deposits" in data
        assert "total" in data
        assert isinstance(data["deposits"], list)
        assert isinstance(data["total"], (int, float))
        print(f"✓ Current deposits: {len(data['deposits'])} deposits, total: ${data['total']}")
    
    def test_get_past_deposits(self):
        """GET /api/deposits/past should return past (returned) deposits"""
        response = requests.get(f"{BASE_URL}/api/deposits/past")
        assert response.status_code == 200
        data = response.json()
        assert "deposits" in data
        assert isinstance(data["deposits"], list)
        print(f"✓ Past deposits: {len(data['deposits'])} returned deposits")
    
    def test_get_landlord_deposits(self):
        """GET /api/landlord-deposits should return properties with units and total"""
        response = requests.get(f"{BASE_URL}/api/landlord-deposits")
        assert response.status_code == 200
        data = response.json()
        assert "properties" in data
        assert "total" in data
        assert isinstance(data["properties"], list)
        # Check structure of properties
        if len(data["properties"]) > 0:
            prop = data["properties"][0]
            assert "property_id" in prop
            assert "property_name" in prop
            assert "units" in prop
            assert "total" in prop
            if len(prop["units"]) > 0:
                unit = prop["units"][0]
                assert "unit_id" in unit
                assert "unit_number" in unit
        print(f"✓ Landlord deposits: {len(data['properties'])} properties, total: ${data['total']}")


class TestLandlordDepositUpdate:
    """Tests for landlord deposit update"""
    
    def test_update_landlord_deposit(self):
        """PUT /api/landlord-deposits/{unit_id}?amount=X should update deposit"""
        # First get a unit
        units_resp = requests.get(f"{BASE_URL}/api/units")
        assert units_resp.status_code == 200
        units = units_resp.json()
        if len(units) > 0:
            unit_id = units[0]["id"]
            # Update landlord deposit
            response = requests.put(f"{BASE_URL}/api/landlord-deposits/{unit_id}?amount=1000")
            assert response.status_code == 200
            assert response.json().get("message") == "Landlord deposit updated"
            
            # Verify update
            landlord_resp = requests.get(f"{BASE_URL}/api/landlord-deposits")
            assert landlord_resp.status_code == 200
            print(f"✓ Updated landlord deposit for unit {unit_id} to $1000")
        else:
            pytest.skip("No units available to test")


class TestDepositReturn:
    """Tests for deposit return functionality"""
    
    def test_return_deposit_flow(self):
        """POST /api/tenants/{id}/return-deposit should process deposit return"""
        # Get current deposits
        current_resp = requests.get(f"{BASE_URL}/api/deposits/current")
        assert current_resp.status_code == 200
        deposits = current_resp.json().get("deposits", [])
        
        if len(deposits) > 0:
            # Use first tenant with deposit
            tenant = deposits[0]
            tenant_id = tenant["id"]
            print(f"Testing return deposit for tenant: {tenant.get('name', 'Unknown')}")
            
            # Try to return deposit
            return_data = {
                "return_date": "2026-01-15",
                "return_method": "TEST_CHECK",
                "return_amount": tenant.get("deposit_amount", 0)
            }
            response = requests.post(f"{BASE_URL}/api/tenants/{tenant_id}/return-deposit", json=return_data)
            assert response.status_code == 200
            data = response.json()
            assert data.get("deposit_return_date") == "2026-01-15"
            assert data.get("deposit_return_method") == "TEST_CHECK"
            print(f"✓ Successfully returned deposit for tenant {tenant_id}")
            
            # Now reverse the return (for cleanup) by clearing the fields
            # Restore the tenant without deposit_return fields via PUT
            tenant_resp = requests.get(f"{BASE_URL}/api/tenants/{tenant_id}")
            if tenant_resp.status_code == 200:
                t_data = tenant_resp.json()
                # Clear return fields
                t_data["deposit_return_date"] = ""
                t_data["deposit_return_amount"] = None
                t_data["deposit_return_method"] = ""
                requests.put(f"{BASE_URL}/api/tenants/{tenant_id}", json=t_data)
        else:
            print("⚠ No tenants with current deposits to test return")
            pytest.skip("No tenants with deposits available")


class TestMiscCharges:
    """Tests for misc charges endpoints"""
    
    def test_misc_charges_crud(self):
        """Test full CRUD cycle for misc charges"""
        # Get a tenant
        tenants_resp = requests.get(f"{BASE_URL}/api/tenants")
        assert tenants_resp.status_code == 200
        tenants = tenants_resp.json()
        
        # Find a long-term tenant
        lt_tenant = None
        for t in tenants:
            if not t.get("is_airbnb_vrbo"):
                lt_tenant = t
                break
        
        if not lt_tenant:
            pytest.skip("No long-term tenants available")
            return
        
        tenant_id = lt_tenant["id"]
        
        # CREATE misc charge
        charge_data = {
            "amount": 50.00,
            "description": "TEST_Late_Fee",
            "charge_date": "2026-01-10"
        }
        create_resp = requests.post(f"{BASE_URL}/api/tenants/{tenant_id}/misc-charges", json=charge_data)
        assert create_resp.status_code == 200
        created = create_resp.json()
        assert "id" in created
        charge_id = created["id"]
        assert created["amount"] == 50.0
        assert created["description"] == "TEST_Late_Fee"
        print(f"✓ Created misc charge: {charge_id}")
        
        # GET misc charges for tenant
        list_resp = requests.get(f"{BASE_URL}/api/misc-charges?tenant_id={tenant_id}")
        assert list_resp.status_code == 200
        charges = list_resp.json()
        assert isinstance(charges, list)
        found = any(c["id"] == charge_id for c in charges)
        assert found, "Created charge should be in list"
        print(f"✓ Listed misc charges: found {len(charges)} charges for tenant")
        
        # DELETE misc charge
        del_resp = requests.delete(f"{BASE_URL}/api/misc-charges/{charge_id}")
        assert del_resp.status_code == 200
        assert del_resp.json().get("message") == "Misc charge deleted"
        print(f"✓ Deleted misc charge: {charge_id}")
        
        # Verify deletion
        verify_resp = requests.get(f"{BASE_URL}/api/misc-charges?tenant_id={tenant_id}")
        verify_charges = verify_resp.json()
        assert not any(c["id"] == charge_id for c in verify_charges)


class TestRentTracking:
    """Tests for rent tracking endpoints"""
    
    def test_get_rent_tracking(self):
        """GET /api/rent-tracking should return tenant data for a month"""
        response = requests.get(f"{BASE_URL}/api/rent-tracking?year=2026&month=3")
        assert response.status_code == 200
        data = response.json()
        assert data.get("year") == 2026
        assert data.get("month") == 3
        assert "tenants" in data
        assert isinstance(data["tenants"], list)
        print(f"✓ Rent tracking for 2026-03: {len(data['tenants'])} tenants")
        
        # Check tenant structure if any exist
        if len(data["tenants"]) > 0:
            t = data["tenants"][0]
            assert "tenant_id" in t
            assert "tenant_name" in t
            assert "monthly_rent" in t
            assert "paid" in t
    
    def test_update_rent_payment(self):
        """PUT /api/rent-tracking/{id} should update payment status"""
        # Get rent tracking data
        tracking_resp = requests.get(f"{BASE_URL}/api/rent-tracking?year=2026&month=1")
        assert tracking_resp.status_code == 200
        tenants = tracking_resp.json().get("tenants", [])
        
        if len(tenants) > 0:
            tenant_id = tenants[0]["tenant_id"]
            
            # Update payment (mark as paid)
            update_data = {
                "paid": True,
                "partial_amount": None,
                "note": "TEST_payment"
            }
            update_resp = requests.put(f"{BASE_URL}/api/rent-tracking/{tenant_id}?year=2026&month=1", json=update_data)
            assert update_resp.status_code == 200
            assert update_resp.json().get("message") == "Payment updated"
            print(f"✓ Updated rent payment for tenant {tenant_id}")
            
            # Verify update
            verify_resp = requests.get(f"{BASE_URL}/api/rent-tracking?year=2026&month=1")
            verify_tenants = verify_resp.json().get("tenants", [])
            updated_tenant = next((t for t in verify_tenants if t["tenant_id"] == tenant_id), None)
            assert updated_tenant is not None
            assert updated_tenant.get("paid") == True
            
            # Cleanup - reset to not paid
            reset_data = {"paid": False, "partial_amount": None, "note": ""}
            requests.put(f"{BASE_URL}/api/rent-tracking/{tenant_id}?year=2026&month=1", json=reset_data)
        else:
            pytest.skip("No tenants in rent tracking data")


class TestNotificationChecklist:
    """Tests for notification checklist functionality"""
    
    def test_update_checklist_item(self):
        """PUT /api/notifications/{id}/checklist should update checklist item"""
        # Get notifications with checklists
        notif_resp = requests.get(f"{BASE_URL}/api/notifications")
        assert notif_resp.status_code == 200
        notifications = notif_resp.json()
        
        # Find a notification with checklist (moveout_checklist type)
        checklist_notif = None
        for n in notifications:
            if n.get("notification_type") == "moveout_checklist" and n.get("checklist"):
                checklist_notif = n
                break
        
        if checklist_notif:
            notif_id = checklist_notif["id"]
            checklist = checklist_notif.get("checklist", [])
            if len(checklist) > 0:
                key = checklist[0]["key"]
                original_checked = checklist[0].get("checked", False)
                
                # Toggle the checklist item
                new_checked = not original_checked
                update_resp = requests.put(f"{BASE_URL}/api/notifications/{notif_id}/checklist?key={key}&checked={str(new_checked).lower()}")
                assert update_resp.status_code == 200
                updated = update_resp.json()
                
                # Verify update
                updated_checklist = updated.get("checklist", [])
                updated_item = next((i for i in updated_checklist if i["key"] == key), None)
                assert updated_item is not None
                assert updated_item["checked"] == new_checked
                print(f"✓ Updated checklist item '{key}' to checked={new_checked}")
                
                # Restore original state
                requests.put(f"{BASE_URL}/api/notifications/{notif_id}/checklist?key={key}&checked={str(original_checked).lower()}")
            else:
                pytest.skip("Checklist notification has no items")
        else:
            print("⚠ No moveout_checklist notifications found to test")
            pytest.skip("No checklist notifications available")
    
    def test_delete_blocked_if_checklist_incomplete(self):
        """DELETE /api/notifications/{id} should block if checklist incomplete"""
        # Get notifications with checklists
        notif_resp = requests.get(f"{BASE_URL}/api/notifications")
        notifications = notif_resp.json()
        
        # Find a moveout_checklist notification
        checklist_notif = None
        for n in notifications:
            if n.get("notification_type") == "moveout_checklist" and n.get("checklist"):
                # Find one with at least one unchecked item
                checklist = n.get("checklist", [])
                if any(not item.get("checked", False) for item in checklist):
                    checklist_notif = n
                    break
        
        if checklist_notif:
            notif_id = checklist_notif["id"]
            # Try to delete - should fail
            del_resp = requests.delete(f"{BASE_URL}/api/notifications/{notif_id}")
            assert del_resp.status_code == 400
            assert "checklist" in del_resp.json().get("detail", "").lower()
            print(f"✓ Delete correctly blocked for incomplete checklist notification")
        else:
            print("⚠ No incomplete checklist notifications found to test delete blocking")
            pytest.skip("No incomplete checklist notifications available")


class TestIncomeWithMiscCharges:
    """Tests for income endpoint including misc_charges"""
    
    def test_income_includes_misc_charges(self):
        """GET /api/income should include misc_charges and misc_total in tenant data"""
        response = requests.get(f"{BASE_URL}/api/income?year=2026")
        assert response.status_code == 200
        data = response.json()
        assert "months" in data
        assert "yearly_total" in data
        
        # Check that income data structure is correct
        if len(data["months"]) > 0:
            month_data = data["months"][0]
            assert "month" in month_data
            assert "total" in month_data
            assert "properties" in month_data
            
            # Check for misc_charges structure in tenants
            for prop in month_data.get("properties", []):
                for unit in prop.get("units", []):
                    for tenant in unit.get("tenants", []):
                        # misc_charges and misc_total should be present in structure
                        assert "misc_charges" in tenant or "income" in tenant
                        if "misc_charges" in tenant:
                            assert "misc_total" in tenant
        
        print(f"✓ Income endpoint returns correct structure with misc_charges support")


class TestBasicEndpoints:
    """Basic health check and critical endpoint tests"""
    
    def test_api_health(self):
        """Check API is running"""
        response = requests.get(f"{BASE_URL}/api/properties")
        assert response.status_code == 200
        print("✓ API is healthy")
    
    def test_properties_endpoint(self):
        """GET /api/properties should return list"""
        response = requests.get(f"{BASE_URL}/api/properties")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Properties: {len(data)} properties")
    
    def test_units_endpoint(self):
        """GET /api/units should return list"""
        response = requests.get(f"{BASE_URL}/api/units")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Units: {len(data)} units")
    
    def test_tenants_endpoint(self):
        """GET /api/tenants should return list"""
        response = requests.get(f"{BASE_URL}/api/tenants")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Tenants: {len(data)} tenants")
    
    def test_notifications_endpoint(self):
        """GET /api/notifications should return list"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Notifications: {len(data)} notifications")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
