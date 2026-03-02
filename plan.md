# plan.md

## 1) Objectives
- Prove the **core occupancy engine** works: tenant date-range validation (no overlaps), unit availability/close-date constraints, and month/year navigation primitives.
- Prove **income + vacancy calculations** are correct for long-term and Airbnb/VRBO (nightly distribution across months).
- Build a V1 FastAPI + MongoDB + React (shadcn/ui) app around the proven core: CRUD for Properties/Units/Tenants/Leads, Notifications, Calendar (12-month), Income, Vacancy.
- Stabilize UX with incremental end-to-end testing after each phase; keep single-user (no auth) but leave extension points.

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation: calculations + validation)
**Goal:** lock correctness of the business logic before UI-heavy work.

User stories:
1. As a user, I can add tenants to a unit and the system blocks overlapping leases.
2. As a user, I can model same-day turnover without vacancy days being counted.
3. As a user, I can enter an Airbnb stay and see the income split correctly across months by nights.
4. As a user, I can see vacancy days/% per month for a unit from tenant timelines.
5. As a user, I can generate year/month summaries for income and vacancy for any selected year.

Steps:
- Websearch best practices for: date-range overlap checks, monthly proration by nights, and calendar month boundary handling.
- Implement a standalone **Python POC module** (no FastAPI) with:
  - Date-range helpers (intersection, nights-per-month, month iterator).
  - Validation functions: overlap detection, availability_start_date/close_date constraints, move_out > move_in.
  - Income functions:
    - Long-term: monthly_rent + additional_costs; partial overrides for first/last month.
    - Airbnb: total_nights, rent_per_night, distribute to months by nights.
  - Vacancy functions:
    - Per unit per month vacant_days + vacancy% based on occupied nights/days.
- Create a small **fixture dataset** (2 properties, 4 units, mixed tenant types, edge cases: same-day turnover, crossing months/years, unit close_date).
- Run POC script outputs (tables/JSON) and verify expected numbers; iterate until stable.
- Freeze core logic into a reusable backend module contract (function signatures + expected inputs/outputs).

Deliverable: POC script + validated outputs for edge cases.

---

### Phase 2 — V1 App Development (MVP)
**Goal:** build the app around the proven core with minimal but complete flows.

User stories:
1. As a user, I can create a property and add units with rent/costs and availability/close dates.
2. As a user, I can assign tenants (long-term or Airbnb) to units and immediately see validation errors if invalid.
3. As a user, I can view the Calendar in a 12-month layout for a selected year and see occupied/vacant days.
4. As a user, I can view Income for the current month and expand the current year breakdown by property → unit → tenant.
5. As a user, I can manage leads through stages and create in-app notifications with a due date.

Backend (FastAPI + MongoDB):
- Set up collections + indexes (notably: unit_id + move_in/move_out query patterns; lead stage fields; notification read state).
- Implement CRUD endpoints:
  - Properties, Units, Tenants, Leads, Notifications.
- Implement calculation endpoints (using Phase 1 logic module):
  - `GET /income?year=YYYY` (current year default; month summaries + drilldown data).
  - `GET /vacancy?year=YYYY` (by building, by unit size, upcoming vacancies next 3 months).
  - `GET /calendar?year=YYYY` (12 months data with occupancy/vacancy markers + lead overlays).
- Implement validation at write-time:
  - Tenant create/update enforces overlap/availability/close_date/move-out rules.
  - Lead stage=2 requires showing_date.
- Seed endpoint or CLI to load fixture dataset for repeatable testing.

Frontend (React + shadcn/ui, modern/light):
- App shell + navigation: Properties, Units, Tenants, Leads, Calendar, Income, Vacancy, Features.
- CRUD screens:
  - Properties: list + detail + edit.
  - Units: list by property; unit form with additional_cost line items.
  - Tenants: form with toggle (Airbnb vs long-term) and conditional fields.
  - Leads: list + detail; stage progression UI; “Convert to Tenant” button at stage 8.
- Notifications:
  - Top button opens side popout; Active (unread) vs Viewed; mark read/unread; delete.
- Views:
  - Calendar: 12-month grid for selected year; occupancy rendering; vacant styling; lead overlay.
  - Income: current month total; expandable year list month→property→unit→tenant.
  - Vacancy: by building + by unit size tables; upcoming vacancies list.
- Features page: static reference of implemented features.

End of phase testing:
- 1 round end-to-end test using seeded dataset covering: tenant validation, income/vacancy totals, lead→notification flow, calendar year navigation.

---

### Phase 3 — Hardening + UX improvements
**Goal:** fix gaps found in V1 testing; stabilize UX; improve performance and correctness.

User stories:
1. As a user, I can edit a tenant without accidentally creating overlaps, with clear error messages.
2. As a user, I can quickly filter units/leads by property and see only relevant options.
3. As a user, I can switch years in Income/Vacancy/Calendar and the UI stays fast.
4. As a user, I can confirm Airbnb night counting with cross-month/year stays and trust the breakdown.
5. As a user, I can manage notifications (read/delete) without losing context.

Steps:
- Add pagination/search filters (properties/units/leads/tenants).
- Add consistent error handling + inline form validation messages.
- Add caching/memoization on heavy calculation endpoints (year-based) if needed.
- Add additional indexes based on slow queries found during testing.
- Add “recompute breakdown” on tenant update (Airbnb monthly_breakdown regeneration).
- Run 1 round end-to-end testing again.

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
- Add export endpoints (CSV) for Income/Vacancy.
- Add activity log collection (optional) for critical edits.
- If/when approved, implement auth (defer until user requests).
- End-to-end test around new additions.

## 3) Next Actions
1. Implement Phase 1 POC script with fixtures + expected outputs.
2. Verify POC results with you (numbers and edge cases) and lock the core module.
3. Scaffold backend API structure + wire core module into calculation endpoints.
4. Build minimal frontend shell + Tenants/Units CRUD first (to exercise validations).

## 4) Success Criteria
- POC: All edge-case scenarios produce correct income/vacancy outputs and validation blocks invalid tenant ranges.
- V1: User can CRUD properties/units/tenants/leads; notifications work; calendar shows correct occupancy/vacancy; income/vacancy pages match POC outputs.
- Reliability: No overlapping tenants possible via UI or API; same-day turnover yields 0 vacancy; Airbnb month distribution correct across boundaries.
- UX: Forms show clear validation errors; year navigation works across Calendar/Income/Vacancy; notifications are manageable (read/delete) via popout.
