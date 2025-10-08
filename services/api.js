import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.100.12:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

let logoutHandler = () => {
  console.error("Logout handler is not set yet.");
};

export const setLogoutHandler = (handler) => {
  logoutHandler = handler;
};

// --- REQUEST INTERCEPTOR ---
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
          logoutHandler();
          return Promise.reject(error);
        }
        
        const userJson = await AsyncStorage.getItem('user');
        const user = userJson ? JSON.parse(userJson) : {};
        const refreshEndpoint = user.role === 'admin' ? '/admin/auth/refresh' : '/auth/refresh';

        const { data } = await api.post(refreshEndpoint, { refreshToken });
        
        await AsyncStorage.setItem('accessToken', data.accessToken);

        api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
        
        return api(originalRequest);

      } catch (refreshError) {
        console.error("Token refresh failed. Logging out.", refreshError);
        logoutHandler();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;




