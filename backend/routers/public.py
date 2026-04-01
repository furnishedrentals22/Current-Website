from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Form
from fastapi.responses import Response
from typing import Optional, List
from datetime import datetime, timezone, date
from bson import ObjectId
import uuid

from database import db
from helpers import parse_date
from core_logic import days_in_month, dates_overlap
from object_storage import put_object, get_object, generate_path

router = APIRouter()

# ── 20 most common short-term rental amenities ────────────────────────────
DEFAULT_AMENITIES = [
    {"name": "WiFi", "icon": "wifi"},
    {"name": "Air Conditioning", "icon": "snowflake"},
    {"name": "Kitchen", "icon": "utensils-crossed"},
    {"name": "Washer", "icon": "washing-machine"},
    {"name": "Dryer", "icon": "wind"},
    {"name": "TV", "icon": "tv"},
    {"name": "Pool", "icon": "waves"},
    {"name": "Hot Tub", "icon": "bath"},
    {"name": "Free Parking", "icon": "car"},
    {"name": "Gym", "icon": "dumbbell"},
    {"name": "Elevator", "icon": "arrow-up-down"},
    {"name": "Balcony", "icon": "fence"},
    {"name": "Beach Access", "icon": "umbrella"},
    {"name": "Pet Friendly", "icon": "paw-print"},
    {"name": "Coffee Maker", "icon": "coffee"},
    {"name": "Dishwasher", "icon": "sparkles"},
    {"name": "Iron", "icon": "shirt"},
    {"name": "Heating", "icon": "flame"},
    {"name": "Security", "icon": "shield-check"},
    {"name": "Workspace", "icon": "laptop"},
]


async def verify_admin_password(password):
    config = await db.settings.find_one({"type": "app_password"})
    if not config:
        await db.settings.insert_one({"type": "app_password", "password": "emergeontop"})
        return password == "emergeontop"
    return password == config.get("password", "")


@router.post("/auth/verify-password")
async def verify_password(data: dict):
    password = data.get("password", "")
    valid = await verify_admin_password(password)
    return {"valid": valid}


@router.get("/public/amenities/defaults")
async def get_default_amenities():
    """Return the 20 default amenity options."""
    return DEFAULT_AMENITIES


def _build_photo_list(detail):
    """Build sorted photo list with order and cover info."""
    photos = []
    for photo in (detail or {}).get('photos', []):
        if not photo.get('is_deleted'):
            photos.append({
                'id': photo.get('id', ''),
                'url': f"/api/public/files/{photo['storage_path']}",
                'filename': photo.get('original_filename', ''),
                'order': photo.get('order', 999),
                'is_cover': photo.get('is_cover', False),
            })
    # Sort: cover first, then by order, then by creation
    photos.sort(key=lambda p: (0 if p['is_cover'] else 1, p['order']))
    return photos


def _build_video_info(detail):
    """Build video info from listing detail."""
    video = (detail or {}).get('video')
    if not video or video.get('is_deleted'):
        return None
    return {
        'id': video.get('id', ''),
        'url': f"/api/public/files/{video['storage_path']}",
        'filename': video.get('original_filename', ''),
        'content_type': video.get('content_type', ''),
    }


def _build_listing_response(unit, prop, detail, uid, pricing_list, today):
    """Build a consistent listing response dict."""
    detail = detail or {}
    prop = prop or {}
    title = detail.get('title') or f"{prop.get('name', 'Property')} - Unit {unit.get('unit_number', '')}"
    current_price = None
    for p in pricing_list:
        if p['year'] == today.year and p['month'] == today.month:
            current_price = p['price']
            break

    return {
        'id': uid,
        'title': title,
        'description': detail.get('description', ''),
        'photos': _build_photo_list(detail),
        'video': _build_video_info(detail),
        'amenities': detail.get('amenities', []),
        'address': detail.get('address', ''),
        'address_lat': detail.get('address_lat'),
        'address_lng': detail.get('address_lng'),
        'property_name': prop.get('name', ''),
        'property_id': unit.get('property_id', ''),
        'unit_number': unit.get('unit_number', ''),
        'unit_size': unit.get('unit_size', ''),
        'base_rent': unit.get('base_rent', 0),
        'current_price': current_price,
        'pricing': pricing_list,
        'building_id': prop.get('building_id'),
    }


@router.get("/public/listings")
async def get_public_listings(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    all_units = await db.units.find().to_list(5000)
    all_properties = await db.properties.find().to_list(1000)
    all_tenants = await db.tenants.find().to_list(5000)
    all_pricing = await db.listing_pricing.find({}, {"_id": 0}).to_list(5000)
    all_details = await db.listing_details.find().to_list(5000)

    prop_map = {str(p['_id']): p for p in all_properties}
    details_map = {d.get('unit_id', ''): d for d in all_details}

    pricing_map = {}
    for p in all_pricing:
        uid = p.get('unit_id', '')
        if uid not in pricing_map:
            pricing_map[uid] = []
        pricing_map[uid].append({'year': p['year'], 'month': p['month'], 'price': p['price']})

    today = date.today()

    if start_date and end_date:
        req_start = parse_date(start_date)
        req_end = parse_date(end_date)
        tenants_by_unit = {}
        for t in all_tenants:
            uid = t.get('unit_id', '')
            if uid not in tenants_by_unit:
                tenants_by_unit[uid] = []
            tenants_by_unit[uid].append(t)
        filtered = []
        for unit in all_units:
            uid = str(unit['_id'])
            has_conflict = False
            for tenant in tenants_by_unit.get(uid, []):
                t_in = parse_date(tenant['move_in_date'])
                t_out = parse_date(tenant['move_out_date'])
                if dates_overlap(req_start, req_end, t_in, t_out):
                    has_conflict = True
                    break
            if not has_conflict:
                filtered.append(unit)
        all_units = filtered

    listings = []
    for unit in all_units:
        uid = str(unit['_id'])
        prop = prop_map.get(unit.get('property_id', ''), {})
        close_date_str = unit.get('close_date')
        if close_date_str:
            try:
                if parse_date(close_date_str) <= today:
                    continue
            except Exception:
                pass

        detail = details_map.get(uid, {})
        unit_pricing = pricing_map.get(uid, [])
        listings.append(_build_listing_response(unit, prop, detail, uid, unit_pricing, today))

    def sort_key(item):
        bid = item.get('building_id')
        try:
            unum = int(item.get('unit_number', '0'))
        except (ValueError, TypeError):
            unum = 0
        return (1, 0, unum) if bid is None else (0, bid, unum)
    listings.sort(key=sort_key)
    return listings


@router.get("/public/listings/{unit_id}")
async def get_single_listing(unit_id: str):
    unit = await db.units.find_one({"_id": ObjectId(unit_id)})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    prop = await db.properties.find_one({"_id": ObjectId(unit.get('property_id', ''))})
    detail = await db.listing_details.find_one({"unit_id": unit_id})
    pricing_docs = await db.listing_pricing.find({"unit_id": unit_id}, {"_id": 0}).to_list(100)

    today = date.today()
    pricing = [{'year': p['year'], 'month': p['month'], 'price': p['price']} for p in pricing_docs]
    return _build_listing_response(unit, prop, detail, unit_id, pricing, today)


@router.get("/public/listings/{unit_id}/availability")
async def get_listing_availability(
    unit_id: str,
    start_year: Optional[int] = None,
    start_month: Optional[int] = None,
    num_months: Optional[int] = 6
):
    unit = await db.units.find_one({"_id": ObjectId(unit_id)})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    prop = await db.properties.find_one({"_id": ObjectId(unit.get('property_id', ''))})
    detail = await db.listing_details.find_one({"unit_id": unit_id})
    tenants = await db.tenants.find({"unit_id": unit_id}).to_list(1000)
    pricing_docs = await db.listing_pricing.find({"unit_id": unit_id}, {"_id": 0}).to_list(100)
    pricing_map = {(p['year'], p['month']): p['price'] for p in pricing_docs}

    today = date.today()
    sy = start_year or today.year
    sm = start_month or today.month
    count = min(num_months or 6, 24)

    months_data = []
    for i in range(count):
        m = sm + i
        y = sy
        while m > 12:
            m -= 12
            y += 1
        num_days_val = days_in_month(y, m)
        days_data = []
        for day in range(1, num_days_val + 1):
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
            days_data.append({'day': day, 'status': status})
        months_data.append({'year': y, 'month': m, 'price': pricing_map.get((y, m)), 'days': days_data})

    title = ''
    if detail:
        title = detail.get('title', '')
    if not title:
        prop_name = prop.get('name', 'Property') if prop else 'Property'
        title = f"{prop_name} - Unit {unit.get('unit_number', '')}"
    return {'unit_id': unit_id, 'title': title, 'unit_size': unit.get('unit_size', ''), 'months': months_data}


# ── Admin endpoints ────────────────────────────────────────────────────────

@router.post("/public/admin/pricing")
async def set_listing_pricing(data: dict):
    password = data.get('password', '')
    if not await verify_admin_password(password):
        raise HTTPException(status_code=401, detail="Invalid password")
    unit_id = data.get('unit_id')
    entries = data.get('entries', [])
    if not unit_id or not entries:
        raise HTTPException(status_code=400, detail="Missing unit_id or entries")
    for entry in entries:
        year, month, price = entry.get('year'), entry.get('month'), entry.get('price')
        if price is None or price == '':
            continue
        await db.listing_pricing.update_one(
            {"unit_id": unit_id, "year": int(year), "month": int(month)},
            {"$set": {"unit_id": unit_id, "year": int(year), "month": int(month),
                      "price": float(price), "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
    return {"message": "Pricing updated successfully"}


@router.post("/public/admin/pricing/delete")
async def delete_listing_pricing(data: dict):
    password = data.get('password', '')
    if not await verify_admin_password(password):
        raise HTTPException(status_code=401, detail="Invalid password")
    unit_id = data.get('unit_id')
    year = data.get('year')
    month = data.get('month')
    if not all([unit_id, year, month]):
        raise HTTPException(status_code=400, detail="Missing fields")
    await db.listing_pricing.delete_one({"unit_id": unit_id, "year": int(year), "month": int(month)})
    return {"message": "Pricing deleted"}


@router.get("/public/admin/pricing")
async def get_all_pricing():
    docs = await db.listing_pricing.find({}, {"_id": 0}).to_list(5000)
    return docs


@router.put("/public/admin/listings/{unit_id}")
async def update_listing_details(unit_id: str, data: dict):
    password = data.get('password', '')
    if not await verify_admin_password(password):
        raise HTTPException(status_code=401, detail="Invalid password")
    unit = await db.units.find_one({"_id": ObjectId(unit_id)})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    update_fields = {}
    if 'title' in data:
        update_fields['title'] = data['title']
    if 'description' in data:
        update_fields['description'] = data['description']
    if 'amenities' in data:
        update_fields['amenities'] = data['amenities']
    if 'address' in data:
        update_fields['address'] = data['address']
    if 'address_lat' in data:
        update_fields['address_lat'] = data['address_lat']
    if 'address_lng' in data:
        update_fields['address_lng'] = data['address_lng']
    if update_fields:
        update_fields['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.listing_details.update_one(
            {"unit_id": unit_id},
            {"$set": update_fields, "$setOnInsert": {"photos": []}},
            upsert=True
        )
    return {"message": "Listing updated"}


# ── Photo endpoints ────────────────────────────────────────────────────────

@router.post("/public/admin/listings/{unit_id}/photos")
async def upload_listing_photo(unit_id: str, file: UploadFile = File(...), password: str = Query(...)):
    if not await verify_admin_password(password):
        raise HTTPException(status_code=401, detail="Invalid password")
    unit = await db.units.find_one({"_id": ObjectId(unit_id)})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    # Get current highest order
    detail = await db.listing_details.find_one({"unit_id": unit_id})
    max_order = 0
    if detail and detail.get('photos'):
        for p in detail['photos']:
            if not p.get('is_deleted') and p.get('order', 0) > max_order:
                max_order = p.get('order', 0)

    data = await file.read()
    path = generate_path(file.filename)
    result = put_object(path, data, file.content_type or "application/octet-stream")
    photo_entry = {
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "is_deleted": False,
        "is_cover": False,
        "order": max_order + 1,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.listing_details.update_one(
        {"unit_id": unit_id},
        {"$push": {"photos": photo_entry}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"id": photo_entry["id"], "url": f"/api/public/files/{result['path']}", "filename": file.filename}


@router.post("/public/admin/listings/{unit_id}/photos/batch")
async def upload_listing_photos_batch(
    unit_id: str,
    files: List[UploadFile] = File(...),
    password: str = Query(...)
):
    """Upload multiple photos at once."""
    if not await verify_admin_password(password):
        raise HTTPException(status_code=401, detail="Invalid password")
    unit = await db.units.find_one({"_id": ObjectId(unit_id)})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    # Get current highest order
    detail = await db.listing_details.find_one({"unit_id": unit_id})
    max_order = 0
    if detail and detail.get('photos'):
        for p in detail['photos']:
            if not p.get('is_deleted') and p.get('order', 0) > max_order:
                max_order = p.get('order', 0)

    uploaded = []
    for i, file in enumerate(files):
        data = await file.read()
        path = generate_path(file.filename)
        result = put_object(path, data, file.content_type or "application/octet-stream")
        photo_entry = {
            "id": str(uuid.uuid4()),
            "storage_path": result["path"],
            "original_filename": file.filename,
            "content_type": file.content_type,
            "is_deleted": False,
            "is_cover": False,
            "order": max_order + 1 + i,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.listing_details.update_one(
            {"unit_id": unit_id},
            {"$push": {"photos": photo_entry}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        uploaded.append({
            "id": photo_entry["id"],
            "url": f"/api/public/files/{result['path']}",
            "filename": file.filename
        })

    return {"uploaded": uploaded, "count": len(uploaded)}


@router.post("/public/admin/listings/{unit_id}/photos/reorder")
async def reorder_listing_photos(unit_id: str, data: dict):
    """Reorder photos. Expects {password, photo_ids: [id1, id2, ...]}."""
    password = data.get('password', '')
    if not await verify_admin_password(password):
        raise HTTPException(status_code=401, detail="Invalid password")
    photo_ids = data.get('photo_ids', [])
    if not photo_ids:
        raise HTTPException(status_code=400, detail="Missing photo_ids")

    detail = await db.listing_details.find_one({"unit_id": unit_id})
    if not detail or not detail.get('photos'):
        raise HTTPException(status_code=404, detail="No photos found")

    # Update order for each photo
    for order_idx, photo_id in enumerate(photo_ids):
        await db.listing_details.update_one(
            {"unit_id": unit_id, "photos.id": photo_id},
            {"$set": {"photos.$.order": order_idx}}
        )

    return {"message": "Photos reordered"}


@router.post("/public/admin/listings/{unit_id}/photos/cover")
async def set_cover_photo(unit_id: str, data: dict):
    """Set a photo as cover. Expects {password, photo_id}."""
    password = data.get('password', '')
    if not await verify_admin_password(password):
        raise HTTPException(status_code=401, detail="Invalid password")
    photo_id = data.get('photo_id', '')
    if not photo_id:
        raise HTTPException(status_code=400, detail="Missing photo_id")

    detail = await db.listing_details.find_one({"unit_id": unit_id})
    if not detail or not detail.get('photos'):
        raise HTTPException(status_code=404, detail="No photos found")

    # Unset all covers, then set the requested one
    for photo in detail.get('photos', []):
        await db.listing_details.update_one(
            {"unit_id": unit_id, "photos.id": photo['id']},
            {"$set": {"photos.$.is_cover": False}}
        )
    await db.listing_details.update_one(
        {"unit_id": unit_id, "photos.id": photo_id},
        {"$set": {"photos.$.is_cover": True}}
    )

    return {"message": "Cover photo set"}


@router.post("/public/admin/listings/{unit_id}/photos/delete")
async def delete_listing_photo(unit_id: str, data: dict):
    password = data.get('password', '')
    if not await verify_admin_password(password):
        raise HTTPException(status_code=401, detail="Invalid password")
    photo_id = data.get('photo_id', '')
    if not photo_id:
        raise HTTPException(status_code=400, detail="Missing photo_id")
    await db.listing_details.update_one(
        {"unit_id": unit_id, "photos.id": photo_id},
        {"$set": {"photos.$.is_deleted": True}}
    )
    return {"message": "Photo deleted"}


# ── Video endpoints ────────────────────────────────────────────────────────

@router.post("/public/admin/listings/{unit_id}/video")
async def upload_listing_video(
    unit_id: str,
    file: UploadFile = File(...),
    password: str = Query(...)
):
    """Upload a video for a listing (replaces existing)."""
    if not await verify_admin_password(password):
        raise HTTPException(status_code=401, detail="Invalid password")
    unit = await db.units.find_one({"_id": ObjectId(unit_id)})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    data = await file.read()
    path = generate_path(file.filename)
    result = put_object(path, data, file.content_type or "application/octet-stream")
    video_entry = {
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.listing_details.update_one(
        {"unit_id": unit_id},
        {"$set": {"video": video_entry, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"id": video_entry["id"], "url": f"/api/public/files/{result['path']}", "filename": file.filename}


@router.post("/public/admin/listings/{unit_id}/video/delete")
async def delete_listing_video(unit_id: str, data: dict):
    """Delete the video from a listing."""
    password = data.get('password', '')
    if not await verify_admin_password(password):
        raise HTTPException(status_code=401, detail="Invalid password")
    await db.listing_details.update_one(
        {"unit_id": unit_id},
        {"$set": {"video.is_deleted": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Video deleted"}


# ── File serving ───────────────────────────────────────────────────────────

@router.get("/public/files/{path:path}")
async def serve_file(path: str):
    try:
        data, content_type = get_object(path)
        return Response(
            content=data,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=31536000, immutable",
                "Accept-Ranges": "bytes",
            }
        )
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
