# plan.md

## 1) Objectives
- **(Completed)** Prove the **core occupancy engine** works: tenant date-range validation (no overlaps), unit availability/close-date constraints, and month/year navigation primitives.
- **(Completed)** Prove **income + vacancy calculations** are correct for long-term and Airbnb/VRBO (nightly distribution across months).
- **(Completed)** Build a V1 FastAPI + MongoDB + React (shadcn/ui) app around the proven core: CRUD for Properties/Units/Tenants/Leads, Notifications, Calendar, Income, Vacancy.
- **(Completed)** Add **Notes** (backend CRUD + frontend Notes page + navigation).
- **(Completed)** Redesign **Calendar** into a horizontal, scrollable **occupancy timeline** (simplified Airbnb host calendar) optimized for dense operational viewing.
- **(Now)** Stabilize UX and correctness after MVP: tighten UI validation, improve error messages, resolve minor UI friction (modal overlay), standardize `data-testid` hooks, and reconcile low-priority test expectation mismatches.
- **(Next)** Prepare for future extensions (Firebase/Supabase-ready structure, multi-user/auth, exports, audit log) without breaking current single-user workflows.

---

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation: calculations + validation) ✅ COMPLETED
**Goal:** lock correctness of the business logic before UI-heavy work.

User stories:
1. As a user, I can add tenants to a unit and the system blocks overlapping leases.
2. As a user, I can model same-day turnover without vacancy days being counted.
3. As a user, I can enter an Airbnb stay and see the income split correctly across months by nights.
4. As a user, I can see vacancy days/% per month for a unit from tenant timelines.
5. As a user, I can generate year/month summaries for income and vacancy for any selected year.

Steps (completed):
- Implemented a standalone **Python POC module** (`/app/backend/core_logic.py`) with:
  - Date-range helpers (overlap, nights-per-month, month iterator).
  - Validation functions: overlap detection, availability_start_date/close_date constraints, move_out > move_in.
  - Income functions:
    - Long-term: monthly_rent + additional_costs; partial overrides for first/last month.
    - Airbnb: total_nights, rent_per_night, distribute to months by nights.
  - Vacancy functions:
    - Per unit per month vacant_days + vacancy% based on occupied days.
- Added a comprehensive POC test suite (`/app/tests/test_core.py`).

Deliverable (completed):
- ✅ **57/57 tests passed** validating overlap detection, Airbnb distribution, long-term income, vacancy logic, close-date handling, leap-year handling.

---

### Phase 2 — V1 App Development (MVP) ✅ COMPLETED
**Goal:** build the app around the proven core with minimal but complete flows.

User stories:
1. As a user, I can create a property and add units with rent/costs and availability/close dates.
2. As a user, I can assign tenants (long-term or Airbnb) to units and immediately see validation errors if invalid.
3. As a user, I can view occupancy visually and understand availability at a glance.
4. As a user, I can view Income for the current month and expand the current year breakdown by property → unit → tenant.
5. As a user, I can manage leads through stages and create in-app notifications with a due date.

Backend (FastAPI + MongoDB) (completed):
- ✅ Implemented collections and endpoints:
  - CRUD: Properties, Units, Tenants, Leads, Notifications, Notes.
  - Calculation endpoints:
    - `GET /income?year=YYYY` (month totals + drilldown property→unit→tenant).
    - `GET /vacancy?year=YYYY` (by building, by unit size, upcoming vacancies).
    - `GET /calendar?year=YYYY` (legacy day-by-day 12-month payload; retained for compatibility).
  - Utility endpoints:
    - `GET /available-units?start_date=...&end_date=...` for lead form filtering.
    - `GET /dashboard` summary counts.
- ✅ Validation at write-time:
  - Tenant create/update enforces overlap/availability/close_date/move-out rules.
  - Lead stage=2 requires showing_date.
- ✅ Airbnb/VRBO tenant creates monthly breakdown stored on tenant record.

Frontend (React + shadcn/ui, modern/light) (completed):
- ✅ App shell: sidebar navigation + topbar + notification bell.
- ✅ Pages: Properties, Tenants, Leads, Income, Vacancy, Calendar, Notes, Features.
- ✅ CRUD screens:
  - Properties: list + create/edit dialog + amenities tags + pets toggle.
  - Units: list + property filter + create/edit dialog + repeatable monthly costs.
  - Tenants: list + create/edit dialog + Airbnb toggle + conditional fields.
  - Leads: list with color-coded strength rows + stage progression + convert-to-tenant flow.
  - Notes: card grid + create/edit/delete.
- ✅ Notifications:
  - Top bell opens side sheet; Active vs Viewed; mark read; delete.

End of phase testing (completed):
- ✅ Automated testing report:
  - Backend: **31/32 tests passed (96.9%)**
  - Frontend: **95% pass rate**
  - No critical bugs.

---

### Phase 3 — Hardening + UX improvements (NOW / In Progress)
**Goal:** resolve minor issues found in testing, improve reliability, consistency, and UX polish.

User stories:
1. As a user, I can edit/create records with clear, field-specific validation messages.
2. As a user, I can use dialogs reliably without click-blocking/overlay issues.
3. As a user, I can quickly find records with filters/search and stable performance.
4. As a user, I can navigate time ranges smoothly and trust calculations.
5. As a user, I can manage notifications (read/delete) easily without losing context.

Current status notes:
- ✅ Calendar timeline redesign is complete and regression-tested.
- 🟡 Two low-priority backend “issues” observed by testing are **expectation mismatches**, not functional defects:
  - `POST /api/units`: invalid `property_id` can yield 422 vs expected 404.
  - Tenant move-out testing setup: date validation prevents creating certain past-dated records.

Steps (in progress / next):
- UX + validation polish:
  - Add inline field validation hints and clearer backend error surfacing (per field where feasible).
  - Review and fix any modal/dialog overlay behavior if users report blocked clicks.
- Data-testid and testing stability:
  - Ensure consistent `data-testid` coverage across newly added timeline controls and interactions.
  - Add/adjust tests for any new selectors.
- Performance + correctness:
  - Add pagination/search filters (properties/units/leads/tenants) if dataset grows.
  - Add optional caching/memoization for calculation endpoints if performance becomes an issue.
  - Add/verify MongoDB indexes based on query patterns.
- Testing:
  - Run periodic end-to-end test cycles after UX changes.

---

### Phase 3.1 — Calendar Timeline Redesign ✅ COMPLETED
**Goal:** replace the 12-month mini-calendar grid with a horizontal, scrollable occupancy timeline (Airbnb-inspired), without day squares, optimized for operational scanning.

Delivered capabilities:
- ✅ Continuous horizontal timeline divided by **month separators + labels** (no day squares).
- ✅ Horizontal scrolling into future months; vertical scrolling for units.
- ✅ Units stacked vertically grouped by property with clear headers.
- ✅ Sticky month header row + sticky left-side label column.
- ✅ Tenant bookings displayed as proportional bars using real date math (date-fns):
  - Long-term = solid green
  - Airbnb/VRBO = solid blue
- ✅ Vacant lane shown as light gray background.
- ✅ Lead interest shown as **striped/dashed overlay on vacant time only**; bookings override leads visually.
- ✅ Hover tooltips for bookings and leads (tenant/lead name, start/end, rent/offer).
- ✅ Click actions:
  - Booking click navigates to `/tenants`
  - Lead click navigates to `/leads`
- ✅ Today marker line.
- ✅ Property selector dropdown filter.
- ✅ Scroll controls: left/right/Today.

Backend (completed):
- ✅ Added `GET /api/calendar/timeline` returning **segment-based** data (properties → units → bookings/leads) with:
  - `range_start`, `range_end`, `today`
  - optional `property_id` filter
  - defaults: ~3 months back to ~15 months ahead

Frontend (completed):
- ✅ Rewrote `CalendarPage.js` to use the new timeline endpoint and render the timeline view.
- ✅ Updated `FeaturesPage.js`:
  - Added **Notes** feature section.
  - Updated Calendar feature section to **Occupancy Timeline**.

Testing (completed):
- ✅ `testing_agent_v3` verified all timeline requirements and confirmed regressions are not introduced:
  - Backend: **95.1% (39/41 tests passed)** (2 low-priority expectation mismatches)
  - Frontend: **100%** for timeline feature verification
  - Regression: **100%** (all other pages functional)

---

### Phase 4 — Extensibility (optional / later)
**Goal:** prepare for future multi-user/auth and data backends without breaking current flows.

User stories:
1. As a user, I can later add login without redesigning the data model.
2. As a user, I can export income/vacancy/calendar reports for a selected year/range.
3. As a user, I can add more lead stages or notification types without migrations breaking.
4. As a user, I can audit changes to tenants/leads if needed.
5. As a user, I can scale to multiple managers with data separation.

Steps:
- Introduce optional `user_id` fields + data access layer abstraction (kept dormant until auth is added).
- Add export endpoints (CSV) for Income/Vacancy (and possibly Calendar timeline segments).
- Add activity log collection (optional) for critical edits.
- If/when approved, implement auth (defer until requested).
- End-to-end test around new additions.

---

## 3) Next Actions
1. **Hardening pass (Phase 3)**
   - Improve inline validation messaging and backend error clarity.
   - Review modal overlay/pointer-events issues if any appear in real usage.
   - Standardize and expand `data-testid` coverage.
2. **Testing + QA**
   - Run periodic `testing_agent_v3` cycles after any UX changes.
   - Optionally reconcile low-priority API expectation mismatches (422 vs 404) if desired.
3. **Extensibility planning (Phase 4)**
   - Define exports (CSV/PDF) and optional audit log requirements.
   - Draft a simple data-access layer boundary to ease Firebase/Supabase migration.

---

## 4) Success Criteria
- ✅ POC: All edge-case scenarios produce correct income/vacancy outputs and validation blocks invalid tenant ranges.
- ✅ V1: User can CRUD properties/units/tenants/leads; notifications work; income/vacancy pages match core logic.
- ✅ Notes: Notes CRUD works end-to-end and is accessible via navigation.
- ✅ Calendar timeline target:
  - Timeline renders as a continuous horizontal line divided by labeled months (no day squares).
  - Horizontal scroll works smoothly across future months; vertical scroll works for units.
  - Sticky month header row + sticky left unit column behave correctly.
  - Booking bars are proportional to real date math (handles month length differences correctly).
  - Leads overlay appears only on vacant time; bookings override when overlapping.
  - Hover tooltip details show correct tenant/lead info and rent/offer.
  - Click navigates to tenant/lead pages.
  - Today marker is visible and accurate.
- Phase 3 hardening target:
  - Clear, user-friendly validation errors.
  - Stable modal interactions.
  - Consistent `data-testid` coverage.
  - Performance remains smooth with larger datasets and year/range navigation.
