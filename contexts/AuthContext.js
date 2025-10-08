import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setLogoutHandler } from '../services/api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// A list of all valid staff roles
const ADMIN_ROLES = ['admin', 'collector', 'field_agent'];

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const isStaff = user && ADMIN_ROLES.includes(user.role);

    const logout = useCallback(async () => {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        try {
            if (refreshToken) {
                await api.post('/admin/auth/logout', { refreshToken });
            }
        } catch (error) {
            console.error("API logout call failed, but proceeding with client-side cleanup.", error);
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
                const userJson = await AsyncStorage.getItem('user');
                const token = await AsyncStorage.getItem('accessToken');
                
                if (userJson && token) {
                    const storedUser = JSON.parse(userJson);
                    // ✅ FIX: Allow ANY user whose role is in ADMIN_ROLES to be loaded.
                    // This is the key change that keeps collectors and agents logged in.
                    if (storedUser && ADMIN_ROLES.includes(storedUser.role)) {
                        setUser(storedUser);
                    } else {
                        // If a non-staff user somehow has a token, log them out.
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

    const adminLogin = async (email, password) => {
        const response = await api.post('/admin/auth/login', { email, password });
        const { accessToken, refreshToken, user: loggedInUser } = response.data;

        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', refreshToken);
        await AsyncStorage.setItem('user', JSON.stringify(loggedInUser));
        
        setUser(loggedInUser);
        return loggedInUser;
    };
    
    const updateUser = async (newUserData) => {
        const updatedUser = { ...user, ...newUserData };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    };

    // ✅ FIX: No longer exporting the rigid 'isAdmin' boolean.
    // Components will now check the user.role directly for more flexibility.
    const value = { 
        user, 
        isLoading, 
        isStaff, // Export the new, more accurate check
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