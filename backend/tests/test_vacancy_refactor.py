"""
Tests for refactored core_logic.py vacancy functions.
Ensures the helpers and main find_upcoming_vacancies behave identically after refactoring.
"""
from datetime import date
from core_logic import (
    find_upcoming_vacancies, _make_vacancy, _add_vacancy_with_future_check,
    _calculate_end_date
)


def test_make_vacancy_with_end():
    unit = {'property_name': 'P1', 'property_id': 'p1', 'unit_number': '101', 'unit_id': 'u1'}
    v = _make_vacancy(unit, date(2026, 4, 1), date(2026, 5, 1))
    assert v['has_future_tenant'] is True
    assert v['vacancy_start'] == date(2026, 4, 1)
    assert v['vacancy_end'] == date(2026, 5, 1)
    assert 'to' in v['message']


def test_make_vacancy_open_ended():
    unit = {'property_name': 'P1', 'property_id': 'p1', 'unit_number': '101', 'unit_id': 'u1'}
    v = _make_vacancy(unit, date(2026, 4, 1))
    assert v['has_future_tenant'] is False
    assert 'forward' in v['message']


def test_calculate_end_date_days():
    result = _calculate_end_date(date(2026, 3, 1), 3, 90)
    assert result == date(2026, 5, 30)


def test_calculate_end_date_months():
    result = _calculate_end_date(date(2026, 3, 15), 3, None)
    assert result == date(2026, 6, 1)


def test_find_vacancies_no_tenants():
    units = [{
        'property_name': 'P1', 'property_id': 'p1',
        'unit_number': '101', 'unit_id': 'u1',
        'availability_start_date': date(2026, 1, 1),
        'tenants': []
    }]
    result = find_upcoming_vacancies(units, date(2026, 3, 1), months_ahead=3)
    assert len(result) == 1
    assert result[0]['has_future_tenant'] is False


def test_find_vacancies_gap_between_tenants():
    units = [{
        'property_name': 'P1', 'property_id': 'p1',
        'unit_number': '101', 'unit_id': 'u1',
        'availability_start_date': date(2026, 1, 1),
        'tenants': [
            {'move_in': date(2026, 3, 1), 'move_out': date(2026, 3, 15)},
            {'move_in': date(2026, 4, 1), 'move_out': date(2026, 5, 1)},
        ]
    }]
    result = find_upcoming_vacancies(units, date(2026, 3, 1), months_ahead=3)
    # Should find gap from 3/15 to 4/1
    gap = [v for v in result if v['vacancy_start'] == date(2026, 3, 15)]
    assert len(gap) == 1
    assert gap[0]['vacancy_end'] == date(2026, 4, 1)
    assert gap[0]['has_future_tenant'] is True


def test_find_vacancies_same_day_turnover():
    units = [{
        'property_name': 'P1', 'property_id': 'p1',
        'unit_number': '101', 'unit_id': 'u1',
        'availability_start_date': date(2026, 1, 1),
        'tenants': [
            {'move_in': date(2026, 3, 1), 'move_out': date(2026, 4, 1)},
            {'move_in': date(2026, 4, 1), 'move_out': date(2026, 5, 1)},
        ]
    }]
    result = find_upcoming_vacancies(units, date(2026, 3, 1), months_ahead=3)
    # Same-day turnover should produce no gaps between them
    gaps = [v for v in result if v.get('vacancy_end') == date(2026, 4, 1)]
    assert len(gaps) == 0


def test_find_vacancies_closed_unit_skipped():
    units = [{
        'property_name': 'P1', 'property_id': 'p1',
        'unit_number': '101', 'unit_id': 'u1',
        'close_date': date(2026, 1, 1),
        'availability_start_date': date(2025, 1, 1),
        'tenants': []
    }]
    result = find_upcoming_vacancies(units, date(2026, 3, 1), months_ahead=3)
    assert len(result) == 0


def test_find_vacancies_days_ahead():
    units = [{
        'property_name': 'P1', 'property_id': 'p1',
        'unit_number': '101', 'unit_id': 'u1',
        'availability_start_date': date(2026, 1, 1),
        'tenants': [
            {'move_in': date(2026, 3, 1), 'move_out': date(2026, 3, 10)},
        ]
    }]
    result = find_upcoming_vacancies(units, date(2026, 3, 1), days_ahead=30)
    # After 3/10, unit is vacant with no future tenant
    after = [v for v in result if v['vacancy_start'] == date(2026, 3, 10)]
    assert len(after) == 1
    assert after[0]['has_future_tenant'] is False


if __name__ == '__main__':
    test_make_vacancy_with_end()
    test_make_vacancy_open_ended()
    test_calculate_end_date_days()
    test_calculate_end_date_months()
    test_find_vacancies_no_tenants()
    test_find_vacancies_gap_between_tenants()
    test_find_vacancies_same_day_turnover()
    test_find_vacancies_closed_unit_skipped()
    test_find_vacancies_days_ahead()
    print("All core_logic vacancy tests passed!")
