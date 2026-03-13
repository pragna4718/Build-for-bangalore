import api from "./api";

// Health metrics
export const logMetrics = (data) => api.post("/health/metrics", data);
export const getMetrics = () => api.get("/health/metrics");
export const analyzeHealth = () => api.post("/health/analyze");
export const getPredictions = () => api.get("/health/predictions");

// Medical reports
export const addReport = (data) => api.post("/health/reports", data);
export const getReports = () => api.get("/health/reports");

// AI-powered
export const getGlycemicCurve = (data) => api.post("/health/glycemic-curve", data);
export const getSleepDebt = (data) => api.post("/health/sleep-debt", data);
export const getDopamineScore = (data) => api.post("/health/dopamine-score", data);
export const getBiologicalAge = (data) => api.post("/health/biological-age", data);

// Appointments
export const createAppointment = (data) => api.post("/appointments", data);
export const getAppointments = () => api.get("/appointments");
export const updateAppointment = (id, data) => api.patch(`/appointments/${id}`, data);

// Grocery
export const scanGrocery = (data) => api.post("/grocery/scan", data);
export const getGroceryHistory = () => api.get("/grocery/history");

// Food Plate Analyzer
export const analyzeFoodPlate = (data) => api.post("/food-plate/analyze", data);

// Grocery Image Analyzer
export const analyzeGroceryImage = (data) => api.post("/grocery/scan-image", data);

// Health Q&A
export const askHealthQuestion = (data) => api.post("/health-qa/ask", data);

// Exposome
export const getCurrentExposome = (lat, lon) => api.get(`/exposome/current?lat=${lat}&lon=${lon}`);
export const getExposomeHistory = () => api.get("/exposome/history");
export const getCalendarSuggestions = (data) => api.post("/exposome/suggestions", data);

