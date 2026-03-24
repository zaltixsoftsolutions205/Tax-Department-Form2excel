import axios from 'axios';

// In production (Vercel), VITE_API_URL points to your Render backend URL.
// In development, it's empty so Vite's proxy handles /api/* → localhost:5001
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
});

export default api;
