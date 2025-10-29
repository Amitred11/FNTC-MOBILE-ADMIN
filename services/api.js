import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants'; 

const { API_BASE_URL, CONFIG_INTERNAL_API_KEY } = Constants.expoConfig.extra;
console.log("API BASE URL:", API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Api-Key': CONFIG_INTERNAL_API_KEY, 
  },
  timeout: 30000,
});

let logoutHandler = () => {
  console.error("Logout handler is not set yet.");
};

export const setLogoutHandler = (handler) => {
  logoutHandler = handler;
};

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

        const ADMIN_ROLES = ['admin', 'collector', 'field_agent'];
        const isStaff = user.role && ADMIN_ROLES.includes(user.role);
        const refreshEndpoint = isStaff ? '/admin/auth/refresh' : '/auth/refresh';

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




