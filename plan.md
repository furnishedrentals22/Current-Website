# plan.md

## 1) Objectives
- **(Completed)** Prove the **core occupancy engine** works: tenant date-range validation (no overlaps), unit availability/close-date constraints, and month/year navigation primitives.
- **(Completed)** Prove **income + vacancy calculations** are correct for long-term and Airbnb/VRBO (nightly distribution across months).
- **(Completed)** Build a V1 FastAPI + MongoDB + React (shadcn/ui) app around the proven core: CRUD for Properties/Units/Tenants/Leads, Notifications, Calendar, Income, Vacancy.
- **(Completed)** Add **Notes** (backend CRUD + frontend Notes page + navigation).
- **(Now)** Redesign **Calendar** into a horizontal, scrollable **occupancy timeline** (simplified Airbnb host calendar) optimized for dense operational viewing.
- **(Now)** Stabilize UX and correctness after MVP: tighten UI validation, improve error messages, resolve minor UI friction (modal overlay), and standardize test hooks.
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
3. As a user, I can view the Calendar in a year-based view and see occupied/vacant days.
4. As a user, I can view Income for the current month and expand the current year breakdown by property → unit → tenant.
5. As a user, I can manage leads through stages and create in-app notifications with a due date.

Backend (FastAPI + MongoDB) (completed):
- ✅ Implemented collections and endpoints:
  - CRUD: Properties, Units, Tenants, Leads, Notifications.
  - Calculation endpoints:
    - `GET /income?year=YYYY` (month totals + drilldown property→unit→tenant).
    - `GET /vacancy?year=YYYY` (by building, by unit size, upcoming vacancies).
    - `GET /calendar?year=YYYY` (12 months occupancy + lead overlays; day-by-day payload).
  - Utility endpoints:
    - `GET /available-units?start_date=...&end_date=...` for lead form filtering.
    - `GET /dashboard` summary counts.
- ✅ Validation at write-time:
  - Tenant create/update enforces overlap/availability/close_date/move-out rules.
  - Lead stage=2 requires showing_date.
- ✅ Airbnb/VRBO tenant creates monthly breakdown stored on tenant record.

Frontend (React + shadcn/ui, modern/light) (completed):
- ✅ App shell: sidebar navigation + topbar + notification bell.
- ✅ Pages (8+): Properties, Units, Tenants, Leads, Income, Vacancy, Calendar, Features, Notes.
- ✅ CRUD screens:
  - Properties: list + create/edit dialog + amenities tags + pets toggle.
  - Units: list + property filter + create/edit dialog + repeatable monthly costs.
  - Tenants: list + create/edit dialog + Airbnb toggle + conditional fields.
  - Leads: list with color-coded strength rows + stage progression + convert-to-tenant flow.
- ✅ Notifications:
  - Top bell opens side sheet; Active vs Viewed; mark read; delete.
- ✅ Views:
  - Calendar (V1): year navigation + 12-month mini-calendars per unit grouped by property.
  - Income: KPI cards + expandable month→property→unit→tenant; year navigation.
  - Vacancy: By Building + By Unit Size + Upcoming Vacancies; year navigation.
  - Features page: static reference of implemented features (needs update for Notes + new Calendar timeline).

End of phase testing (completed):
- ✅ Automated testing report:
  - Backend: **31/32 tests passed (96.9%)**
  - Frontend: **95% pass rate**
  - No critical bugs.
- ✅ Manual/API spot checks:
  - Overlap validation correctly rejects conflicting tenant ranges.
  - Income page reflected real data with expandable breakdown.
  - Vacancy and Calendar (V1) pages render correctly and match backend calculations.

---

### Phase 3 — Hardening + UX improvements (NOW / In Progress)
**Goal:** resolve minor issues found in testing, improve reliability, consistency, and UX polish.

User stories:
1. As a user, I can edit/create records with clear, field-specific validation messages.
2. As a user, I can use dialogs reliably without click-blocking/overlay issues.
3. As a user, I can quickly find records with filters/search and stable performance.
4. As a user, I can switch years/time ranges smoothly and trust calculations.
5. As a user, I can manage notifications (read/delete) easily without losing context.

Steps:
- UX + validation polish:
  - Add inline field validation hints and clearer backend error surfacing (per field where feasible).
  - Improve modal/dialog overlay behavior if real users experience blocked clicks (testing reported pointer-event interception).
- Data-testid and testing stability:
  - Standardize data-testid naming conventions to keep E2E tests consistent.
  - Add missing test hooks for newly added interactions (timeline hover/click, scrolling containers, selectors).
- Performance + correctness:
  - Add pagination/search filters (properties/units/leads/tenants) if dataset grows.
  - Add optional caching/memoization for year/time-range calculation endpoints if performance becomes an issue.
  - Add/verify MongoDB indexes based on query patterns observed in use.
  - Ensure Airbnb breakdown is recomputed on tenant update (already done in create/update logic; re-verify via tests).
- Testing:
  - Run another end-to-end test cycle after fixes.

---

### Phase 3.1 — Calendar Timeline Redesign (NEW / Highest Priority)
**Goal:** replace the 12-month mini-calendar grid with a horizontal, scrollable occupancy timeline (Airbnb-inspired), without day squares, optimized for operational scanning.

User stories:
1. As a user, I can horizontally scroll a continuous timeline across months (future months supported).
2. As a user, I can scan unit occupancy as continuous bars proportional to actual dates.
3. As a user, I can see leads as a patterned overlay on **vacant** time only.
4. As a user, I can hover bookings/leads to see details (tenant/lead, dates, rent/offer).
5. As a user, I can click a booking/lead to open its full profile (tenant/leads pages).

#### Backend (FastAPI + MongoDB)
- **Add new endpoint:** `GET /api/calendar/timeline`
  - Params:
    - `start_date` (ISO date, optional; default: 3 months back from today)
    - `end_date` (ISO date, optional; default: 15 months ahead from today)
    - `property_id` (optional; if present, returns only that property)
  - Response shape (Firebase/Supabase-ready “segments” model):
    - `properties[] → { property_id, property_name, units[] }`
    - `units[] → { unit_id, unit_number, unit_size, bookings[], leads[] }`
    - `bookings[] → { id, tenant_id, name, start_date, end_date, is_airbnb_vrbo, rent_amount }`
    - `leads[] → { id, lead_id, name, start_date, end_date, rent_amount }`
- Implementation rules:
  - Provide date segments only (no day-by-day payload) to reduce payload size and improve performance.
  - Ensure end-date handling is consistent with current logic:
    - Tenants occupy `[move_in_date, move_out_date)` (move-out day is not occupied).
    - Leads occupy inclusive display range per business rule; normalize to `[desired_start_date, desired_end_date]` in UI with clear semantics.
  - Only return leads with valid desired ranges.
  - Prepare for DB swap (Firebase/Supabase): keep response normalized and avoid Mongo-specific structures.

#### Frontend (React + shadcn/ui + date-fns)
- **Rewrite CalendarPage.js** into a timeline view:
  - Timeline = one continuous horizontal rail.
  - Months visually divided with vertical separators and labeled (e.g., `JAN 2026`).
  - Horizontal scroll container for timeline; vertical scroll for units.
  - Sticky header row (months) and sticky left column (property + unit labels).
- **Component structure (requested):**
  - `TimelineHeader` (sticky): month labels + separators
  - `PropertyGroup`: property header + unit stack
  - `UnitRow`: absolute-positioned lane, with background grid lines
  - `BookingBar`: confirmed tenant occupancy bars (solid)
  - `LeadOverlay`: patterned overlay on vacant ranges only
  - `DetailsModal`: optional click fallback (if navigation alone is insufficient)
- **Rendering rules:**
  - No individual day squares.
  - Bars are proportional to date math using **date-fns**.
  - Bars remain continuous across month boundaries; month separators visually cut the timeline only.
  - Color system:
    - Confirmed tenants: solid blocks (emerald)
    - Airbnb/VRBO: solid blocks (sky)
    - Vacant: light gray lane background
    - Leads: amber striped/dotted overlay **only on vacant time**
    - If lead overlaps booking, booking wins visually.
- **Interaction rules:**
  - Hover booking: tooltip popup with tenant name, start/end, rent amount.
  - Click booking: navigate to tenant page (route pattern depends on current app; at minimum scroll/open tenant dialog or implement `/tenants?tenant_id=...`).
  - Hover lead overlay: tooltip with lead name, requested dates, offer/rent.
  - Click lead: navigate to lead page (route pattern similarly; at minimum open lead dialog or implement `/leads?lead_id=...`).
- **Behavior + UX:**
  - Today marker (vertical line).
  - Smooth hover animations (opacity/shadow) — no `transition: all`.
  - Responsive: desktop priority; tablet functional.
  - Add `data-testid` hooks:
    - `calendar-timeline-scroll`
    - `calendar-timeline-month-header`
    - `calendar-timeline-unit-row`
    - `calendar-timeline-booking-bar`
    - `calendar-timeline-lead-overlay`

#### Misc content updates (documentation page)
- Update `FeaturesPage.js`:
  - Add **Notes** feature section.
  - Update **Calendar** description to reflect the new timeline view.

#### Testing
- Run `testing_agent_v3` (or latest) after implementation:
  - Verify timeline renders with real data.
  - Verify month boundaries + range math.
  - Verify hover tooltips + click navigation.
  - Check regressions across Properties/Units/Tenants/Leads/Income/Vacancy/Notes.

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
1. **Calendar Timeline Redesign (Phase 3.1)**
   - Implement backend `GET /api/calendar/timeline`.
   - Rewrite Calendar frontend into horizontal timeline (sticky header + sticky left labels).
   - Add hover tooltips + click navigation.
   - Add today marker + month separators.
2. **Documentation updates**
   - Update `FeaturesPage.js` to include Notes and update Calendar description.
3. **Hardening pass**
   - Standardize `data-testid` naming.
   - Fix any modal overlay/pointer-events issues if still present.
4. **Testing**
   - Run `testing_agent_v3` after timeline + content updates.
   - Fix any issues found and re-run targeted tests.

---

## 4) Success Criteria
- ✅ POC: All edge-case scenarios produce correct income/vacancy outputs and validation blocks invalid tenant ranges.
- ✅ V1: User can CRUD properties/units/tenants/leads; notifications work; calendar shows correct occupancy/vacancy; income/vacancy pages match core logic.
- ✅ Notes: Notes CRUD works end-to-end and is accessible via navigation.
- Phase 3.1 (Calendar timeline target):
  - Timeline renders as a continuous horizontal line divided by labeled months (no day squares).
  - Horizontal scroll works smoothly across future months; vertical scroll works for units.
  - Sticky month header row + sticky left unit column behave correctly.
  - Booking bars are proportional to real date math (handles month length differences correctly).
  - Leads overlay appears only on vacant time; bookings override when overlapping.
  - Hover tooltip details show correct tenant/lead info and rent/offer.
  - Click navigates to tenant/lead profile (or opens a consistent details dialog).
  - Today marker is visible and accurate.
- Phase 3 hardening target:
  - Clear, user-friendly validation errors.
  - Stable modal interactions.
  - Consistent `data-testid` coverage.
  - Performance remains smooth with larger datasets and year/range navigation.
