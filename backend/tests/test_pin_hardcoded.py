"""
Test PIN Management - Hard-coded PIN (3401) verification
Tests:
- POST /api/pins/verify with correct PIN (3401) and various pin_types
- POST /api/pins/verify with wrong PIN
- GET /api/pins/status returns all pin types as set (true)
- Verify /api/pins/set endpoint is removed
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

class TestPinVerification:
    """Test hard-coded PIN verification (PIN=3401)"""
    
    def test_verify_pin_shared_correct(self):
        """POST /api/pins/verify with pin=3401 and pin_type=shared returns {valid:true}"""
        response = requests.post(f"{BASE_URL}/api/pins/verify", json={
            "pin": "3401",
            "pin_type": "shared"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
        print("✓ PIN 3401 with pin_type=shared returns valid=true")
    
    def test_verify_pin_level_2_correct(self):
        """POST /api/pins/verify with pin=3401 and pin_type=level_2 returns {valid:true}"""
        response = requests.post(f"{BASE_URL}/api/pins/verify", json={
            "pin": "3401",
            "pin_type": "level_2"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
        print("✓ PIN 3401 with pin_type=level_2 returns valid=true")
    
    def test_verify_pin_level_3_correct(self):
        """POST /api/pins/verify with pin=3401 and pin_type=level_3 returns {valid:true}"""
        response = requests.post(f"{BASE_URL}/api/pins/verify", json={
            "pin": "3401",
            "pin_type": "level_3"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
        print("✓ PIN 3401 with pin_type=level_3 returns valid=true")
    
    def test_verify_pin_wrong(self):
        """POST /api/pins/verify with pin=wrong returns {valid:false}"""
        response = requests.post(f"{BASE_URL}/api/pins/verify", json={
            "pin": "wrong",
            "pin_type": "shared"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == False
        print("✓ Wrong PIN returns valid=false")
    
    def test_verify_pin_1234_wrong(self):
        """POST /api/pins/verify with pin=1234 returns {valid:false}"""
        response = requests.post(f"{BASE_URL}/api/pins/verify", json={
            "pin": "1234",
            "pin_type": "shared"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == False
        print("✓ PIN 1234 returns valid=false")
    
    def test_verify_pin_empty(self):
        """POST /api/pins/verify with empty pin returns {valid:false}"""
        response = requests.post(f"{BASE_URL}/api/pins/verify", json={
            "pin": "",
            "pin_type": "shared"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == False
        print("✓ Empty PIN returns valid=false")


class TestPinStatus:
    """Test PIN status endpoint"""
    
    def test_get_pin_status(self):
        """GET /api/pins/status returns all pin types as set (true)"""
        response = requests.get(f"{BASE_URL}/api/pins/status")
        assert response.status_code == 200
        data = response.json()
        assert data["shared_pin_set"] == True
        assert data["level_2_pin_set"] == True
        assert data["level_3_pin_set"] == True
        print("✓ All pin types show as set (true)")


class TestPinSetEndpointRemoved:
    """Verify /api/pins/set endpoint is removed"""
    
    def test_pins_set_endpoint_removed(self):
        """POST /api/pins/set should return 404 or 405 (endpoint removed)"""
        response = requests.post(f"{BASE_URL}/api/pins/set", json={
            "pin": "1234",
            "pin_type": "shared"
        })
        # Endpoint should be removed, so expect 404 or 405
        assert response.status_code in [404, 405, 422], f"Expected 404/405/422, got {response.status_code}"
        print(f"✓ /api/pins/set endpoint returns {response.status_code} (removed)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
