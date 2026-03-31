from pathlib import Path
from dotenv import load_dotenv

# Load env vars BEFORE importing any modules that use os.environ
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from database import client

from routers import properties, tenants, leads, notifications, budgeting, calendar_router, operations, parking, info, admin, maintenance, marlins_decals, public

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

app = FastAPI()

app.include_router(properties.router, prefix="/api")
app.include_router(tenants.router, prefix="/api")
app.include_router(leads.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(budgeting.router, prefix="/api")
app.include_router(calendar_router.router, prefix="/api")
app.include_router(operations.router, prefix="/api")
app.include_router(parking.router, prefix="/api")
app.include_router(info.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(maintenance.router, prefix="/api")
app.include_router(marlins_decals.router, prefix="/api")
app.include_router(public.router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        from object_storage import init_storage
        init_storage()
    except Exception as e:
        logging.warning(f"Storage init deferred: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
