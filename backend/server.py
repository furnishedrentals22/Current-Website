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

class NotificationCreate(BaseModel):
    lead_id: str
    lead_name: str
    stage_name: str
    notification_date: str
    message: Optional[str] = ""

# ============================================================
# PROPERTIES ENDPOINTS
# ============================================================
@api_router.get("/properties")
async def list_properties():
    docs = await db.properties.find().sort("created_at", -1).to_list(1000)
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
    doc = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    return serialize_doc(doc)

@api_router.delete("/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str):
    result = await db.tenants.delete_one({"_id": ObjectId(tenant_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {"message": "Tenant deleted"}

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
# NOTIFICATIONS ENDPOINTS
# ============================================================
@api_router.get("/notifications")
async def list_notifications():
    docs = await db.notifications.find().sort("created_at", -1).to_list(1000)
    return [serialize_doc(d) for d in docs]

@api_router.post("/notifications")
async def create_notification(data: NotificationCreate):
    doc = data.model_dump()
    doc["is_read"] = False
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.notifications.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    result = await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}

@api_router.put("/notifications/{notification_id}/unread")
async def mark_notification_unread(notification_id: str):
    result = await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"is_read": False}}
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
# CALENDAR ENDPOINT
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
