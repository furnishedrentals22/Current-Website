from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from bson import ObjectId

from database import db
from helpers import serialize_doc
from schemas import ParkingSpotCreate, ParkingAssignmentCreate
from typing import Optional

router = APIRouter()


@router.get("/parking-spots")
async def list_parking_spots():
    docs = await db.parking_spots.find().sort("created_at", -1).to_list(1000)
    return [serialize_doc(d) for d in docs]


@router.get("/parking-spots/{spot_id}")
async def get_parking_spot(spot_id: str):
    doc = await db.parking_spots.find_one({"_id": ObjectId(spot_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Parking spot not found")
    return serialize_doc(doc)


@router.post("/parking-spots")
async def create_parking_spot(data: ParkingSpotCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.parking_spots.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.put("/parking-spots/{spot_id}")
async def update_parking_spot(spot_id: str, data: ParkingSpotCreate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.parking_spots.update_one({"_id": ObjectId(spot_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Parking spot not found")
    doc = await db.parking_spots.find_one({"_id": ObjectId(spot_id)})
    return serialize_doc(doc)


@router.delete("/parking-spots/{spot_id}")
async def delete_parking_spot(spot_id: str):
    await db.parking_assignments.delete_many({"parking_spot_id": spot_id})
    result = await db.parking_spots.delete_one({"_id": ObjectId(spot_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Parking spot not found")
    return {"message": "Parking spot deleted"}


@router.get("/parking-assignments")
async def list_parking_assignments(parking_spot_id: Optional[str] = None, active_only: Optional[bool] = None):
    query = {}
    if parking_spot_id:
        query["parking_spot_id"] = parking_spot_id
    if active_only is not None:
        query["is_active"] = active_only
    docs = await db.parking_assignments.find(query).sort("start_date", -1).to_list(1000)
    return [serialize_doc(d) for d in docs]


@router.post("/parking-assignments")
async def create_parking_assignment(data: ParkingAssignmentCreate):
    spot = await db.parking_spots.find_one({"_id": ObjectId(data.parking_spot_id)})
    if not spot:
        raise HTTPException(status_code=404, detail="Parking spot not found")

    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.parking_assignments.insert_one(doc)
    doc["_id"] = result.inserted_id

    if spot.get("spot_type") == "marlins_decal":
        now_str = datetime.now(timezone.utc).isoformat()
        await db.notifications.insert_one({
            "name": f"Collect Marlins Decal #{spot.get('decal_number', '')} from {data.tenant_name}",
            "property_id": data.property_id,
            "unit_id": data.unit_id,
            "reminder_date": data.end_date,
            "reminder_time": "10:00",
            "status": "upcoming",
            "notification_type": "parking",
            "related_entity_type": "parking_assignment",
            "related_entity_id": str(result.inserted_id),
            "tenant_id": data.tenant_id,
            "tenant_name": data.tenant_name,
            "message": f"Collect Marlins Decal #{spot.get('decal_number', '')} (Year: {spot.get('decal_year', '')}) from {data.tenant_name}",
            "notification_date": data.end_date,
            "is_read": False,
            "created_at": now_str,
            "updated_at": now_str
        })

    return serialize_doc(doc)


@router.put("/parking-assignments/{assignment_id}")
async def update_parking_assignment(assignment_id: str, data: ParkingAssignmentCreate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.parking_assignments.update_one({"_id": ObjectId(assignment_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Parking assignment not found")
    doc = await db.parking_assignments.find_one({"_id": ObjectId(assignment_id)})
    return serialize_doc(doc)


@router.delete("/parking-assignments/{assignment_id}")
async def delete_parking_assignment(assignment_id: str):
    result = await db.parking_assignments.delete_one({"_id": ObjectId(assignment_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Parking assignment not found")
    return {"message": "Parking assignment deleted"}
