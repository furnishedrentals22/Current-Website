import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: { 'Content-Type': 'application/json' }
});

// Properties
export const getProperties = () => api.get('/properties').then(r => r.data);
export const getProperty = (id) => api.get(`/properties/${id}`).then(r => r.data);
export const createProperty = (data) => api.post('/properties', data).then(r => r.data);
export const updateProperty = (id, data) => api.put(`/properties/${id}`, data).then(r => r.data);
export const deleteProperty = (id) => api.delete(`/properties/${id}`).then(r => r.data);

// Units
export const getUnits = (propertyId) => {
  const params = propertyId ? { property_id: propertyId } : {};
  return api.get('/units', { params }).then(r => r.data);
};
export const getUnit = (id) => api.get(`/units/${id}`).then(r => r.data);
export const createUnit = (data) => api.post('/units', data).then(r => r.data);
export const updateUnit = (id, data) => api.put(`/units/${id}`, data).then(r => r.data);
export const deleteUnit = (id) => api.delete(`/units/${id}`).then(r => r.data);

// Tenants
export const getTenants = (params = {}) => api.get('/tenants', { params }).then(r => r.data);
export const getTenant = (id) => api.get(`/tenants/${id}`).then(r => r.data);
export const createTenant = (data) => api.post('/tenants', data).then(r => r.data);
export const updateTenant = (id, data) => api.put(`/tenants/${id}`, data).then(r => r.data);
export const deleteTenant = (id) => api.delete(`/tenants/${id}`).then(r => r.data);
export const confirmMoveout = (id) => api.post(`/tenants/${id}/confirm-moveout`).then(r => r.data);
export const getPendingMoveouts = () => api.get('/tenants/pending-moveouts').then(r => r.data);

// Leads
export const getLeads = () => api.get('/leads').then(r => r.data);
export const getLead = (id) => api.get(`/leads/${id}`).then(r => r.data);
export const createLead = (data) => api.post('/leads', data).then(r => r.data);
export const updateLead = (id, data) => api.put(`/leads/${id}`, data).then(r => r.data);
export const deleteLead = (id) => api.delete(`/leads/${id}`).then(r => r.data);
export const getLeadStages = () => api.get('/lead-stages').then(r => r.data);

// Notifications
export const getNotifications = () => api.get('/notifications').then(r => r.data);
export const createNotification = (data) => api.post('/notifications', data).then(r => r.data);
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`).then(r => r.data);
export const markNotificationUnread = (id) => api.put(`/notifications/${id}/unread`).then(r => r.data);
export const deleteNotification = (id) => api.delete(`/notifications/${id}`).then(r => r.data);

// Calculations
export const getIncome = (year) => api.get('/income', { params: { year } }).then(r => r.data);
export const getVacancy = (year) => api.get('/vacancy', { params: { year } }).then(r => r.data);
export const getCalendarData = (year) => api.get('/calendar', { params: { year } }).then(r => r.data);

// Calendar timeline (segment-based)
export const getCalendarTimeline = (params = {}) => api.get('/calendar/timeline', { params }).then(r => r.data);

// Available units
export const getAvailableUnits = (startDate, endDate) => {
  const params = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  return api.get('/available-units', { params }).then(r => r.data);
};

// Dashboard
export const getDashboard = () => api.get('/dashboard').then(r => r.data);

// Notes
export const getNotes = () => api.get('/notes').then(r => r.data);
export const getNote = (id) => api.get(`/notes/${id}`).then(r => r.data);
export const createNote = (data) => api.post('/notes', data).then(r => r.data);
export const updateNote = (id, data) => api.put(`/notes/${id}`, data).then(r => r.data);
export const deleteNote = (id) => api.delete(`/notes/${id}`).then(r => r.data);

// Team Members
export const getTeamMembers = () => api.get('/team-members').then(r => r.data);
export const createTeamMember = (data) => api.post('/team-members', data).then(r => r.data);
export const updateTeamMember = (id, data) => api.put(`/team-members/${id}`, data).then(r => r.data);
export const deleteTeamMember = (id) => api.delete(`/team-members/${id}`).then(r => r.data);

// Parking Spots
export const getParkingSpots = () => api.get('/parking-spots').then(r => r.data);
export const getParkingSpot = (id) => api.get(`/parking-spots/${id}`).then(r => r.data);
export const createParkingSpot = (data) => api.post('/parking-spots', data).then(r => r.data);
export const updateParkingSpot = (id, data) => api.put(`/parking-spots/${id}`, data).then(r => r.data);
export const deleteParkingSpot = (id) => api.delete(`/parking-spots/${id}`).then(r => r.data);

// Parking Assignments
export const getParkingAssignments = (params = {}) => api.get('/parking-assignments', { params }).then(r => r.data);
export const createParkingAssignment = (data) => api.post('/parking-assignments', data).then(r => r.data);
export const updateParkingAssignment = (id, data) => api.put(`/parking-assignments/${id}`, data).then(r => r.data);
export const deleteParkingAssignment = (id) => api.delete(`/parking-assignments/${id}`).then(r => r.data);

// Door Codes
export const getDoorCodes = (params = {}) => api.get('/door-codes', { params }).then(r => r.data);
export const saveDoorCode = (data) => api.post('/door-codes', data).then(r => r.data);
export const deleteDoorCode = (id) => api.delete(`/door-codes/${id}`).then(r => r.data);

// Login Accounts
export const getLoginAccounts = () => api.get('/login-accounts').then(r => r.data);
export const createLoginAccount = (data) => api.post('/login-accounts', data).then(r => r.data);
export const updateLoginAccount = (id, data) => api.put(`/login-accounts/${id}`, data).then(r => r.data);
export const deleteLoginAccount = (id) => api.delete(`/login-accounts/${id}`).then(r => r.data);

// Marketing Links
export const getMarketingLinks = (params = {}) => api.get('/marketing-links', { params }).then(r => r.data);
export const saveMarketingLink = (data) => api.post('/marketing-links', data).then(r => r.data);
export const deleteMarketingLink = (id) => api.delete(`/marketing-links/${id}`).then(r => r.data);

// PIN Management
export const getPinStatus = () => api.get('/pins/status').then(r => r.data);
export const setPin = (data) => api.post('/pins/set', data).then(r => r.data);
export const verifyPin = (data) => api.post('/pins/verify', data).then(r => r.data);

// Notifications (extended)
export const updateNotification = (id, data) => api.put(`/notifications/${id}`, data).then(r => r.data);
export const updateNotificationStatus = (id, status) => api.put(`/notifications/${id}/status?status=${status}`).then(r => r.data);
export const snoozeNotification = (id, data) => api.post(`/notifications/${id}/snooze`, data).then(r => r.data);
export const duplicateNotification = (id) => api.post(`/notifications/${id}/duplicate`).then(r => r.data);
export const bulkNotificationAction = (data) => api.post('/notifications/bulk-action', data).then(r => r.data);

// Move In / Move Out
export const getMoveInsOuts = () => api.get('/move-ins-outs').then(r => r.data);

// Housekeepers
export const getHousekeepers = (params = {}) => api.get('/housekeepers', { params }).then(r => r.data);
export const createHousekeeper = (data) => api.post('/housekeepers', data).then(r => r.data);
export const updateHousekeeper = (id, data) => api.put(`/housekeepers/${id}`, data).then(r => r.data);
export const deleteHousekeeper = (id) => api.delete(`/housekeepers/${id}`).then(r => r.data);

// Housekeeping Leads
export const getHousekeepingLeads = (params = {}) => api.get('/housekeeping-leads', { params }).then(r => r.data);
export const createHousekeepingLead = (data) => api.post('/housekeeping-leads', data).then(r => r.data);
export const updateHousekeepingLead = (id, data) => api.put(`/housekeeping-leads/${id}`, data).then(r => r.data);
export const deleteHousekeepingLead = (id) => api.delete(`/housekeeping-leads/${id}`).then(r => r.data);

// Cleaning Records
export const getCleaningRecords = (params = {}) => api.get('/cleaning-records', { params }).then(r => r.data);
export const updateCleaningRecord = (id, data) => api.put(`/cleaning-records/${id}`, data).then(r => r.data);

// Deposits
export const getCurrentDeposits = () => api.get('/deposits/current').then(r => r.data);
export const getPastDeposits = () => api.get('/deposits/past').then(r => r.data);
export const returnDeposit = (tenantId, data) => api.post(`/tenants/${tenantId}/return-deposit`, data).then(r => r.data);
export const getLandlordDeposits = () => api.get('/landlord-deposits').then(r => r.data);
export const updateLandlordDeposit = (unitId, amount) => api.put(`/landlord-deposits/${unitId}?amount=${amount}`).then(r => r.data);

// Misc Charges
export const createMiscCharge = (tenantId, data) => api.post(`/tenants/${tenantId}/misc-charges`, data).then(r => r.data);
export const getMiscCharges = (params = {}) => api.get('/misc-charges', { params }).then(r => r.data);
export const deleteMiscCharge = (id) => api.delete(`/misc-charges/${id}`).then(r => r.data);

// Rent Tracking
export const getRentTracking = (params = {}) => api.get('/rent-tracking', { params }).then(r => r.data);
export const updateRentPayment = (tenantId, data, year, month) => api.put(`/rent-tracking/${tenantId}?year=${year}&month=${month}`, data).then(r => r.data);

// Notification Checklist
export const updateNotificationChecklist = (id, key, checked) => api.put(`/notifications/${id}/checklist?key=${key}&checked=${checked}`).then(r => r.data);

// Maintenance Personnel
export const getMaintenancePersonnel = (params = {}) => api.get('/maintenance-personnel', { params }).then(r => r.data);
export const createMaintenancePersonnel = (data) => api.post('/maintenance-personnel', data).then(r => r.data);
export const updateMaintenancePersonnel = (id, data) => api.put(`/maintenance-personnel/${id}`, data).then(r => r.data);
export const deleteMaintenancePersonnel = (id) => api.delete(`/maintenance-personnel/${id}`).then(r => r.data);

// Maintenance Requests
export const getMaintenanceRequests = (params = {}) => api.get('/maintenance-requests', { params }).then(r => r.data);
export const createMaintenanceRequest = (data) => api.post('/maintenance-requests', data).then(r => r.data);
export const updateMaintenanceRequest = (id, data) => api.put(`/maintenance-requests/${id}`, data).then(r => r.data);
export const deleteMaintenanceRequest = (id) => api.delete(`/maintenance-requests/${id}`).then(r => r.data);

// Marlins Decals
export const getMarlinsDecals = (params = {}) => api.get('/marlins-decals', { params }).then(r => r.data);
export const createMarlinsDecal = (data) => api.post('/marlins-decals', data).then(r => r.data);
export const deleteMarlinsDecal = (id) => api.delete(`/marlins-decals/${id}`).then(r => r.data);

export default api;
