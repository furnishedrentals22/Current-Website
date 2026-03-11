# HarborRent - Property Management Platform PRD

## Original Problem Statement
Build a comprehensive property management application for managing rental properties, tenants, leads, income tracking, and vacancy analysis with operational tools for move-ins/outs, housekeeping, parking, and centralized notifications.

## Core Architecture
- **Stack**: FastAPI (Python) + React + MongoDB (FARM stack)
- **Frontend**: React with Shadcn/UI components, Tailwind CSS
- **Backend**: FastAPI with Motor (async MongoDB driver)
- **Database**: MongoDB

## What's Been Implemented

### Phase 1 (Previous sessions)
- Properties, Units, Tenants CRUD with sorting (building_id, numerical units)
- Tenants page redesign (Current/Future + Past tabs, spreadsheet-style)
- Leads management, Income engine, Vacancy tracking, Calendar, Notes

### Phase 2 (Feb 2026)
- **Info Menu**: Parking, Login Info (PIN-protected), Door Codes (PIN-protected admin), Marketing
- **Team Members** management
- Cross-populate door codes + marketing links to Units page

### Phase 3 (Feb 2026)
- **Notifications/Tasks Page** — Full overhaul: Kanban + List views, search, multi-filters, bulk actions, snooze, duplicate, priority, categories, recurring, status toggle dropdown, mark-read preserves status

### Phase 4 (Feb 2026 — Current)
- **Operations Menu** with sub-pages:
  - **Move In / Move Out**: Upcoming moves sorted by date, notification presets (3 days before, 1 day before, day of, time of, custom)
  - **Housekeeping** (3 tabs):
    - Upcoming Cleanings: Spreadsheet with inline editing (times, cleaner, confirmed, notes)
    - Current Housekeepers: CRUD with archive (name, contact, availability, preference, pay, notes)
    - Housekeeping Leads: CRUD with archive (name, contact, call time, interview pay, trial, notes)
- **Auto-notifications on tenant creation**:
  - Housekeeping confirmation (1 day before move-out)
  - Missing housekeeper warning (7 days before move-out)
  - Auto-creates cleaning record for each tenant checkout
  - Auto-removes notifications/records on tenant deletion
  - Auto-updates dates when tenant is updated
  - Auto-archives missing housekeeper warning when cleaner is assigned

## Database Collections
properties, units, tenants, leads, notes, notifications, parking_spots, parking_assignments, door_codes, login_accounts, marketing_links, team_members, settings, cleaning_records, housekeepers, housekeeping_leads

## Key API Endpoints
All CRUD for each collection + specialized:
- /api/move-ins-outs — enriched upcoming moves
- /api/cleaning-records — with auto-housekeeper-warning management
- /api/notifications — full-featured: snooze, duplicate, bulk-action, status filters

## Testing History
- Iteration 10 (Mar 2026): All 21 backend tests passed, all frontend features verified — Operations v2 fixes fully validated

## Prioritized Backlog
- P1: Await user feedback on Operations pages (Move In/Out tabs, Upcoming Cleanings backfill + Next Check-in)
- P2: Auto-notification hooks from other pages (parking, deposits, etc.)
- P2: Refactor server.py into modular FastAPI structure (routers/models/services)
- P2: Refactor large frontend pages (NotificationsPage, HousekeepingPage) into smaller components
- P3: Fix minor React key warning on UnitsPage TableBody
