// screens/ActivityLogScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

const LogItem = ({ item, theme, onPressUser, isLast }) => {
    const styles = getStyles(theme);

    const logConfig = {
        'subscribed': { icon: 'person-add-outline', color: theme.primary },
        'activated': { icon: 'flash-outline', color: theme.success },
        'suspended': { icon: 'ban-outline', color: theme.danger },
        'declined': { icon: 'close-circle-outline', color: theme.danger },
        'payment_success': { icon: 'card-outline', color: theme.success },
        'plan_changed': { icon: 'swap-horizontal-outline', color: theme.accent },
        'admin_update': { icon: 'shield-checkmark-outline', color: theme.warning },
        'admin_charge': { icon: 'add-circle-outline', color: theme.warning },
        'billing_correction': { icon: 'create-outline', color: theme.warning },
        'default': { icon: 'information-circle-outline', color: theme.textSecondary }
    };

    const config = logConfig[item.type] || logConfig.default;
    const date = new Date(item.date);

    return (
        <View style={styles.logItemContainer}>
            <View style={styles.timeline}>
                <View style={[styles.timelineIconContainer, { backgroundColor: `${config.color}20`, borderColor: config.color }]}>
                    <Ionicons name={config.icon} size={22} color={config.color} />
                </View>
                {!isLast && <View style={styles.timelineLine} />}
            </View>
            <View style={styles.logContent}>
                <Text style={styles.logDetails}>{item.details}</Text>
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.userContainer} onPress={() => onPressUser(item.user._id)}>
                        <Image source={item.user.photoUrl ? { uri: item.user.photoUrl } : require('../../assets/images/default-avatar.jpg')} style={styles.userAvatar} />
                        <Text style={styles.userName}>{item.user.displayName.slice(0,15) + '...'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.logTimestamp}>{date.toLocaleDateString()}</Text>
                </View>
            </View>
        </View>
    );
};

// --- Main Screen Component ---
export default function ActivityLogScreen({ navigation }) {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();

    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    // Add pagination state later if needed

    const fetchLogs = useCallback(async (isInitial = false) => {
        if (isInitial) setIsLoading(true);
        try {
            const { data } = await api.get('/admin/activity-log');
            setLogs(data.data);
        } catch (error) {
            showAlert("Error", "Could not fetch the activity log.");
        } finally {
            if (isInitial) setIsLoading(false);
            setRefreshing(false);
        }
    }, [showAlert]);

    useFocusEffect(useCallback(() => { fetchLogs(true); }, [fetchLogs]));

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchLogs(false);
    }, [fetchLogs]);

    const handleUserPress = (userId) => {
        navigation.navigate('UserDetail', { userId });
    };

    if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={logs}
                keyExtractor={(item) => item._id}
                renderItem={({ item, index }) => <LogItem item={item} theme={theme} onPressUser={handleUserPress} isLast={index === logs.length - 1} />}
                contentContainerStyle={styles.listContainer}
                ListHeaderComponent={<Text style={styles.headerTitle}>System Activity</Text>}
                ListEmptyComponent={<View style={styles.centered}><Text style={styles.emptyText}>No activity found.</Text></View>}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
            />
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
    listContainer: { paddingHorizontal: 20, paddingTop: 10 },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: theme.text, marginBottom: 20 },
    emptyText: { color: theme.textSecondary, fontStyle: 'italic', fontSize: 16 },

    logItemContainer: { flexDirection: 'row', alignItems: 'flex-start' },
    timeline: { alignItems: 'center', marginRight: 15 },
    timelineIconContainer: {
        width: 44, height: 44, borderRadius: 22,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2,
        zIndex: 1,
    },
    timelineLine: { flex: 1, width: 2, backgroundColor: theme.border, marginTop: -2 },
    logContent: {
        flex: 1, backgroundColor: theme.surface,
        borderRadius: 12, padding: 15, borderWidth: 1,
        borderColor: theme.border, marginBottom: 15,
    },
    logDetails: { 
        fontSize: 15, color: theme.text, 
        lineHeight: 22, fontWeight: '500' 
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingTop: 10
    },
    userContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
    },
    userAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
    userName: { fontSize: 13, fontWeight: '600', color: theme.primary },
    logTimestamp: { fontSize: 10, top: 14, right: 1, color: theme.textSecondary },
});