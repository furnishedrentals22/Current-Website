# Furnished Rentals - Property Management Platform

## Original Problem Statement
Build a comprehensive property management platform for furnished rental properties, including properties, units, tenants, leads, income tracking, calendar, vacancy tracking, notifications, and operations management.

## Tech Stack
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Database**: MongoDB (local dev, Atlas production)

## Architecture
```
/app/
├── backend/
│   ├── server.py          # All endpoints & models
│   └── core_logic.py      # Income calculation, vacancy logic
├── frontend/
│   └── src/
│       ├── App.js         # Navigation & routing
│       ├── lib/api.js     # API client
│       ├── components/
│       │   └── TenantDetailModal.js  # Reusable tenant detail popup
│       └── pages/         # All page components
```

## Navigation Structure
- Properties > Properties, Units
- Tenants > Tenants, Leads
- Calendar > Calendar, Vacancy
- Budgeting > Income, Deposits, Rent Tracking
- Notes
- Info > Parking, Login Info, Door Codes, Marketing
- Operations > Move In/Out, Housekeeping
- Notifications
- Features

## Implemented Features

### Core Pages
- Properties: CRUD, building details, enhanced contrast/styling
- Units: CRUD, grouped by property, alternating colors, door codes, marketing links
- Tenants: CRUD, simplified columns (Name, Dates, Rent, Notes), has_parking checkbox, permanent delete w/ double confirm, misc charges, no moveout popup
- Leads, Calendar, Vacancy, Notes

### Budgeting
- Income: Monthly breakdown, misc charges as separate lines, monthly avg up to current month
- Deposits: 3 tabs (Current/Past/Landlord), all editable, past/future tenant badges, deposit return flow
- Rent Tracking: Monthly view, paid checkboxes, partial payments, notes, notification creation

### Info Section
- Parking, Login Info, Door Codes, Marketing (all full CRUD)

### Operations
- Move In/Out (two-tab), Housekeeping (three-tab), auto cleaning records

### Notifications
- Kanban/list views, move-out checklist (3 required checkboxes), auto-notifications

### Cross-Page Features
- TenantDetailModal: Click any tenant name across app → popup with full details
- Parking tenant filter: by property + has_parking, search, 1542 filter for Marlins decal
- Calendar: grid lines through property headers, dark tooltip text, tenant click opens modal
- Vacancy: sort by property (collapsible) or date (collapsible months)

## Key Collections
properties, units, tenants, leads, notes, notifications, parking_spots, parking_assignments, login_infos, door_codes, marketing_links, housekeepers, housekeeping_leads, cleaning_records, misc_charges, rent_payments

## Testing History
- Iteration 9: 18/18 (Operations features)
- Iteration 10: 21/21 (Operations v2 fixes)
- Iteration 11: 14/14 (Major batch 1 - nav, deposits, rent tracking, styling)
- Iteration 12: 16/16 (Major batch 2 - calendar, vacancy, parking, tenant modal)

## Prioritized Backlog
- P1: Await user feedback
- P2: Refactor server.py into modular FastAPI structure
- P2: Refactor large frontend pages into smaller components
- P3: Fix minor React HTML nesting warnings
