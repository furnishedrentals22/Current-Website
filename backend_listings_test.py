#!/usr/bin/env python3

import requests
import sys
import json
import io
from datetime import datetime

class ListingsEnhancementTester:
    def __init__(self, base_url="https://property-redesign-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{self.base_url}/api"
        self.password = "emergeontop"
        self.tests_run = 0
        self.tests_passed = 0
        self.unit_id = None
        self.uploaded_photo_ids = []
        self.uploaded_video_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
            if details:
                print(f"   {details}")
        else:
            print(f"❌ {name}")
            if details:
                print(f"   {details}")

    def make_request(self, method, endpoint, data=None, files=None, params=None):
        """Make HTTP request and return response"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        try:
            if method == 'GET':
                response = requests.get(url, params=params)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, data=data, params=params)
                else:
                    headers['Content-Type'] = 'application/json'
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                headers['Content-Type'] = 'application/json'
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                headers['Content-Type'] = 'application/json'
                response = requests.delete(url, json=data, headers=headers)
            
            return response
        except Exception as e:
            print(f"Request error: {str(e)}")
            return None

    def test_get_listings(self):
        """Test GET /api/public/listings - should return listings with new fields"""
        print("\n=== Testing GET /api/public/listings ===")
        
        response = self.make_request('GET', 'public/listings')
        if not response:
            self.log_test("Get listings - Request failed", False, "Network error")
            return False
        
        if response.status_code != 200:
            self.log_test("Get listings - Wrong status", False, f"Expected 200, got {response.status_code}")
            return False
        
        try:
            listings = response.json()
            if not isinstance(listings, list):
                self.log_test("Get listings - Invalid format", False, "Response is not a list")
                return False
            
            if len(listings) == 0:
                self.log_test("Get listings - No data", False, "No listings found in database")
                return False
            
            # Get first listing for unit_id
            first_listing = listings[0]
            self.unit_id = first_listing.get('id')
            
            # Check for new fields in response
            required_fields = ['amenities', 'address', 'address_lat', 'address_lng', 'video', 'photos']
            missing_fields = []
            
            for field in required_fields:
                if field not in first_listing:
                    missing_fields.append(field)
            
            if missing_fields:
                self.log_test("Get listings - Missing fields", False, f"Missing: {missing_fields}")
                return False
            
            # Check photos structure
            photos = first_listing.get('photos', [])
            if photos and isinstance(photos, list):
                photo = photos[0]
                photo_fields = ['id', 'url', 'filename', 'order', 'is_cover']
                missing_photo_fields = [f for f in photo_fields if f not in photo]
                if missing_photo_fields:
                    self.log_test("Get listings - Photo fields missing", False, f"Missing photo fields: {missing_photo_fields}")
                    return False
            
            self.log_test("Get listings - Success", True, f"Found {len(listings)} listings with unit_id: {self.unit_id}")
            return True
            
        except json.JSONDecodeError:
            self.log_test("Get listings - JSON error", False, "Invalid JSON response")
            return False

    def test_get_single_listing(self):
        """Test GET /api/public/listings/{unit_id}"""
        print("\n=== Testing GET /api/public/listings/{unit_id} ===")
        
        if not self.unit_id:
            self.log_test("Get single listing - No unit_id", False, "No unit_id available from previous test")
            return False
        
        response = self.make_request('GET', f'public/listings/{self.unit_id}')
        if not response:
            self.log_test("Get single listing - Request failed", False, "Network error")
            return False
        
        if response.status_code != 200:
            self.log_test("Get single listing - Wrong status", False, f"Expected 200, got {response.status_code}")
            return False
        
        try:
            listing = response.json()
            
            # Check for new fields
            required_fields = ['amenities', 'address', 'address_lat', 'address_lng', 'video', 'photos']
            missing_fields = [f for f in required_fields if f not in listing]
            
            if missing_fields:
                self.log_test("Get single listing - Missing fields", False, f"Missing: {missing_fields}")
                return False
            
            self.log_test("Get single listing - Success", True, f"Retrieved listing for unit {self.unit_id}")
            return True
            
        except json.JSONDecodeError:
            self.log_test("Get single listing - JSON error", False, "Invalid JSON response")
            return False

    def test_get_default_amenities(self):
        """Test GET /api/public/amenities/defaults"""
        print("\n=== Testing GET /api/public/amenities/defaults ===")
        
        response = self.make_request('GET', 'public/amenities/defaults')
        if not response:
            self.log_test("Get default amenities - Request failed", False, "Network error")
            return False
        
        if response.status_code != 200:
            self.log_test("Get default amenities - Wrong status", False, f"Expected 200, got {response.status_code}")
            return False
        
        try:
            amenities = response.json()
            
            if not isinstance(amenities, list):
                self.log_test("Get default amenities - Invalid format", False, "Response is not a list")
                return False
            
            if len(amenities) != 20:
                self.log_test("Get default amenities - Wrong count", False, f"Expected 20 amenities, got {len(amenities)}")
                return False
            
            # Check amenity structure
            first_amenity = amenities[0]
            if 'name' not in first_amenity or 'icon' not in first_amenity:
                self.log_test("Get default amenities - Missing fields", False, "Amenities missing name or icon")
                return False
            
            self.log_test("Get default amenities - Success", True, f"Retrieved {len(amenities)} default amenities")
            return True
            
        except json.JSONDecodeError:
            self.log_test("Get default amenities - JSON error", False, "Invalid JSON response")
            return False

    def test_update_listing_details(self):
        """Test PUT /api/public/admin/listings/{unit_id}"""
        print("\n=== Testing PUT /api/public/admin/listings/{unit_id} ===")
        
        if not self.unit_id:
            self.log_test("Update listing - No unit_id", False, "No unit_id available")
            return False
        
        update_data = {
            "password": self.password,
            "title": "Test Enhanced Listing",
            "description": "This is a test listing with enhanced features",
            "amenities": [
                {"name": "WiFi", "icon": "wifi"},
                {"name": "Air Conditioning", "icon": "snowflake"},
                {"name": "Kitchen", "icon": "utensils-crossed"}
            ],
            "address": "123 Test Street, Test City, TC 12345",
            "address_lat": 40.7128,
            "address_lng": -74.0060
        }
        
        response = self.make_request('PUT', f'public/admin/listings/{self.unit_id}', data=update_data)
        if not response:
            self.log_test("Update listing - Request failed", False, "Network error")
            return False
        
        if response.status_code != 200:
            self.log_test("Update listing - Wrong status", False, f"Expected 200, got {response.status_code}")
            return False
        
        # Verify the update by getting the listing
        verify_response = self.make_request('GET', f'public/listings/{self.unit_id}')
        if verify_response and verify_response.status_code == 200:
            try:
                listing = verify_response.json()
                if (listing.get('title') == update_data['title'] and 
                    listing.get('address') == update_data['address'] and
                    len(listing.get('amenities', [])) == 3):
                    self.log_test("Update listing - Success", True, "Listing updated and verified")
                    return True
                else:
                    self.log_test("Update listing - Verification failed", False, "Updated data not reflected")
                    return False
            except json.JSONDecodeError:
                self.log_test("Update listing - Verification error", False, "Could not verify update")
                return False
        
        self.log_test("Update listing - Could not verify", False, "Update response OK but verification failed")
        return False

    def create_test_image(self, filename="test_image.jpg"):
        """Create a small test image file"""
        # Create a minimal JPEG-like file (not a real image, but has correct headers)
        jpeg_header = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00'
        jpeg_data = jpeg_header + b'\x00' * 100 + b'\xff\xd9'  # Minimal JPEG structure
        return io.BytesIO(jpeg_data), filename

    def test_batch_photo_upload(self):
        """Test POST /api/public/admin/listings/{unit_id}/photos/batch"""
        print("\n=== Testing POST /api/public/admin/listings/{unit_id}/photos/batch ===")
        
        if not self.unit_id:
            self.log_test("Batch photo upload - No unit_id", False, "No unit_id available")
            return False
        
        # Create test files
        file1, filename1 = self.create_test_image("test1.jpg")
        file2, filename2 = self.create_test_image("test2.jpg")
        
        files = [
            ('files', (filename1, file1, 'image/jpeg')),
            ('files', (filename2, file2, 'image/jpeg'))
        ]
        
        params = {'password': self.password}
        
        response = self.make_request('POST', f'public/admin/listings/{self.unit_id}/photos/batch', 
                                   files=files, params=params)
        
        if not response:
            self.log_test("Batch photo upload - Request failed", False, "Network error")
            return False
        
        if response.status_code != 200:
            self.log_test("Batch photo upload - Wrong status", False, f"Expected 200, got {response.status_code}")
            return False
        
        try:
            result = response.json()
            uploaded = result.get('uploaded', [])
            
            if len(uploaded) != 2:
                self.log_test("Batch photo upload - Wrong count", False, f"Expected 2 uploads, got {len(uploaded)}")
                return False
            
            # Store photo IDs for later tests
            for photo in uploaded:
                if 'id' in photo:
                    self.uploaded_photo_ids.append(photo['id'])
            
            self.log_test("Batch photo upload - Success", True, f"Uploaded {len(uploaded)} photos")
            return True
            
        except json.JSONDecodeError:
            self.log_test("Batch photo upload - JSON error", False, "Invalid JSON response")
            return False

    def test_photo_reorder(self):
        """Test POST /api/public/admin/listings/{unit_id}/photos/reorder"""
        print("\n=== Testing POST /api/public/admin/listings/{unit_id}/photos/reorder ===")
        
        if not self.unit_id or len(self.uploaded_photo_ids) < 2:
            self.log_test("Photo reorder - Insufficient data", False, "Need at least 2 photos")
            return False
        
        # Reverse the order of photos
        reorder_data = {
            "password": self.password,
            "photo_ids": list(reversed(self.uploaded_photo_ids))
        }
        
        response = self.make_request('POST', f'public/admin/listings/{self.unit_id}/photos/reorder', 
                                   data=reorder_data)
        
        if not response:
            self.log_test("Photo reorder - Request failed", False, "Network error")
            return False
        
        if response.status_code != 200:
            self.log_test("Photo reorder - Wrong status", False, f"Expected 200, got {response.status_code}")
            return False
        
        self.log_test("Photo reorder - Success", True, "Photos reordered successfully")
        return True

    def test_set_cover_photo(self):
        """Test POST /api/public/admin/listings/{unit_id}/photos/cover"""
        print("\n=== Testing POST /api/public/admin/listings/{unit_id}/photos/cover ===")
        
        if not self.unit_id or not self.uploaded_photo_ids:
            self.log_test("Set cover photo - No photos", False, "No uploaded photos available")
            return False
        
        cover_data = {
            "password": self.password,
            "photo_id": self.uploaded_photo_ids[0]
        }
        
        response = self.make_request('POST', f'public/admin/listings/{self.unit_id}/photos/cover', 
                                   data=cover_data)
        
        if not response:
            self.log_test("Set cover photo - Request failed", False, "Network error")
            return False
        
        if response.status_code != 200:
            self.log_test("Set cover photo - Wrong status", False, f"Expected 200, got {response.status_code}")
            return False
        
        # Verify cover photo is set
        verify_response = self.make_request('GET', f'public/listings/{self.unit_id}')
        if verify_response and verify_response.status_code == 200:
            try:
                listing = verify_response.json()
                photos = listing.get('photos', [])
                cover_photos = [p for p in photos if p.get('is_cover')]
                
                if len(cover_photos) == 1 and cover_photos[0]['id'] == self.uploaded_photo_ids[0]:
                    self.log_test("Set cover photo - Success", True, "Cover photo set and verified")
                    return True
                else:
                    self.log_test("Set cover photo - Verification failed", False, "Cover photo not properly set")
                    return False
            except json.JSONDecodeError:
                self.log_test("Set cover photo - Verification error", False, "Could not verify cover photo")
                return False
        
        self.log_test("Set cover photo - Could not verify", False, "Response OK but verification failed")
        return False

    def create_test_video(self, filename="test_video.mp4"):
        """Create a small test video file"""
        # Create a minimal MP4-like file (not a real video, but has correct headers)
        mp4_header = b'\x00\x00\x00\x20ftypmp42\x00\x00\x00\x00mp42isom'
        mp4_data = mp4_header + b'\x00' * 200
        return io.BytesIO(mp4_data), filename

    def test_video_upload(self):
        """Test POST /api/public/admin/listings/{unit_id}/video"""
        print("\n=== Testing POST /api/public/admin/listings/{unit_id}/video ===")
        
        if not self.unit_id:
            self.log_test("Video upload - No unit_id", False, "No unit_id available")
            return False
        
        video_file, filename = self.create_test_video()
        files = {'file': (filename, video_file, 'video/mp4')}
        params = {'password': self.password}
        
        response = self.make_request('POST', f'public/admin/listings/{self.unit_id}/video', 
                                   files=files, params=params)
        
        if not response:
            self.log_test("Video upload - Request failed", False, "Network error")
            return False
        
        if response.status_code != 200:
            self.log_test("Video upload - Wrong status", False, f"Expected 200, got {response.status_code}")
            return False
        
        try:
            result = response.json()
            if 'id' in result:
                self.uploaded_video_id = result['id']
                self.log_test("Video upload - Success", True, f"Video uploaded with ID: {self.uploaded_video_id}")
                return True
            else:
                self.log_test("Video upload - No ID returned", False, "Response missing video ID")
                return False
                
        except json.JSONDecodeError:
            self.log_test("Video upload - JSON error", False, "Invalid JSON response")
            return False

    def test_video_delete(self):
        """Test POST /api/public/admin/listings/{unit_id}/video/delete"""
        print("\n=== Testing POST /api/public/admin/listings/{unit_id}/video/delete ===")
        
        if not self.unit_id:
            self.log_test("Video delete - No unit_id", False, "No unit_id available")
            return False
        
        delete_data = {"password": self.password}
        
        response = self.make_request('POST', f'public/admin/listings/{self.unit_id}/video/delete', 
                                   data=delete_data)
        
        if not response:
            self.log_test("Video delete - Request failed", False, "Network error")
            return False
        
        if response.status_code != 200:
            self.log_test("Video delete - Wrong status", False, f"Expected 200, got {response.status_code}")
            return False
        
        # Verify video is deleted
        verify_response = self.make_request('GET', f'public/listings/{self.unit_id}')
        if verify_response and verify_response.status_code == 200:
            try:
                listing = verify_response.json()
                video = listing.get('video')
                
                if video is None:
                    self.log_test("Video delete - Success", True, "Video deleted and verified")
                    return True
                else:
                    self.log_test("Video delete - Verification failed", False, "Video still present after delete")
                    return False
            except json.JSONDecodeError:
                self.log_test("Video delete - Verification error", False, "Could not verify deletion")
                return False
        
        self.log_test("Video delete - Could not verify", False, "Response OK but verification failed")
        return False

    def test_final_listing_verification(self):
        """Final verification that all new fields are present in listing response"""
        print("\n=== Final Listing Verification ===")
        
        if not self.unit_id:
            self.log_test("Final verification - No unit_id", False, "No unit_id available")
            return False
        
        response = self.make_request('GET', f'public/listings/{self.unit_id}')
        if not response or response.status_code != 200:
            self.log_test("Final verification - Request failed", False, "Could not get listing")
            return False
        
        try:
            listing = response.json()
            
            # Check all required fields are present
            checks = {
                "title": listing.get('title') == "Test Enhanced Listing",
                "description": "This is a test listing" in listing.get('description', ''),
                "amenities": len(listing.get('amenities', [])) >= 3,
                "address": listing.get('address') == "123 Test Street, Test City, TC 12345",
                "address_lat": listing.get('address_lat') == 40.7128,
                "address_lng": listing.get('address_lng') == -74.0060,
                "photos": len(listing.get('photos', [])) >= 2,
                "video": listing.get('video') is None  # Should be None after deletion
            }
            
            failed_checks = [k for k, v in checks.items() if not v]
            
            if not failed_checks:
                self.log_test("Final verification - Success", True, "All enhanced fields verified")
                return True
            else:
                self.log_test("Final verification - Failed", False, f"Failed checks: {failed_checks}")
                return False
                
        except json.JSONDecodeError:
            self.log_test("Final verification - JSON error", False, "Invalid JSON response")
            return False

    def run_all_tests(self):
        """Run all listing enhancement tests"""
        print("🚀 Starting Listings Enhancement API Tests")
        print(f"Testing against: {self.base_url}")
        print(f"Using password: {self.password}")
        
        tests = [
            self.test_get_listings,
            self.test_get_single_listing,
            self.test_get_default_amenities,
            self.test_update_listing_details,
            self.test_batch_photo_upload,
            self.test_photo_reorder,
            self.test_set_cover_photo,
            self.test_video_upload,
            self.test_video_delete,
            self.test_final_listing_verification
        ]
        
        all_passed = True
        for test in tests:
            try:
                result = test()
                if not result:
                    all_passed = False
            except Exception as e:
                print(f"❌ Test {test.__name__} crashed: {str(e)}")
                all_passed = False
        
        return all_passed

def main():
    """Main test runner"""
    tester = ListingsEnhancementTester()
    
    try:
        all_passed = tester.run_all_tests()
        
        # Print results
        print(f"\n📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
        
        if all_passed and tester.tests_passed == tester.tests_run:
            print("🎉 All listings enhancement tests passed!")
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