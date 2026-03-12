from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId

from database import db
from helpers import serialize_doc, parse_date
from schemas import PropertyCreate, UnitCreate

router = APIRouter()


# ============================================================
# PROPERTIES
# ============================================================

@router.get("/properties")
async def list_properties():
    docs = await db.properties.find().to_list(1000)

    def sort_key(d):
        bid = d.get('building_id')
        if bid is None:
            return (1, 0, d.get('name', ''))
        return (0, bid, d.get('name', ''))

    docs.sort(key=sort_key)
    return [serialize_doc(d) for d in docs]


@router.get("/properties/{property_id}")
async def get_property(property_id: str):
    doc = await db.properties.find_one({"_id": ObjectId(property_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Property not found")
    return serialize_doc(doc)


@router.post("/properties")
async def create_property(data: PropertyCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.properties.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.put("/properties/{property_id}")
async def update_property(property_id: str, data: PropertyCreate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.properties.update_one(
        {"_id": ObjectId(property_id)},
        {"$set": update_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    doc = await db.properties.find_one({"_id": ObjectId(property_id)})
    return serialize_doc(doc)


@router.delete("/properties/{property_id}")
async def delete_property(property_id: str):
    unit_count = await db.units.count_documents({"property_id": property_id})
    if unit_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete property with existing units. Remove units first.")
    result = await db.properties.delete_one({"_id": ObjectId(property_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    return {"message": "Property deleted"}


# ============================================================
# UNITS
# ============================================================

@router.get("/units")
async def list_units(property_id: Optional[str] = None):
    query = {}
    if property_id:
        query["property_id"] = property_id
    docs = await db.units.find(query).sort("unit_number", 1).to_list(1000)
    return [serialize_doc(d) for d in docs]


@router.get("/units/{unit_id}")
async def get_unit(unit_id: str):
    doc = await db.units.find_one({"_id": ObjectId(unit_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Unit not found")
    return serialize_doc(doc)


@router.post("/units")
async def create_unit(data: UnitCreate):
    prop = await db.properties.find_one({"_id": ObjectId(data.property_id)})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.units.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.put("/units/{unit_id}")
async def update_unit(unit_id: str, data: UnitCreate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.units.update_one(
        {"_id": ObjectId(unit_id)},
        {"$set": update_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Unit not found")
    doc = await db.units.find_one({"_id": ObjectId(unit_id)})
    return serialize_doc(doc)


@router.delete("/units/{unit_id}")
async def delete_unit(unit_id: str):
    tenant_count = await db.tenants.count_documents({"unit_id": unit_id})
    if tenant_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete unit with existing tenants. Remove tenants first.")
    result = await db.units.delete_one({"_id": ObjectId(unit_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Unit not found")
    return {"message": "Unit deleted"}
