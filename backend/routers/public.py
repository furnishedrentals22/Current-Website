from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, date
from bson import ObjectId

from database import db
from helpers import serialize_doc, parse_date
from core_logic import days_in_month

router = APIRouter()


@router.post("/auth/verify-password")
async def verify_password(data: dict):
    password = data.get("password", "")
    config = await db.settings.find_one({"type": "app_password"})
    if not config:
        await db.settings.insert_one({"type": "app_password", "password": "emergeontop"})
        return {"valid": password == "emergeontop"}
    return {"valid": password == config.get("password", "")}


@router.get("/public/listings")
async def get_public_listings():
    all_units = await db.units.find().to_list(5000)
    all_properties = await db.properties.find().to_list(1000)
    all_pricing = await db.listing_pricing.find({}, {"_id": 0}).to_list(5000)
    all_details = await db.listing_details.find().to_list(5000)

    prop_map = {str(p['_id']): p for p in all_properties}
    details_map = {d.get('unit_id', ''): d for d in all_details}

    pricing_map = {}
    for p in all_pricing:
        uid = p.get('unit_id', '')
        if uid not in pricing_map:
            pricing_map[uid] = []
        pricing_map[uid].append({
            'year': p['year'],
            'month': p['month'],
            'price': p['price']
        })

    today = date.today()
    listings = []

    for unit in all_units:
        uid = str(unit['_id'])
        prop = prop_map.get(unit.get('property_id', ''), {})

        close_date_str = unit.get('close_date')
        if close_date_str:
            try:
                close_dt = parse_date(close_date_str)
                if close_dt <= today:
                    continue
            except Exception:
                pass

        detail = details_map.get(uid, {})
        title = detail.get('title') or f"{prop.get('name', 'Property')} - Unit {unit.get('unit_number', '')}"

        unit_pricing = pricing_map.get(uid, [])
        current_price = None
        for p in unit_pricing:
            if p['year'] == today.year and p['month'] == today.month:
                current_price = p['price']
                break

        listings.append({
            'id': uid,
            'title': title,
            'description': detail.get('description', ''),
            'photos': detail.get('photos', []),
            'property_name': prop.get('name', ''),
            'property_id': unit.get('property_id', ''),
            'unit_number': unit.get('unit_number', ''),
            'unit_size': unit.get('unit_size', ''),
            'base_rent': unit.get('base_rent', 0),
            'current_price': current_price,
            'pricing': unit_pricing,
            'building_id': prop.get('building_id')
        })

    def sort_key(item):
        bid = item.get('building_id')
        try:
            unum = int(item.get('unit_number', '0'))
        except (ValueError, TypeError):
            unum = 0
        if bid is None:
            return (1, 0, unum)
        return (0, bid, unum)
    listings.sort(key=sort_key)

    return listings


@router.get("/public/listings/{unit_id}/availability")
async def get_listing_availability(unit_id: str):
    unit = await db.units.find_one({"_id": ObjectId(unit_id)})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    prop = await db.properties.find_one({"_id": ObjectId(unit.get('property_id', ''))})
    detail = await db.listing_details.find_one({"unit_id": unit_id})

    tenants = await db.tenants.find({"unit_id": unit_id}).to_list(1000)
    pricing_docs = await db.listing_pricing.find({"unit_id": unit_id}, {"_id": 0}).to_list(100)
    pricing_map = {(p['year'], p['month']): p['price'] for p in pricing_docs}

    today = date.today()
    months_data = []

    for i in range(6):
        m = today.month + i
        y = today.year
        while m > 12:
            m -= 12
            y += 1

        num_days = days_in_month(y, m)
        days_data = []

        for day in range(1, num_days + 1):
            current_date = date(y, m, day)
            status = 'available'

            for tenant in tenants:
                t_in = parse_date(tenant['move_in_date'])
                t_out = parse_date(tenant['move_out_date'])
                if t_in <= current_date < t_out:
                    status = 'occupied'
                    break

            if current_date < today:
                status = 'past'

            days_data.append({
                'day': day,
                'status': status
            })

        months_data.append({
            'year': y,
            'month': m,
            'price': pricing_map.get((y, m)),
            'days': days_data
        })

    title = ''
    if detail:
        title = detail.get('title', '')
    if not title:
        prop_name = prop.get('name', 'Property') if prop else 'Property'
        title = f"{prop_name} - Unit {unit.get('unit_number', '')}"

    return {
        'unit_id': unit_id,
        'title': title,
        'unit_size': unit.get('unit_size', ''),
        'months': months_data
    }


@router.post("/public/admin/pricing")
async def set_listing_pricing(data: dict):
    password = data.get('password', '')
    config = await db.settings.find_one({"type": "app_password"})
    if not config or config.get('password') != password:
        raise HTTPException(status_code=401, detail="Invalid password")

    unit_id = data.get('unit_id')
    entries = data.get('entries', [])

    if not unit_id or not entries:
        raise HTTPException(status_code=400, detail="Missing unit_id or entries")

    for entry in entries:
        year = entry.get('year')
        month = entry.get('month')
        price = entry.get('price')
        if price is None or price == '':
            continue
        await db.listing_pricing.update_one(
            {"unit_id": unit_id, "year": int(year), "month": int(month)},
            {"$set": {
                "unit_id": unit_id,
                "year": int(year),
                "month": int(month),
                "price": float(price),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )

    return {"message": "Pricing updated successfully"}


@router.get("/public/admin/pricing")
async def get_all_pricing():
    docs = await db.listing_pricing.find({}, {"_id": 0}).to_list(5000)
    return docs
