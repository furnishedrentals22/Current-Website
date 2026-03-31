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
11. **Password Protection** - Simple password gate for admin app (Mar 2026)
12. **Guest Listings Page** - Public-facing listings at /listings with availability calendar and admin pricing (Mar 2026)

## Architecture
```
/app/
├── backend/
│   ├── core_logic.py
│   ├── routers/
│   │   ├── public.py           # NEW: Auth, public listings, admin pricing
│   │   ├── parking.py          # Rebuilt: timeline + CRUD + tenant filtering
│   │   ├── marlins_decals.py   # Legacy (no longer used by frontend)
│   │   └── ...
│   └── tests/
│       ├── test_parking.py
│       ├── test_public_listings.py
│       └── test_vacancy_refactor.py
└── frontend/
    └── src/
        ├── components/
        │   ├── PasswordGate.js      # NEW: Password protection wrapper
        │   ├── parking/             # REBUILT
        │   ├── properties/
        │   ├── leads/
        │   ├── housekeeping/
        │   ├── tenants/
        │   ├── calendar/
        │   └── TenantDetailModal.js
        ├── pages/
        │   ├── ListingsPage.js      # NEW: Public guest listings
        │   ├── ParkingPage.js       # REBUILT with calendar timeline
        │   ├── PropertiesPage.js    # Cleaned: removed decal references
        │   ├── TenantsPage.js       # Cleaned: removed has_parking/marlins_decal
        │   └── ...
        └── lib/
            └── api.js
```

## Key DB Collections
- `listing_pricing`: `{unit_id, year, month, price, updated_at}` - Monthly pricing per unit
- `listing_details`: `{unit_id, title, description, photos[]}` - Custom listing details (future)
- `settings`: `{type: "app_password", password: "..."}` - App password storage
- `parking_spots`: `{spot_type, spot_number, decal_number, needs_tag, location, notes}`
- `parking_assignments`: `{spot_id, tenant_id, start_date, end_date, notes}`

## Key API Endpoints
- `POST /api/auth/verify-password` - Verify app password
- `GET /api/public/listings` - Public: all active units as guest listings
- `GET /api/public/listings/{unit_id}/availability` - Public: 6-month availability calendar + pricing
- `POST /api/public/admin/pricing` - Protected: save monthly pricing per unit
- `GET /api/public/admin/pricing` - Get all pricing entries

## Completed Tasks
- P0: Core CRUD for all entities
- P0: Major frontend refactoring (Properties, Leads, Housekeeping, Tenants pages modularized)
- P0: Backend core_logic.py vacancy logic simplified
- P0: Parking page complete rebuild (Feb 2026)
- **P0: Guest Listings Page** (Mar 2026)
  - Public-facing page at /listings, no sidebar/header
  - Listing cards with placeholder images, title, price, "Check Availability" button
  - Availability dialog showing 6 months of calendar with color-coded days
  - Calendar shows monthly pricing or "Contact for pricing"
  - Admin pricing section at bottom (password-protected)
  - Admin can select unit + set pricing for 12 months ahead
- **P0: Password Protection** (Mar 2026)
  - Simple password gate wrapping admin app
  - Session-based (sessionStorage) - persists until browser tab closed
  - /listings is publicly accessible without password

## Backlog
- P2: Date range filters for Upcoming Cleanings table on Housekeeping page
- P2: "Days Vacant" counter for each row on Vacancy page
- P3: Listing details editor (custom titles, descriptions, photo uploads for units)
