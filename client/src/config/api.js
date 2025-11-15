// API Configuration
// In development, uses proxy from vite.config.js
// In production, uses VITE_API_URL environment variable

const getApiUrl = () => {
  // Check if we're in development (Vite sets this)
  if (import.meta.env.DEV) {
    // In development, use relative URLs (Vite proxy handles this)
    return '';
  }
  
  // In production, use the environment variable
  return import.meta.env.VITE_API_URL || '';
};

export const API_BASE_URL = getApiUrl();

// Configure axios default baseURL and timeout
import axios from 'axios';
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.timeout = 30000; // 30 seconds timeout

export default axios;

