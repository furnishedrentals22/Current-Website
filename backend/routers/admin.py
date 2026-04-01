from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone, date
from bson import ObjectId

from database import db
from helpers import serialize_doc, parse_date
from schemas import TeamMemberCreate, PinSet, PinVerify
from core_logic import dates_overlap

router = APIRouter()


@router.get("/available-units")
async def get_available_units(start_date: Optional[str] = None, end_date: Optional[str] = None):
    all_units = await db.units.find().to_list(5000)
    all_tenants = await db.tenants.find().to_list(5000)
    all_properties = await db.properties.find().to_list(1000)
    prop_map = {str(p['_id']): p for p in all_properties}

    if not start_date or not end_date:
        today = date.today()
        result = []
        for unit in all_units:
            close = parse_date(unit['close_date']) if unit.get('close_date') else None
            if close and close <= today:
                continue
            prop = prop_map.get(unit.get('property_id', ''), {})
            result.append({
                'id': str(unit['_id']),
                'unit_number': unit.get('unit_number', ''),
                'property_name': prop.get('name', 'Unknown'),
                'property_id': unit.get('property_id', ''),
                'unit_size': unit.get('unit_size', '')
            })
        return result

    req_start = parse_date(start_date)
    req_end = parse_date(end_date)

    tenants_by_unit = {}
    for t in all_tenants:
        uid = t.get('unit_id', '')
        if uid not in tenants_by_unit:
            tenants_by_unit[uid] = []
        tenants_by_unit[uid].append({
            'move_in': parse_date(t['move_in_date']),
            'move_out': parse_date(t['move_out_date'])
        })

    available = []
    for unit in all_units:
        uid = str(unit['_id'])
        avail_start = parse_date(unit['availability_start_date'])
        close = parse_date(unit['close_date']) if unit.get('close_date') else None

        if req_start < avail_start:
            continue
        if close and req_end > close:
            continue

        has_conflict = False
        for tenant in tenants_by_unit.get(uid, []):
            if dates_overlap(req_start, req_end, tenant['move_in'], tenant['move_out']):
                has_conflict = True
                break

        if not has_conflict:
            prop = prop_map.get(unit.get('property_id', ''), {})
            available.append({
                'id': uid,
                'unit_number': unit.get('unit_number', ''),
                'property_name': prop.get('name', 'Unknown'),
                'property_id': unit.get('property_id', ''),
                'unit_size': unit.get('unit_size', '')
            })

    return available


@router.get("/dashboard")
async def get_dashboard():
    prop_count = await db.properties.count_documents({})
    unit_count = await db.units.count_documents({})
    tenant_count = await db.tenants.count_documents({})
    lead_count = await db.leads.count_documents({})
    unread_notif = await db.notifications.count_documents({"is_read": False})
    return {
        'properties_count': prop_count,
        'units_count': unit_count,
        'tenants_count': tenant_count,
        'leads_count': lead_count,
        'unread_notifications': unread_notif
    }


# ============================================================
# TEAM MEMBERS
# ============================================================

@router.get("/team-members")
async def list_team_members():
    docs = await db.team_members.find().sort("name", 1).to_list(1000)
    return [serialize_doc(d) for d in docs]


@router.post("/team-members")
async def create_team_member(data: TeamMemberCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.team_members.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.put("/team-members/{member_id}")
async def update_team_member(member_id: str, data: TeamMemberCreate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.team_members.update_one({"_id": ObjectId(member_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team member not found")
    doc = await db.team_members.find_one({"_id": ObjectId(member_id)})
    return serialize_doc(doc)


@router.delete("/team-members/{member_id}")
async def delete_team_member(member_id: str):
    result = await db.team_members.delete_one({"_id": ObjectId(member_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team member not found")
    return {"message": "Team member deleted"}


# ============================================================
# PIN MANAGEMENT
# ============================================================

HARD_PIN = "3401"

@router.get("/pins/status")
async def get_pin_status():
    config = await db.settings.find_one({"type": "pin_config"})
    return {
        "shared_pin_set": True,
        "level_1_pin_set": bool(config.get("level_1_pin")) if config else False,
        "level_2_pin_set": bool(config.get("level_2_pin")) if config else False,
        "level_3_pin_set": True,
    }


@router.post("/pins/set")
async def set_pin(data: PinSet):
    if data.admin_pin != HARD_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    if data.pin_type not in ("level_1", "level_2"):
        raise HTTPException(status_code=400, detail="Can only set PINs for level_1 and level_2")
    config = await db.settings.find_one({"type": "pin_config"})
    if not config:
        await db.settings.insert_one({"type": "pin_config"})
    field = f"{data.pin_type}_pin"
    await db.settings.update_one({"type": "pin_config"}, {"$set": {field: data.pin}})
    return {"message": f"PIN set for {data.pin_type}"}


@router.post("/pins/verify")
async def verify_pin(data: PinVerify):
    if data.pin_type in ("shared", "level_3"):
        return {"valid": data.pin == HARD_PIN}
    config = await db.settings.find_one({"type": "pin_config"})
    field = f"{data.pin_type}_pin"
    stored_pin = config.get(field, "") if config else ""
    if not stored_pin:
        return {"valid": False, "message": f"No PIN set for {data.pin_type}. Set one in PIN Settings."}
    return {"valid": data.pin == stored_pin}
