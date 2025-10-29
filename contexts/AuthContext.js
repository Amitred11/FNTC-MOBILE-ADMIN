// AuthContext.js

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setLogoutHandler } from '../services/api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const ADMIN_ROLES = ['admin', 'collector', 'field_agent'];

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const isStaff = user && ADMIN_ROLES.includes(user.role);

    const logout = useCallback(async () => {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        try {
            if (refreshToken) {
                api.post('/admin/auth/logout', { refreshToken }).catch(err => {
                    console.warn("Optional: API logout call failed, but proceeding with cleanup.", err.response?.data?.message || err.message);
                });
            }
        } finally {
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
            api.defaults.headers.Authorization = null; 
            setUser(null);
        }
    }, []);

    useEffect(() => {
        setLogoutHandler(logout);
    }, [logout]);

    useEffect(() => {
        const loadUserFromStorage = async () => {
            setIsLoading(true);
            try {
                const token = await AsyncStorage.getItem('accessToken');
                const userJson = await AsyncStorage.getItem('user');
                
                if (userJson && token) {
                    api.defaults.headers.Authorization = `Bearer ${token}`;
                    
                    const storedUser = JSON.parse(userJson);
                    if (storedUser && ADMIN_ROLES.includes(storedUser.role)) {
                        setUser(storedUser);
                    } else {
                        await logout();
                    }
                }
            } catch (error) {
                console.error("Failed to load user from storage", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadUserFromStorage();
    }, [logout]);

    const adminLogin = async (email, password, rememberMe) => {
        const response = await api.post('/admin/auth/login', { email, password });
        const { accessToken, refreshToken, user: loggedInUser } = response.data;

        if (rememberMe) {
            await AsyncStorage.setItem('accessToken', accessToken);
            await AsyncStorage.setItem('refreshToken', refreshToken);
            await AsyncStorage.setItem('user', JSON.stringify(loggedInUser));
        }
        
        api.defaults.headers.Authorization = `Bearer ${accessToken}`;
        
        setUser(loggedInUser);
        return loggedInUser;
    };
    
    const updateUser = async (newUserData) => {
        const updatedUser = { ...user, ...newUserData };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    };

    const value = { 
        user, 
        isLoading, 
        isStaff,
        adminLogin,
        logout, 
        updateUser 
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};