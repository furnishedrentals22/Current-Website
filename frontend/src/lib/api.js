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

// Available units
export const getAvailableUnits = (startDate, endDate) => {
  const params = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  return api.get('/available-units', { params }).then(r => r.data);
};

// Dashboard
export const getDashboard = () => api.get('/dashboard').then(r => r.data);

export default api;
