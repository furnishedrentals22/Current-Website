# Furnished Rentals Property Management - PRD

## Original Problem Statement
Build and maintain a comprehensive property management application for furnished rentals, with a focus on high data clarity, responsive design, and maintainable component structures.

## Stack
- **Frontend**: React (JavaScript), Shadcn/UI, TailwindCSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB

## Core Features (Implemented)
1. **Properties Management** - Full CRUD for properties and units with building IDs, amenities, costs
2. **Tenants Management** - Current/future/past tenant tracking with long-term and Airbnb/VRBO types, misc charges, deposit returns
3. **Calendar** - Occupancy timeline visualization
4. **Leads Management** - Prospect tracking with status pipeline
5. **Housekeeping** - Cleaning schedule tracking
6. **Vacancy Tracking** - Upcoming vacancy predictions from booking data
7. **Budgeting** - Financial tracking
8. **Notes, Login Info, Door Codes, Marketing** - Supporting info pages
9. **Notifications** - Alert system
10. **Parking** - Calendar-style timeline for parking spot assignments (REBUILT Feb 2026)

## Architecture
```
/app/
├── backend/
│   ├── core_logic.py
│   ├── routers/
│   │   ├── parking.py         # Rebuilt: timeline + CRUD + tenant filtering
│   │   ├── marlins_decals.py  # Legacy (no longer used by frontend)
│   │   └── ...
│   └── tests/
│       ├── test_parking.py
│       └── test_vacancy_refactor.py
└── frontend/
    └── src/
        ├── components/
        │   ├── parking/           # REBUILT
        │   │   ├── ParkingAssignBar.js
        │   │   ├── ParkingAssignDialog.js
        │   │   ├── ParkingSpotDialog.js
        │   │   ├── ParkingSpotRow.js
        │   │   └── ParkingSpotsList.js
        │   ├── properties/
        │   ├── leads/
        │   ├── housekeeping/
        │   ├── tenants/
        │   ├── calendar/
        │   └── TenantDetailModal.js
        ├── pages/
        │   ├── ParkingPage.js     # REBUILT with calendar timeline
        │   ├── PropertiesPage.js  # Cleaned: removed decal references
        │   ├── TenantsPage.js     # Cleaned: removed has_parking/marlins_decal
        │   └── ...
        └── lib/
            └── api.js
```

## Completed Tasks
- P0: Core CRUD for all entities
- P0: Major frontend refactoring (Properties, Leads, Housekeeping, Tenants pages modularized)
- P0: Backend core_logic.py vacancy logic simplified
- **P0: Parking page complete rebuild** (Feb 2026)
  - Calendar-style timeline showing parking spots as rows with assignment bars
  - Spots have types: Designated (with optional tag) or Marlins/City Decal
  - Click-to-assign from timeline with date-filtered tenant list + building filter
  - Full CRUD for spots and assignments
  - Parking assignments shown on tenant profile
  - Removed `has_parking` from tenant forms/display
  - Removed decals from Properties page
  - Manage Parking Spots collapsible section for spot CRUD

## Backlog
- P2: Date range filters for Upcoming Cleanings table on Housekeeping page
- P2: "Days Vacant" counter for each row on Vacancy page
