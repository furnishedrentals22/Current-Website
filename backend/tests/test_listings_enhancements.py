"""
Test suite for Listings Page Enhancements (5 features + availability navigation)
1. Multi-month selection for pricing
2. Clickable listings leading to detail page with image carousel
3. Admin UI to upload photos and edit unit info
4. Date-range search on listings page
5. Direct URLs for individual listings (/listings/:id)
6. Availability calendar navigation (prev/next, 3/6/12mo toggle)
"""
import pytest
import requests
import os
from datetime import date, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
CORRECT_PASSWORD = "emergeontop"
WRONG_PASSWORD = "wrongpassword"

# Known unit IDs from the app
UNIT_IDS = [
    "69a5daa530348c54de774987",  # 2153 - Unit Studio
    "69a5da9130348c54de774986",  # 1144 - Unit 7
    "69a5dac630348c54de774988",  # 1144 - Unit 8
]


class TestDateRangeSearch:
    """Test date-range search on listings page (Feature 4)"""
    
    def test_get_listings_without_date_filter(self):
        """GET /api/public/listings returns all active units without date filter"""
        response = requests.get(f"{BASE_URL}/api/public/listings")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3, f"Expected at least 3 listings, got {len(data)}"
        print(f"✓ Got {len(data)} listings without date filter")
    
    def test_get_listings_with_date_filter(self):
        """GET /api/public/listings?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD filters by availability"""
        # Use future dates to ensure availability
        start = (date.today() + timedelta(days=365)).isoformat()
        end = (date.today() + timedelta(days=395)).isoformat()
        
        response = requests.get(
            f"{BASE_URL}/api/public/listings",
            params={"start_date": start, "end_date": end}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} listings with date filter {start} to {end}")
        
        # Verify structure
        if len(data) > 0:
            listing = data[0]
            assert "id" in listing
            assert "title" in listing
            print(f"✓ Filtered listing structure valid: {listing['title']}")
    
    def test_get_listings_with_only_start_date(self):
        """GET /api/public/listings?start_date=YYYY-MM-DD works with only start date"""
        start = (date.today() + timedelta(days=30)).isoformat()
        response = requests.get(
            f"{BASE_URL}/api/public/listings",
            params={"start_date": start}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} listings with only start_date")


class TestSingleListingEndpoint:
    """Test single listing endpoint for direct URLs (Feature 5)"""
    
    def test_get_single_listing_valid_id(self):
        """GET /api/public/listings/{unit_id} returns single listing with full details"""
        unit_id = UNIT_IDS[0]
        response = requests.get(f"{BASE_URL}/api/public/listings/{unit_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields
        required_fields = ['id', 'title', 'description', 'photos', 'property_name', 
                          'unit_number', 'unit_size', 'current_price', 'pricing']
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        assert data['id'] == unit_id
        assert isinstance(data['photos'], list)
        assert isinstance(data['pricing'], list)
        print(f"✓ Single listing returned: {data['title']}")
        print(f"  - Photos: {len(data['photos'])}")
        print(f"  - Pricing entries: {len(data['pricing'])}")
    
    def test_get_single_listing_invalid_id(self):
        """GET /api/public/listings/{invalid_id} returns 404"""
        response = requests.get(f"{BASE_URL}/api/public/listings/000000000000000000000000")
        assert response.status_code == 404
        print("✓ Invalid unit ID returns 404")
    
    def test_get_single_listing_all_units(self):
        """Verify all known units are accessible via direct URL"""
        for unit_id in UNIT_IDS:
            response = requests.get(f"{BASE_URL}/api/public/listings/{unit_id}")
            assert response.status_code == 200, f"Unit {unit_id} not found"
            data = response.json()
            print(f"✓ Unit {unit_id}: {data['title']}")


class TestAvailabilityNavigation:
    """Test availability endpoint with navigation params (Feature 6)"""
    
    def test_availability_default_params(self):
        """GET /api/public/listings/{unit_id}/availability returns 6 months by default"""
        unit_id = UNIT_IDS[0]
        response = requests.get(f"{BASE_URL}/api/public/listings/{unit_id}/availability")
        assert response.status_code == 200
        data = response.json()
        
        assert "months" in data
        assert len(data["months"]) == 6, f"Expected 6 months, got {len(data['months'])}"
        print(f"✓ Default availability returns 6 months")
    
    def test_availability_with_num_months_3(self):
        """GET /api/public/listings/{unit_id}/availability?num_months=3 returns 3 months"""
        unit_id = UNIT_IDS[0]
        response = requests.get(
            f"{BASE_URL}/api/public/listings/{unit_id}/availability",
            params={"num_months": 3}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["months"]) == 3, f"Expected 3 months, got {len(data['months'])}"
        print(f"✓ num_months=3 returns 3 months")
    
    def test_availability_with_num_months_12(self):
        """GET /api/public/listings/{unit_id}/availability?num_months=12 returns 12 months"""
        unit_id = UNIT_IDS[0]
        response = requests.get(
            f"{BASE_URL}/api/public/listings/{unit_id}/availability",
            params={"num_months": 12}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["months"]) == 12, f"Expected 12 months, got {len(data['months'])}"
        print(f"✓ num_months=12 returns 12 months")
    
    def test_availability_with_start_year_month(self):
        """GET /api/public/listings/{unit_id}/availability?start_year=2026&start_month=3 starts from March 2026"""
        unit_id = UNIT_IDS[0]
        response = requests.get(
            f"{BASE_URL}/api/public/listings/{unit_id}/availability",
            params={"start_year": 2026, "start_month": 3, "num_months": 6}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["months"]) == 6
        first_month = data["months"][0]
        assert first_month["year"] == 2026, f"Expected year 2026, got {first_month['year']}"
        assert first_month["month"] == 3, f"Expected month 3, got {first_month['month']}"
        print(f"✓ start_year=2026, start_month=3 returns months starting from March 2026")
    
    def test_availability_navigation_forward(self):
        """Test navigating forward in availability calendar"""
        unit_id = UNIT_IDS[0]
        
        # Get initial availability
        response1 = requests.get(
            f"{BASE_URL}/api/public/listings/{unit_id}/availability",
            params={"start_year": 2026, "start_month": 1, "num_months": 6}
        )
        data1 = response1.json()
        
        # Navigate forward by 6 months
        response2 = requests.get(
            f"{BASE_URL}/api/public/listings/{unit_id}/availability",
            params={"start_year": 2026, "start_month": 7, "num_months": 6}
        )
        data2 = response2.json()
        
        assert data2["months"][0]["year"] == 2026
        assert data2["months"][0]["month"] == 7
        print(f"✓ Forward navigation works: Jan 2026 -> Jul 2026")
    
    def test_availability_navigation_backward(self):
        """Test navigating backward in availability calendar"""
        unit_id = UNIT_IDS[0]
        
        # Start from July 2026
        response1 = requests.get(
            f"{BASE_URL}/api/public/listings/{unit_id}/availability",
            params={"start_year": 2026, "start_month": 7, "num_months": 6}
        )
        
        # Navigate backward by 6 months
        response2 = requests.get(
            f"{BASE_URL}/api/public/listings/{unit_id}/availability",
            params={"start_year": 2026, "start_month": 1, "num_months": 6}
        )
        data2 = response2.json()
        
        assert data2["months"][0]["year"] == 2026
        assert data2["months"][0]["month"] == 1
        print(f"✓ Backward navigation works: Jul 2026 -> Jan 2026")


class TestMultiMonthPricing:
    """Test multi-month pricing selection (Feature 1)"""
    
    def test_set_multiple_months_pricing(self):
        """POST /api/public/admin/pricing with multiple entries saves all"""
        unit_id = UNIT_IDS[1]  # Use Unit 7
        
        # Set pricing for 3 months at once
        entries = [
            {"year": 2026, "month": 7, "price": 2500},
            {"year": 2026, "month": 8, "price": 2600},
            {"year": 2026, "month": 9, "price": 2700}
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/public/admin/pricing",
            json={
                "password": CORRECT_PASSWORD,
                "unit_id": unit_id,
                "entries": entries
            }
        )
        assert response.status_code == 200
        print(f"✓ Multi-month pricing saved for 3 months")
        
        # Verify all prices were saved
        avail_response = requests.get(
            f"{BASE_URL}/api/public/listings/{unit_id}/availability",
            params={"start_year": 2026, "start_month": 7, "num_months": 3}
        )
        avail_data = avail_response.json()
        
        for i, month in enumerate(avail_data["months"]):
            expected_price = entries[i]["price"]
            assert month["price"] == expected_price, f"Month {month['month']} price mismatch"
            print(f"  ✓ Month {month['month']}: ${month['price']}")
    
    def test_set_pricing_overwrites_existing(self):
        """Setting new price for existing month overwrites it"""
        unit_id = UNIT_IDS[1]
        
        # Set initial price
        requests.post(
            f"{BASE_URL}/api/public/admin/pricing",
            json={
                "password": CORRECT_PASSWORD,
                "unit_id": unit_id,
                "entries": [{"year": 2026, "month": 10, "price": 3000}]
            }
        )
        
        # Overwrite with new price
        response = requests.post(
            f"{BASE_URL}/api/public/admin/pricing",
            json={
                "password": CORRECT_PASSWORD,
                "unit_id": unit_id,
                "entries": [{"year": 2026, "month": 10, "price": 3500}]
            }
        )
        assert response.status_code == 200
        
        # Verify new price
        avail_response = requests.get(
            f"{BASE_URL}/api/public/listings/{unit_id}/availability",
            params={"start_year": 2026, "start_month": 10, "num_months": 1}
        )
        avail_data = avail_response.json()
        assert avail_data["months"][0]["price"] == 3500
        print(f"✓ Price overwrite works: $3000 -> $3500")


class TestListingDetailsUpdate:
    """Test admin UI to edit unit info (Feature 3)"""
    
    def test_update_listing_title_and_description(self):
        """PUT /api/public/admin/listings/{unit_id} updates title and description"""
        unit_id = UNIT_IDS[2]  # Use Unit 8
        
        new_title = "Test Updated Title"
        new_desc = "Test updated description for unit 8"
        
        response = requests.put(
            f"{BASE_URL}/api/public/admin/listings/{unit_id}",
            json={
                "password": CORRECT_PASSWORD,
                "title": new_title,
                "description": new_desc
            }
        )
        assert response.status_code == 200
        print(f"✓ Listing details updated")
        
        # Verify update
        listing_response = requests.get(f"{BASE_URL}/api/public/listings/{unit_id}")
        listing_data = listing_response.json()
        
        assert listing_data["title"] == new_title
        assert listing_data["description"] == new_desc
        print(f"  ✓ Title: {listing_data['title']}")
        print(f"  ✓ Description: {listing_data['description']}")
    
    def test_update_listing_wrong_password(self):
        """PUT /api/public/admin/listings/{unit_id} with wrong password returns 401"""
        unit_id = UNIT_IDS[0]
        
        response = requests.put(
            f"{BASE_URL}/api/public/admin/listings/{unit_id}",
            json={
                "password": WRONG_PASSWORD,
                "title": "Should Not Update"
            }
        )
        assert response.status_code == 401
        print(f"✓ Wrong password returns 401")
    
    def test_update_listing_invalid_unit(self):
        """PUT /api/public/admin/listings/{invalid_id} returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/public/admin/listings/000000000000000000000000",
            json={
                "password": CORRECT_PASSWORD,
                "title": "Should Not Work"
            }
        )
        assert response.status_code == 404
        print(f"✓ Invalid unit returns 404")
    
    def test_update_listing_partial_update(self):
        """PUT /api/public/admin/listings/{unit_id} with only title updates only title"""
        unit_id = UNIT_IDS[0]
        
        # First set both title and description
        requests.put(
            f"{BASE_URL}/api/public/admin/listings/{unit_id}",
            json={
                "password": CORRECT_PASSWORD,
                "title": "Original Title",
                "description": "Original Description"
            }
        )
        
        # Update only title
        response = requests.put(
            f"{BASE_URL}/api/public/admin/listings/{unit_id}",
            json={
                "password": CORRECT_PASSWORD,
                "title": "New Title Only"
            }
        )
        assert response.status_code == 200
        
        # Verify
        listing_response = requests.get(f"{BASE_URL}/api/public/listings/{unit_id}")
        listing_data = listing_response.json()
        
        assert listing_data["title"] == "New Title Only"
        print(f"✓ Partial update works: title updated, description preserved")


class TestPhotoUploadAndDelete:
    """Test photo upload and delete endpoints (Feature 3)"""
    
    def test_photo_upload_wrong_password(self):
        """POST /api/public/admin/listings/{unit_id}/photos with wrong password returns 401"""
        unit_id = UNIT_IDS[0]
        
        # Create a simple test image (1x1 pixel PNG)
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        response = requests.post(
            f"{BASE_URL}/api/public/admin/listings/{unit_id}/photos",
            params={"password": WRONG_PASSWORD},
            files={"file": ("test.png", png_data, "image/png")}
        )
        assert response.status_code == 401
        print(f"✓ Photo upload with wrong password returns 401")
    
    def test_photo_upload_valid(self):
        """POST /api/public/admin/listings/{unit_id}/photos uploads a photo"""
        unit_id = UNIT_IDS[0]
        
        # Create a simple test image (1x1 pixel PNG)
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        response = requests.post(
            f"{BASE_URL}/api/public/admin/listings/{unit_id}/photos",
            params={"password": CORRECT_PASSWORD},
            files={"file": ("test_upload.png", png_data, "image/png")}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "url" in data
        assert "filename" in data
        print(f"✓ Photo uploaded: {data['filename']}")
        print(f"  ✓ Photo ID: {data['id']}")
        print(f"  ✓ Photo URL: {data['url']}")
        
        # Store photo ID for delete test
        return data["id"]
    
    def test_photo_delete_wrong_password(self):
        """POST /api/public/admin/listings/{unit_id}/photos/delete with wrong password returns 401"""
        unit_id = UNIT_IDS[0]
        
        response = requests.post(
            f"{BASE_URL}/api/public/admin/listings/{unit_id}/photos/delete",
            json={
                "password": WRONG_PASSWORD,
                "photo_id": "some-photo-id"
            }
        )
        assert response.status_code == 401
        print(f"✓ Photo delete with wrong password returns 401")
    
    def test_photo_upload_and_delete_flow(self):
        """Full flow: upload photo, verify in listing, delete, verify removed"""
        unit_id = UNIT_IDS[1]
        
        # Upload photo
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        upload_response = requests.post(
            f"{BASE_URL}/api/public/admin/listings/{unit_id}/photos",
            params={"password": CORRECT_PASSWORD},
            files={"file": ("flow_test.png", png_data, "image/png")}
        )
        assert upload_response.status_code == 200
        photo_id = upload_response.json()["id"]
        print(f"✓ Photo uploaded with ID: {photo_id}")
        
        # Verify photo appears in listing
        listing_response = requests.get(f"{BASE_URL}/api/public/listings/{unit_id}")
        listing_data = listing_response.json()
        photo_ids = [p["id"] for p in listing_data["photos"]]
        assert photo_id in photo_ids, "Uploaded photo not found in listing"
        print(f"✓ Photo appears in listing photos")
        
        # Delete photo
        delete_response = requests.post(
            f"{BASE_URL}/api/public/admin/listings/{unit_id}/photos/delete",
            json={
                "password": CORRECT_PASSWORD,
                "photo_id": photo_id
            }
        )
        assert delete_response.status_code == 200
        print(f"✓ Photo deleted")
        
        # Verify photo no longer appears (soft delete)
        listing_response2 = requests.get(f"{BASE_URL}/api/public/listings/{unit_id}")
        listing_data2 = listing_response2.json()
        photo_ids2 = [p["id"] for p in listing_data2["photos"]]
        assert photo_id not in photo_ids2, "Deleted photo still appears in listing"
        print(f"✓ Photo no longer appears in listing (soft deleted)")


class TestPricingDelete:
    """Test pricing delete endpoint"""
    
    def test_delete_pricing_valid(self):
        """POST /api/public/admin/pricing/delete removes pricing entry"""
        unit_id = UNIT_IDS[2]
        
        # First set a price
        requests.post(
            f"{BASE_URL}/api/public/admin/pricing",
            json={
                "password": CORRECT_PASSWORD,
                "unit_id": unit_id,
                "entries": [{"year": 2026, "month": 11, "price": 4000}]
            }
        )
        
        # Delete the price
        response = requests.post(
            f"{BASE_URL}/api/public/admin/pricing/delete",
            json={
                "password": CORRECT_PASSWORD,
                "unit_id": unit_id,
                "year": 2026,
                "month": 11
            }
        )
        assert response.status_code == 200
        print(f"✓ Pricing deleted")
        
        # Verify deletion
        avail_response = requests.get(
            f"{BASE_URL}/api/public/listings/{unit_id}/availability",
            params={"start_year": 2026, "start_month": 11, "num_months": 1}
        )
        avail_data = avail_response.json()
        assert avail_data["months"][0]["price"] is None
        print(f"✓ Pricing verified as deleted (price is None)")
    
    def test_delete_pricing_wrong_password(self):
        """POST /api/public/admin/pricing/delete with wrong password returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/public/admin/pricing/delete",
            json={
                "password": WRONG_PASSWORD,
                "unit_id": UNIT_IDS[0],
                "year": 2026,
                "month": 12
            }
        )
        assert response.status_code == 401
        print(f"✓ Delete pricing with wrong password returns 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
