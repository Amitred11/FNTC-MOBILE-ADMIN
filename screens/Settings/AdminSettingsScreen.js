// screens/AdminSettingsScreen.js
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext'; 
import { Ionicons } from '@expo/vector-icons';

// --- Reusable Components  ---
const SettingsMenuItem = ({ icon, label, onPress, isLast = false }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <TouchableOpacity style={[styles.menuItem, isLast && styles.menuItemLast]} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.menuIconWrapper}>
                <Ionicons name={icon} size={22} color={theme.primary} />
            </View>
            <Text style={styles.menuItemText}>{label}</Text>
            <Ionicons name="chevron-forward-outline" size={22} color={theme.textSecondary} />
        </TouchableOpacity>
    );
};

const SettingsGroup = ({ title, children }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.menuGroup}>
            <Text style={styles.menuGroupTitle}>{title}</Text>
            <View style={styles.menuGroupContainer}>
                {children}
            </View>
        </View>
    );
}

// --- Main Screen ---
export default function AdminSettingsScreen({ navigation }) {
    const { theme } = useTheme();
    const { user, logout } = useAuth();
    const { showAlert } = useAlert(); 
    const styles = getStyles(theme);

    if (!user) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorText}>User data not found.</Text>
            </SafeAreaView>
        );
    }

    const handleLogout = () => {
        showAlert("Confirm Logout", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout", style: "destructive", onPress: logout }
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.profileHeader}>
                    <Image
                        source={user.photoUrl ? { uri: user.photoUrl } : require('../../assets/images/default-avatar.jpg')}
                        style={styles.avatar}
                    />
                    <View style={styles.profileTextContainer}>
                        <Text style={styles.userName}>{user.displayName || 'Admin User'}</Text>
                        <Text style={styles.userEmail}>{user.email}</Text>
                    </View>
                </View>

                <SettingsGroup title="GENERAL">
                    <SettingsMenuItem
                        icon="person-circle-outline"
                        label="Edit Profile"
                        onPress={() => navigation.navigate('AdminProfile')}
                        isLast
                    />
                </SettingsGroup>

                <SettingsGroup title="HELP & SUPPORT">
                    <SettingsMenuItem
                        icon="book-outline"
                        label="Guide"
                        onPress={() => navigation.navigate('AdminDocumentation')}
                    />
                    <SettingsMenuItem
                        icon="information-circle-outline"
                        label="About App"
                        onPress={() => navigation.navigate('About')}
                        isLast
                    />
                </SettingsGroup>

                {user.role === 'admin' && (
                     <SettingsGroup title="SYSTEM">
                        <SettingsMenuItem
                            icon="people-outline"
                            label="User Management"
                            onPress={() => navigation.navigate('UserManagementScreen')}
                        />
                        <SettingsMenuItem
                            icon="settings-outline"
                            label="System Configuration"
                            onPress={() => navigation.navigate('AdminConfig')}
                        />
                        <SettingsMenuItem
                            icon="document-text-outline"
                            label="Activity Log"
                            onPress={() => navigation.navigate('ActivityLog')}
                            isLast
                        />
                    </SettingsGroup>
                )}

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
                    <Ionicons name="log-out-outline" size={24} color={theme.danger} />
                    <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

// --- Styles ---
const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F8FA' },
    scrollContainer: { paddingVertical: 20 },
    errorText: { textAlign: 'center', marginTop: 40, color: theme.textSecondary },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        marginBottom: 10,
    },
    avatar: { width: 70, height: 70, borderRadius: 35 },
    profileTextContainer: { marginLeft: 15, flex: 1 },
    userName: { fontSize: 22, fontWeight: 'bold', color: theme.text },
    userEmail: { fontSize: 16, color: theme.textSecondary, marginTop: 4 },
    menuGroup: { marginHorizontal: 20, marginBottom: 20 },
    menuGroupTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.textSecondary,
        marginBottom: 10,
        marginLeft: 5,
        letterSpacing: 0.5,
    },
    menuGroupContainer: {
        backgroundColor: theme.surface,
        borderRadius: 14,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    menuItemLast: { borderBottomWidth: 0 },
    menuIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.primary + '1A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuItemText: { flex: 1, marginLeft: 15, fontSize: 17, color: theme.text, fontWeight: '500' },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.surface,
        marginHorizontal: 20,
        marginTop: 20,
        paddingVertical: 16,
        borderRadius: 14,
    },
    logoutButtonText: {
        marginLeft: 10,
        color: theme.danger,
        fontSize: 17,
        fontWeight: '600',
    },
});