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

export default api;
