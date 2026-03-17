from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from bson import ObjectId

from database import db
from helpers import serialize_doc
from schemas import MarlinsDecalCreate

router = APIRouter()


@router.get("/marlins-decals")
async def list_marlins_decals(property_id: str = None):
    query = {}
    if property_id:
        query["property_id"] = property_id
    docs = await db.marlins_decals.find(query).sort("decal_number", 1).to_list(1000)

    # Enrich with tenant assignments by querying tenants
    decal_ids = [str(d["_id"]) for d in docs]
    assigned_tenants = []
    if decal_ids:
        assigned_tenants = await db.tenants.find(
            {"marlins_decal_id": {"$in": decal_ids}}
        ).to_list(10000)

    tenant_by_decal = {}
    for t in assigned_tenants:
        did = t.get("marlins_decal_id")
        if did:
            tenant_by_decal[did] = {
                "id": str(t["_id"]),
                "name": t.get("name", ""),
                "unit_id": t.get("unit_id", "")
            }

    results = []
    for d in docs:
        s = serialize_doc(d)
        s["assigned_tenant"] = tenant_by_decal.get(s["id"])
        results.append(s)
    return results


@router.post("/marlins-decals")
async def create_marlins_decal(data: MarlinsDecalCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.marlins_decals.insert_one(doc)
    doc["_id"] = result.inserted_id
    s = serialize_doc(doc)
    s["assigned_tenant"] = None
    return s


@router.delete("/marlins-decals/{decal_id}")
async def delete_marlins_decal(decal_id: str):
    # Un-assign any tenant that holds this decal
    await db.tenants.update_many(
        {"marlins_decal_id": decal_id},
        {"$set": {"marlins_decal_id": None}}
    )
    result = await db.marlins_decals.delete_one({"_id": ObjectId(decal_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Decal not found")
    return {"message": "Decal deleted"}
