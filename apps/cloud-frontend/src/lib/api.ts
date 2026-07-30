import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach access token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('ps_access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle token refresh on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('ps_refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call backend refresh route directly
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        
        if (res.data?.success) {
          const { accessToken, refreshToken: newRefreshToken } = res.data;
          
          localStorage.setItem('ps_access_token', accessToken);
          localStorage.setItem('ps_refresh_token', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Clear auth tokens and redirect if refresh fails
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ps_access_token');
          localStorage.removeItem('ps_refresh_token');
          localStorage.removeItem('ps_user');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
