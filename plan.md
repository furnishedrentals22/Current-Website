# plan.md

## 1) Objectives
- **(Completed)** Prove the **core occupancy engine** works: tenant date-range validation (no overlaps), unit availability/close-date constraints, and month/year navigation primitives.
- **(Completed)** Prove **income + vacancy calculations** are correct for long-term and Airbnb/VRBO (nightly distribution across months).
- **(Completed)** Build a V1 FastAPI + MongoDB + React (shadcn/ui) app around the proven core: CRUD for Properties/Units/Tenants/Leads, Notifications, Calendar (12-month), Income, Vacancy.
- **(Now)** Stabilize UX and correctness after MVP: tighten UI validation, improve error messages, resolve minor UI friction (modal overlay), and standardize test hooks.
- **(Next)** Prepare for future extensions (multi-user/auth, exports, audit log) without breaking current single-user workflows.

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
3. As a user, I can view the Calendar in a 12-month layout for a selected year and see occupied/vacant days.
4. As a user, I can view Income for the current month and expand the current year breakdown by property → unit → tenant.
5. As a user, I can manage leads through stages and create in-app notifications with a due date.

Backend (FastAPI + MongoDB) (completed):
- ✅ Implemented collections and endpoints:
  - CRUD: Properties, Units, Tenants, Leads, Notifications.
  - Calculation endpoints:
    - `GET /income?year=YYYY` (month totals + drilldown property→unit→tenant).
    - `GET /vacancy?year=YYYY` (by building, by unit size, upcoming vacancies).
    - `GET /calendar?year=YYYY` (12 months occupancy + lead overlays).
  - Utility endpoints:
    - `GET /available-units?start_date=...&end_date=...` for lead form filtering.
    - `GET /dashboard` summary counts.
- ✅ Validation at write-time:
  - Tenant create/update enforces overlap/availability/close_date/move-out rules.
  - Lead stage=2 requires showing_date.
- ✅ Airbnb/VRBO tenant creates monthly breakdown stored on tenant record.

Frontend (React + shadcn/ui, modern/light) (completed):
- ✅ App shell: sidebar navigation + topbar + notification bell.
- ✅ Pages (8): Properties, Units, Tenants, Leads, Income, Vacancy, Calendar, Features.
- ✅ CRUD screens:
  - Properties: list + create/edit dialog + amenities tags + pets toggle.
  - Units: list + property filter + create/edit dialog + repeatable monthly costs.
  - Tenants: list + create/edit dialog + Airbnb toggle + conditional fields.
  - Leads: list with color-coded strength rows + stage progression + convert-to-tenant flow.
- ✅ Notifications:
  - Top bell opens side sheet; Active vs Viewed; mark read; delete.
- ✅ Views:
  - Calendar: 12-month grid per unit grouped by property; occupancy colors; lead overlay; year navigation.
  - Income: KPI cards + expandable month→property→unit→tenant; year navigation.
  - Vacancy: By Building + By Unit Size + Upcoming Vacancies; year navigation.
  - Features page: static reference of all implemented features.

End of phase testing (completed):
- ✅ Automated testing report:
  - Backend: **31/32 tests passed (96.9%)**
  - Frontend: **95% pass rate**
  - No critical bugs.
- ✅ Manual/API spot checks:
  - Overlap validation correctly rejects conflicting tenant ranges.
  - Income page correctly reflected real data (example: **$20,900** yearly total for 2025) with expandable breakdown.
  - Vacancy and Calendar pages render correctly and match backend calculations.

---

### Phase 3 — Hardening + UX improvements (NOW / Recommended)
**Goal:** resolve minor issues found in testing, improve reliability, consistency, and UX polish.

User stories:
1. As a user, I can edit/create records with clear, field-specific validation messages.
2. As a user, I can use dialogs reliably without click-blocking/overlay issues.
3. As a user, I can quickly find records with filters/search and stable performance.
4. As a user, I can switch years in Income/Vacancy/Calendar smoothly and trust calculations.
5. As a user, I can manage notifications (read/delete) easily without losing context.

Steps:
- UX + validation polish:
  - Add inline field validation hints and clearer backend error surfacing (per field where feasible).
  - Improve modal/dialog overlay behavior if real users experience blocked clicks (testing reported pointer-event interception).
- Data-testid and testing stability:
  - Standardize data-testid naming conventions (e.g., `sidebar-nav-vacancy` vs `sidebar-nav-vacancies`) to keep E2E tests consistent.
  - Add missing test hooks for newly added interactions (year switching, nested expanders) as needed.
- Performance + correctness:
  - Add pagination/search filters (properties/units/leads/tenants) if dataset grows.
  - Add optional caching/memoization for year-based calculation endpoints if performance becomes an issue.
  - Add/verify MongoDB indexes based on query patterns observed in use.
  - Ensure Airbnb breakdown is recomputed on tenant update (already done in create/update logic, verify with tests).
- Testing:
  - Run another end-to-end test cycle after fixes.

---

### Phase 4 — Extensibility (optional / later)
**Goal:** prepare for future multi-user/auth without breaking current flows.

User stories:
1. As a user, I can later add login without redesigning the data model.
2. As a user, I can export income/vacancy reports for a selected year.
3. As a user, I can add more lead stages or notification types without migrations breaking.
4. As a user, I can audit changes to tenants/leads if needed.
5. As a user, I can scale to multiple managers with data separation.

Steps:
- Introduce optional `user_id` fields + data access layer abstraction (kept dormant until auth is added).
- Add export endpoints (CSV) for Income/Vacancy (and possibly Calendar occupancy).
- Add activity log collection (optional) for critical edits.
- If/when approved, implement auth (defer until requested).
- End-to-end test around new additions.

## 3) Next Actions
1. **Phase 3 kickoff**: address the two minor issues from testing:
   - Dialog overlay pointer events (only if it impacts real users).
   - Standardize `data-testid` naming.
2. Add search/filter controls for large datasets (optional but recommended).
3. Add optional “Seed data” utility (endpoint or CLI) for repeatable demos/testing.
4. Run 1 more end-to-end test pass after Phase 3 adjustments.

## 4) Success Criteria
- ✅ POC: All edge-case scenarios produce correct income/vacancy outputs and validation blocks invalid tenant ranges.
- ✅ V1: User can CRUD properties/units/tenants/leads; notifications work; calendar shows correct occupancy/vacancy; income/vacancy pages match core logic.
- ✅ Reliability: No overlapping tenants possible via UI or API; same-day turnover yields 0 vacancy; Airbnb month distribution correct across boundaries.
- Phase 3 (target):
  - Clear, user-friendly validation errors.
  - Stable modal interactions.
  - Consistent `data-testid` coverage.
  - Performance remains smooth with larger datasets and year navigation.
