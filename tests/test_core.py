"""
POC Test Script for Property Management Core Logic

Tests all core business logic in isolation:
1. Date overlap detection
2. Tenant validation rules
3. Airbnb income distribution
4. Long-term tenant income calculation
5. Vacancy calculations
6. Same-day turnover handling
7. Cross-month/year boundary edge cases
"""

import sys
sys.path.insert(0, '/app/backend')

from datetime import date
from core_logic import (
    dates_overlap,
    nights_in_month,
    get_months_in_range,
    days_in_month,
    validate_tenant_dates,
    calculate_airbnb_breakdown,
    calculate_longterm_monthly_income,
    get_tenant_income_for_month,
    calculate_unit_vacancy_for_month,
    find_upcoming_vacancies
)

passed = 0
failed = 0

def assert_test(name, condition, detail=""):
    global passed, failed
    if condition:
        print(f"  PASS: {name}")
        passed += 1
    else:
        print(f"  FAIL: {name} — {detail}")
        failed += 1


# ============================================================
# TEST 1: DATE OVERLAP DETECTION
# ============================================================
def test_date_overlaps():
    print("\n=== TEST 1: Date Overlap Detection ===")
    
    # Case 1: No overlap - B starts after A ends
    result = dates_overlap(date(2025, 1, 1), date(2025, 1, 31), date(2025, 2, 1), date(2025, 2, 28))
    assert_test("No overlap (A before B)", result == False, f"Expected False, got {result}")
    
    # Case 2: Same-day turnover - A ends Jan 15, B starts Jan 15 → NOT overlap
    result = dates_overlap(date(2025, 1, 1), date(2025, 1, 15), date(2025, 1, 15), date(2025, 2, 15))
    assert_test("Same-day turnover (not overlap)", result == False, f"Expected False, got {result}")
    
    # Case 3: Clear overlap
    result = dates_overlap(date(2025, 1, 1), date(2025, 1, 20), date(2025, 1, 10), date(2025, 2, 15))
    assert_test("Clear overlap", result == True, f"Expected True, got {result}")
    
    # Case 4: B contained within A
    result = dates_overlap(date(2025, 1, 1), date(2025, 3, 1), date(2025, 1, 15), date(2025, 2, 15))
    assert_test("B contained within A", result == True, f"Expected True, got {result}")
    
    # Case 5: Identical ranges
    result = dates_overlap(date(2025, 1, 1), date(2025, 2, 1), date(2025, 1, 1), date(2025, 2, 1))
    assert_test("Identical ranges", result == True, f"Expected True, got {result}")


# ============================================================
# TEST 2: NIGHTS IN MONTH
# ============================================================
def test_nights_in_month():
    print("\n=== TEST 2: Nights In Month ===")
    
    # Stay from Jan 28 to Feb 3 (6 total nights)
    jan_nights = nights_in_month(date(2025, 1, 28), date(2025, 2, 3), 2025, 1)
    assert_test("Jan 28-Feb 3: Jan nights", jan_nights == 4, f"Expected 4, got {jan_nights}")
    # Jan 28,29,30,31 = 4 nights in Jan
    
    feb_nights = nights_in_month(date(2025, 1, 28), date(2025, 2, 3), 2025, 2)
    assert_test("Jan 28-Feb 3: Feb nights", feb_nights == 2, f"Expected 2, got {feb_nights}")
    # Feb 1,2 = 2 nights in Feb (Feb 3 is checkout, not counted)
    
    total = jan_nights + feb_nights
    assert_test("Jan 28-Feb 3: Total nights", total == 6, f"Expected 6, got {total}")
    
    # Full month stay Jan 1 to Feb 1 (31 nights)
    full_jan = nights_in_month(date(2025, 1, 1), date(2025, 2, 1), 2025, 1)
    assert_test("Full Jan (Jan 1 - Feb 1)", full_jan == 31, f"Expected 31, got {full_jan}")
    
    # Stay entirely in March, check Feb
    feb_check = nights_in_month(date(2025, 3, 1), date(2025, 3, 15), 2025, 2)
    assert_test("No nights in unrelated month", feb_check == 0, f"Expected 0, got {feb_check}")
    
    # Cross-year: Dec 28 to Jan 5
    dec_nights = nights_in_month(date(2025, 12, 28), date(2026, 1, 5), 2025, 12)
    assert_test("Dec 28-Jan 5: Dec nights", dec_nights == 4, f"Expected 4, got {dec_nights}")
    # Dec 28,29,30,31 = 4 nights
    
    jan_nights_cross = nights_in_month(date(2025, 12, 28), date(2026, 1, 5), 2026, 1)
    assert_test("Dec 28-Jan 5: Jan nights", jan_nights_cross == 4, f"Expected 4, got {jan_nights_cross}")
    # Jan 1,2,3,4 = 4 nights


# ============================================================
# TEST 3: TENANT VALIDATION
# ============================================================
def test_tenant_validation():
    print("\n=== TEST 3: Tenant Validation ===")
    
    unit_avail = date(2025, 1, 1)
    unit_close = date(2025, 12, 31)
    
    existing = [
        {'id': 't1', 'move_in': date(2025, 3, 1), 'move_out': date(2025, 6, 1)},
        {'id': 't2', 'move_in': date(2025, 6, 1), 'move_out': date(2025, 9, 1)}  # Same-day turnover with t1
    ]
    
    # Valid: before t1
    errors = validate_tenant_dates(date(2025, 1, 15), date(2025, 3, 1), unit_avail, unit_close, existing)
    assert_test("Valid tenant before existing", len(errors) == 0, f"Errors: {errors}")
    
    # Valid: after t2
    errors = validate_tenant_dates(date(2025, 9, 1), date(2025, 11, 1), unit_avail, unit_close, existing)
    assert_test("Valid tenant after existing", len(errors) == 0, f"Errors: {errors}")
    
    # Invalid: overlaps t1
    errors = validate_tenant_dates(date(2025, 2, 15), date(2025, 4, 1), unit_avail, unit_close, existing)
    assert_test("Overlap detected", len(errors) > 0, f"Expected errors, got none")
    
    # Invalid: before unit availability
    errors = validate_tenant_dates(date(2024, 12, 1), date(2025, 1, 15), unit_avail, unit_close, existing)
    assert_test("Before availability rejected", any('availability' in e.lower() for e in errors), f"Errors: {errors}")
    
    # Invalid: after unit close date
    errors = validate_tenant_dates(date(2025, 11, 1), date(2026, 2, 1), unit_avail, unit_close, existing)
    assert_test("After close date rejected", any('close' in e.lower() for e in errors), f"Errors: {errors}")
    
    # Invalid: move_out before move_in
    errors = validate_tenant_dates(date(2025, 5, 1), date(2025, 4, 1), unit_avail, unit_close, existing)
    assert_test("Move-out before move-in rejected", any('after' in e.lower() for e in errors), f"Errors: {errors}")
    
    # Valid: Same-day turnover with t2 (move_in = t2's move_out)
    errors = validate_tenant_dates(date(2025, 9, 1), date(2025, 10, 1), unit_avail, unit_close, existing)
    assert_test("Same-day turnover accepted", len(errors) == 0, f"Errors: {errors}")


# ============================================================
# TEST 4: AIRBNB INCOME BREAKDOWN
# ============================================================
def test_airbnb_income():
    print("\n=== TEST 4: Airbnb Income Breakdown ===")
    
    # Example from problem: 50 nights, $5000 total → $100/night
    result = calculate_airbnb_breakdown(
        move_in=date(2025, 1, 10),
        move_out=date(2025, 3, 1),  # 50 days = 50 nights
        total_rent=5000.0
    )
    
    assert_test("Total nights = 50", result['total_nights'] == 50, f"Got {result['total_nights']}")
    assert_test("Rent per night = $100", result['rent_per_night'] == 100.0, f"Got {result['rent_per_night']}")
    
    # January: Jan 10 to Jan 31 = 21 nights (10,11,...,30) actually Jan 10 to Feb 1 boundary
    # Jan nights: Jan 10 - Jan 31 = 22 days? Let me recalc.
    # nights_in_month(Jan 10, Mar 1, 2025, 1): overlap [Jan 10, Feb 1) = 22 days
    jan_entry = next((e for e in result['monthly_breakdown'] if e['month'] == 1), None)
    assert_test("Jan has 22 nights", jan_entry and jan_entry['nights'] == 22, 
                f"Got {jan_entry}")
    assert_test("Jan income = $2200", jan_entry and jan_entry['income'] == 2200.0, 
                f"Got {jan_entry}")
    
    # February: Feb 1 to Mar 1 = 28 nights
    feb_entry = next((e for e in result['monthly_breakdown'] if e['month'] == 2), None)
    assert_test("Feb has 28 nights", feb_entry and feb_entry['nights'] == 28, 
                f"Got {feb_entry}")
    assert_test("Feb income = $2800", feb_entry and feb_entry['income'] == 2800.0, 
                f"Got {feb_entry}")
    
    # Total distributed income should equal total rent
    total_distributed = sum(e['income'] for e in result['monthly_breakdown'])
    assert_test("Total distributed = $5000", abs(total_distributed - 5000.0) < 0.01, 
                f"Got {total_distributed}")
    
    # Cross-year Airbnb stay: Dec 15 to Jan 15
    result2 = calculate_airbnb_breakdown(
        move_in=date(2025, 12, 15),
        move_out=date(2026, 1, 15),
        total_rent=3100.0  # 31 nights
    )
    assert_test("Cross-year: 31 nights", result2['total_nights'] == 31, f"Got {result2['total_nights']}")
    assert_test("Cross-year: $100/night", result2['rent_per_night'] == 100.0, f"Got {result2['rent_per_night']}")
    
    dec_entry = next((e for e in result2['monthly_breakdown'] if e['year'] == 2025 and e['month'] == 12), None)
    jan_entry2 = next((e for e in result2['monthly_breakdown'] if e['year'] == 2026 and e['month'] == 1), None)
    assert_test("Cross-year: Dec 17 nights", dec_entry and dec_entry['nights'] == 17, f"Got {dec_entry}")
    # Dec 15-31 = 17 days (15,16,...,31)
    assert_test("Cross-year: Jan 14 nights", jan_entry2 and jan_entry2['nights'] == 14, f"Got {jan_entry2}")
    # Jan 1-14 = 14 days


# ============================================================
# TEST 5: LONG-TERM TENANT INCOME
# ============================================================
def test_longterm_income():
    print("\n=== TEST 5: Long-term Tenant Income ===")
    
    # Standard tenant: Mar 1 - Jun 1, $1500/month, $50 parking
    result = calculate_longterm_monthly_income(
        move_in=date(2025, 3, 1),
        move_out=date(2025, 6, 1),
        monthly_rent=1500.0,
        additional_monthly_costs=[{'name': 'Parking', 'amount': 50.0}]
    )
    
    assert_test("3 months of income", len(result) == 3, f"Got {len(result)} months")
    assert_test("Each month = $1550", all(r['income'] == 1550.0 for r in result), 
                f"Got {[r['income'] for r in result]}")
    
    # Partial first month: $800 first month override
    result2 = calculate_longterm_monthly_income(
        move_in=date(2025, 3, 15),
        move_out=date(2025, 6, 1),
        monthly_rent=1500.0,
        additional_monthly_costs=[{'name': 'Parking', 'amount': 50.0}],
        partial_first_month=800.0
    )
    
    assert_test("Partial first month = $850", result2[0]['income'] == 850.0, 
                f"Got {result2[0]['income']}")
    assert_test("Full second month = $1550", result2[1]['income'] == 1550.0, 
                f"Got {result2[1]['income']}")
    
    # Partial last month
    result3 = calculate_longterm_monthly_income(
        move_in=date(2025, 3, 1),
        move_out=date(2025, 6, 15),
        monthly_rent=1500.0,
        additional_monthly_costs=[],
        partial_last_month=750.0
    )
    
    assert_test("4 months total", len(result3) == 4, f"Got {len(result3)} months")
    assert_test("Last month partial = $750", result3[-1]['income'] == 750.0, 
                f"Got {result3[-1]['income']}")


# ============================================================
# TEST 6: VACANCY CALCULATIONS
# ============================================================
def test_vacancy():
    print("\n=== TEST 6: Vacancy Calculations ===")
    
    # Unit available Jan 1, no close date
    # Tenant A: Jan 1 - Feb 1 (full January)
    # Tenant B: Feb 1 - Mar 1 (same-day turnover, full February)
    # March: completely vacant
    
    tenants = [
        {'move_in': date(2025, 1, 1), 'move_out': date(2025, 2, 1)},
        {'move_in': date(2025, 2, 1), 'move_out': date(2025, 3, 1)}
    ]
    
    jan = calculate_unit_vacancy_for_month(tenants, 2025, 1, date(2025, 1, 1))
    assert_test("Jan fully occupied", jan['vacant_days'] == 0, f"Got {jan['vacant_days']} vacant days")
    assert_test("Jan 0% vacancy", jan['vacancy_pct'] == 0.0, f"Got {jan['vacancy_pct']}%")
    
    feb = calculate_unit_vacancy_for_month(tenants, 2025, 2, date(2025, 1, 1))
    assert_test("Feb fully occupied (same-day turnover)", feb['vacant_days'] == 0, 
                f"Got {feb['vacant_days']} vacant days")
    
    mar = calculate_unit_vacancy_for_month(tenants, 2025, 3, date(2025, 1, 1))
    assert_test("Mar fully vacant", mar['vacant_days'] == 31, f"Got {mar['vacant_days']} vacant days")
    assert_test("Mar 100% vacancy", mar['vacancy_pct'] == 100.0, f"Got {mar['vacancy_pct']}%")
    
    # Partial vacancy: Tenant from Jan 10 - Jan 20
    partial_tenants = [
        {'move_in': date(2025, 1, 10), 'move_out': date(2025, 1, 20)}
    ]
    jan_partial = calculate_unit_vacancy_for_month(partial_tenants, 2025, 1, date(2025, 1, 1))
    assert_test("Partial Jan: 10 occupied days", jan_partial['occupied_days'] == 10, 
                f"Got {jan_partial['occupied_days']}")
    assert_test("Partial Jan: 21 vacant days", jan_partial['vacant_days'] == 21, 
                f"Got {jan_partial['vacant_days']}")
    
    # Unit with close date: available Jan 1, closes Jan 15
    closed_jan = calculate_unit_vacancy_for_month([], 2025, 1, date(2025, 1, 1), date(2025, 1, 15))
    assert_test("Closed unit: 14 total available days", closed_jan['total_days'] == 14, 
                f"Got {closed_jan['total_days']}")
    assert_test("Closed unit: all 14 vacant", closed_jan['vacant_days'] == 14, 
                f"Got {closed_jan['vacant_days']}")


# ============================================================
# TEST 7: UPCOMING VACANCIES
# ============================================================
def test_upcoming_vacancies():
    print("\n=== TEST 7: Upcoming Vacancies ===")
    
    from_date = date(2025, 6, 1)
    
    units = [
        {
            'unit_id': 'u1',
            'unit_number': '101',
            'property_name': 'Sunset Apartments',
            'property_id': 'p1',
            'availability_start_date': date(2025, 1, 1),
            'close_date': None,
            'tenants': [
                {'move_in': date(2025, 3, 1), 'move_out': date(2025, 7, 1)},
                # Gap from Jul 1 to Aug 1
                {'move_in': date(2025, 8, 1), 'move_out': date(2025, 12, 1)}
            ]
        },
        {
            'unit_id': 'u2',
            'unit_number': '102',
            'property_name': 'Sunset Apartments',
            'property_id': 'p1',
            'availability_start_date': date(2025, 1, 1),
            'close_date': None,
            'tenants': [
                {'move_in': date(2025, 1, 1), 'move_out': date(2025, 6, 15)}
                # No future tenant after Jun 15
            ]
        },
        {
            'unit_id': 'u3',
            'unit_number': '201',
            'property_name': 'Oak Ridge',
            'property_id': 'p2',
            'availability_start_date': date(2025, 1, 1),
            'close_date': None,
            'tenants': [
                {'move_in': date(2025, 1, 1), 'move_out': date(2025, 9, 1)},
                {'move_in': date(2025, 9, 1), 'move_out': date(2025, 12, 1)}
                # Same-day turnover → no vacancy
            ]
        }
    ]
    
    result = find_upcoming_vacancies(units, from_date, months_ahead=3)
    
    # u1 should have a gap Jul 1 - Aug 1
    u1_vacancies = [v for v in result if v['unit_id'] == 'u1']
    assert_test("Unit 101 has vacancy Jul 1-Aug 1", 
                len(u1_vacancies) == 1 and u1_vacancies[0]['vacancy_start'] == date(2025, 7, 1),
                f"Got {u1_vacancies}")
    
    # u2 should show vacant from Jun 15 forward
    u2_vacancies = [v for v in result if v['unit_id'] == 'u2']
    assert_test("Unit 102 vacant from Jun 15 forward", 
                len(u2_vacancies) == 1 and u2_vacancies[0]['vacancy_start'] == date(2025, 6, 15),
                f"Got {u2_vacancies}")
    assert_test("Unit 102 no future tenant", 
                u2_vacancies[0]['has_future_tenant'] == False,
                f"Got {u2_vacancies[0]}")
    
    # u3 should have NO vacancy (same-day turnover)
    u3_vacancies = [v for v in result if v['unit_id'] == 'u3']
    assert_test("Unit 201 no vacancy (same-day turnover)", 
                len(u3_vacancies) == 0,
                f"Got {u3_vacancies}")


# ============================================================
# TEST 8: EDGE CASES
# ============================================================
def test_edge_cases():
    print("\n=== TEST 8: Edge Cases ===")
    
    # Single night stay
    result = calculate_airbnb_breakdown(
        move_in=date(2025, 1, 31),
        move_out=date(2025, 2, 1),
        total_rent=150.0
    )
    assert_test("Single night: 1 total night", result['total_nights'] == 1, f"Got {result['total_nights']}")
    assert_test("Single night: $150/night", result['rent_per_night'] == 150.0, f"Got {result['rent_per_night']}")
    assert_test("Single night: 1 month in breakdown", len(result['monthly_breakdown']) == 1, 
                f"Got {len(result['monthly_breakdown'])}")
    
    # Leap year: Feb 2024 has 29 days
    feb_leap = nights_in_month(date(2024, 2, 1), date(2024, 3, 1), 2024, 2)
    assert_test("Leap year Feb: 29 nights", feb_leap == 29, f"Got {feb_leap}")
    
    # Non-leap year: Feb 2025 has 28 days
    feb_normal = nights_in_month(date(2025, 2, 1), date(2025, 3, 1), 2025, 2)
    assert_test("Normal Feb: 28 nights", feb_normal == 28, f"Got {feb_normal}")
    
    # Validation: move_out == move_in (0 days, invalid)
    errors = validate_tenant_dates(date(2025, 5, 1), date(2025, 5, 1), date(2025, 1, 1), None, [])
    assert_test("Same day move-in/out rejected", len(errors) > 0, f"Expected error, got none")
    
    # Unit with no close date: tenant can go far into future
    errors = validate_tenant_dates(date(2025, 1, 1), date(2030, 1, 1), date(2025, 1, 1), None, [])
    assert_test("No close date: far future allowed", len(errors) == 0, f"Errors: {errors}")
    
    # Multiple additional monthly costs
    result = calculate_longterm_monthly_income(
        move_in=date(2025, 1, 1),
        move_out=date(2025, 2, 1),
        monthly_rent=2000.0,
        additional_monthly_costs=[
            {'name': 'Parking', 'amount': 75.0},
            {'name': 'Storage', 'amount': 50.0},
            {'name': 'Pet fee', 'amount': 25.0}
        ]
    )
    assert_test("Multiple costs: $2150 total", result[0]['income'] == 2150.0, 
                f"Got {result[0]['income']}")


# ============================================================
# RUN ALL TESTS
# ============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("PROPERTY MANAGEMENT CORE LOGIC — POC TEST")
    print("=" * 60)
    
    test_date_overlaps()
    test_nights_in_month()
    test_tenant_validation()
    test_airbnb_income()
    test_longterm_income()
    test_vacancy()
    test_upcoming_vacancies()
    test_edge_cases()
    
    print("\n" + "=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed out of {passed + failed} tests")
    print("=" * 60)
    
    if failed > 0:
        print("\n*** SOME TESTS FAILED — FIX BEFORE PROCEEDING ***")
        sys.exit(1)
    else:
        print("\n*** ALL TESTS PASSED — CORE LOGIC VERIFIED ***")
        sys.exit(0)
