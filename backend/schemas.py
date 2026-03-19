from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class PropertyCreate(BaseModel):
    name: str
    address: str
    owner_manager_name: str
    owner_manager_phone: str
    owner_manager_email: str
    available_parking: Optional[str] = ""
    pets_permitted: bool = False
    pet_notes: Optional[str] = ""
    building_amenities: List[str] = []
    additional_notes: Optional[str] = ""
    building_id: Optional[int] = None
    marlins_decal_property: bool = False


class UnitCreate(BaseModel):
    property_id: str
    unit_number: str
    unit_size: str
    unit_size_custom: Optional[str] = ""
    base_rent: float
    additional_monthly_costs: List[Dict[str, Any]] = []
    availability_start_date: str
    close_date: Optional[str] = None


class TenantCreate(BaseModel):
    property_id: str
    unit_id: str
    name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    move_in_date: str
    move_out_date: str
    is_airbnb_vrbo: bool = False
    deposit_amount: Optional[float] = None
    deposit_date: Optional[str] = None
    monthly_rent: Optional[float] = None
    partial_first_month: Optional[float] = None
    partial_last_month: Optional[float] = None
    pets: Optional[str] = ""
    parking: Optional[str] = ""
    has_parking: bool = False
    notes: Optional[str] = ""
    total_rent: Optional[float] = None
    payment_method: Optional[str] = ""
    rent_due_date: Optional[str] = ""
    moveout_confirmed: bool = False
    moveout_confirmed_date: Optional[str] = None
    deposit_return_date: Optional[str] = None
    deposit_return_amount: Optional[float] = None
    deposit_return_method: Optional[str] = ""
    misc_charges: List[Dict[str, Any]] = []
    marlins_decal_id: Optional[str] = None


class MarlinsDecalCreate(BaseModel):
    property_id: str
    decal_number: str
    notes: Optional[str] = ""


class MiscChargeCreate(BaseModel):
    amount: float
    description: str = ""
    charge_date: str


class RentPaymentUpdate(BaseModel):
    paid: bool = False
    partial_amount: Optional[float] = None
    note: str = ""


class DepositReturnRequest(BaseModel):
    return_date: str
    return_method: str = ""
    return_amount: Optional[float] = None


class LeadCreate(BaseModel):
    name: str
    source: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    desired_start_date: Optional[str] = None
    desired_end_date: Optional[str] = None
    potential_unit_ids: List[str] = []
    pets: Optional[str] = ""
    parking_request: Optional[str] = ""
    lead_strength: int = 1
    progress_stage: int = 1
    showing_date: Optional[str] = None
    converted_to_tenant: bool = False
    tenant_id: Optional[str] = None
    price_offered: Optional[float] = None
    preferred_contact_method: Optional[str] = ""
    notes: Optional[str] = ""
    is_unassigned: bool = False
    unassigned_note: Optional[str] = ""


class NotificationCreate(BaseModel):
    name: Optional[str] = ""
    property_id: Optional[str] = None
    unit_id: Optional[str] = None
    assigned_person: Optional[str] = None
    reminder_date: Optional[str] = None
    reminder_time: Optional[str] = ""
    status: str = "upcoming"
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    recurrence_end_date: Optional[str] = None
    reminder_times: List[str] = []
    notes: Optional[str] = ""
    notification_type: Optional[str] = "manual"
    priority: Optional[str] = "medium"
    category: Optional[str] = "manual"
    snooze_until: Optional[str] = None
    status_history: List[Dict[str, Any]] = []
    related_entity_id: Optional[str] = None
    related_entity_type: Optional[str] = None
    lead_id: Optional[str] = None
    lead_name: Optional[str] = ""
    tenant_id: Optional[str] = None
    tenant_name: Optional[str] = ""
    stage_name: Optional[str] = ""
    notification_date: Optional[str] = None
    message: Optional[str] = ""


class BulkNotificationAction(BaseModel):
    ids: List[str]
    action: str
    new_status: Optional[str] = None


class SnoozeNotification(BaseModel):
    snooze_until_date: str
    snooze_until_time: Optional[str] = ""


class NoteCreate(BaseModel):
    title: str
    content: Optional[str] = ""
    color: Optional[str] = "default"


class TeamMemberCreate(BaseModel):
    name: str
    role: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""


class ParkingSpotCreate(BaseModel):
    spot_type: str
    location: Optional[str] = ""
    property_ids: List[str] = []
    spot_number: Optional[str] = ""
    parking_pass_number: Optional[str] = ""
    cost: Optional[float] = None
    notes: Optional[str] = ""
    decal_number: Optional[str] = ""
    decal_year: Optional[str] = ""


class ParkingAssignmentCreate(BaseModel):
    parking_spot_id: str
    tenant_id: str
    tenant_name: Optional[str] = ""
    property_id: Optional[str] = None
    unit_id: Optional[str] = None
    start_date: str
    end_date: str
    notes: Optional[str] = ""
    is_active: bool = True


class DoorCodeCreate(BaseModel):
    unit_id: str
    property_id: str
    admin_code: Optional[str] = ""
    admin_code_note: Optional[str] = ""
    housekeeping_code: Optional[str] = ""
    housekeeping_code_note: Optional[str] = ""
    guest_code: Optional[str] = ""
    guest_code_note: Optional[str] = ""
    backup_code_1: Optional[str] = ""
    backup_code_1_note: Optional[str] = ""
    backup_code_2: Optional[str] = ""
    backup_code_2_note: Optional[str] = ""


class LoginAccountCreate(BaseModel):
    account_name: str
    sensitivity_level: int = 1
    username: Optional[str] = ""
    password: Optional[str] = ""
    email: Optional[str] = ""
    url: Optional[str] = ""
    security_question_1: Optional[str] = ""
    security_answer_1: Optional[str] = ""
    security_question_2: Optional[str] = ""
    security_answer_2: Optional[str] = ""
    phone: Optional[str] = ""
    account_pin: Optional[str] = ""
    account_type: Optional[str] = ""
    notes: Optional[str] = ""


class MarketingLinkCreate(BaseModel):
    unit_id: str
    property_id: str
    airbnb_link: Optional[str] = ""
    furnished_finder_link: Optional[str] = ""
    photos_link: Optional[str] = ""
    additional_links: List[Dict[str, str]] = []


class PinVerify(BaseModel):
    pin: str
    pin_type: str = "shared"


class PinSet(BaseModel):
    pin: str
    pin_type: str = "shared"


class HousekeeperCreate(BaseModel):
    name: str
    contact: Optional[str] = ""
    availability: Optional[str] = ""
    preference: Optional[str] = ""
    pay: Optional[str] = ""
    notes: Optional[str] = ""
    is_archived: bool = False


class HousekeepingLeadCreate(BaseModel):
    name: str
    contact: Optional[str] = ""
    notes: Optional[str] = ""
    call_time: Optional[str] = ""
    interview_pay: Optional[str] = ""
    trial: Optional[str] = ""
    additional_notes: Optional[str] = ""
    is_archived: bool = False


class CleaningRecordUpdate(BaseModel):
    check_in_time: Optional[str] = ""
    check_out_time: Optional[str] = ""
    cleaning_time: Optional[str] = ""
    assigned_cleaner_id: Optional[str] = None
    assigned_cleaner_name: Optional[str] = ""
    confirmed: bool = False
    notes: Optional[str] = ""
    assigned_maintenance_id: Optional[str] = None
    assigned_maintenance_name: Optional[str] = ""
    maintenance_note: Optional[str] = ""


class ManualCleaningCreate(BaseModel):
    unit_id: str
    unit_label: Optional[str] = ""
    tenant_name: Optional[str] = ""
    check_out_date: Optional[str] = ""
    next_check_in_date: Optional[str] = ""
    check_out_time: Optional[str] = ""
    check_in_time: Optional[str] = ""
    cleaning_time: Optional[str] = ""
    assigned_cleaner_id: Optional[str] = None
    assigned_cleaner_name: Optional[str] = ""
    assigned_maintenance_id: Optional[str] = None
    assigned_maintenance_name: Optional[str] = ""
    maintenance_note: Optional[str] = ""
    notes: Optional[str] = ""
    confirmed: bool = False


class MaintenancePersonnelCreate(BaseModel):
    name: str
    contact: Optional[str] = ""
    role: Optional[str] = ""
    notes: Optional[str] = ""
    is_archived: bool = False


class MaintenanceRequestCreate(BaseModel):
    property_id: Optional[str] = None
    unit_id: Optional[str] = None
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "Pending"
    status_color: Optional[str] = "gray"
    access_info: Optional[str] = ""
    assigned_personnel: List[Dict[str, Any]] = []
    notes: Optional[str] = ""
    is_completed: bool = False
    completed_at: Optional[str] = None
