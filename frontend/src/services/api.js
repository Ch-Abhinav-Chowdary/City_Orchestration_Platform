import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Incidents
export const getIncidents = (params) => api.get('/incidents', { params });
export const getIncident = (id) => api.get(`/incidents/${id}`);
export const createIncident = (data) => api.post('/incidents', data);
export const closeIncident = (id) => api.post(`/incidents/${id}/close`);
export const updateIncidentStatus = (id, status) => api.patch(`/incidents/${id}/status`, { status });

// Resources
export const getResources = (params) => api.get('/resources', { params });
export const getResource = (id) => api.get(`/resources/${id}`);
export const updateResource = (data) => api.post('/resources/update', data);

// Orchestration
export const assignResources = (incidentId, autoResolveConflicts = true) =>
    api.post('/orchestration/assign', { incidentId, autoResolveConflicts });
export const manualOverride = (data) => api.post('/orchestration/override', data);
export const getPendingConflicts = () => api.get('/orchestration/pending');
export const resolveConflict = (conflictId, strategy, userId) =>
    api.post('/orchestration/resolve-conflict', { conflictId, strategy, userId });
export const getRecommendations = (incidentId) =>
    api.get(`/orchestration/recommendations/${incidentId}`);

// Dashboard
export const getLiveDashboard = () => api.get('/dashboard/live');
export const getMapData = () => api.get('/dashboard/map-data');
export const getMetrics = () => api.get('/dashboard/metrics');

// Analysis
export const getHistoricalIncidents = (params) => api.get('/analysis/incidents', { params });
export const getIncidentAnalysis = (id) => api.get(`/analysis/incident/${id}`);
export const getAnalysisSummary = (params) => api.get('/analysis/summary', { params });
export const getTrainingData = () => api.get('/analysis/training-data');

// Events
export const getEvents = (params) => api.get('/events', { params });
export const getEventStats = () => api.get('/events/stats');

export default api;
