from bson import ObjectId
from datetime import datetime, date


def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict."""
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if key == '_id':
            result['id'] = str(value)
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, date):
            result[key] = value.isoformat()
        elif isinstance(value, list):
            result[key] = [serialize_doc(item) if isinstance(item, dict) else item for item in value]
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        else:
            result[key] = value
    return result


def parse_date(date_str: str) -> date:
    """Parse ISO date string to date object."""
    if isinstance(date_str, date):
        return date_str
    return datetime.fromisoformat(date_str).date() if 'T' in date_str else date.fromisoformat(date_str)
