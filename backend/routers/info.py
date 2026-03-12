from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId

from database import db
from helpers import serialize_doc
from schemas import DoorCodeCreate, LoginAccountCreate, MarketingLinkCreate, NoteCreate

router = APIRouter()


# ============================================================
# DOOR CODES
# ============================================================

@router.get("/door-codes")
async def list_door_codes(unit_id: Optional[str] = None, property_id: Optional[str] = None):
    query = {}
    if unit_id:
        query["unit_id"] = unit_id
    if property_id:
        query["property_id"] = property_id
    docs = await db.door_codes.find(query).to_list(1000)
    return [serialize_doc(d) for d in docs]


@router.post("/door-codes")
async def create_or_update_door_code(data: DoorCodeCreate):
    existing = await db.door_codes.find_one({"unit_id": data.unit_id})
    doc = data.model_dump()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    if existing:
        await db.door_codes.update_one({"_id": existing["_id"]}, {"$set": doc})
        updated = await db.door_codes.find_one({"_id": existing["_id"]})
        return serialize_doc(updated)
    else:
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.door_codes.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_doc(doc)


@router.delete("/door-codes/{code_id}")
async def delete_door_code(code_id: str):
    result = await db.door_codes.delete_one({"_id": ObjectId(code_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Door code not found")
    return {"message": "Door code deleted"}


# ============================================================
# LOGIN ACCOUNTS
# ============================================================

@router.get("/login-accounts")
async def list_login_accounts():
    docs = await db.login_accounts.find().sort("account_name", 1).to_list(1000)
    return [serialize_doc(d) for d in docs]


@router.post("/login-accounts")
async def create_login_account(data: LoginAccountCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.login_accounts.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.put("/login-accounts/{account_id}")
async def update_login_account(account_id: str, data: LoginAccountCreate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.login_accounts.update_one({"_id": ObjectId(account_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Login account not found")
    doc = await db.login_accounts.find_one({"_id": ObjectId(account_id)})
    return serialize_doc(doc)


@router.delete("/login-accounts/{account_id}")
async def delete_login_account(account_id: str):
    result = await db.login_accounts.delete_one({"_id": ObjectId(account_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Login account not found")
    return {"message": "Login account deleted"}


# ============================================================
# MARKETING LINKS
# ============================================================

@router.get("/marketing-links")
async def list_marketing_links(unit_id: Optional[str] = None):
    query = {}
    if unit_id:
        query["unit_id"] = unit_id
    docs = await db.marketing_links.find(query).to_list(1000)
    return [serialize_doc(d) for d in docs]


@router.post("/marketing-links")
async def create_or_update_marketing_link(data: MarketingLinkCreate):
    existing = await db.marketing_links.find_one({"unit_id": data.unit_id})
    doc = data.model_dump()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    if existing:
        await db.marketing_links.update_one({"_id": existing["_id"]}, {"$set": doc})
        updated = await db.marketing_links.find_one({"_id": existing["_id"]})
        return serialize_doc(updated)
    else:
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.marketing_links.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_doc(doc)


@router.delete("/marketing-links/{link_id}")
async def delete_marketing_link(link_id: str):
    result = await db.marketing_links.delete_one({"_id": ObjectId(link_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Marketing link not found")
    return {"message": "Marketing link deleted"}


# ============================================================
# NOTES
# ============================================================

@router.get("/notes")
async def list_notes():
    docs = await db.notes.find().sort("updated_at", -1).to_list(1000)
    return [serialize_doc(d) for d in docs]


@router.get("/notes/{note_id}")
async def get_note(note_id: str):
    doc = await db.notes.find_one({"_id": ObjectId(note_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Note not found")
    return serialize_doc(doc)


@router.post("/notes")
async def create_note(data: NoteCreate):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.notes.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.put("/notes/{note_id}")
async def update_note(note_id: str, data: NoteCreate):
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.notes.update_one({"_id": ObjectId(note_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    doc = await db.notes.find_one({"_id": ObjectId(note_id)})
    return serialize_doc(doc)


@router.delete("/notes/{note_id}")
async def delete_note(note_id: str):
    result = await db.notes.delete_one({"_id": ObjectId(note_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted"}
