from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone, date
from bson import ObjectId

from database import db
from helpers import serialize_doc, parse_date
from schemas import RentPaymentUpdate, DepositReturnRequest
from core_logic import get_tenant_income_for_month

router = APIRouter()


# ============================================================
# INCOME
# ============================================================

@router.get("/income")
async def get_income(year: int = Query(default=None)):
    if year is None:
        year = datetime.now().year

    all_tenants = await db.tenants.find().to_list(5000)
    all_units = await db.units.find().to_list(5000)
    all_properties = await db.properties.find().to_list(1000)
    all_misc_charges = await db.misc_charges.find().to_list(10000)

    unit_map = {str(u['_id']): u for u in all_units}
    prop_map = {str(p['_id']): p for p in all_properties}

    misc_by_tenant_month = {}
    for mc in all_misc_charges:
        if not mc.get('charge_date'):
            continue
        cd = parse_date(mc['charge_date'])
        if cd.year != year:
            continue
        key = (mc.get('tenant_id', ''), cd.month)
        if key not in misc_by_tenant_month:
            misc_by_tenant_month[key] = []
        misc_by_tenant_month[key].append(mc)

    months_data = []
    yearly_total = 0.0

    for month in range(1, 13):
        month_total = 0.0
        properties_breakdown = {}

        for tenant in all_tenants:
            move_in = parse_date(tenant['move_in_date'])
            move_out = parse_date(tenant['move_out_date'])

            month_start = date(year, month, 1)
            month_end = date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)

            if move_in >= month_end or move_out <= month_start:
                continue

            unit_id = tenant.get('unit_id', '')
            unit = unit_map.get(unit_id, {})
            prop_id = tenant.get('property_id', '')
            prop = prop_map.get(prop_id, {})

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

                tid = str(tenant['_id'])
                misc_list = misc_by_tenant_month.get((tid, month), [])
                misc_total = sum(mc.get('amount', 0) for mc in misc_list)
                misc_items = [{'description': mc.get('description', 'Misc'), 'amount': mc.get('amount', 0)} for mc in misc_list]

                properties_breakdown[prop_id]['units'][unit_id]['tenants'].append({
                    'tenant_id': tid,
                    'tenant_name': tenant.get('name', 'Unknown'),
                    'is_airbnb': tenant.get('is_airbnb_vrbo', False),
                    'income': round(income, 2),
                    'misc_charges': misc_items,
                    'misc_total': round(misc_total, 2)
                })

                if misc_total > 0:
                    month_total += misc_total
                    properties_breakdown[prop_id]['total'] += misc_total
                    properties_breakdown[prop_id]['units'][unit_id]['total'] += misc_total

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
# DEPOSITS
# ============================================================

@router.get("/deposits/current")
async def get_current_deposits():
    tenants = await db.tenants.find({
        "is_airbnb_vrbo": {"$ne": True},
        "deposit_amount": {"$gt": 0},
        "$or": [
            {"deposit_return_date": {"$exists": False}},
            {"deposit_return_date": None},
            {"deposit_return_date": ""}
        ]
    }).to_list(5000)

    all_units = await db.units.find().to_list(5000)
    all_props = await db.properties.find().to_list(1000)
    unit_map = {str(u['_id']): u for u in all_units}
    prop_map = {str(p['_id']): p for p in all_props}

    results = []
    total = 0.0
    for t in tenants:
        unit = unit_map.get(t.get('unit_id', ''), {})
        prop = prop_map.get(t.get('property_id', ''), {})
        deposit_amt = t.get('deposit_amount', 0) or 0
        total += deposit_amt
        results.append({
            **serialize_doc(t),
            'unit_number': unit.get('unit_number', ''),
            'property_name': prop.get('name', ''),
        })

    return {"deposits": results, "total": round(total, 2)}


@router.get("/deposits/past")
async def get_past_deposits():
    tenants = await db.tenants.find({
        "is_airbnb_vrbo": {"$ne": True},
        "deposit_amount": {"$gt": 0},
        "deposit_return_date": {"$nin": [None, ""]}
    }).to_list(5000)

    all_units = await db.units.find().to_list(5000)
    all_props = await db.properties.find().to_list(1000)
    unit_map = {str(u['_id']): u for u in all_units}
    prop_map = {str(p['_id']): p for p in all_props}

    results = []
    for t in tenants:
        unit = unit_map.get(t.get('unit_id', ''), {})
        prop = prop_map.get(t.get('property_id', ''), {})
        results.append({
            **serialize_doc(t),
            'unit_number': unit.get('unit_number', ''),
            'property_name': prop.get('name', ''),
        })

    return {"deposits": results}


@router.post("/tenants/{tenant_id}/return-deposit")
async def return_deposit(tenant_id: str, data: DepositReturnRequest):
    tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    return_amount = data.return_amount if data.return_amount is not None else tenant.get('deposit_amount', 0)
    now = datetime.now(timezone.utc).isoformat()

    deposit_note = f"Deposit returned: ${return_amount:,.2f} on {data.return_date} via {data.return_method}"
    existing_notes = tenant.get('notes', '') or ''
    new_notes = f"{existing_notes}\n{deposit_note}".strip() if existing_notes else deposit_note

    await db.tenants.update_one(
        {"_id": ObjectId(tenant_id)},
        {"$set": {
            "deposit_return_date": data.return_date,
            "deposit_return_amount": return_amount,
            "deposit_return_method": data.return_method,
            "notes": new_notes,
            "updated_at": now
        }}
    )

    updated = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    return serialize_doc(updated)


@router.get("/landlord-deposits")
async def get_landlord_deposits():
    all_units = await db.units.find().to_list(5000)
    all_props = await db.properties.find().to_list(1000)

    sorted_props = sorted(
        all_props,
        key=lambda p: (p.get('building_id') if p.get('building_id') is not None else 99999, p.get('name', ''))
    )

    properties = []
    total = 0.0
    for prop in sorted_props:
        pid = str(prop['_id'])
        prop_units = [u for u in all_units if u.get('property_id') == pid]
        prop_units.sort(key=lambda u: (
            int(u.get('unit_number', '0')) if u.get('unit_number', '').isdigit() else 99999,
            u.get('unit_number', '')
        ))

        units_data = []
        prop_total = 0.0
        for u in prop_units:
            amt = u.get('landlord_deposit', 0) or 0
            prop_total += amt
            units_data.append({
                'unit_id': str(u['_id']),
                'unit_number': u.get('unit_number', ''),
                'landlord_deposit': amt
            })

        total += prop_total
        properties.append({
            'property_id': pid,
            'property_name': prop.get('name', ''),
            'building_id': prop.get('building_id'),
            'total': round(prop_total, 2),
            'units': units_data
        })

    return {"properties": properties, "total": round(total, 2)}


@router.put("/landlord-deposits/{unit_id}")
async def update_landlord_deposit(unit_id: str, amount: float = Query(...)):
    result = await db.units.update_one(
        {"_id": ObjectId(unit_id)},
        {"$set": {"landlord_deposit": amount, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Unit not found")
    return {"message": "Landlord deposit updated"}


# ============================================================
# RENT TRACKING
# ============================================================

@router.get("/rent-tracking")
async def get_rent_tracking(year: int = Query(default=None), month: int = Query(default=None)):
    if year is None:
        year = datetime.now().year
    if month is None:
        month = datetime.now().month

    month_start = date(year, month, 1)
    month_end = date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)
    month_start_str = month_start.isoformat()
    month_end_str = month_end.isoformat()

    all_tenants = await db.tenants.find({
        "is_airbnb_vrbo": {"$ne": True},
        "move_in_date": {"$lt": month_end_str},
        "move_out_date": {"$gt": month_start_str}
    }).to_list(5000)

    all_units = await db.units.find().to_list(5000)
    all_props = await db.properties.find().to_list(1000)
    unit_map = {str(u['_id']): u for u in all_units}
    prop_map = {str(p['_id']): p for p in all_props}

    payments = await db.rent_payments.find({"year": year, "month": month}).to_list(5000)
    payment_map = {p['tenant_id']: p for p in payments}

    tenants_data = []
    for t in all_tenants:
        tid = str(t['_id'])
        unit = unit_map.get(t.get('unit_id', ''), {})
        prop = prop_map.get(t.get('property_id', ''), {})
        payment = payment_map.get(tid, {})

        tenants_data.append({
            'tenant_id': tid,
            'tenant_name': t.get('name', ''),
            'property_id': t.get('property_id', ''),
            'property_name': prop.get('name', ''),
            'building_id': prop.get('building_id'),
            'unit_id': t.get('unit_id', ''),
            'unit_number': unit.get('unit_number', ''),
            'monthly_rent': t.get('monthly_rent', 0),
            'move_in_date': t.get('move_in_date', ''),
            'move_out_date': t.get('move_out_date', ''),
            'paid': payment.get('paid', False),
            'partial_amount': payment.get('partial_amount'),
            'note': payment.get('note', ''),
        })

    return {"year": year, "month": month, "tenants": tenants_data}


@router.put("/rent-tracking/{tenant_id}")
async def update_rent_payment(tenant_id: str, data: RentPaymentUpdate, year: int = Query(...), month: int = Query(...)):
    now = datetime.now(timezone.utc).isoformat()
    await db.rent_payments.update_one(
        {"tenant_id": tenant_id, "year": year, "month": month},
        {"$set": {
            "tenant_id": tenant_id, "year": year, "month": month,
            "paid": data.paid, "partial_amount": data.partial_amount,
            "note": data.note, "updated_at": now
        }},
        upsert=True
    )
    return {"message": "Payment updated"}
