"""
Test suite for Public Listings and Password Gate features
- GET /api/public/listings - returns all active units
- GET /api/public/listings/{unit_id}/availability - returns 6 months availability
- POST /api/auth/verify-password - verifies password
- POST /api/public/admin/pricing - saves pricing with password protection
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
CORRECT_PASSWORD = "emergeontop"
WRONG_PASSWORD = "wrongpassword"


class TestPasswordVerification:
    """Test password verification endpoint"""
    
    def test_verify_correct_password(self):
        """POST /api/auth/verify-password with correct password returns valid=true"""
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-password",
            json={"password": CORRECT_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "valid" in data
        assert data["valid"] == True
        print(f"✓ Correct password verification passed: {data}")
    
    def test_verify_wrong_password(self):
        """POST /api/auth/verify-password with wrong password returns valid=false"""
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-password",
            json={"password": WRONG_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "valid" in data
        assert data["valid"] == False
        print(f"✓ Wrong password verification passed: {data}")
    
    def test_verify_empty_password(self):
        """POST /api/auth/verify-password with empty password returns valid=false"""
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-password",
            json={"password": ""}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == False
        print(f"✓ Empty password verification passed: {data}")


class TestPublicListings:
    """Test public listings endpoint"""
    
    def test_get_public_listings(self):
        """GET /api/public/listings returns list of active units"""
        response = requests.get(f"{BASE_URL}/api/public/listings")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} listings")
        
        # Verify structure of listings if any exist
        if len(data) > 0:
            listing = data[0]
            assert "id" in listing
            assert "title" in listing
            assert "property_name" in listing
            print(f"✓ First listing: {listing['title']}")
            
            # Check for expected fields
            expected_fields = ['id', 'title', 'property_name', 'unit_number', 'unit_size', 'pricing']
            for field in expected_fields:
                assert field in listing, f"Missing field: {field}"
            print(f"✓ All expected fields present in listing")
    
    def test_listings_have_pricing_info(self):
        """Listings should include pricing array"""
        response = requests.get(f"{BASE_URL}/api/public/listings")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            listing = data[0]
            assert "pricing" in listing
            assert isinstance(listing["pricing"], list)
            print(f"✓ Listing has pricing array with {len(listing['pricing'])} entries")
            
            # Check current_price field
            assert "current_price" in listing
            print(f"✓ Listing has current_price: {listing['current_price']}")


class TestListingAvailability:
    """Test listing availability endpoint"""
    
    @pytest.fixture
    def unit_id(self):
        """Get a valid unit ID from listings"""
        response = requests.get(f"{BASE_URL}/api/public/listings")
        data = response.json()
        if len(data) > 0:
            return data[0]["id"]
        pytest.skip("No listings available to test availability")
    
    def test_get_availability_valid_unit(self, unit_id):
        """GET /api/public/listings/{unit_id}/availability returns 6 months data"""
        response = requests.get(f"{BASE_URL}/api/public/listings/{unit_id}/availability")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "unit_id" in data
        assert "title" in data
        assert "months" in data
        assert isinstance(data["months"], list)
        assert len(data["months"]) == 6, f"Expected 6 months, got {len(data['months'])}"
        print(f"✓ Got availability for {data['title']}")
        
        # Verify month structure
        month = data["months"][0]
        assert "year" in month
        assert "month" in month
        assert "days" in month
        assert "price" in month
        print(f"✓ First month: {month['year']}-{month['month']} with {len(month['days'])} days")
        
        # Verify day structure
        day = month["days"][0]
        assert "day" in day
        assert "status" in day
        assert day["status"] in ["available", "occupied", "past"]
        print(f"✓ Day structure valid: day={day['day']}, status={day['status']}")
    
    def test_get_availability_invalid_unit(self):
        """GET /api/public/listings/{invalid_id}/availability returns 404"""
        response = requests.get(f"{BASE_URL}/api/public/listings/000000000000000000000000/availability")
        assert response.status_code == 404
        print("✓ Invalid unit returns 404")


class TestAdminPricing:
    """Test admin pricing endpoint with password protection"""
    
    @pytest.fixture
    def unit_id(self):
        """Get a valid unit ID from listings"""
        response = requests.get(f"{BASE_URL}/api/public/listings")
        data = response.json()
        if len(data) > 0:
            return data[0]["id"]
        pytest.skip("No listings available to test pricing")
    
    def test_save_pricing_with_correct_password(self, unit_id):
        """POST /api/public/admin/pricing with correct password saves pricing"""
        response = requests.post(
            f"{BASE_URL}/api/public/admin/pricing",
            json={
                "password": CORRECT_PASSWORD,
                "unit_id": unit_id,
                "entries": [
                    {"year": 2026, "month": 5, "price": 3000},
                    {"year": 2026, "month": 6, "price": 3100}
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Pricing saved: {data}")
        
        # Verify pricing was saved by checking availability
        avail_response = requests.get(f"{BASE_URL}/api/public/listings/{unit_id}/availability")
        avail_data = avail_response.json()
        
        # Find May 2026 in the months
        may_found = False
        for month in avail_data["months"]:
            if month["year"] == 2026 and month["month"] == 5:
                assert month["price"] == 3000
                may_found = True
                print(f"✓ Verified May 2026 price: ${month['price']}")
                break
        
        if not may_found:
            print("Note: May 2026 not in 6-month window, skipping verification")
    
    def test_save_pricing_with_wrong_password(self, unit_id):
        """POST /api/public/admin/pricing with wrong password returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/public/admin/pricing",
            json={
                "password": WRONG_PASSWORD,
                "unit_id": unit_id,
                "entries": [
                    {"year": 2026, "month": 7, "price": 3200}
                ]
            }
        )
        assert response.status_code == 401
        print("✓ Wrong password returns 401")
    
    def test_save_pricing_missing_unit_id(self):
        """POST /api/public/admin/pricing without unit_id returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/public/admin/pricing",
            json={
                "password": CORRECT_PASSWORD,
                "entries": [
                    {"year": 2026, "month": 7, "price": 3200}
                ]
            }
        )
        assert response.status_code == 400
        print("✓ Missing unit_id returns 400")
    
    def test_save_pricing_missing_entries(self, unit_id):
        """POST /api/public/admin/pricing without entries returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/public/admin/pricing",
            json={
                "password": CORRECT_PASSWORD,
                "unit_id": unit_id,
                "entries": []
            }
        )
        assert response.status_code == 400
        print("✓ Empty entries returns 400")
    
    def test_get_all_pricing(self):
        """GET /api/public/admin/pricing returns all pricing entries"""
        response = requests.get(f"{BASE_URL}/api/public/admin/pricing")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} pricing entries")
        
        if len(data) > 0:
            entry = data[0]
            assert "unit_id" in entry
            assert "year" in entry
            assert "month" in entry
            assert "price" in entry
            print(f"✓ Pricing entry structure valid")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
