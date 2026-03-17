from fastapi import APIRouter, Query
from typing import Optional
from datetime import datetime, date
from bson import ObjectId

from database import db
from helpers import serialize_doc, parse_date
from core_logic import (
    calculate_unit_vacancy_for_month,
    find_upcoming_vacancies,
    days_in_month
)

router = APIRouter()


# ============================================================
# CALENDAR (day-by-day)
# ============================================================

@router.get("/calendar")
async def get_calendar(year: int = Query(default=None)):
    if year is None:
        year = datetime.now().year

    all_tenants = await db.tenants.find().to_list(5000)
    all_units = await db.units.find().to_list(5000)
    all_properties = await db.properties.find().to_list(1000)
    all_leads = await db.leads.find().to_list(1000)

    properties_data = []
    for prop in all_properties:
        prop_id = str(prop['_id'])
        prop_units = [u for u in all_units if u.get('property_id') == prop_id]

        units_data = []
        for unit in prop_units:
            unit_id = str(unit['_id'])
            unit_tenants = [t for t in all_tenants if t.get('unit_id') == unit_id]

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

                    for tenant in unit_tenants:
                        t_in = parse_date(tenant['move_in_date'])
                        t_out = parse_date(tenant['move_out_date'])
                        if t_in <= current_date < t_out:
                            day_info['status'] = 'occupied'
                            day_info['tenant_name'] = tenant.get('name', '')
                            if tenant.get('is_airbnb_vrbo'):
                                day_info['status'] = 'airbnb'
                            break

                    for lead in all_leads:
                        if unit_id in lead.get('potential_unit_ids', []):
                            l_start = parse_date(lead['desired_start_date']) if lead.get('desired_start_date') else None
                            l_end = parse_date(lead['desired_end_date']) if lead.get('desired_end_date') else None
                            if l_start and l_end and l_start <= current_date <= l_end:
                                day_info['lead_names'].append(lead.get('name', ''))

                    days_data.append(day_info)

                months_data.append({'month': month, 'days': days_data})

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

    return {'year': year, 'properties': properties_data}


# ============================================================
# CALENDAR TIMELINE (segment-based)
# ============================================================

@router.get("/calendar/timeline")
async def get_calendar_timeline(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    property_id: Optional[str] = None
):
    today = date.today()
    if start_date:
        range_start = parse_date(start_date)
    else:
        m = today.month - 3
        y = today.year
        while m < 1:
            m += 12
            y -= 1
        range_start = date(y, m, 1)

    if end_date:
        range_end = parse_date(end_date)
    else:
        m = today.month + 15
        y = today.year
        while m > 12:
            m -= 12
            y += 1
        range_end = date(y, m, days_in_month(y, m))

    query = {}
    if property_id:
        query["property_id"] = property_id

    all_properties = await db.properties.find().to_list(1000)
    all_units = await db.units.find(query if property_id else {}).to_list(5000)
    all_tenants = await db.tenants.find().to_list(5000)
    all_leads = await db.leads.find({"converted_to_tenant": {"$ne": True}}).to_list(1000)

    if property_id:
        all_properties = [p for p in all_properties if str(p['_id']) == property_id]

    properties_data = []
    for prop in all_properties:
        pid = str(prop['_id'])
        prop_units = [u for u in all_units if u.get('property_id') == pid]

        units_data = []
        for unit in prop_units:
            uid = str(unit['_id'])

            bookings = []
            unit_tenants = [t for t in all_tenants if t.get('unit_id') == uid]
            for t in unit_tenants:
                t_in = parse_date(t['move_in_date'])
                t_out = parse_date(t['move_out_date'])
                if t_in >= range_end or t_out <= range_start:
                    continue
                rent_amount = t.get('total_rent') if t.get('is_airbnb_vrbo') else t.get('monthly_rent')
                bookings.append({
                    'tenant_id': str(t['_id']),
                    'name': t.get('name', ''),
                    'start_date': t_in.isoformat(),
                    'end_date': t_out.isoformat(),
                    'is_airbnb_vrbo': t.get('is_airbnb_vrbo', False),
                    'rent_amount': rent_amount
                })
            bookings.sort(key=lambda b: b['start_date'])

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
            leads_segments.sort(key=lambda ls: ls['start_date'])

            units_data.append({
                'unit_id': uid,
                'unit_number': unit.get('unit_number', ''),
                'unit_size': unit.get('unit_size', ''),
                'base_rent': unit.get('base_rent', 0),
                'bookings': bookings,
                'leads': leads_segments
            })

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
# VACANCY
# ============================================================

@router.get("/vacancy")
async def get_vacancy(year: int = Query(default=None)):
    if year is None:
        year = datetime.now().year

    all_tenants = await db.tenants.find().to_list(5000)
    all_units = await db.units.find().to_list(5000)
    all_properties = await db.properties.find().to_list(1000)

    prop_map = {str(p['_id']): p for p in all_properties}

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

    by_building = {}
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
            vacancy = calculate_unit_vacancy_for_month(unit_tenants, year, month, unit_avail, unit_close)

            if prop_id not in by_building:
                by_building[prop_id] = {
                    'property_name': prop_name, 'property_id': prop_id,
                    'building_id': prop.get('building_id'),
                    'months': {m: {'total_days': 0, 'vacant_days': 0, 'units': []} for m in range(1, 13)}
                }
            by_building[prop_id]['months'][month]['total_days'] += vacancy['total_days']
            by_building[prop_id]['months'][month]['vacant_days'] += vacancy['vacant_days']
            by_building[prop_id]['months'][month]['units'].append({
                'unit_id': unit_id, 'unit_number': unit.get('unit_number', ''),
                'vacant_days': vacancy['vacant_days'], 'total_days': vacancy['total_days'],
                'vacancy_pct': vacancy['vacancy_pct']
            })

            if unit_size not in by_unit_size:
                by_unit_size[unit_size] = {
                    'unit_size': unit_size,
                    'months': {m: {'total_days': 0, 'vacant_days': 0} for m in range(1, 13)}
                }
            by_unit_size[unit_size]['months'][month]['total_days'] += vacancy['total_days']
            by_unit_size[unit_size]['months'][month]['vacant_days'] += vacancy['vacant_days']

    building_list = []
    for bid, bdata in by_building.items():
        months_list = []
        for m in range(1, 13):
            md = bdata['months'][m]
            pct = (md['vacant_days'] / md['total_days'] * 100) if md['total_days'] > 0 else 0
            months_list.append({
                'month': m, 'total_days': md['total_days'],
                'vacant_days': md['vacant_days'], 'vacancy_pct': round(pct, 2),
                'units': md['units']
            })
        building_list.append({
            'property_name': bdata['property_name'],
            'property_id': bdata['property_id'],
            'building_id': bdata.get('building_id'),
            'months': months_list
        })

    # Sort by_building by building_id ascending (numeric), nulls last
    def building_sort_key(b):
        bid = b.get('building_id')
        if bid is None:
            return (1, 0, b.get('property_name', ''))
        return (0, int(bid), b.get('property_name', ''))
    building_list.sort(key=building_sort_key)

    size_list = []
    for size_key, sdata in by_unit_size.items():
        months_list = []
        for m in range(1, 13):
            md = sdata['months'][m]
            pct = (md['vacant_days'] / md['total_days'] * 100) if md['total_days'] > 0 else 0
            months_list.append({
                'month': m, 'total_days': md['total_days'],
                'vacant_days': md['vacant_days'], 'vacancy_pct': round(pct, 2)
            })
        size_list.append({'unit_size': sdata['unit_size'], 'months': months_list})

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

    upcoming = find_upcoming_vacancies(units_for_upcoming, today, days_ahead=90)
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
