from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone
from bson import ObjectId

from database import db
from helpers import serialize_doc
from schemas import NotificationCreate, BulkNotificationAction, SnoozeNotification

router = APIRouter()


@router.get("/notifications")
async def list_notifications(
    status: str = None, priority: str = None,
    category: str = None, property_id: str = None,
    assigned_person: str = None
):
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if category:
        query["category"] = category
    if property_id:
        query["property_id"] = property_id
    if assigned_person:
        query["assigned_person"] = assigned_person
    docs = await db.notifications.find(query).sort("created_at", -1).to_list(1000)
    results = []
    for d in docs:
        s = serialize_doc(d)
        if "status" not in s:
            s["status"] = "done" if s.get("is_read") else "upcoming"
        if not s.get("name"):
            if s.get("message"):
                s["name"] = s["message"][:80]
            elif s.get("lead_name") and s.get("stage_name"):
                s["name"] = f"{s['lead_name']} - {s['stage_name']}"
        if not s.get("reminder_date") and s.get("notification_date"):
            s["reminder_date"] = s["notification_date"]
        if not s.get("priority"):
            s["priority"] = "medium"
        if not s.get("category"):
            s["category"] = s.get("notification_type", "manual")
        results.append(s)
    return results


@router.post("/notifications")
async def create_notification(data: NotificationCreate):
    doc = data.model_dump()
    doc["is_read"] = doc["status"] not in ["upcoming", "in_progress"]
    if not doc.get("reminder_date") and doc.get("notification_date"):
        doc["reminder_date"] = doc["notification_date"]
    if not doc.get("notification_date") and doc.get("reminder_date"):
        doc["notification_date"] = doc["reminder_date"]
    if not doc.get("category"):
        doc["category"] = doc.get("notification_type", "manual")
    now = datetime.now(timezone.utc).isoformat()
    doc["created_at"] = now
    doc["updated_at"] = now
    if not doc.get("status_history"):
        doc["status_history"] = [{"status": doc["status"], "timestamp": now}]
    result = await db.notifications.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.post("/notifications/bulk-action")
async def bulk_notification_action(data: BulkNotificationAction):
    if not data.ids:
        raise HTTPException(status_code=400, detail="No notification IDs provided")
    obj_ids = [ObjectId(i) for i in data.ids]
    now = datetime.now(timezone.utc).isoformat()
    if data.action == "delete":
        result = await db.notifications.delete_many({"_id": {"$in": obj_ids}})
        return {"message": f"Deleted {result.deleted_count} notifications"}
    elif data.action == "status" and data.new_status:
        valid = ["upcoming", "in_progress", "done", "reassigned", "archived"]
        if data.new_status not in valid:
            raise HTTPException(status_code=400, detail="Invalid status")
        is_read = data.new_status not in ["upcoming", "in_progress"]
        result = await db.notifications.update_many(
            {"_id": {"$in": obj_ids}},
            {"$set": {"status": data.new_status, "is_read": is_read, "updated_at": now},
             "$push": {"status_history": {"status": data.new_status, "timestamp": now}}}
        )
        return {"message": f"Updated {result.modified_count} notifications to {data.new_status}"}
    raise HTTPException(status_code=400, detail="Invalid action")


@router.put("/notifications/{notification_id}")
async def update_notification(notification_id: str, data: NotificationCreate):
    update_doc = data.model_dump()
    update_doc["is_read"] = update_doc["status"] not in ["upcoming", "in_progress"]
    if not update_doc.get("reminder_date") and update_doc.get("notification_date"):
        update_doc["reminder_date"] = update_doc["notification_date"]
    if not update_doc.get("notification_date") and update_doc.get("reminder_date"):
        update_doc["notification_date"] = update_doc["reminder_date"]
    now = datetime.now(timezone.utc).isoformat()
    update_doc["updated_at"] = now
    result = await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": update_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    doc = await db.notifications.find_one({"_id": ObjectId(notification_id)})
    return serialize_doc(doc)


@router.put("/notifications/{notification_id}/status")
async def update_notification_status(notification_id: str, status: str = Query(...)):
    valid = ["upcoming", "in_progress", "done", "reassigned", "archived"]
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid}")
    is_read = status not in ["upcoming", "in_progress"]
    now = datetime.now(timezone.utc).isoformat()
    result = await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"status": status, "is_read": is_read, "updated_at": now},
         "$push": {"status_history": {"status": status, "timestamp": now}}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": f"Status updated to {status}"}


@router.post("/notifications/{notification_id}/snooze")
async def snooze_notification(notification_id: str, data: SnoozeNotification):
    doc = await db.notifications.find_one({"_id": ObjectId(notification_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Notification not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {
            "snooze_until": data.snooze_until_date,
            "reminder_date": data.snooze_until_date,
            "reminder_time": data.snooze_until_time or doc.get("reminder_time", ""),
            "notification_date": data.snooze_until_date,
            "status": "upcoming", "is_read": False, "updated_at": now
        },
         "$push": {"status_history": {"status": "snoozed", "timestamp": now, "snoozed_to": data.snooze_until_date}}}
    )
    updated = await db.notifications.find_one({"_id": ObjectId(notification_id)})
    return serialize_doc(updated)


@router.post("/notifications/{notification_id}/duplicate")
async def duplicate_notification(notification_id: str):
    doc = await db.notifications.find_one({"_id": ObjectId(notification_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Notification not found")
    now = datetime.now(timezone.utc).isoformat()
    new_doc = {k: v for k, v in doc.items() if k != "_id"}
    new_doc["name"] = f"(Copy) {new_doc.get('name', '')}"
    new_doc["status"] = "upcoming"
    new_doc["is_read"] = False
    new_doc["created_at"] = now
    new_doc["updated_at"] = now
    new_doc["status_history"] = [{"status": "upcoming", "timestamp": now}]
    new_doc["snooze_until"] = None
    result = await db.notifications.insert_one(new_doc)
    new_doc["_id"] = result.inserted_id
    return serialize_doc(new_doc)


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    result = await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"is_read": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}


@router.put("/notifications/{notification_id}/unread")
async def mark_notification_unread(notification_id: str):
    result = await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"is_read": False, "status": "upcoming", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as unread"}


@router.put("/notifications/{notification_id}/checklist")
async def update_notification_checklist(notification_id: str, key: str = Query(...), checked: bool = Query(...)):
    notif = await db.notifications.find_one({"_id": ObjectId(notification_id)})
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    checklist = notif.get("checklist", [])
    for item in checklist:
        if item.get("key") == key:
            item["checked"] = checked
            break
    await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"checklist": checklist, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    updated = await db.notifications.find_one({"_id": ObjectId(notification_id)})
    return serialize_doc(updated)


@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str):
    notif = await db.notifications.find_one({"_id": ObjectId(notification_id)})
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notif.get("notification_type") == "moveout_checklist":
        checklist = notif.get("checklist", [])
        if checklist and not all(item.get("checked", False) for item in checklist):
            raise HTTPException(status_code=400, detail="All checklist items must be checked before deleting this notification")
    await db.notifications.delete_one({"_id": ObjectId(notification_id)})
    return {"message": "Notification deleted"}
