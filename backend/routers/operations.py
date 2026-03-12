from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, date, timedelta
from bson import ObjectId

from database import db
from helpers import serialize_doc, parse_date
from schemas import HousekeeperCreate, HousekeepingLeadCreate, CleaningRecordUpdate

router = APIRouter()


@router.get("/move-ins-outs")
async def list_move_ins_outs():
    today_str = date.today().isoformat()
    docs = await db.tenants.find({
        "$or": [
            {"move_in_date": {"$gte": today_str}},
            {"move_out_date": {"$gte": today_str}}
        ]
    }).to_list(5000)
    all_units = {str(u["_id"]): u for u in await db.units.find().to_list(5000)}
    all_props = {str(p["_id"]): p for p in await db.properties.find().to_list(1000)}
    results = []
    for d in docs:
        s = serialize_doc(d)
        unit = all_units.get(s.get("unit_id"))
        prop = all_props.get(s.get("property_id"))
        s["unit_number"] = unit.get("unit_number", "") if unit else ""
        s["property_name"] = prop.get("name", "") if prop else ""
        results.append(s)
    results.sort(key=lambda x: min(x.get("move_in_date", "9999"), x.get("move_out_date", "9999")))
    return results


# ============================================================
# HOUSEKEEPERS
# ============================================================

@router.get("/housekeepers")
async def list_housekeepers(include_archived: bool = False):
    query = {} if include_archived else {"$or": [{"is_archived": False}, {"is_archived": {"$exists": False}}]}
    docs = await db.housekeepers.find(query).sort("name", 1).to_list(1000)
    return [serialize_doc(d) for d in docs]


@router.post("/housekeepers")
async def create_housekeeper(data: HousekeeperCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.housekeepers.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.put("/housekeepers/{hk_id}")
async def update_housekeeper(hk_id: str, data: HousekeeperCreate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.housekeepers.update_one({"_id": ObjectId(hk_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Housekeeper not found")
    doc = await db.housekeepers.find_one({"_id": ObjectId(hk_id)})
    return serialize_doc(doc)


@router.delete("/housekeepers/{hk_id}")
async def delete_housekeeper(hk_id: str):
    result = await db.housekeepers.delete_one({"_id": ObjectId(hk_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Housekeeper not found")
    return {"message": "Housekeeper deleted"}


# ============================================================
# HOUSEKEEPING LEADS
# ============================================================

@router.get("/housekeeping-leads")
async def list_housekeeping_leads(include_archived: bool = False):
    query = {} if include_archived else {"$or": [{"is_archived": False}, {"is_archived": {"$exists": False}}]}
    docs = await db.housekeeping_leads.find(query).sort("name", 1).to_list(1000)
    return [serialize_doc(d) for d in docs]


@router.post("/housekeeping-leads")
async def create_housekeeping_lead(data: HousekeepingLeadCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.housekeeping_leads.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.put("/housekeeping-leads/{lead_id}")
async def update_housekeeping_lead(lead_id: str, data: HousekeepingLeadCreate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.housekeeping_leads.update_one({"_id": ObjectId(lead_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Housekeeping lead not found")
    doc = await db.housekeeping_leads.find_one({"_id": ObjectId(lead_id)})
    return serialize_doc(doc)


@router.delete("/housekeeping-leads/{lead_id}")
async def delete_housekeeping_lead(lead_id: str):
    result = await db.housekeeping_leads.delete_one({"_id": ObjectId(lead_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Housekeeping lead not found")
    return {"message": "Housekeeping lead deleted"}


# ============================================================
# CLEANING RECORDS
# ============================================================

@router.get("/cleaning-records")
async def list_cleaning_records(days: int = 60):
    today_str = date.today().isoformat()
    end_str = (date.today() + timedelta(days=days)).isoformat()

    tenants_in_range = await db.tenants.find({
        "move_out_date": {"$gte": today_str, "$lte": end_str}
    }).to_list(5000)

    existing_records = await db.cleaning_records.find().to_list(10000)
    existing_tenant_ids = {r.get("tenant_id") for r in existing_records}
    now_str = datetime.now(timezone.utc).isoformat()

    for tenant in tenants_in_range:
        tid = str(tenant["_id"])
        if tid not in existing_tenant_ids:
            await db.cleaning_records.insert_one({
                "tenant_id": tid,
                "tenant_name": tenant.get("name", ""),
                "property_id": tenant.get("property_id", ""),
                "unit_id": tenant.get("unit_id", ""),
                "check_in_date": tenant.get("move_in_date", ""),
                "check_out_date": tenant.get("move_out_date", ""),
                "check_in_time": "", "check_out_time": "", "cleaning_time": "",
                "assigned_cleaner_id": None, "assigned_cleaner_name": "",
                "confirmed": False, "notes": "",
                "created_at": now_str, "updated_at": now_str
            })

    docs = await db.cleaning_records.find({
        "check_out_date": {"$gte": today_str, "$lte": end_str}
    }).sort("check_out_date", 1).to_list(5000)

    all_tenants = await db.tenants.find().to_list(10000)
    unit_tenants = {}
    for t in all_tenants:
        uid = t.get("unit_id", "")
        if uid not in unit_tenants:
            unit_tenants[uid] = []
        unit_tenants[uid].append(t)

    results = []
    for d in docs:
        s = serialize_doc(d)
        checkout_date = s.get("check_out_date", "")
        unit_id = s.get("unit_id", "")

        next_checkin = None
        if unit_id and checkout_date:
            candidates = [
                t for t in unit_tenants.get(unit_id, [])
                if t.get("move_in_date", "") >= checkout_date and str(t["_id"]) != s.get("tenant_id")
            ]
            candidates.sort(key=lambda x: x.get("move_in_date", "9999"))
            if candidates:
                next_checkin = candidates[0]

        s["next_check_in_date"] = next_checkin.get("move_in_date", "") if next_checkin else ""
        s["next_check_in_tenant_name"] = next_checkin.get("name", "") if next_checkin else ""
        s["next_check_in_tenant_id"] = str(next_checkin["_id"]) if next_checkin else ""
        results.append(s)

    return results


@router.put("/cleaning-records/{record_id}")
async def update_cleaning_record(record_id: str, data: CleaningRecordUpdate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()

    old_record = await db.cleaning_records.find_one({"_id": ObjectId(record_id)})
    if not old_record:
        raise HTTPException(status_code=404, detail="Cleaning record not found")

    await db.cleaning_records.update_one({"_id": ObjectId(record_id)}, {"$set": update_doc})

    if data.assigned_cleaner_id and not old_record.get("assigned_cleaner_id"):
        tenant_id = old_record.get("tenant_id")
        if tenant_id:
            await db.notifications.update_many(
                {"tenant_id": tenant_id, "notification_type": "housekeeping_warning", "status": "upcoming"},
                {"$set": {"status": "done", "is_read": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )

    doc = await db.cleaning_records.find_one({"_id": ObjectId(record_id)})
    return serialize_doc(doc)
