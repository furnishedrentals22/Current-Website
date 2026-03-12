from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from bson import ObjectId

from database import db
from helpers import serialize_doc
from schemas import LeadCreate

router = APIRouter()

STAGE_NAMES = {
    1: "Contacted",
    2: "Showing Set",
    3: "Showing Complete",
    4: "Background Check Submitted",
    5: "Background Check Complete",
    6: "Lease Sent",
    7: "Lease Signed",
    8: "Deposit Submitted"
}


@router.get("/leads")
async def list_leads():
    docs = await db.leads.find().sort("created_at", -1).to_list(1000)
    return [serialize_doc(d) for d in docs]


@router.get("/lead-stages")
async def get_lead_stages():
    return STAGE_NAMES


@router.get("/leads/{lead_id}")
async def get_lead(lead_id: str):
    doc = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Lead not found")
    return serialize_doc(doc)


@router.post("/leads")
async def create_lead(data: LeadCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.leads.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, data: LeadCreate):
    if data.progress_stage == 2 and not data.showing_date:
        raise HTTPException(status_code=400, detail="Showing date is required when setting stage to 'Showing Set'")
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": update_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    doc = await db.leads.find_one({"_id": ObjectId(lead_id)})
    return serialize_doc(doc)


@router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str):
    result = await db.leads.delete_one({"_id": ObjectId(lead_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.notifications.delete_many({"lead_id": lead_id})
    return {"message": "Lead deleted"}
