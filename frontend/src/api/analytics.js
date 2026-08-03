import api from './auth.js';

export const getUsageSummary = async (params = {}) => {
  const response = await api.get('/analytics/usage/summary', { params });
  return response.data;
};

export const getMyUsage = async () => {
  const response = await api.get('/analytics/usage/my');
  return response.data;
};

export const getCollectionItems = async (params = {}) => {
  const response = await api.get('/analytics/items', { params });
  return response.data;
};

export const createCollectionItem = async (itemData) => {
  const response = await api.post('/analytics/items', itemData);
  return response.data;
};

export const getCollectionItem = async (id) => {
  const response = await api.get(`/analytics/items/${id}`);
  return response.data;
};

export const runClustering = async () => {
  const response = await api.post('/analytics/clustering/run');
  return response.data;
};

export const getClusteringResults = async () => {
  const response = await api.get('/analytics/clustering/results');
  return response.data;
};

export const getRecommendations = async () => {
  const response = await api.get('/analytics/recommendations');
  return response.data;
};

export const updateItemStatus = async (id, status) => {
  const response = await api.put(`/analytics/items/${id}/status`, { status });
  return response.data;
};

export const getSettings = async () => {
  const response = await api.get('/analytics/settings');
  return response.data;
};

export const getBorrowerAnalytics = async () => {
  const response = await api.get('/analytics/usage/borrowers');
  return response.data;
};

export const updateSettings = async (settings) => {
  const response = await api.put('/analytics/settings', settings);
  return response.data;
};

export const getSimilarItems = async (id) => {
  const response = await api.get(`/analytics/recommend/similar/${id}`);
  return response.data;
};

export const getCollectionDecisions = async () => {
  const response = await api.get('/analytics/collection-decisions');
  return response.data;
};

export const getUserClustering = async () => {
  const response = await api.get('/analytics/user-clustering');
  return response.data;
};

export const reserveItem = async (itemId) => {
  const response = await api.post(`/analytics/items/${itemId}/reserve`);
  return response.data;
};

export const getMyReservations = async () => {
  const response = await api.get('/analytics/reservations');
  return response.data;
};

export const getAllReservations = async () => {
  const response = await api.get('/analytics/reservations/all');
  return response.data;
};

export const cancelReservation = async (reservationId) => {
  const response = await api.delete(`/analytics/reservations/${reservationId}/cancel`);
  return response.data;
};

export const getNotifications = async () => {
  const response = await api.get('/analytics/notifications');
  return response.data;
};

export const markNotificationsRead = async () => {
  const response = await api.post('/analytics/notifications/read');
  return response.data;
};

export const getActivities = async (action = '') => {
  const response = await api.get('/analytics/activities', { params: action ? { action } : {} });
  return response.data;
};

export const getTransactions = async (status = '') => {
  const response = await api.get('/analytics/transactions', { params: status ? { status } : {} });
  return response.data;
};

export const getRecommendationsForMe = async (userId = null) => {
  const response = await api.get('/analytics/recommend/for-me', { params: userId ? { userId } : {} });
  return response.data;
};

export const borrowItem = async (itemId, data = {}) => {
  const response = await api.post(`/analytics/items/${itemId}/borrow`, data);
  return response.data;
};

export const returnItem = async (itemId, data = {}) => {
  const response = await api.post(`/analytics/items/${itemId}/return`, data);
  return response.data;
};

export const downloadItemsCsv = async () => {
  const response = await api.get('/analytics/items/download');
  return response.data;
};

export const uploadItemsCsv = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/analytics/items/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export default api;