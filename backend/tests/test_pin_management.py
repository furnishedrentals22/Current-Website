"""
Test PIN Management APIs for Login Info Page
Tests the new PIN system where:
- level_1 (Low) and level_2 (Medium) PINs are stored in DB
- level_3 (High) and shared PINs are hard-coded to 3401
- PIN Settings requires admin_pin=3401 to set level_1/level_2 PINs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPinStatus:
    """Test GET /api/pins/status endpoint"""
    
    def test_pin_status_returns_all_fields(self):
        """Verify PIN status returns all required fields"""
        response = requests.get(f"{BASE_URL}/api/pins/status")
        assert response.status_code == 200
        
        data = response.json()
        assert "shared_pin_set" in data
        assert "level_1_pin_set" in data
        assert "level_2_pin_set" in data
        assert "level_3_pin_set" in data
        
        # shared and level_3 should always be True (hard-coded)
        assert data["shared_pin_set"] == True
        assert data["level_3_pin_set"] == True


class TestPinVerify:
    """Test POST /api/pins/verify endpoint"""
    
    def test_verify_level_3_correct_pin(self):
        """Level 3 (High) verifies against hard-coded PIN 3401"""
        response = requests.post(f"{BASE_URL}/api/pins/verify", json={
            "pin": "3401",
            "pin_type": "level_3"
        })
        assert response.status_code == 200
        assert response.json()["valid"] == True
    
    def test_verify_level_3_wrong_pin(self):
        """Level 3 rejects wrong PIN"""
        response = requests.post(f"{BASE_URL}/api/pins/verify", json={
            "pin": "1234",
            "pin_type": "level_3"
        })
        assert response.status_code == 200
        assert response.json()["valid"] == False
    
    def test_verify_shared_correct_pin(self):
        """Shared PIN verifies against hard-coded PIN 3401"""
        response = requests.post(f"{BASE_URL}/api/pins/verify", json={
            "pin": "3401",
            "pin_type": "shared"
        })
        assert response.status_code == 200
        assert response.json()["valid"] == True
    
    def test_verify_shared_wrong_pin(self):
        """Shared PIN rejects wrong PIN"""
        response = requests.post(f"{BASE_URL}/api/pins/verify", json={
            "pin": "wrong",
            "pin_type": "shared"
        })
        assert response.status_code == 200
        assert response.json()["valid"] == False
    
    def test_verify_level_1_stored_pin(self):
        """Level 1 (Low) verifies against stored PIN"""
        # First set a known PIN
        requests.post(f"{BASE_URL}/api/pins/set", json={
            "pin": "1111",
            "pin_type": "level_1",
            "admin_pin": "3401"
        })
        
        # Verify it works
        response = requests.post(f"{BASE_URL}/api/pins/verify", json={
            "pin": "1111",
            "pin_type": "level_1"
        })
        assert response.status_code == 200
        assert response.json()["valid"] == True
    
    def test_verify_level_1_wrong_pin(self):
        """Level 1 rejects wrong PIN"""
        response = requests.post(f"{BASE_URL}/api/pins/verify", json={
            "pin": "9999",
            "pin_type": "level_1"
        })
        assert response.status_code == 200
        assert response.json()["valid"] == False
    
    def test_verify_level_2_stored_pin(self):
        """Level 2 (Medium) verifies against stored PIN"""
        # First set a known PIN
        requests.post(f"{BASE_URL}/api/pins/set", json={
            "pin": "2222",
            "pin_type": "level_2",
            "admin_pin": "3401"
        })
        
        # Verify it works
        response = requests.post(f"{BASE_URL}/api/pins/verify", json={
            "pin": "2222",
            "pin_type": "level_2"
        })
        assert response.status_code == 200
        assert response.json()["valid"] == True


class TestPinSet:
    """Test POST /api/pins/set endpoint"""
    
    def test_set_level_1_with_correct_admin_pin(self):
        """Can set level_1 PIN with correct admin PIN"""
        response = requests.post(f"{BASE_URL}/api/pins/set", json={
            "pin": "1111",
            "pin_type": "level_1",
            "admin_pin": "3401"
        })
        assert response.status_code == 200
        assert "message" in response.json()
        assert "level_1" in response.json()["message"]
    
    def test_set_level_2_with_correct_admin_pin(self):
        """Can set level_2 PIN with correct admin PIN"""
        response = requests.post(f"{BASE_URL}/api/pins/set", json={
            "pin": "2222",
            "pin_type": "level_2",
            "admin_pin": "3401"
        })
        assert response.status_code == 200
        assert "message" in response.json()
        assert "level_2" in response.json()["message"]
    
    def test_set_pin_with_wrong_admin_pin(self):
        """Rejects PIN set with wrong admin PIN"""
        response = requests.post(f"{BASE_URL}/api/pins/set", json={
            "pin": "1111",
            "pin_type": "level_1",
            "admin_pin": "wrong"
        })
        assert response.status_code == 403
        assert "Invalid admin PIN" in response.json()["detail"]
    
    def test_set_level_3_rejected(self):
        """Cannot set level_3 PIN (it's hard-coded)"""
        response = requests.post(f"{BASE_URL}/api/pins/set", json={
            "pin": "9999",
            "pin_type": "level_3",
            "admin_pin": "3401"
        })
        assert response.status_code == 400
        assert "level_1 and level_2" in response.json()["detail"]
    
    def test_set_shared_rejected(self):
        """Cannot set shared PIN (it's hard-coded)"""
        response = requests.post(f"{BASE_URL}/api/pins/set", json={
            "pin": "9999",
            "pin_type": "shared",
            "admin_pin": "3401"
        })
        assert response.status_code == 400


class TestPinPersistence:
    """Test that PIN changes persist correctly"""
    
    def test_pin_change_persists(self):
        """Verify PIN change is persisted in database"""
        # Set a new PIN
        set_response = requests.post(f"{BASE_URL}/api/pins/set", json={
            "pin": "4444",
            "pin_type": "level_1",
            "admin_pin": "3401"
        })
        assert set_response.status_code == 200
        
        # Verify old PIN no longer works
        verify_old = requests.post(f"{BASE_URL}/api/pins/verify", json={
            "pin": "1111",
            "pin_type": "level_1"
        })
        assert verify_old.json()["valid"] == False
        
        # Verify new PIN works
        verify_new = requests.post(f"{BASE_URL}/api/pins/verify", json={
            "pin": "4444",
            "pin_type": "level_1"
        })
        assert verify_new.json()["valid"] == True
        
        # Reset back to 1111 for other tests
        requests.post(f"{BASE_URL}/api/pins/set", json={
            "pin": "1111",
            "pin_type": "level_1",
            "admin_pin": "3401"
        })


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
