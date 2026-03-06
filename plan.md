# plan.md — Tenants Page Restructure + Building ID Feature (Updated)

## 1. Objectives (Current Status)
- ✅ Add **Building ID (number)** to Properties (current + future) and use it as the **global display ordering** for properties across the site.
- ✅ Enforce **numeric unit sorting** (never lexicographic) everywhere units appear (Tenants, Calendar/Timeline, Properties, etc.).
- ✅ Rewrite **Tenants page** into a **flat spreadsheet-style** UI with:
  - Tabs: **Current & Future Tenants** / **Past Tenants**
  - Collapsible **Property → Unit → Tenant** hierarchy, **collapsed by default**
  - Exact column orders + styling rules, including future indentation + Airbnb highlighting
- ✅ Add **tenant deposit return fields**: `deposit_return_date`, `deposit_return_amount`, `deposit_return_method` (default empty).
- ✅ Preserve constraints: **no new collections**, **reuse existing data fetching + state logic**, keep existing create/edit/view flows.
- ✅ Post-implementation: **End-to-end testing completed** with **100% pass rate** (backend + frontend).

---

## 2. Implementation Steps (Progress)

### Phase 1: Core flow POC (Completed)
User stories:
1. ✅ As a user, I can assign a Building ID to a property and see properties reorder immediately.
2. ✅ As a user, I can confirm units sort as 101, 102, 201 (not lexicographic).
3. ✅ As a user, I can open Tenants and see properties collapsed by default.
4. ✅ As a user, I can expand one property and verify the hierarchy renders correctly.
5. ✅ As a user, I can toggle future tenants within a unit and see them indented with ↳ and a light blue background.

Steps completed:
- ✅ Backend: added `building_id` to property model; backward compatible when missing (`null`).
- ✅ Backend: added 3 deposit return fields to tenant model; backward compatible when missing.
- ✅ Implemented reusable sorting helpers:
  - ✅ `sortPropertiesByBuildingId(properties)` (nulls last)
  - ✅ `sortUnitsNumerically(units)` (numeric parse with fallback)
- ✅ Wired sorting into Tenants UI and Calendar/Timeline behavior.

Checkpoint (met): property order and unit numeric order verified in Tenants + Calendar.

---

### Phase 2: V1 App Development (Completed)
User stories:
1. ✅ As a user, I can create/edit a property and set Building ID as a number.
2. ✅ As a user, I can browse Current & Future tenants in a spreadsheet layout with the exact columns.
3. ✅ As a user, I can expand a unit to reveal future tenants sorted by move-in date and visually indented.
4. ✅ As a user, I can switch to Past Tenants and choose sorting by Unit or by Move-Out quarter.
5. ✅ As a user, I can click any tenant row to view details and edit without losing existing functionality.

Backend (FastAPI / Mongo) — implemented:
- ✅ Updated `PropertyCreate` to include `building_id: Optional[int] = None`.
- ✅ Updated `/properties` list endpoint to return properties in **ascending building_id** (nulls last, tie-breaker by name).
- ✅ Updated `TenantCreate` to include:
  - ✅ `deposit_return_date: Optional[str] = None`
  - ✅ `deposit_return_amount: Optional[float] = None`
  - ✅ `deposit_return_method: Optional[str] = ""`
- ✅ Updated `/calendar/timeline` endpoint to:
  - ✅ include `building_id`
  - ✅ sort properties by building_id (nulls last)
  - ✅ sort units numerically
- ✅ Kept existing endpoints and serialization; ensured backward compatibility.

Properties Page — implemented:
- ✅ Added **Building ID** field to create/edit dialog (number input; manual entry).
- ✅ Displayed Building ID in the property list header (e.g., `Bldg #N`).

Tenants Page — implemented (complete restructure; reused fetch/state + dialogs):
- ✅ Two tabs: **Current & Future Tenants** / **Past Tenants**.
- ✅ Beige spreadsheet-style layout: thin dividers, compact font, zebra striping; avoided card/panel layout for the main lists.
- ✅ Property rows:
  - ✅ show **address** + **occupancy count** (occupied/total)
  - ✅ collapsible and **collapsed by default**
  - ✅ ordered globally by Building ID
- ✅ Tab 1 (Current & Future):
  - ✅ units rendered in numeric order
  - ✅ current/pending tenants as spreadsheet rows with required column order
  - ✅ future tenants hidden behind a unit-level toggle, sorted by move-in date asc
  - ✅ future tenants visually indented with **↳** prefix and **light blue** row background
  - ✅ Airbnb/VRBO tag shown next to tenant name; non-applicable fields blank
- ✅ Tab 2 (Past):
  - ✅ sort toggle: **By Unit (default)** vs **By Move-Out Date**
  - ✅ By Unit view: Property → Unit (collapsible, numeric) → tenant rows sorted by move-out date
  - ✅ By Move-Out Date view: quarterly group sections (collapsible; expanded manually)
  - ✅ Airbnb past rows highlighted **light green**
  - ✅ Past columns include deposit return fields in required order
- ✅ Editing preserved:
  - ✅ clicking row opens detail dialog
  - ✅ edit/create dialogs still work
  - ✅ deposit return fields available in tenant edit form
- ✅ Minor polish: added **DialogDescription (sr-only)** to reduce accessibility warnings.

End of Phase 2: ✅ end-to-end test run completed.

---

### Phase 3: Polish + Regression hardening (Completed)
User stories:
1. ✅ As a user, I can quickly scan tables due to consistent spacing, zebra striping, and thin dividers.
2. ✅ As a user, I can expand/collapse sections without losing the core context.
3. ✅ As a user, I can reliably distinguish current vs future vs Airbnb past rows by color.
4. ✅ As a user, I can edit deposit return fields and see them persist on refresh.
5. ✅ As a user, all pages that show properties/units follow the same ordering rules.

Steps completed:
- ✅ Tightened Tenants styling to match the requested “flat spreadsheet” look.
- ✅ Added/verified `data-testid` for key controls (tabs, toggles, sort controls).
- ✅ Validated date sorting and quarter bucketing logic.
- ✅ Confirmed Calendar/Properties ordering behavior matches Building ID + numeric unit ordering.
- ✅ Ran a full test pass with screenshot verification.

---

## 3. Next Actions (Now)
All planned work is complete. Optional follow-ups (not required by original scope):
1. (Optional) Add an automated UI regression suite around Tenants tab interactions and sorting.
2. (Optional) Extend numeric unit sorting helper usage to any newly added unit lists in future pages.
3. (Optional) Add lightweight validation messaging for missing Building ID if desired (kept optional since nulls-last is supported).

---

## 4. Success Criteria (Met)
- ✅ Properties everywhere render in **ascending Building ID** (null/blank IDs appear last, stable ordering).
- ✅ Units everywhere render in **true numeric order** (101, 102, 201…), not alphabetic.
- ✅ Tenants page:
  - ✅ two tabs with specified behaviors
  - ✅ properties collapsed by default; hierarchy Property → Unit → Tenant
  - ✅ exact column ordering for Tab 1 and Tab 2
  - ✅ future tenant indentation (↳) + light blue background; Airbnb past rows light green
  - ✅ clicking tenant row opens detail and edit works as before
- ✅ Deposit return fields exist, save, and display (default empty).
- ✅ No new collections/datasets introduced; existing fetching/state logic reused.
- ✅ Testing completed with **100% pass rate** on backend + frontend.
