from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from bson import ObjectId

from database import db
from helpers import serialize_doc
from schemas import MaintenancePersonnelCreate, MaintenanceRequestCreate

router = APIRouter()


# ============================================================
# MAINTENANCE PERSONNEL
# ============================================================

@router.get("/maintenance-personnel")
async def list_maintenance_personnel(include_archived: bool = False):
    query = {} if include_archived else {"$or": [{"is_archived": False}, {"is_archived": {"$exists": False}}]}
    docs = await db.maintenance_personnel.find(query).sort("name", 1).to_list(1000)
    return [serialize_doc(d) for d in docs]


@router.post("/maintenance-personnel")
async def create_maintenance_personnel(data: MaintenancePersonnelCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.maintenance_personnel.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.put("/maintenance-personnel/{person_id}")
async def update_maintenance_personnel(person_id: str, data: MaintenancePersonnelCreate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.maintenance_personnel.update_one(
        {"_id": ObjectId(person_id)}, {"$set": update_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Maintenance personnel not found")
    doc = await db.maintenance_personnel.find_one({"_id": ObjectId(person_id)})
    return serialize_doc(doc)


@router.delete("/maintenance-personnel/{person_id}")
async def delete_maintenance_personnel(person_id: str):
    result = await db.maintenance_personnel.delete_one({"_id": ObjectId(person_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Maintenance personnel not found")
    return {"message": "Maintenance personnel deleted"}


# ============================================================
# MAINTENANCE REQUESTS
# ============================================================

@router.get("/maintenance-requests")
async def list_maintenance_requests(include_completed: bool = False):
    query = {} if include_completed else {
        "$or": [{"is_completed": False}, {"is_completed": {"$exists": False}}]
    }
    docs = await db.maintenance_requests.find(query).sort("created_at", -1).to_list(5000)

    all_properties = {str(p["_id"]): p for p in await db.properties.find().to_list(1000)}
    all_units = {str(u["_id"]): u for u in await db.units.find().to_list(5000)}

    results = []
    for d in docs:
        s = serialize_doc(d)
        prop = all_properties.get(s.get("property_id") or "")
        unit = all_units.get(s.get("unit_id") or "")
        s["property_name"] = prop.get("name", "") if prop else ""
        s["unit_number"] = unit.get("unit_number", "") if unit else ""
        results.append(s)

    return results


@router.post("/maintenance-requests")
async def create_maintenance_request(data: MaintenanceRequestCreate):
    doc = data.model_dump()
    now = datetime.now(timezone.utc).isoformat()
    doc["created_at"] = now
    doc["updated_at"] = now
    result = await db.maintenance_requests.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.put("/maintenance-requests/{req_id}")
async def update_maintenance_request(req_id: str, data: MaintenanceRequestCreate):
    existing = await db.maintenance_requests.find_one({"_id": ObjectId(req_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Maintenance request not found")

    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Auto-set completed_at when first marked complete
    if data.is_completed and not existing.get("is_completed") and not update_doc.get("completed_at"):
        update_doc["completed_at"] = update_doc["updated_at"]

    await db.maintenance_requests.update_one({"_id": ObjectId(req_id)}, {"$set": update_doc})
    doc = await db.maintenance_requests.find_one({"_id": ObjectId(req_id)})
    return serialize_doc(doc)


@router.delete("/maintenance-requests/{req_id}")
async def delete_maintenance_request(req_id: str):
    result = await db.maintenance_requests.delete_one({"_id": ObjectId(req_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
    return {"message": "Maintenance request deleted"}
