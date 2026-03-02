"""
Core Business Logic Module for Property Management System

This module contains all date-range validation, income calculation,
vacancy calculation, and Airbnb distribution logic.
It is designed to be used standalone (POC) and later by FastAPI endpoints.
"""

from datetime import date, timedelta
from calendar import monthrange
from typing import List, Dict, Optional, Tuple
import math


# ============================================================
# DATE RANGE HELPERS
# ============================================================

def dates_overlap(start_a: date, end_a: date, start_b: date, end_b: date) -> bool:
    """
    Check if two date ranges overlap.
    Ranges are [start, end) — meaning end date is exclusive (move-out day).
    Same-day turnover (end_a == start_b) does NOT count as overlap.
    """
    return start_a < end_b and start_b < end_a


def nights_in_month(move_in: date, move_out: date, year: int, month: int) -> int:
    """
    Calculate the number of billable nights in a specific month.
    A night is counted on the check-in day (not the check-out day).
    So for a stay from Jan 28 to Feb 3:
      - Jan: 3 nights (28, 29, 30)
      - Feb: 3 nights (1, 2, ... but not Feb 3 which is checkout)
    Wait, that's Jan 28-31 = 3 nights (28,29,30) and Feb 1-2 = 2 nights. Total = 5 nights for 6 days.
    Actually: move_out - move_in = Feb 3 - Jan 28 = 6 days = 6 nights? No.
    
    Clarification: Airbnb checkout date is NOT a billable night.
    total_nights = (move_out - move_in).days
    For Jan 28 to Feb 3: 6 days = 6 nights? No, 6 days difference but checkout not billable.
    Actually (Feb 3 - Jan 28).days = 6. So 6 total nights. The guest sleeps nights of 28,29,30,31,1,2 = 6 nights.
    Checkout Feb 3 means they leave on Feb 3 morning. So billable nights = 6.
    
    For this month calculation:
    - The occupied period is [move_in, move_out) 
    - Each day in that range represents one billable night
    """
    # First day of this month
    month_start = date(year, month, 1)
    # First day of next month
    if month == 12:
        month_end = date(year + 1, 1, 1)
    else:
        month_end = date(year, month + 1, 1)
    
    # Overlap between [move_in, move_out) and [month_start, month_end)
    overlap_start = max(move_in, month_start)
    overlap_end = min(move_out, month_end)
    
    if overlap_start >= overlap_end:
        return 0
    
    return (overlap_end - overlap_start).days


def get_months_in_range(start_date: date, end_date: date) -> List[Tuple[int, int]]:
    """
    Return list of (year, month) tuples that a date range spans.
    Range is [start_date, end_date) — end_date exclusive.
    """
    months = []
    current = date(start_date.year, start_date.month, 1)
    while current < end_date:
        months.append((current.year, current.month))
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)
    return months


def days_in_month(year: int, month: int) -> int:
    """Return total days in a given month."""
    return monthrange(year, month)[1]


# ============================================================
# VALIDATION FUNCTIONS
# ============================================================

def validate_tenant_dates(
    move_in: date,
    move_out: date,
    unit_availability_start: date,
    unit_close_date: Optional[date],
    existing_tenants: List[Dict],
    exclude_tenant_id: Optional[str] = None
) -> List[str]:
    """
    Validate tenant dates against all rules. Returns list of error messages.
    Empty list = valid.
    
    existing_tenants: list of dicts with keys: 'id', 'move_in', 'move_out'
    """
    errors = []
    
    # Rule 1: move_out must be strictly after move_in
    if move_out <= move_in:
        errors.append("Move-out date must be after move-in date.")
    
    # Rule 2: move_in must be >= unit availability start date
    if move_in < unit_availability_start:
        errors.append(f"Move-in date cannot be before unit availability date ({unit_availability_start.isoformat()}).")
    
    # Rule 3: If unit has close_date, move_out must be <= close_date
    if unit_close_date and move_out > unit_close_date:
        errors.append(f"Move-out date cannot be after unit close date ({unit_close_date.isoformat()}).")
    
    # Rule 4: No overlapping tenants in same unit
    for tenant in existing_tenants:
        if exclude_tenant_id and tenant.get('id') == exclude_tenant_id:
            continue
        t_in = tenant['move_in']
        t_out = tenant['move_out']
        if dates_overlap(move_in, move_out, t_in, t_out):
            errors.append(
                f"Dates overlap with existing tenant (ID: {tenant.get('id', 'unknown')}, "
                f"{t_in.isoformat()} to {t_out.isoformat()}).")
    
    return errors


# ============================================================
# INCOME CALCULATIONS
# ============================================================

def calculate_airbnb_breakdown(
    move_in: date,
    move_out: date,
    total_rent: float
) -> Dict:
    """
    Calculate Airbnb/VRBO income breakdown by month.
    
    Returns dict with:
      - total_nights: int
      - rent_per_night: float
      - monthly_breakdown: list of {year, month, nights, income}
    """
    total_nights = (move_out - move_in).days
    if total_nights <= 0:
        return {
            'total_nights': 0,
            'rent_per_night': 0.0,
            'monthly_breakdown': []
        }
    
    rent_per_night = total_rent / total_nights
    
    months = get_months_in_range(move_in, move_out)
    breakdown = []
    distributed_total = 0.0
    
    for i, (year, month) in enumerate(months):
        nights = nights_in_month(move_in, move_out, year, month)
        if nights > 0:
            income = round(nights * rent_per_night, 2)
            distributed_total += income
            breakdown.append({
                'year': year,
                'month': month,
                'nights': nights,
                'income': income
            })
    
    # Fix rounding: adjust last month to ensure total matches
    if breakdown and abs(distributed_total - total_rent) > 0.001:
        diff = round(total_rent - distributed_total, 2)
        breakdown[-1]['income'] = round(breakdown[-1]['income'] + diff, 2)
    
    return {
        'total_nights': total_nights,
        'rent_per_night': round(rent_per_night, 2),
        'monthly_breakdown': breakdown
    }


def calculate_longterm_monthly_income(
    move_in: date,
    move_out: date,
    monthly_rent: float,
    additional_monthly_costs: List[Dict],
    partial_first_month: Optional[float] = None,
    partial_last_month: Optional[float] = None
) -> List[Dict]:
    """
    Calculate long-term tenant income by month.
    
    Returns list of {year, month, income} dicts.
    Deposits are NOT included.
    Additional monthly costs ARE included.
    """
    additional_total = sum(cost.get('amount', 0) for cost in additional_monthly_costs)
    months = get_months_in_range(move_in, move_out)
    
    if not months:
        return []
    
    result = []
    first_month = months[0]
    last_month = months[-1]
    
    for year, month in months:
        is_first = (year, month) == first_month
        is_last = (year, month) == last_month
        
        # Determine rent for this month
        if is_first and is_last:
            # Single month stay
            rent = partial_first_month if partial_first_month is not None else monthly_rent
        elif is_first:
            rent = partial_first_month if partial_first_month is not None else monthly_rent
        elif is_last:
            rent = partial_last_month if partial_last_month is not None else monthly_rent
        else:
            rent = monthly_rent
        
        total_income = rent + additional_total
        result.append({
            'year': year,
            'month': month,
            'income': round(total_income, 2)
        })
    
    return result


def get_tenant_income_for_month(
    tenant: Dict,
    year: int,
    month: int
) -> float:
    """
    Get income contribution of a single tenant for a specific month.
    tenant dict must have all necessary fields.
    """
    move_in = tenant['move_in']
    move_out = tenant['move_out']
    
    # Check if tenant is active in this month
    month_start = date(year, month, 1)
    if month == 12:
        month_end = date(year + 1, 1, 1)
    else:
        month_end = date(year, month + 1, 1)
    
    if move_in >= month_end or move_out <= month_start:
        return 0.0
    
    if tenant.get('is_airbnb_vrbo'):
        # Look up from monthly_breakdown
        for entry in tenant.get('monthly_breakdown', []):
            if entry['year'] == year and entry['month'] == month:
                return entry['income']
        return 0.0
    else:
        # Long-term: find from calculated breakdown
        months = get_months_in_range(move_in, move_out)
        if not months:
            return 0.0
        
        additional_total = sum(
            cost.get('amount', 0) 
            for cost in tenant.get('additional_monthly_costs', [])
        )
        
        first_month = months[0]
        last_month = months[-1]
        is_first = (year, month) == first_month
        is_last = (year, month) == last_month
        
        if is_first and tenant.get('partial_first_month') is not None:
            rent = tenant['partial_first_month']
        elif is_last and tenant.get('partial_last_month') is not None:
            rent = tenant['partial_last_month']
        else:
            rent = tenant.get('monthly_rent', 0)
        
        return round(rent + additional_total, 2)


# ============================================================
# VACANCY CALCULATIONS
# ============================================================

def calculate_unit_vacancy_for_month(
    tenants: List[Dict],
    year: int,
    month: int,
    unit_availability_start: date,
    unit_close_date: Optional[date] = None
) -> Dict:
    """
    Calculate vacancy for a single unit in a specific month.
    
    tenants: list of dicts with 'move_in' and 'move_out' date fields,
             sorted by move_in.
    
    Returns: {
        'total_days': int,      # days in this month the unit is available
        'occupied_days': int,
        'vacant_days': int,
        'vacancy_pct': float    # 0-100
    }
    
    Same-day turnover: if Tenant A moves out on Jan 15 and Tenant B moves in on Jan 15,
    Jan 15 is NOT vacant (Tenant B occupies from that night).
    """
    month_start = date(year, month, 1)
    total_days_in_month = days_in_month(year, month)
    if month == 12:
        month_end = date(year + 1, 1, 1)
    else:
        month_end = date(year, month + 1, 1)
    
    # Determine the effective window for this unit in this month
    effective_start = max(month_start, unit_availability_start)
    effective_end = month_end
    if unit_close_date:
        effective_end = min(effective_end, unit_close_date)
    
    if effective_start >= effective_end:
        return {
            'total_days': 0,
            'occupied_days': 0,
            'vacant_days': 0,
            'vacancy_pct': 0.0
        }
    
    total_available_days = (effective_end - effective_start).days
    
    # Build occupied set of days
    occupied_days_set = set()
    for tenant in tenants:
        t_start = max(tenant['move_in'], effective_start)
        t_end = min(tenant['move_out'], effective_end)
        if t_start < t_end:
            current = t_start
            while current < t_end:
                occupied_days_set.add(current)
                current += timedelta(days=1)
    
    occupied_count = len(occupied_days_set)
    vacant_count = total_available_days - occupied_count
    vacancy_pct = (vacant_count / total_available_days * 100) if total_available_days > 0 else 0.0
    
    return {
        'total_days': total_available_days,
        'occupied_days': occupied_count,
        'vacant_days': vacant_count,
        'vacancy_pct': round(vacancy_pct, 2)
    }


def find_upcoming_vacancies(
    units: List[Dict],
    from_date: date,
    months_ahead: int = 3
) -> List[Dict]:
    """
    Find upcoming vacancies in the next N months.
    
    units: list of dicts with:
        - 'unit_id', 'unit_number', 'property_name', 'property_id'
        - 'tenants': list of dicts with 'move_in', 'move_out' sorted by move_in
        - 'availability_start_date', 'close_date'
    
    Returns list of upcoming vacancy entries.
    """
    # Calculate the end boundary
    end_date = date(from_date.year, from_date.month, 1)
    for _ in range(months_ahead):
        if end_date.month == 12:
            end_date = date(end_date.year + 1, 1, 1)
        else:
            end_date = date(end_date.year, end_date.month + 1, 1)
    
    vacancies = []
    
    for unit in units:
        tenants = sorted(unit.get('tenants', []), key=lambda t: t['move_in'])
        unit_close = unit.get('close_date')
        
        # Skip units already closed
        if unit_close and unit_close <= from_date:
            continue
        
        # Find the last tenant whose move_out is after from_date
        # and check gaps
        relevant_tenants = [
            t for t in tenants 
            if t['move_out'] > from_date and t['move_in'] < end_date
        ]
        
        if not relevant_tenants:
            # No tenants in the window — check if unit is available
            # Find the last tenant before this window
            past_tenants = [t for t in tenants if t['move_out'] <= from_date]
            if past_tenants:
                last_move_out = max(t['move_out'] for t in past_tenants)
                vacancy_start = max(last_move_out, from_date)
            else:
                vacancy_start = max(unit.get('availability_start_date', from_date), from_date)
            
            if vacancy_start < end_date:
                vacancies.append({
                    'property_name': unit.get('property_name', ''),
                    'property_id': unit.get('property_id', ''),
                    'unit_number': unit.get('unit_number', ''),
                    'unit_id': unit.get('unit_id', ''),
                    'vacancy_start': vacancy_start,
                    'has_future_tenant': False,
                    'message': f"Vacant from {vacancy_start.isoformat()} forward"
                })
        else:
            # Check gaps between consecutive tenants and after last tenant
            for i, tenant in enumerate(relevant_tenants):
                if i == 0:
                    # Gap before first relevant tenant?
                    if tenant['move_in'] > from_date:
                        gap_start = from_date
                        gap_end = tenant['move_in']
                        if gap_start < gap_end:
                            vacancies.append({
                                'property_name': unit.get('property_name', ''),
                                'property_id': unit.get('property_id', ''),
                                'unit_number': unit.get('unit_number', ''),
                                'unit_id': unit.get('unit_id', ''),
                                'vacancy_start': gap_start,
                                'has_future_tenant': True,
                                'vacancy_end': gap_end,
                                'message': f"Vacant {gap_start.isoformat()} to {gap_end.isoformat()}"
                            })
                
                if i < len(relevant_tenants) - 1:
                    # Gap between this tenant and next
                    gap_start = tenant['move_out']
                    gap_end = relevant_tenants[i + 1]['move_in']
                    if gap_start < gap_end:  # Same-day turnover = no gap
                        vacancies.append({
                            'property_name': unit.get('property_name', ''),
                            'property_id': unit.get('property_id', ''),
                            'unit_number': unit.get('unit_number', ''),
                            'unit_id': unit.get('unit_id', ''),
                            'vacancy_start': gap_start,
                            'has_future_tenant': True,
                            'vacancy_end': gap_end,
                            'message': f"Vacant {gap_start.isoformat()} to {gap_end.isoformat()}"
                        })
                else:
                    # After last tenant
                    last_out = tenant['move_out']
                    if last_out < end_date:
                        vacancies.append({
                            'property_name': unit.get('property_name', ''),
                            'property_id': unit.get('property_id', ''),
                            'unit_number': unit.get('unit_number', ''),
                            'unit_id': unit.get('unit_id', ''),
                            'vacancy_start': last_out,
                            'has_future_tenant': False,
                            'message': f"Vacant from {last_out.isoformat()} forward"
                        })
    
    return vacancies
