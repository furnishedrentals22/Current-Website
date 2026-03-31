from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, date, timedelta
from bson import ObjectId

from database import db
from helpers import serialize_doc
from schemas import ParkingSpotCreate, ParkingAssignmentCreate
from typing import Optional

router = APIRouter()


@router.get("/parking/timeline")
async def parking_timeline():
    spots = await db.parking_spots.find().sort("created_at", 1).to_list(1000)
    assignments = await db.parking_assignments.find().to_list(10000)

    tenant_ids = list({a["tenant_id"] for a in assignments if a.get("tenant_id")})
    tenants = []
    if tenant_ids:
        tenants = await db.tenants.find(
            {"_id": {"$in": [ObjectId(tid) for tid in tenant_ids]}}
        ).to_list(10000)
    tenant_map = {str(t["_id"]): t for t in tenants}

    unit_ids = list({t.get("unit_id") for t in tenants if t.get("unit_id")})
    units = []
    if unit_ids:
        units = await db.units.find(
            {"_id": {"$in": [ObjectId(uid) for uid in unit_ids]}}
        ).to_list(10000)
    unit_map = {str(u["_id"]): u for u in units}

    today = date.today()
    range_start = (today - timedelta(days=90)).replace(day=1)
    range_end = (today + timedelta(days=365))

    result_spots = []
    for spot in spots:
        spot_id = str(spot["_id"])
        spot_assignments = [a for a in assignments if a.get("parking_spot_id") == spot_id]

        enriched = []
        for a in spot_assignments:
            tenant = tenant_map.get(a.get("tenant_id"), {})
            unit = unit_map.get(tenant.get("unit_id"), {})
            enriched.append({
                "id": str(a["_id"]),
                "tenant_id": a.get("tenant_id", ""),
                "tenant_name": a.get("tenant_name", tenant.get("name", "")),
                "unit_number": unit.get("unit_number", ""),
                "property_name": "",
                "property_id": a.get("property_id", ""),
                "unit_id": a.get("unit_id", tenant.get("unit_id", "")),
                "start_date": a.get("start_date", ""),
                "end_date": a.get("end_date", ""),
                "notes": a.get("notes", ""),
                "is_active": a.get("is_active", True),
            })

        is_decal = spot.get("spot_type") == "marlins_decal"
        label = f"Decal #{spot.get('decal_number', '')}" if is_decal else f"Spot #{spot.get('spot_number', '')}"

        result_spots.append({
            "id": spot_id,
            "spot_type": spot.get("spot_type", "designated"),
            "label": label,
            "spot_number": spot.get("spot_number", ""),
            "decal_number": spot.get("decal_number", ""),
            "decal_year": spot.get("decal_year", ""),
            "location": spot.get("location", ""),
            "needs_tag": spot.get("needs_tag", False),
            "notes": spot.get("notes", ""),
            "assignments": enriched,
        })

    return {
        "range_start": range_start.isoformat(),
        "range_end": range_end.isoformat(),
        "today": today.isoformat(),
        "spots": result_spots,
    }


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
async def list_parking_assignments(
    parking_spot_id: Optional[str] = None,
    active_only: Optional[bool] = None,
    tenant_id: Optional[str] = None,
):
    query = {}
    if parking_spot_id:
        query["parking_spot_id"] = parking_spot_id
    if active_only is not None:
        query["is_active"] = active_only
    if tenant_id:
        query["tenant_id"] = tenant_id
    docs = await db.parking_assignments.find(query).sort("start_date", -1).to_list(1000)

    results = []
    for d in docs:
        s = serialize_doc(d)
        spot = await db.parking_spots.find_one({"_id": ObjectId(s.get("parking_spot_id", "000000000000000000000000"))})
        if spot:
            is_decal = spot.get("spot_type") == "marlins_decal"
            s["spot_label"] = f"Decal #{spot.get('decal_number', '')}" if is_decal else f"Spot #{spot.get('spot_number', '')}"
            s["spot_type"] = spot.get("spot_type", "designated")
        else:
            s["spot_label"] = "Unknown"
            s["spot_type"] = "unknown"
        results.append(s)
    return results


@router.post("/parking-assignments")
async def create_parking_assignment(data: ParkingAssignmentCreate):
    spot = await db.parking_spots.find_one({"_id": ObjectId(data.parking_spot_id)})
    if not spot:
        raise HTTPException(status_code=404, detail="Parking spot not found")

    # Check for overlapping assignments on the same spot
    overlaps = await db.parking_assignments.find({
        "parking_spot_id": data.parking_spot_id,
        "start_date": {"$lte": data.end_date},
        "end_date": {"$gte": data.start_date},
    }).to_list(100)
    if overlaps:
        names = ", ".join(a.get("tenant_name", "Unknown") for a in overlaps)
        raise HTTPException(status_code=409, detail=f"Conflict: this spot is already assigned to {names} during those dates")

    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.parking_assignments.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.put("/parking-assignments/{assignment_id}")
async def update_parking_assignment(assignment_id: str, data: ParkingAssignmentCreate):
    # Check for overlapping assignments on the same spot (excluding self)
    overlaps = await db.parking_assignments.find({
        "_id": {"$ne": ObjectId(assignment_id)},
        "parking_spot_id": data.parking_spot_id,
        "start_date": {"$lte": data.end_date},
        "end_date": {"$gte": data.start_date},
    }).to_list(100)
    if overlaps:
        names = ", ".join(a.get("tenant_name", "Unknown") for a in overlaps)
        raise HTTPException(status_code=409, detail=f"Conflict: this spot is already assigned to {names} during those dates")

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
