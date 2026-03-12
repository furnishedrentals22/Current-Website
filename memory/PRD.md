# Furnished Rentals - Property Management Platform

## Original Problem Statement
Build a comprehensive property management platform for furnished rental properties, including properties, units, tenants, leads, income tracking, calendar, vacancy tracking, notifications, and operations management.

## Tech Stack
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Database**: MongoDB (local)

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
│       └── pages/         # All page components
```

## What's Been Implemented

### Core Pages
- **Properties**: CRUD, building details, amenities, owner info
- **Units**: CRUD, grouped by property, door codes, marketing links
- **Tenants**: CRUD, current/past tabs, simplified columns, misc charges, permanent delete
- **Leads**: CRUD lead management
- **Calendar**: Monthly/weekly/daily views
- **Vacancy**: Vacancy tracking and analysis
- **Notes**: General notes

### Budgeting Section (NEW)
- **Income**: Monthly breakdown by property/unit/tenant, includes misc charges
- **Deposits**: 3-tab system (Current deposits, Past deposits, Landlord deposits)
- **Rent Tracking**: Monthly rent payment tracking with partial payments and notes

### Info Section
- **Parking**: Designated/decal parking management
- **Login Info**: PIN-protected credential storage
- **Door Codes**: Multi-code management per unit
- **Marketing**: Listing links management

### Operations Section
- **Move In/Out**: Two-tab layout for upcoming moves
- **Housekeeping**: Upcoming cleanings, housekeepers, leads

### Notifications
- Kanban/list views, search, filtering, bulk actions
- Move-out checklist notifications (3 checkboxes: parking, deposit, doorcode)
- Auto-notifications for tenant lifecycle events

### Navigation Structure
- Properties > Properties, Units
- Tenants > Tenants, Leads
- Calendar > Calendar, Vacancy
- Budgeting > Income, Deposits, Rent Tracking
- Notes
- Info > Parking, Login Info, Door Codes, Marketing
- Operations > Move In/Out, Housekeeping
- Notifications
- Features

## Key Features
- Branding: "Furnished Rentals"
- Alternating row colors on Units, Tenants pages
- Property grouping on Units page
- Simplified tenant display (Name, Move In/Out, Rent, Notes)
- Permanent delete with double confirmation
- Misc charges system (per tenant, shows on income)
- Move-out date bug fixed (tenants no longer moved out a day early)
- Moveout popup removed (handled by notifications only)

## Key Collections
- properties, units, tenants, leads, notes
- notifications, parking_spots, login_infos, door_codes, marketing_links
- housekeepers, housekeeping_leads, cleaning_records
- misc_charges, rent_payments

## Testing History
- Iteration 9: 18/18 passed (Operations features)
- Iteration 10: 21/21 passed (Operations v2 fixes)
- Iteration 11: 14/14 passed + 2 skipped (Major update batch - 15+ changes)

## Prioritized Backlog
- P1: Await user feedback
- P2: Auto-notification hooks from other pages (parking, deposits, etc.)
- P2: Refactor server.py into modular FastAPI structure
- P2: Refactor large frontend pages into smaller components
- P3: Fix minor React key/nesting warnings
