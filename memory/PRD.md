# Furnished Rentals Property Management - PRD

## Original Problem Statement
Build and maintain a comprehensive property management application for furnished rentals, with a focus on high data clarity, responsive design, and maintainable component structures.

## Stack
- **Frontend**: React (JavaScript), Shadcn/UI, TailwindCSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Object Storage**: Emergentintegrations (for listing photo uploads)

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
13. **Listings Enhancements** - Detail pages, image carousel, photo uploads, date search, multi-month pricing, availability navigation (Mar 2026)
14. **Admin UX Refinement** - Admin access moved to small header button with dialog, logout support, listings shortcut in main app header (Mar 2026)

## Architecture
```
/app/
├── backend/
│   ├── core_logic.py
│   ├── object_storage.py        # Emergent object storage integration
│   ├── routers/
│   │   ├── public.py             # Auth, public listings, admin pricing, photo CRUD
│   │   ├── parking.py            # Rebuilt: timeline + CRUD + tenant filtering
│   │   └── ...
│   └── tests/
│       ├── test_listings_enhancements.py
│       ├── test_parking.py
│       ├── test_public_listings.py
│       └── test_vacancy_refactor.py
└── frontend/
    └── src/
        ├── components/
        │   ├── PasswordGate.js        # Password protection wrapper
        │   ├── parking/               # Rebuilt parking timeline
        │   ├── properties/
        │   ├── leads/
        │   ├── housekeeping/
        │   ├── tenants/
        │   ├── calendar/
        │   └── TenantDetailModal.js
        ├── pages/
        │   ├── ListingsPage.js        # Public guest listings directory
        │   ├── ListingDetailPage.js   # Individual listing with carousel + admin
        │   ├── ParkingPage.js         # Rebuilt with calendar timeline
        │   ├── PropertiesPage.js
        │   ├── TenantsPage.js
        │   └── ...
        └── lib/
            └── api.js
```

## Key DB Collections
- `listing_pricing`: `{unit_id, year, month, price, updated_at}` - Monthly pricing per unit
- `listing_details`: `{unit_id, title, description, photos[{id, storage_path, original_filename, content_type, is_deleted, created_at}]}` - Custom listing details with uploaded photos
- `settings`: `{type: "app_password", password: "..."}` - App password storage
- `parking_spots`: `{spot_type, spot_number, decal_number, needs_tag, location, notes}`
- `parking_assignments`: `{spot_id, tenant_id, start_date, end_date, notes}`

## Key API Endpoints
- `POST /api/auth/verify-password` - Verify app password
- `GET /api/public/listings` - Public: all active units (supports ?start_date & ?end_date filtering)
- `GET /api/public/listings/{unit_id}` - Public: single listing details with photos, pricing
- `GET /api/public/listings/{unit_id}/availability` - Public: month calendars (supports ?start_year, ?start_month, ?num_months)
- `POST /api/public/admin/pricing` - Protected: save monthly pricing (multi-month support)
- `POST /api/public/admin/pricing/delete` - Protected: delete pricing entry
- `PUT /api/public/admin/listings/{unit_id}` - Protected: update title/description
- `POST /api/public/admin/listings/{unit_id}/photos` - Protected: upload photo via object storage
- `POST /api/public/admin/listings/{unit_id}/photos/delete` - Protected: soft-delete photo
- `GET /api/public/files/{path}` - Serve uploaded files from object storage

## Completed Tasks
- P0: Core CRUD for all entities
- P0: Major frontend refactoring (Properties, Leads, Housekeeping, Tenants pages modularized)
- P0: Backend core_logic.py vacancy logic simplified
- P0: Parking page complete rebuild (Feb 2026)
- P0: Guest Listings Page (Mar 2026)
- P0: Password Protection (Mar 2026)
- P0: Listings Enhancements (Mar 2026)
  - Multi-month selection for pricing (chip-based UI, up to 18 months)
  - Clickable listings → /listings/:id detail page with image carousel
  - Admin UI to upload photos (object storage) and edit title/description
  - Date-range search on /listings page filtering by tenant occupancy
  - Direct URLs for individual listings with "See All Listings" nav
  - Availability calendar with month navigation (prev/next) and 3/6/12mo toggle

## Backlog
- P2: Date range filters for Upcoming Cleanings table on Housekeeping page
- P2: "Days Vacant" counter for each row on Vacancy page
