"""
Backend tests for NEW Notifications features:
- Snooze endpoint
- Duplicate endpoint
- Bulk action endpoint
- Query params (status, priority, category, property_id, assigned_person)
- Priority and category fields in NotificationCreate
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestNotificationsNewFeatures:
    """Test new notification endpoints: snooze, duplicate, bulk-action, query params"""
    
    @pytest.fixture(autouse=True)
    def setup_and_cleanup(self, request):
        """Setup: Create test notification, Cleanup: Remove test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_ids = []
        yield
        # Cleanup
        for nid in self.created_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/notifications/{nid}")
            except:
                pass
    
    def create_test_notification(self, name_suffix="", **overrides):
        """Helper to create a test notification with TEST_ prefix"""
        data = {
            "name": f"TEST_Notification_{name_suffix}_{datetime.now().timestamp()}",
            "priority": "medium",
            "category": "manual",
            "status": "upcoming",
            "reminder_date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
            "reminder_time": "10:00",
            "notes": "Test notification for automated testing",
            **overrides
        }
        response = self.session.post(f"{BASE_URL}/api/notifications", json=data)
        if response.status_code == 200:
            created = response.json()
            self.created_ids.append(created['id'])
            return created
        return None

    # --- Basic GET endpoint with query params ---
    
    def test_get_notifications_list(self):
        """Test GET /api/notifications returns list"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"GET /api/notifications: {len(data)} notifications found")
    
    def test_get_notifications_filter_by_status(self):
        """Test GET /api/notifications with status query param"""
        # Create notification with specific status
        n = self.create_test_notification("status_filter", status="in_progress")
        assert n is not None, "Failed to create test notification"
        
        response = self.session.get(f"{BASE_URL}/api/notifications", params={"status": "in_progress"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Check that our created notification is in the filtered results
        found = any(item['id'] == n['id'] for item in data)
        assert found, "Created notification not found in filtered results"
        print(f"Filter by status 'in_progress': {len(data)} results")
    
    def test_get_notifications_filter_by_priority(self):
        """Test GET /api/notifications with priority query param"""
        n = self.create_test_notification("priority_filter", priority="urgent")
        assert n is not None, "Failed to create test notification"
        
        response = self.session.get(f"{BASE_URL}/api/notifications", params={"priority": "urgent"})
        assert response.status_code == 200
        data = response.json()
        found = any(item['id'] == n['id'] for item in data)
        assert found, "Created notification with 'urgent' priority not found"
        print(f"Filter by priority 'urgent': {len(data)} results")
    
    def test_get_notifications_filter_by_category(self):
        """Test GET /api/notifications with category query param"""
        n = self.create_test_notification("category_filter", category="parking")
        assert n is not None, "Failed to create test notification"
        
        response = self.session.get(f"{BASE_URL}/api/notifications", params={"category": "parking"})
        assert response.status_code == 200
        data = response.json()
        found = any(item['id'] == n['id'] for item in data)
        assert found, "Created notification with 'parking' category not found"
        print(f"Filter by category 'parking': {len(data)} results")
    
    # --- Create notification with new fields ---
    
    def test_create_notification_with_all_new_fields(self):
        """Test POST /api/notifications with priority, category, recurring, reminder_times"""
        data = {
            "name": f"TEST_FullFields_{datetime.now().timestamp()}",
            "priority": "high",
            "category": "deposit_return",
            "status": "upcoming",
            "reminder_date": (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d"),
            "reminder_time": "14:00",
            "is_recurring": True,
            "recurrence_pattern": "weekly",
            "recurrence_end_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "reminder_times": ["09:00", "12:00", "18:00"],
            "notes": "Test with all fields",
        }
        response = self.session.post(f"{BASE_URL}/api/notifications", json=data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        created = response.json()
        self.created_ids.append(created['id'])
        
        # Verify fields
        assert created['priority'] == "high", f"Expected priority 'high', got {created.get('priority')}"
        assert created['category'] == "deposit_return", f"Expected category 'deposit_return', got {created.get('category')}"
        assert created['is_recurring'] == True, "Expected is_recurring=True"
        assert created['recurrence_pattern'] == "weekly"
        assert "09:00" in created.get('reminder_times', [])
        print("CREATE notification with all new fields: PASS")
    
    # --- Snooze endpoint ---
    
    def test_snooze_notification(self):
        """Test POST /api/notifications/{id}/snooze updates reminder_date"""
        n = self.create_test_notification("snooze")
        assert n is not None, "Failed to create test notification"
        
        snooze_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        response = self.session.post(f"{BASE_URL}/api/notifications/{n['id']}/snooze", json={
            "snooze_until_date": snooze_date,
            "snooze_until_time": "15:00"
        })
        assert response.status_code == 200, f"Snooze failed: {response.status_code} - {response.text}"
        updated = response.json()
        
        assert updated['reminder_date'] == snooze_date, f"Expected reminder_date {snooze_date}, got {updated.get('reminder_date')}"
        assert updated['reminder_time'] == "15:00"
        assert updated['status'] == "upcoming", "Status should be reset to 'upcoming' after snooze"
        print(f"SNOOZE notification to {snooze_date}: PASS")
    
    def test_snooze_notification_invalid_id(self):
        """Test snooze with invalid notification ID returns 404"""
        response = self.session.post(f"{BASE_URL}/api/notifications/000000000000000000000000/snooze", json={
            "snooze_until_date": "2025-12-31"
        })
        assert response.status_code == 404, f"Expected 404 for invalid ID, got {response.status_code}"
        print("SNOOZE invalid ID: 404 PASS")
    
    # --- Duplicate endpoint ---
    
    def test_duplicate_notification(self):
        """Test POST /api/notifications/{id}/duplicate creates a copy"""
        n = self.create_test_notification("original", priority="high", category="move_in")
        assert n is not None, "Failed to create test notification"
        
        response = self.session.post(f"{BASE_URL}/api/notifications/{n['id']}/duplicate")
        assert response.status_code == 200, f"Duplicate failed: {response.status_code} - {response.text}"
        duplicated = response.json()
        self.created_ids.append(duplicated['id'])
        
        # Verify duplicate
        assert duplicated['id'] != n['id'], "Duplicated notification should have different ID"
        assert "(Copy)" in duplicated['name'], f"Duplicated name should contain '(Copy)', got: {duplicated['name']}"
        assert duplicated['priority'] == n['priority'], "Priority should match original"
        assert duplicated['category'] == n['category'], "Category should match original"
        assert duplicated['status'] == "upcoming", "Duplicate status should be 'upcoming'"
        print(f"DUPLICATE notification: PASS (new ID: {duplicated['id'][:8]}...)")
    
    def test_duplicate_notification_invalid_id(self):
        """Test duplicate with invalid notification ID returns 404"""
        response = self.session.post(f"{BASE_URL}/api/notifications/000000000000000000000000/duplicate")
        assert response.status_code == 404, f"Expected 404 for invalid ID, got {response.status_code}"
        print("DUPLICATE invalid ID: 404 PASS")
    
    # --- Bulk action endpoint ---
    
    def test_bulk_action_mark_done(self):
        """Test POST /api/notifications/bulk-action to mark multiple as done"""
        n1 = self.create_test_notification("bulk1", status="upcoming")
        n2 = self.create_test_notification("bulk2", status="in_progress")
        assert n1 and n2, "Failed to create test notifications"
        
        response = self.session.post(f"{BASE_URL}/api/notifications/bulk-action", json={
            "ids": [n1['id'], n2['id']],
            "action": "status",
            "new_status": "done"
        })
        assert response.status_code == 200, f"Bulk action failed: {response.status_code} - {response.text}"
        result = response.json()
        assert "Updated" in result['message'] or "2" in result['message'], f"Unexpected message: {result['message']}"
        
        # Verify both are now 'done'
        for nid in [n1['id'], n2['id']]:
            get_resp = self.session.get(f"{BASE_URL}/api/notifications")
            notifs = get_resp.json()
            updated_n = next((x for x in notifs if x['id'] == nid), None)
            assert updated_n and updated_n['status'] == 'done', f"Notification {nid} not updated to done"
        print("BULK ACTION mark done: PASS")
    
    def test_bulk_action_archive(self):
        """Test bulk action to archive notifications"""
        n1 = self.create_test_notification("archive1", status="done")
        assert n1, "Failed to create test notification"
        
        response = self.session.post(f"{BASE_URL}/api/notifications/bulk-action", json={
            "ids": [n1['id']],
            "action": "status",
            "new_status": "archived"
        })
        assert response.status_code == 200
        print("BULK ACTION archive: PASS")
    
    def test_bulk_action_delete(self):
        """Test bulk action to delete notifications"""
        n1 = self.create_test_notification("del1")
        n2 = self.create_test_notification("del2")
        assert n1 and n2, "Failed to create test notifications"
        
        ids_to_delete = [n1['id'], n2['id']]
        response = self.session.post(f"{BASE_URL}/api/notifications/bulk-action", json={
            "ids": ids_to_delete,
            "action": "delete"
        })
        assert response.status_code == 200, f"Bulk delete failed: {response.status_code} - {response.text}"
        result = response.json()
        assert "Deleted" in result['message']
        
        # Remove from cleanup list since already deleted
        for nid in ids_to_delete:
            if nid in self.created_ids:
                self.created_ids.remove(nid)
        
        # Verify deleted
        get_resp = self.session.get(f"{BASE_URL}/api/notifications")
        notifs = get_resp.json()
        for nid in ids_to_delete:
            assert not any(x['id'] == nid for x in notifs), f"Notification {nid} still exists after bulk delete"
        print("BULK ACTION delete: PASS")
    
    def test_bulk_action_empty_ids(self):
        """Test bulk action with empty IDs returns 400"""
        response = self.session.post(f"{BASE_URL}/api/notifications/bulk-action", json={
            "ids": [],
            "action": "delete"
        })
        assert response.status_code == 400, f"Expected 400 for empty IDs, got {response.status_code}"
        print("BULK ACTION empty IDs: 400 PASS")
    
    def test_bulk_action_invalid_action(self):
        """Test bulk action with invalid action returns 400"""
        n = self.create_test_notification("invalid_action")
        assert n, "Failed to create test notification"
        
        response = self.session.post(f"{BASE_URL}/api/notifications/bulk-action", json={
            "ids": [n['id']],
            "action": "invalid_action_type"
        })
        assert response.status_code == 400, f"Expected 400 for invalid action, got {response.status_code}"
        print("BULK ACTION invalid action: 400 PASS")
    
    # --- Update notification status ---
    
    def test_update_notification_status(self):
        """Test PUT /api/notifications/{id}/status to change status"""
        n = self.create_test_notification("status_change", status="upcoming")
        assert n, "Failed to create test notification"
        
        for new_status in ["in_progress", "done", "reassigned", "archived"]:
            response = self.session.put(f"{BASE_URL}/api/notifications/{n['id']}/status?status={new_status}")
            assert response.status_code == 200, f"Status change to '{new_status}' failed: {response.status_code}"
        print("UPDATE notification status workflow: PASS")
    
    def test_update_notification_status_invalid(self):
        """Test status update with invalid status value returns 400"""
        n = self.create_test_notification("invalid_status")
        assert n, "Failed to create test notification"
        
        response = self.session.put(f"{BASE_URL}/api/notifications/{n['id']}/status?status=invalid_status")
        assert response.status_code == 400, f"Expected 400 for invalid status, got {response.status_code}"
        print("UPDATE invalid status: 400 PASS")
    
    # --- Priority values ---
    
    def test_priority_values(self):
        """Test all valid priority values: low, medium, high, urgent"""
        for priority in ["low", "medium", "high", "urgent"]:
            n = self.create_test_notification(f"priority_{priority}", priority=priority)
            assert n, f"Failed to create notification with priority '{priority}'"
            assert n['priority'] == priority, f"Priority mismatch: expected {priority}, got {n['priority']}"
        print("PRIORITY values (low, medium, high, urgent): PASS")
    
    # --- Category values ---
    
    def test_category_values(self):
        """Test all valid category values"""
        categories = ['manual', 'parking', 'door_code', 'deposit', 'move_in', 'move_out', 
                      'housekeeping', 'lead', 'deposit_return', 'other']
        for category in categories:
            n = self.create_test_notification(f"cat_{category}", category=category)
            assert n, f"Failed to create notification with category '{category}'"
            assert n['category'] == category, f"Category mismatch: expected {category}, got {n['category']}"
        print(f"CATEGORY values ({len(categories)} categories): PASS")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
