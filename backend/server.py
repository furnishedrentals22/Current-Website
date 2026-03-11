from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, date, timedelta
from bson import ObjectId
from calendar import monthrange

# Import core logic
from core_logic import (
    validate_tenant_dates,
    calculate_airbnb_breakdown,
    calculate_longterm_monthly_income,
    get_tenant_income_for_month,
    calculate_unit_vacancy_for_month,
    find_upcoming_vacancies,
    nights_in_month,
    get_months_in_range,
    days_in_month
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'property_management')]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============================================================
# HELPERS
# ============================================================
def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict."""
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if key == '_id':
            result['id'] = str(value)
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, date):
            result[key] = value.isoformat()
        elif isinstance(value, list):
            result[key] = [serialize_doc(item) if isinstance(item, dict) else item for item in value]
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        else:
            result[key] = value
    return result

def parse_date(date_str: str) -> date:
    """Parse ISO date string to date object."""
    if isinstance(date_str, date):
        return date_str
    return datetime.fromisoformat(date_str).date() if 'T' in date_str else date.fromisoformat(date_str)

# ============================================================
# PYDANTIC MODELS
# ============================================================
class PropertyCreate(BaseModel):
    name: str
    address: str
    owner_manager_name: str
    owner_manager_phone: str
    owner_manager_email: str
    available_parking: Optional[str] = ""
    pets_permitted: bool = False
    pet_notes: Optional[str] = ""
    building_amenities: List[str] = []
    additional_notes: Optional[str] = ""
    building_id: Optional[int] = None

class UnitCreate(BaseModel):
    property_id: str
    unit_number: str
    unit_size: str
    unit_size_custom: Optional[str] = ""
    base_rent: float
    additional_monthly_costs: List[Dict[str, Any]] = []
    availability_start_date: str
    close_date: Optional[str] = None

class TenantCreate(BaseModel):
    property_id: str
    unit_id: str
    name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    move_in_date: str
    move_out_date: str
    is_airbnb_vrbo: bool = False
    deposit_amount: Optional[float] = None
    deposit_date: Optional[str] = None
    monthly_rent: Optional[float] = None
    partial_first_month: Optional[float] = None
    partial_last_month: Optional[float] = None
    pets: Optional[str] = ""
    parking: Optional[str] = ""
    notes: Optional[str] = ""
    total_rent: Optional[float] = None
    # New fields
    payment_method: Optional[str] = ""       # Long-term: method of payment
    rent_due_date: Optional[str] = ""        # Long-term: day rent is due (e.g. "1st", "15th")
    moveout_confirmed: bool = False
    moveout_confirmed_date: Optional[str] = None
    # Deposit return fields (for past tenants)
    deposit_return_date: Optional[str] = None
    deposit_return_amount: Optional[float] = None
    deposit_return_method: Optional[str] = ""

class LeadCreate(BaseModel):
    name: str
    source: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    desired_start_date: Optional[str] = None
    desired_end_date: Optional[str] = None
    potential_unit_ids: List[str] = []
    pets: Optional[str] = ""
    parking_request: Optional[str] = ""
    lead_strength: int = 1
    progress_stage: int = 1
    showing_date: Optional[str] = None
    converted_to_tenant: bool = False
    tenant_id: Optional[str] = None
    # New fields
    price_offered: Optional[float] = None
    preferred_contact_method: Optional[str] = ""
    notes: Optional[str] = ""
    is_unassigned: bool = False
    unassigned_note: Optional[str] = ""

class NotificationCreate(BaseModel):
    name: Optional[str] = ""
    property_id: Optional[str] = None
    unit_id: Optional[str] = None
    assigned_person: Optional[str] = None
    reminder_date: Optional[str] = None
    reminder_time: Optional[str] = ""
    status: str = "upcoming"
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    recurrence_end_date: Optional[str] = None
    reminder_times: List[str] = []
    notes: Optional[str] = ""
    notification_type: Optional[str] = "manual"
    priority: Optional[str] = "medium"
    category: Optional[str] = "manual"
    snooze_until: Optional[str] = None
    status_history: List[Dict[str, Any]] = []
    related_entity_id: Optional[str] = None
    related_entity_type: Optional[str] = None
    lead_id: Optional[str] = None
    lead_name: Optional[str] = ""
    tenant_id: Optional[str] = None
    tenant_name: Optional[str] = ""
    stage_name: Optional[str] = ""
    notification_date: Optional[str] = None
    message: Optional[str] = ""

class BulkNotificationAction(BaseModel):
    ids: List[str]
    action: str
    new_status: Optional[str] = None

class SnoozeNotification(BaseModel):
    snooze_until_date: str
    snooze_until_time: Optional[str] = ""

class NoteCreate(BaseModel):
    title: str
    content: Optional[str] = ""
    color: Optional[str] = "default"

class TeamMemberCreate(BaseModel):
    name: str
    role: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""

class ParkingSpotCreate(BaseModel):
    spot_type: str
    location: Optional[str] = ""
    property_ids: List[str] = []
    spot_number: Optional[str] = ""
    parking_pass_number: Optional[str] = ""
    cost: Optional[float] = None
    notes: Optional[str] = ""
    decal_number: Optional[str] = ""
    decal_year: Optional[str] = ""

class ParkingAssignmentCreate(BaseModel):
    parking_spot_id: str
    tenant_id: str
    tenant_name: Optional[str] = ""
    property_id: Optional[str] = None
    unit_id: Optional[str] = None
    start_date: str
    end_date: str
    notes: Optional[str] = ""
    is_active: bool = True

class DoorCodeCreate(BaseModel):
    unit_id: str
    property_id: str
    admin_code: Optional[str] = ""
    admin_code_note: Optional[str] = ""
    housekeeping_code: Optional[str] = ""
    housekeeping_code_note: Optional[str] = ""
    guest_code: Optional[str] = ""
    guest_code_note: Optional[str] = ""
    backup_code_1: Optional[str] = ""
    backup_code_1_note: Optional[str] = ""
    backup_code_2: Optional[str] = ""
    backup_code_2_note: Optional[str] = ""

class LoginAccountCreate(BaseModel):
    account_name: str
    sensitivity_level: int = 1
    username: Optional[str] = ""
    password: Optional[str] = ""
    email: Optional[str] = ""
    url: Optional[str] = ""
    security_question_1: Optional[str] = ""
    security_answer_1: Optional[str] = ""
    security_question_2: Optional[str] = ""
    security_answer_2: Optional[str] = ""
    phone: Optional[str] = ""
    account_pin: Optional[str] = ""
    account_type: Optional[str] = ""
    notes: Optional[str] = ""

class MarketingLinkCreate(BaseModel):
    unit_id: str
    property_id: str
    airbnb_link: Optional[str] = ""
    furnished_finder_link: Optional[str] = ""
    photos_link: Optional[str] = ""
    additional_links: List[Dict[str, str]] = []

class PinVerify(BaseModel):
    pin: str
    pin_type: str = "shared"

class PinSet(BaseModel):
    pin: str
    pin_type: str = "shared"

class HousekeeperCreate(BaseModel):
    name: str
    contact: Optional[str] = ""
    availability: Optional[str] = ""
    preference: Optional[str] = ""
    pay: Optional[str] = ""
    notes: Optional[str] = ""
    is_archived: bool = False

class HousekeepingLeadCreate(BaseModel):
    name: str
    contact: Optional[str] = ""
    notes: Optional[str] = ""
    call_time: Optional[str] = ""
    interview_pay: Optional[str] = ""
    trial: Optional[str] = ""
    additional_notes: Optional[str] = ""
    is_archived: bool = False

class CleaningRecordUpdate(BaseModel):
    check_in_time: Optional[str] = ""
    check_out_time: Optional[str] = ""
    cleaning_time: Optional[str] = ""
    assigned_cleaner_id: Optional[str] = None
    assigned_cleaner_name: Optional[str] = ""
    confirmed: bool = False
    notes: Optional[str] = ""

# ============================================================
# PROPERTIES ENDPOINTS
# ============================================================
@api_router.get("/properties")
async def list_properties():
    docs = await db.properties.find().to_list(1000)
    # Sort by building_id ascending (None/missing last), then by name
    def sort_key(d):
        bid = d.get('building_id')
        if bid is None:
            return (1, 0, d.get('name', ''))
        return (0, bid, d.get('name', ''))
    docs.sort(key=sort_key)
    return [serialize_doc(d) for d in docs]

@api_router.get("/properties/{property_id}")
async def get_property(property_id: str):
    doc = await db.properties.find_one({"_id": ObjectId(property_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Property not found")
    return serialize_doc(doc)

@api_router.post("/properties")
async def create_property(data: PropertyCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.properties.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@api_router.put("/properties/{property_id}")
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

@api_router.delete("/properties/{property_id}")
async def delete_property(property_id: str):
    # Check if property has units
    unit_count = await db.units.count_documents({"property_id": property_id})
    if unit_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete property with existing units. Remove units first.")
    result = await db.properties.delete_one({"_id": ObjectId(property_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    return {"message": "Property deleted"}

# ============================================================
# UNITS ENDPOINTS
# ============================================================
@api_router.get("/units")
async def list_units(property_id: Optional[str] = None):
    query = {}
    if property_id:
        query["property_id"] = property_id
    docs = await db.units.find(query).sort("unit_number", 1).to_list(1000)
    return [serialize_doc(d) for d in docs]

@api_router.get("/units/{unit_id}")
async def get_unit(unit_id: str):
    doc = await db.units.find_one({"_id": ObjectId(unit_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Unit not found")
    return serialize_doc(doc)

@api_router.post("/units")
async def create_unit(data: UnitCreate):
    # Verify property exists
    prop = await db.properties.find_one({"_id": ObjectId(data.property_id)})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.units.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@api_router.put("/units/{unit_id}")
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

@api_router.delete("/units/{unit_id}")
async def delete_unit(unit_id: str):
    # Check for tenants
    tenant_count = await db.tenants.count_documents({"unit_id": unit_id})
    if tenant_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete unit with existing tenants. Remove tenants first.")
    result = await db.units.delete_one({"_id": ObjectId(unit_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Unit not found")
    return {"message": "Unit deleted"}

# ============================================================
# TENANTS ENDPOINTS
# ============================================================
@api_router.get("/tenants")
async def list_tenants(property_id: Optional[str] = None, unit_id: Optional[str] = None):
    query = {}
    if property_id:
        query["property_id"] = property_id
    if unit_id:
        query["unit_id"] = unit_id
    docs = await db.tenants.find(query).sort("move_in_date", -1).to_list(1000)
    return [serialize_doc(d) for d in docs]

@api_router.get("/tenants/pending-moveouts")
async def get_pending_moveouts():
    """Get tenants whose move_out_date has passed but moveout not confirmed."""
    today_str = date.today().isoformat()
    docs = await db.tenants.find({
        "move_out_date": {"$lte": today_str},
        "$or": [
            {"moveout_confirmed": {"$exists": False}},
            {"moveout_confirmed": False}
        ]
    }).to_list(1000)
    return [serialize_doc(d) for d in docs]

@api_router.get("/tenants/{tenant_id}")
async def get_tenant(tenant_id: str):
    doc = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return serialize_doc(doc)

@api_router.post("/tenants")
async def create_tenant(data: TenantCreate):
    # Get unit info
    unit = await db.units.find_one({"_id": ObjectId(data.unit_id)})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    move_in = parse_date(data.move_in_date)
    move_out = parse_date(data.move_out_date)
    unit_avail = parse_date(unit["availability_start_date"])
    unit_close = parse_date(unit["close_date"]) if unit.get("close_date") else None
    
    # Get existing tenants for this unit
    existing_docs = await db.tenants.find({"unit_id": data.unit_id}).to_list(1000)
    existing_tenants = []
    for t in existing_docs:
        existing_tenants.append({
            'id': str(t['_id']),
            'move_in': parse_date(t['move_in_date']),
            'move_out': parse_date(t['move_out_date'])
        })
    
    # Validate
    errors = validate_tenant_dates(move_in, move_out, unit_avail, unit_close, existing_tenants)
    if errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))
    
    doc = data.model_dump()
    
    # Calculate Airbnb breakdown if applicable
    if data.is_airbnb_vrbo and data.total_rent is not None:
        breakdown = calculate_airbnb_breakdown(move_in, move_out, data.total_rent)
        doc["total_nights"] = breakdown["total_nights"]
        doc["rent_per_night"] = breakdown["rent_per_night"]
        doc["monthly_breakdown"] = breakdown["monthly_breakdown"]
    
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.tenants.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    # Auto-create door code update reminder on move-in day
    door_code = await db.door_codes.find_one({"unit_id": data.unit_id})
    if door_code:
        unit_doc = await db.units.find_one({"_id": ObjectId(data.unit_id)})
        unit_num = unit_doc.get("unit_number", "") if unit_doc else ""
        prop_doc = await db.properties.find_one({"_id": ObjectId(data.property_id)})
        prop_name = prop_doc.get("name", "") if prop_doc else ""
        now_str = datetime.now(timezone.utc).isoformat()
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
            "tenant_id": str(result.inserted_id),
            "tenant_name": data.name,
            "message": f"Update door codes for {data.name} moving into Unit {unit_num}",
            "notification_date": data.move_in_date,
            "is_read": False,
            "created_at": now_str,
            "updated_at": now_str
        }
        await db.notifications.insert_one(code_notif)
    
    # Auto-create housekeeping cleaning record + notifications for move-out
    if data.move_out_date:
        unit_doc2 = await db.units.find_one({"_id": ObjectId(data.unit_id)})
        unit_num2 = unit_doc2.get("unit_number", "") if unit_doc2 else ""
        prop_doc2 = await db.properties.find_one({"_id": ObjectId(data.property_id)})
        prop_name2 = prop_doc2.get("name", "") if prop_doc2 else ""
        now_hk = datetime.now(timezone.utc).isoformat()
        tenant_id_str = str(result.inserted_id)
        
        # Create cleaning record
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
            "created_at": now_hk, "updated_at": now_hk
        }
        await db.cleaning_records.insert_one(cleaning_doc)
        
        move_out_dt = parse_date(data.move_out_date)
        
        # Notification 1: Housekeeping confirmation (1 day before move-out)
        confirm_date = (move_out_dt - timedelta(days=1)).isoformat()
        hk_confirm_notif = {
            "name": f"Confirm housekeeping for Unit {unit_num2} ({prop_name2})",
            "property_id": data.property_id,
            "unit_id": data.unit_id,
            "reminder_date": confirm_date,
            "reminder_time": "09:00",
            "status": "upcoming",
            "priority": "high",
            "category": "housekeeping",
            "notification_type": "housekeeping",
            "related_entity_type": "tenant",
            "related_entity_id": tenant_id_str,
            "tenant_id": tenant_id_str,
            "tenant_name": data.name,
            "message": f"Confirm housekeeping scheduled for Unit {unit_num2} after tenant checkout.",
            "notification_date": confirm_date,
            "is_read": False,
            "created_at": now_hk, "updated_at": now_hk
        }
        await db.notifications.insert_one(hk_confirm_notif)
        
        # Notification 2: Missing housekeeper warning (7 days before move-out)
        warn_date = (move_out_dt - timedelta(days=7)).isoformat()
        hk_warn_notif = {
            "name": f"No housekeeper assigned for Unit {unit_num2} ({prop_name2})",
            "property_id": data.property_id,
            "unit_id": data.unit_id,
            "reminder_date": warn_date,
            "reminder_time": "09:00",
            "status": "upcoming",
            "priority": "medium",
            "category": "housekeeping",
            "notification_type": "housekeeping_warning",
            "related_entity_type": "tenant",
            "related_entity_id": tenant_id_str,
            "tenant_id": tenant_id_str,
            "tenant_name": data.name,
            "message": f"No housekeeper assigned yet for Unit {unit_num2} checkout.",
            "notification_date": warn_date,
            "is_read": False,
            "created_at": now_hk, "updated_at": now_hk
        }
        await db.notifications.insert_one(hk_warn_notif)
    
    return serialize_doc(doc)

@api_router.put("/tenants/{tenant_id}")
async def update_tenant(tenant_id: str, data: TenantCreate):
    unit = await db.units.find_one({"_id": ObjectId(data.unit_id)})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    move_in = parse_date(data.move_in_date)
    move_out = parse_date(data.move_out_date)
    unit_avail = parse_date(unit["availability_start_date"])
    unit_close = parse_date(unit["close_date"]) if unit.get("close_date") else None
    
    existing_docs = await db.tenants.find({"unit_id": data.unit_id}).to_list(1000)
    existing_tenants = []
    for t in existing_docs:
        existing_tenants.append({
            'id': str(t['_id']),
            'move_in': parse_date(t['move_in_date']),
            'move_out': parse_date(t['move_out_date'])
        })
    
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
    
    # Update cleaning record dates if move-out changed
    old_tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    await db.cleaning_records.update_many(
        {"tenant_id": tenant_id},
        {"$set": {"check_in_date": data.move_in_date, "check_out_date": data.move_out_date,
                  "tenant_name": data.name, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Update housekeeping notification dates
    if data.move_out_date:
        move_out_dt = parse_date(data.move_out_date)
        confirm_date = (move_out_dt - timedelta(days=1)).isoformat()
        warn_date = (move_out_dt - timedelta(days=7)).isoformat()
        unit_doc = await db.units.find_one({"_id": ObjectId(data.unit_id)})
        unit_num = unit_doc.get("unit_number", "") if unit_doc else ""
        prop_doc = await db.properties.find_one({"_id": ObjectId(data.property_id)})
        prop_name = prop_doc.get("name", "") if prop_doc else ""
        await db.notifications.update_many(
            {"tenant_id": tenant_id, "notification_type": "housekeeping"},
            {"$set": {"reminder_date": confirm_date, "notification_date": confirm_date,
                      "name": f"Confirm housekeeping for Unit {unit_num} ({prop_name})",
                      "tenant_name": data.name, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        await db.notifications.update_many(
            {"tenant_id": tenant_id, "notification_type": "housekeeping_warning"},
            {"$set": {"reminder_date": warn_date, "notification_date": warn_date,
                      "name": f"No housekeeper assigned for Unit {unit_num} ({prop_name})",
                      "tenant_name": data.name, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    doc = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    return serialize_doc(doc)

@api_router.delete("/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str):
    result = await db.tenants.delete_one({"_id": ObjectId(tenant_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tenant not found")
    # Clean up associated records
    await db.cleaning_records.delete_many({"tenant_id": tenant_id})
    await db.notifications.delete_many({"tenant_id": tenant_id, "notification_type": {"$in": ["housekeeping", "housekeeping_warning"]}})
    return {"message": "Tenant deleted"}

@api_router.post("/tenants/{tenant_id}/confirm-moveout")
async def confirm_moveout(tenant_id: str):
    """Confirm a tenant has moved out. Creates deposit return notification for long-term tenants."""
    tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    now = datetime.now(timezone.utc).isoformat()
    confirmed_date = date.today().isoformat()
    
    await db.tenants.update_one(
        {"_id": ObjectId(tenant_id)},
        {"$set": {
            "moveout_confirmed": True,
            "moveout_confirmed_date": confirmed_date,
            "updated_at": now
        }}
    )
    
    # For long-term tenants with a deposit, create a deposit return reminder notification
    if not tenant.get("is_airbnb_vrbo") and tenant.get("deposit_amount"):
        deposit_return_date = (date.today() + timedelta(days=3)).isoformat()
        notif_doc = {
            "name": f"Deposit Return - {tenant.get('name', '')}",
            "property_id": tenant.get("property_id"),
            "unit_id": tenant.get("unit_id"),
            "reminder_date": deposit_return_date,
            "status": "upcoming",
            "notification_type": "deposit_return",
            "lead_id": None,
            "lead_name": "",
            "tenant_id": tenant_id,
            "tenant_name": tenant.get("name", ""),
            "stage_name": "Deposit Return",
            "notification_date": deposit_return_date,
            "message": f"Return deposit of ${tenant.get('deposit_amount', 0):,.2f} to {tenant.get('name', '')}",
            "is_read": False,
            "created_at": now,
            "updated_at": now
        }
        await db.notifications.insert_one(notif_doc)
    
    updated = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    return serialize_doc(updated)

# ============================================================
# LEADS ENDPOINTS
# ============================================================
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

@api_router.get("/leads")
async def list_leads():
    docs = await db.leads.find().sort("created_at", -1).to_list(1000)
    return [serialize_doc(d) for d in docs]

@api_router.get("/leads/{lead_id}")
async def get_lead(lead_id: str):
    doc = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Lead not found")
    return serialize_doc(doc)

@api_router.post("/leads")
async def create_lead(data: LeadCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.leads.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@api_router.put("/leads/{lead_id}")
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

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str):
    result = await db.leads.delete_one({"_id": ObjectId(lead_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    # Also delete associated notifications
    await db.notifications.delete_many({"lead_id": lead_id})
    return {"message": "Lead deleted"}

@api_router.get("/lead-stages")
async def get_lead_stages():
    return STAGE_NAMES

# ============================================================
# NOTIFICATIONS ENDPOINTS (Full-featured)
# ============================================================
@api_router.get("/notifications")
async def list_notifications(status: Optional[str] = None, priority: Optional[str] = None,
                              category: Optional[str] = None, property_id: Optional[str] = None,
                              assigned_person: Optional[str] = None):
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

@api_router.post("/notifications")
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

@api_router.put("/notifications/{notification_id}")
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

@api_router.put("/notifications/{notification_id}/status")
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

@api_router.post("/notifications/{notification_id}/snooze")
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
            "status": "upcoming",
            "is_read": False,
            "updated_at": now
        },
         "$push": {"status_history": {"status": "snoozed", "timestamp": now, "snoozed_to": data.snooze_until_date}}}
    )
    updated = await db.notifications.find_one({"_id": ObjectId(notification_id)})
    return serialize_doc(updated)

@api_router.post("/notifications/{notification_id}/duplicate")
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

@api_router.post("/notifications/bulk-action")
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

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    result = await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"is_read": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}

@api_router.put("/notifications/{notification_id}/unread")
async def mark_notification_unread(notification_id: str):
    result = await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"is_read": False, "status": "upcoming", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as unread"}

@api_router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str):
    result = await db.notifications.delete_one({"_id": ObjectId(notification_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}

# ============================================================
# INCOME CALCULATION ENDPOINT
# ============================================================
@api_router.get("/income")
async def get_income(year: int = Query(default=None)):
    if year is None:
        year = datetime.now().year
    
    # Get all tenants
    all_tenants = await db.tenants.find().to_list(5000)
    all_units = await db.units.find().to_list(5000)
    all_properties = await db.properties.find().to_list(1000)
    
    # Build lookup maps
    unit_map = {str(u['_id']): u for u in all_units}
    prop_map = {str(p['_id']): p for p in all_properties}
    
    months_data = []
    yearly_total = 0.0
    
    for month in range(1, 13):
        month_total = 0.0
        properties_breakdown = {}
        
        for tenant in all_tenants:
            move_in = parse_date(tenant['move_in_date'])
            move_out = parse_date(tenant['move_out_date'])
            
            # Check if tenant is active this month
            month_start = date(year, month, 1)
            month_end = date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)
            
            if move_in >= month_end or move_out <= month_start:
                continue
            
            unit_id = tenant.get('unit_id', '')
            unit = unit_map.get(unit_id, {})
            prop_id = tenant.get('property_id', '')
            prop = prop_map.get(prop_id, {})
            
            # Calculate income for this tenant this month
            tenant_data = {
                'move_in': move_in,
                'move_out': move_out,
                'is_airbnb_vrbo': tenant.get('is_airbnb_vrbo', False),
                'monthly_rent': tenant.get('monthly_rent', 0),
                'additional_monthly_costs': unit.get('additional_monthly_costs', []),
                'partial_first_month': tenant.get('partial_first_month'),
                'partial_last_month': tenant.get('partial_last_month'),
                'monthly_breakdown': tenant.get('monthly_breakdown', [])
            }
            
            income = get_tenant_income_for_month(tenant_data, year, month)
            
            if income > 0:
                month_total += income
                
                if prop_id not in properties_breakdown:
                    properties_breakdown[prop_id] = {
                        'property_name': prop.get('name', 'Unknown'),
                        'property_id': prop_id,
                        'total': 0.0,
                        'units': {}
                    }
                properties_breakdown[prop_id]['total'] += income
                
                if unit_id not in properties_breakdown[prop_id]['units']:
                    properties_breakdown[prop_id]['units'][unit_id] = {
                        'unit_number': unit.get('unit_number', 'Unknown'),
                        'unit_id': unit_id,
                        'total': 0.0,
                        'tenants': []
                    }
                properties_breakdown[prop_id]['units'][unit_id]['total'] += income
                properties_breakdown[prop_id]['units'][unit_id]['tenants'].append({
                    'tenant_id': str(tenant['_id']),
                    'tenant_name': tenant.get('name', 'Unknown'),
                    'is_airbnb': tenant.get('is_airbnb_vrbo', False),
                    'income': round(income, 2)
                })
        
        # Convert units dict to list for JSON
        properties_list = []
        for pid, pdata in properties_breakdown.items():
            units_list = list(pdata['units'].values())
            for u in units_list:
                u['total'] = round(u['total'], 2)
            properties_list.append({
                'property_name': pdata['property_name'],
                'property_id': pdata['property_id'],
                'total': round(pdata['total'], 2),
                'units': units_list
            })
        
        months_data.append({
            'month': month,
            'year': year,
            'total': round(month_total, 2),
            'properties': properties_list
        })
        yearly_total += month_total
    
    # Get current month total
    current_month = datetime.now().month
    current_month_total = 0.0
    if year == datetime.now().year:
        for m in months_data:
            if m['month'] == current_month:
                current_month_total = m['total']
                break
    
    return {
        'year': year,
        'yearly_total': round(yearly_total, 2),
        'current_month_total': round(current_month_total, 2),
        'months': months_data
    }

# ============================================================
# VACANCY CALCULATION ENDPOINT
# ============================================================
@api_router.get("/vacancy")
async def get_vacancy(year: int = Query(default=None)):
    if year is None:
        year = datetime.now().year
    
    all_tenants = await db.tenants.find().to_list(5000)
    all_units = await db.units.find().to_list(5000)
    all_properties = await db.properties.find().to_list(1000)
    
    prop_map = {str(p['_id']): p for p in all_properties}
    
    # Group tenants by unit
    tenants_by_unit = {}
    for t in all_tenants:
        uid = t.get('unit_id', '')
        if uid not in tenants_by_unit:
            tenants_by_unit[uid] = []
        tenants_by_unit[uid].append({
            'move_in': parse_date(t['move_in_date']),
            'move_out': parse_date(t['move_out_date']),
            'name': t.get('name', '')
        })
    
    # By Building (monthly)
    by_building = {}
    # By Unit Size
    by_unit_size = {}
    
    for unit in all_units:
        unit_id = str(unit['_id'])
        prop_id = unit.get('property_id', '')
        prop = prop_map.get(prop_id, {})
        prop_name = prop.get('name', 'Unknown')
        unit_size = unit.get('unit_size', 'unknown')
        if unit_size == 'other':
            unit_size = unit.get('unit_size_custom', 'other')
        unit_avail = parse_date(unit['availability_start_date'])
        unit_close = parse_date(unit['close_date']) if unit.get('close_date') else None
        unit_tenants = tenants_by_unit.get(unit_id, [])
        
        for month in range(1, 13):
            vacancy = calculate_unit_vacancy_for_month(
                unit_tenants, year, month, unit_avail, unit_close
            )
            
            # By building
            if prop_id not in by_building:
                by_building[prop_id] = {
                    'property_name': prop_name,
                    'property_id': prop_id,
                    'months': {m: {'total_days': 0, 'vacant_days': 0, 'units': []} for m in range(1, 13)}
                }
            by_building[prop_id]['months'][month]['total_days'] += vacancy['total_days']
            by_building[prop_id]['months'][month]['vacant_days'] += vacancy['vacant_days']
            by_building[prop_id]['months'][month]['units'].append({
                'unit_id': unit_id,
                'unit_number': unit.get('unit_number', ''),
                'vacant_days': vacancy['vacant_days'],
                'total_days': vacancy['total_days'],
                'vacancy_pct': vacancy['vacancy_pct']
            })
            
            # By unit size
            if unit_size not in by_unit_size:
                by_unit_size[unit_size] = {
                    'unit_size': unit_size,
                    'months': {m: {'total_days': 0, 'vacant_days': 0} for m in range(1, 13)}
                }
            by_unit_size[unit_size]['months'][month]['total_days'] += vacancy['total_days']
            by_unit_size[unit_size]['months'][month]['vacant_days'] += vacancy['vacant_days']
    
    # Calculate percentages for by_building
    building_list = []
    for bid, bdata in by_building.items():
        months_list = []
        for m in range(1, 13):
            md = bdata['months'][m]
            pct = (md['vacant_days'] / md['total_days'] * 100) if md['total_days'] > 0 else 0
            months_list.append({
                'month': m,
                'total_days': md['total_days'],
                'vacant_days': md['vacant_days'],
                'vacancy_pct': round(pct, 2),
                'units': md['units']
            })
        building_list.append({
            'property_name': bdata['property_name'],
            'property_id': bdata['property_id'],
            'months': months_list
        })
    
    # Calculate percentages for by_unit_size
    size_list = []
    for size_key, sdata in by_unit_size.items():
        months_list = []
        for m in range(1, 13):
            md = sdata['months'][m]
            pct = (md['vacant_days'] / md['total_days'] * 100) if md['total_days'] > 0 else 0
            months_list.append({
                'month': m,
                'total_days': md['total_days'],
                'vacant_days': md['vacant_days'],
                'vacancy_pct': round(pct, 2)
            })
        size_list.append({
            'unit_size': sdata['unit_size'],
            'months': months_list
        })
    
    # Upcoming vacancies (next 3 months)
    today = date.today()
    units_for_upcoming = []
    for unit in all_units:
        uid = str(unit['_id'])
        prop_id = unit.get('property_id', '')
        prop = prop_map.get(prop_id, {})
        units_for_upcoming.append({
            'unit_id': uid,
            'unit_number': unit.get('unit_number', ''),
            'property_name': prop.get('name', 'Unknown'),
            'property_id': prop_id,
            'availability_start_date': parse_date(unit['availability_start_date']),
            'close_date': parse_date(unit['close_date']) if unit.get('close_date') else None,
            'tenants': tenants_by_unit.get(uid, [])
        })
    
    upcoming = find_upcoming_vacancies(units_for_upcoming, today, months_ahead=3)
    # Serialize dates in upcoming
    for v in upcoming:
        v['vacancy_start'] = v['vacancy_start'].isoformat()
        if 'vacancy_end' in v:
            v['vacancy_end'] = v['vacancy_end'].isoformat()
    
    return {
        'year': year,
        'by_building': building_list,
        'by_unit_size': size_list,
        'upcoming_vacancies': upcoming
    }

# ============================================================
# CALENDAR ENDPOINT (legacy day-by-day)
# ============================================================
@api_router.get("/calendar")
async def get_calendar(year: int = Query(default=None)):
    if year is None:
        year = datetime.now().year
    
    all_tenants = await db.tenants.find().to_list(5000)
    all_units = await db.units.find().to_list(5000)
    all_properties = await db.properties.find().to_list(1000)
    all_leads = await db.leads.find().to_list(1000)
    
    prop_map = {str(p['_id']): p for p in all_properties}
    unit_map = {str(u['_id']): u for u in all_units}
    
    # Build calendar data grouped by property
    properties_data = []
    
    for prop in all_properties:
        prop_id = str(prop['_id'])
        prop_units = [u for u in all_units if u.get('property_id') == prop_id]
        
        units_data = []
        for unit in prop_units:
            unit_id = str(unit['_id'])
            unit_tenants = [t for t in all_tenants if t.get('unit_id') == unit_id]
            
            # Build day-by-day data for each month
            months_data = []
            for month in range(1, 13):
                num_days = days_in_month(year, month)
                days_data = []
                
                for day in range(1, num_days + 1):
                    current_date = date(year, month, day)
                    day_info = {
                        'day': day,
                        'date': current_date.isoformat(),
                        'status': 'vacant',
                        'tenant_name': None,
                        'lead_names': []
                    }
                    
                    # Check tenant occupancy
                    for tenant in unit_tenants:
                        t_in = parse_date(tenant['move_in_date'])
                        t_out = parse_date(tenant['move_out_date'])
                        if t_in <= current_date < t_out:
                            day_info['status'] = 'occupied'
                            day_info['tenant_name'] = tenant.get('name', '')
                            if tenant.get('is_airbnb_vrbo'):
                                day_info['status'] = 'airbnb'
                            break
                    
                    # Check lead overlays
                    for lead in all_leads:
                        if unit_id in lead.get('potential_unit_ids', []):
                            l_start = parse_date(lead['desired_start_date']) if lead.get('desired_start_date') else None
                            l_end = parse_date(lead['desired_end_date']) if lead.get('desired_end_date') else None
                            if l_start and l_end and l_start <= current_date <= l_end:
                                day_info['lead_names'].append(lead.get('name', ''))
                    
                    days_data.append(day_info)
                
                months_data.append({
                    'month': month,
                    'days': days_data
                })
            
            units_data.append({
                'unit_id': unit_id,
                'unit_number': unit.get('unit_number', ''),
                'unit_size': unit.get('unit_size', ''),
                'months': months_data
            })
        
        properties_data.append({
            'property_id': prop_id,
            'property_name': prop.get('name', ''),
            'units': units_data
        })
    
    return {
        'year': year,
        'properties': properties_data
    }

# ============================================================
# CALENDAR TIMELINE ENDPOINT (segment-based)
# ============================================================
@api_router.get("/calendar/timeline")
async def get_calendar_timeline(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    property_id: Optional[str] = None
):
    """Return tenant bookings and lead segments per unit for timeline view.
    
    Defaults: 3 months before today → 15 months after today.
    Returns segments (not day-by-day) for efficient rendering.
    """
    today = date.today()
    if start_date:
        range_start = parse_date(start_date)
    else:
        # 3 months back
        m = today.month - 3
        y = today.year
        while m < 1:
            m += 12
            y -= 1
        range_start = date(y, m, 1)
    
    if end_date:
        range_end = parse_date(end_date)
    else:
        # 15 months forward
        m = today.month + 15
        y = today.year
        while m > 12:
            m -= 12
            y += 1
        # Last day of that month
        range_end = date(y, m, days_in_month(y, m))
    
    # Fetch data
    query = {}
    if property_id:
        query["property_id"] = property_id
    
    all_properties = await db.properties.find().to_list(1000)
    all_units = await db.units.find(query if property_id else {}).to_list(5000)
    all_tenants = await db.tenants.find().to_list(5000)
    all_leads = await db.leads.find({"converted_to_tenant": {"$ne": True}}).to_list(1000)
    
    if property_id:
        all_properties = [p for p in all_properties if str(p['_id']) == property_id]
    
    prop_map = {str(p['_id']): p for p in all_properties}
    
    properties_data = []
    for prop in all_properties:
        pid = str(prop['_id'])
        prop_units = [u for u in all_units if u.get('property_id') == pid]
        
        units_data = []
        for unit in prop_units:
            uid = str(unit['_id'])
            
            # Tenant bookings overlapping our range
            bookings = []
            unit_tenants = [t for t in all_tenants if t.get('unit_id') == uid]
            for t in unit_tenants:
                t_in = parse_date(t['move_in_date'])
                t_out = parse_date(t['move_out_date'])
                # Check overlap with visible range
                if t_in >= range_end or t_out <= range_start:
                    continue
                
                # Determine rent amount to display
                rent_amount = None
                if t.get('is_airbnb_vrbo'):
                    rent_amount = t.get('total_rent')
                else:
                    rent_amount = t.get('monthly_rent')
                
                bookings.append({
                    'tenant_id': str(t['_id']),
                    'name': t.get('name', ''),
                    'start_date': t_in.isoformat(),
                    'end_date': t_out.isoformat(),
                    'is_airbnb_vrbo': t.get('is_airbnb_vrbo', False),
                    'rent_amount': rent_amount
                })
            
            # Sort bookings by start date
            bookings.sort(key=lambda b: b['start_date'])
            
            # Lead overlays overlapping our range
            leads_segments = []
            for lead in all_leads:
                if uid not in lead.get('potential_unit_ids', []):
                    continue
                l_start_str = lead.get('desired_start_date')
                l_end_str = lead.get('desired_end_date')
                if not l_start_str or not l_end_str:
                    continue
                l_start = parse_date(l_start_str)
                l_end = parse_date(l_end_str)
                # Check overlap with visible range
                if l_start > range_end or l_end < range_start:
                    continue
                
                leads_segments.append({
                    'lead_id': str(lead['_id']),
                    'name': lead.get('name', ''),
                    'start_date': l_start.isoformat(),
                    'end_date': l_end.isoformat(),
                    'rent_amount': lead.get('price_offered'),
                    'strength': lead.get('lead_strength', 1)
                })
            
            leads_segments.sort(key=lambda l: l['start_date'])
            
            units_data.append({
                'unit_id': uid,
                'unit_number': unit.get('unit_number', ''),
                'unit_size': unit.get('unit_size', ''),
                'base_rent': unit.get('base_rent', 0),
                'bookings': bookings,
                'leads': leads_segments
            })
        
        # Sort units by unit number numerically
        def numeric_unit_sort(u):
            try:
                return int(u['unit_number'])
            except (ValueError, TypeError):
                return float('inf')
        units_data.sort(key=numeric_unit_sort)
        
        properties_data.append({
            'property_id': pid,
            'property_name': prop.get('name', ''),
            'building_id': prop.get('building_id'),
            'units': units_data
        })
    
    # Sort properties by building_id ascending (None last)
    def prop_sort_key(p):
        bid = p.get('building_id')
        if bid is None:
            return (1, 0, p.get('property_name', ''))
        return (0, bid, p.get('property_name', ''))
    properties_data.sort(key=prop_sort_key)
    
    return {
        'range_start': range_start.isoformat(),
        'range_end': range_end.isoformat(),
        'today': today.isoformat(),
        'properties': properties_data
    }

# ============================================================
# MOVE IN / MOVE OUT ENDPOINT
# ============================================================
@api_router.get("/move-ins-outs")
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
# HOUSEKEEPERS ENDPOINTS
# ============================================================
@api_router.get("/housekeepers")
async def list_housekeepers(include_archived: bool = False):
    query = {} if include_archived else {"$or": [{"is_archived": False}, {"is_archived": {"$exists": False}}]}
    docs = await db.housekeepers.find(query).sort("name", 1).to_list(1000)
    return [serialize_doc(d) for d in docs]

@api_router.post("/housekeepers")
async def create_housekeeper(data: HousekeeperCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.housekeepers.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@api_router.put("/housekeepers/{hk_id}")
async def update_housekeeper(hk_id: str, data: HousekeeperCreate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.housekeepers.update_one({"_id": ObjectId(hk_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Housekeeper not found")
    doc = await db.housekeepers.find_one({"_id": ObjectId(hk_id)})
    return serialize_doc(doc)

@api_router.delete("/housekeepers/{hk_id}")
async def delete_housekeeper(hk_id: str):
    result = await db.housekeepers.delete_one({"_id": ObjectId(hk_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Housekeeper not found")
    return {"message": "Housekeeper deleted"}

# ============================================================
# HOUSEKEEPING LEADS ENDPOINTS
# ============================================================
@api_router.get("/housekeeping-leads")
async def list_housekeeping_leads(include_archived: bool = False):
    query = {} if include_archived else {"$or": [{"is_archived": False}, {"is_archived": {"$exists": False}}]}
    docs = await db.housekeeping_leads.find(query).sort("name", 1).to_list(1000)
    return [serialize_doc(d) for d in docs]

@api_router.post("/housekeeping-leads")
async def create_housekeeping_lead(data: HousekeepingLeadCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.housekeeping_leads.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@api_router.put("/housekeeping-leads/{lead_id}")
async def update_housekeeping_lead(lead_id: str, data: HousekeepingLeadCreate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.housekeeping_leads.update_one({"_id": ObjectId(lead_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Housekeeping lead not found")
    doc = await db.housekeeping_leads.find_one({"_id": ObjectId(lead_id)})
    return serialize_doc(doc)

@api_router.delete("/housekeeping-leads/{lead_id}")
async def delete_housekeeping_lead(lead_id: str):
    result = await db.housekeeping_leads.delete_one({"_id": ObjectId(lead_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Housekeeping lead not found")
    return {"message": "Housekeeping lead deleted"}

# ============================================================
# CLEANING RECORDS ENDPOINTS
# ============================================================
@api_router.get("/cleaning-records")
async def list_cleaning_records(days: int = 60):
    today_str = date.today().isoformat()
    end_str = (date.today() + timedelta(days=days)).isoformat()
    
    # Auto-backfill: find tenants with move-out in range that don't have cleaning records
    tenants_in_range = await db.tenants.find({
        "move_out_date": {"$gte": today_str, "$lte": end_str}
    }).to_list(5000)
    
    existing_records = await db.cleaning_records.find().to_list(10000)
    existing_tenant_ids = {r.get("tenant_id") for r in existing_records}
    now_str = datetime.now(timezone.utc).isoformat()
    
    for tenant in tenants_in_range:
        tid = str(tenant["_id"])
        if tid not in existing_tenant_ids:
            cleaning_doc = {
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
            }
            await db.cleaning_records.insert_one(cleaning_doc)
    
    # Fetch all records in range
    docs = await db.cleaning_records.find({
        "check_out_date": {"$gte": today_str, "$lte": end_str}
    }).sort("check_out_date", 1).to_list(5000)
    
    # Enrich with next check-in info: for each record, find next tenant moving into same unit
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
        
        # Find the next tenant checking into this unit after this checkout
        next_checkin = None
        if unit_id and checkout_date:
            candidates = [t for t in unit_tenants.get(unit_id, [])
                          if t.get("move_in_date", "") >= checkout_date and str(t["_id"]) != s.get("tenant_id")]
            candidates.sort(key=lambda x: x.get("move_in_date", "9999"))
            if candidates:
                next_checkin = candidates[0]
        
        s["next_check_in_date"] = next_checkin.get("move_in_date", "") if next_checkin else ""
        s["next_check_in_tenant_name"] = next_checkin.get("name", "") if next_checkin else ""
        s["next_check_in_tenant_id"] = str(next_checkin["_id"]) if next_checkin else ""
        results.append(s)
    
    return results

@api_router.put("/cleaning-records/{record_id}")
async def update_cleaning_record(record_id: str, data: CleaningRecordUpdate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    old_record = await db.cleaning_records.find_one({"_id": ObjectId(record_id)})
    if not old_record:
        raise HTTPException(status_code=404, detail="Cleaning record not found")
    
    result = await db.cleaning_records.update_one({"_id": ObjectId(record_id)}, {"$set": update_doc})
    
    # If a housekeeper is now assigned, archive the "missing housekeeper" warning
    if data.assigned_cleaner_id and not old_record.get("assigned_cleaner_id"):
        tenant_id = old_record.get("tenant_id")
        if tenant_id:
            await db.notifications.update_many(
                {"tenant_id": tenant_id, "notification_type": "housekeeping_warning", "status": "upcoming"},
                {"$set": {"status": "done", "is_read": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
    
    doc = await db.cleaning_records.find_one({"_id": ObjectId(record_id)})
    return serialize_doc(doc)

# ============================================================
# AVAILABLE UNITS ENDPOINT (for lead form filtering)
# ============================================================
@api_router.get("/available-units")
async def get_available_units(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get units available during a given date range."""
    all_units = await db.units.find().to_list(5000)
    all_tenants = await db.tenants.find().to_list(5000)
    all_properties = await db.properties.find().to_list(1000)
    prop_map = {str(p['_id']): p for p in all_properties}
    
    if not start_date or not end_date:
        # Return all non-closed units
        result = []
        today = date.today()
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
    
    # Group tenants by unit
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
        
        # Check availability window
        if req_start < avail_start:
            continue
        if close and req_end > close:
            continue
        
        # Check for tenant conflicts
        has_conflict = False
        for tenant in tenants_by_unit.get(uid, []):
            from core_logic import dates_overlap
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

# ============================================================
# DASHBOARD SUMMARY
# ============================================================
@api_router.get("/dashboard")
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
# TEAM MEMBERS ENDPOINTS
# ============================================================
@api_router.get("/team-members")
async def list_team_members():
    docs = await db.team_members.find().sort("name", 1).to_list(1000)
    return [serialize_doc(d) for d in docs]

@api_router.post("/team-members")
async def create_team_member(data: TeamMemberCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.team_members.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@api_router.put("/team-members/{member_id}")
async def update_team_member(member_id: str, data: TeamMemberCreate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.team_members.update_one({"_id": ObjectId(member_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team member not found")
    doc = await db.team_members.find_one({"_id": ObjectId(member_id)})
    return serialize_doc(doc)

@api_router.delete("/team-members/{member_id}")
async def delete_team_member(member_id: str):
    result = await db.team_members.delete_one({"_id": ObjectId(member_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team member not found")
    return {"message": "Team member deleted"}

# ============================================================
# PIN MANAGEMENT ENDPOINTS
# ============================================================
@api_router.get("/pins/status")
async def get_pin_status():
    config = await db.settings.find_one({"type": "pin_config"})
    if not config:
        return {"shared_pin_set": False, "level_2_pin_set": False, "level_3_pin_set": False}
    return {
        "shared_pin_set": bool(config.get("shared_pin")),
        "level_2_pin_set": bool(config.get("level_2_pin")),
        "level_3_pin_set": bool(config.get("level_3_pin"))
    }

@api_router.post("/pins/set")
async def set_pin(data: PinSet):
    config = await db.settings.find_one({"type": "pin_config"})
    if not config:
        config = {"type": "pin_config"}
        await db.settings.insert_one(config)
    field_map = {"shared": "shared_pin", "level_2": "level_2_pin", "level_3": "level_3_pin"}
    field = field_map.get(data.pin_type)
    if not field:
        raise HTTPException(status_code=400, detail="Invalid pin type")
    await db.settings.update_one({"type": "pin_config"}, {"$set": {field: data.pin}})
    return {"message": f"PIN set for {data.pin_type}"}

@api_router.post("/pins/verify")
async def verify_pin(data: PinVerify):
    config = await db.settings.find_one({"type": "pin_config"})
    if not config:
        return {"valid": False, "message": "No PIN configured. Please set a PIN first."}
    field_map = {"shared": "shared_pin", "level_2": "level_2_pin", "level_3": "level_3_pin"}
    field = field_map.get(data.pin_type)
    if not field:
        raise HTTPException(status_code=400, detail="Invalid pin type")
    stored_pin = config.get(field, "")
    if not stored_pin:
        return {"valid": False, "message": f"No PIN set for {data.pin_type}. Please set one in settings."}
    return {"valid": data.pin == stored_pin}

# ============================================================
# PARKING SPOTS ENDPOINTS
# ============================================================
@api_router.get("/parking-spots")
async def list_parking_spots():
    docs = await db.parking_spots.find().sort("created_at", -1).to_list(1000)
    return [serialize_doc(d) for d in docs]

@api_router.get("/parking-spots/{spot_id}")
async def get_parking_spot(spot_id: str):
    doc = await db.parking_spots.find_one({"_id": ObjectId(spot_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Parking spot not found")
    return serialize_doc(doc)

@api_router.post("/parking-spots")
async def create_parking_spot(data: ParkingSpotCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.parking_spots.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@api_router.put("/parking-spots/{spot_id}")
async def update_parking_spot(spot_id: str, data: ParkingSpotCreate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.parking_spots.update_one({"_id": ObjectId(spot_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Parking spot not found")
    doc = await db.parking_spots.find_one({"_id": ObjectId(spot_id)})
    return serialize_doc(doc)

@api_router.delete("/parking-spots/{spot_id}")
async def delete_parking_spot(spot_id: str):
    await db.parking_assignments.delete_many({"parking_spot_id": spot_id})
    result = await db.parking_spots.delete_one({"_id": ObjectId(spot_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Parking spot not found")
    return {"message": "Parking spot deleted"}

# ============================================================
# PARKING ASSIGNMENTS ENDPOINTS
# ============================================================
@api_router.get("/parking-assignments")
async def list_parking_assignments(parking_spot_id: Optional[str] = None, active_only: Optional[bool] = None):
    query = {}
    if parking_spot_id:
        query["parking_spot_id"] = parking_spot_id
    if active_only is not None:
        query["is_active"] = active_only
    docs = await db.parking_assignments.find(query).sort("start_date", -1).to_list(1000)
    return [serialize_doc(d) for d in docs]

@api_router.post("/parking-assignments")
async def create_parking_assignment(data: ParkingAssignmentCreate):
    spot = await db.parking_spots.find_one({"_id": ObjectId(data.parking_spot_id)})
    if not spot:
        raise HTTPException(status_code=404, detail="Parking spot not found")
    
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.parking_assignments.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    # Auto-create reminder for Marlins Decal checkout
    if spot.get("spot_type") == "marlins_decal":
        now_str = datetime.now(timezone.utc).isoformat()
        notif_doc = {
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
        }
        await db.notifications.insert_one(notif_doc)
    
    return serialize_doc(doc)

@api_router.put("/parking-assignments/{assignment_id}")
async def update_parking_assignment(assignment_id: str, data: ParkingAssignmentCreate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.parking_assignments.update_one({"_id": ObjectId(assignment_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Parking assignment not found")
    doc = await db.parking_assignments.find_one({"_id": ObjectId(assignment_id)})
    return serialize_doc(doc)

@api_router.delete("/parking-assignments/{assignment_id}")
async def delete_parking_assignment(assignment_id: str):
    result = await db.parking_assignments.delete_one({"_id": ObjectId(assignment_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Parking assignment not found")
    return {"message": "Parking assignment deleted"}

# ============================================================
# DOOR CODES ENDPOINTS
# ============================================================
@api_router.get("/door-codes")
async def list_door_codes(unit_id: Optional[str] = None, property_id: Optional[str] = None):
    query = {}
    if unit_id:
        query["unit_id"] = unit_id
    if property_id:
        query["property_id"] = property_id
    docs = await db.door_codes.find(query).to_list(1000)
    return [serialize_doc(d) for d in docs]

@api_router.post("/door-codes")
async def create_or_update_door_code(data: DoorCodeCreate):
    existing = await db.door_codes.find_one({"unit_id": data.unit_id})
    doc = data.model_dump()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    if existing:
        await db.door_codes.update_one({"_id": existing["_id"]}, {"$set": doc})
        updated = await db.door_codes.find_one({"_id": existing["_id"]})
        return serialize_doc(updated)
    else:
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.door_codes.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_doc(doc)

@api_router.delete("/door-codes/{code_id}")
async def delete_door_code(code_id: str):
    result = await db.door_codes.delete_one({"_id": ObjectId(code_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Door code not found")
    return {"message": "Door code deleted"}

# ============================================================
# LOGIN ACCOUNTS ENDPOINTS
# ============================================================
@api_router.get("/login-accounts")
async def list_login_accounts():
    docs = await db.login_accounts.find().sort("account_name", 1).to_list(1000)
    return [serialize_doc(d) for d in docs]

@api_router.post("/login-accounts")
async def create_login_account(data: LoginAccountCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.login_accounts.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@api_router.put("/login-accounts/{account_id}")
async def update_login_account(account_id: str, data: LoginAccountCreate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.login_accounts.update_one({"_id": ObjectId(account_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Login account not found")
    doc = await db.login_accounts.find_one({"_id": ObjectId(account_id)})
    return serialize_doc(doc)

@api_router.delete("/login-accounts/{account_id}")
async def delete_login_account(account_id: str):
    result = await db.login_accounts.delete_one({"_id": ObjectId(account_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Login account not found")
    return {"message": "Login account deleted"}

# ============================================================
# MARKETING LINKS ENDPOINTS
# ============================================================
@api_router.get("/marketing-links")
async def list_marketing_links(unit_id: Optional[str] = None):
    query = {}
    if unit_id:
        query["unit_id"] = unit_id
    docs = await db.marketing_links.find(query).to_list(1000)
    return [serialize_doc(d) for d in docs]

@api_router.post("/marketing-links")
async def create_or_update_marketing_link(data: MarketingLinkCreate):
    existing = await db.marketing_links.find_one({"unit_id": data.unit_id})
    doc = data.model_dump()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    if existing:
        await db.marketing_links.update_one({"_id": existing["_id"]}, {"$set": doc})
        updated = await db.marketing_links.find_one({"_id": existing["_id"]})
        return serialize_doc(updated)
    else:
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.marketing_links.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_doc(doc)

@api_router.delete("/marketing-links/{link_id}")
async def delete_marketing_link(link_id: str):
    result = await db.marketing_links.delete_one({"_id": ObjectId(link_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Marketing link not found")
    return {"message": "Marketing link deleted"}

# ============================================================
# NOTES ENDPOINTS
# ============================================================
@api_router.get("/notes")
async def list_notes():
    docs = await db.notes.find().sort("updated_at", -1).to_list(1000)
    return [serialize_doc(d) for d in docs]

@api_router.get("/notes/{note_id}")
async def get_note(note_id: str):
    doc = await db.notes.find_one({"_id": ObjectId(note_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Note not found")
    return serialize_doc(doc)

@api_router.post("/notes")
async def create_note(data: NoteCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.notes.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@api_router.put("/notes/{note_id}")
async def update_note(note_id: str, data: NoteCreate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.notes.update_one(
        {"_id": ObjectId(note_id)},
        {"$set": update_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    doc = await db.notes.find_one({"_id": ObjectId(note_id)})
    return serialize_doc(doc)

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str):
    result = await db.notes.delete_one({"_id": ObjectId(note_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
