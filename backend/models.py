"""
Pydantic models reference file for the Property Management System.
Actual models are defined inline in server.py for simplicity.
This file serves as documentation of the data structures.
"""

COLLECTIONS = {
    'properties': {
        'fields': ['name', 'address', 'owner_manager_name', 'owner_manager_phone',
                   'owner_manager_email', 'available_parking', 'pets_permitted',
                   'pet_notes', 'building_amenities', 'additional_notes'],
        'indexes': ['name']
    },
    'units': {
        'fields': ['property_id', 'unit_number', 'unit_size', 'unit_size_custom',
                   'base_rent', 'additional_monthly_costs', 'availability_start_date',
                   'close_date'],
        'indexes': ['property_id', 'unit_number']
    },
    'tenants': {
        'fields': ['property_id', 'unit_id', 'name', 'phone', 'email',
                   'move_in_date', 'move_out_date', 'is_airbnb_vrbo',
                   'deposit_amount', 'deposit_date', 'monthly_rent',
                   'partial_first_month', 'partial_last_month',
                   'pets', 'parking', 'notes', 'total_rent',
                   'total_nights', 'rent_per_night', 'monthly_breakdown'],
        'indexes': ['unit_id', 'property_id', 'move_in_date', 'move_out_date']
    },
    'leads': {
        'fields': ['name', 'source', 'phone', 'email',
                   'desired_start_date', 'desired_end_date',
                   'potential_unit_ids', 'pets', 'parking_request',
                   'lead_strength', 'progress_stage', 'showing_date',
                   'converted_to_tenant', 'tenant_id'],
        'indexes': ['progress_stage', 'lead_strength']
    },
    'notifications': {
        'fields': ['lead_id', 'lead_name', 'stage_name',
                   'notification_date', 'message', 'is_read'],
        'indexes': ['is_read', 'lead_id']
    }
}
