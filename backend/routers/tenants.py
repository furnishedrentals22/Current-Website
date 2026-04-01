from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timezone, date, timedelta
from bson import ObjectId

from database import db
from helpers import serialize_doc, parse_date
from schemas import TenantCreate, MiscChargeCreate, DepositReturnRequest
from core_logic import validate_tenant_dates, calculate_airbnb_breakdown

router = APIRouter()


# ============================================================
# TENANTS
# ============================================================

@router.get("/tenants")
async def list_tenants(property_id: Optional[str] = None, unit_id: Optional[str] = None):
    query = {}
    if property_id:
        query["property_id"] = property_id
    if unit_id:
        query["unit_id"] = unit_id
    docs = await db.tenants.find(query).sort("move_in_date", -1).to_list(1000)
    return [serialize_doc(d) for d in docs]


@router.get("/tenants/pending-moveouts")
async def get_pending_moveouts():
    today_str = date.today().isoformat()
    docs = await db.tenants.find({
        "move_out_date": {"$lt": today_str},
        "$or": [
            {"moveout_confirmed": {"$exists": False}},
            {"moveout_confirmed": False}
        ]
    }).to_list(1000)
    return [serialize_doc(d) for d in docs]


@router.get("/tenants/{tenant_id}")
async def get_tenant(tenant_id: str):
    doc = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return serialize_doc(doc)


@router.post("/tenants")
async def create_tenant(data: TenantCreate):
    unit = await db.units.find_one({"_id": ObjectId(data.unit_id)})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    move_in = parse_date(data.move_in_date)
    move_out = parse_date(data.move_out_date)
    unit_avail = parse_date(unit["availability_start_date"])
    unit_close = parse_date(unit["close_date"]) if unit.get("close_date") else None

    existing_docs = await db.tenants.find({"unit_id": data.unit_id}).to_list(1000)
    existing_tenants = [
        {'id': str(t['_id']), 'move_in': parse_date(t['move_in_date']), 'move_out': parse_date(t['move_out_date'])}
        for t in existing_docs
    ]

    errors = validate_tenant_dates(move_in, move_out, unit_avail, unit_close, existing_tenants)
    if errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))

    doc = data.model_dump()

    if data.is_airbnb_vrbo and data.total_rent is not None:
        breakdown = calculate_airbnb_breakdown(move_in, move_out, data.total_rent)
        doc["total_nights"] = breakdown["total_nights"]
        doc["rent_per_night"] = breakdown["rent_per_night"]
        doc["monthly_breakdown"] = breakdown["monthly_breakdown"]

    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.tenants.insert_one(doc)
    doc["_id"] = result.inserted_id

    tenant_id_str = str(result.inserted_id)
    unit_doc = await db.units.find_one({"_id": ObjectId(data.unit_id)})
    unit_num = unit_doc.get("unit_number", "") if unit_doc else ""
    prop_doc = await db.properties.find_one({"_id": ObjectId(data.property_id)})
    prop_name = prop_doc.get("name", "") if prop_doc else ""
    now_str = datetime.now(timezone.utc).isoformat()

    # Auto-create door code update reminder on move-in day
    door_code = await db.door_codes.find_one({"unit_id": data.unit_id})
    if door_code:
        code_notif = {
            "name": f"Update Door Code - Unit {unit_num} ({prop_name})",
            "property_id": data.property_id,
            "unit_id": data.unit_id,
            "reminder_date": data.move_in_date,
            "reminder_time": "09:00",
            "status": "upcoming",
            "notification_type": "door_code",
            "related_entity_type": "door_code",
            "related_entity_id": str(door_code["_id"]),
            "tenant_id": tenant_id_str,
            "tenant_name": data.name,
            "message": f"Update door codes for {data.name} moving into Unit {unit_num}",
            "notification_date": data.move_in_date,
            "is_read": False,
            "created_at": now_str,
            "updated_at": now_str
        }
        await db.notifications.insert_one(code_notif)

    # Auto-create housekeeping + notifications for move-out
    if data.move_out_date:
        cleaning_doc = {
            "tenant_id": tenant_id_str,
            "tenant_name": data.name,
            "property_id": data.property_id,
            "unit_id": data.unit_id,
            "check_in_date": data.move_in_date,
            "check_out_date": data.move_out_date,
            "check_in_time": "", "check_out_time": "", "cleaning_time": "",
            "assigned_cleaner_id": None, "assigned_cleaner_name": "",
            "confirmed": False, "notes": "",
            "created_at": now_str, "updated_at": now_str
        }
        await db.cleaning_records.insert_one(cleaning_doc)

        move_out_dt = parse_date(data.move_out_date)
        confirm_date = (move_out_dt - timedelta(days=1)).isoformat()
        warn_date = (move_out_dt - timedelta(days=7)).isoformat()

        await db.notifications.insert_one({
            "name": f"Confirm housekeeping for Unit {unit_num} ({prop_name})",
            "property_id": data.property_id, "unit_id": data.unit_id,
            "reminder_date": confirm_date, "reminder_time": "09:00",
            "status": "upcoming", "priority": "high", "category": "housekeeping",
            "notification_type": "housekeeping", "related_entity_type": "tenant",
            "related_entity_id": tenant_id_str, "tenant_id": tenant_id_str,
            "tenant_name": data.name,
            "message": f"Confirm housekeeping scheduled for Unit {unit_num} after tenant checkout.",
            "notification_date": confirm_date, "is_read": False,
            "created_at": now_str, "updated_at": now_str
        })

        await db.notifications.insert_one({
            "name": f"No housekeeper assigned for Unit {unit_num} ({prop_name})",
            "property_id": data.property_id, "unit_id": data.unit_id,
            "reminder_date": warn_date, "reminder_time": "09:00",
            "status": "upcoming", "priority": "medium", "category": "housekeeping",
            "notification_type": "housekeeping_warning", "related_entity_type": "tenant",
            "related_entity_id": tenant_id_str, "tenant_id": tenant_id_str,
            "tenant_name": data.name,
            "message": f"No housekeeper assigned yet for Unit {unit_num} checkout.",
            "notification_date": warn_date, "is_read": False,
            "created_at": now_str, "updated_at": now_str
        })

        await db.notifications.insert_one({
            "name": f"Move-Out Checklist - {data.name} (Unit {unit_num})",
            "property_id": data.property_id, "unit_id": data.unit_id,
            "reminder_date": data.move_out_date, "reminder_time": "09:00",
            "status": "upcoming", "priority": "high", "category": "moveout",
            "notification_type": "moveout_checklist", "related_entity_type": "tenant",
            "related_entity_id": tenant_id_str, "tenant_id": tenant_id_str,
            "tenant_name": data.name,
            "message": f"Complete move-out checklist for {data.name} - Unit {unit_num} ({prop_name})",
            "notification_date": data.move_out_date, "is_read": False,
            "checklist": [
                {"key": "parking_returned", "label": "Parking Decal/Pass returned", "checked": False},
                {"key": "deposit_confirmed", "label": "Confirm deposit was returned or deducted", "checked": False},
                {"key": "doorcode_updated", "label": "Confirm doorcode was updated", "checked": False}
            ],
            "created_at": now_str, "updated_at": now_str
        })

    return serialize_doc(doc)


@router.put("/tenants/{tenant_id}")
async def update_tenant(tenant_id: str, data: TenantCreate):
    unit = await db.units.find_one({"_id": ObjectId(data.unit_id)})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    move_in = parse_date(data.move_in_date)
    move_out = parse_date(data.move_out_date)
    unit_avail = parse_date(unit["availability_start_date"])
    unit_close = parse_date(unit["close_date"]) if unit.get("close_date") else None

    existing_docs = await db.tenants.find({"unit_id": data.unit_id}).to_list(1000)
    existing_tenants = [
        {'id': str(t['_id']), 'move_in': parse_date(t['move_in_date']), 'move_out': parse_date(t['move_out_date'])}
        for t in existing_docs
    ]

    errors = validate_tenant_dates(move_in, move_out, unit_avail, unit_close, existing_tenants, exclude_tenant_id=tenant_id)
    if errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))

    update_doc = data.model_dump()

    if data.is_airbnb_vrbo and data.total_rent is not None:
        breakdown = calculate_airbnb_breakdown(move_in, move_out, data.total_rent)
        update_doc["total_nights"] = breakdown["total_nights"]
        update_doc["rent_per_night"] = breakdown["rent_per_night"]
        update_doc["monthly_breakdown"] = breakdown["monthly_breakdown"]

    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.tenants.update_one(
        {"_id": ObjectId(tenant_id)},
        {"$set": update_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tenant not found")

    await db.cleaning_records.update_many(
        {"tenant_id": tenant_id},
        {"$set": {"check_in_date": data.move_in_date, "check_out_date": data.move_out_date,
                  "tenant_name": data.name, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    if data.move_out_date:
        move_out_dt = parse_date(data.move_out_date)
        confirm_date = (move_out_dt - timedelta(days=1)).isoformat()
        warn_date = (move_out_dt - timedelta(days=7)).isoformat()
        unit_doc = await db.units.find_one({"_id": ObjectId(data.unit_id)})
        unit_num = unit_doc.get("unit_number", "") if unit_doc else ""
        prop_doc = await db.properties.find_one({"_id": ObjectId(data.property_id)})
        prop_name = prop_doc.get("name", "") if prop_doc else ""
        now = datetime.now(timezone.utc).isoformat()
        await db.notifications.update_many(
            {"tenant_id": tenant_id, "notification_type": "housekeeping"},
            {"$set": {"reminder_date": confirm_date, "notification_date": confirm_date,
                      "name": f"Confirm housekeeping for Unit {unit_num} ({prop_name})",
                      "tenant_name": data.name, "updated_at": now}}
        )
        await db.notifications.update_many(
            {"tenant_id": tenant_id, "notification_type": "housekeeping_warning"},
            {"$set": {"reminder_date": warn_date, "notification_date": warn_date,
                      "name": f"No housekeeper assigned for Unit {unit_num} ({prop_name})",
                      "tenant_name": data.name, "updated_at": now}}
        )
        await db.notifications.update_many(
            {"tenant_id": tenant_id, "notification_type": "moveout_checklist"},
            {"$set": {"reminder_date": data.move_out_date, "notification_date": data.move_out_date,
                      "name": f"Move-Out Checklist - {data.name} (Unit {unit_num})",
                      "tenant_name": data.name, "updated_at": now}}
        )

    doc = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    return serialize_doc(doc)


@router.delete("/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str):
    result = await db.tenants.delete_one({"_id": ObjectId(tenant_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tenant not found")
    await db.cleaning_records.delete_many({"tenant_id": tenant_id})
    await db.notifications.delete_many({"tenant_id": tenant_id})
    await db.misc_charges.delete_many({"tenant_id": tenant_id})
    await db.rent_payments.delete_many({"tenant_id": tenant_id})
    return {"message": "Tenant and all associated data deleted"}


@router.post("/tenants/{tenant_id}/confirm-moveout")
async def confirm_moveout(tenant_id: str):
    tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    now = datetime.now(timezone.utc).isoformat()
    confirmed_date = date.today().isoformat()

    await db.tenants.update_one(
        {"_id": ObjectId(tenant_id)},
        {"$set": {"moveout_confirmed": True, "moveout_confirmed_date": confirmed_date, "updated_at": now}}
    )

    if not tenant.get("is_airbnb_vrbo") and tenant.get("deposit_amount"):
        deposit_return_date = (date.today() + timedelta(days=3)).isoformat()
        await db.notifications.insert_one({
            "name": f"Deposit Return - {tenant.get('name', '')}",
            "property_id": tenant.get("property_id"),
            "unit_id": tenant.get("unit_id"),
            "reminder_date": deposit_return_date,
            "status": "upcoming",
            "notification_type": "deposit_return",
            "lead_id": None, "lead_name": "",
            "tenant_id": tenant_id,
            "tenant_name": tenant.get("name", ""),
            "stage_name": "Deposit Return",
            "notification_date": deposit_return_date,
            "message": f"Return deposit of ${tenant.get('deposit_amount', 0):,.2f} to {tenant.get('name', '')}",
            "is_read": False, "created_at": now, "updated_at": now
        })

    updated = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    return serialize_doc(updated)


@router.post("/tenants/{tenant_id}/extend-month")
async def extend_tenant_month(tenant_id: str):
    """Add 30 days to a M2M tenant's move-out date, keeping the same monthly rate."""
    tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if tenant.get("is_airbnb_vrbo"):
        raise HTTPException(status_code=400, detail="Cannot extend Airbnb/VRBO tenants")
    if not tenant.get("is_m2m"):
        raise HTTPException(status_code=400, detail="Tenant is not month-to-month")

    old_move_out = parse_date(tenant["move_out_date"])
    new_move_out = old_move_out + timedelta(days=30)
    new_move_out_str = new_move_out.isoformat()
    now = datetime.now(timezone.utc).isoformat()

    await db.tenants.update_one(
        {"_id": ObjectId(tenant_id)},
        {"$set": {"move_out_date": new_move_out_str, "updated_at": now}}
    )

    # Update cleaning records
    await db.cleaning_records.update_many(
        {"tenant_id": tenant_id},
        {"$set": {"check_out_date": new_move_out_str, "updated_at": now}}
    )

    # Update notifications tied to move-out
    unit_doc = await db.units.find_one({"_id": ObjectId(tenant["unit_id"])})
    unit_num = unit_doc.get("unit_number", "") if unit_doc else ""
    prop_doc = await db.properties.find_one({"_id": ObjectId(tenant["property_id"])})
    prop_name = prop_doc.get("name", "") if prop_doc else ""

    confirm_date = (new_move_out - timedelta(days=1)).isoformat()
    warn_date = (new_move_out - timedelta(days=7)).isoformat()
    tenant_name = tenant.get("name", "")

    await db.notifications.update_many(
        {"tenant_id": tenant_id, "notification_type": "housekeeping"},
        {"$set": {"reminder_date": confirm_date, "notification_date": confirm_date,
                  "name": f"Confirm housekeeping for Unit {unit_num} ({prop_name})",
                  "tenant_name": tenant_name, "updated_at": now}}
    )
    await db.notifications.update_many(
        {"tenant_id": tenant_id, "notification_type": "housekeeping_warning"},
        {"$set": {"reminder_date": warn_date, "notification_date": warn_date,
                  "name": f"No housekeeper assigned for Unit {unit_num} ({prop_name})",
                  "tenant_name": tenant_name, "updated_at": now}}
    )
    await db.notifications.update_many(
        {"tenant_id": tenant_id, "notification_type": "moveout_checklist"},
        {"$set": {"reminder_date": new_move_out_str, "notification_date": new_move_out_str,
                  "name": f"Move-Out Checklist - {tenant_name} (Unit {unit_num})",
                  "tenant_name": tenant_name, "updated_at": now}}
    )

    updated = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    return serialize_doc(updated)


# ============================================================
# MISC CHARGES (tenant sub-resource + global list)
# ============================================================

@router.post("/tenants/{tenant_id}/misc-charges")
async def create_misc_charge(tenant_id: str, data: MiscChargeCreate):
    tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "tenant_id": tenant_id,
        "tenant_name": tenant.get("name", ""),
        "unit_id": tenant.get("unit_id", ""),
        "property_id": tenant.get("property_id", ""),
        "amount": data.amount,
        "description": data.description,
        "charge_date": data.charge_date,
        "created_at": now,
        "updated_at": now
    }
    result = await db.misc_charges.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.get("/misc-charges")
async def list_misc_charges(tenant_id: Optional[str] = None):
    query = {}
    if tenant_id:
        query["tenant_id"] = tenant_id
    docs = await db.misc_charges.find(query).to_list(5000)
    return [serialize_doc(d) for d in docs]


@router.delete("/misc-charges/{charge_id}")
async def delete_misc_charge(charge_id: str):
    result = await db.misc_charges.delete_one({"_id": ObjectId(charge_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Charge not found")
    return {"message": "Misc charge deleted"}
