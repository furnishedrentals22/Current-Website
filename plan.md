# plan.md — Tenants Page Restructure + Building ID Feature

## 1. Objectives
- Add **Building ID (number)** to Properties (current + future) and use it as the **global display ordering** for properties across the site.
- Enforce **numeric unit sorting** (never lexicographic) everywhere units appear (Tenants, Calendar/Timeline, Properties, etc.).
- Rewrite **Tenants page** into a **flat spreadsheet-style** UI with:
  - Tabs: **Current & Future Tenants** / **Past Tenants**
  - Collapsible **Property → Unit → Tenant** hierarchy, **collapsed by default**
  - Exact column orders + styling rules, including future indentation + Airbnb highlighting
- Add **tenant deposit return fields**: `deposit_return_date`, `deposit_return_amount`, `deposit_return_method` (default empty).
- Preserve constraints: **no new collections**, **reuse existing data fetching + state logic**, keep existing create/edit/view flows.

---

## 2. Implementation Steps

### Phase 1: Core flow POC (fast validation inside app; no external integrations)
User stories:
1. As a user, I can assign a Building ID to a property and see properties reorder immediately.
2. As a user, I can confirm units sort as 101, 102, 201 (not 101, 102, 201 as strings).
3. As a user, I can open Tenants and see properties collapsed by default.
4. As a user, I can expand one property and one unit to verify the hierarchy renders correctly.
5. As a user, I can toggle future tenants within a unit and see them indented with ↳ and blue background.

Steps:
- Backend: add `building_id` to property model; keep backward compatibility (missing => null).
- Backend: add 3 deposit return fields to tenant model; missing => null/empty.
- Implement **frontend sort helpers**:
  - `sortPropertiesByBuildingId(properties)` (nulls last)
  - `sortUnitsNumerically(units)` using numeric parse fallback
- Wire these helpers into TenantsPage + CalendarPage timeline rendering (POC: at least these 2 surfaces).

Checkpoint: POC accepted when property order and unit numeric order are correct in Tenants + Calendar.

---

### Phase 2: V1 App Development (backend + UI rebuild)
User stories:
1. As a user, I can create/edit a property and set Building ID as a number.
2. As a user, I can browse Current & Future tenants in a spreadsheet layout with the exact columns.
3. As a user, I can expand a unit to reveal future tenants sorted by move-in date and visually indented.
4. As a user, I can switch to Past Tenants and choose sorting by Unit or by Move-Out quarter.
5. As a user, I can click any tenant row to view details and edit without losing existing functionality.

Backend (FastAPI / Mongo):
- Update `PropertyCreate` to include `building_id: Optional[int] = None`.
- Update `/properties` list endpoint to return properties in **ascending building_id** (tie-breaker: name or created_at).
- Update `TenantCreate` to include:
  - `deposit_return_date: Optional[str] = None`
  - `deposit_return_amount: Optional[float] = None`
  - `deposit_return_method: Optional[str] = ""`
- Keep existing endpoints; ensure serialization handles new fields.
- Numeric unit sorting:
  - Prefer frontend numeric sorting (to avoid new datasets/complex DB migrations).
  - Ensure any backend `.sort("unit_number", 1)` isn’t relied on for final ordering in UI.

Properties Page:
- Add **Building ID** field to create/edit dialog (number input).
- Display Building ID in property list row (small, compact).
- Ensure property list uses Building ID ordering for consistency.

Tenants Page (complete rewrite, reuse fetch/state logic):
- Replace current card-based sections with:
  - Top tabs: **Current & Future Tenants** / **Past Tenants**.
  - Beige background + compact spreadsheet table with thin dividers and zebra striping.
- Property rows:
  - Show **Address** + **occupancy count** (occupied/total units) in header.
  - Collapsible; collapsed by default.
  - Property ordering by Building ID.
- Tab 1 (Current & Future):
  - Units shown for expanded property, sorted numerically.
  - Current tenants rendered as spreadsheet rows (exact column order).
  - Future tenants hidden behind **unit-level toggle**;
    - sorted by move-in date asc
    - indented with **↳** prefix
    - light blue background
  - Airbnb/VRBO: tag next to name; keep blanks for non-applicable fields.
- Tab 2 (Past):
  - Sort toggle: **By Unit (default)** vs **By Move-Out Date**.
  - By Unit:
    - Property → Unit (collapsible, numeric) → past tenant rows
    - Tenants sorted by move-out date
    - Airbnb rows highlighted **light green**
  - By Move-Out Date:
    - Property → **Quarter sections** (collapsible, collapsed by default)
    - Tenants inside quarter sorted by move-out date
    - Airbnb rows highlighted **light green**
  - Past columns use required exact order and include deposit return fields (empty by default).
- Editing:
  - Keep existing row click -> detail dialog.
  - Keep existing edit dialog + create flow.
  - Add deposit return fields to edit form (ideally shown in Past context, but editable anytime).

Global sorting application points:
- CalendarPage timeline:
  - Sort properties by Building ID.
  - Sort units numerically.
- Any other unit lists visible in UI (e.g., property unit badges/list) should use numeric sort helper.

End of Phase 2: run 1 round of end-to-end testing (CRUD + sorting + tabs + collapse).

---

### Phase 3: Polish + Regression hardening
User stories:
1. As a user, I can quickly scan tables due to consistent spacing, zebra striping, and thin dividers.
2. As a user, I can expand/collapse without UI jank or losing my scroll position.
3. As a user, I can reliably distinguish current vs future vs Airbnb past rows by color.
4. As a user, I can edit deposit return fields and see them persist on refresh.
5. As a user, all pages that show properties/units follow the same ordering rules.

Steps:
- Tighten styling to match “flat spreadsheet” requirement (remove card/panel feel on Tenants).
- Add/verify `data-testid` for key new controls: tabs, property collapse toggles, unit future toggle, past sort toggle, quarter toggles.
- Validate date sorting + quarter bucketing logic.
- Fix any regressions in Calendar/Properties ordering.
- Run a full test pass + screenshot verification.

---

## 3. Next Actions
1. Implement backend model additions (`building_id`, deposit return fields) + update `/properties` sorting.
2. Add numeric sort helpers (properties + units) and apply to CalendarPage timeline immediately (POC check).
3. Update PropertiesPage create/edit UI to support Building ID.
4. Rewrite TenantsPage UI into tabs + spreadsheet tables while keeping existing fetchData/state + dialogs.
5. Run end-to-end test: create property w/ Building ID, create tenants (current/future/past), verify sorting + styling + edit flows.

---

## 4. Success Criteria
- Properties everywhere render in **ascending Building ID** (null/blank IDs appear last, stable ordering).
- Units everywhere render in **true numeric order** (101, 102, 201…), not alphabetic.
- Tenants page:
  - Two tabs with specified behaviors.
  - Properties collapsed by default; hierarchy Property → Unit → Tenant.
  - Exact column orders for Tab 1 and Tab 2.
  - Future tenant indentation (↳) + light blue background; Airbnb past rows light green.
  - Clicking tenant row still opens detail and edit works as before.
- Deposit return fields exist, save, and display (default empty).
- No new collections/datasets introduced; existing fetching/state logic reused.
